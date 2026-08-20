# Revisão de segurança detalhada — anamnes.ia

> Varredura manual profunda do backend + frontend. Escrita incremental conforme análise.
> Data: 2026-07-08. Branch: `fix/revisao-questoes`.
> Nota de arquitetura: o backend usa `SUPABASE_KEY` (a confirmar se é `service_role` — se sim, **RLS é ignorada no backend** e toda autorização é manual nas rotas → foco em IDOR e checagem de role).

## Legenda
`[ALTA]` explorável, impacto real · `[MÉDIA]` requer condição · `[BAIXA]` defense-in-depth · `[OK]` verificado e seguro · `[?]` precisa confirmação fora do código

---

## Infraestrutura de auth (verificado)

- `[OK]` `verify_jwt_token` (`auth/security.py:47`) valida assinatura HS256 com `SECRET_KEY` e expiração. Correto.
- `[OK]` `validate_uuid` previne path injection em params UUID.
- `[OK]` `SecurityHeadersMiddleware` aplica nosniff, X-Frame-Options DENY, HSTS em prod.
- `[BAIXA]` `SECRET_KEY` sem validação de comprimento mínimo no startup (`config.py:52`). CLAUDE.md diz "min 32 chars" mas `validate_environment` só checa presença e o valor placeholder. Se alguém subir com chave curta/fraca, JWT fica forjável por brute-force. Recomendação: exigir `len(SECRET_KEY) >= 32` no `validate_environment`.

## Achados (em progresso)

