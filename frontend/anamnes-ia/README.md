# Anamnes AI — Frontend

## 📋 Visão Geral

Interface React da plataforma Anamnes AI: estudantes praticam anamnese conversando com pacientes virtuais gerados por `gpt-4o-mini`. Professores gerenciam turmas, casos e acompanham alunos. Admins gerenciam usuários e instituições.

## 🛠️ Stack

| Tecnologia | Versão |
|-----------|--------|
| React | 19.1.0 |
| TypeScript | 5.8.3 (strict mode) |
| Vite | 7.0.4 |
| Tailwind CSS | 4.1.11 |
| React Router | 7.7.1 |
| Supabase JS | 2.76.1 |
| Lucide React | 0.576.0 |
| Recharts | 2.x |
| Embla Carousel | 8.6.0 |

## 🏗️ Estrutura

```
frontend/anamnes-ia/src/
├── main.tsx
├── app/
│   ├── App.tsx              # Router + AuthProvider + ErrorBoundary
│   └── MainPage.tsx         # Dashboard principal do aluno (/mainpage)
├── config/
│   ├── constants.ts         # STORAGE_KEYS, TIMEOUTS, HTTP_STATUS, rotas
│   └── env.ts               # Valida VITE_* vars (fail-fast)
├── core/
│   ├── components/
│   │   ├── ErrorBoundary.tsx
│   │   ├── ProtectedRoute.tsx  # Verifica token; exporta ProtectedRoute + RoleRoute (admin sempre passa)
│   │   ├── ThemeProvider.tsx   # Context de dark/light theme
│   │   └── themePreferences.ts # Persiste tema no localStorage
│   ├── hooks/
│   │   ├── useAuth.ts       # handleLogin, handleRegister, logout
│   │   └── useToast.ts      # Notificações toast
│   ├── lib/
│   │   └── supabaseClient.ts # Singleton Supabase
│   └── utils/
│       ├── authFetch.ts     # Fetch autenticado — injeta JWT, retry, logout 401
│       ├── fetchWithRetry.ts # Retry com exponential backoff
│       ├── errorHandler.ts  # Handler global de erros
│       └── logger.ts        # Logger wrapper dev/prod
├── features/
│   ├── auth/                # Login, Registro, Reset Password
│   ├── chat/                # Paciente virtual, histórico de conversas
│   ├── case/                # Casos clínicos disponíveis
│   ├── flashcards/          # Decks/cards + revisão SM-2
│   ├── teacher/             # Dashboard do professor
│   ├── student/             # Dashboard do aluno
│   ├── profile/             # Perfil + estatísticas
│   ├── admin/               # Painel admin (instituições, usuários)
│   ├── navigator/           # Navegação rápida entre páginas
│   ├── minigame/            # Mini-jogos (parcial)
│   ├── payments/            # Pagamentos (placeholder)
│   └── settings/            # Configurações do usuário
└── shared/
    ├── components/          # Componentes globais (MainMenu, SoapForm, Toast, etc.)
    ├── types/               # Tipos TypeScript globais
    └── utils/
        └── specialties.ts  # Fonte única das 14 especialidades médicas
```

Cada feature segue a estrutura: `components/`, `pages/`, `services/`, `types/`, `context/`, `hooks/`, `index.ts` (barrel export).

## 🔑 Padrões Essenciais

### Importações
```typescript
// ✅ Sempre — alias @/ + barrel
import { LoginForm } from '@/features/auth';
import { authFetch } from '@/core/utils/authFetch';
import { SPECIALTIES } from '@/shared/utils/specialties';

// ❌ Nunca — caminhos relativos com ../
import { LoginForm } from '../../../features/auth/components/LoginForm';
```

### Chamadas autenticadas
```typescript
// Toda chamada ao backend usa authFetch — nunca fetch() diretamente
const res = await authFetch(`${API_URL}/api/cases`, { method: 'GET' });
```

`authFetch.ts` injeta JWT automaticamente, verifica expiração (60s buffer), faz logout em 401, e usa `fetchWithRetry` internamente.

### Proteção de rotas
```typescript
<ProtectedRoute>           // Qualquer usuário autenticado
  <CasesPage />
</ProtectedRoute>

<RoleRoute roles={['teacher', 'admin']}>   // Roles específicas (admin sempre passa)
  <TeacherDashboard />
</RoleRoute>
```

### Token e storage
```typescript
// Chave correta do JWT (de constants.ts):
localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)  // 'auth_token'
```

### Especialidades médicas
```typescript
// Nunca hardcode — use a lista centralizada:
import { SPECIALTIES } from '@/shared/utils/specialties';
```

