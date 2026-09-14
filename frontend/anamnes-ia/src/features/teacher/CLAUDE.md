# features/teacher — AI context

Ferramentas do professor: turmas, criação de casos, compartilhamento e métricas. Importar via `@/features/teacher`.

## Arquivos
- `services/teacherService.ts` — chamadas via `authFetch`.
- `components/CaseForm.tsx` — formulário de caso.
  Também anexa **exames complementares** (SPEC-014): estado local `examIds` + `ExamPicker` de `@/features/case`, renderizado no lugar do conteúdo do modal (dois overlays empilhados brigariam por foco e Esc). A persistência (`saveCaseExams`) acontece **depois** do `createCase`/`updateCase` — na criação o caso ainda não tem `id`. Falha ao anexar mostra `caseForm.err_exams` e **não** desfaz o caso salvo. Os textos dos exames vêm do namespace `case`, não do `teacher`.
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
