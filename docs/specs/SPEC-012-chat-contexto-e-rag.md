# SPEC-012 — Integridade do contexto do chat e reorganização do RAG

- **Contexto**: `docs/MIGRATION_OPENAI.md` (arquitetura OpenAI/Langfuse), `backend/app/services/CLAUDE.md`.
- **Origem**: auditoria da arquitetura de contexto do chat (2026-07-31), motivada pelo desenho de uma bancada de avaliação automatizada. Os problemas abaixo passaram despercebidos em produção justamente porque **nada mede coerência entre turnos nem uso de ferramenta**.
- **Status**: 🔵 rascunho — aguardando validação dos casos de teste antes da implementação (fluxo SDD).
- **Relação com outras specs**: independente de SPEC-010/011. Toca `chat_service`, `openai_service`, `generation_service`, `eval_service` e `flashcard_service`; não conflita com os arquivos/linhas daquelas.

---

## 1. Contexto / Problema

### 1.1 P1 — o filtro de histórico descarta as respostas do NARRADOR 🔴

`chat_service.py:98-109` converte as mensagens do banco para o formato da OpenAI:

```python
def _build_history(messages: list[dict]) -> list[dict]:
    for m in messages:
        content = m.get("content", "")
        # Ignora marcadores internos como [SOAP_SUBMISSION]
        if content.startswith("[") and "]" in content[:30]:
            continue
```

A intenção é excluir `[SOAP_SUBMISSION]` — texto que o aluno submete como nota SOAP e que não faz parte do diálogo com o paciente. Mas o filtro casa por **forma genérica** (`[qualquer coisa]` nos primeiros 30 caracteres), e o próprio `_PATIENT_SYSTEM_PROMPT` (linha 74) instrui:

> Inicie a resposta EXATAMENTE com "[NARRADOR]" (sem aspas).

Logo `"[NARRADOR] PA: 130/85 mmHg | FC: 88 bpm | ..."` satisfaz as duas condições e **é removido do contexto de todos os turnos seguintes**.

Consequências observáveis em produção:

| Cenário do aluno | Comportamento atual |
|---|---|
| Pede sinais vitais, depois pergunta "a temperatura estava em quanto?" | Paciente não sabe — o dado nunca esteve no contexto |
| Pede exame físico duas vezes | Modelo gera **valores diferentes**, sem ver os anteriores |
| Raciocina sobre achado do exame ("com essa PA alta…") | Paciente responde sem saber a que PA o aluno se refere |

Nenhum desses casos gera log ou erro: parece alucinação do modelo.

**`[NARRADOR]` não é marcador interno — é contrato com o frontend.** `features/chat/components/ChatGPT.tsx:192` faz `msg.content.startsWith('[NARRADOR]')` para renderizar o bloco com estilo próprio. O prefixo é persistido no banco por design e deve permanecer no histórico enviado à IA.

Os marcadores que de fato precisam ser filtrados são conhecidos e finitos:
- `[SOAP_SUBMISSION]` — gerado em `cases.py:998` no formato `[SOAP_SUBMISSION]\n{soap_content}`; já filtrado por prefixo exato em `cases.py:895`, `cases.py:955` (via `.not_.like("content", "[SOAP_SUBMISSION]%")`) e `flashcard_service.py:826`.
- `[MODO AVALIADOR` — filtrado em `flashcard_service.py:826`; sem call site de escrita no backend atual (legado).

### 1.2 P2 — o RAG está no consumidor errado 🟠

O vector store (`OPENAI_VECTOR_STORE_ID`) contém **bibliografia médica** — PDFs de livros, carregados manualmente. Não há nenhum código de upload no repositório: nada de caso clínico, nada de dado de paciente, entra ali.

Hoje `file_search` é anexado em **exatamente um call site**: `chat_service.py:180`, o turno do paciente virtual. `generation_service.py:79`, `eval_service.py:124` e `flashcard_service.py:880` usam `complete_json`, sem acesso a arquivo nenhum.

Isso é o inverso do que a natureza de cada componente pede:

