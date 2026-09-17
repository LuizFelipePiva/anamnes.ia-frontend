# Pendências manuais — i18n Fase 2 (2026-07-31)

> Ações fora do código, que ninguém além de você (dono do painel Langfuse/Supabase) consegue fazer. Apagar itens conforme forem resolvidos.

## 🔴 Ação necessária agora

1. **Adicionar `{{language}}` aos templates do Langfuse** (`SPEC-011` ✅ implementada em código)
   - `chat_service`/`eval_service` já enviam a variável `language` (código BCP 47, ex. `en`) para `get_prompt(...)`, mas os templates cadastrados no painel do Langfuse ainda não têm `{{language}}` no texto — a variável chega e é ignorada.
   - **Onde**: `cloud.langfuse.com` → Prompts → editar os dois abaixo, incluindo uma instrução tipo `"Responda sempre em {{language}}"`:
     - `patient-system-prompt`
     - `soap-evaluation-prompt`
   - **Não mexer** em `case-generation-prompt` — geração de caso continua sempre pt-BR de propósito (conteúdo compartilhado gravado no banco, decisão E1/D5).
   - **Sintoma se não fizer**: nada quebra. O fallback local (`_PATIENT_SYSTEM_PROMPT`/`_SOAP_EVALUATION_PROMPT` no código) já traduz corretamente sozinho — só afeta ambientes com `LANGFUSE_SECRET_KEY` configurado, que passam a ignorar o idioma do aluno silenciosamente até o template ser editado.
   - Detalhes: `docs/MIGRATION_OPENAI.md` (tabela de prompts) e `docs/specs/SPEC-011-i18n-fase2b-ia-idioma.md`.

## 🟡 Cientes / sem urgência

- **Catálogo `t("errors.<code>")` no front** (`SPEC-010` ✅ implementada em código, 2026-07-31): o backend já responde `{"detail", "code"}` em ~40 sites (os 15 códigos mais frequentes + os dois guards centrais de autenticação/autorização). O front ainda não tem os dicionários de tradução consumindo esses `code`s — enquanto isso não existir, o comportamento visível não muda (o front já usa `detail` hoje). É uma spec/PR de frontend separada.
- **Long tail de ~110 `HTTPException` sem `code`** (`SPEC-010` §9): migração mecânica, arquivo por arquivo (`flashcards.py`/`questions.py` nem entraram no escopo desta spec), sem bloqueio — o handler global aceita rota não migrada por construção.
- **Validar qualidade do `file_search` em en/es/ru**: o vector store da OpenAI tem material de referência só em pt-BR. Responder em outro idioma sobre esse material funciona, mas a qualidade pode variar — testar manualmente antes de anunciar suporte multilíngue completo da IA.
- **Feedback SOAP em idioma que o professor não fala**: por decisão (E2), o feedback nasce no idioma do aluno. Se virar atrito real (turma internacional), a saída é traduzir sob demanda na leitura do painel do professor, não forçar pt-BR na geração — ver `SPEC-011` §9.
- **Histórico de chat com idiomas misturados**: se o aluno trocar de idioma no meio de uma conversa, mensagens anteriores do paciente ficam no idioma antigo. Decisão consciente (E3, sem `conversations.language`) — ver `SPEC-011` §9.
