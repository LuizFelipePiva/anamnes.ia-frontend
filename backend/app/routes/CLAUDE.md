# routes/ — AI context

Camada HTTP. Só validação, status codes e `HTTPException`. Toda lógica vai para `../services/`.
Cliente Supabase entra por injeção de dependência (`../db/supabase.py`). Rate limit via `slowapi`.

## Arquivos
- `api.py` — auth (register, login) e endpoint de chat do aluno. `/gpt` valida dono da conversa (`user_id`) antes de gravar (SPEC-002); extrai `language` do claim do JWT (`payload.get("language", "pt-BR")`) e repassa a `handle_chat_message` (SPEC-011). `register` usa fluxo de confirmação por e-mail: resposta 200 genérica idêntica (exista ou não a conta) e **sem token** — anti-enumeração (SPEC-006); `signup` retorna status string, não `(user, token)`. `register` aceita `language` opcional (idioma do navegador) gravado no perfil ao criar o usuário (SPEC-007). 5 sites migrados para `http_error` (SPEC-010): `invalid_credentials`, `conversation_not_found` ×2, `access_denied` ×2.
- `cases.py` — CRUD de casos clínicos, geração por IA, tentativas e janelas de disponibilidade. **Dois** call sites de avaliação SOAP (`/evaluate-soap` e `POST /{case_id}/complete`) extraem `language` do JWT e repassam a `evaluate_soap` (SPEC-011) — migrar só um deixaria a outra metade da avaliação sempre em pt-BR. `POST /cases/generate` **não** repassa idioma (conteúdo gerado é compartilhado da turma e gravado no banco — D5/SPEC-011 E1). `POST /cases/ai/start` (`start_ai_chat`) também extrai `language`: é o **único acesso a IA fora de `services/`** — chama `get_prompt("ai-patient-prompt")` + `complete()` direto na rota para a saudação inicial do Chat IA, e por isso escapou do mapeamento original da SPEC-011 (corrigido, ver §10 da spec). Para mapear prompts, use `grep get_prompt(` em `app/` inteiro, não a convenção de camadas. O arquivo com mais sites migrados para `http_error` (SPEC-010, ~22): `case_not_found`, `access_denied`, `case_expired`, e os 429 de quota (`ai_quota_exceeded`/`case_quota_exceeded`) com `limit` em `params` — o front recompõe a frase via `t(code, { limit })` em vez de depender do texto pt-BR.
- `classes.py` — turmas: criar, entrar por código, atribuir casos com prazo. 3 sites migrados (SPEC-010): `class_not_found`, `access_denied`, `already_enrolled`.
- `dashboard.py` — métricas e relatórios do professor.
- `admin.py` — operações de admin. `verify_admin` (local, duplicado de `verify_teacher`) migrado para `code: "forbidden_role"` (SPEC-010), junto com `email_already_registered`, `user_not_found` (4 sites), `class_not_found`, `case_not_found`.
- `profile.py` — perfil do usuário. `PUT /me` aceita `language` (pt-BR/en/es; inválido → 400) e `GET /me` retorna `language` (SPEC-007/i18n). Valida via `app/i18n.py`. Quando `language` muda, `PUT /me` **reemite o JWT** (campo `token` na resposta) com o novo idioma — senão o token antigo (maior precedência na detecção) reverteria a escolha no F5. 5 sites migrados (SPEC-010): `user_not_found` ×3, `wrong_password` ×2.
- `flashcards.py` — decks e revisões (SM-2). `_require_admin` local **não** migrado para `http_error` (SPEC-010 ficou restrita a `cases/classes/profile/api/admin` — dívida registrada em `docs/specs/SPEC-010-*.md` §9).
- `questions.py` — banco de questões: listagem sem gabarito + correção (aluno); CRUD, import JSON e upload de imagem (admin). Mesma observação de `_require_admin` não migrado.
- `health.py` — health check.

## Códigos de erro estáveis (SPEC-010)

`http_error(status_code, code, detail, **params)` de `app/errors.py` substitui `HTTPException(detail="string")` nos sites migrados — ver `../auth/CLAUDE.md` para o mecanismo (helper + handler global). Migração restrita aos 15 códigos mais frequentes + os dois guards centrais; o restante dos ~110 sites (`flashcards.py`, `questions.py`, e o long tail de `cases.py`/`admin.py`/etc.) responde `code: null` até ser migrado — o handler tolera isso por construção.

## Depende de
`../services/*` (lógica), `../models/schemas.py` (request/response), `../auth/` (JWT/guard), `../errors.py` (códigos de erro).