| Componente | Fonte da verdade da resposta | RAG hoje | Deveria |
|---|---|---|---|
| Paciente (turno) | `patient_prompt` — o caso que o professor escreveu | ✅ | ❌ |
| Geração de caso | conhecimento clínico geral | ❌ | ✅ |
| Avaliação SOAP | conhecimento clínico geral | ❌ | ✅ |
| Flashcards | conhecimento clínico geral | ❌ | ✅ |

**Por que o paciente não deve consultar bibliografia.** Os dados do caso não estão no vector store; estão no `patient_prompt`. O livro não conhece este paciente. O retrieval não traz o caso — traz *outro* caso, o genérico. Consequências:

1. **Precisão** — o livro descreve a apresentação típica; o professor pode ter escrito uma apresentação atípica de propósito (é o que `difficulty: Avançado` pede, ver `generation_service.py:31`). Ancorar no livro empurra as respostas de volta para o típico, contra a intenção do caso.
2. **Persona** — dar a um personagem instruído a ser leigo (`chat_service.py:83`: *"Você é um leigo"*) acesso a livros de medicina cria pressão para vazar terminologia técnica que o prompt gasta linhas proibindo.
3. **Custo** — `tool_choice` não é definido, então o default é `auto`: **o modelo decide sozinho** se busca, e quando busca injeta chunks na ordem de milhares de tokens. Custo por conversa imprevisível, em até 30 turnos. Também candidato a quebrar o prompt caching do prefixo estável.
4. **Latência** — round-trip de retrieval em turnos cuja resposta esperada tem 2–4 frases.

**Já existe precedente explícito no código.** `cases.py:414` comenta: *"o intro não precisa buscar PDFs; o paciente apenas cria o personagem e se apresenta"* — a saudação inicial usa `complete()` puro. A decisão foi tomada para o 1º turno e não propagada aos demais.

**Por que geração/avaliação devem consultar.** São exatamente os pontos onde a resposta *não* tem fonte no banco e depende de conhecimento clínico geral: gerar um caso coerente com a fisiopatologia, e explicar ao aluno por que o diferencial dele está errado. Fundamentação bibliográfica aqui tem valor pedagógico direto e é cobrada **uma vez por caso / uma vez por tentativa**, não por turno.

> **Ressalva honesta sobre o Modo NARRADOR**: existe um argumento a favor de RAG no paciente — sinais vitais e achados de ausculta poderiam se beneficiar de fundamentação. P5 (§1.5) trata isso na origem, movendo o retrieval para o tempo de criação do caso. Ainda assim, esta spec **não remove** `complete_with_files` do paciente: apenas o tira do caminho padrão de forma reversível por configuração (E1, §7).

### 1.3 P3 — não há observabilidade de uso de ferramenta 🟡

`complete_with_files` retorna apenas `resp.output_text.strip()` (`openai_service.py:191`). Os itens de `file_search_call` presentes em `resp.output` são descartados sem log.

Não é possível hoje responder: quantos % dos turnos disparam retrieval? quais trechos entram no contexto? quanto isso pesa na conta? Como o cliente Langfuse já embrulha o SDK (`openai_service.py:37`), o dado existe — só não é extraído.

Isso torna P2 uma decisão sem número, e vale nos dois sentidos: sem instrumentação também não dá para verificar se o RAG novo na geração/avaliação está de fato sendo usado.

### 1.4 P4 — mensagem do aluno é persistida antes da chamada à IA 🟡

`chat_service.py:156` grava a mensagem do usuário; a chamada à OpenAI ocorre na linha 180. Se a chamada falhar (após os 3 retries do `tenacity`), a mensagem permanece no banco sem resposta correspondente. Efeitos:

- consome cota diária do aluno (`enforce_daily_limit` conta `role == "user"`) por um turno que não aconteceu;
- o histórico passa a ter dois `user` consecutivos, formato que o modelo lida pior;
- o contador de turnos (`user_turns`) avança sem contrapartida.

A ordem atual não é acidental — grava antes para não perder a mensagem do aluno se o processo morrer. A correção não deve reintroduzir esse risco.

### 1.5 P5 — o caso gerado não contém achados objetivos 🟠

`generate_case` (`generation_service.py:81-86`) devolve quatro campos: `title`, `specialty`, `summary`, `patient_prompt`. **Nenhum sinal vital, nenhum achado de exame físico.** Busca por `exame|sinais_vitais|vital|física` no arquivo: zero ocorrências.

