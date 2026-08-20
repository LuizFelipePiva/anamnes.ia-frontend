# SPEC-002 — Checagem de dono da conversa no chat (`POST /api/gpt`)

- **Achado que resolve**: #1 (IDOR de escrita — gravar mensagem na conversa de outro usuário)
- **Fonte**: `docs/PENTEST_LOCAL.md`
- **Status**: ✅ implementado (79 testes verdes, ruff limpo, re-ataque confirmou #1 fechado)

---

## 1. Contexto / Problema

`POST /api/gpt` usa `conversation_id = data.thread_id` (input do cliente) e chama `handle_chat_message(user_id, conversation_id, ...)` → `save_message(conversation_id, "user", message)` **sem verificar que a conversa pertence ao `user_id`** (`routes/api.py:201-223`, `services/chat_service.py:143`).

Confirmado no pentest: um atacante autenticado envia `thread_id` de outra conversa e injeta mensagens nela; a resposta da IA também é gravada lá. Existe o padrão correto em `/conversations/{conv_id}` (`api.py:302`), que **não** foi aplicado à escrita.

## 2. Objetivo

Garantir que `POST /api/gpt` só grave/leia numa conversa cujo **dono** (`conversations.user_id`) é o usuário autenticado; caso contrário, `404` sem efeito colateral.

## 3. Não-objetivos

- Não mudar a lógica da IA, limite de turnos, limite diário, nem `handle_chat_message` em si (além de garantir que não é chamado sem dono válido).
- Não mexer em `start_chat`/`start_attempt`/`ai/start` (criam conversas com `user_id` correto).
- Não alterar RLS.

## 4. Requisitos funcionais

- **RF1** — Em `chat_gpt` (`routes/api.py`), **logo após** obter `user_id` e `conversation_id = data.thread_id` e **antes** de `enforce_daily_limit` e de qualquer escrita:
  - buscar `conversations.user_id` por `id == conversation_id` (usar o cliente injetado `sb`);
  - se não existe → `HTTPException(404, "Conversa não encontrada")`;
  - se `user_id != sub` → `HTTPException(404, "Acesso negado")`.
  - Espelha o padrão de `get_conversation` (`api.py:302`).
- **RF2** — A verificação ocorre **antes** de consumir cota (`enforce_daily_limit`) e antes de `save_message` — nenhum efeito colateral quando o acesso é negado.
- **RF3** — Dono legítimo: comportamento **inalterado** (segue para limite diário → IA → resposta).

## 5. Tabela de comportamento (vira teste)

| Cenário | thread_id | Resultado |
|---|---|---|
| Dono envia mensagem | conversa própria | 200 (fluxo normal) / não-404 |
| Atacante envia | conversa de outro | **404 "Acesso negado"**, `save_message` **não** chamado |
| Conversa inexistente | uuid aleatório | **404 "Conversa não encontrada"**, `save_message` **não** chamado |
| Sem `thread_id`/`message` | — | 400 (inalterado) |
| Sem token | qualquer | 401 (inalterado) |

## 6. Critérios de aceite

- [x] Atacante com `thread_id` de outro usuário recebe **404** e **nenhuma** mensagem é gravada (`handle_chat_message` não chamado).
- [x] `thread_id` inexistente → 404 "Conversa não encontrada".
- [x] Dono legítimo mantém o fluxo (não recebe 404 por dono).
- [x] Verificação ocorre antes de `enforce_daily_limit` (não consome cota em acesso negado).
- [x] Re-execução do pentest #1: a mensagem do atacante **não** aparece na conversa da vítima (0 no banco).
- [x] `ruff check app/` passa.

## 7. Arquivos afetados

- `app/routes/api.py` — adicionar a checagem de dono em `chat_gpt`.
- Doc: `backend/app/routes/CLAUDE.md` (nota de que `/gpt` valida dono).

## 8. Casos de borda

- **B1** — Conversa recém-criada por `start_chat`/`ai/start`: `user_id` = dono → passa. ✅
- **B2** — Ordem: a checagem vem **antes** de `enforce_daily_limit` para não consumir cota em request negado.
- **B3** — Mensagem do 404: usar `"Acesso negado"` (dono divergente) e `"Conversa não encontrada"` (inexistente), consistente com `get_conversation`.
