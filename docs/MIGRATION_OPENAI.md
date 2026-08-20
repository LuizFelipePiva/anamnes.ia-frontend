# Plano de Migração: Assistants API → chat.completions + RAG

## Estado Atual

### O que usa a Assistants API hoje

| Endpoint | Uso | Thread reutilizado? |
|---|---|---|
| `POST /cases/generate` | Gera JSON do caso a partir da descrição do professor | ❌ Thread descartado |
| `POST /cases/ai/start` | Inicia chat IA livre com paciente virtual | ✅ Thread persistente por sessão |
| `POST /cases/{id}/start` | Inicia tentativa de caso pré-existente | ✅ Thread persistente por sessão |
| `POST /cases/{id}/complete` | Avalia SOAP do aluno | ❌ Thread descartado |
| `POST /cases/chat/message` (chat_service.py) | Mensagem do aluno ao paciente | ✅ Thread reutilizado |

### O problema central: Vector Store (PDFs/livros)

O assistente tem arquivos de anamnese e medicina associados via **vector store** do OpenAI.
O `file_search` é ativado automaticamente pelo assistant quando relevante.

`chat.completions` puro **não acessa vector stores** — precisamos de uma estratégia para manter esse conhecimento.

---

## Arquitetura Alvo

```
backend/app/services/
├── openai_service.py      ← camada base: complete(), complete_json(), stream()
├── chat_service.py        ← paciente virtual (já existe, refatorar)
├── eval_service.py        ← avaliação SOAP (novo, extrair de cases.py)
└── generation_service.py  ← geração de casos (novo, extrair de cases.py)

# Futuros (não criar agora):
# ├── quiz_service.py
# ├── flashcard_service.py
# └── recommendation_service.py
```

---

## Estratégia para os PDFs/Livros

### Opção A — Responses API com Vector Store (recomendada)
A nova Responses API (`client.responses.create`) é o sucessor direto da Assistants API.
Suporta `file_search` com as mesmas vector stores existentes, sem polling.

```python
response = client.responses.create(
    model="gpt-4o-mini",
    tools=[{"type": "file_search", "vector_store_ids": [VECTOR_STORE_ID]}],
    input=[{"role": "user", "content": "..."}],
)
```

**Vantagens:**
- Reutiliza a vector store existente (zero re-upload)
- Sem polling (síncrono como chat.completions)
- Mesmo padrão de messages array
- Já é o "sucessor oficial" da Assistants API

**Desvantagens:**
- API ainda nova (lançada em 2025), pode ter quebras

### Opção B — chat.completions + RAG manual via pgvector (Supabase)
Transfere os PDFs para embeddings no próprio banco Supabase (`pgvector`).
A cada mensagem, busca os trechos mais relevantes e injeta no context.

```python
# Pseudo-código
chunks = search_similar_chunks(user_message, top_k=5)
context = "\n\n".join(chunks)
messages = [
    {"role": "system", "content": PATIENT_PROMPT + f"\n\nReferência:\n{context}"},
    ...history...,
    {"role": "user", "content": user_message},
]
response = client.chat.completions.create(model="gpt-4o-mini", messages=messages)
```

**Vantagens:**
- Controle total — sem dependência de storage OpenAI
- Vector store fica no Supabase (já pago)
- Funciona com qualquer modelo (inclui modelos open-source futuros)

**Desvantagens:**
- Trabalho inicial: gerar embeddings dos PDFs, salvar no Supabase
- Precisar de tabela `embeddings` + função `match_documents` no Supabase

### Recomendação

| Cenário | Escolha |
|---|---|
| Migração rápida, manter arquivos onde estão | **Opção A (Responses API)** |
| Controle máximo, escalar para muitos docs | **Opção B (pgvector)** |
| Quer independência futura de qualquer modelo | **Opção B (pgvector)** |

**Para agora:** Opção A (Responses API) — migração mais simples, mantém os PDFs onde estão, sem reupload.
**No futuro:** quando tiver mais conteúdo médico ou quiser controle total, migra para pgvector.

---

## Estrutura do `openai_service.py`