### 1. `[MÉDIA]` IDOR: escrita em conversa de outro usuário via `/api/gpt`
- **Arquivo**: `routes/api.py:201-223` + `services/chat_service.py:104-143`.
- O endpoint faz `conversation_id = data.thread_id` (input do usuário) e chama `handle_chat_message(user_id, conversation_id, ...)` → `save_message(conversation_id, "user", message)` **sem verificar que a conversa pertence ao `user_id`**. Compare com `/conversations/{conv_id}` (`api.py:322`) que checa `conv.get("user_id") != user_id`.
- **Exploração**: usuário autenticado envia `thread_id` de outra conversa e injeta mensagens nela (poluição/tampering do histórico de outro aluno; também a resposta da IA é gravada lá). Leitura indireta: o histórico da vítima é enviado à OpenAI e influencia a resposta retornada ao atacante.
- **Mitigante**: `conversation_id` é UUID (assumido não-adivinhável), então precisa vazar o UUID. Reduz severidade, mas a ausência de checagem de dono é o bug.
- **Depende de**: se `SUPABASE_KEY` for `service_role`, RLS não protege → confirmado explorável. Se for anon key, RLS pode bloquear o insert cross-user. **Confirmar o tipo de chave.**
- **Fix**: validar dono da conversa no início de `handle_chat_message` (ou na rota) — `select user_id from conversations where id = conversation_id` e comparar com `user_id`; 404 se divergir. Padrão já usado em `/conversations/{conv_id}`.
- **Elevação**: como o backend é `service_role` (#2), o insert cross-user **não é bloqueado por RLS** → confirmado.

### Rotas auditadas — autorização OK
- `[OK]` **cases.py**: `get_case`/`update_case`/`delete_case`/`assign_case`/`list_case_assignments` checam `teacher_id != sub` → 403. `list_case_attempts`/`get_attempt_messages` checam `role != admin and teacher_id != sub`. `abandon_attempt`/`complete_attempt` filtram por `.eq("student_id", sub)`. UUIDs validados. Sem IDOR.
- `[OK]` **admin.py**: 100% dos endpoints usam `Depends(verify_admin)` (`admin.py:23` checa `role != "admin"` → 403). `toggle_user_status`/`delete_user` protegem contas admin de auto-remoção. Nenhum endpoint admin exposto sem guard.
- `[OK]` **api.py** `/conversations/{conv_id}`: checa dono (`user_id != sub` → 404). `list_conversations`/`update-titles` escopados por `user_id`.
- `[OK]` **classes.py**: `_check_access` (dono ou compartilhado em `class_teachers`) em todos os endpoints de turma; operações destrutivas usam `require_owner=True`. `join_class` usa `sub` do aluno.
- `[OK]` **profile.py**: `update_my_profile` só grava `name`/`institution` (sem `role` → **sem escalonamento**); `change_password` valida senha antiga via `sign_in`; `get_student_profile` checa dono OU (teacher com aluno matriculado em sua turma) OU admin, com audit log. `delete_my_account`/`export_my_data` escopados por `sub`.

### 3. `[MÉDIA]` Endpoints de professor sem role-gate → aluno usa ferramentas docentes
- **Arquivos**: `cases.py:190` (`generate_case`), `cases.py:217` (`create_case`), `classes.py:53` (`create_class`) e demais CRUD de turma/caso — todos só exigem `verify_jwt_token`, **sem checar `role in (teacher, admin)`**.
- **Exploração**: um usuário `student` (todo registro público agora é student) chama `POST /api/cases/generate` e usa a geração de casos por IA (**custo OpenAI**, embora limitado a 10/dia por usuário), cria turmas/casos e vira "professor" das próprias entidades. Também acessa a superfície do dashboard docente.
- **Impacto limitado**: as checagens de dono (`teacher_id`) impedem tocar dados de OUTROS professores — não é vazamento de dados alheios, é escalonamento de privilégio funcional + consumo de recurso pago. Mas contradiz diretamente a decisão de "registro público não cria professor" (correção #1 do TODO): a barreira foi posta no cadastro, não nas rotas.
- **Fix**: criar um guard `verify_teacher` (análogo a `verify_admin`) exigindo `role in ("teacher","admin")` e aplicá-lo em todos os endpoints de criação/gestão docente (`cases.py` generate/create/update/delete/assign; `classes.py` create/patch/delete/share; `dashboard.py`).

- `[OK]` **dashboard.py**: todos os endpoints escopam por `teacher_id`/`_teacher_class_ids`; `get_student_history` valida matrícula do aluno na turma do professor → 403. Sem IDOR (protegido por scoping mesmo sem role-gate).
- `[OK]` **flashcards.py**: guards `_require_teacher`/`_require_admin`/`_current_user`; CRUD de aluno passa `user["sub"]` (ownership no service). Reads de deck (`/cards/all`) expõem conteúdo de aprendizado compartilhado (front/back) — por design, não é dado sensível.
- `[OK]` **questions.py** (revisado antes): student só recebe `PUBLIC_FIELDS` (sem gabarito); admin gated por `_require_admin`; upload com path server-side (`uuid4().hex`) + allowlist de content-type. Sem traversal/vazamento.

### Frontend
- `[OK]` XSS: único uso de `innerHTML` em `main.tsx:14` interpola `error.message` de `validateEnvironment` (valores de config/env, não input do usuário). Não explorável. Nenhum `dangerouslySetInnerHTML`/`eval`/`new Function` no código.
- `[OK]` Token: gerido pelo supabase-js (localStorage, padrão); a `service_role` nunca chega ao frontend.

---

## Resumo executivo (prioridade)

| # | Severidade | Achado | Arquivo | Ação |
|---|---|---|---|---|
| 1 | **MÉDIA** | IDOR: escrita em conversa de outro usuário (`/api/gpt` não checa dono) | `api.py:201`, `chat_service.py:143` | validar dono de `conversation_id` |
| 3 | **MÉDIA** | Endpoints de professor sem role-gate (aluno usa geração IA/turmas) | `cases.py:190/217`, `classes.py:53` | guard `verify_teacher` |
| — | BAIXA | `SECRET_KEY` sem validação de comprimento no startup | `config.py:52` | exigir `len >= 32` |
| 2 | INFO | Backend = `service_role` → RLS não é backstop; autorização manual é a única barreira | `db/supabase.py:19` | (contexto) |

**Veredito**: nenhuma vulnerabilidade **ALTA** (RCE / breach direto / bypass de auth) introduzida. A base de autorização é consistente e boa (ownership + audit log). Os dois pontos MÉDIA são reforços concretos: (1) o único endpoint de escrita sem checagem de dono, e (3) a lacuna de role-gate que espelha, na camada de rotas, a mesma correção já feita no cadastro. Ambos exploráveis por usuário autenticado; #1 requer conhecer um UUID de conversa alheia.

### 2. `[CONFIRMADO]` Backend usa `service_role` → RLS não é backstop
- Decodifiquei o claim da `SUPABASE_KEY` real em `backend/.env`: `"role":"service_role"`. Ou seja, **RLS é integralmente ignorada** em todo acesso do backend (`db/supabase.py:19`).
- Consequência: **toda autorização manual nas rotas é a ÚNICA barreira**. Qualquer endpoint que busque/modifique objeto por ID sem checar dono/role vira IDOR/escalonamento real (confirma #1).
- Obs.: `.env.example` documenta "sua_chave_anon_do_supabase" (anon) — divergência com o uso real (service_role). A chave nunca é exposta ao frontend (backend-only), o que é correto; mas exige que a barreira de autorização seja perfeita nas rotas.
