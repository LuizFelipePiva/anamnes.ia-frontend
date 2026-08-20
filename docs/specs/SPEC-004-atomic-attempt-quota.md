# SPEC-004 — Cota de tentativas atômica (corrige race condition / TOCTOU)

- **Achado que resolve**: #7 (race condition na cota diária — `start_ai_chat` e `start_attempt`)
- **Fonte**: `docs/PENTEST_LOCAL.md`
- **Status**: ✅ implementado (85 testes verdes, ruff limpo; re-ataque concorrente 4×20 → sempre ≤ limite)

---

## 1. Contexto / Problema

`_get_daily_quota` **conta** as tentativas de hoje (CHECK) e depois o endpoint **insere** a tentativa (ACT), sem atomicidade entre os dois (`routes/cases.py`: `start_ai_chat` ~320→368; `start_attempt` ~712→783). Requisições concorrentes leem a mesma cota antes de qualquer insert → estouram o limite.

Confirmado no pentest: 20 requisições concorrentes criaram **3** tentativas com limite **2**. Pior em produção (`--workers 2` → sem GIL compartilhado). Impacto: bypass de cota paga = abuso de custo (OpenAI).

## 2. Objetivo

Garantir que o número de tentativas criadas por aluno/dia/tipo **nunca exceda o limite**, mesmo sob concorrência (múltiplas requisições simultâneas e múltiplos workers).

## 3. Não-objetivos

- Não mudar os valores de limite (`DAILY_LIMITS`) nem a regra paid/free.
- Não alterar `_get_daily_quota` como fonte de exibição (`GET /quota`) — permanece contando `case_attempts`.
- Não mexer no chat (`/gpt`) — o limite de mensagens é outro fluxo (mesmo padrão, fora do escopo desta spec).

## 4. Requisitos funcionais

- **RF1 — função atômica no banco (migration)**: criar `reserve_case_attempt(p_student uuid, p_case_id uuid, p_conversation_id uuid, p_kind text, p_limit int) returns uuid`:
  - adquire `pg_advisory_xact_lock` por `(student, kind)` → serializa o trecho crítico por usuário/tipo;
  - conta as tentativas de hoje do aluno **daquele tipo** (`ai` = caso com `form_data->>'source' = 'ai_generated'`; `regular` = caso sem esse marcador), consistente com `_get_daily_quota`;
  - se `count >= p_limit` → retorna `NULL` (limite atingido);
  - senão → **insere** o `case_attempt` (status `in_progress`) e retorna o `id`.
  - Count + insert ocorrem na **mesma transação** sob o lock → atômico.
- **RF2 — refatorar os endpoints**: em `start_ai_chat` (kind `ai`) e `start_attempt` (kind `regular`), após criar caso+conversa, substituir o `insert` direto em `case_attempts` por `sb.rpc("reserve_case_attempt", {...})`. Se o retorno for vazio/`None` → `HTTPException(429, "Limite diário … atingido")`.
- **RF3** — manter o pré-check barato (`is_paid`, e opcionalmente `ai_available/regular_available` para 429 rápido de UX), mas a **garantia** de não estouro é a RPC (RF1). O pré-check nunca é a única barreira.
- **RF4** — comportamento de sucesso inalterado: dono recebe `attempt_id`/`conversation_id` como hoje.

## 5. Tabela de comportamento (vira teste)

| Cenário | Resultado |
|---|---|
| N requisições concorrentes, limite L | **exatamente L** tentativas criadas; excedentes → 429 |
| Requisição isolada dentro da cota | 200 + attempt criado |
| Requisição isolada acima da cota | 429 |
| RPC retorna `None` (limite) | endpoint → 429 |
| RPC retorna id | endpoint → 200 |

## 6. Critérios de aceite

- [x] Migration cria `reserve_case_attempt` (idempotente: `create or replace`).
- [x] `start_ai_chat` e `start_attempt` usam a RPC; `None` → 429.
- [x] Teste determinístico do contrato de retorno (`_reserved_attempt_id`): None/[]→limite, str/list/dict→id.
- [x] **Re-ataque concorrente** (4 rodadas × 20 req): sempre **exatamente 2** (limite 2); antes furava (3).
- [x] `GET /quota` continua coerente (conta `case_attempts` — a RPC insere na mesma tabela).
- [x] `ruff check app/` passa.

> **D1 resolvido**: em 429, os placeholders (caso/conversa) são **removidos** (`delete`) antes de responder — sem órfãos. Nota: os N perdedores concorrentes criam caso+conversa e apagam (churn aceitável); otimização futura seria reservar antes de criar os FKs.

## 7. Arquivos afetados

- **Novo**: `supabase/migrations/0002_atomic_attempt_quota.sql` — função `reserve_case_attempt`.
- `app/routes/cases.py` — `start_ai_chat`, `start_attempt` (usar RPC).
- Doc: `backend/app/routes/CLAUDE.md`, `docs/PROJECT.md` (nota da RPC de cota).

## 8. Casos de borda / decisões

- **D1** — Caso/conversa são criados **antes** da reserva; se a RPC negar (429), ficam órfãos (placeholder não publicado). Aceitável? Alternativa: criar tudo dentro da RPC (mais complexo). **Recomendado**: aceitar o placeholder órfão (custo nulo, invisível) ou limpá-lo no 429. Decidir.
- **D2** — `hashtext` do advisory lock: usar `hashtext(p_student::text || ':' || p_kind)`. Colisões de hash apenas serializam a mais (correto, só menos paralelo).
- **D3** — `SECURITY DEFINER`? A função roda com a service_role (backend); não precisa `SECURITY DEFINER`. Manter `INVOKER`.
- **D4** — Backfill/consistência: a RPC insere na MESMA tabela `case_attempts` que `_get_daily_quota` conta → sem drift.