```python
"""
Camada base de acesso à OpenAI.
Todos os serviços chamam este módulo — nunca chamam o SDK diretamente.
Trocar modelo ou provider: mudar aqui.
"""
import os
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from openai import APIError, APITimeoutError, RateLimitError
from app.config import logger

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

DEFAULT_MODEL    = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
VECTOR_STORE_ID  = os.getenv("OPENAI_VECTOR_STORE_ID")  # ex: vs_abc123


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10),
       retry=retry_if_exception_type((APIError, APITimeoutError, RateLimitError)), reraise=True)
def complete(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 800,
) -> str:
    """Chamada simples de chat.completions. Sem acesso a arquivos."""
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_completion_tokens=max_tokens,
    )
    return resp.choices[0].message.content.strip()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10),
       retry=retry_if_exception_type((APIError, APITimeoutError, RateLimitError)), reraise=True)
def complete_json(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.3,
    max_tokens: int = 1000,
) -> str:
    """Igual a complete() mas força output JSON. Usar para geração de casos, avaliação, flashcards."""
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_completion_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content.strip()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10),
       retry=retry_if_exception_type((APIError, APITimeoutError, RateLimitError)), reraise=True)
def complete_with_files(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 800,
) -> str:
    """
    Responses API com file_search na vector store dos PDFs médicos.
    Usar para o paciente virtual — a IA consulta os livros ao responder.
    """
    if not VECTOR_STORE_ID:
        # Fallback gracioso: usa chat.completions sem arquivos
        logger.warning("[OpenAI] OPENAI_VECTOR_STORE_ID não configurado, usando chat sem arquivos")
        return complete(messages, model, temperature, max_tokens)

    resp = client.responses.create(
        model=model,
        tools=[{"type": "file_search", "vector_store_ids": [VECTOR_STORE_ID]}],
        input=messages,
        temperature=temperature,
        max_output_tokens=max_tokens,
    )
    return resp.output_text.strip()
```

---

## Serviços especializados

### `chat_service.py` (paciente virtual)

```python
from app.services.openai_service import complete_with_files
from app.config import logger

def get_patient_response(
    patient_system_prompt: str,
    history: list[dict],      # [{"role": "user/assistant", "content": "..."}]
    user_message: str,
    max_tokens: int = 600,
) -> str:
    messages = [
        {"role": "system", "content": patient_system_prompt},
        *history,
        {"role": "user", "content": user_message},
    ]
    return complete_with_files(messages, max_tokens=max_tokens)
```

### `eval_service.py` (avaliação SOAP)

```python
from app.services.openai_service import complete_json
import json

def evaluate_soap(soap_content: str, case_summary: str) -> dict:
    """Retorna {"score": int, "feedback": str}"""
    messages = [
        {"role": "system", "content": SOAP_EVALUATION_PROMPT},
        {"role": "user", "content": f"SOAP:\n{soap_content}\n\nCaso: {case_summary}"},
    ]
    raw = complete_json(messages, temperature=0.3, max_tokens=800)
    result = json.loads(raw)
    return {
        "score": min(100, max(0, int(result.get("score", 0)))),
        "feedback": result.get("feedback", "Não foi possível avaliar."),
    }
```

### `generation_service.py` (gerar caso via GPT)

```python
from app.services.openai_service import complete_json
import json

def generate_case_from_description(description: str, difficulty: str) -> dict:
    """Retorna o JSON completo do caso clínico."""
    messages = [
        {"role": "system", "content": CASE_GENERATION_PROMPT},
        {"role": "user", "content": f"Descrição: {description}\nDificuldade: {difficulty}"},
    ]
    raw = complete_json(messages, temperature=0.7, max_tokens=1200)
    return json.loads(raw)
```

---

## O que muda no `cases.py`

### Antes (Assistants API)
```python
thread = create_thread()
send_user_message(thread.id, prompt)
response = get_assistant_response(thread.id)
```

### Depois (chat.completions / Responses API)
```python
# Geração de caso (1 chamada, sem thread)
from app.services.generation_service import generate_case_from_description
result = generate_case_from_description(data.description, data.difficulty)

# Paciente virtual (history do banco, sem thread externo)
from app.services.chat_service import get_patient_response
history = _load_conversation_history(conv_id, sb)
reply = get_patient_response(patient_prompt, history, user_message)

# Avaliação SOAP (1 chamada, sem thread)
from app.services.eval_service import evaluate_soap
result = evaluate_soap(data.soap_content, case_summary)
```

---

## thread_id no banco

Hoje `conversations.thread_id` guarda o ID do thread OpenAI (ex: `thread_abc123`).
Após a migração, o histórico fica 100% no banco (tabela `messages`), então:

- `thread_id` pode ser `null` para novas conversas
- Conversas antigas ainda têm `thread_id` mas o thread OpenAI pode ser descartado
- Não há quebra: frontend usa `conversation_id` para tudo, nunca `thread_id` diretamente

---

## Variáveis de ambiente a adicionar

```env
# Novo — ID da vector store existente (Assistants API > Storage > Vector Stores)
OPENAI_VECTOR_STORE_ID=vs_xxxxxxxxxxxxxxxxxx

# Opcional — trocar modelo sem redeploy
OPENAI_MODEL=gpt-4o-mini
```

