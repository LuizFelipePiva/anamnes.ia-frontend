"""
Camada base de acesso à OpenAI.
Todos os serviços chamam este módulo — nunca chamam o SDK diretamente.
Inclui Langfuse para rastreamento de chamadas e gestão de prompts.
"""
import os
import time

from openai import APIError, APITimeoutError, RateLimitError
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import logger

# ── Langfuse (opcional — fallback gracioso se não configurado) ─────────────────
_langfuse = None
try:
    if os.getenv("LANGFUSE_SECRET_KEY"):
        from langfuse import Langfuse
        _langfuse = Langfuse(
            host=os.getenv("LANGFUSE_BASE_URL") or os.getenv("LANGFUSE_HOST"),
        )
        logger.info("[OpenAI] Langfuse inicializado com sucesso")
    else:
        logger.info("[OpenAI] LANGFUSE_SECRET_KEY não configurada — rastreamento desativado")
except Exception as e:
    logger.warning(f"[OpenAI] Langfuse não disponível: {e}")

# ── Cliente OpenAI ─────────────────────────────────────────────────────────────
# Usa wrapper do Langfuse se disponível (suporta chat.completions e responses.create).
try:
    if _langfuse and os.getenv("LANGFUSE_SECRET_KEY"):
        from langfuse.openai import OpenAI
        logger.info("[OpenAI] Usando cliente OpenAI com rastreamento Langfuse")
    else:
        from openai import OpenAI
except ImportError:
    from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _langfuse_kwargs(trace_name: str, session_id: str | None = None) -> dict:
    """Rastreamento para `chat.completions.create` (NÃO serve para `responses`).

    O wrapper `langfuse.openai` intercepta `name`/`session_id` só neste
    endpoint. Sem Langfuse o `client` é o SDK puro da OpenAI, que rejeita os
    dois — por isso o dict sai vazio nesse caso, em vez de a chamada quebrar.

    Para `responses.create` use `_responses_metadata()`: medido em 2026-08-06,
    passar `session_id` ali levanta
    `Responses.create() got an unexpected keyword argument 'session_id'` e
    derruba TODA conversa do paciente virtual.
    """
    if not _langfuse:
        return {}
    kwargs: dict = {"name": trace_name}
    if session_id:
        kwargs["session_id"] = session_id
    return kwargs


def _responses_metadata(session_id: str | None = None) -> dict:
    """Rastreamento para `responses.create`, via `metadata`.

    `metadata` é campo nativo da OpenAI (dict de strings) e o único canal que
    os dois endpoints aceitam — `name`/`session_id` são extraídos pelo wrapper
    apenas em `chat.completions`. `langfuse_session_id` é a chave que o
    Langfuse lê de dentro do metadata para agrupar em Session; `conversation_id`
    fica junto em texto claro para quem estiver lendo o trace na mão.
    """
    if not _langfuse or not session_id:
        return {}
    return {
        "metadata": {
            "langfuse_session_id": session_id,
            "conversation_id": session_id,
        }
    }

DEFAULT_MODEL   = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
EVAL_MODEL      = os.getenv("OPENAI_MODEL_EVAL", DEFAULT_MODEL)  # modelo para avaliação SOAP
VECTOR_STORE_ID = os.getenv("OPENAI_VECTOR_STORE_ID")

# ── Helpers ────────────────────────────────────────────────────────────────────

_SETTINGS_CACHE_TTL = 60  # segundos — evita 1 query em platform_settings por mensagem de chat
_settings_cache: dict[str, tuple[int, float]] = {}


def _get_setting(key: str, default: int) -> int:
    """Lê configuração da tabela platform_settings (cache de 60s). Usa default se não encontrar."""
    cached = _settings_cache.get(key)
    if cached and cached[1] > time.monotonic():
        return cached[0]
    value = default
    try:
        from app.db.supabase import get_supabase_client
        sb = get_supabase_client()
        res = sb.table("platform_settings").select("value").eq("key", key).execute()
        if res.data:
            value = int(res.data[0]["value"])
    except Exception:
        return default  # não cacheia falha — tenta de novo na próxima chamada
    _settings_cache[key] = (value, time.monotonic() + _SETTINGS_CACHE_TTL)
    return value