Consequência: quando o aluno pede PA/FC/ausculta/palpação, o Modo NARRADOR **inventa na hora** — e inventa de novo no turno seguinte, porque (P1) nem sequer vê o que já disse. Os dois bugs se compõem: mesmo depois de corrigir P1, o primeiro valor continua sendo um chute não fundamentado e possivelmente incoerente com o diagnóstico do caso.

Este é o problema real por trás da intuição de que "o paciente precisa de dados". Ele precisa — mas de dados **do caso**, materializados uma vez, não de bibliografia recuperada a cada turno. O livro dá "achados típicos de pneumonia"; ele não dá *a* PA deste paciente.

Casos criados manualmente pelo professor (sem IA) também não têm esses achados. Tratado em RF11.

## 2. Objetivo

1. O histórico enviado à IA preserva **todas** as mensagens do diálogo, incluindo respostas em Modo NARRADOR; filtra apenas marcadores conhecidos por prefixo exato.
2. Mover o RAG do **tempo de conversa** para o **tempo de criação**: retirar `file_search` do caminho padrão do paciente (reversível por configuração) e adicioná-lo a geração de caso, avaliação SOAP e geração de flashcards.
3. O caso gerado passa a conter achados objetivos fundamentados, para o Modo NARRADOR ler em vez de inventar.
4. Uso de `file_search` passa a ser observável (log + atributo no trace do Langfuse), em todos os call sites.
5. Falha da IA não deixa turno órfão consumindo cota.

## 3. Não-objetivos

- **Remover `complete_with_files` ou o vector store.** A função permanece, testada e disponível; muda apenas quem a chama por padrão. Ver E1 (§7).
- **Alterar o formato `[NARRADOR]`** ou a renderização no frontend — é contrato estabelecido com `ChatGPT.tsx`.
- **Nova coluna na tabela `cases`.** Os achados objetivos entram dentro do `patient_prompt` existente (E5, §7). Coluna dedicada é follow-up.
- **Popular ou curar o vector store.** O conteúdo dos PDFs é premissa desta spec, não escopo. Se a bibliografia for rasa, o ganho de RF8–RF10 é proporcionalmente menor — e a instrumentação de RF5 é o que vai mostrar isso.
- **Multilíngue nos achados objetivos.** Caso gerado é conteúdo compartilhado e continua pt-BR (SPEC-011 E1 / D5 de `docs/I18N.md`).
- **Janela deslizante / sumarização de histórico.** Com `gpt_max_turns` = 30 o custo total por conversa fica na casa de ~80k tokens de input; o teto de turnos já é o mecanismo de contenção.
- **Prompt caching explícito.** Oportunidade real (prefixo estável e crescente), mas medir depois que P2 estabilizar o prefixo. Follow-up.
- **Backfill de conversas antigas.** Mensagens `[NARRADOR]` já gravadas passam a ser incluídas naturalmente pela nova leitura; nada a migrar.
- **Rever `max_tokens=600`** para um prompt que pede 2–4 frases. Follow-up de custo, sem impacto em correção.

## 4. Requisitos funcionais

### 4.1 Histórico do chat (P1)

- **RF1 — filtro por prefixo exato.** `_build_history` filtra apenas conteúdo iniciado por um prefixo de uma allowlist explícita (`[SOAP_SUBMISSION]`, `[MODO AVALIADOR`). Qualquer outro conteúdo — inclusive `[NARRADOR]` — é preservado com o texto original, prefixo incluído.

- **RF2 — allowlist como constante nomeada.** Os prefixos vivem em uma constante de módulo (ex.: `_INTERNAL_MARKERS`), não inline na condição, para que adicionar marcador futuro seja uma linha e apareça em busca por nome.

### 4.2 RAG fora do paciente (P2)

- **RF3 — RAG desligado por padrão no paciente.** `chat_service.handle_chat_message` chama `complete()` em vez de `complete_with_files()`, salvo quando a flag de RF4 estiver ativa.

- **RF4 — flag de configuração.** Env var `PATIENT_USE_FILE_SEARCH` (default `false`) restaura o comportamento anterior quando `true`. Segue o padrão de leitura de env já usado em `openai_service.py`. Permite A/B sem deploy de código — e é o gancho para a bancada de avaliação comparar as duas configurações.

