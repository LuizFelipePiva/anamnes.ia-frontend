# features/admin — AI context

Painel administrativo. Importar via `@/features/admin`.

## Arquivos
- `pages/AdminPanel.tsx` — painel principal de admin.
- `pages/QuestionsAdminPage.tsx` (+ `.css`) — CRUD do banco de questões via `questionsService` (`@/features/questoes`).
- `components/AdminFlashcardsView.tsx` — gestão de flashcards.
- `services/adminService.ts` — chamadas via `authFetch`.
- `types/admin.ts` — tipos de admin.

## i18n (SPEC-007, Fase 1)
Feature migrada — namespace `admin` (`@/locales/*/admin.json`) via `useTranslation('admin')`, dividido em `questions.*` (banco de questões), `flashcards.*` (decks/cards do admin) e `panel.*` (o resto do `AdminPanel`). Pontos não óbvios:
- `NAV` guarda `labelKey` (não o rótulo); o texto sai de `panel.nav.*` no render.
- `formatExpiryLabel(expiresAt, t, locale)` e os helpers de CSV (`downloadCsvTemplate`, `exportCredentialsCsv`) recebem `t` — são funções fora do componente.
- Datas e números usam o locale ativo (`i18n.language`), não `'pt-BR'` fixo; `StatCard` recebe `locale` por prop.
- **Permanece em pt-BR por D5**: `buildFreeCasePrompt`/`buildFreeCaseTitle`/`buildFreeCaseSummary` (vão para a IA e para o banco) e os *valores* de dificuldade (`Básico`/`Intermediário`/`Avançado`) — só o rótulo do `<option>` é traduzido.
- Lint `no-literal-string` ativo em `features/admin`; "Langfuse" entrou na allowlist de nomes próprios do `eslint.config.js`.

## Depende de
backend `routes/admin.py`. Acesso restrito por `ProtectedRoute` (papel `admin`).
