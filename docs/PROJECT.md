# ANAMNES.IA — Visão Geral do Projeto

> Documentação local de contexto. Ignorado pelo git. Atualizado manualmente conforme o projeto evolui.

---

## O que é

Plataforma educacional de medicina que permite alunos praticarem **anamnese clínica** simulada com pacientes virtuais alimentados por GPT-4 (OpenAI Assistant API). Professores criam casos clínicos, atribuem a turmas e acompanham o desempenho. Admins gerenciam instituições e usuários em massa.

---

## Stack

| Camada       | Tecnologia                                      |
|-------------|------------------------------------------------|
| Backend     | FastAPI + Python 3.12, Uvicorn                 |
| Frontend    | React 19 + TypeScript + Vite 7 + Tailwind 4   |
| Banco       | Supabase (PostgreSQL + Auth)                   |
| IA          | OpenAI gpt-4o-mini — chat.completions + Responses API (file_search na vector store). Assistants API removida; histórico no banco. Ver MIGRATION_OPENAI.md |
| Email       | Resend (welcome emails com credenciais)        |
| Observ.     | Langfuse — prompt management + tracing (opcional; app funciona sem as keys) |
| Deploy BE   | Render (`https://anamnes-ia-a4qw.onrender.com`) — migração para Railway Hobby planejada |
| Deploy FE   | Vercel (`https://www.anamnes.chat`)             |

---

## Repositório

```
https://github.com/luizfsjunior/anamnes.ia
```

Branch principal: `master`

---

## Monorepo — Estrutura de Pastas

```
anamnes-ai/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── auth/           # client.py, security.py, service.py
│   │   ├── db/             # supabase.py (DI factory)
│   │   ├── models/         # schemas.py, user.py (DB helpers)
│   │   ├── routes/         # api.py, admin.py, cases.py, classes.py, dashboard.py, profile.py, flashcards.py, health.py
│   │   └── services/       # chat_service.py, openai_service.py, eval_service.py, generation_service.py, flashcard_service.py, retention_service.py (LGPD), email_service.py
│   ├── requirements.txt
│   └── .env
├── frontend/anamnes-ia/
│   └── src/
│       ├── app/            # App.tsx (router), MainPage.tsx
│       ├── config/         # constants.ts, env.ts
│       ├── core/           # hooks, utils, lib
│       ├── features/       # domínios por role
│       └── shared/         # componentes e tipos globais
├── docs/                   # ← esta pasta (local, ignorado pelo git)
│   ├── PROJECT.md
│   ├── BACKEND.md
│   └── FRONTEND.md
└── docker-compose.yml
```

---

## Papéis de usuário

| Role      | Acesso                                                                 |
|-----------|------------------------------------------------------------------------|
| `student` | Chat com paciente IA, histórico, profile, casos livres + atribuídos   |
| `teacher` | Tudo de student + criar turmas, criar casos, dashboard de alunos, ver perfil/chat de alunos |
| `admin`   | Tudo acima + gerenciar instituições, criar usuários em massa           |

---

## Banco de Dados (Supabase) — Tabelas Principais

```
users
  id (uuid, FK = Supabase Auth uid)
  email, name, role, institution, institution_id
  user_type (free | paid)
  language (pt-BR | en | es, default pt-BR — SPEC-007/i18n; check constraint users_language_check)
  active (bool)
  created_at

conversations
  id, user_id, thread_id (OpenAI), title, type
  created_at

messages
  id, conversation_id, role (user|assistant|system)
  content, timestamp

classes
  id, teacher_id, name, code (unique invite), term
  status (active|inactive), open_join (bool), goal
  created_at

class_students
  class_id, student_id, joined_at

class_teachers          ← turmas compartilhadas entre professores
  class_id, teacher_id, added_at

cases
  id, teacher_id, title, specialty, difficulty
  summary, patient_prompt, form_data (JSONB)
  published (bool), visibility (public|private)
  created_at, updated_at

case_assignments
  id, case_id, class_id, due_date, assigned_at

case_attempts
  id, case_id, student_id, conversation_id
  status (in_progress|completed|abandoned)
  score (0-100), feedback (text), duration_seconds
  started_at, completed_at

institutions
  id, name, description, address, active, created_at

platform_settings
  key (text PK), value   ← max_tokens, max_turns, etc.
```

