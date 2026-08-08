# services/ — AI context

Lógica de negócio. Chamado apenas pelas rotas (`../routes/`). Observabilidade opcional via Langfuse.

## Arquivos
- `chat_service.py` — `handle_chat_message` monta o histórico da conversa (tabela `messages`, sem threads OpenAI) e chama `openai_service.complete_with_files`. Aceita `language` (SPEC-011): repassado ao `get_prompt` do Langfuse e ao fallback local `_PATIENT_SYSTEM_PROMPT`, resolvido **por mensagem** — sem estado por conversa. Cobre os turnos **a partir do 2º**: a saudação inicial do Chat IA vem de `routes/cases.py::start_ai_chat` (`ai-patient-prompt`), fora desta camada. SPEC-012 RF10 ✅: o Modo NARRADOR é instruído a usar a seção `DADOS OBJETIVOS DO CASO` do `patient_prompt` quando presente, e só improvisar quando ausente (RF11).
- `openai_service.py` — camada base de acesso à OpenAI (chat.completions + Responses API com `file_search`); usa `OPENAI_VECTOR_STORE_ID`. Todo service chama só este módulo, nunca o SDK direto. `get_prompt(nome, **vars)` repassa as variáveis ao Langfuse e devolve `""` se o prompt não existir ou o Langfuse estiver fora — o chamador **precisa** ter fallback local. Variável extra que o template não usa é ignorada, então passar `language` + `language_name` é seguro.
- `eval_service.py` — `evaluate_soap` avalia o SOAP e calcula a nota deterministicamente a partir do `breakdown` da IA + pesos do professor. Aceita `language` (SPEC-011): o feedback nasce no idioma do **aluno**, não do professor que criou o caso (decisão E2 — o professor já vê o SOAP no idioma do aluno de qualquer forma).
- `generation_service.py` — geração de casos clínicos por IA. **Não** recebe `language` (SPEC-011 E1): caso gerado é conteúdo compartilhado gravado no banco; outro idioma violaria D5 (`docs/I18N.md`). Continua sempre pt-BR até a Fase 3 (arquitetura multilíngue de conteúdo). SPEC-012 RF10 ✅: o prompt exige uma seção `DADOS OBJETIVOS DO CASO` (sinais vitais + exame físico) ao final do `patient_prompt`, sem coluna nova; casos antigos/manuais seguem sem ela (RF11, degrada sem erro).
- `flashcard_service.py` — algoritmo SM-2 (repetição espaçada).
- `questions_service.py` — banco de questões: listagem pública sem gabarito, correção de resposta, CRUD/import/upload de imagem (admin).
- `email_service.py` — e-mail transacional via Resend.
- `retention_service.py` — métricas de retenção de alunos.

## Defeitos conhecidos (não corrigidos)

⚠️ `docs/specs/SPEC-012-chat-contexto-e-rag.md` (🔵 rascunho) mapeia 5 problemas ativos nesta camada — o mais grave: `chat_service._build_history` descarta as respostas `[NARRADOR]` do contexto, então o paciente não lembra dos dados objetivos que ele mesmo forneceu. Leia antes de mexer em contexto de chat, `file_search` ou geração de casos.

## Depende de
`../db/supabase.py`, OpenAI (chat/eval/generation), Resend (email), env (`config.py`).