def get_max_tokens() -> int:
    return _get_setting("gpt_max_tokens", int(os.getenv("GPT_MAX_TOKENS", "600")))


def get_max_turns() -> int:
    return _get_setting("gpt_max_turns", int(os.getenv("GPT_MAX_TURNS", "30")))


def get_daily_message_limit() -> int:
    return _get_setting("gpt_daily_message_limit", int(os.getenv("GPT_DAILY_MESSAGE_LIMIT", "100")))


def get_prompt(name: str, **variables) -> str:
    """
    Busca prompt do Langfuse pelo nome e injeta as variáveis.
    Retorna string vazia se Langfuse indisponível — o chamador usa fallback local.

    O label vem de `LANGFUSE_PROMPT_LABEL` e cai em `production` quando ausente,
    que é o comportamento de sempre. Existe para poder apontar um ambiente de
    teste a uma versão **candidata** do prompt sem promovê-la a produção: sem
    isso, validar uma mudança de prompt exigia publicá-la para todos os alunos
    primeiro e torcer.
    """
    if not _langfuse:
        return ""
    label = os.getenv("LANGFUSE_PROMPT_LABEL", "production")
    try:
        prompt = _langfuse.get_prompt(name, label=label)
        return prompt.compile(**variables) if variables else prompt.compile()
    except Exception as e:
        logger.warning(
            f"[OpenAI] Prompt '{name}' (label '{label}') não encontrado no Langfuse: {e}"
        )
        return ""


# ── Funções base ───────────────────────────────────────────────────────────────

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((APIError, APITimeoutError, RateLimitError)),
    reraise=True,
)
def complete(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.7,
    max_tokens: int | None = None,
    trace_name: str = "complete",
    session_id: str | None = None,
) -> str:
    """Chamada simples de chat.completions. Sem acesso a arquivos."""
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_completion_tokens=max_tokens or get_max_tokens(),
        **_langfuse_kwargs(trace_name, session_id),
    )
    return resp.choices[0].message.content.strip()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((APIError, APITimeoutError, RateLimitError)),
    reraise=True,
)
def complete_json(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.3,
    max_tokens: int = 1000,
    trace_name: str = "complete_json",
    session_id: str | None = None,
) -> str:
    """chat.completions com output forçado em JSON. Usar para geração/avaliação."""
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_completion_tokens=max_tokens,
        response_format={"type": "json_object"},
        **_langfuse_kwargs(trace_name, session_id),
    )
    return resp.choices[0].message.content.strip()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((APIError, APITimeoutError, RateLimitError)),
    reraise=True,
)
def complete_with_files(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.7,
    max_tokens: int | None = None,
    trace_name: str = "complete_with_files",
    session_id: str | None = None,
) -> str:
    """
    Responses API com file_search na vector store dos PDFs médicos.
    Usa para o paciente virtual — a IA consulta os livros ao responder.
    Fallback para complete() se OPENAI_VECTOR_STORE_ID não estiver configurado.
    """
    if not VECTOR_STORE_ID:
        logger.warning("[OpenAI] OPENAI_VECTOR_STORE_ID não configurado, usando chat sem arquivos")
        return complete(messages, model, temperature, max_tokens, trace_name, session_id)

    # Responses API usa `instructions` para system prompt — não aceita role "system" no input
    instructions = None
    input_messages = []
    for m in messages:
        if m.get("role") == "system":
            instructions = m["content"]
        else:
            input_messages.append(m)

    resp = client.responses.create(
        model=model,
        tools=[{"type": "file_search", "vector_store_ids": [VECTOR_STORE_ID]}],
        input=input_messages,
        instructions=instructions,
        temperature=temperature,
        max_output_tokens=max_tokens or get_max_tokens(),
        **_responses_metadata(session_id),
    )
    return resp.output_text.strip()