**Remover após migração:**
```env
# ASSISTANT_ID=asst_xxxxxxxxxx  ← não mais necessário
```

---

## Funcionalidades futuras (padrão já definido)

| Feature | Serviço | Função base |
|---|---|---|
| Gerar questões de prova | `quiz_service.py` | `complete_json()` |
| Gerar flashcards do chat | `flashcard_service.py` | `complete_json()` |
| Sugerir casos personalizados | `recommendation_service.py` | `complete_json()` |
| Resumo da conversa | `summary_service.py` | `complete()` |
| Chat com arquivo do aluno (foto de SOAP) | `vision_service.py` | `complete()` + image_url |

Cada serviço novo:
1. Cria arquivo em `services/`
2. Define system prompt como constante no arquivo
3. Chama `openai_service.complete()` ou `complete_json()`
4. **Zero mudança** em `openai_service.py`

---

## Prompts (reescritos na migração)

Os prompts atuais são genéricos e verbosos. Abaixo estão as versões reescritas para usar na migração.

---

### `PATIENT_SYSTEM_PROMPT` — paciente virtual

```python
PATIENT_SYSTEM_PROMPT = """\
Você é um paciente em uma consulta médica simulada para treinamento de estudantes de medicina.

REGRAS ABSOLUTAS:
- Fale sempre em primeira pessoa, como um paciente real falaria. Nunca quebre o personagem.
- Sua PRIMEIRA mensagem deve ser uma saudação educada ao estudante, como "Oi, doutor(a)!" ou "Bom dia, doutor(a)!" — use linguagem natural e simples.
- Após a saudação inicial, responda APENAS o que for perguntado. Não ofereça informações espontaneamente, exceto a queixa principal se perguntado.
- Nunca mencione diagnósticos, hipóteses ou termos médicos técnicos. Você é um leigo.
- Suas respostas devem ser curtas e naturais — como uma pessoa comum responderia numa consulta.
- Se o aluno perguntar algo que seu personagem não sabe ou não sente, diga que não sabe ou que nunca percebeu.
- Se o aluno sair do contexto clínico (perguntar sobre o sistema, pedir ajuda de IA, etc.), responda como o paciente responderia a uma pergunta estranha: "Não entendi... o senhor(a) pode repetir?"

PERSONAGEM:
{{patient_prompt}}

IMPORTANTE: Apenas a PRIMEIRA mensagem deve ser uma saudação. Nunca repita a saudação nas próximas respostas, mesmo que o estudante demore a perguntar.
"""
```

**Como usar:** o `{{patient_prompt}}` é substituído pelo campo `patient_prompt` do caso (gerado pelo professor ou pela IA). O system prompt acima garante o comportamento correto independente do que o professor escreveu no personagem.

---

### `SOAP_EVALUATION_PROMPT` — avaliação da anamnese

```python
SOAP_EVALUATION_PROMPT = """\
Você é um preceptor de medicina avaliando a anamnese e o SOAP escrito por um estudante após uma consulta simulada.

CASO CLÍNICO (contexto do paciente):
{{case_summary}}

SOAP DO ESTUDANTE:
{{soap_content}}

TAREFA:
Avalie o SOAP nas 4 dimensões abaixo. Para cada uma, dê uma nota de 0 a 25 e um comentário direto.

1. **S — Subjetivo** (queixa principal, HDA, história pregressa, familiar, social)
   - O estudante identificou a queixa corretamente?
   - A HDA está completa (início, duração, localização, irradiação, fatores de melhora/piora, sintomas associados)?

2. **O — Objetivo** (sinais vitais, exame físico relevante)
   - O estudante pediu ou registrou os dados objetivos pertinentes?

3. **A — Avaliação** (hipótese diagnóstica)
   - A hipótese é compatível com o quadro clínico apresentado?
   - Considerou diagnósticos diferenciais relevantes?

4. **P — Plano** (conduta, exames, encaminhamentos)
   - A conduta proposta é adequada e segura para o nível de atenção?

RESPONDA APENAS em JSON válido, sem texto fora do JSON:
{
  "score": <soma das 4 notas, 0-100>,
  "breakdown": {
    "subjetivo": {"score": <0-25>, "feedback": "<comentário direto>"},
    "objetivo":  {"score": <0-25>, "feedback": "<comentário direto>"},
    "avaliacao": {"score": <0-25>, "feedback": "<comentário direto>"},
    "plano":     {"score": <0-25>, "feedback": "<comentário direto>"}
  },
  "feedback_geral": "<parágrafo final com os pontos mais importantes para o estudante melhorar>"
}
"""
```

---

### `CASE_GENERATION_PROMPT` — geração de caso pelo professor

