# ANAMNES.IA — Backend

> Documentação local. Ignorado pelo git.

---

## Estrutura de arquivos

```
backend/
├── app/
│   ├── main.py                  # App FastAPI, middlewares, routers
│   ├── config.py                # Env vars, logging, validação startup
│   ├── auth/
│   │   ├── client.py            # Supabase client (simples)
│   │   ├── security.py          # Middleware headers + verify_jwt_token()
│   │   └── service.py           # signup(), login(), create_jwt_token()
│   ├── db/
│   │   └── supabase.py          # get_supabase_client() — DI factory
│   ├── models/
│   │   ├── schemas.py           # 15+ Pydantic models
│   │   └── user.py              # get_or_create_user(), get_or_create_conversation(), save_message(), get_messages()
│   ├── routes/
│   │   ├── api.py               # Auth + Chat
│   │   ├── health.py            # Health checks
│   │   ├── cases.py             # Casos clínicos
│   │   ├── classes.py           # Turmas
│   │   ├── dashboard.py         # Analytics professor
│   │   ├── admin.py             # Administração
│   │   ├── profile.py           # Perfil do aluno
│   │   └── flashcards.py        # Flashcards (student/teacher/admin) + SM-2
│   └── services/
│       ├── chat_service.py      # Lógica de chat (paciente virtual)
│       ├── openai_service.py    # Wrapper OpenAI (complete/complete_json/complete_with_files) + Langfuse
│       ├── eval_service.py      # Avaliação SOAP
│       ├── generation_service.py# Geração de casos via IA
│       ├── flashcard_service.py # Lógica de flashcards + SM-2
│       ├── retention_service.py # Retenção / spaced repetition
│       └── email_service.py     # Resend email
├── requirements.txt
├── .env
└── .env.example
```

---

## main.py

```python
app = FastAPI(...)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True, ...)
app.state.limiter = slowapi.Limiter(key_func=get_remote_address)
# Routers registrados com prefix /api:
app.include_router(health.router,    prefix="/api")
app.include_router(api.router,       prefix="/api")
app.include_router(cases.router,     prefix="/api")
app.include_router(classes.router,   prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(admin.router,     prefix="/api")
app.include_router(profile.router,   prefix="/api")
app.include_router(flashcards.router,prefix="/api")
```

---

## config.py

Lê e valida env vars. Logger configurado com nível definido por `LOG_LEVEL`.
Exporta: `SUPABASE_URL`, `SUPABASE_KEY`, `SECRET_KEY`, `OPENAI_API_KEY`, `ASSISTANT_ID`, `OPENAI_MODEL`, `OPENAI_MODEL_EVAL`, `OPENAI_VECTOR_STORE_ID`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST`, `FRONTEND_URL`, `ALLOWED_ORIGINS`, `logger`.

---

## auth/security.py — Dependências de segurança

```python
def verify_jwt_token(authorization: str = Header(...)):
    # Extrai token do header "Bearer ..."
    # Verifica com HS256, SECRET_KEY
    # Retorna payload: {sub, email, role, name, exp}

def validate_uuid(value: str, field_name: str) -> str:
    # Levanta HTTPException 400 se não for UUID válido

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    # Adiciona: HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
    # Referrer-Policy, Permissions-Policy
```

---

## auth/service.py — Autenticação

```python
def signup(name, email, password, role="student") -> tuple[str, str]:
    # Cria conta no Supabase Auth
    # Retorna (resultado, token) onde resultado pode ser:
    #   "EMAIL_EXISTS", "RATE_LIMIT", "INVALID_EMAIL", None (erro), ou string de sucesso

def login(email, password) -> dict | None:
    # Chama supabase.auth.sign_in_with_password()
    # Retorna {"token": jwt, "user": {...}} ou None

def create_jwt_token(user_id, email, role, name) -> str:
    # Cria JWT HS256 com exp=24h
    # Payload: sub=user_id, email, role, name
```

---

## models/user.py — Helpers de banco

```python
def get_or_create_user(email, name, user_id=None, role="student") -> dict:
    email = email.lower().strip()
    # 1. Busca por email
    # 2. Busca por id (fallback)
    # 3. Faz INSERT
    # 4. Em caso de duplicate key: faz SELECT por id

def get_or_create_conversation(user_id, thread_id, title="", type="chat") -> dict

def save_message(conversation_id, role, content) -> dict
    # role: "user" | "assistant" | "system"

def get_messages(conversation_id) -> list[dict]
    # Ordenado por timestamp ASC
```

---

## models/schemas.py — Pydantic Models

```python
# Auth
LoginRequest(email, password)
RegisterRequest(name, email, password)
AuthResponse(token, user)

# Chat
ChatRequest(message, thread_id?, case_id?)
ChatResponse(reply, thread_id, conversation_id)

