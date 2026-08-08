from app.db.supabase import get_supabase_client

supabase = get_supabase_client()

def get_or_create_user(email, name="Usuário Teste", user_id=None, role="student", language="pt-BR"):
    email = email.lower().strip()  # normaliza para evitar mismatch de capitalização
    # Busca usuário existente pelo email
    result = supabase.table("users").select("*").eq("email", email).execute()

    if result.data and len(result.data) > 0:
        return result.data[0]

    # Não achou pelo email: se temos user_id, busca por ele antes de tentar inserir
    if user_id:
        by_id = supabase.table("users").select("*").eq("id", user_id).execute()
        if by_id.data and len(by_id.data) > 0:
            return by_id.data[0]

        # Não existe de jeito nenhum: cria
        try:
            new_user = supabase.table("users").insert({
                "id": user_id,
                "email": email,
                "name": name,
                "role": role,
                "language": language,
            }).execute()
            return new_user.data[0] if new_user.data else None
        except Exception:
            # Race condition: outra requisição inseriu entre a busca e o insert
            fallback = supabase.table("users").select("*").eq("id", user_id).execute()
            return fallback.data[0] if fallback.data else None

    return None

def get_or_create_conversation(user_id, thread_id, case_title=None, conv_type: str = "ai_chat"):
    """
    Cria ou recupera uma conversa.

    conv_type:
      - "ai_chat"  → chat gerado livremente pela IA, sem caso clínico estruturado.
                     Futuramente será contado para limites de plano (contas sem assinatura).
      - "case"     → caso clínico pronto (criado por admin ou professor), gratuito para todos.
    """
    # Busca conversa existente
    result = supabase.table("conversations").select("*").eq("thread_id", thread_id).execute()
    
    if result.data and len(result.data) > 0:
        convo = result.data[0]
        # Atualiza título se necessário
        if case_title and (not convo.get("title") or convo.get("title") == ""):
            supabase.table("conversations").update({"title": case_title}).eq("id", convo["id"]).execute()
            result = supabase.table("conversations").select("*").eq("thread_id", thread_id).execute()
            convo = result.data[0] if result.data else convo
        return convo
    
    # Cria nova conversa
    title = case_title if case_title else None
    new_convo = supabase.table("conversations").insert({
        "user_id": user_id,
        "thread_id": thread_id,
        "title": title,
        "type": conv_type,
    }).execute()
    
    return new_convo.data[0] if new_convo.data else None

def update_conversation_title_if_needed(conversation_id):
    """
    Verifica se a conversa não tem título e usa o fallback "CHAT SEM ASSUNTO DEFINIDO".
    O título do caso deve ser definido ao criar a conversa, não baseado na primeira mensagem.
    """
    result = supabase.table("conversations").select("title").eq("id", conversation_id).execute()
    
    if result.data and len(result.data) > 0:
        convo = result.data[0]
        if convo.get("title"):
            # Já tem título, não precisa atualizar
            return
    
    # Se não tem título, usa o fallback
    fallback_title = "CHAT SEM ASSUNTO DEFINIDO"
    supabase.table("conversations").update({"title": fallback_title}).eq("id", conversation_id).execute()

def save_message(conversation_id, role, content):
    supabase.table("messages").insert({
        "conversation_id": conversation_id,
        "role": role,
        "content": content
    }).execute()
    
    # Se for a primeira mensagem do usuário e não houver título, usa o fallback
    if role == "user" and conversation_id:
        update_conversation_title_if_needed(conversation_id)

def get_messages(conversation_id):
    result = supabase.table("messages").select("role, content").eq("conversation_id", conversation_id).order("timestamp").execute()
    return result.data if result.data else []

def ensure_conversation_has_title(conversation_id):
    """
    Garante que a conversa tenha um título. Se não tiver, usa o fallback "CHAT SEM ASSUNTO DEFINIDO".
    Útil para conversas antigas que foram criadas antes da implementação de títulos automáticos.
    """
    update_conversation_title_if_needed(conversation_id)