```python
CASE_GENERATION_PROMPT = """\
Você é um especialista em educação médica. Gere um caso clínico realista para simulação de anamnese.

INSTRUÇÃO DO PROFESSOR:
{{description}}

NÍVEL DE DIFICULDADE: {{difficulty}}
(Básico = queixa clara, poucos diferenciais | Intermediário = alguns diferenciais | Avançado = apresentação atípica ou múltiplas comorbidades)

GERE um JSON válido com EXATAMENTE esta estrutura:
{
  "title": "<nome do caso — ex: 'Dor torácica em homem de 52 anos'>",
  "specialty": "<especialidade principal — ex: Cardiologia, Clínica Médica>",
  "difficulty": "<Básico | Intermediário | Avançado>",
  "summary": "<resumo clínico em 2-3 linhas para o professor — inclui diagnóstico provável>",
  "patient_prompt": "<instruções completas do personagem para a IA jogar o papel do paciente. Inclua: nome, idade, sexo, profissão, personalidade, queixa principal, história da doença atual completa, antecedentes pessoais, medicamentos em uso, histórico familiar relevante, hábitos de vida. Escreva em terceira pessoa como instructable: 'Você é João, 52 anos...'>"
}

REGRAS:
- O `patient_prompt` deve ter informações suficientes para a IA responder qualquer pergunta pertinente de anamnese.
- NÃO inclua o diagnóstico no `patient_prompt` — apenas os sintomas e história.
- O caso deve ser clinicamente coerente e educacionalmente relevante.
- Responda APENAS o JSON, sem texto adicional.
"""
```

---

### `FLASHCARD_GENERATION_PROMPT` — geração de flashcards a partir de um caso

```python
FLASHCARD_GENERATION_PROMPT = """\
Você é um especialista em educação médica e aprendizado espaçado (spaced repetition).

Com base no caso clínico abaixo, gere flashcards para revisar os conceitos mais importantes que o estudante deve memorizar.

CASO CLÍNICO:
{{case_summary}}

CONVERSA DA ANAMNESE (opcional — se fornecida, use para identificar lacunas do aluno):
{{conversation_summary}}

GERE um JSON válido com EXATAMENTE esta estrutura:
{
  "flashcards": [
    {
      "frente": "<pergunta direta e objetiva>",
      "verso": "<resposta concisa, máximo 3 linhas>",
      "categoria": "<Semiologia | Fisiopatologia | Diagnóstico | Conduta | Farmacologia>"
    }
  ]
}

REGRAS:
- Gere entre 8 e 15 flashcards por caso.
- Priorize conceitos que o estudante provavelmente erraria em prova.
- Frentes devem ser perguntas clínicas diretas — evite perguntas teóricas abstratas.
- Versos devem ser respostas memoráveis, não textos longos.
- Varie as categorias para cobrir diferentes aspectos do caso.
- Inclua pelo menos 1 flashcard sobre diagnósticos diferenciais e 1 sobre conduta.
- Responda APENAS o JSON, sem texto adicional.
"""
```

**Exemplo de flashcard gerado:**
```json
{
  "frente": "Quais são os critérios de SIRS para diagnóstico de sepse?",
  "verso": "2 ou mais critérios: FC >90, FR >20 ou PaCO2 <32, T >38°C ou <36°C, Leucócitos >12k ou <4k",
  "categoria": "Diagnóstico"
}
```

---

### `QUIZ_GENERATION_PROMPT` — geração de questões de prova para o professor

```python
QUIZ_GENERATION_PROMPT = """\
Você é um especialista em avaliação médica e elaboração de questões no formato do REVALIDA e provas de residência médica.

INSTRUÇÃO DO PROFESSOR:
{{professor_instruction}}

CASO CLÍNICO BASE (se fornecido):
{{case_summary}}

PARÂMETROS:
- Número de questões: {{num_questions}}
- Dificuldade: {{difficulty}} (Básico | Intermediário | Avançado)
- Área de foco: {{focus_area}} (ex: Semiologia, Diagnóstico, Conduta, Farmacologia — ou "Geral")

GERE um JSON válido com EXATAMENTE esta estrutura:
{
  "titulo": "<título da prova ou lista de questões>",
  "questoes": [
    {
      "enunciado": "<enunciado completo com contexto clínico suficiente para responder>",
      "alternativas": {
        "A": "<alternativa>",
        "B": "<alternativa>",
        "C": "<alternativa>",
        "D": "<alternativa>",
        "E": "<alternativa>"
      },
      "resposta_correta": "<A | B | C | D | E>",
      "justificativa": "<explicação da resposta correta e por que as outras estão erradas — máximo 5 linhas>",
      "categoria": "<Semiologia | Fisiopatologia | Diagnóstico | Conduta | Farmacologia>"
    }
  ]
}

REGRAS:
- Cada questão deve ter cenário clínico realista no enunciado (paciente com queixa, dados objetivos).
- As alternativas erradas devem ser plausíveis — evite distratores obviamente incorretos.
- A justificativa deve ser didática, citando o raciocínio clínico correto.
- Para dificuldade Avançado: use apresentações atípicas, pacientes com comorbidades, ou condutas em situações de urgência.
- Responda APENAS o JSON, sem texto adicional.
"""
```

