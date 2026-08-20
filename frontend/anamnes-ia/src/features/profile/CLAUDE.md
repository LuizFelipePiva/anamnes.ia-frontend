# features/profile — AI context

Perfil do usuário. Importar via `@/features/profile`.

## Arquivos
- `pages/ProfilePage.tsx` — edição/visualização de perfil. **Internacionalizada** (SPEC-007, Fase 1): `useTranslation('profile')`; strings em `@/locales/*/profile.json`. `roleLabel(role, t)` traduz o papel (student/teacher/admin). Nota: as strings vêm em props (`label`/`title`/`placeholder`), que o lint `jsx-text-only` não inspeciona — a extração é manual/completa; o lint cobre só texto JSX novo.
- `services/profileService.ts` — chamadas via `authFetch`.
- `types/profile.ts` — tipos de perfil.
- `index.ts` — barrel export.

## Depende de
backend `routes/profile.py`.
