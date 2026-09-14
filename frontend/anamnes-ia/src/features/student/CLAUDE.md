# features/student — AI context

Dashboard do aluno. Importar via `@/features/student`.

## Arquivos
- `pages/StudentDashboard.tsx` — visão geral do aluno (progresso, casos, retenção). Importado por caminho direto no roteador, **não** pelo barrel.
- `components/StudentFlashcardsView.tsx` — visão de flashcards do aluno.
- `utils/studyPlan.ts` — lógica pura do plano de estudos da home (SPEC-013): `weeklyStats`, `scoreTrend`, `studyStreak`, `weeklyGoalProgress`, `specialtyMastery`, `soapDimensions`, `buildRecommendations`. Testado em `utils/studyPlan.test.ts` (67 casos).
- `hooks/useStudyPlan.ts` — compõe as funções puras; só memoiza, não busca nada.
- `hooks/useWeeklySummary.ts` + `services/weeklySummaryService.ts` — resumo semanal por IA (SPEC-013 §6.9), **ligado** desde 12/08/2026. A flag é lida **no hook**, não no componente: desligada, o efeito não roda e a home não faz requisição nenhuma — buscar e esconder o card daria a mesma tela pelo dobro do custo. Testado em `hooks/useWeeklySummary.test.tsx` (5 casos), que mocka a constante para cobrir os dois estados.
- `components/home/` — blocos da home: `RecommendationsCard`, `SummaryCard`, `MasteryCard`, `SoapCard`, `StreakCard`, `WeeklyGoalCard`, `PendingCard`.
- `index.ts` — barrel com a superfície da home (consumida por `app/MainPage.tsx`).

## Plano de estudos (SPEC-013)
Convenções que valem para quem for mexer:
- **`now` é sempre parâmetro** das funções puras — nada de `new Date()` dentro da lógica, senão os testes de streak/semana quebram na virada do dia. `MainPage` congela um `now` no mount.
- **Semana começa na segunda**, fuso local, dia civil. Chat IA conta como tentativa; o único filtro de nota é `score !== null` (P1).
- **`average_score === 0` é sentinela** de "tem tentativa, não tem nota" (`routes/profile.py:111`) — descartada em `specialtyMastery` e no motor `weak` (P5).
- **`FreeCase` não tem `specialty`**: a especialidade vive em `area` e o nível em `difficulty` (`easy|medium|hard`). Os motores `weak`/`stale` casam por `area`; o `streak` procura o caso básico.
- Motores rodam na ordem `weak → stale → class → streak`, um card por motor, máximo 4, sem repetir caso nem especialidade.
- **Perfil SOAP** (fase 3b): `soap_profile` vem **agregado do backend** (`profile.py::_soap_profile`, janela das 10 tentativas avaliadas mais recentes); o front só aplica o mínimo de 3 tentativas e as faixas de cor. Dimensões em ordem canônica S/O/A/P — diferente do domínio, que ordena do mais fraco ao mais forte. Perfis antigos podem não trazer o campo: `soapDimensions` aceita `null`/`undefined`.
- **Resumo semanal** (fase 3a): vem pronto do backend (2–3 frases). Renderiza como **faixa de largura cheia entre o hero e o grid**, fora das duas colunas (é o único bloco de texto corrido da home; na coluna lateral virava seis linhas curtas). O parágrafo vai até a borda direita — o `max-w-[70ch]` que existia foi **removido no design review**, não reintroduza. O "isto é gerado por IA" é dito só pela estética: moldura iridescente translúcida (`.ai-ring` em `index.css`, com `prefers-reduced-motion`) + título em gradiente. O miolo do card é a classe `.ai-ring-body`, **não** utilitários Tailwind: o modo escuro remapeia `bg-white`/`bg-*` por seletor, e gradiente inline (`from-white via-white`) escapava desses overrides — o card ficava branco no tema escuro. Filete lateral roxo, selo textual "Gerado por IA" e onda de fundo foram recusados. O backend tem a **sua própria** flag (`WEEKLY_SUMMARY_ENABLED` no env) e responde 404 desligado, então ligar só no front não faz o card aparecer — os dois lados precisam ser ligados.
- `data-testid` são contrato de teste (`MainPage.home.test.tsx`): `reco-empty`, `reco-card`, `card-summary`, `card-mastery`, `card-soap`, `card-streak`, `card-goal`, `card-pending`, `pending-flashcards`. `resume-block` **não deve existir** enquanto a SPEC-014 (retomar caso em aberto) não sair.
- `WEEKLY_GOAL` e `WEEKLY_SUMMARY_ENABLED` vivem em `@/config/constants.ts`.

## i18n (SPEC-007, Fase 1)
Feature inteira internacionalizada — namespace `student` (`@/locales/*/student.json`), `useTranslation('student')` em cada sub-componente (OverviewTab, ClassesTab, etc.). Plurais via `_one/_other` (turmas, atividades, casos, decks, cards). Helpers `fmtDate(iso, locale)`, `fmtExpiry(expiresAt, t, locale)`, `diffLabel(d, t)` recebem `t`/locale. Datas via `Intl` no locale ativo. Lint `no-literal-string` ativo em `features/student`.

## Depende de
backend `routes/dashboard.py`, `flashcards.py`; feature `@/features/chat`.
