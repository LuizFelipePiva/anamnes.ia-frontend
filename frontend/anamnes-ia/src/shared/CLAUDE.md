# shared/ — AI context

Componentes, tipos e utils usados por mais de uma feature. Importar via `@/shared/...`.

## Arquivos
- `utils/specialties.ts` — **fonte única** das 14 especialidades médicas. Nunca hardcode listas em outro lugar. `key` é o valor canônico do banco e **nunca** se traduz; para exibir use `specialtyLabel(key)` (resolve `common.specialties.<slug>` e cai no `label` pt-BR se a especialidade não estiver na lista).
- `components/layout/AppLayout.tsx` — layout global da app.
- `components/MainMenu.tsx` — menu principal.
- `components/SoapForm.tsx` — formulário de nota SOAP.
- `components/PreviewNavigator.tsx`, `TipsCarousel.tsx`, `Tooltip.tsx` — UI auxiliar.
- `components/ui/` — primitivos (`Card`, `Toast`).
- `types/` — tipos compartilhados (`index.ts`, `teacher.ts`).

## i18n (SPEC-007, Fase 1.5)
`shared/` inteiro internacionalizado — namespace `common`, `useTranslation('common')`. Lint `no-literal-string` **ativo** em todo `src/shared`. Chaves: `menu.*` (MainMenu), `soap.*` (SoapForm), `tips.*` (TipsCarousel), `actions.*` (prev/next/close), `specialties.*`. Pontos de atenção: a sigla **SOAP** e o **CNPJ** do rodapé não se traduzem (estão nas exclusões do lint); no SoapForm o erro de validação guarda a **chave** (`soap.fill_all`) no state, não o texto, para acompanhar a troca de idioma; `MainMenu` usa `labelKey` tipado (`MenuLabelKey`) em vez de `label`. Testes: `components/SharedUi.i18n.test.tsx` (precisa de stubs de `matchMedia`/`IntersectionObserver`/`ResizeObserver` por causa do embla-carousel).