### 4.3 Observabilidade de tool use (P3)

- **RF5 — observabilidade de tool use.** As funções que anexam `file_search` extraem de `resp.output` os itens de tipo `file_search_call` e registram: contagem de chamadas e queries emitidas. Vai para `logger.info` e, quando o Langfuse estiver ativo, como metadata do trace. Ausência de tool call é registrada como zero, não como silêncio. O `trace_name` do chamador precisa aparecer no registro, para distinguir geração de avaliação de paciente.

- **RF6 — extração de output resiliente.** A leitura dos itens de `resp.output` não pode quebrar a resposta: se o formato vier diferente do esperado, loga warning e retorna o texto normalmente. Observabilidade nunca derruba o chat.

### 4.4 Turno órfão (P4)

- **RF7 — sem turno órfão.** Se a chamada à IA falhar definitivamente, a mensagem do aluno não permanece como turno contabilizado. A implementação escolhe entre (a) gravar só após sucesso, com o texto devolvido ao cliente em caso de erro, ou (b) gravar antes e remover/marcar no `except`. A escolha deve preservar a intenção original (§1.4) de não perder a mensagem do aluno silenciosamente.

### 4.5 RAG na criação de conteúdo (P2 / P5)

- **RF8 — `complete_json_with_files` no `openai_service`.** Nova função: Responses API com `file_search` **e** saída JSON forçada, mesma assinatura-espírito de `complete_json` (`messages`, `model`, `temperature`, `max_tokens`, `trace_name`). Fallback para `complete_json` quando `VECTOR_STORE_ID` não estiver configurado, espelhando o que `complete_with_files` já faz com `complete` (`openai_service.py:170-172`). Sujeita a RF5–RF6. É a única adição à camada base; nenhum service fala com o SDK.

- **RF9 — geração de caso com RAG.** `generation_service.generate_case` passa a usar `complete_json_with_files`. O prompt ganha instrução explícita para fundamentar a apresentação clínica na bibliografia disponível. O contrato de retorno (`title`, `specialty`, `summary`, `patient_prompt`) **não muda** exceto pelo previsto em RF10.

- **RF10 — achados objetivos no caso gerado.** O prompt de geração passa a produzir, **dentro do `patient_prompt`**, uma seção delimitada com os dados objetivos que o Modo NARRADOR deve fornecer: sinais vitais (PA, FC, FR, Temp, SpO2) e achados de exame físico coerentes com o diagnóstico e com a `difficulty` do caso. Requisitos:
  - a seção é textual, dentro do campo existente — sem coluna nova (E5);
  - o `_PATIENT_SYSTEM_PROMPT` instrui o Modo 2 a **usar esses valores** quando presentes, e só improvisar quando ausentes (compatibilidade com casos antigos);
  - a regra existente de não revelar o diagnóstico no `patient_prompt` (`generation_service.py:44`) continua valendo — achado objetivo não é diagnóstico.

- **RF11 — degradação para casos sem achados.** Casos manuais e casos já existentes no banco não têm a seção de RF10. O comportamento nesses casos é o atual (NARRADOR improvisa), sem erro e sem log de exceção. Nenhuma migração de dados nesta spec.

- **RF12 — avaliação SOAP com RAG.** `eval_service.evaluate_soap` passa a usar `complete_json_with_files`, com instrução no prompt para fundamentar o **feedback qualitativo** na bibliografia. O cálculo do `score` continua determinístico a partir do `breakdown` × pesos do professor (`eval_service.py:129-139`) — RAG não toca a aritmética (E7).

- **RF13 — geração de flashcards com RAG.** `flashcard_service` (`:880`) passa a usar `complete_json_with_files`. É o item de menor confiança desta spec e o primeiro a ser cortado se o escopo apertar (E8).

## 5. Requisitos não-funcionais

