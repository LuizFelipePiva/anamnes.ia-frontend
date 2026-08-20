# 🚀 Anamnes AI — Quick Dev Reference para Cursor

**Status:** April 27, 2026 | Master branch | commit `c612f1ab`

---

## 🎯 O que é este projeto?

Uma **plataforma educacional** que permite estudantes de medicina praticarem anamnese (entrevista médica) conversando com **pacientes virtuais alimentados por GPT-4 Turbo**.

---

## 📦 Stack

| Camada | Tech |
|--------|------|
| Frontend | React 19 + TypeScript + Vite + Tailwind 4 |
| Backend | FastAPI + Python 3.13 + OpenAI |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth + JWT |
| Hosting | Vercel (frontend) + Render (backend) |

---

## 🗂️ Estrutura Rápida

```
backend/                    → FastAPI, /routes, /services, OpenAI
frontend/anamnes-ia/
  ├── src/app/             → App.tsx (routing)
  ├── src/core/            → Auth, hooks, utilities
  ├── src/features/        → Módulos (auth, chat, cases, teacher, admin, student, flashcards)
  ├── src/shared/utils/    → SPECIALTIES centralizadas ✨
  └── src/index.css        → Theme vars (dark/light)
```

---

## 🔧 Executar Localmente

```bash
# Terminal 1: Backend
cd backend
python -m venv venv
source venv/bin/activate  # ou .\venv\Scripts\activate no Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend/anamnes-ia
npm install
npm run dev

# Acesso
Frontend: http://localhost:5173
Backend:  http://localhost:8000
Swagger:  http://localhost:8000/docs
```

---

## ✨ Features Recentes (April 2026)

### ✅ Just Implemented
1. **Specialties Centralization** (`shared/utils/specialties.ts`)
   - Single source of truth para 14 especialidades médicas
   - Importado por: CasesPage, FlashcardsPage, AdminFlashcardsView, AdminPanel, CaseForm
   - Cada specialty: `key`, `label`, `emoji`, `color`

2. **Dark/Light Theme** (`core/components/ThemeProvider.tsx`)
   - localStorage-based theme persistence
   - CSS vars in `index.css` (--bg-primary, --text-primary, etc.)
   - Settings page integration

3. **Flashcards Admin** (AdminPanel → Flashcards tab)
   - Create/edit/delete decks
   - Create/edit/delete cards
   - Associate com cases
   - Backend: 8 routes + admin service

4. **Student Flashcards Tab** (StudentDashboard)
   - Placeholder vazio (em desenvolvimento)
   - Ícone Layers, posicionado entre Desempenho e Conquistas

### 📋 Student Dashboard
6 abas:
- **Visão Geral** — stats, atividade recente, gráfico semanal
- **Minhas Turmas** — casos atribuídos + enroll
- **Histórico** — todas tentativas
- **Desempenho** — gráficos semanal/mensal
- **Flashcards** — placeholder (study mode em dev)
- **Conquistas** — badges

---

## 🌟 Next Priorities

### High Priority
1. **Complete Flashcards for Students**
   - Study mode (flip cards)
   - Spaced repetition (SM-2 algorithm)
   - Due count tracking
   - Review states: new, learning, review, suspended

2. **Settings Refinements**
   - Theme dark/light (já tem a base ✅)
   - Notificação preferences
   - Account settings (password, email)

3. **Performance & UX**
   - Lazy load images
   - Skeleton loaders
   - Error retry logic

### Medium Priority
- Mini-games educacionais
- Export PDF (SOAP Notes)
- Recomendação inteligente de casos
- Badges/Achievements system

### Low Priority
- WebSocket real-time notifications
- Mobile app (React Native)
- Multi-language (i18n)

---

## 🔑 Key Files & Patterns

### Auth & Config
- `frontend/src/core/hooks/useAuth.ts` → useAuth() hook para current user
- `frontend/src/config/env.ts` → VITE_* vars
- `backend/app/config.py` → Supabase + OpenAI config

### API Communication
- `frontend/src/core/utils/authFetch.ts` → fetch wrapper com JWT
- `backend/app/routes/*.py` → Define endpoints
- `backend/app/services/*.py` → Lógica de negócio

