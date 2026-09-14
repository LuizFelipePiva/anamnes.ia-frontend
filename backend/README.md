# Anamnes AI — Backend

## 📋 Visão Geral

Backend da plataforma Anamnes AI: FastAPI + Python 3.12+, integrado ao OpenAI (`gpt-4o-mini`) e Supabase (auth + PostgreSQL). A camada de IA foi migrada da Assistants API para `chat.completions` + Responses API com `file_search` na vector store dos PDFs médicos. Observabilidade e prompt management via Langfuse (opcional).

## 🛠️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | FastAPI |
| Linguagem | Python 3.12+ |
| Banco | Supabase (PostgreSQL + RLS) |
| Auth | JWT HS256 (24h) via Supabase Auth |
| IA | OpenAI gpt-4o-mini — chat.completions + Responses API |
| Observabilidade | Langfuse (prompt management + tracing) — opcional |
| Rate Limiting | slowapi |
| Retry | tenacity (3× exponential backoff) |
| Validação | Pydantic v2 |
| Email | Resend |

## 🏗️ Estrutura

```
backend/
├── app/
│   ├── main.py              # FastAPI app, middlewares, routers
│   ├── config.py            # Env vars, logging, validate_environment()
│   ├── auth/
│   │   ├── client.py        # Supabase Auth client
│   │   ├── security.py      # verify_jwt_token(), validate_uuid(), SecurityHeadersMiddleware
│   │   └── service.py       # signup(), login(), create_jwt_token()
│   ├── db/
│   │   └── supabase.py      # get_supabase_client() — injetado via DI
│   ├── models/
│   │   ├── schemas.py       # Schemas Pydantic de request/response
│   │   └── user.py          # get_or_create_user(), save_message(), get_messages()
│   ├── routes/              # Camada HTTP — só validação e HTTPException
│   │   ├── api.py           # /login, /register, /me, /start_chat, /gpt, /conversations
│   │   ├── cases.py         # /cases/* — CRUD, geração IA, tentativas, janelas de disponibilidade
│   │   ├── classes.py       # /classes/* — turmas, alunos, compartilhamento
│   │   ├── dashboard.py     # /dashboard/* — métricas e relatórios do professor
│   │   ├── admin.py         # /admin/* — instituições, usuários em massa
│   │   ├── profile.py       # /profile/* — perfil do usuário
│   │   ├── flashcards.py    # /flashcards/* — decks/cards (student/teacher/admin) + SM-2
│   │   └── health.py        # /health, /health/liveness, /health/readiness
│   └── services/            # Lógica de negócio — chamado somente pelas rotas
│       ├── openai_service.py    # Wrapper OpenAI: complete(), complete_json(), complete_with_files() + Langfuse
│       ├── chat_service.py      # Paciente virtual — carrega histórico do banco e chama openai_service
│       ├── eval_service.py      # Avaliação SOAP (score 0-100 + breakdown S/O/A/P)
│       ├── generation_service.py# Geração de casos clínicos via IA
│       ├── flashcard_service.py # SM-2 (spaced repetition) + geração de flashcards
│       ├── retention_service.py # LGPD: anonimiza mensagens com > 90 dias
│       └── email_service.py     # E-mail transacional via Resend
├── pyproject.toml
├── requirements.txt
├── .env.example
├── Dockerfile
├── render.yaml
└── railway.toml
```

## ⚙️ Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```bash
# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_KEY=[service_role_key]

# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_MODEL_EVAL=gpt-4o-mini      # modelo usado para avaliação SOAP
OPENAI_VECTOR_STORE_ID=vs_...      # vector store com PDFs médicos

# Auth
SECRET_KEY=[jwt_signing_key_min_32_chars]

# CORS
ALLOWED_ORIGINS=http://localhost:5173,https://www.anamnes.chat

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@anamnes.chat
FRONTEND_URL=https://www.anamnes.chat

# Observabilidade (opcional — app funciona sem estes)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Misc
ENVIRONMENT=development    # ou production (desativa Swagger/ReDoc)
LOG_LEVEL=INFO
DATABASE_URL=              # Postgres direto (opcional)
```

## 🚀 Como Rodar

```bash
cd backend

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env  # e preencha os valores

# Iniciar servidor de desenvolvimento
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend disponível em: http://localhost:8000  
Swagger (só em desenvolvimento): http://localhost:8000/docs

## 📡 Endpoints Principais

### Auth & Chat

| Método | Endpoint | Rate Limit | Descrição |
|--------|----------|:----------:|-----------|
| `POST` | `/api/login` | 10/min | Login, retorna JWT |
| `POST` | `/api/register` | 5/min | Registro |
| `GET` | `/api/me` | — | Dados do usuário logado |
| `POST` | `/api/start_chat` | — | Cria thread + conversa |
| `POST` | `/api/gpt` | 20/min | Mensagem ao paciente virtual |
| `GET` | `/api/conversations` | — | Lista conversas recentes |
| `GET` | `/api/conversations/{id}` | — | Conversa + mensagens + avaliação |

### Casos Clínicos

| Método | Endpoint | Acesso | Descrição |
|--------|----------|--------|-----------|
| `POST` | `/api/cases/generate` | Teacher | Gera caso via IA |
| `POST` | `/api/cases` | Teacher | Salva caso aprovado |
| `GET` | `/api/cases/student/available` | Student | Casos disponíveis na turma |
| `POST` | `/api/cases/{id}/start` | Student | Inicia tentativa |
| `POST` | `/api/cases/{id}/complete` | Student | Avalia SOAP (score 0-100) |
| `POST` | `/api/cases/{id}/assign` | Teacher | Atribui caso a turma com prazo |

