# features/questoes — AI context

Banco de questões de múltipla escolha para o aluno. Importar via `@/features/questoes`.

## Arquivos
- `pages/QuestionsPage.tsx` (+ `.css`) — quiz do aluno; o gabarito só chega após responder (endpoint de correção).
- `services/questionsService.ts` — chamadas via `authFetch` a `/questions` (aluno + funções admin usadas por `features/admin`).
- `types/question.ts` — `Question` (sem gabarito), `QuestionBankItem` (admin), `QuestionAnswerResult`, `QuestionPayload`.

## Depende de
backend `routes/questions.py`. Nunca acessar o Supabase direto do browser — RLS bloqueia escrita e o gabarito não pode ir ao bundle.
