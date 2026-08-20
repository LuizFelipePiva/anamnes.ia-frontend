# features/student — AI context

Dashboard do aluno. Importar via `@/features/student`.

## Arquivos
- `pages/StudentDashboard.tsx` — visão geral do aluno (progresso, casos, retenção).
- `components/StudentFlashcardsView.tsx` — visão de flashcards do aluno.

## i18n (SPEC-007, Fase 1)
Feature inteira internacionalizada — namespace `student` (`@/locales/*/student.json`), `useTranslation('student')` em cada sub-componente (OverviewTab, ClassesTab, etc.). Plurais via `_one/_other` (turmas, atividades, casos, decks, cards). Helpers `fmtDate(iso, locale)`, `fmtExpiry(expiresAt, t, locale)`, `diffLabel(d, t)` recebem `t`/locale. Datas via `Intl` no locale ativo. Lint `no-literal-string` ativo em `features/student`.

## Depende de
backend `routes/dashboard.py`, `flashcards.py`; feature `@/features/chat`.
