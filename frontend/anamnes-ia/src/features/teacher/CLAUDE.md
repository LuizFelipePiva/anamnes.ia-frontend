# features/teacher — AI context

Ferramentas do professor: turmas, criação de casos, compartilhamento e métricas. Importar via `@/features/teacher`.

## Arquivos
- `services/teacherService.ts` — chamadas via `authFetch`.
- `components/CaseForm.tsx` — formulário de caso.
- `components/CreateClassModal.tsx` — criação de turma.
- `components/ClassSharingPanel.tsx` — atribuir casos à turma (prazo/disponibilidade).
- `components/FlashcardsView.tsx` — gestão de flashcards.
- `components/PerformanceChart.tsx`, `DonutChart.tsx`, `EngagementRing.tsx` — gráficos.
- `pages/TeacherChat.tsx`, `TeacherNewCaseChat.tsx` — chat de geração de casos.
- `utils/chartUtils.ts` — helpers de gráficos.
- `index.ts` / `components/index.ts` — barrel exports.

## Depende de
backend `routes/classes.py`, `cases.py`, `dashboard.py`.

**i18n (SPEC-007):** feature migrada. Strings em `@/locales/{pt-BR,en,es}/teacher.json` via `useTranslation('teacher')`. Lint `no-literal-string` **ativo** em `features/teacher/**`. Conteúdo enviado à IA / persistido no banco permanece em pt-BR por D5 (o `initialPrompt` de `TeacherNewCaseChat` e os builders `buildPrompt`/`buildTitle`/`buildSummary` de `CaseForm`). Valores de dificuldade armazenados (`Básico`/`Intermediário`/`Avançado`) continuam em pt-BR (são dados); só o rótulo exibido é traduzido (helper `diffLabel`).