# Classes
ClassCreate(name, term?, status, open_join, goal?)
ClassUpdate(...)
ClassResponse(id, teacher_id, name, code, ...)
ClassWithStudents(... students: list)

# Cases
CaseGenerateRequest(description, specialty?, difficulty?)
CaseCreate(title, specialty, difficulty, summary, patient_prompt, form_data?)
CaseUpdate(...)
CaseResponse(...)
CaseAssignRequest(class_id, due_date?)

# Attempts
CaseStartResponse(attempt_id, conversation_id, thread_id)
CaseCompleteRequest(soap_notes, attempt_id)
CaseCompleteResponse(score, feedback)

# Dashboard
DashboardStats, CaseStats, StudentStats
```

---

## routes/api.py — Auth & Chat

| Método | Rota                        | Auth | Rate  | Descrição                          |
|--------|-----------------------------|------|-------|------------------------------------|
| POST   | `/api/login`                | ❌   | 10/m  | Login, retorna JWT                 |
| POST   | `/api/register`             | ❌   | 5/m   | Registro                           |
| GET    | `/api/me`                   | ✅   | —     | Dados do usuário logado            |
| POST   | `/api/start_chat`           | ✅   | —     | Cria thread OpenAI, caso opcional  |
| POST   | `/api/gpt`                  | ✅   | 20/m  | Envia msg ao assistant, salva no DB|
| GET    | `/api/conversations`        | ✅   | —     | Lista conversas recentes           |
| POST   | `/api/conversations/update-titles` | ✅ | —  | Backfill de títulos                |
| GET    | `/api/conversations/{id}`   | ✅   | —     | Conversa + mensagens + avaliação   |

---

## routes/cases.py — Casos Clínicos

| Método | Rota                                | Auth  | Descrição                                       |
|--------|-------------------------------------|-------|-------------------------------------------------|
| GET    | `/api/cases/quota`                  | ✅    | Limites diários (free=0 AI, paid=2 AI, 2 reg)  |
| POST   | `/api/cases/generate`               | ✅ T  | Gera caso via GPT (retorna JSON, não salva)     |
| POST   | `/api/cases`                        | ✅ T  | Salva caso aprovado                             |
| GET    | `/api/cases`                        | ✅ T  | Lista casos do professor                        |
| GET    | `/api/cases/free`                   | ✅    | Casos públicos de admins                        |
| POST   | `/api/cases/ai/start`               | ✅ S  | Inicia chat IA improvisado (sem caso fixo)      |
| GET    | `/api/cases/{id}`                   | ✅    | Detalhes do caso                                |
| PATCH  | `/api/cases/{id}`                   | ✅ T  | Atualiza caso                                   |
| DELETE | `/api/cases/{id}`                   | ✅ T  | Deleta caso                                     |
| POST   | `/api/cases/{id}/assign`            | ✅ T  | Atribui caso a turma (qualquer professor com acesso à turma, não apenas o dono) |
| GET    | `/api/cases/{id}/assignments`       | ✅ T  | Turmas que têm o caso                           |
| GET    | `/api/cases/{id}/attempts`          | ✅ T  | Tentativas de alunos neste caso                 |
| GET    | `/api/cases/{id}/attempts/{att_id}/messages` | ✅ T | Mensagens de uma tentativa |
| POST   | `/api/cases/{id}/start`              | ✅ S  | Inicia tentativa em caso pré-existente          |
| POST   | `/api/cases/{id}/complete`           | ✅ S  | Envia SOAP, GPT avalia (score+feedback)         |
| PATCH  | `/api/cases/attempts/{id}/abandon`  | ✅ S  | Marca tentativa como abandonada                 |
| GET    | `/api/cases/student/available`       | ✅ S  | Casos disponíveis (turmas matriculadas)         |

Legenda: T=teacher/admin, S=student

---

## routes/classes.py — Turmas

| Método | Rota                                       | Descrição                                    |
|--------|--------------------------------------------|----------------------------------------------|
| POST   | `/api/classes`                             | Cria turma com código único de 6 chars       |
| GET    | `/api/classes`                             | Turmas do professor (próprias + compartilhadas) |
| GET    | `/api/classes/{id}`                        | Detalhes + lista de alunos                   |
| PATCH  | `/api/classes/{id}`                        | Atualiza metadata                            |
| POST   | `/api/classes/{code}/join`                 | Aluno entra via código                       |
| DELETE | `/api/classes/{id}`                        | Deleta (apenas dono)                         |
| DELETE | `/api/classes/{id}/students/{sid}`         | Remove aluno                                 |
| GET    | `/api/classes/{id}/teachers`               | Professores com acesso à turma               |
| GET    | `/api/classes/{id}/institution-teachers`   | Professores da inst. disponíveis p/ convite  |
| POST   | `/api/classes/{id}/share/{tid}`            | Compartilha turma com outro professor        |
| DELETE | `/api/classes/{id}/share/{tid}`            | Revoga acesso compartilhado                  |

---

## routes/dashboard.py — Analytics

| Método | Rota                                              | Descrição                                     |
|--------|---------------------------------------------------|-----------------------------------------------|
| GET    | `/api/dashboard/stats`                            | Métricas gerais (turmas, alunos, tentativas) |
| GET    | `/api/dashboard/cases`                            | Stats por caso                                |
| GET    | `/api/dashboard/students`                         | Stats por aluno                               |
| GET    | `/api/dashboard/students/{student_id}/history`    | Histórico de tentativas de um aluno           |
| GET    | `/api/dashboard/weekly`                           | Médias semanais (últimas 10 semanas)          |

---

## routes/admin.py — Administração

```python
# Dependency: verifica role == "admin"
def verify_admin(payload=Depends(verify_jwt_token)):
    if payload.get("role") != "admin": raise 403