### Flashcards (SM-2)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/flashcards/decks` | Decks visíveis |
| `POST` | `/api/flashcards/review` | Registra revisão (SM-2) |
| `POST` | `/api/flashcards/generate-from-conversation` | Gera cards de uma conversa |
| `GET/POST/PUT/DELETE` | `/api/flashcards/student/*` | CRUD aluno |
| `GET/POST/PUT/DELETE` | `/api/flashcards/admin/*` | CRUD admin (global) |

### Health

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/health` | Status completo (app + DB + OpenAI) |
| `GET` | `/api/health/liveness` | 200 OK (Kubernetes) |
| `GET` | `/api/health/readiness` | Verifica conectividade DB |

## 🛡️ Segurança

- **Headers**: HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, CSP via `SecurityHeadersMiddleware`
- **Rate limiting** (slowapi): global 100/min; login 10/min; register 5/min; `/api/gpt` 20/min
- **JWT** HS256, 24h, verificado em todas as rotas protegidas com `Depends(verify_jwt_token)`
- **UUID validation**: `validate_uuid()` obrigatório em path params
- **Email**: normalizado com `.lower().strip()` antes de qualquer operação
- **CORS**: restrito a `ALLOWED_ORIGINS`
- **RLS**: habilitado em tabelas sensíveis no Supabase — mudanças de schema podem exigir atualização de policies
- **Supabase client**: injetado via `Depends(get_supabase_client)`, nunca instanciado ad hoc

## 🔄 Arquitetura de IA

Toda chamada OpenAI passa por `openai_service.py` — nunca diretamente pelo SDK:

```python
# Paciente virtual (usa vector store dos PDFs médicos)
complete_with_files(messages)   # → Responses API com file_search

# Geração de casos e avaliação SOAP (sem arquivos)
complete_json(messages)         # → chat.completions com response_format JSON

# Histórico da conversa vive 100% no banco (tabela messages)
# conversations.thread_id é legado da Assistants API — pode ser null em novas conversas
```

Prompts gerenciados no Langfuse (editáveis sem redeploy). Se Langfuse indisponível, o serviço usa fallback local.

**Rastreamento por sessão**: as chamadas do paciente virtual carregam o `conversation_id` como sessão, então o Langfuse agrupa a consulta inteira num único Session em vez de N traces soltos. É também o que permite ligar uma avaliação externa (a bancada `anamnes-bench`) de volta à conversa que a originou.

⚠️ **O canal difere por endpoint** — e errar isso derruba toda conversa:

| endpoint | como passar a sessão | helper |
|---|---|---|
| `chat.completions.create` | kwargs `name` / `session_id`, extraídos pelo wrapper | `_langfuse_kwargs()` |
| `responses.create` | `metadata={"langfuse_session_id": ...}` | `_responses_metadata()` |

O wrapper `langfuse.openai` intercepta `session_id` apenas em `chat.completions`. Em `responses.create` — que é o caminho do paciente virtual com vector store — o kwarg vaza para o SDK e levanta `Responses.create() got an unexpected keyword argument 'session_id'`, fazendo toda mensagem cair no fallback "Desculpe, não consegui processar sua mensagem". Sem Langfuse configurado os dois helpers devolvem dict vazio, e a chamada segue no SDK puro da OpenAI.

## 📊 Padrões de Código

```python
# Todas as rotas protegidas
payload = Depends(verify_jwt_token)
user_id = payload.get("sub")
sb = Depends(get_supabase_client)

# UUID em path params — obrigatório
validate_uuid(case_id, "case_id")

# Email — sempre normalizar
email = email.lower().strip()

# Erros — use o helper em vez de HTTPException(detail="string") direto
from app.errors import http_error
raise http_error(status_code=4xx, code="slug_estavel", detail="mensagem")
# code é o que o front traduz via t("errors.<code>"); handler global em main.py
# achata o envelope {"detail", "code"} — nunca aninha (ver app/routes/CLAUDE.md)
```

## 🧪 Testes e lint

```bash
# De dentro da pasta backend/
python -m ruff check app/
pytest -q
```

`backend/tests/` cobre correções de segurança (SPEC-001/002/004/006) e i18n (SPEC-007/010/011) — 182 testes, ~2s (nenhum I/O real: Supabase e OpenAI mockados em `tests/conftest.py`). Roda no CI (`ci.yml` → job backend: ruff + py_compile + pytest) em todo push/PR para `master`.

## 🐛 Troubleshooting

**Backend não inicia**
```bash
python -m uvicorn app.main:app --reload
# Verifique se .env existe e SUPABASE_URL/SUPABASE_KEY/SECRET_KEY estão preenchidos
```

**Porta 8000 em uso (Windows)**
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Rate limit atingido**: aguarde 1 minuto ou ajuste em `main.py`.

## 📄 Deploy

- **Render** (`render.yaml`): conectado ao GitHub `master` — rebuild automático
- **Railway** (`railway.toml`): alternativa planejada
- **Docker**: `docker-compose up --build` para full-stack local

---

**Última atualização**: junho de 2026