**Exemplo de questão gerada:**
```json
{
  "enunciado": "Homem de 58 anos, hipertenso e diabético, chega ao PS com dor precordial em aperto iniciada há 2h, irradiada para o membro superior esquerdo, associada a sudorese fria. PA 150/90, FC 98, ECG com supra de ST em V1-V4. Qual a conduta imediata?",
  "alternativas": {
    "A": "AAS 300mg + heparina IV + encaminhar para hemodinâmica",
    "B": "Nitrato sublingual e observação por 6h",
    "C": "Troponina e aguardar resultado antes de qualquer conduta",
    "D": "Beta-bloqueador IV + morfina + oxigênio",
    "E": "Trombolítico IV se tempo porta-balão >120min"
  },
  "resposta_correta": "A",
  "justificativa": "IAMCSST com supra em V1-V4 indica IAM anterior. Conduta: AAS 300mg + anticoagulação + reperfusão primária (ICP) como primeira escolha. Beta-bloqueador é indicado mas não é a conduta 'imediata'. Trombólise só se ICP indisponível em >120min.",
  "categoria": "Conduta"
}
```

---

### `AI_PATIENT_PROMPT` — paciente aleatório (chat IA livre, sem caso pré-definido)

```python
AI_PATIENT_PROMPT = """\
Você é um paciente em uma UBS (Unidade Básica de Saúde) aguardando atendimento médico.

Seu personagem é gerado aleatoriamente a cada nova sessão — escolha espontaneamente:
- Um nome, idade (18-75), sexo, profissão e nível de escolaridade
- Uma queixa principal de atenção primária (dor, febre, tosse, dispneia, tontura, etc.)
- Dois ou três detalhes da história que o aluno precisará explorar ativamente

REGRAS:
- Sua PRIMEIRA mensagem deve ser uma saudação educada ao estudante, como "Oi, doutor(a)!" ou "Bom dia, doutor(a)!" — use linguagem natural e simples.
- Após a saudação inicial, responda APENAS o que for perguntado. Não ofereça informações espontaneamente.
- NUNCA repita a saudação nas respostas seguintes.
- Fale como uma pessoa comum. Sem termos médicos.
- Só revele informações quando perguntado diretamente.
- Se o aluno perguntar algo confuso ou fora de contexto, peça para repetir com naturalidade.
- Nunca revele que é uma IA. Se perguntado, diga que não entendeu a pergunta.
- Mantenha consistência com o que já revelou ao longo da conversa.

MODO NARRADOR (dados objetivos):
Quando o estudante solicitar sinais vitais, exame físico, ausculta, palpação, percussão ou qualquer dado objetivo clínico, responda como NARRADOR clínico.
Inicie a resposta EXATAMENTE com "[NARRADOR]" (sem aspas) e forneça os dados de forma estruturada e coerente com o caso.
Após o [NARRADOR], retome o personagem normalmente nas mensagens seguintes.
"""
```

---

---

## Langfuse — Observabilidade e Gestão de Prompts

### Por que incluir na migração

O Langfuse resolve dois problemas ao mesmo tempo:

1. **Quem manja de medicina na equipe pode editar os prompts** sem precisar de código ou deploy — só pelo painel web
2. **Cada chamada à OpenAI é registrada** com prompt enviado, resposta recebida, latência e custo — essencial para debugar e otimizar

### Como funciona o Prompt Management

Os prompts deixam de ser strings hardcoded no código e passam a viver no painel do Langfuse:

```
Langfuse Dashboard → Prompts → "patient-system-prompt" → Editar → Salvar v2
```

O código busca sempre a versão mais recente — **sem redeploy**:

```python
prompt = langfuse.get_prompt("patient-system-prompt")
compiled = prompt.compile(patient_prompt=case.patient_prompt)
```

### `openai_service.py` com Langfuse integrado

