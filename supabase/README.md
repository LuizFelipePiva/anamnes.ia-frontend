# supabase/ — schema e migrations (Supabase CLI)

Fonte da verdade do banco. Schema versionado em `migrations/`, aplicado em prod via **Supabase CLI** (`supabase db push`) — não mais no SQL editor à mão.

## Estrutura

```
supabase/
├── config.toml                        # config da CLI (supabase init)
├── migrations/
│   ├── 20250101000000_baseline_schema.sql   # foto do schema de prod (2026-07-23). JÁ em prod.
│   └── 20260723000000_atomic_attempt_quota.sql  # SPEC-004 (pendente em prod)
├── migration_student_flashcards.sql   # histórico pré-baseline (já em prod; incluído no baseline)
└── seed.sql                           # dados de exemplo (dev)
```

Migrations são nomeadas `<timestamp>_descricao.sql` (a CLI ordena por timestamp). Gere novas com `supabase migration new <nome>`.

## Setup único (por máquina)

Requer a Supabase CLI. Neste projeto foi usada via `npx supabase` (sem instalação global). Para instalar de vez: `scoop install supabase` (Windows) ou veja https://supabase.com/docs/guides/cli.

```bash
supabase login                 # autentica sua conta (abre o navegador)
supabase link --project-ref hzisbcckgsuibqwpplub   # liga o repo ao projeto de prod
```

> `--project-ref` é o ID do projeto (parte do host `db.<ref>.supabase.co`).

## Fluxo do dia a dia

**Criar uma mudança de schema:**
```bash
supabase migration new nome_curto      # cria migrations/<timestamp>_nome_curto.sql
# edite o arquivo com o SQL (idempotente quando possível: create or replace, if not exists)
supabase db reset                      # (opcional) recria o banco LOCAL e aplica tudo, p/ testar
```

**Aplicar em produção:**
```bash
supabase db push                       # aplica em prod só as migrations pendentes
supabase migration list                # confere: local x remote devem bater
```

A CLI rastreia o que já foi aplicado (tabela `supabase_migrations.schema_migrations` no banco) — sem controle manual.

## Adoção do baseline (PASSO ÚNICO — fazer uma vez em prod)

Como o schema já existia em prod antes das migrations, o baseline precisa ser marcado como **já aplicado** (sem re-rodar, senão dá erro de "policy já existe"). Depois de `link`:

```bash
supabase migration repair --status applied 20250101000000   # baseline já está em prod
supabase db push                                             # aplica a 20260723 (SPEC-004)
```

> Validado contra o banco local nesta sessão: `repair` marca o baseline sem rodá-lo e `push` aplica só a migration nova. Em prod é idêntico (com `link` no lugar do `--db-url`).

### Alternativa sem `supabase login` (só com a senha do banco)

Se preferir não logar a conta, dá pra usar a connection string direta do pooler:
```bash
supabase migration repair --status applied 20250101000000 \
  --db-url "postgresql://postgres.hzisbcckgsuibqwpplub:<SENHA>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
supabase db push --db-url "postgresql://postgres.hzisbcckgsuibqwpplub:<SENHA>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```
(`<SENHA>` = `SUPABASE_DB_PASSWORD` do `backend/.env`. Região `sa-east-1`.)

## Recriar o banco do zero (local/novo ambiente)

```bash
supabase db reset      # roda baseline + todas as migrations em ordem
```

## Estado atual (2026-07-23)

- `20250101000000_baseline_schema.sql` — ✅ em prod (é a captura dele). Marcar como applied via `repair`.
- `20260723000000_atomic_attempt_quota.sql` — ⏳ **pendente em prod**. Aplicar com `supabase db push`.

> ⚠️ Ordem de deploy: rode `db push` em prod **antes** de subir o backend novo — o `cases.py` já chama `reserve_case_attempt`, que só existe após a migration.
