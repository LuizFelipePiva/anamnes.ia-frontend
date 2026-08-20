# CLAUDE.md

This file provides guidance to AI assistants when working with code in this repository.

## Project Overview

Anamnes AI is a medical training platform where students practice clinical anamnesis with an AI patient. It's a monorepo with a FastAPI backend and a React frontend, backed by Supabase (auth + PostgreSQL) and OpenAI (`gpt-4o-mini` via chat.completions + Responses API for AI responses).

**User roles**: `student`, `teacher`, `admin`

## Documentation Map (read before exploring — saves context)

To answer a question or change a file, consult the closest doc first instead of scanning the codebase.

**Per-folder `CLAUDE.md` (lean file maps — auto-loaded when you work in that folder):**
- `backend/app/{routes,services,models,auth,db}/CLAUDE.md`
- `frontend/anamnes-ia/src/{core,shared}/CLAUDE.md`
- `frontend/anamnes-ia/src/features/<domain>/CLAUDE.md` (one per feature)

**`docs/` (deep reference — read on demand, not every session):**
| File | Read it when you need… |
|---|---|
| `docs/PROJECT.md` | DB tables, env values, auth flow, feature status, daily usage limits |
| `docs/BACKEND.md` | Full endpoint tables per route, service signatures, code patterns |
| `docs/FRONTEND.md` | Route map, feature file layout, types, design system |
| `docs/MIGRATION_OPENAI.md` | OpenAI/Langfuse architecture, prompts, migration status |
| `docs/INFRA_MIGRATION.md` | Plano de migração de infra (Cloud Run SP), teste de carga, capacidade |
| `docs/I18N.md` | Plano de internacionalização (mapeamento, decisões D1–D9 fechadas, fases). Fase 0 = `docs/specs/SPEC-007-i18n-fase0.md`. Fases 0 e 1 implementadas (10 features migradas; `payments`/`minigame`/`questoes` adiadas); Fase 2 (backend + IA) pendente |
| `docs/CONTEXT_FULL.md` / `docs/CURSOR_GUIDE.md` | One-shot overview / quick dev reference |

> Quick path: domain → open that folder's `CLAUDE.md` first; need endpoint/type detail → `docs/BACKEND.md` or `docs/FRONTEND.md`; need DB/env/flows → `docs/PROJECT.md`.
> If a doc disagrees with the code, **the code wins** — fix the doc.

## Commands

### Frontend (`frontend/anamnes-ia/`)
```bash
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest (unit + component; inclui testes i18n SPEC-007)
npx tsc -b --noEmit  # Type check (used in CI)
npm run i18n:export  # Dicionários i18n → i18n-review.csv (revisão por não-devs)
npm run i18n:import  # CSV revisado → JSONs de locales
```

