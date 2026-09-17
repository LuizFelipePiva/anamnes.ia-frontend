# SPEC-013 — Casos de teste (contrato)

Complemento de `SPEC-013-home-plano-de-estudos.md`. **Nenhuma implementação começa antes destes casos serem aprovados.**

Cada caso abaixo vira um `it(...)` no Vitest, 1:1. Arquivos previstos:

```
src/features/student/utils/studyPlan.ts        ← lógica pura (alvo de 99% dos testes)
src/features/student/utils/studyPlan.test.ts
src/features/student/hooks/useStudyPlan.ts     ← só compõe as funções puras
src/app/MainPage.home.test.tsx                 ← testes de render (poucos, ver §8)
```

**Decisão de testabilidade (importante):** toda função pura recebe `now: Date` como último parâmetro. Nada de `new Date()` implícito dentro da lógica — sem isso, os testes de streak/tendência/semana ficam dependentes do relógio e quebram na virada do dia/ano. O componente passa `new Date()`; os testes passam data fixa.

---

## 1. Contrato do módulo `studyPlan.ts`

```ts
import type { AttemptHistory, SpecialtyStats } from '@/features/profile';

export const WEEKLY_GOAL = 5; // vive em @/config/constants.ts e é reexportado aqui

export interface WeeklyStats { attempts: number; completed: number; avgScore: number | null; }
export function weeklyStats(history: AttemptHistory[], now: Date): WeeklyStats;

/** diferença arredondada entre média dos últimos 7 dias e dos 7 anteriores; null se faltar dado */
export function scoreTrend(history: AttemptHistory[], now: Date): number | null;

export interface Streak { current: number; best: number; week: boolean[]; /** seg→dom */ }
export function studyStreak(history: AttemptHistory[], now: Date): Streak;

export interface GoalProgress { done: number; goal: number; pct: number; }
export function weeklyGoalProgress(history: AttemptHistory[], now: Date): GoalProgress;

export interface MasteryRow { specialty: string; score: number; band: 'low' | 'mid' | 'high'; }
export function specialtyMastery(bySpecialty: SpecialtyStats[]): MasteryRow[];

export type RecoKind = 'weak' | 'stale' | 'class' | 'streak';
export interface Recommendation {
  kind: RecoKind;
  caseId: string;
  caseKind: 'class' | 'free';
  title: string;
  specialty: string | null;
  reasonKey: string;              // chave i18n, nunca texto pronto
  reasonValues: Record<string, string | number>;
}
export interface StudyPlanInput {
  history: AttemptHistory[];
  bySpecialty: SpecialtyStats[];
  availableCases: AvailableCase[];
  freeCases: FreeCase[];
}
export function buildRecommendations(input: StudyPlanInput, now: Date): Recommendation[];
```

Regras transversais, válidas para todas as funções:
- **R1** — nunca lançam exceção: entrada vazia devolve o "zero" do tipo (`[]`, `null`, `0`).
- **R2** — não mutam a entrada.
- **R3** — comparações de data usam o **fuso local**, dia civil (00:00 local), não UTC.
- **R4** — semana começa na **segunda-feira**.
- **R5** — texto de UI nunca sai destas funções; só chave i18n + valores.

---

## 2. `weeklyStats`

Fixture base (`now = 2026-08-12T15:00:00` — quarta-feira; semana corrente = 10/08 seg a 16/08 dom):

| id | started_at | status | score | is_ai_chat |
|---|---|---|---|---|
| a1 | 2026-08-12T09:00 | completed | 80 | false |
| a2 | 2026-08-11T09:00 | completed | 60 | false |
| a3 | 2026-08-10T09:00 | in_progress | null | false |
| a4 | 2026-08-12T10:00 | completed | 100 | **true** |
| a5 | 2026-08-08T09:00 | completed | 20 | false (semana passada) |

> **P1 fechada — chat IA conta, sem exceção.** O filtro `is_ai_chat` some da lógica; o único filtro de nota é `score !== null`. Verificado no backend: entradas de chat IA vêm de `conversations` (`routes/profile.py:76`) e **nunca têm `score`** — logo entram em `attempts` e saem da média sozinhas, sem regra especial. Isso remove a inconsistência de `MainPage.tsx:97`.