## 🛣️ Rotas (App.tsx)

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/` | LoginPage | público |
| `/confirm` | EmailConfirmedPage | público |
| `/reset-password` | ResetPasswordPage | público |
| `/mainpage` | MainPage | autenticado |
| `/cases` | CasesPage | autenticado |
| `/student-chat` | StudentChatPage | autenticado |
| `/settings` | SettingsPage | autenticado |
| `/payments` | PaymentsPage | autenticado |
| `/profile` | ProfilePage | autenticado |
| `/profile/:id` | ProfilePage (aluno) | teacher, admin |
| `/conversation/:id` | ConversationView | student, teacher |
| `/student` | StudentDashboard | student, teacher, admin |
| `/teacherpage` | TeacherChatPage | teacher |
| `/teacher/new-case` | TeacherNewCaseChatPage | teacher |
| `/admin` | AdminPanel | admin |

## 🎨 Features

### 1. Chat com Paciente Virtual
- Interface de mensagens via `ChatGPT.tsx`
- Histórico persistente no banco (tabela `messages`) — não usa threads OpenAI
- Endpoint: `POST /api/gpt`
- Carrossel de conversas recentes via `ChatHistoryCarousel.tsx`
- Visualização de conversa histórica em `ConversationView.tsx`

### 2. Casos Clínicos
- `CasesPage` lista casos livres + casos atribuídos à turma
- Janelas de disponibilidade com exibição de prazo/expiração
- Tentativa iniciada em `POST /api/cases/{id}/start`
- Avaliação SOAP enviada em `POST /api/cases/{id}/complete` → score 0-100

### 3. Flashcards (SM-2)
- `FlashcardsPage` — listagem de decks + modo de revisão
- Algoritmo SM-2 aplicado no backend via `POST /api/flashcards/review`
- Geração automática de flashcards a partir de conversa (IA)
- Escopos: `student` (próprios), `teacher`, `admin` (globais)

### 4. Dashboard do Professor
- Turmas + gestão de alunos (inclui turmas compartilhadas)
- Criação e atribuição de casos com prazo
- Métricas: média de notas, tentativas, última atividade por aluno
- Histórico de tentativas + visualização de conversa por aluno
- Compartilhamento de turma com outros professores (`ClassSharingPanel`)
- Aba de flashcards para gestão de decks/cards (`FlashcardsView`)

### 5. Perfil do Aluno
- Estatísticas gerais: total de casos, média, melhor nota, tempo médio
- Desempenho por especialidade
- Evolução semanal via `Recharts`
- Histórico completo de tentativas

### 6. Painel Admin
- Abas: Visão Geral / Instituições / Professores / Alunos / Turmas / Casos Livres / GPT
- Criar usuários em massa (CSV/bulk) com senhas temporárias
- Ativar/desativar contas sem apagar histórico
- Gerenciar flashcards globais (`AdminFlashcardsView`)

### 7. Dark/Light Theme
- `ThemeProvider` + CSS custom properties + Tailwind
- Preferência persistida no `localStorage`
- Cor primária: `#844AF5`

## ⚙️ Configuração

### Variáveis de Ambiente

Crie `.env` em `frontend/anamnes-ia/`:

```bash
VITE_API_URL=http://localhost:8000/api
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[public-anon-key]
```

Todas as variáveis precisam do prefixo `VITE_`. O sistema valida na inicialização via `config/env.ts`.

## 🚀 Como Rodar

```bash
cd frontend/anamnes-ia

# Instalar dependências
npm install

# Configurar env
cp .env.example .env  # e preencha os valores

# Desenvolvimento
npm run dev           # http://localhost:5173

# Build de produção
npm run build

# Lint e type check (CI)
npm run lint
npx tsc -b --noEmit
```

## 🛡️ Segurança e Qualidade

- **TypeScript strict mode** — o CI roda `npx tsc -b --noEmit` e bloqueia PRs com erros
- **ESLint** — `npm run lint` deve passar antes de qualquer PR
- **Error Boundaries** — erros de renderização capturados com UI de fallback
- **authFetch** — nunca expõe token, faz logout automático em 401
- **RoleRoute** — impede que alunos acessem rotas de professor/admin

## 🐛 Troubleshooting

**Imports não resolvem (`@/...`)**
```bash
# Verificar path aliases em tsconfig.app.json e vite.config.ts
# Ambos devem mapear @/ → ./src/
```

**Erro de ambiente**
```typescript
// ✅ Usar sempre o wrapper de config
import { config } from '@/config/env';
config.apiUrl;  // não import.meta.env.VITE_API_URL diretamente
```

**CORS**
```bash
# Backend .env deve incluir http://localhost:5173 em ALLOWED_ORIGINS
```

**Cache Vite**
```bash
rm -rf node_modules/.vite
npm run dev
```

**Tema não muda**
```bash
# No console do browser:
localStorage.clear(); location.reload();
```

## 📄 Deploy

- **Vercel** (`vercel.json`): conectado ao GitHub `master` — deploy automático
- URL de produção: `https://www.anamnes.chat`

---

**Última atualização**: junho de 2026  
**Stack**: React 19 + TypeScript 5.8 + Vite 7 + Tailwind 4