- **RNF1** — nenhuma mudança de assinatura pública. `handle_chat_message`, `complete_with_files`, `generate_case`, `evaluate_soap` mantêm parâmetros e tipos de retorno atuais; `openai_service` segue a única camada que fala com o SDK.
- **RNF2** — `ruff check app/` limpo.
- **RNF3** — suíte existente sem regressão (166 testes). `test_spec011_i18n_ai_language.py:83` faz patch de `app.services.chat_service.complete_with_files`; **RF3 quebra esse mock** — o teste precisa ser atualizado no mesmo commit, não é regressão legítima. Testes que mockam `complete_json` em `generation_service`/`eval_service`/`flashcard_service` têm o mesmo problema com RF9/RF12/RF13.
- **RNF4** — latência. RF12 adiciona retrieval a um endpoint que o aluno espera de forma síncrona ao submeter o SOAP. Se o p95 da avaliação degradar de forma perceptível, RF12 é revertível isoladamente (a mudança é uma linha por service).

## 6. Casos de teste propostos

> Sujeitos a validação antes da implementação (SDD). Arquivo sugerido: `backend/tests/test_spec012_chat_context.py`.

**Filtro de histórico (P1)**

- **T1** — `_build_history` com mensagem `assistant` iniciada por `[NARRADOR]` → mensagem **presente** no resultado, conteúdo idêntico ao original (prefixo preservado).
- **T2** — `_build_history` com mensagem iniciada por `[SOAP_SUBMISSION]\n...` → **ausente** do resultado.
- **T3** — `_build_history` com `[MODO AVALIADOR ...]` → **ausente**.
- **T4** — conteúdo legítimo que começa com colchete mas não é marcador conhecido (ex.: `"[risos] não sei, doutor"`) → **presente**. Trava a regressão de casar por forma genérica.
- **T5** — ordem e papéis preservados; mensagens com `role` fora de `user|assistant` seguem excluídas.
- **T6 (integração)** — conversa com turno NARRADOR: o `messages_payload` passado ao mock da OpenAI **contém** a linha do narrador. É o teste que reproduz o bug de ponta a ponta.

**RAG fora do paciente (RF3–RF4)**

- **T7** — `PATIENT_USE_FILE_SEARCH` ausente/`false` → `handle_chat_message` chama `complete`, e **não** `complete_with_files`.
- **T8** — `PATIENT_USE_FILE_SEARCH=true` → chama `complete_with_files`. Garante reversibilidade.
- **T9** — `complete_with_files` continua anexando a tool `file_search` quando `VECTOR_STORE_ID` existe (capacidade preservada, §3).

**Observabilidade (P3)**

- **T10** — resposta contendo item `file_search_call` → contagem registrada (>0), com o `trace_name` do chamador.
- **T11** — resposta sem tool call → registro de zero, sem exceção.
- **T12** — `resp.output` em formato inesperado (ausente, `None`, item sem `type`) → retorna o texto normalmente, sem levantar (RF6).

**Turno órfão (P4)**

- **T13** — IA falha definitivamente → contagem de mensagens `role="user"` da conversa não é incrementada de forma permanente; aluno recebe mensagem de erro.
- **T14** — IA responde com sucesso → exatamente um `user` e um `assistant` gravados, na ordem correta.

**RAG na criação (RF8–RF13)**

- **T15** — `complete_json_with_files` com `VECTOR_STORE_ID` configurado → anexa a tool `file_search` e devolve JSON parseável.
- **T16** — `complete_json_with_files` **sem** `VECTOR_STORE_ID` → delega a `complete_json`, sem levantar. Espelha `openai_service.py:170`.
- **T17** — `generate_case` chama `complete_json_with_files` (e não `complete_json`); contrato de retorno (as 4 chaves) inalterado.
- **T18** — `generate_case` com JSON malformado → mesmo comportamento de erro de hoje (`generation_service.py:87`). RAG não muda o caminho de falha.
- **T19** — `evaluate_soap` chama `complete_json_with_files`; dado o mesmo `breakdown` da IA e os mesmos pesos, o `score` calculado é **idêntico** ao de hoje (E7 — RAG não toca a aritmética).
- **T20** — `flashcard_service` chama `complete_json_with_files`.
- **T21** — `patient_prompt` **com** seção de achados objetivos → o system prompt montado instrui a usar os valores fornecidos.
- **T22** — `patient_prompt` **sem** a seção (caso antigo/manual) → nenhum erro, nenhum log de exceção; comportamento atual preservado (RF11).

## 7. Decisões