- **T1.1** — devolve `attempts: 4` (a1, a2, a3, a4 — a5 é de outra semana).
- **T1.2** — devolve `completed: 3` (a1, a2, a4).
- **T1.3** — `avgScore: 80` — média de a1 (80), a2 (60) e a4 (100). Nenhum filtro por `is_ai_chat`.
- **T1.3b** — entrada com `is_ai_chat: true` e `score: null` (o caso real em produção) entra em `attempts` e não afeta `avgScore`.
- **T1.4** — histórico vazio → `{ attempts: 0, completed: 0, avgScore: null }`.
- **T1.5** — semana sem nenhuma nota (só `in_progress`) → `avgScore: null`, nunca `0`.
- **T1.6** — tentativa em 2026-08-10T00:00 (segunda, meia-noite) **entra** na semana; 2026-08-09T23:59 (domingo) **não entra**.

## 3. `scoreTrend`

Janelas: `[now-7d, now]` e `[now-14d, now-7d)`.

- **T2.1** — recente média 78, anterior média 72 → `6`.
- **T2.2** — recente 70, anterior 74 → `-4`.
- **T2.3** — janela anterior **sem nenhuma nota** → `null` (não renderiza tendência; não tratar como 0).
- **T2.4** — janela recente sem nota → `null`.
- **T2.5** — empate exato → `0`. **P2 fechada: `0` é um valor válido e é renderizado** (ícone neutro `Minus`, cor `#9a9aab`). Só `null` esconde a tendência — os testes devem distinguir os dois, nunca usar checagem falsy.
- **T2.6** — arredonda meio para cima: 78.5 − 72 → `7`.
- **T2.7** — ignora apenas `score === null` nas duas janelas (sem filtro de `is_ai_chat`, P1).

## 4. `studyStreak`

`now = 2026-08-12` (quarta). Dias com ≥1 tentativa (qualquer status, por `started_at`).

- **T3.1** — tentativas em 10, 11 e 12/08 → `current: 3`.
- **T3.2** — tentativas em 10 e 11/08, nada hoje → `current: 2` (a sequência **não quebra** por hoje ainda não ter tentativa; quebra só a partir de amanhã sem nada).
- **T3.3** — última tentativa em 09/08 (anteontem) → `current: 0`.
- **T3.4** — duas tentativas no mesmo dia contam **1**.
- **T3.5** — `best` olha o histórico inteiro: sequência de 11 dias em maio/2026 + 3 dias agora → `{ current: 3, best: 11 }`.
- **T3.6** — `week` devolve exatamente 7 booleanos, índice 0 = segunda; para a fixture de T3.1 → `[true, true, true, false, false, false, false]`.
- **T3.7** — histórico vazio → `{ current: 0, best: 0, week: [false×7] }`.
- **T3.8** — tentativa às 23:30 do dia anterior e outra às 00:30 de hoje contam como **2 dias** (limite civil, não janela de 24h).

## 5. `weeklyGoalProgress`

- **T4.1** — 3 concluídas na semana → `{ done: 3, goal: 5, pct: 60 }`.
- **T4.2** — 0 concluídas → `{ done: 0, goal: 5, pct: 0 }`.
- **T4.3** — 7 concluídas → `{ done: 7, goal: 5, pct: 100 }` — **`done` mostra o real, `pct` satura em 100**.
- **T4.4** — só conta `status === 'completed'`; `in_progress` e abandonadas não entram.

## 6. `specialtyMastery`

> ⚠️ **Sentinela do backend**: `routes/profile.py:111` devolve `average_score: 0` — **não `null`** — para especialidade que tem tentativas mas nenhuma nota (SOAP não enviado, ou avaliação que falhou). Tratar esse `0` como nota real faz uma especialidade nunca avaliada aparecer como "a pior" e sequestrar tanto o card de domínio quanto o motor `weak`. Todos os casos abaixo assumem que o `0` sentinela é **descartado**.

- **T5.1** — ordena por `average_score` **crescente** (o fraco primeiro).
- **T5.2** — descarta especialidade com `attempts === 0`.
- **T5.2b** — descarta especialidade com `attempts > 0` e `average_score === 0` (sentinela de "sem nota"); ela não aparece na lista nem vira "a pior".
- **T5.2c** — especialidade com nota real baixa (`average_score: 1`) **aparece** — o corte é exatamente em `0`, não em "nota baixa".
- **T5.3** — corta em 5 linhas quando há 14 especialidades.
- **T5.4** — faixas: 59 → `low`; 60 → `mid`; 79 → `mid`; 80 → `high` (limites inclusivos como escrito).
- **T5.5** — devolve a `key` da especialidade, **não** o rótulo traduzido (a tradução é do componente, via `specialtyLabel`).
- **T5.6** — lista vazia → `[]`.

## 7. `buildRecommendations` — o núcleo

Ordem fixa de motores: `weak` → `stale` → `class` → `streak`. Máximo **1 card por motor**, máximo **4 cards**.