---

## Variáveis de Ambiente

### Backend (.env)

```env
SUPABASE_URL=https://hzisbcckgsuibqwpplub.supabase.co
SUPABASE_KEY=<service_role_key>
SECRET_KEY=<jwt_signing_key>
OPENAI_API_KEY=sk-proj-...
ASSISTANT_ID=asst_Z4bevA781Ec964rWFg7Mvv85
FRONTEND_URL=https://www.anamnes.chat
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173,https://anamnes.chat
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@anamnes.chat
DATABASE_URL=postgresql://...
OPENAI_MODEL=gpt-4o-mini
OPENAI_VECTOR_STORE_ID=vs_...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000/api   # prod: https://anamnes-ia-a4qw.onrender.com/api
VITE_SUPABASE_URL=https://hzisbcckgsuibqwpplub.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

---

## Autenticação

1. Frontend chama `POST /api/login`
2. Backend chama `supabase.auth.sign_in_with_password()`
3. Retorna JWT próprio (HS256, 24h, payload: `sub, email, role, name, language`)
4. Frontend armazena no localStorage
5. `authFetch.ts` injeta `Authorization: Bearer {jwt}` automaticamente
6. Token expira com buffer de 60s → logout automático

---

## Deploy

```bash
# Push para master → Render rebuilda backend automaticamente
# Push para master → Vercel rebuilda frontend automaticamente

# Rodar local (Docker):
docker-compose up

# Rodar local (sem Docker):
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend/anamnes-ia && npm run dev
```

---

## Features Status

| Feature                         | Status |
|---------------------------------|--------|
| Chat com paciente IA            | ✅     |
| SOAP notes + avaliação          | ✅     |
| Turmas + códigos de convite     | ✅     |
| Compartilhar turma c/ professor | ✅     |
| Criação de casos (manual + IA)  | ✅     |
| Atribuição de casos a turmas    | ✅     |
| Dashboard professor             | ✅     |
| Visualizar tentativas de alunos | ✅     |
| Histórico de conversa por tentativa | ✅ |
| Perfil do aluno + estatísticas  | ✅     |
| Admin: Criar usuários em massa  | ✅     |
| Admin: Gerenciar instituições   | ✅     |
| Admin: Deletar usuários          | ✅     |
| Email de boas-vindas (Resend)   | ✅     |
| Professor acessa chat de alunos | ✅     |
| Mobile responsive (sidebar drawer) | ✅  |
| Bulk upsert (criar/atualizar em massa) | ✅ |
| Pagamentos                      | 🔲 placeholder |
| Minigame de treinamento         | 🔲 parcial     |
| Flashcards (decks/cards + SM-2) | ✅     |
| Flashcards: gerar a partir da conversa (IA) | ✅ |
| Migração OpenAI Responses API    | ✅ (Assistants API removida; ver MIGRATION_OPENAI.md) |
| Langfuse (prompt management)    | ✅ (opcional)  |
| Migração Render → Railway         | 🔲 planejado |

---

## Limites Diários de Uso (DAILY_LIMITS)

Controlados em `cases.py`. Professores são tratados como `b2b` internamente.

| Tipo de caso | free | paid | b2b (teacher) |
|-------------|------|------|---------------|
| AI (chat IA improvisado) | 0 | 2 | 2 |
| Regular (caso pré-existente) | 2 | 2 | 2 |

- `_get_daily_quota()` conta tentativas `in_progress` + `completed` do dia
- Quota verificada nos endpoints `POST /cases/ai/start` e `POST /cases/{id}/start`
- Configurável via tabela `platform_settings` (keys: `gpt_max_tokens`, `gpt_max_turns`)

---

## Segurança (implementado)

- Headers HTTP: HSTS, X-Frame-Options, CSP, X-Content-Type-Options
- Rate limit: global 100/min, login 10/min, register 2/min, chat 20/min
- JWT HS256, 24h, com middleware de verificação em cada rota protegida
- UUID validation em todos os path params
- Pydantic v2 em todos os inputs
- Email normalizado com `.lower().strip()` antes de qualquer operação
- CORS restrito a origens configuradas