- **E1 — flag em vez de remoção no paciente.** Removeríamos `complete_with_files` do paciente de vez, mas a flag com default seguro dá o ganho imediato de custo/persona, preserva a reversão em um env var, e cria o experimento controlado que a bancada de avaliação vai medir. Remoção definitiva só com número na mão.
- **E2 — allowlist por prefixo exato, não regex.** `[SOAP_SUBMISSION]` já é filtrado por prefixo exato em três outros pontos do código (`cases.py` ×2, `flashcard_service.py`). Prefixo exato alinha esta camada com as demais e é imune ao tipo de casamento acidental que causou P1.
- **E3 — instrumentação junto com a mudança, não depois.** RF5 poderia ser spec separada, mas sem ela não há como verificar o efeito de RF3 nem justificar a remoção definitiva — nem confirmar que o RAG novo está de fato disparando.
- **E4 — não filtrar `[NARRADOR]` do que é enviado à IA.** Alternativa considerada: remover o prefixo antes de mandar (mantendo o conteúdo). Descartada — o prefixo informa ao modelo que aquele turno foi Modo 2, o que ajuda a alternância descrita no prompt.
- **E5 — achados objetivos dentro do `patient_prompt`, não em coluna nova.** Coluna dedicada em `cases` seria mais limpa, mas exige migração + política RLS + ajuste no frontend de edição do professor. Dentro do `patient_prompt` a mudança fica contida em um prompt e zero schema, e o professor continua podendo editar os valores no editor que já existe. Coluna dedicada vira follow-up se a seção provar valor.
- **E6 — retrieval no tempo de criação, não no de conversa.** É o princípio que organiza P2 e P5: recuperar onde o conteúdo **nasce** (uma vez por caso, uma vez por tentativa) e consumir do prompt onde ele é **lido** (até 30 turnos). Troca custo variável e imprevisível por custo fixo, e ainda resolve a incoerência entre turnos na origem.
- **E7 — RAG não toca o cálculo da nota.** `evaluate_soap` calcula o score deterministicamente a partir do `breakdown`. RF12 muda a qualidade do texto e dos scores por dimensão que a IA propõe, nunca a aritmética. T19 trava isso.
- **E8 — flashcards por último.** RF13 é a de menor confiança: o material de flashcard pode já estar suficientemente ancorado no caso e no histórico da conversa. Fica no fim do rollout e é cortável sem afetar o resto.

## 8. Rollout

1. **RF1–RF2 (P1)** — correção pura, sem flag, efeito imediato na coerência. Commit fechado e independente; é o bug que está em produção agora.
2. **RF5–RF6 (P3)** com o comportamento atual ainda ativo → coletar taxa real de `file_search` no paciente como linha de base.
3. **RF8** (`complete_json_with_files`) — infraestrutura, sem mudança de comportamento em nenhum service.
4. **RF3–RF4** — virar o default do paciente; comparar custo/latência por conversa contra a linha de base do passo 2.
5. **RF9–RF11** — geração de caso com RAG + achados objetivos. Validar manualmente alguns casos gerados antes de liberar.
6. **RF12** — avaliação SOAP com RAG; observar p95 (RNF4).
7. **RF7 (P4)** — independente dos demais, pode entrar a qualquer momento.
8. **RF13** — flashcards.
9. Atualizar `backend/app/services/CLAUDE.md`, `docs/MIGRATION_OPENAI.md` (quem usa o vector store e por quê) e `backend/.env.example` (`PATIENT_USE_FILE_SEARCH`).

## 9. Follow-ups (fora desta spec)

- Coluna dedicada para achados objetivos em `cases`, se a seção de RF10 provar valor (E5).
- Endpoint para gerar achados objetivos em casos já existentes / criados manualmente (RF11 hoje só degrada).
- Prompt caching explícito no prefixo system+histórico.
- Rever `gpt_max_tokens=600` frente ao "2-4 frases" do prompt.
- Mensagem de limite de turnos (`chat_service.py:147`) é string pt-BR hardcoded — candidata a código de erro estável (padrão SPEC-010).
- Curadoria do vector store: saber o que há nele hoje e se cobre as especialidades dos casos gerados.
- Caso de regressão na bancada de avaliação: persona "aluno que pede exame físico e depois questiona o valor informado", dimensão `coerência_entre_turnos`.