### Backend (`backend/`)
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
ruff check app/      # Lint (CI usa ruff==0.16.0 pinado; ruleset em pyproject.toml [tool.ruff.lint])
pytest               # Security regression tests (backend/tests/)
```

> `backend/tests/` cobre correções de segurança (SPEC-001/002/004/006) e i18n (SPEC-007). Ainda **não roda no CI** (`ci.yml` só faz ruff + tsc) — rodar localmente. O frontend agora tem Vitest (`npm test`), também fora do CI.

### Docker
```bash
docker-compose up --build       # Local full-stack with hot reload
docker-compose down
docker-compose -f docker-compose.prod.yml up --build  # Production image
```

## Architecture

### Monorepo Structure
```
anamnes-ai/
├── backend/                   # FastAPI, Python 3.12+
│   └── app/
│       ├── routes/            # HTTP handlers grouped by domain
│       ├── services/          # Business logic (call from routes only)
│       ├── models/            # Pydantic request/response schemas
│       ├── auth/              # JWT security + SecurityHeadersMiddleware
│       ├── db/                # Supabase client factory
│       └── config.py          # Env validation and logging setup
├── frontend/anamnes-ia/
│   └── src/
│       ├── app/               # Routing, providers, global layout
│       ├── config/            # constants.ts, env.ts
│       ├── core/              # Cross-cutting: authFetch, ProtectedRoute,
│       │                      #   ThemeProvider, supabaseClient, hooks
│       ├── features/          # Domain modules (see below)
│       └── shared/            # Components, types, utils used across features
└── supabase/                  # migrations/ (CLI), config.toml, seed.sql — ver supabase/README.md
```

### Backend Routes

`app/routes/` contains one file per domain:

| File | Domain |
|---|---|
| `api.py` | Auth (register, login, chat) |
| `cases.py` | Clinical cases CRUD, AI generation, attempts |
| `classes.py` | Class management (create, join by code) |
| `dashboard.py` | Teacher metrics and reports |
| `admin.py` | Admin operations |
| `profile.py` | User profile |
| `flashcards.py` | Flashcard decks and SM-2 reviews |
| `health.py` | Health check |

### Backend Services

`app/services/`:
- `chat_service.py` — AI patient turns; loads history from DB and calls `openai_service`
- `openai_service.py` — OpenAI wrapper: `complete()` / `complete_json()` / `complete_with_files()` (Responses API + `file_search` on the vector store) + Langfuse prompt management
- `eval_service.py` — SOAP note evaluation
- `generation_service.py` — AI-powered case generation
- `flashcard_service.py` — SM-2 spaced repetition logic
- `email_service.py` — Transactional email via Resend
- `retention_service.py` — Data retention (LGPD): anonymizes message content older than 90 days

### Frontend Feature Modules

Each feature follows the same internal structure:
```
features/<domain>/
├── components/
├── pages/
├── services/    # API calls via authFetch
├── types/
├── context/
├── hooks/
└── index.ts     # Barrel export — always import from index
```

Current features: `auth`, `case`, `chat`, `flashcards`, `admin`, `student`, `teacher`, `profile`, `minigame`, `navigator`, `payments`, `settings`.

Import via `@/features/<domain>` (never use relative `../` paths — the `@/` alias maps to `src/`).

### Core Utilities (`src/core/`)

Cross-cutting infrastructure that features share:

- `core/utils/authFetch.ts` — authenticated `fetch` wrapper that attaches JWT
- `core/lib/supabaseClient.ts` — Supabase browser client singleton
- `core/components/ProtectedRoute.tsx` — auth-only route guard; also exports `RoleRoute` (role-gated, `admin` always passes)
- `core/components/ThemeProvider.tsx` — dark/light theme context
- `core/hooks/useAuth.ts` — auth state hook
- `core/hooks/useToast.ts` — toast notifications hook

### Data Flow

```
React Component
  → authFetch() (core/utils/authFetch.ts, attaches JWT)
  → FastAPI Route (app/routes/)
  → Service layer (app/services/)
  → Supabase client (app/db/supabase.py)
  → OpenAI (chat/eval/generation endpoints only)
```

State is managed with Context API — no Redux. Key contexts: `AuthContext` (`features/auth`), `ThreadContext` (`features/chat`), `ToastContext` (`core/hooks/useToast`).

### Backend Conventions

- Routes only handle HTTP concerns (validation, status codes); delegate all logic to services.
- Supabase client is injected via FastAPI dependency injection (`app/db/supabase.py`).
- Rate limiting (via `slowapi`): 100 req/min globally; `/api/login` 10/min, `/api/register` 2/min, `/api/gpt` (chat) 20/min.
- Swagger/ReDoc are disabled in production (`ENVIRONMENT=production`).
- All errors are handled globally via exception handlers in `main.py`; routes raise `HTTPException`.
- `SecurityHeadersMiddleware` lives in `app/auth/security.py`.
- Observability via **Langfuse** (optional — app works without it if keys are absent).

### Shared Utilities

`shared/utils/specialties.ts` is the single source of truth for the 14 medical specialties. Never hardcode specialty lists elsewhere.

## Environment Variables

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:8000/api
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[public-key]
```

### Backend (`.env` — see `backend/.env.example`)
```
# Supabase
SUPABASE_URL, SUPABASE_KEY

# OpenAI
OPENAI_API_KEY, OPENAI_MODEL, OPENAI_MODEL_EVAL, OPENAI_VECTOR_STORE_ID

# Auth
SECRET_KEY                   # JWT signing key (min 32 chars)

# CORS
ALLOWED_ORIGINS              # Comma-separated URLs

# Email (Resend)
RESEND_API_KEY, RESEND_FROM_EMAIL, REPLY_TO_EMAIL, FRONTEND_URL

# Observability (optional)
LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_BASE_URL

# Misc
ENVIRONMENT=development|production
LOG_LEVEL=INFO
DATABASE_URL                 # Direct Postgres URL (optional)
```

## Key Technical Decisions

