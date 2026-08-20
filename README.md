<div align="center">

# 🩺 Anamnes AI

### *Revolucionando o ensino médico com Inteligência Artificial*

<p align="center">
  <strong>Plataforma educacional para estudantes de medicina praticarem anamnese através de conversas realistas com pacientes virtuais alimentados por IA</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.1.0-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.8.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/FastAPI-1.0.0-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Python-3.13+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/OpenAI-gpt--4o--mini-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI gpt-4o-mini"/>
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Tailwind-4.1.11-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Vite-7.0.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
</p>

> **🚀 Para contexto técnico completo, versionamento, features & arquitetura detalhada:** 📖 **[CONTEXT_FULL.md](./docs/CONTEXT_FULL.md)**

<p align="center">
  <a href="#-sobre-o-projeto">Sobre</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-arquitetura">Arquitetura</a> •
  <a href="#-api-endpoints">API</a> •
  <a href="#-contribuição">Contribuir</a>
</p>

</div>

---

## 📋 Sobre o Projeto

> **Anamnes AI** é uma plataforma inovadora que transforma o ensino médico ao permitir que estudantes pratiquem a arte da anamnese (entrevista médica) através de conversas realistas com pacientes virtuais alimentados por **gpt-4o-mini** da OpenAI (chat.completions + Responses API com file_search).

<table>
<tr>
<td width="50%">

### 🎯 Objetivos

- 🔒 **Prática Segura** — Ambiente controlado para estudantes sem riscos
- 📚 **Casos Diversos** — Biblioteca clínica com múltiplas especialidades
- 🤖 **IA Realista** — Pacientes virtuais com GPT-4 Turbo
- 📈 **Progresso** — Acompanhamento de evolução do estudante
- 👨‍🏫 **Para Professores** — Criação de casos e monitoramento

</td>
<td width="50%">

### ✨ Destaques

- 💬 Chat em tempo real com pacientes virtuais
- 📝 SOAP Notes — documentação médica estruturada
- 🎯 Feedback inteligente da IA
- 🕐 Histórico de conversas persistente
- 📊 Dashboard do professor com métricas
- 🔐 Autenticação segura com Supabase

</td>
</tr>
</table>

---

## 🏗️ Arquitetura

<details open>
<summary><b>📂 Estrutura do Monorepo</b></summary>

```
📦 anamnes-ai/
┃
┣━━ 🐍 backend/                      API FastAPI + Python 3.13
┃   ┣━━ 📁 app/
┃   ┃   ┣━━ 🛣️  routes/             Endpoints REST
┃   ┃   ┣━━ ⚙️  services/           Lógica de negócio + GPT-4
┃   ┃   ┣━━ 📊 models/              Schemas Pydantic
┃   ┃   ┣━━ 🔐 auth/                Autenticação JWT
┃   ┃   ┗━━ 💾 db/                  Integração Supabase
┃   ┗━━ 📖 README.md                Documentação Backend
┃
┗━━ ⚛️  frontend/anamnes-ia/         React 19 + TypeScript + Vite
    ┣━━ 🎨 src/
    ┃   ┣━━ 🎯 app/                 Aplicação principal (App, MainPage)
    ┃   ┣━━ 🔧 core/                Infraestrutura (logs, errors, auth)
    ┃   ┣━━ 🎨 features/            Módulos por domínio
    ┃   ┃   ┣━━ 🔑 auth/            Login / Registro / JWT
    ┃   ┃   ┣━━ 💬 chat/            Interface de chat com IA
    ┃   ┃   ┣━━ 👨‍🏫 teacher/         Dashboard do professor
    ┃   ┃   ┣━━ 📋 case/            Casos clínicos
    ┃   ┃   ┣━━ 🧭 navigator/       Navegação de páginas
    ┃   ┃   ┣━━ � profile/         Perfil e histórico do aluno
    ┃   ┃   ┣━━ �💳 payments/        Sistema de pagamentos
    ┃   ┃   ┣━━ ⚙️ settings/        Configurações do usuário
    ┃   ┃   ┗━━ 🎮 minigame/        Mini-jogos educacionais
    ┃   ┣━━ 🔗 shared/              Componentes reutilizáveis (UI, layout)
    ┃   ┗━━ ⚙️ config/              Variáveis de ambiente e constantes
    ┗━━ 📖 README.md                Documentação Frontend
```

