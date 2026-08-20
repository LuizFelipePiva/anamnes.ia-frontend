# core/ — AI context

Infraestrutura cross-cutting compartilhada por todas as features. Importar via `@/core/...`.

## Arquivos
- `utils/authFetch.ts` — `fetch` autenticado; anexa o JWT. Use sempre em chamadas à API. Sessão expirada **não usa mais `alert()`**: enfileira a chave via `queueSessionNotice()` e redireciona; quem exibe é o `SessionNotice` depois do reload. As mensagens dos `throw new Error(...)` seguem em pt-BR **de propósito** — `errorHandler.ts` as usa como chave de mapeamento interno, não são exibidas.
- `utils/sessionNotice.ts` — aviso pendente em `sessionStorage`, para sobreviver ao `window.location.href` do `authFetch`. Toast montado antes do redirect morreria com a página (era por isso que o `alert` bloqueante "funcionava").
- `components/SessionNotice.tsx` — consome o aviso uma vez, no mount, e renderiza o `ToastContainer`. Fica na raiz (`App.tsx`) para valer também nas rotas públicas, que não usam o `AppLayout`.
- `utils/fetchWithRetry.ts` — retry de requisições.
- `utils/errorHandler.ts` — tratamento padronizado de erros.
- `utils/logger.ts` — logging client-side.
- `lib/supabaseClient.ts` — singleton do cliente Supabase no browser.
- `components/ProtectedRoute.tsx` — guard de rota por papel (`student`/`teacher`/`admin`).
- `components/ThemeProvider.tsx` + `themePreferences.ts` — tema dark/light (CSS vars + localStorage) **e idioma** (`lang`): é a fonte da verdade do idioma (SPEC-007). Detecta via navegador, persiste por usuário, aplica `<html lang>` e sincroniza o i18next. Recebe `profileLang` (do JWT) que prevalece no login.
- `i18n/` — internacionalização (SPEC-007): `index.ts` inicializa o `react-i18next` (recursos de `@/locales`; `returnEmptyString: false` para célula vazia cair no fallback visível — SPEC-008 RF6); `resolveLocale.ts` = funções puras de detecção (`normalizeLocale`/`resolveLocale`/`detectInitialLang`/`dirFor`), fonte do tipo `Lang` (pt-BR/en/es/**ru**); `normalizeLocale` casa por **subtag BCP 47** (`rue` ≠ `ru`, `enm` ≠ `en`) e `dirFor` deriva `ltr`/`rtl` do ICU — SPEC-008 §9.6/§9.7; `plurals.ts` = regras de plural derivadas de `Intl.PluralRules` (`baseKey`/`baseKeys` para a paridade, `validatePlurals` para as formas exigidas — SPEC-008); `i18next.d.ts` tipa as chaves (pt-BR = verdade). Uso: `useTranslation('auth')` → `t('login.submit')`. **`ru` traduzido por completo (2026-07-31)**, incluindo formas plurais `_few`/`_many`. Revisões pontuais futuras seguem via CSV (`npm run i18n:export -- --lang ru --ns chat`; import é **merge** e valida interpolações — SPEC-009, testes em `csv.test.ts`). Higiene de chaves: `npm run i18n:keys` (`scripts/i18nUsage.mjs`) acusa órfãs e faltantes, travadas em zero por `usage.test.ts` — chave dinâmica invisível ao scanner vai para `USAGE_ALLOWLIST`, não relaxe o teste. Adicionar idioma = 4 listas em sincronia (`SUPPORTED_LANGS`, `scripts/i18nCsv.mjs`, `backend/app/i18n.py`, constraint `users_language_check`); ver `docs/I18N.md`.
- `components/ErrorBoundary.tsx` — boundary de erro de UI. Internacionalizado (`common.error_boundary.*`); por ser class component traduz via `i18n.t` direto, não por hook.
- `hooks/useAuth.ts` — estado de autenticação.
- `hooks/useToast.ts` — notificações toast.