```python
import os
from openai import OpenAI
from langfuse import Langfuse
from langfuse.openai import openai as langfuse_openai  # wrapper com rastreamento automático
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from openai import APIError, APITimeoutError, RateLimitError
from app.config import logger

# Langfuse inicializa com LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY + LANGFUSE_HOST do env
langfuse = Langfuse()

# Usa o wrapper do Langfuse — mesma API do OpenAI, mas registra tudo automaticamente
client = langfuse_openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

DEFAULT_MODEL   = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
VECTOR_STORE_ID = os.getenv("OPENAI_VECTOR_STORE_ID")


def get_prompt(name: str, **variables) -> str:
    """Busca prompt do Langfuse pelo nome e compila as variáveis.
    Fallback para string vazia se Langfuse estiver indisponível."""
    try:
        prompt = langfuse.get_prompt(name)
        return prompt.compile(**variables)
    except Exception:
        logger.warning(f"[Langfuse] Prompt '{name}' não encontrado, usando fallback local")
        return ""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10),
       retry=retry_if_exception_type((APIError, APITimeoutError, RateLimitError)), reraise=True)
def complete(messages, model=DEFAULT_MODEL, temperature=0.7, max_tokens=800,
             trace_name: str = "complete") -> str:
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_completion_tokens=max_tokens,
        name=trace_name,  # aparece no Langfuse
    )
    return resp.choices[0].message.content.strip()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10),
       retry=retry_if_exception_type((APIError, APITimeoutError, RateLimitError)), reraise=True)
def complete_json(messages, model=DEFAULT_MODEL, temperature=0.3, max_tokens=1000,
                  trace_name: str = "complete_json") -> str:
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_completion_tokens=max_tokens,
        response_format={"type": "json_object"},
        name=trace_name,
    )
    return resp.choices[0].message.content.strip()
```

### Variáveis de ambiente a adicionar (Langfuse Cloud grátis)

```env
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxxxx
LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxxxx
LANGFUSE_HOST=https://cloud.langfuse.com
```

### Prompts a cadastrar no Langfuse

> **Formato no dashboard Langfuse:** variáveis usam `{{chaves_duplas}}`. O `.compile()` converte para `{chaves_simples}` ao chamar a OpenAI.

| Nome no Langfuse | Quem edita | Variáveis (formato Langfuse) |
|---|---|---|
| `patient-system-prompt` | Equipe médica | `{{patient_prompt}}` |
| `soap-evaluation-prompt` | Equipe médica | `{{case_summary}}`, `{{soap_content}}` |
| `case-generation-prompt` | Equipe médica | `{{description}}`, `{{difficulty}}` |
| `ai-patient-prompt` | Equipe médica | `{{specialty}}` |
| `flashcard-generation-prompt` | Equipe médica | `{{case_summary}}`, `{{conversation_summary}}` |
| `quiz-generation-prompt` | Equipe médica | `{{professor_instruction}}`, `{{case_summary}}`, `{{num_questions}}`, `{{difficulty}}`, `{{focus_area}}` |

### Fluxo de edição para a equipe médica

```
1. Acessar cloud.langfuse.com
2. Ir em Prompts → selecionar o prompt
3. Editar o texto (variáveis em `{{chaves_duplas}}` não mudar)
4. Salvar → nova versão ativa imediatamente
5. Monitorar no dashboard se a métrica melhorou
```

Nenhum desenvolvedor precisa ser acionado para ajustar tom, linguagem ou critérios de avaliação.

---

## Ordem de implementação

1. **Criar conta no Langfuse Cloud** (langfuse.com — grátis até 50K observações/mês)
2. **Cadastrar os 6 prompts** no painel do Langfuse (copiar das seções acima)
3. **Criar `openai_service.py`** com Langfuse integrado (`complete()`, `complete_json()`, `complete_with_files()`)
4. **Criar `eval_service.py`** — migrar avaliação SOAP (não usa histórico, mais simples)
5. **Criar `generation_service.py`** — migrar geração de casos (não usa histórico)
6. **Refatorar `chat_service.py`** — trocar `ask_gpt(thread_id)` por `get_patient_response(history)`
7. **Atualizar `cases.py`** — remover todos os imports de `gpt_assistant`, usar novos serviços
8. **Deletar `gpt_assistant.py`**
9. **Adicionar variáveis de env** no Railway: `OPENAI_VECTOR_STORE_ID`, `LANGFUSE_*`
10. **Remover `ASSISTANT_ID`** do Railway (após validar em produção)

---

## Status atual da migração (branch `feat/openai-migration`)

### ✅ Concluído