</details>

### 🔧 Stack Tecnológica

<table>
<tr>
<td width="50%" valign="top">

#### 🐍 Backend

| Categoria | Tecnologia |
|-----------|------------|
| 🚀 **Framework** | FastAPI 1.0.0 |
| 🐍 **Linguagem** | Python 3.13+ |
| 🤖 **IA** | OpenAI gpt-4o-mini (chat.completions + Responses API) |
| 💾 **Banco de Dados** | Supabase (PostgreSQL) |
| 🔐 **Autenticação** | JWT via Supabase Auth |
| 🛡️ **Rate Limiting** | slowapi (20 req/min) |
| 🔄 **Retry Logic** | tenacity (exponential backoff) |
| ✅ **Validação** | Pydantic v2 |
| 📊 **Logging** | Python logging (structured) |

</td>
<td width="50%" valign="top">

#### ⚛️ Frontend

| Categoria | Tecnologia |
|-----------|------------|
| ⚛️ **Framework** | React 19.1.0 |
| 📘 **Linguagem** | TypeScript 5.8.3 |
| ⚡ **Build Tool** | Vite 7.0.4 |
| 🛣️ **Roteamento** | React Router 7.7.1 |
| 🎨 **Estilização** | Tailwind CSS 4.1.11 |
| 💾 **Backend Client** | Supabase Client 2.76.1 |
| 🔄 **Estado** | Context API + Hooks |
| 🛡️ **Error Handling** | Error Boundaries |
| 📊 **Logging** | Custom Logger (dev/prod) |

</td>
</tr>
</table>

### 🗂️ Path Aliases (Frontend)

O frontend utiliza **path aliases** para imports limpos via `tsconfig.json` + `vite.config.ts`:

```typescript
// ❌ Antes (caminhos relativos frágeis)
import LoginForm from '../../../features/auth/components/LoginForm';

// ✅ Depois (path aliases + barrel exports)
import { LoginForm } from '@/features/auth';
```

| Alias | Diretório | Uso |
|-------|-----------|-----|
| `@/*` | `src/*` | Qualquer arquivo em src |
| `@/app/*` | `src/app/*` | Componentes da aplicação |
| `@/core/*` | `src/core/*` | Infraestrutura e utilitários |
| `@/features/*` | `src/features/*` | Módulos de domínio |
| `@/shared/*` | `src/shared/*` | Componentes compartilhados |
| `@/config/*` | `src/config/*` | Configuração e constantes |
| `@/assets/*` | `src/assets/*` | Imagens e assets estáticos |

---

## 🤖 Inteligência Artificial

<div align="center">

### 🧠 Powered by **gpt-4o-mini** + Langfuse

</div>

<table>
<tr>
<td width="60%">

#### 📊 Especificações Técnicas

| Item | Detalhes |
|------|----------|
| 🤖 **Modelo** | `gpt-4o-mini` |
| 🔌 **API** | chat.completions + Responses API (file_search) |
| 🗃️ **Conhecimento** | Vector store com PDFs médicos (`OPENAI_VECTOR_STORE_ID`) |
| 📡 **Observabilidade** | Langfuse — prompt management + tracing |

#### ✨ Capacidades

- 🎭 **Paciente Virtual** — Modo narrador para sinais vitais e exame físico (`[NARRADOR]`)
- 📝 **Avaliação SOAP** — Score 0-100 com breakdown por seção (S/O/A/P)
- 🤖 **Geração de Casos** — Professor descreve o caso e a IA estrutura
- 💡 **Flashcards por IA** — Geração automática a partir de uma conversa
- 🛡️ **Retry Automático** — Exponential backoff via `tenacity` (3 tentativas)

</td>
<td width="40%">

#### 💻 Arquitetura de Serviços

