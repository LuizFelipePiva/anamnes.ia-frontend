# features/navigator — AI context

Navegação entre páginas/seções da app. Importar via `@/features/navigator`.

## Arquivos
- `pages/PageNavigator.tsx` — página de navegação. i18n via `useTranslation('navigator')` (SPEC-007).
- `components/PageNavigatorCard.tsx` — card de destino. Componente genérico: recebe `title`/`description` por props, sem texto hardcoded (a tradução vive na página).
- `index.ts` — barrel export.

**i18n (SPEC-007):** feature migrada. Strings em `@/locales/{pt-BR,en,es}/navigator.json`. Lint `no-literal-string` **ativo** em `features/navigator/**`.