| Item | Arquivo | Detalhe |
|---|---|---|
| `openai_service.py` | `services/openai_service.py` | `complete()`, `complete_json()`, `complete_with_files()`, `get_prompt()` com Langfuse 4.0.4 |
| `chat_service.py` | `services/chat_service.py` | Histórico do banco, sem threads OpenAI |
| `eval_service.py` | `services/eval_service.py` | `evaluate_soap()` com contexto do histórico da conversa |
| `generation_service.py` | `services/generation_service.py` | `generate_case()` via `complete_json()` |
| Avaliação SOAP endpoint | `routes/cases.py` | `POST /cases/evaluate-soap` dedicado para free cases |
| Quota admin | `routes/cases.py` | Admin retorna cota ilimitada (9999) |
| Quota lógica | `routes/cases.py` | Simplificada: admin → ilimitado, paid/b2b → tipo original, demais → free |
| Admin na tabela aluno | `routes/admin.py` | `list_users` inclui `role IN ('student', 'admin')` |
| Frontend SOAP eval | `StudentChat.tsx` | `evaluateFreeCaseSoap` chama `POST /cases/evaluate-soap` com `conversation_id` |
| Frontend seletores | `StudentChat.tsx` | Seletor de especialidade + seletor de modo (overlay escuro `/95`) |
| Header oculto nos seletores | `StudentChat.tsx` | `caseHeader` só renderiza após `chatMode !== null` |
| Parser feedback Langfuse | `eval_service.py` | Suporta `feedback` e `feedback_geral` (Langfuse usa `feedback_geral`) |
| Cap score SOAP trivial | `eval_service.py` | SOAP com ≤ 8 palavras reais → score capeado em 10 |
| `max_tokens` eval | `eval_service.py` | 1000 → 2500 (evita truncamento do JSON) |
| Modo Narrador | `chat_service.py` + `ChatGPT.tsx` | Prefixo `[NARRADOR]` para sinais vitais/exame físico; card teal no frontend |

### 🔴 Pendente

| Item | Prioridade | Detalhe |
|---|---|---|
| SQL migration Supabase | **Alta** | `ALTER TABLE conversations ALTER COLUMN thread_id DROP NOT NULL` |
| Registrar prompts Langfuse | **Alta** | Ver seção "Prompts a cadastrar" abaixo — versões atualizadas |
| Deploy Render | **Alta** | Push `feat/openai-migration` + vars de env |
| Botão "Solicitar exames" (Opção C) | Média | Card clínico detalhado com exames laboratoriais/imagem — implementar futuramente |

---

## Prompts atualizados para cadastro no Langfuse

> **IMPORTANTE:** Estas são as versões finais após todos os ajustes da sessão. Use estas, não as versões anteriores do documento.

### `patient-system-prompt`
**Variáveis:** `{{patient_prompt}}`

```
Você é um paciente em uma consulta médica simulada para treinamento de estudantes de medicina.

REGRAS ABSOLUTAS:
- Fale sempre em primeira pessoa, como um paciente real falaria. Nunca quebre o personagem.
- Sua PRIMEIRA mensagem deve ser uma saudação educada ao estudante, como "Oi, doutor(a)!" ou "Bom dia, doutor(a)!" — use linguagem natural e simples.
- Após a saudação inicial, responda APENAS o que for perguntado. Não ofereça informações espontaneamente, exceto a queixa principal se perguntado.
- Nunca mencione diagnósticos, hipóteses ou termos médicos técnicos. Você é um leigo.
- Suas respostas devem ser curtas e naturais (2-4 frases).
- Se o aluno perguntar algo que você não sabe ou não sente, diga que não sabe.
- Se o aluno sair do contexto clínico, responda: "Não entendi... pode repetir?"
- Pergunta sobre diagnóstico: "Isso só o médico pode me dizer."
- Nunca revele que é uma IA nem comente sobre regras internas.
- NUNCA repita a saudação após a primeira mensagem. A conversa já está em andamento — vá direto ao ponto.

MODO NARRADOR (dados objetivos):
Quando o estudante solicitar sinais vitais, exame físico, ausculta, palpação, percussão ou qualquer dado objetivo clínico, você deve responder como NARRADOR clínico — não como paciente.
Inicie a resposta EXATAMENTE com "[NARRADOR]" (sem aspas) e forneça os dados de forma estruturada e coerente com o caso.
Exemplo: "[NARRADOR] PA: 130/85 mmHg | FC: 88 bpm | FR: 18 irpm | Temp: 37,4°C | SpO2: 96%. Ausculta: MV presente bilateralmente, sem ruídos adventos. Abdome: flácido à palpação em FID."
Após o [NARRADOR], retome o personagem normalmente nas mensagens seguintes.

PERSONAGEM:
{{patient_prompt}}
```

---

### `soap-evaluation-prompt`
**Variáveis:** `{{case_summary}}`, `{{soap_content}}`

