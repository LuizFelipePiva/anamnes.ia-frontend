# ANAMNES.IA — Frontend

> Documentação local. Ignorado pelo git.

---

## Stack

| Tecnologia        | Versão  |
|-------------------|---------|
| React             | 19.1.0  |
| TypeScript        | 5.8.3   |
| Vite              | 7.0.4   |
| Tailwind CSS      | 4.1.11  |
| React Router      | 7.7.1   |
| Supabase JS       | 2.76.1  |
| Lucide React      | 0.576.0 |
| Embla Carousel    | 8.6.0   |

---

## Estrutura de arquivos

```
frontend/anamnes-ia/src/
├── main.tsx                     # Entry point
├── app/
│   ├── App.tsx                  # Router + AuthProvider + ErrorBoundary
│   └── MainPage.tsx             # Dashboard principal do aluno
├── config/
│   ├── constants.ts             # STORAGE_KEYS, TIMEOUTS, HTTP_STATUS, rotas
│   └── env.ts                   # Valida VITE_* vars obrigatórias
├── core/
│   ├── components/
│   │   ├── ErrorBoundary.tsx
│   │   ├── ProtectedRoute.tsx   # Verifica token; exporta tb RoleRoute (checa role do JWT, admin sempre passa)
│   │   ├── ThemeProvider.tsx    # Context de tema dark/light
│   │   ├── themePreferences.ts  # Persistência do tema no localStorage
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useAuth.ts           # handleLogin, handleRegister, logout
│   │   └── useToast.ts          # Notificações
│   ├── lib/
│   │   └── supabaseClient.ts    # Instância Supabase
│   └── utils/
│       ├── authFetch.ts         # Fetch autenticado (injeta JWT, retry, logout 401)
│       ├── fetchWithRetry.ts    # Retry logic com backoff
│       ├── errorHandler.ts      # Handler de erros global
│       └── logger.ts            # Logger wrapper
├── features/                    # ← domínios por funcionalidade
│   ├── auth/
│   ├── chat/
│   ├── case/
│   ├── flashcards/
│   ├── teacher/
│   ├── student/
│   ├── profile/
│   ├── admin/
│   ├── navigator/
│   ├── minigame/
│   ├── payments/
│   └── settings/
└── shared/
    ├── components/              # Componentes reutilizáveis globais
    │   ├── MainMenu.tsx
    │   ├── TipsCarousel.tsx
    │   ├── SoapForm.tsx
    │   ├── Tooltip.tsx
    │   ├── PreviewNavigator.tsx
    │   ├── layout/AppLayout.tsx
    │   └── ui/
    │       ├── Toast.tsx
    │       └── Card.tsx
    ├── types/                   # Tipos TypeScript globais
    └── utils/                   # Utilitários globais
```

---

## Rotas (App.tsx)

```
/                       → LoginPage                         (público)
/register               → redirect /                        (público)
/confirm                → EmailConfirmedPage                (público)
/reset-password         → ResetPasswordPage                 (público)

/mainpage               → MainPage                          (protegido)
/cases                  → CasesPage                         (protegido)
/student-chat           → StudentChatPage                   (protegido)
/settings               → SettingsPage                      (protegido)
/payments               → PaymentsPage                      (protegido)
/profile                → ProfilePage (próprio)             (protegido)
/profile/:id            → ProfilePage (aluno)               [teacher, admin]

/conversation/:id       → ConversationView                  [student, teacher]
/minigame               → MinigamePage                      [student, teacher]
/student                → StudentDashboard                  [student, teacher, admin]

/teacherpage            → TeacherChatPage                   [teacher]
/teacher/new-case       → TeacherNewCaseChatPage            [teacher]

/admin                  → AdminPanel                        [admin]
```

Obs: `ProtectedRoute` checa token. `RoleRoute` checa `roles` do payload JWT.

---

## config/constants.ts

```typescript
STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',       // JWT armazenado aqui
}

TIMEOUTS = {
  API_REQUEST: 30000,             // 30s timeout nas chamadas
  JWT_REFRESH_BUFFER: 60000,      // logout 60s antes de expirar
}
```

---

## core/utils/authFetch.ts

```typescript
async function authFetch(input, init?) {
  // 1. Lê token do localStorage (STORAGE_KEYS.AUTH_TOKEN)
  // 2. Se vazio → globalLogout() + redirect /
  // 3. Se expirado (exp - 60s < now) → globalLogout() + redirect /
  // 4. Injeta header: Authorization: Bearer {token}
  // 5. Chama fetchWithRetry()
  // 6. Se 401 → globalLogout()
  // 7. Se 403 → passa para o caller (não faz logout)
  // 8. Retorna Response
}
```