### Database
- All tables em Supabase PostgreSQL
- RLS policies em tabelas sensíveis
- Tables: cases, case_attempts, conversations, flashcard_decks, flashcard_cards, users, etc.

### Path Aliases (use sempre!)
```typescript
// ❌ Não fazer
import { Component } from '../../../features/auth/components/Component';

// ✅ Fazer
import { Component } from '@/features/auth';  // Se houver barrel export
// ou
import Component from '@/features/auth/components/Component';
```

---

## 🛣️ Main Routes

### Frontend
- `/` → Redirect (login ou dashboard)
- `/login` → Login page
- `/student-dashboard` → Main student hub
- `/student-chat` → Chat com paciente virtual
- `/cases` → Case listing
- `/teacher-dashboard` → Teacher hub
- `/admin` → Admin panel
- `/settings` → User settings
- `/profile` → User profile

### Backend
- `/api/health` → Health check
- `/api/gpt` → Send message to AI (chat do paciente)
- `/api/cases/*` → Case CRUD
- `/api/classes/*` → Class management
- `/api/dashboard/*` → Stats & analytics
- `/api/flashcards/*` → Flashcards: student/teacher/admin (sub-paths) + SM-2 review
- `/api/profile/*` → User profile
- `/docs` → Swagger UI

---

## 💡 Padrões & Convenções

### Naming
- Routes: kebab-case (`/student-chat`)
- Files: PascalCase (components), camelCase (utils/services/hooks)
- Variables: camelCase
- Types: PascalCase
- Constants: UPPER_SNAKE_CASE ou PascalCase

### TypeScript
- Strict mode enabled
- Explicit types > `any`
- Interfaces for API responses

### React Components
```typescript
// ✅ Padrão
interface Props {
  title: string;
  onSubmit: (data: FormData) => Promise<void>;
  disabled?: boolean;
}

export function MyComponent({ title, onSubmit, disabled }: Props) {
  return <div>{title}</div>;
}
```

### Git Commits
- `feat:` nova feature
- `fix:` bug fix
- `refactor:` refatoring (sem mudança funcional)
- `docs:` documentação
- `chore:` dependências, config, etc.

---

## 🚨 Common Issues & Fixes

| Problema | Solução |
|----------|---------|
| CORS error do backend | Verificar `VITE_API_URL` em `.env.local` |
| 401 Unauthorized | JWT expirou, fazer re-login |
| `Cannot find module '@/...'` | Verificar `tsconfig.app.json` path aliases |
| OpenAI rate limit | Retry com backoff já implementado (`openai_service.py` via tenacity; frontend `fetchWithRetry.ts`) |
| Supabase connection refused | Verificar `DATABASE_URL` e service role key |
| Theme não muda | Limpar localStorage: `localStorage.clear()` |

---

## 📚 Documentação Completa

Para contexto **muito detalhado**, ver:
- **`CONTEXT_FULL.md`** — Arquitetura, features, deploy, próximas prioridades
- **`docs/BACKEND.md`** — Detalhes backend
- **`docs/FRONTEND.md`** — Detalhes frontend
- **`docs/PROJECT.md`** — Business logic & flows
- **`README.md`** — Overview + Quick Start

---

## 🔗 Links Úteis

- **GitHub:** https://github.com/luizfsjunior/anamnes.ia
- **Backend Prod:** https://anamnes-backend-dev.onrender.com
- **Frontend Prod:** https://anamnes-ia.vercel.app
- **Supabase Dashboard:** https://app.supabase.com
- **OpenAI Platform:** https://platform.openai.com

---

## 🎓 Dicas para Continuar

1. **Sempre** use `@/` path aliases
2. **Types-first:** defina interfaces antes de implementar
3. **Test locally** antes de push
4. **Check docs** (CONTEXT_FULL.md) antes de features novas
5. **Commit com frequência** (pequenos commits > grandes commits)
6. **Rebase** antes de merge para manter histórico limpo

---

*Gerado: April 27, 2026 | Última atualização: commit c612f1ab*
