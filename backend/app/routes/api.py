import base64
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import Client

from app.auth.client import supabase
from app.auth.security import verify_jwt_token
from app.auth.service import login, signup
from app.db.supabase import get_supabase_client
from app.errors import http_error
from app.models.schemas import (
    AuthResponse,
    ChatRequest,
    ChatResponse,
    ConversationWithMessages,
    LoginRequest,
    RegisterRequest,
    StartChatRequest,
    StartChatResponse,
)
from app.models.user import get_or_create_conversation, get_or_create_user
from app.services.chat_service import (
    DailyLimitExceeded,
    enforce_daily_limit,
    handle_chat_message,
)


def _user_key(request: Request) -> str:
    """Rate limit key por user_id extraído do JWT (fallback para IP)."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        try:
            parts = token.split(".")
            if len(parts) == 3:
                padding = 4 - len(parts[1]) % 4
                payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=" * padding))
                if sub := payload.get("sub"):
                    return f"user:{sub}"
        except Exception:
            pass
    return get_remote_address(request)


limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

@router.post("/login", response_model=AuthResponse, tags=["auth"])
@limiter.limit("10/minute")
async def api_login(request: Request, data: LoginRequest):
    """
    ### Fazer login na plataforma
    
    Autentica um usuário e retorna um JWT token para acesso aos endpoints protegidos.
    
    **Exemplo de Request:**
    ```json
    {
        "email": "medico@exemplo.com",
        "password": "senha123"
    }
    ```
    
    **Exemplo de Response:**
    ```json
    {
        "user": {
            "id": "uuid-here",
            "email": "medico@exemplo.com",
            "name": "Dr. João"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
    """
    user, token = login(data.email, data.password)
    if not user:
        raise http_error(401, "invalid_credentials", "Credenciais inválidas — verifique email e senha")
    
    # Obtém nome do user_metadata se disponível
    user_name = "Usuário"
    if hasattr(user, 'user_metadata') and user.user_metadata:
        user_name = user.user_metadata.get('name', 'Usuário')
    
    # Cria ou obtém usuário no banco (passa user.id para criar se não existir)
    user_db = get_or_create_user(user.email, user_name, user.id)
    
    return {"user": user_db, "token": token}

# Resposta única do cadastro — idêntica para e-mail novo e já existente, para não
# permitir enumeração de contas (SPEC-006 / achado #5). Nunca retorna token: o
# acesso só é liberado após confirmar o e-mail.
_REGISTER_GENERIC = {
    "message": "Se o e-mail for válido, enviamos um link de confirmação. Verifique sua caixa de entrada."
}


@router.post("/register", tags=["auth"])
@limiter.limit("2/minute")
async def api_register(request: Request, data: RegisterRequest):
    """
    ### Cadastrar novo usuário (fluxo de confirmação por e-mail)

    Inicia o cadastro e dispara um e-mail de confirmação. **Não** retorna token:
    o usuário só acessa após confirmar o e-mail. A resposta é a **mesma** exista
    ou não o e-mail, para não vazar quais e-mails têm conta (SPEC-006).

    **Exemplo de Request:**
    ```json
    {
        "name": "Dr. João Silva",
        "email": "medico@exemplo.com",
        "password": "senha_segura123"
    }
    ```
    """
    status = signup(data.name, data.email, data.password, data.role, data.language)

    # "OK" (novo, e-mail enviado) e "EMAIL_EXISTS" → resposta idêntica (anti-enumeração).
    if status in ("OK", "EMAIL_EXISTS"):
        return _REGISTER_GENERIC

    # Erros que NÃO dependem da existência da conta podem ser explícitos.
    if status == "INVALID_EMAIL":
        raise HTTPException(status_code=400, detail="E-mail inválido")
    if status == "RATE_LIMIT":
        raise HTTPException(
            status_code=429,
            detail="Muitas tentativas de cadastro. Por favor, aguarde alguns minutos antes de tentar novamente."
        )

    # Falha inesperada — genérica, sem detalhes.
    raise HTTPException(status_code=500, detail="Não foi possível processar o cadastro. Tente novamente.")


@router.get("/me", tags=["auth"])
def get_current_user(payload=Depends(verify_jwt_token)):
    """
    ### Retorna dados do usuário autenticado
    
    Decodifica o JWT e retorna id, email, role e nome.
    """
    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role", "student"),
        "name": payload.get("name", "Usuário"),
    }


@router.post("/start_chat", response_model=StartChatResponse, tags=["chat"])
async def start_chat(request: StartChatRequest, payload=Depends(verify_jwt_token)):
    """
    ### Iniciar nova conversa
    
    Cria um novo thread de conversa com o assistente GPT.
    
    **Requer autenticação via JWT token.**
    
    **Exemplo de Request:**
    ```json
    {
        "case_title": "Caso Clínico: Paciente com febre e tosse"
    }
    ```
    """
    user_id = payload.get("sub")
    case_title = request.case_title

    # Cria conversation diretamente no banco (sem thread OpenAI)
    convo = get_or_create_conversation(
        user_id, None,
        case_title=case_title,
        conv_type="case",
    )
    conv_id = convo.get("id") if isinstance(convo, dict) else convo.id
    return StartChatResponse(thread_id=conv_id, conversation_id=conv_id)

@router.post("/gpt", response_model=ChatResponse, tags=["chat"])
@limiter.limit("20/minute", key_func=_user_key)
async def chat_gpt(
    request: Request,
    data: ChatRequest,
    payload=Depends(verify_jwt_token),
    sb: Client = Depends(get_supabase_client),
):
    """
    ### Chat com GPT (endpoint legado)

    **Rate Limit:** 20 mensagens por minuto por usuário.
    **Requer autenticação via JWT token.**
    """
    if not data.thread_id or not data.message:
        raise HTTPException(status_code=400, detail="thread_id and message required")

    user_id = payload.get("sub")
    conversation_id = data.thread_id  # frontend envia thread_id que é o conversation_id pós-migração

    # Valida que a conversa pertence ao usuário — evita IDOR de escrita (SPEC-002).
    # Mesmo padrão de get_conversation. Feito antes da cota e de qualquer escrita.
    conv_owner = sb.table("conversations").select("user_id").eq("id", conversation_id).execute()
    if not conv_owner.data:
        raise http_error(404, "conversation_not_found", "Conversa não encontrada")
    if conv_owner.data[0].get("user_id") != user_id:
        raise http_error(404, "access_denied", "Acesso negado")

    # Verifica limite diário de mensagens por usuário
    try:
        enforce_daily_limit(sb, user_id)
    except DailyLimitExceeded as e:
        raise HTTPException(status_code=429, detail=str(e)) from e

    # Busca patient_prompt do caso vinculado à conversa (se houver)
    patient_prompt = ""
    try:
        attempt_res = supabase.table("case_attempts") \
            .select("case_id") \
            .eq("conversation_id", conversation_id) \
            .limit(1) \
            .execute()
        if attempt_res.data:
            case_id = attempt_res.data[0]["case_id"]
            case_res = supabase.table("cases") \
                .select("patient_prompt") \
                .eq("id", case_id) \
                .single() \
                .execute()
            if case_res.data:
                patient_prompt = case_res.data.get("patient_prompt", "")
    except Exception:
        pass

    # Idioma do claim do JWT (SPEC-011 RF1) — resolvido por mensagem, não por
    # conversa (E3): se o aluno trocar de idioma no meio da consulta, a próxima
    # mensagem já reflete a troca. Ausente (token pré-Fase 0) → pt-BR (RF6).
    language = payload.get("language", "pt-BR")

    reply = handle_chat_message(
        user_id, conversation_id, data.message, patient_prompt, language=language
    )
    return ChatResponse(reply=reply)

@router.get("/conversations", tags=["chat"])
async def list_conversations(payload=Depends(verify_jwt_token)):
    """Lista as conversas recentes com dados de score das tentativas vinculadas."""
    user_id = payload.get("sub")
    result = supabase.table("conversations") \
        .select("id, title, created_at") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(20) \
        .execute()
    conversations = list(result.data or [])
    if not conversations:
        return []

    # Enriquece cada conversa com dados de score do case_attempt vinculado
    conv_ids = [c["id"] for c in conversations]
    try:
        attempts_res = supabase.table("case_attempts") \
            .select("conversation_id, score, status, cases(form_data)") \
            .in_("conversation_id", conv_ids) \
            .execute()
        score_map: dict = {}
        for a in (attempts_res.data or []):
            cid = a.get("conversation_id")
            if not cid:
                continue
            fd = ((a.get("cases") or {}).get("form_data")) or {}
            is_ai_chat = fd.get("source") == "ai_generated"
            score_map[cid] = {
                "score": a.get("score"),
                "attempt_status": a.get("status"),
                "is_ai_chat": is_ai_chat,
            }
    except Exception:
        score_map = {}

    for conv in conversations:
        meta = score_map.get(conv["id"])
        if meta:
            conv["score"] = meta["score"]
            conv["attempt_status"] = meta["attempt_status"]
            conv["is_ai_chat"] = meta["is_ai_chat"]
        else:
            conv["score"] = None
            conv["attempt_status"] = None
            conv["is_ai_chat"] = None  # conversa sem tentativa vinculada

    return conversations

@router.post("/conversations/update-titles", tags=["chat"])
async def update_conversation_titles(payload=Depends(verify_jwt_token)):
    """
    ### Atualizar títulos de conversas antigas
    
    Atualiza títulos de todas as conversas do usuário que não têm título.
    Útil para conversas antigas criadas antes da implementação de títulos automáticos.
    
    **Requer autenticação via JWT token.**
    """
    from app.models.user import update_conversation_title_if_needed
    
    user_id = payload.get("sub")
    
    # Busca todas as conversas do usuário sem título
    result = supabase.table("conversations").select("id").eq("user_id", user_id).or_("title.is.null,title.eq.").execute()
    conversations = result.data if result.data else []
    
    updated_count = 0
    for conv in conversations:
        conv_id = conv.get("id")
        if conv_id:
            update_conversation_title_if_needed(conv_id)
            updated_count += 1
    
    return {"updated": updated_count, "message": f"Atualizados {updated_count} títulos"}

@router.get("/conversations/{conv_id}", response_model=ConversationWithMessages, tags=["chat"])
async def get_conversation(conv_id: str, payload=Depends(verify_jwt_token)):
    """
    ### Obter conversa com histórico de mensagens
    
    Retorna detalhes de uma conversa específica incluindo todas as mensagens.
    
    **Requer autenticação via JWT token.**
    """
    from app.models.user import ensure_conversation_has_title
    
    user_id = payload.get("sub")
    
    # Busca a conversa
    result = supabase.table("conversations").select("id, title, thread_id, user_id, created_at").eq("id", conv_id).execute()
    
    if not result.data or len(result.data) == 0:
        raise http_error(404, "conversation_not_found", "Conversa não encontrada")
    
    conv = result.data[0]
    if conv.get("user_id") != user_id:
        raise http_error(404, "access_denied", "Acesso negado")

    # Garante que a conversa tenha título
    ensure_conversation_has_title(conv_id)
    
    # Busca novamente para pegar o título atualizado
    result = supabase.table("conversations").select("id, title, thread_id, user_id, created_at").eq("id", conv_id).execute()
    conv = result.data[0] if result.data else conv

    # Busca mensagens
    messages_result = supabase.table("messages").select("id, role, content, timestamp").eq("conversation_id", conv_id).order("timestamp").execute()
    messages = messages_result.data if messages_result.data else []

    # Busca avaliação (case_attempt) vinculada a esta conversa
    evaluation = None
    attempt_result = supabase.table("case_attempts").select(
        "id, score, feedback, duration_seconds, status"
    ).eq("conversation_id", conv_id).limit(1).execute()
    if attempt_result.data:
        att = attempt_result.data[0]
        evaluation = {
            "attempt_id": att["id"],
            "score": att.get("score"),
            "feedback": att.get("feedback"),
            "duration_seconds": att.get("duration_seconds"),
            "status": att.get("status", "in_progress"),
        }

    return {"conversation": conv, "messages": messages, "evaluation": evaluation}