### Motor 1 — `weak`
> **P3 fechada — promove a próxima elegível.** O motor ordena por nota crescente e pega a **primeira especialidade que satisfaz `attempts >= 3`**, ignorando as de amostra insuficiente em vez de desistir.

- **T6.1** — especialidade com menor `average_score` e `attempts >= 3` vira o 1º card, `kind: 'weak'`, com `reasonValues: { score: 52, attempts: 3 }`.
- **T6.2** — a pior (nota 40, 2 tentativas) é pulada e a **segunda pior com ≥3 tentativas** (nota 52) vira o card.
- **T6.2b** — três especialidades com <3 tentativas na frente e uma elegível no fim da ordenação → o card é a elegível; o número na copy é o dela.
- **T6.2c** — especialidade descartada por T5.2b (`average_score === 0` sentinela) também não é candidata aqui, mesmo com `attempts >= 3`.
- **T6.3** — empate de nota entre duas elegíveis → desempata pela de **mais tentativas**; persistindo, ordem alfabética da `key` (determinismo é requisito de teste).
- **T6.4** — nenhuma especialidade com ≥3 tentativas → nenhum card `weak`.

### Motor 2 — `stale`
- **T6.5** — especialidade já praticada cuja última tentativa foi há **6 dias** → card `stale` com `reasonValues: { days: 6 }`.
- **T6.6** — há **4 dias** → não dispara (limiar é ≥5).
- **T6.7** — se a especialidade mais parada é a mesma escolhida pelo motor `weak`, escolhe a **próxima** especialidade parada; não havendo outra, o motor não dispara (nunca dois cards da mesma especialidade).
- **T6.8** — especialidade nunca praticada não é "parada" — não entra neste motor.

### Motor 3 — `class`
> `AvailableCase` já traz `attempts_count`, `last_status`, `available_until` e `expires_at` (`features/chat/services/studentService.ts:51-64`) — este motor **não precisa cruzar com `history`**.

- **T6.9** — caso de turma com `attempts_count === 0` vira card `class`, `caseKind: 'class'`.
- **T6.10** — caso com `attempts_count > 0` é excluído, inclusive quando `last_status === 'in_progress'`.
- **T6.11** — havendo dois elegíveis, ordena por prazo mais próximo (`available_until ?? expires_at`); casos sem prazo vão para o fim, desempatados por `created_at` mais recente.
- **T6.11b** — caso com prazo **já vencido** (`< now`) é excluído.

### Motor 4 — `streak`
- **T6.12** — `current >= 1` e **nenhuma tentativa hoje** e existe caso de dificuldade básica → card `streak`.
- **T6.13** — já houve tentativa hoje → não dispara.
- **T6.14** — `current === 0` → não dispara.
- **T6.15** — não existe caso básico disponível → não dispara (não rebaixar para outro nível).

### Transversais
- **T6.16** — aluno zerado (histórico vazio, sem casos de turma) → `[]` (o componente mostra o empty state).
- **T6.17** — o **mesmo `caseId` nunca aparece em dois cards**; se um motor selecionaria um caso já usado, escolhe o próximo elegível ou não dispara.
- **T6.18** — todos os motores disparando → exatamente 4 cards, na ordem `weak, stale, class, streak`.
- **T6.19** — o caso escolhido dentro de uma especialidade prefere um **ainda não tentado**; se todos já foram, usa o de tentativa mais antiga.
- **T6.20** — nenhum item devolvido tem texto em português no `reasonKey` (regra R5) — asserção sobre o formato da chave (`home.reco.*`).
- **T6.21** — entrada não é mutada: `history` e `availableCases` iguais (deep equal) antes e depois da chamada.

## 8. Testes de render (`MainPage.home.test.tsx`) — mínimos

Com os dados mockados (sem rede), só o que a lógica pura não cobre:

- **T7.1** — aluno zerado: renderiza o empty state de recomendação e **não** renderiza os cards de streak, especialidade e pendências.
- **T7.2** — `due_count` somado > 0 → item "Flashcards para revisar" com o total; soma 0 → item ausente.
- **T7.3** — cota esgotada (`regular_available === 0`) → cards de recomendação ficam desabilitados, como já acontece hoje nos casos.
- **T7.4** — `WEEKLY_SUMMARY_ENABLED = false` → card de resumo por IA ausente do DOM **e nenhuma chamada de rede disparada** (spy no `authFetch`).
- **T7.5** — **nenhum bloco "Retomar"/anel de progresso no DOM** (critério de aceite 2 da spec — SPEC-014 ainda não existe).
- **T7.6** — barras de progresso expõem `role="progressbar"` com `aria-valuenow` correto.
- **T7.7** — nenhuma string literal visível fora do i18n: renderizar com `lng: 'en'` e afirmar que não aparece texto em pt-BR nos blocos novos.

