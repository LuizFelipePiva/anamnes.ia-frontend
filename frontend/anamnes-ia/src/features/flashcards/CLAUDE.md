# features/flashcards — AI context

Decks de flashcards e revisão espaçada (SM-2). Importar via `@/features/flashcards`.

## Arquivos
- `pages/FlashcardsPage.tsx` — página de decks/revisão.
- `components/DeckCard.tsx` — card de deck.
- `services/flashcardService.ts` — chamadas via `authFetch`.
- `types/index.ts` — tipos de deck/card.
- `index.ts` — barrel export.

## i18n (SPEC-007, Fase 1)
Feature migrada — namespace `flashcards` (`@/locales/*/flashcards.json`) via `useTranslation('flashcards')`. Plurais `_one/_other` (cards, decks, restantes). O estado de erro guarda a **chave** (`error_decks`/`error_cards`), não o texto, para reagir à troca de idioma. `RATING_BUTTONS` guarda só ordem/estilo; label e hint vêm de `review.ratings.*`. Nome do deck no fim da sessão usa `<Trans>` (`<1>` = `<strong>`). Especialidades e conteúdo dos cards continuam em pt-BR por D5. Lint `no-literal-string` ativo em `features/flashcards`.

## Depende de
backend `routes/flashcards.py` → `services/flashcard_service.py` (SM-2).