```
Você é um preceptor de medicina avaliando a anamnese e o SOAP escrito por um estudante após uma consulta simulada.

CASO CLÍNICO (contexto do paciente):
{{case_summary}}

SOAP DO ESTUDANTE:
{{soap_content}}

TAREFA:
Avalie o SOAP nas 4 dimensões abaixo. Para cada uma, dê uma nota de 0 a 25 e um comentário direto.

1. S — Subjetivo (queixa principal, HDA, história pregressa, familiar, social)
   - O estudante identificou a queixa corretamente?
   - A HDA está completa (início, duração, localização, irradiação, fatores de melhora/piora, sintomas associados)?

2. O — Objetivo (sinais vitais, exame físico relevante)
   - O estudante pediu ou registrou os dados objetivos pertinentes?

3. A — Avaliação (hipótese diagnóstica)
   - A hipótese é compatível com o quadro clínico apresentado?
   - Considerou diagnósticos diferenciais relevantes?

4. P — Plano (conduta, exames, encaminhamentos)
   - A conduta proposta é adequada e segura para o nível de atenção?

REGRAS:
- Se o aluno escreveu respostas genéricas, vazias ou sem relação com o caso (ex: "teste", "abc"), a nota DEVE ser entre 0 e 10.
- Se o SOAP está incompleto ou superficial, a nota deve ser proporcional ao esforço real.
- Seja justo mas rigoroso. Não infle notas.

Responda APENAS em JSON válido, sem texto fora do JSON:
{
  "score": <soma das 4 notas, 0-100>,
  "breakdown": {
    "subjetivo": {"score": <0-25>, "feedback": "<comentário direto>"},
    "objetivo":  {"score": <0-25>, "feedback": "<comentário direto>"},
    "avaliacao": {"score": <0-25>, "feedback": "<comentário direto>"},
    "plano":     {"score": <0-25>, "feedback": "<comentário direto>"}
  },
  "feedback_geral": "<parágrafo final com os pontos mais importantes para o estudante melhorar>"
}
```

---

### `case-generation-prompt`
**Variáveis:** `{{description}}`, `{{difficulty}}`

```
Você é um especialista em educação médica. Gere um caso clínico realista para simulação de anamnese.

INSTRUÇÃO DO PROFESSOR:
{{description}}

NÍVEL DE DIFICULDADE: {{difficulty}}
(Básico = queixa clara, poucos diferenciais | Intermediário = alguns diferenciais | Avançado = apresentação atípica ou múltiplas comorbidades)

GERE um JSON válido com EXATAMENTE esta estrutura:
{
  "title": "<nome do caso>",
  "specialty": "<especialidade principal>",
  "difficulty": "<Básico | Intermediário | Avançado>",
  "summary": "<resumo clínico em 2-3 linhas para o professor — inclui diagnóstico provável>",
  "patient_prompt": "<instruções completas do personagem. Inclua: nome, idade, sexo, profissão, personalidade, queixa principal, HDA completa, antecedentes pessoais, medicamentos em uso, histórico familiar relevante, hábitos de vida, sinais vitais coerentes com o caso e achados de exame físico esperados. Escreva em segunda pessoa: 'Você é João, 52 anos...'>"
}

REGRAS:
- O patient_prompt deve conter informações suficientes para responder qualquer pergunta de anamnese E dados objetivos (sinais vitais, exame físico) para o modo narrador.
- NÃO inclua o diagnóstico no patient_prompt — apenas sintomas e história.
- O caso deve ser clinicamente coerente e educacionalmente relevante.
- Responda APENAS o JSON, sem texto adicional.
```

---

### `ai-patient-prompt`
**Variáveis:** `{{specialty}}`

```
Você é um paciente em uma consulta médica simulada para treino de estudantes de medicina. Crie um personagem realista com nome, idade, profissão e uma queixa clínica convincente. {{specialty}}

REGRAS:
- Sua PRIMEIRA mensagem deve ser uma saudação educada ao estudante, como "Oi, doutor(a)!" ou "Bom dia, doutor(a)!" — use linguagem natural e simples.
- Após a saudação inicial, responda APENAS o que for perguntado. Não ofereça informações espontaneamente.
- NUNCA repita a saudação nas respostas seguintes.
- Fale como uma pessoa leiga — sem termos médicos.
- Não revele diagnóstico. Revele detalhes apenas quando perguntado.
- Inclua internamente sinais vitais e achados de exame físico coerentes com o caso (para responder ao modo narrador).
- NUNCA quebre o personagem nem mencione que é uma IA.

MODO NARRADOR: quando solicitado dado objetivo (sinais vitais, exame físico, ausculta, etc.), inicie a resposta EXATAMENTE com "[NARRADOR]" e forneça os dados estruturados. Depois retome o personagem normalmente.
```
