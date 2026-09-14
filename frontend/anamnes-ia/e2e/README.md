# Testes E2E (Playwright)

Testes de ponta a ponta contra a **stack completa real**: Supabase local (CLI) + FastAPI + Vite. Sem mock de rede — o objetivo é exercitar RLS, autorização e o caminho HTTP de verdade, que é justamente o que os testes de componente (Vitest) não alcançam.

> Decisão de 2026-08-13, `docs/specs/SPEC-014-casos-de-teste.md`. Antes disso o repo não tinha E2E.

## Como as peças se conectam

```
playwright test
  ├── webServer      → sobe o Vite (npm run dev) em 127.0.0.1:5173 automaticamente
  ├── global-setup   → checa Supabase (54321) e backend (8000); aborta com instrução se faltar
  └── e2e/*.spec.ts  → navegador real → Vite → FastAPI → Supabase local
```

Supabase e backend **não** sobem sozinhos, de propósito: são outro runtime (Docker/Python) e embuti-los no `webServer` transformaria "esqueci de rodar `supabase start`" num timeout ilegível. O `global-setup` falha em 3s com o comando que resolve.

## Rodando

### 1. Supabase local (uma vez por sessão)

```bash
npx supabase start          # na raiz do repo; precisa do Docker rodando
```

Se o schema estiver desatualizado (migration nova desde o último uso):

```bash
npx supabase db reset       # ⚠️ APAGA o banco local e reaplica migrations + seed.sql
```

### 2. Backend apontando para o Supabase local

```bash
cd backend
python -m uvicorn app.main:app --port 8000 --env-file .env.e2e
```

`backend/.env.e2e` é versionado (ao contrário do `.env`) — só contém as credenciais demo fixas da Supabase CLI, válidas apenas em `127.0.0.1`. Ver o cabeçalho do arquivo.

### 3. Playwright

```bash
cd frontend/anamnes-ia
npm run e2e            # roda tudo (headless)
npm run e2e:ui         # modo interativo, ótimo para depurar
npm run e2e:report     # abre o relatório HTML da última execução
npx playwright test e2e/smoke.spec.ts        # um arquivo
npx playwright test -g "rota protegida"      # um teste por nome
```

## Variáveis de ambiente

| Var | Default | Para quê |
|---|---|---|
| `E2E_BASE_URL` | `http://127.0.0.1:5173` | Onde o Vite responde |
| `E2E_API_URL` | `http://127.0.0.1:8000/api` | Backend, usado no health check e em chamadas diretas |
| `E2E_SUPABASE_URL` | `http://127.0.0.1:54321` | Checado no setup; **abortar se não for local** |

## Decisões não óbvias

- **`workers: 1` e `fullyParallel: false`** — o banco é compartilhado entre os specs, então paralelismo vira corrida por linha. Se a suíte crescer a ponto de doer, o caminho é isolar por usuário/turma no seed, não subir workers às cegas.
- **`global-setup` aborta se `E2E_SUPABASE_URL` não for local.** Estes testes escrevem e apagam dados; um `.env` errado apontando para produção é o erro mais caro possível, e é fácil de cometer.
- **`OPENAI_API_KEY` é dummy no `.env.e2e`.** Se um spec passar a tocar a IA, a chamada falha na autenticação em vez de gastar dinheiro em silêncio. O teste que quebrar por isso está no escopo errado — IA se testa com mock no pytest.
- **`smoke.spec.ts` não testa regra de negócio.** Ele responde "a infra está de pé?" sem depender de seed de autenticação. Quando um spec de feature falhar, rode o smoke antes: passou → o problema é a feature; falhou → é ambiente.
- **`tsconfig.e2e.json` existe** porque `tsconfig.app.json` inclui só `src`. Sem ele, erro de tipo em teste E2E passa despercebido pelo gate do CI (`npx tsc -b --noEmit`).

## Seed de autenticação

`supabase/seed_e2e.sql` roda junto do `seed.sql` no `db reset` (ver `[db.seed].sql_paths` em `config.toml`) e cria, com senha fixa `e2e-password-123`:

| Fixture | Papel |
|---|---|
| `e2e.professor@anamnes-e2e.com` | dono da turma e do caso |
| `e2e.aluno@anamnes-e2e.com` | matriculado — enxerga o caso |
| `e2e.intruso@anamnes-e2e.com` | aluno legítimo **fora** da turma (T13.4) |
| Turma, caso publicado, 4 exames (3 anexáveis, 1 inelegível) | — |

`e2e/fixtures/auth.ts` faz o login programático: `POST /api/login` de verdade, token gravado via `addInitScript` sob a chave `authToken`. Passar pelo formulário em cada spec custaria ~2s e um ponto de falha alheio ao que se quer provar — o `smoke.spec.ts` já cobre a tela de login.

`createAttempt` escreve a tentativa direto no banco (service key) em vez de chamar `POST /cases/{id}/start`: aquele endpoint **consome a cota diária** de 2 tentativas, e a suíte quebraria na terceira execução do mesmo dia.

### Dois gotchas que custam caro

- **Token NULL em `auth.users` quebra o login** com `500 "Database error querying schema"` — erro que não aponta para coluna nenhuma. O GoTrue lê `confirmation_token`, `recovery_token`, `email_change*`, `phone_change*` e `reauthentication_token` em strings Go não anuláveis: precisa ser `''`.
- **Domínio `.local` é recusado** pelo `email-validator` do backend, junto com `.test` e `.example` (TLDs reservados). Daí `@anamnes-e2e.com`.

## Recorte dos specs de exames

`exams.spec.ts` roda contra a API e o banco reais, **não pelo DOM do chat**: abrir o visualizador pela UI exige uma conversa viva, e a primeira mensagem do paciente passa pela OpenAI — desligada de propósito aqui. As asserções de DOM ficam em `ExamViewer.test.tsx` (Vitest). O que estes specs provam e o Vitest não: autorização real, RLS, join no Postgres e serialização no mesmo caminho HTTP.

## Pendente
- **Job no CI.** Hoje E2E roda só local. Colocar no `ci.yml` exige subir Supabase CLI + backend no runner — minutos por execução, contra os ~2s da suíte pytest atual. Avaliar se entra como job separado (nightly ou sob label) em vez de bloquear todo push.
