# 🩺 Anamnes AI - Contexto Técnico Completo

**Última atualização:** April 27, 2026  
**Branch:** `master`  
**Commit:** 4107cfa

---

## 📑 Índice
1. [Visão Geral](#visão-geral)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitetura](#arquitetura)
4. [Estrutura de Diretórios](#estrutura-de-diretórios)
5. [Features Implementadas](#features-implementadas)
6. [Features em Desenvolvimento](#features-em-desenvolvimento)
7. [Configuração & Deploy](#configuração--deploy)
8. [Padrões & Convenções](#padrões--convenções)
9. [Próximas Prioridades](#próximas-prioridades)

---

## Visão Geral

**Anamnes AI** é uma plataforma educacional que permite estudantes de medicina praticarem anamnese (entrevista médica) através de conversas realistas com pacientes virtuais alimentados por **GPT-4 Turbo**.

### Usuários
- **Estudantes** — praticam casos, acompanham evolução, estudam com flashcards
- **Professores** — criam/gerenciam casos, turmas, acompanham progresso
- **Administradores** — gerenciam instituições, usuários, configurações OpenAI/Supabase

### Modelo de Negócio
- Freemium: alguns casos gratuitos
- Plano Pago: acesso a mais casos + Chat IA ilimitado
- Quotas diárias: 5 casos/dia (free), ilimitado (paid)

---

## Stack Tecnológico

### Frontend
- **React 19.1.0** + TypeScript 5.8.3
- **Vite 7.0.4** — bundler/dev server
- **Tailwind CSS 4.1.11** — estilos
- **React Router 7.x** — roteamento
- **Lucide React** — ícones
- **Supabase JS Client** — autenticação & real-time

**Hosting:** Vercel (prod), localhost:5173 (dev)

### Backend
- **FastAPI 1.0.0** + Python 3.13+
- **Supabase PostgreSQL** — banco de dados
- **OpenAI GPT-4 Turbo** — IA para pacientes virtuais
- **SQLAlchemy** — ORM (em alguns contextos)
- **Pydantic** — validação de dados

**Hosting:** Render.com em container Docker (prod), localhost:8000 (dev)  
**Database:** Supabase (prod), local dev

### Infraestrutura
- **Supabase** — PostgreSQL, Auth, RLS
- **Docker** — containerização (backend & nginx frontend)
- **Docker Compose** — orquestração dev
- **GitHub** — versionamento, CI/CD
- **Render** — deploy backend

---

## Arquitetura

### Fluxo de Autenticação
```
[Cliente] 
  ↓ (email/senha)
[Supabase Auth] 
  ↓ (JWT Token)
[React useAuth] 
  ↓ (authFetch com token)
[FastAPI Backend] 
  ↓ (service_role_key + JWT validation)
[Database]
```

### Fluxo de Chat (Caso Médico)
```
[StudentChat Page]
  ↓ (selectCase)
[Supabase DB] → Load case details + patient prompt
  ↓
[Chat Loop]
  Student Message → [Backend POST /api/gpt] 
    → [OpenAI (chat.completions / Responses + file_search) + System Prompt] 
    → AI Response → [Update Attempt]
```

### Fluxo de Flashcards (Admin)
```
[AdminPanel → Flashcards Tab]
  ↓ [Create/Edit/Delete Deck]
[Backend POST /api/flashcards/admin/decks]
  ↓ [Create in DB]
[DeckCards] 
  ↓ [Add/Edit/Delete Cards]
[Backend POST/PUT/DELETE /api/flashcards/admin/decks/{id}/cards | /admin/cards/{id}]
```

---

## Estrutura de Diretórios

```
d:\projeto\anamnes-ai/
├── README.md
├── CONTEXT_FULL.md                    ← THIS FILE
├── docs/
│   ├── BACKEND.md
│   ├── FRONTEND.md
│   ├── MIGRATION_OPENAI.md
│   └── PROJECT.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.prod.example
│── dev.ps1

└── backend/
    ├── __init__.py
    ├── Dockerfile
    ├── pyproject.toml
    ├── requirements.txt
    ├── railway.toml
    ├── render.yaml
    ├── README.md
    ├── app/
    │   ├── __init__.py
    │   ├── main.py                    ← FastAPI app entry
    │   ├── config.py                  ← ENV vars & Supabase config
    │   ├── auth/
    │   │   ├── client.py              ← Supabase client setup
    │   │   ├── security.py            ← JWT validation
    │   │   └── service.py             ← Auth helpers
    │   ├── db/
    │   │   └── supabase.py            ← DB client
    │   ├── models/
    │   │   ├── schemas.py             ← Pydantic models
    │   │   └── user.py                ← User data models
    │   ├── routes/
    │   │   ├── admin.py               ← /api/admin/* (institutions, users, classes, cases)
    │   │   ├── api.py                 ← /api/login, /register, /me, /start_chat, /gpt, /conversations
    │   │   ├── cases.py               ← /api/cases/* (CRUD cases)
    │   │   ├── classes.py             ← /api/classes/* (CRUD classes)
    │   │   ├── dashboard.py           ← /api/dashboard/* (stats, student overview)
    │   │   ├── flashcards.py          ← /api/flashcards/* (student/teacher/admin + generate-from-conversation)
    │   │   ├── health.py              ← /api/health
    │   │   └── profile.py             ← /api/profile/* (user profile, settings)
    │   └── services/
    │       ├── chat_service.py        ← Paciente virtual (openai_service.complete_with_files)
    │       ├── email_service.py       ← Email notifications
    │       ├── eval_service.py        ← Avaliação SOAP
    │       ├── flashcard_service.py   ← Lógica de flashcards + SM-2
    │       ├── generation_service.py  ← Geração de casos via IA
    │       ├── openai_service.py      ← Wrapper OpenAI (complete/complete_json/complete_with_files) + Langfuse
    │       └── retention_service.py   ← Retenção de dados (LGPD): anonimiza mensagens > 90 dias

└── frontend/anamnes-ia/
    ├── index.html
    ├── index.preview.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    ├── eslint.config.js
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── PREVIEW_MODE.md
    ├── README.md
    └── src/
        ├── main.tsx
        ├── main.preview.tsx
        ├── index.css                  ← Global styles + theme vars
        ├── vite-env.d.ts
        ├── app/
        │   ├── App.tsx                ← Route setup + main layout
        │   ├── App.css
        │   └── MainPage.tsx           ← Redirect logic
        ├── config/
        │   ├── constants.ts           ← Magic strings, API defaults
        │   └── env.ts                 ← VITE_* env var parsing
        ├── core/
        │   ├── components/
        │   │   ├── ThemeProvider.tsx  ← Dark/Light theme toggle
        │   │   ├── themePreferences.ts ← localStorage theme management
        │   │   ├── ErrorBoundary.tsx
        │   │   ├── ProtectedRoute.tsx
        │   │   └── index.ts
        │   ├── hooks/
        │   │   ├── useAuth.ts         ← Auth context hook
        │   │   ├── useToast.ts        ← Toast notifications
        │   │   └── index.ts
        │   ├── lib/
        │   │   └── supabaseClient.ts  ← Supabase instance
        │   └── utils/
        │       ├── authFetch.ts       ← Wrapper around fetch + JWT
        │       ├── errorHandler.ts
        │       ├── fetchWithRetry.ts
        │       ├── logger.ts
        │       └── index.ts
        ├── features/
        │   ├── admin/
        │   │   ├── types/
        │   │   │   └── admin.ts       ← Type definitions
        │   │   ├── pages/
        │   │   │   └── AdminPanel.tsx ← Main admin interface (Institutions, Users, Classes, Cases, Flashcards)
        │   │   ├── components/
        │   │   │   └── AdminFlashcardsView.tsx ← Admin deck/card CRUD
        │   │   └── services/
        │   │       └── adminService.ts ← API calls
        │   ├── auth/
        │   │   ├── pages/
        │   │   │   └── Login.tsx
        │   │   ├── components/
        │   │   │   └── [...auth components]
        │   │   ├── context/
        │   │   │   └── AuthContext.tsx
        │   │   ├── services/
        │   │   │   └── authService.ts
        │   │   └── index.ts
        │   ├── case/
        │   │   ├── mocks/
        │   │   │   └── freeCases.ts
        │   │   └── pages/
        │   │       └── CasesPage.tsx  ← Case listing + free case modal
        │   ├── chat/
        │   │   ├── components/
        │   │   │   ├── ChatGPT.tsx
        │   │   │   └── ChatHistoryCarousel.tsx
        │   │   ├── context/
        │   │   │   └── ThreadContext.tsx
        │   │   ├── pages/
        │   │   │   ├── StudentChat.tsx ← Main chat interface
        │   │   │   └── ConversationView.tsx
        │   │   ├── services/
        │   │   │   └── studentService.ts
        │   │   └── utils/
        │   │       └── chatUtils.ts
        │   ├── flashcards/
        │   │   ├── types/
        │   │   │   └── index.ts
        │   │   ├── pages/
        │   │   │   └── FlashcardsPage.tsx ← Student flashcard viewer (readonly)
        │   │   ├── components/
        │   │   │   ├── DeckCard.tsx
        │   │   │   └── [...flashcard components]
        │   │   └── services/
        │   │       └── flashcardService.ts
        │   ├── minigame/
        │   │   ├── components/
        │   │   └── pages/
        │   ├── navigator/
        │   ├── payments/
        │   ├── profile/
        │   │   ├── types/
        │   │   │   └── profile.ts
        │   │   ├── pages/
        │   │   │   └── ProfilePage.tsx
        │   │   ├── components/
        │   │   └── services/
        │   │       └── profileService.ts
        │   ├── settings/
        │   │   ├── pages/
        │   │   │   └── Settings.tsx   ← Theme, notifications, account settings
        │   │   └── services/
        │   ├── student/
        │   │   └── pages/
        │   │       └── StudentDashboard.tsx ← Main student hub (Visão Geral, Minhas Turmas, Histórico, Desempenho, Flashcards, Conquistas)
        │   ├── teacher/
        │   │   ├── types/
        │   │   │   └── teacher.ts
        │   │   ├── pages/
        │   │   │   ├── TeacherChat.tsx        ← Dashboard professor (turmas, casos, alunos)
        │   │   │   └── TeacherNewCaseChat.tsx ← Criar caso clínico via IA
        │   │   ├── components/
        │   │   │   ├── CaseForm.tsx   ← Create/edit case form
        │   │   │   ├── FlashcardsView.tsx
        │   │   │   └── [...gráficos: DonutChart, EngagementRing, PerformanceChart]
        │   │   └── services/
        │   │       └── teacherService.ts
        │   └── [other features]
        ├── shared/
        │   ├── components/
        │   │   ├── MainMenu.tsx       ← Header com nav
        │   │   ├── PreviewNavigator.tsx
        │   │   └── index.ts
        │   └── utils/
        │       ├── specialties.ts     ← SINGLE SOURCE OF TRUTH for specialties
        │       └── index.ts
        └── assets/

└── supabase/
    └── seed.sql                       ← Database initialization
```

---

## Features Implementadas

### 1. **Autenticação & Autorização**
- Supabase Auth (email/senha)
- JWT token validation no backend
- Role-based access (student, teacher, admin)
- Protected routes frontend

### 2. **Chat com Paciente Virtual**
- Real-time chat com GPT-4 Turbo
- System prompts customizáveis por caso
- Conversão SOAP Notes
- Scoring automático
- Histórico de tentativas
- AI Chat mode (sem avaliação)

### 3. **Gestão de Casos**
- Criar/editar/deletar casos (teacher/admin)
- Atribuir casos a turmas
- Filtros por especialidade, dificuldade, turma
- Free cases (visitante)
- Busca por titulo/patologia

### 4. **Flashcards**
- Admin cria/gerencia decks e cards
- Alunos estudam com flashcards (readonly)
- Spaced repetition (SRS) — algoritmo SM-2
- Review states: new, learning, review, suspended
- Due count tracking

### 5. **Dashboard Aluno**
- Visão Geral: estatísticas, atividade recente, evolução semanal
- Minhas Turmas: casos atribuídos por turma
- Histórico: todas as tentativas
- Desempenho: gráficos semanal/mensal
- Flashcards: *placeholder* (em desenvolvimento)
- Conquistas: badges

### 6. **Dashboard Professor**
- Criar turmas
- Gerenciar alunos (add/remove)
- Criar/editar casos
- Visualizar progresso dos alunos
- Estatísticas por turma

### 7. **Painel Admin**
- Gerenciar instituições
- Gerenciar usuários (criar, ativar/desativar)
- Gerenciar turmas e alocações
- Casos gratuitos (CRUD)
- Flashcards admin: decks e cards (CRUD)
- Configurações OpenAI (tokens, modelo)
- Quotas e saldo GPT

### 8. **Themes & Preferences**
- Dark/Light mode (localStorage based)
- ThemeProvider component
- Theme vars in index.css (--bg-primary, --text-primary, etc.)

### 9. **Specialties Centralization** ✨
- `shared/utils/specialties.ts` → single source of truth
- 14 especialidades: Clínica Geral, Cardiologia, Neurologia, etc.
- Cada specialty: `key`, `label`, `emoji`, `color`
- Helpers: `getSpecialty()`, `specialtyColor()`, `specialtyEmoji()`
- Importado em: CasesPage, FlashcardsPage, AdminFlashcardsView, AdminPanel, CaseForm

---

## Features em Desenvolvimento

### 1. **Flashcards para Alunos**
- **Status:** Aba vazia na StudentDashboard (placeholder)
- **Plan:** 
  - Alunos criam/gerenciam seus próprios decks
  - Sistema de review (SRS)
  - Integração com casos (extrair termos chave)

### 2. **Mini-games Educacionais**
- Espaço reservado em `/features/minigame/`
- Ideias: Quiz, Drag-and-drop diagnóstico, Timeline médica

### 3. **Sistema de Pagamentos**
- Espaço reservado em `/features/payments/`
- Integração com Stripe/outro gateway

### 4. **Notifications**
- Email service implementado (backend)
- Ainda não integrado ao frontend

### 5. **Export & Relatórios**
- PDF geração de SOAP Notes
- Relatório de progresso

---

## Configuração & Deploy

### Variáveis de Ambiente

**Frontend** (`.env.local` ou VITE_* no build):
```env
VITE_API_URL=http://localhost:8000/api          # Local dev
# ou
VITE_API_URL=https://anamnes-backend-dev.onrender.com/api  # Prod
```

**Backend** (`.env`):
```env
DATABASE_URL=postgresql://[user]:[pass]@db.supabase.co:5432/postgres
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[key]
OPENAI_API_KEY=[key]
OPENAI_MODEL=gpt-4-turbo                        # Default
JWT_SECRET=[same as Supabase]
```

### Deploy Local

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # ou .\venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend/anamnes-ia
npm install
npm run dev   # → http://localhost:5173
```

**Docker Compose:**
```bash
docker-compose up  # Starts backend + frontend + postgres
```

### Deploy Production

**Render (Backend):**
- Connected to GitHub `master`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Environment variables via dashboard

**Vercel (Frontend):**
- Connected to GitHub `master`
- Build: `npm run build`
- Output: `dist/`
- Environment: `VITE_API_URL=https://anamnes-backend-dev.onrender.com/api`

**Supabase:**
- PostgreSQL hosted
- Auth configured
- RLS policies in place

---

## Padrões & Convenções

### TypeScript
- Strict mode enabled
- Explicit types preferred
- Interfaces for API responses/requests

### React/Frontend
- Functional components + hooks
- Context API for state (Auth, Chat, Toast)
- Tailwind utility classes (no CSS files unless necessary)
- Component organization by feature
- Props drilling minimized

### Naming Conventions
- **Routes:** kebab-case (`/student-chat`, `/student-dashboard`)
- **Files:** PascalCase (components), camelCase (utils/services/hooks)
- **Variables:** camelCase
- **Types:** PascalCase (interfaces, types)
- **Enum/Constants:** UPPER_SNAKE_CASE or PascalCase

### Backend
- Async/await everywhere
- Service layer for business logic
- Route layer for HTTP handling
- Pydantic models for validation
- Error handling with proper HTTP status codes

### Git Workflow
- **master:** production-ready, all features merged
- **feat/[feature-name]:** feature branches
- Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- PR review before merge

### Database (Supabase)
- Tables: snake_case
- Primary keys: `id` (UUID)
- Foreign keys: `[table]_id`
- Timestamps: `created_at`, `updated_at` (auto)
- RLS enabled on sensitive tables

---

## Próximas Prioridades

### Alta Prioridade
1. **Flashcards para Alunos** (feat/flashcards branch exists)
   - Create/edit/delete custom decks
   - Study mode com SRS
   - Integration com casos

2. **Completar Admin → Flashcards** (DONE ✅)
   - Create/edit/delete decks ✅
   - Create/edit/delete cards ✅
   - Associate cards com cases ✅

3. **Settings Melhorado**
   - Theme dark/light ✅
   - Preferências de notificação
   - Dados pessoais & senha

4. **Performance & UX**
   - Lazy load images
   - Skeleton loaders
   - Error retry logic

### Média Prioridade
1. Mini-games educacionais
2. Export PDF de SOAP Notes
3. Sistema de recomendação de casos
4. Conquistas (badges system)

### Baixa Prioridade
1. Notificações em tempo real (WebSocket)
2. Dark/light theme refinements
3. Mobile-first optimization

---

## Quick Reference

### Key URLs (Local)
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000/api`
- Docs: `http://localhost:8000/docs` (Swagger)
- Database: Supabase console (browser)

### Key Commands
```bash
# Backend
cd backend
python -m uvicorn app.main:app --reload

# Frontend
cd frontend/anamnes-ia
npm run dev      # Dev
npm run build    # Prod build
npm run lint     # ESLint

# Git
git checkout master
git pull origin master
git checkout feat/[branch]
git push origin [branch]
```

### Important Files
- `docs/BACKEND.md` — Backend detailed documentation
- `docs/FRONTEND.md` — Frontend components & hooks
- `docs/PROJECT.md` — Business logic & flows
- `backend/app/config.py` — Supabase & OpenAI config
- `frontend/src/config/env.ts` — Frontend env vars

---

## Contato & Suporte

**GitHub Repo:** https://github.com/luizfsjunior/anamnes.ia  
**Deployment:**
- **Backend:** Render.com (anamnes-backend-dev.onrender.com)
- **Frontend:** Vercel (anamnes-ia.vercel.app)

---

*Este documento foi gerado automaticamente e deve ser atualizado conforme novas features são adicionadas.*
