# features/chat — AI context

Chat do aluno com o paciente IA (OpenAI Assistant API v2). Importar via `@/features/chat`.

## Arquivos
- `context/ThreadContext.tsx` — estado da thread/conversa.
- `services/studentService.ts` — chamadas ao backend de chat via `authFetch`.
- `components/ChatGPT.tsx` — componente principal de chat.
- `components/ChatHistoryCarousel.tsx` — histórico de conversas.
- `pages/StudentChat.tsx`, `ConversationView.tsx` — páginas.
- `utils/chatUtils.ts` — helpers de formatação de mensagens.
- `index.ts` — barrel export.

## i18n (SPEC-007, Fase 1)
Feature **inteira** internacionalizada — namespace `chat` (`@/locales/*/chat.json`), `useTranslation('chat')`. Lint `no-literal-string` ativo em todo `features/chat`. Pontos de atenção: datas relativas ("Hoje/Ontem") via `fmtDate(iso, t, locale)`; duração via `t('duration', {min, sec})`; **plurais** de flashcards/cards via `_one/_other` (`flashcard_modal.success`, `duplicate_body`); labels SOAP em `soap.*` (ConversationView) e `result.soap_*` (StudentChat). Marcadores de protocolo `[NARRADOR]`/`[MODO AVALIADOR`/`[SOAP_SUBMISSION]` e o `initialPrompt` do paciente **não** são traduzidos (são prompts de IA — Fase 2).

## Depende de
backend `routes/api.py` (chat) → `services/chat_service.py`. Rate limit 20 req/min em `/api/chat/*`.
