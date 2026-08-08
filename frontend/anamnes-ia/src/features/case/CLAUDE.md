# features/case — AI context

Listagem e acesso a casos clínicos pelo aluno. Importar via `@/features/case`.

## Arquivos
- `pages/CasesPage.tsx` — listagem de casos disponíveis. **Internacionalizada** (SPEC-007, Fase 1): `useTranslation('case')`; strings em `@/locales/*/case.json`. Datas via `toLocaleDateString(i18n.language)`, plural de expiração via `expiry.days_one/_other`, idade via `t('age', { age })`. Rótulos de dificuldade traduzidos só na exibição (`diffLabel`) — as chaves ('Básico'/'Intermediário'/'Avançado'/'Tudo') seguem sendo os identificadores da lógica de filtro. Especialidades vêm de `@/shared/utils/specialties` e são exibidas via `specialtyLabel(key)` (traduzidas na Fase 1.5); a `key` usada no filtro segue sendo o valor pt-BR do banco. Lint `no-literal-string` ativo nesta feature.
- `mocks/freeCases.ts` — casos gratuitos/demo.
- `index.ts` — barrel export.

## Depende de
backend `routes/cases.py` (inclui janelas de disponibilidade e prazos por turma).