**Usar sempre `authFetch` em vez de `fetch` para chamadas autenticadas.**

---

## Features

### auth/

```
components/
  LoginForm.tsx       # Form de login com email/senha
  RegisterForm.tsx    # Form de registro
pages/
  Login.tsx           # Página de login (usa LoginForm)
  EmailConfirmed.tsx  # Página após confirmar email
  ResetPassword.tsx   # Redefinição de senha via Supabase
context/
  authContext.ts      # AuthProvider, useAuthContext, globalLogout()
services/
  authService.ts      # login(), register(), resetPassword()
index.ts              # Barrel exports
```

**authContext:** guarda estado de autenticação. `globalLogout()` é chamado pelo `authFetch` em 401.

---

### chat/

```
components/
  ChatGPT.tsx              # Interface de chat com bolhas de mensagem
  ChatHistoryCarousel.tsx  # Carrossel de conversas recentes (Embla)
context/
  ThreadProvider           # Gerencia thread_id atual
pages/
  StudentChatPage.tsx      # Chat livre (sem caso específico)
  ConversationView.tsx     # Visualiza conversa histórica
services/
  studentService.ts        # Chamadas: startChat(), sendMessage(), getConversations()
utils/
  chatUtils.ts
index.ts
```

---

### case/

```
mocks/
  freeCases.ts     # Casos locais mock (gratuitos, sem backend)
pages/
  CasesPage.tsx    # Lista todos os casos disponíveis para o aluno
                   # Modal de caso gratuito exibe: persona_nome, persona_idade (anos), queixa_principal
                   # Sem avatar (pacientes são virtuais)
index.ts           # Exporta freeCaseMocks
```

---

### flashcards/

```
components/
  DeckCard.tsx             # Card de deck na listagem
pages/
  FlashcardsPage.tsx       # Listagem de decks + modo de revisão (SM-2)
services/
  flashcardService.ts      # getDecks(), getCards(), review(), CRUD por escopo
types/
  index.ts                 # Tipos de deck/card/review
index.ts
```

Consome `/api/flashcards/*`. Decks por escopo: student (próprios), teacher, admin (globais).

---

### teacher/

```
components/
  DonutChart.tsx          # Gráfico de rosca (completion rate) — CSS conic-gradient, sem overflow
  EngagementRing.tsx      # Anel de engajamento — SVG viewBox 36x36, sem overflow
  PerformanceChart.tsx    # Gráfico de desempenho (linhas) — SVG com PAD_TOP=40 para tooltip, overflow-hidden
  CreateClassModal.tsx    # Modal criar turma
  ClassSharingPanel.tsx   # Compartilhar turma com professores (Tailwind)
  CaseForm.tsx            # Form de criação/edição de caso
  FlashcardsView.tsx      # Gestão de decks/cards do professor
  index.ts
pages/
  TeacherChat.tsx          # Dashboard do professor: turmas, casos, alunos, analytics
                           # inclui modal de tentativas e modal de conversa
                           # Modal de conversa: feedback exibido completo (sem truncamento), com whitespace-pre-line
                           # Gráfico semanal inline (RenderReports): PAD_TOP=40, overflow-hidden, viewBox ajustado para tooltip
  TeacherNewCaseChat.tsx   # Chat para criar caso clínico via IA
services/
  teacherService.ts        # API calls do professor
utils/
  chartUtils.ts
types/
  teacher.ts               # Interfaces: ClassInfo, ClassWithStudents, ClassStudent,
                           # SharedTeacher, ClassTeachersResponse, etc.
index.ts
```

**Tipos principais (teacher.ts):**
```typescript
ClassInfo { id, teacher_id, name, code, term, status, open_join, goal, created_at }
ClassWithStudents extends ClassInfo { students: ClassStudent[], students_count }
ClassStudent { id, name, email, joined_at }
SharedTeacher { id, name, email, is_owner, added_at }
```

---

### student/

```
components/
  StudentFlashcardsView.tsx  # Aba de flashcards do aluno no dashboard
pages/
  StudentDashboard.tsx    # Dashboard do aluno (stats, histórico resumido)
```

---

### profile/

```
pages/
  ProfilePage.tsx          # Perfil completo: stats + especialidades + histórico
services/
  profileService.ts        # getProfile(), updateProfile(), changePassword()
types/
  profile.ts               # Interfaces completas
index.ts
```

**Tipos (profile.ts):**
```typescript
ProfileUser    { id, name, email, institution, role, user_type, avatar_url }
ProfileStats   { total_attempts, completed, average_score, best_score, average_duration_seconds }
SpecialtyStats { specialty, attempts, completed, average_score }
WeeklyScore    { week, avg_score }
AttemptHistory { attempt_id, case_id, case_title, specialty, difficulty, score,
                 feedback, status, started_at, duration_seconds, is_ai_chat,
                 conversation_id, queixa_principal }
EnrolledClass  { class_id, name, code, joined_at }
StudentProfile { user, stats, specialty_stats, weekly_scores, attempts, classes }
```

