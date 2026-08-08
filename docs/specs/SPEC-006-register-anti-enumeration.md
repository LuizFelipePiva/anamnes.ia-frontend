# SPEC-006 — Anti-enumeração de e-mail no cadastro (fluxo de confirmação)

- **Achado que resolve**: #5 (enumeração de usuário via `POST /api/register` → `409 "E-mail já cadastrado"`).
- **Fonte**: `docs/PENTEST_LOCAL.md`.
- **Status**: ✅ implementado (backend + frontend; 91 testes verdes, ruff + tsc limpos). **D1 resolvido**: "Confirm email" está **LIGADA** em prod (verificado via `GET /auth/v1/settings` → `mailer_autoconfirm=false`).

---

## 1. Contexto / Problema

`api_register` (`app/routes/api.py:83`) responde de forma **diferente** conforme o e-mail já exista:
- e-mail novo → `200 {user, token}` (auto-login imediato);
- e-mail existente → `409 "E-mail já cadastrado"`.

Um atacante distingue os dois → **enumera** quais e-mails têm conta (confirmado no pentest). O `login` **não** vaza (retorna 401 genérico). Severidade baixa, mas o vetor é real.

Hoje o `signup` já configura `email_redirect_to = {FRONTEND_URL}/confirm` (o Supabase envia e-mail de confirmação), mas o endpoint **ignora** a confirmação e devolve o token na hora. O frontend (`authService.register`) **exige** `data.token` e loga imediatamente.

## 2. Objetivo

`POST /api/register` deve responder **de forma indistinguível** para e-mail novo vs. existente, sem revelar a existência da conta — adotando de fato o fluxo de confirmação por e-mail (sem auto-login).

## 3. Não-objetivos

- Não alterar `login` (já é genérico).
- Não mexer no reset de senha.
- Não implementar "magic link"/OTP — mantém e-mail+senha, só que confirmado.

## 4. Requisitos funcionais

### Backend
- **RF1 — resposta única**: `register` retorna sempre `200` com corpo genérico `{"message": "Se o e-mail for válido, enviamos um link de confirmação. Verifique sua caixa de entrada."}` nos casos que dependem da existência (novo, existente). **Nunca** retorna token.
- **RF2 — e-mail novo**: chama `supabase.auth.sign_up` (dispara e-mail de confirmação) e cria/garante a linha em `users` (com `role`). Sem token.
- **RF3 — e-mail existente**: **não** cria nada, **não** vaza. Retorna o mesmo 200 genérico. (Opcional/D2: enviar e-mail "você já tem conta" — fora do escopo mínimo.)
- **RF4 — erros que NÃO dependem de existência continuam explícitos** (não enumeram): e-mail malformado → `400 "E-mail inválido"`; senha fraca → `400` com a regra; rate limit → `429`. Esses são seguros porque independem de a conta existir.
- **RF5 — timing**: o ramo "e-mail existente" deve fazer trabalho comparável ao "novo" (ou ter atraso constante) para não permitir enumeração por tempo de resposta. Mitigado também pelo rate limit `2/minute` já existente.

### Frontend
- **RF6 — `authService.register`**: deixa de retornar/depender de `token`; retorna a mensagem (ou `void`).
- **RF7 — `RegisterForm`**: em sucesso, **não** loga; exibe estado "Confirme seu e-mail" (reaproveitar `EmailConfirmed.tsx`/página de aviso). Fluxo de login só após clicar no link → `/confirm`.

### Config (pré-requisito)
- **RF8 — Supabase "Confirm email" ligado**: com a confirmação obrigatória, `sign_in_with_password` falha para contas não confirmadas → o `login` (que já retorna 401 genérico) barra o acesso até confirmar. **Sem isso, a SPEC é cosmética** (o usuário loga mesmo sem confirmar). Ver D1.

## 5. Tabela de comportamento (vira teste)

| Cenário | Antes | Depois |
|---|---|---|
| e-mail novo, válido | 200 `{user, token}` | **200** `{message genérico}`, sem token, e-mail enviado |
| e-mail já cadastrado | 409 "E-mail já cadastrado" | **200** `{message genérico}` idêntico, nada criado |
| e-mail malformado | 400 "E-mail inválido" | **400** "E-mail inválido" (não depende de existência) |
| senha fraca | 400 | **400** (regra de senha) |
| >2 req/min | 429 | **429** |
| login antes de confirmar (Supabase confirm ON) | — | **401** genérico |

## 6. Critérios de aceite

- [ ] `register` nunca retorna `409` nem token; e-mail novo e existente → **200 idêntico** (mesmo status, mesmo corpo).
- [ ] Teste (mock do `signup`): existente vs. novo → respostas byte-a-byte iguais.
- [ ] E-mail malformado/senha fraca ainda retornam 400 explícito.
- [ ] Frontend: `register` não usa token; `RegisterForm` mostra tela de "confirme seu e-mail".
- [ ] `npx tsc -b --noEmit` e `ruff check app/` passam.
- [ ] (Prod) "Confirm email" habilitado no Supabase Auth.

## 7. Arquivos afetados

- `app/routes/api.py` — `api_register` (resposta genérica, sem token).
- `app/auth/service.py` — `signup` (retornos que não vazam existência).
- `app/models/schemas.py` — possivelmente novo `RegisterResponse {message}` (ou reusar).
- `frontend/.../auth/services/authService.ts` — `register` sem token.
- `frontend/.../auth/components/RegisterForm.tsx` — estado de sucesso "confirme e-mail".
- Doc: `backend/app/routes/CLAUDE.md`, `docs/PROJECT.md` (fluxo de auth), `docs/PENTEST_LOCAL.md` (#5 resolvido).

## 8. Decisões / abertos

- **D1 (BLOQUEANTE)** — "Confirm email" está ligado no Supabase Auth de prod? Se **não**, precisa ligar (Dashboard → Authentication → Providers/Email → Confirm email), senão a mudança não protege de fato. **Confirmar com o dono.**
- **D2** — Enviar e-mail "você já tem uma conta" no ramo existente (melhor UX, ajuda quem esqueceu que tem conta)? Opcional; fora do mínimo.
- **D3** — Contrato de resposta: `{message}` genérico. O frontend precisa tratar 200-sem-token como "sucesso, verifique e-mail" (hoje ele lança erro se não vier token — RF6).
- **D4** — Escopo desta entrega: backend + frontend juntos, ou backend primeiro (frontend quebra até ajustar)? Recomendado entregar os dois no mesmo PR pra não quebrar o cadastro.