```python
# openai_service.py — camada base
# Todos os serviços passam por aqui

complete(messages)           # chat simples
complete_json(messages)      # resposta JSON
complete_with_files(messages)# + file_search na
                             #   vector store

# chat_service.py — paciente virtual
get_patient_response(
    patient_prompt, history, message
)

# eval_service.py — avaliação SOAP
evaluate_soap(soap, case_summary)
# → {"score": 82, "breakdown": {...}}

# generation_service.py — criar caso
generate_case_from_description(
    description, difficulty
)
```

</td>
</tr>
</table>

---

## 🎨 Features

<table>
<tr>
<td width="50%">

### 👨‍🎓 Para Estudantes

| Feature | Descrição |
|---------|-----------|
| 💬 **Chat Interativo** | Converse com pacientes virtuais realistas |
| 📚 **Casos Clínicos** | Biblioteca com múltiplas especialidades |
| 📝 **SOAP Notes** | Pratique documentação médica estruturada |
| 🕐 **Histórico** | Revise conversas anteriores |
| 🎯 **Feedback IA** | Dicas em tempo real sobre perguntas |
| 🏆 **Progresso** | Acompanhe sua evolução |

</td>
<td width="50%">

### 👨‍🏫 Para Professores

| Feature | Descrição |
|---------|-----------|
| 📊 **Dashboard** | Acompanhe progresso dos alunos |
| ✏️ **Criar Casos** | Defina novos cenários clínicos |
| 📈 **Métricas** | Gráficos de performance e engajamento |
| 👥 **Turmas** | Gerencie classes e estudantes |
| 📋 **Feedback** | Avalie qualidade das anamneses |
| 🔍 **Histórico** | Visualize atividades dos alunos |

</td>
</tr>
</table>

---

## � Status de Implementação

<table>
<tr>
<td width="50%">

### ✅ Implementado

- [x] Autenticação & Login (Supabase)
- [x] Chat com paciente virtual (gpt-4o-mini)
- [x] Modo Narrador — sinais vitais via `[NARRADOR]`
- [x] SOAP Notes + avaliação automática (0-100)
- [x] Flashcards com SM-2 (student/teacher/admin)
- [x] Geração de flashcards a partir de conversa (IA)
- [x] Dashboard Estudante
- [x] Dashboard Professor (turmas compartilhadas)
- [x] Painel Admin (instituições, usuários em massa)
- [x] Casos clínicos com janelas de disponibilidade
- [x] Dark/Light Theme
- [x] Especialidades centralizadas (14)
- [x] Quotas diárias & Rate Limiting
- [x] Perfil do aluno + histórico
- [x] Migração OpenAI (Assistants → chat.completions + Responses API)
- [x] Langfuse (prompt management + tracing)

</td>
<td width="50%">

### 🔄 Em Desenvolvimento / Planejado

- [ ] Mini-games educacionais
- [ ] Export PDF (SOAP Notes)
- [ ] Notificações em tempo real
- [ ] Sistema de Recomendações

### 🎯 Planejado

- [ ] Payment Gateway (Stripe)
- [ ] Relatórios avançados
- [ ] Análise de Sentimento
- [~] Múltiplos idiomas (i18n) — Fase 0 + Fase 1 concluídas para o escopo ativo (auth, case, profile, chat, student, navigator, teacher, settings, flashcards, admin); `payments`/`minigame`/`questoes` adiadas sem previsão; próximo passo é a Fase 2 (backend + IA). Ver `docs/I18N.md`
- [ ] Mobile App (React Native)

</td>
</tr>
</table>

---

## �🚀 Quick Start

<details open>
<summary><b>📋 Pré-requisitos</b></summary>