# Helper interno
def _generate_password(length=12) -> str:  # secrets.choice sobre alphanum
```

| Método | Rota                                    | Descrição                                        |
|--------|-----------------------------------------|--------------------------------------------------|
| GET    | `/api/admin/overview`                   | Stats gerais da plataforma                       |
| GET    | `/api/admin/institutions`               | Lista instituições + contagem de usuários        |
| POST   | `/api/admin/institutions`               | Cria instituição                                 |
| PATCH  | `/api/admin/institutions/{id}`          | Atualiza                                         |
| DELETE | `/api/admin/institutions/{id}`          | Deleta                                           |
| GET    | `/api/admin/users`                      | Lista usuários (filtros: role, institution_id) — retorna id, name, email, role, institution, active, created_at, user_type |
| POST   | `/api/admin/users/teacher`              | Cria professor único                             |
| POST   | `/api/admin/users/students/bulk`        | Cria vários alunos de uma vez                    |
| POST   | `/api/admin/users/teachers/bulk`        | Cria vários professores de uma vez               |
| PATCH  | `/api/admin/users/{user_id}/status`     | Ativa/desativa conta                             |
| DELETE | `/api/admin/users/{user_id}`            | Deleta permanentemente (public.users + auth.users)|

**Fluxo de criação em massa:**
- Aceita `skip_email_confirmation: bool`
- Se `true`: usa `sb.auth.admin.create_user(email_confirm=True)` → instantâneo
- Se `false`: usa `signup()` → Supabase envia email de confirmação
- Após criar: chama `send_welcome_email()` → envia email com credenciais
- Erros por aluno/professor são isolados (não cancela o loop)

---

## routes/profile.py

| Método | Rota                                        | Descrição                                      |
|--------|---------------------------------------------|------------------------------------------------|
| GET    | `/api/profile/me`                           | Perfil completo + stats + histórico + turmas   |
| PUT    | `/api/profile/me`                           | Atualiza nome/instituição                      |
| POST   | `/api/profile/change-password`              | Troca senha (verifica senha atual)             |
| GET    | `/api/profile/{student_id}`                  | Perfil do aluno (teacher/admin)                |

---

## routes/flashcards.py — Flashcards (SM-2)

Prefixo `/api/flashcards`. Decks/cards por escopo: `student` (próprios), `teacher`, `admin` (globais).
Admin **não** é arquivo separado — vive aqui sob `/admin/*`.

| Método | Rota                                          | Escopo  | Descrição                         |
|--------|-----------------------------------------------|---------|-----------------------------------|
| GET    | `/api/flashcards/decks`                       | ✅      | Decks visíveis ao usuário         |
| GET    | `/api/flashcards/decks/{id}/cards`            | ✅      | Cards de um deck (revisão)        |
| POST   | `/api/flashcards/review`                      | ✅      | Registra revisão (SM-2)           |
| GET/POST/PUT/DELETE | `/api/flashcards/student/decks...`| S       | CRUD de decks/cards do aluno      |
| GET/POST/PUT/DELETE | `/api/flashcards/teacher/decks` / `/decks` / `/cards...` | T | CRUD de decks/cards do professor |
| GET/POST/PUT/DELETE | `/api/flashcards/admin/decks...`  | Admin   | CRUD de decks/cards globais       |
| POST   | `/api/flashcards/generate-from-conversation`  | ✅      | Gera cards de uma conversa (IA)   |

Legenda: T=teacher/admin, S=student

---

## routes/health.py

| Método | Rota                   | Descrição                          |
|--------|------------------------|------------------------------------|
| GET    | `/api/health`          | Status completo (app + DB + OpenAI)|
| GET    | `/api/health/liveness` | 200 OK (Kubernetes probe)          |
| GET    | `/api/health/readiness`| Verifica conectividade com DB      |

---

## services/chat_service.py

```python
def handle_chat_message(user_id, message, thread_id, case_id=None) -> dict:
    # 1. get_or_create_conversation()
    # 2. Verifica limite de turnos (platform_settings.max_turns)
    # 3. save_message(role="user")
    # 4. get_patient_response(history) → openai_service.complete_with_files()
    #    (histórico carregado do banco; sem threads OpenAI)
    # 5. save_message(role="assistant")
    # 6. Retorna {reply, thread_id, conversation_id}
```

---

## services/openai_service.py

Camada base de acesso à OpenAI — todos os serviços chamam este módulo, nunca o SDK direto.
Integrado ao Langfuse (rastreamento + prompt management); funciona sem Langfuse se as keys faltarem.

```python
def complete(messages, model=DEFAULT_MODEL, temperature=0.7, max_tokens=800) -> str
    # chat.completions simples (sem arquivos)

def complete_json(messages, ...) -> str
    # força response_format JSON — usar para geração de casos, avaliação, flashcards

def complete_with_files(messages, ...) -> str
    # Responses API com file_search na vector store (OPENAI_VECTOR_STORE_ID)
    # usado pelo paciente virtual; fallback para complete() se vector store ausente

def get_prompt(name, **vars) -> str
    # busca prompt no Langfuse e compila variáveis; fallback local se indisponível
```

> Migração concluída: o antigo `gpt_assistant.py` (Assistants API + threads) foi removido.
> O histórico das conversas vive 100% no banco (tabela `messages`); `conversations.thread_id` é legado.

---

## services/eval_service.py

```python
def evaluate_soap(soap_content, case_summary, conversation_history="") -> dict:
    # Usa EVAL_MODEL (OPENAI_MODEL_EVAL) — pode ser modelo diferente do chat
    # Busca prompt "soap-evaluation-prompt" no Langfuse; fallback local se indisponível
    # Retorna {"score": int (0-100), "feedback": str, "breakdown": dict | None}
    # Guard contra inflação: SOAP vazio/genérico → cap 10
```

**Modelo usado**: `OPENAI_MODEL_EVAL` (env var). Se não definido, fallback para `OPENAI_MODEL`.

---

## services/generation_service.py

```python
# Gera caso clínico via IA a partir de descrição livre
# Usa DEFAULT_MODEL (OPENAI_MODEL) + complete_json()
# Retorna JSON estruturado com title, specialty, difficulty, summary, patient_prompt, form_data
```

---

## services/flashcard_service.py

```python
# Algoritmo SM-2 de repetição espaçada
# Calcula intervalo, ease factor e próxima revisão a partir da qualidade da resposta (0-5)
# Estados: new, learning, review, suspended
# Gera flashcards a partir de uma conversa via complete_json() (generate-from-conversation)
```

---

## services/retention_service.py

```python
# Retenção de dados — LGPD Art. 15 & 16
# cleanup_old_messages(): anonimiza conteúdo de mensagens com > 90 dias (RETENTION_DAYS),
# preservando metadados (id, conversation_id, role, created_at) para estatísticas.
```

---

## services/email_service.py

```python
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL     = os.getenv("RESEND_FROM_EMAIL", "noreply@anamnes.chat")
FRONTEND_URL   = os.getenv("FRONTEND_URL", "https://www.anamnes.chat")

def send_welcome_email(name, email, password, role="student") -> bool:
    # Se RESEND_API_KEY vazio: loga warning, retorna False
    # Chama resend.Emails.send() com template HTML estilizado
    # reply_to: "anamnesia.dev@gmail.com"
    # Nunca levanta exceção (falha silenciosa)
    # Retorna True/False

def _build_welcome_html(name, email, password, role) -> str:
    # Template HTML completo com gradiente roxo
    # Exibe: email + senha temporária + botão "Acessar plataforma"
    # Rodapé com instrução de trocar senha
```

---

## Rate Limiting (slowapi)

```python
@limiter.limit("10/minute")   # login
@limiter.limit("5/minute")    # register
@limiter.limit("20/minute")   # POST /api/gpt
# Global: 100/minute
```

---

## Padrões de código

```python
# Todas as rotas protegidas usam:
payload = Depends(verify_jwt_token)
user_id = payload.get("sub")

# Supabase client via DI:
sb = Depends(get_supabase_client)
# — ou dentro de função síncrona:
sb = get_supabase_client()

# UUID validation obrigatório em path params:
validate_uuid(some_id, "some_id")

# Email sempre normalizado:
email = email.lower().strip()

# Erros retornados como:
raise HTTPException(status_code=4xx, detail="mensagem")
```

---

## Dependências (requirements.txt)

```
openai
httpx
psycopg2-binary
python-dotenv
supabase
uvicorn
fastapi
python-jose[cryptography]
slowapi
tenacity
email-validator
pydantic>=2.0.0
resend
langfuse
```