---

### admin/

```
components/
  AdminFlashcardsView.tsx  # CRUD de decks/cards globais (/api/flashcards/admin/*)
pages/
  AdminPanel.tsx      # Painel admin completo com abas
services/
  adminService.ts     # API calls admin
types/
  admin.ts            # Interfaces admin
```

**Abas do AdminPanel (AdminTab):**
`'overview' | 'institutions' | 'teachers' | 'students' | 'classes' | 'free-cases' | 'gpt'`

**Tipos (admin.ts):**
```typescript
AdminUser      { id, name, email, role, institution, active, created_at, user_type }
Institution    { id, name, description, address, active, teachers, students, active_users, inactive_users }
AdminOverview  { total_users, total_students, total_teachers, total_admins,
                 total_institutions, total_cases, total_classes, total_attempts, total_completed }
GptSettings    { gpt_max_tokens, gpt_max_turns, defaults }
BulkStudent    { name, email, password?, user_type? }
BulkCreateResult { email, status, temporary_password? }
CreateTeacherPayload { name, email, institution_id, password? }
```

---

### navigator/

```
components/
  PageNavigatorCard.tsx    # Card de navegação rápida entre páginas
pages/
  PageNavigator.tsx
index.ts
```

---

### minigame/

```
components/
  TrainingModules.tsx   # Módulos de treino (listagem)
pages/
  Minigame.tsx
```

---

### payments/

```
pages/
  Payments.tsx    # Placeholder — sem implementação real
```

---

### settings/

```
pages/
  Settings.tsx    # Configurações do usuário
```

---

## Shared Components

| Componente              | Uso                                                   |
|-------------------------|-------------------------------------------------------|
| `MainMenu.tsx`          | Menu lateral/superior de navegação global             |
| `TipsCarousel.tsx`      | Carrossel de dicas educacionais                       |
| `SoapForm.tsx`          | Formulário de notas SOAP (Subjetivo/Objetivo/Avaliação/Plano) |
| `Tooltip.tsx`           | Tooltip genérico                                      |
| `PreviewNavigator.tsx`  | Navegador de preview                                  |
| `AppLayout.tsx`         | Layout padrão com MainMenu                            |
| `Toast.tsx`             | Notificação toast                                     |
| `Card.tsx`              | Card genérico de UI                                   |

---

## app/MainPage.tsx

Dashboard principal do aluno (`/mainpage`). Funcionalidades:
- Saudação com base na hora do dia
- Carrossel de casos diários (casos livres, rotacionados por seed do dia)
- Seção de casos livres (API `/api/cases/free` + mocks locais)
- Badge de dificuldade com gradiente de cor por nível
- Modal de preview do caso com botão confirmar/iniciar
- Busca perfil do aluno (`GET /api/profile/me`)
- Stats semanais: tentativas, conclusões, média
- Carrossel de histórico de chats recentes
- Seção de módulos de treinamento
- Carrossel de dicas (`TipsCarousel`)
- Exibe status de quota (free vs. paid)

---

## Design System

| Elemento         | Valor                              |
|------------------|------------------------------------|
| Cor primária     | `#844AF5` (roxo)                   |
| Gradiente        | `from #844AF5 to #6b35ff`          |
| Ícones           | Lucide React                       |
| Fonte base       | Inter (system-ui fallback)         |
| Estilo           | Tailwind CSS utility-first         |
| Carrossel        | Embla Carousel                     |
| Responsive       | Mobile-first                       |

---

## Padrões de código

```typescript
// Toda chamada autenticada usa:
import { authFetch } from '@/core/utils/authFetch';
const res = await authFetch(`${API_URL}/rota`, { method: 'POST', body: JSON.stringify(data) });

// Token lido/salvo sempre via:
localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)

// Alias de path configurado no vite.config.ts:
@/ → src/

// Barrel exports por feature:
// Ex: import { TeacherChatPage } from '@/features/teacher'

// Proteção de rotas:
<ProtectedRoute>       // Qualquer usuário autenticado
<RoleRoute roles={[]}> // Roles específicas

// Resultado do JWT decodificado:
{ sub: userId, email, role, name, exp }
```

---

## Variáveis de ambiente (Frontend)

```env
VITE_API_URL=https://anamnes-ia-a4qw.onrender.com/api   # prod
VITE_SUPABASE_URL=https://hzisbcckgsuibqwpplub.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```