| Requisito | Versão | Download |
|-----------|--------|----------|
| 🟢 **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| 🐍 **Python** | 3.13+ | [python.org](https://www.python.org/) |
| 📦 **npm** | 9+ | Incluído com Node.js |
| 🔑 **OpenAI API Key** | — | [platform.openai.com](https://platform.openai.com/) |
| 💾 **Supabase** | — | [supabase.com](https://supabase.com/) |

</details>

<details>
<summary><b>🔽 Passo 1: Clone o Repositório</b></summary>

```bash
git clone https://github.com/seu-usuario/anamnes-ai.git
cd anamnes-ai
```

</details>

<details>
<summary><b>🐍 Passo 2: Configurar Backend</b></summary>

```bash
cd backend

# 📦 Instalar dependências
pip install -r requirements.txt

# ⚙️ Configurar variáveis de ambiente
cp .env.example .env
# ✏️ Edite .env com suas credenciais (OpenAI, Supabase)

# 🚀 Iniciar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ **Backend disponível em**: http://localhost:8000  
📚 **Documentação da API**: http://localhost:8000/docs

</details>

<details>
<summary><b>⚛️ Passo 3: Configurar Frontend</b></summary>

```bash
cd frontend/anamnes-ia

# 📦 Instalar dependências
npm install

# ⚙️ Configurar variáveis de ambiente
cp .env.example .env
# ✏️ Edite .env com as URLs corretas

# 🚀 Iniciar desenvolvimento
npm run dev
```

✅ **Frontend disponível em**: http://localhost:5173

</details>

<details>
<summary><b>🐳 Alternativa: Docker Compose</b></summary>

```bash
# Full-stack local com hot reload
docker-compose up --build

# Parar
docker-compose down

# Build de produção
docker-compose -f docker-compose.prod.yml up --build
```

> ⚠️ Configure os `.env` de backend e frontend antes de rodar o Compose.

</details>

### ⚙️ Variáveis de Ambiente

<table>
<tr>
<td width="50%">

#### Backend (`.env`)

```bash
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anonima-publica
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# OpenAI
OPENAI_API_KEY=sk-proj-...

# CORS
ALLOWED_ORIGINS=http://localhost:5173

# JWT (opcional)
JWT_SECRET=seu-segredo-jwt
```

</td>
<td width="50%">

#### Frontend (`.env`)

```bash
# Backend API (já inclui /api)
VITE_API_URL=http://localhost:8000/api

# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

> ⚠️ Todas as variáveis do frontend precisam do prefixo `VITE_`

</td>
</tr>
</table>

---

## 🔌 API Endpoints

| Método | Endpoint | Descrição | Rate Limit |
|:------:|----------|-----------|:----------:|
| 🟢 `POST` | `/api/login` | Login | ⏱️ 10/min |
| 🟢 `POST` | `/api/register` | Registro | ⏱️ 5/min |
| 🟢 `POST` | `/api/start_chat` | Iniciar conversa com paciente | — |
| 🟡 `POST` | `/api/gpt` | Enviar mensagem ao paciente virtual | ⏱️ 20/min |
| 🔵 `GET` | `/api/conversations/{id}` | Conversa + mensagens + avaliação | — |
| 🟢 `GET/POST/…` | `/api/cases/*` | CRUD casos, tentativas, atribuições | — |
| 🟢 `GET/POST/…` | `/api/classes/*` | Turmas, alunos, compartilhamento | — |
| 🟢 `GET` | `/api/dashboard/*` | Métricas e relatórios do professor | — |
| 🟢 `GET/POST/…` | `/api/flashcards/*` | Decks, cards, revisão SM-2 | — |
| 🟢 `GET/POST/…` | `/api/admin/*` | Administração de usuários/instituições | — |
| 🟢 `GET` | `/api/health` | Health check | — |

📚 **Documentação Interativa**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛡️ Segurança

<details open>
<summary><b>🔒 Medidas Implementadas</b></summary>

<table>
<tr>
<td width="50%">

#### 🐍 Backend

| ✅ | Prática |
|----|---------|
| 🚦 | Rate limiting (20 req/min) |
| ✔️ | Validação Pydantic em todos inputs |
| 🔐 | JWT com expiração e refresh |
| 🌐 | CORS configurável por ambiente |
| 📊 | Logging estruturado |
| ⚠️ | Exception handlers globais |
| 🔄 | Retry logic em chamadas OpenAI |

</td>
<td width="50%">

#### ⚛️ Frontend

| ✅ | Prática |
|----|---------|
| 🛡️ | Error Boundaries para erros React |
| ✔️ | Validação de variáveis de ambiente |
| 🔄 | Retry automático em falhas de API |
| 📊 | Logging estruturado (dev/prod) |
| 🔐 | Protected routes com autenticação |
| 📌 | Constantes centralizadas |
| 🎯 | Feature-based architecture |

</td>
</tr>
</table>

</details>

---

## 🧪 Testes

```bash
# Backend (quando implementados)
cd backend
pytest tests/ --cov=app

# Frontend (quando implementados)
cd frontend/anamnes-ia
npm run test
npm run test:coverage
```

---

## 🐛 Troubleshooting

<details>
<summary><b>Backend não inicia</b></summary>

```bash
# Verifique variáveis de ambiente
cd backend && cat .env

# Verifique se está no diretório correto
python -m uvicorn app.main:app --reload
```

</details>

<details>
<summary><b>Frontend não conecta ao backend</b></summary>

```bash
# Verifique VITE_API_URL no .env
cat frontend/anamnes-ia/.env
# Deve ser: VITE_API_URL=http://localhost:8000/api

# Verifique CORS no backend (.env)
# ALLOWED_ORIGINS deve incluir http://localhost:5173
```

</details>

<details>
<summary><b>Erro de rate limit</b></summary>

Aguarde 1 minuto ou ajuste o limite em `backend/app/main.py`.

</details>

<details>
<summary><b>Imports não resolvem (Frontend)</b></summary>

```bash
# Limpar cache do Vite
rm -rf node_modules/.vite
npm run dev
```

Verifique se os path aliases estão configurados em `tsconfig.app.json` e `vite.config.ts`.

</details>

---

## 📈 Roadmap

<table>
<tr>
<td width="33%">

### 🎯 v1.1 — Qualidade

- [ ] 🧪 Testes unitários e E2E
- [ ] 📱 PWA (Progressive Web App)
- [ ] 🌙 Tema dark mode
- [~] 🌍 Internacionalização (i18n) — react-i18next (pt-BR/en/es); Fase 1 concluída no escopo ativo (10 features migradas), backend e IA pendentes (Fase 2)
- [ ] 📊 Analytics integrado

</td>
<td width="33%">

### 🚀 v2.0 — Expansão

- [ ] 👥 Modo multiplayer
- [ ] 🔬 Exames complementares simulados
- [ ] 🎥 Vídeos de feedback
- [ ] 📚 Integração com LMS
- [ ] 🏥 Simulador de exame físico

</td>
<td width="34%">

### 🌟 v3.0 — Futuro

- [ ] 🎮 Gamificação completa
- [ ] 🏆 Sistema de badges
- [ ] 🤝 Comunidade de estudantes
- [ ] 📖 Biblioteca de recursos
- [ ] 🔊 Suporte a áudio/voz

</td>
</tr>
</table>

---

## 🤝 Contribuição

Contribuições são bem-vindas! Siga estes passos:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona NovaFeature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

### Convenções

- **Backend**: PEP 8 (use `ruff` para lint — `python -m ruff check app/`)
- **Frontend**: TypeScript strict, ESLint, feature-based structure
- **Commits**: Conventional Commits
- **Imports**: Sempre usar path aliases (`@/features/...`)
- **Exports**: Barrel exports via `index.ts`

---

## 📄 Licença

[Adicionar licença aqui — MIT, GPL, etc.]

---

<div align="center">

### 💙 Desenvolvido com ❤️ para transformar a educação médica

<table>
<tr>
<td align="center">
<b>⭐ Star este projeto</b><br/>
Se gostou, deixe uma estrela!
</td>
<td align="center">
<b>🐛 Reportar Bug</b><br/>
Encontrou um problema? Abra uma issue
</td>
<td align="center">
<b>💡 Sugerir Feature</b><br/>
Tem uma ideia? Compartilhe conosco
</td>
</tr>
</table>

<br/>

<sub>Última atualização: junho de 2026</sub><br/>
<sub>Made with 🐍 Python, ⚛️ React, 🤖 gpt-4o-mini</sub>

<br/>

**[⬆ Voltar ao topo](#-anamnes-ai)**

</div>

---

## 🗺️ Roadmap — B2B Faculdades

> Ordem de execução definida por impacto no processo de venda e onboarding de faculdades.

### Prioridades

| # | Feature | Impacto | Esforço | Status |
|---|---------|---------|---------|--------|
| 1 | Painel Admin | 🔴 crítico | médio | ✅ Concluído |
| 2 | Perfil do Aluno | 🔴 crítico | médio | ✅ Concluído |
| 3 | Visão da Turma (melhorias) | 🟡 alto | pequeno | ⬜ Pendente |
| 4 | Relatório PDF | 🟡 alto | pequeno | ⬜ Pendente |
| 5 | Casos por Disciplina | 🟡 médio | pequeno | ⬜ Pendente |
| 6 | Landing Page Pública | 🟢 crescimento | médio | ⬜ Pendente |
| 7 | Login Institucional (magic link) | 🟢 conforto | médio | ⬜ Pendente |

> **CI/CD:** GitHub Actions configurado — CI (ruff + tsc -b + eslint) bloqueia merge; CD (Render deploy hook + Vercel CLI) dispara apenas após CI verde.

---

### ✅ 1. Painel Admin — desbloqueador de tudo

Sem isso não é possível onboardar nenhuma faculdade.

**Entregues:**
- Rota protegida `/admin` (role `admin`)
- Gerenciar Instituições — listagem com contagem de usuários
- Criar Professor — vinculado a instituição, gera senha temporária
- Criar Alunos em lote — via CSV (nome, email)
- Ativar/desativar contas sem deletar histórico
- Visão geral por instituição — alunos, professores, casos, tentativas
- Backend: endpoints em `/api/admin/*`, `verify_admin` dependency
- Frontend: `/admin` com tabs Visão Geral / Instituições / Professores / Alunos

---

### ✅ 2. Perfil do Aluno — o que o coordenador vai pedir

**Entregues:**
- Página `/profile` — acessível pelo próprio aluno e por professores/admin via `/profile/:id`
- Resumo geral: total de casos, média de notas, melhor pontuação, tempo médio
- Desempenho por especialidade: barras com tentativas e média de pontos
- Evolução temporal: gráfico de linha SVG — média semanal ao longo das semanas
- Histórico de casos: tabela com caso, especialidade, dificuldade, pontuação, duração, data
- Turmas matriculadas exibidas no header do perfil
- Backend: `GET /api/profile/me` e `GET /api/profile/{student_id}` com query agregada em `case_attempts`
- Frontend: `ProfilePage.tsx` com chart SVG nativo, sem dependência de biblioteca de gráficos

---

### ⬜ 3. Visão da Turma — gestão pedagógica

O professor precisa saber quem está atrasado e quais casos são difíceis.

**O que construir:**
- Lista de alunos da turma com status por caso (✅ feito / ⏳ não fez)
- Ranking da turma por média de notas
- Por caso: média de notas, % de conclusão, melhor e pior desempenho
- Alerta: alunos que não acessam há X dias

---

### ⬜ 4. Relatório PDF — para apresentar na reitoria

**O que construir:**
- Botão "Exportar PDF" no dashboard do professor
- Relatório da turma: nome dos alunos, casos realizados, médias
- `react-pdf` ou `jsPDF` no frontend, sem backend necessário

---

### ⬜ 5. Casos por Disciplina — organização curricular

**O que construir:**
- Campo `discipline` nos casos (ex: "Semiologia", "Clínica Médica I", "Pediatria")
- Professor filtra/cria caso dentro de uma disciplina
- Aluno vê casos separados por matéria

---

### ⬜ 6. Landing Page Pública — geração de leads

**O que construir:**
- Página pública: proposta de valor, prints do produto, depoimentos, CTA "Agendar demo"
- Formulário (nome, faculdade, email) → salva no Supabase
- SEO básico

---

### ⬜ 7. Login Institucional — reduz fricção no onboarding

**O que construir:**
- Magic link por email (`@faculdade.edu.br`) via Supabase Auth
- Ou SSO com Google Workspace institucional
- Aluno recebe link no email, clica e já entra — sem senha manual