## 9. Decisões pendentes destes testes

Todas fechadas — o contrato está travado e os arquivos `.test.ts` podem ser escritos.

| # | Decisão | Onde vive |
|---|---|---|
| **P1** | **Chat IA conta como tentativa, sem exceção.** O filtro `is_ai_chat` sai da lógica; o único filtro de nota é `score !== null`. Entradas de chat IA nunca têm score (`profile.py:76`), então saem da média sozinhas. Uniformiza a inconsistência de `MainPage.tsx:97` | T1.1–T1.3b, T2.7 |
| **P2** | **Tendência `0` é renderizada** (ícone neutro). Só `null` esconde. Testes não podem usar checagem falsy | T2.5 |
| **P3** | **Motor `weak` promove a próxima elegível** com `attempts >= 3`, em vez de desistir | T6.2–T6.2c |
| **P4** | Resolvida no código: `AvailableCase` tem `available_until`, `expires_at`, `attempts_count` e `last_status` — o motor `class` não cruza com `history` | T6.9–T6.11b |
| **P5** | Achado durante P3: `profile.py:111` usa `average_score: 0` como sentinela de "sem nota". Esse `0` é **descartado** em `specialtyMastery` e no motor `weak` | T5.2b, T5.2c, T6.2c |

Limiares travados (revisáveis com dado de uso depois): `weak` ≥3 tentativas · `stale` ≥5 dias · máx. 5 linhas de especialidade · máx. 4 recomendações · `WEEKLY_GOAL = 5`.

---

## 11. Estado — verde (2026-08-12)

Implementação das fases 1 e 2 concluída; `npm test` roda **226 testes, todos passando** (61 em `studyPlan.test.ts` + 7 de render + as suítes já existentes), com `npx tsc -b --noEmit`, `npm run lint` e `npm run i18n:keys` (0 órfãs, 0 faltantes) limpos.

Ajustes feitos durante a implementação, nenhum deles muda decisão do contrato:

- `case_id` de `AttemptHistory` é nullable (entradas de chat IA não têm caso) — o mapa de "casos já vistos" ignora essas linhas.
- `created_at` de `AvailableCase` é nullable — o desempate de casos sem prazo trata `null` como o mais antigo.
- `home.week_summary` virou órfã (o subtítulo do hero agora usa `home.plan_progress`) e foi removida dos 4 dicionários.
- O componente só passa `count` ao `t()` quando o motivo tem contagem: passar `count` para chave sem formas plurais faz o i18next procurar `_other` e cair no fallback em silêncio.

§10 abaixo é o registro histórico da fase vermelha.

---

## 10. Estado — testes escritos (fase vermelha)

Arquivos criados e rodando:

- `src/features/student/utils/studyPlan.test.ts` — 46 casos (T1–T6). Falha na coleta: `Failed to resolve import "./studyPlan"`. É o vermelho esperado; some assim que o módulo existir.
- `src/app/MainPage.home.test.tsx` — 7 casos (T7). Renderiza de fato (mocks de serviço, embla, i18n e `authFetch` funcionando): **4 falham** (T7.1, T7.2, T7.3, T7.6 — os blocos ainda não existem) e **3 passam por vacuidade** (T7.4, T7.5, T7.7 — nada de resumo IA, nada de "Retomar", nada de texto pt-BR fora do i18n). Os três continuam significativos depois da implementação: viram guarda de regressão.

Casos com sufixo `b` foram acrescentados na escrita para tornar o contrato executável, sem mudar nenhuma decisão: **T6.3b** (desempate alfabético, separado do desempate por tentativas de T6.3), **T6.7b** (não havendo outra especialidade parada, `stale` não dispara) e **T6.19b** (todos os casos já tentados → o de tentativa mais antiga).

### Duas convenções que os testes tiveram de fixar

1. **Especialidade de caso livre vem de `area`.** `FreeCase` (`features/case/mocks/freeCases.ts`) não tem campo `specialty` — tem `area`, e o nível vem em `difficulty` (`easy|medium|hard`) + `level`. Os motores `weak`/`stale` casam por `area`; o motor `streak` procura `difficulty === 'easy'`.
2. **Contrato de `data-testid` da home** (sem isso o teste de render vira adivinhação de texto traduzido): `reco-empty`, `reco-card`, `card-streak`, `card-mastery`, `card-pending`, `card-goal`, `card-summary`, `pending-flashcards` e `resume-block` (este **não** deve existir enquanto a SPEC-014 não sair). Card de recomendação desabilitado por cota usa `aria-disabled="true"`; barras de progresso usam `role="progressbar"` + `aria-valuenow`.