- **Supabase RLS** is enabled on sensitive tables — DB changes may require updating row-level security policies.
- **OpenAI**: the legacy Assistants API was migrated out. Chat uses `chat.completions` + the **Responses API** with `file_search` over a vector store (`OPENAI_VECTOR_STORE_ID`); conversation history lives entirely in the DB (`messages` table), so `conversations.thread_id` is legacy. All OpenAI access goes through `openai_service.py`. See `docs/MIGRATION_OPENAI.md`.
- **SM-2 algorithm** is used for flashcard spaced repetition — implemented in `flashcard_service.py`.
- **Dark/light theme** uses CSS custom properties + Tailwind; preference is persisted in `localStorage`.
- **TypeScript strict mode** is on. The CI type check (`npx tsc -b --noEmit`) must pass.
- **Deployment**: frontend → Vercel (`vercel.json`), backend → Render (`render.yaml`) or Railway (`railway.toml`).
- **CI/CD**: GitHub Actions — `ci.yml` runs lint + type-check on every push/PR to `master`; `cd.yml` deploys on CI success.

## Best Practices

**Backend**
- Keep routes thin: validation + status codes only. All logic goes in `services/`; routes never touch OpenAI/Supabase business logic directly.
- Get the Supabase client via DI (`Depends(get_supabase_client)`); never instantiate it ad hoc.
- Validate every UUID path param with `validate_uuid(value, "field")` before querying.
- Normalize emails with `.lower().strip()` before any lookup/insert.
- Raise `HTTPException(status_code=…, detail=…)`; let the global handlers in `main.py` format the response.
- Never call the OpenAI SDK directly — always go through `openai_service.py` (keeps retries, Langfuse tracing, and model swaps in one place).
- New AI feature = new `*_service.py` that calls `complete()` / `complete_json()`; don't add provider code to routes.
- Run `ruff check app/` before considering backend work done (CI gate).

**Frontend**
- All authenticated requests go through `authFetch` — never raw `fetch` (it injects the JWT and handles 401/expiry).
- Import across modules via the `@/` alias and the feature **barrel** (`@/features/<domain>`); never relative `../../`.
- Use `shared/utils/specialties.ts` for any specialty data — never hardcode the list.
- Guard routes with `ProtectedRoute` (auth only) or `RoleRoute roles={[…]}` (role-gated; `admin` always passes).
- Theme values come from CSS custom properties + `ThemeProvider` — don't hardcode colors; primary is `#844AF5`.
- `npx tsc -b --noEmit` must pass (strict mode, CI gate) before finishing.

**General**
- Secrets live in `backend/.env` and `frontend/anamnes-ia/.env` (both git-ignored) — never commit them or paste values into docs.
- DB schema changes may need RLS policy updates on Supabase (sensitive tables have RLS on).
- When you change behavior, update the matching folder `CLAUDE.md` and the relevant `docs/` file in the same change.

## Capacity / Load Test (2026-06-29)

Teste de carga contra produção (Render Free, Supabase Free, OpenAI Tier 1). Medido de dentro da rede corporativa (atrás de proxy) → números são **piso/lower-bound**.

- `/api/health/liveness` (CPU pura): teto **~113 req/s** (joelho em ~30 conexões; 0 erros — a 0,1 vCPU enfileira, não derruba).
- `/api/health` (+1 query Supabase): teto **~6 req/s**; p50 já ~1,1s com 5 conexões; satura (p95>5s) entre 5 e 15.
- **Gargalo: round-trip Render↔Supabase (~1s/query)** — não é CPU nem OpenAI. Causas: Render e Supabase provavelmente em regiões diferentes + cliente Supabase síncrono (bloqueia o worker async).
- **Capacidade confortável: ~30–60 alunos** em uso normal; chat engasga acima de ~5–10 simultâneos (segura conexão ~3s esperando OpenAI).
- ⚠️ `--workers 2` em `backend/Dockerfile:45` e `railway.toml:13` arrisca OOM no Free (512MB) — considerar `--workers 1` no Render Free.
- **Maiores ganhos (ordem):** 1) co-localizar Render+Supabase na mesma região (grátis); 2) Render Starter $7 (tira spin-down); 3) cliente Supabase async / pooler transaction mode.

## Cost Optimization Rules

- Always prioritize minimal context usage
- Never analyze the entire codebase unless explicitly requested
- Focus only on the selected file or explicitly mentioned path
- Keep responses short and code-focused
- Avoid long explanations unless explicitly requested

## Interaction Style

- Prefer small, incremental edits
- Assume the user is working on a specific file
- Do not explore unrelated parts of the codebase
- Respond like an inline code assistant (similar to Copilot)

## Context Rules

- Do not load multiple files unless necessary
- If no file is specified, ask for clarification instead of guessing
