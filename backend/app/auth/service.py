import datetime

from jose import jwt

from app.config import (
    FRONTEND_URL,
    JWT_ALGORITHM,
    JWT_EXPIRATION_HOURS,
    SECRET_KEY,
    logger,
)
from app.db.supabase import get_supabase_client
from app.i18n import normalize_language
from app.models.user import get_or_create_user

supabase = get_supabase_client()

def signup(name: str, email: str, password: str, role: str = "student", language: str = None) -> str:
    """
    Cadastra um usuário via fluxo de CONFIRMAÇÃO por e-mail (SPEC-006).

    Não retorna token: o acesso só é liberado após o usuário confirmar o e-mail
    (o Supabase envia o link para `{FRONTEND_URL}/confirm`). Retorna apenas um
    **status** (string). O caller (`api_register`) mapeia "OK" e "EMAIL_EXISTS"
    para a MESMA resposta genérica, para não permitir enumeração (achado #5).

    Status possíveis: "OK", "EMAIL_EXISTS", "INVALID_EMAIL", "RATE_LIMIT", "ERROR".
    """
    if role not in ("student", "teacher"):
        role = "student"  # admin só via banco direto
    existing = get_or_create_user(email)
    logger.debug("Verificando email existente")
    if existing:
        return "EMAIL_EXISTS"

    try:
        res = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {"name": name},
                "email_redirect_to": f"{FRONTEND_URL}/confirm",
            }
        })

        # Verifica se há erro na resposta do Supabase
        if hasattr(res, "error") and res.error:
            error_msg = str(res.error.message).lower() if hasattr(res.error, "message") else str(res.error).lower()
            logger.error(f"❌ Erro do Supabase no signup: {error_msg}")
            if "rate limit" in error_msg or "too many" in error_msg:
                return "RATE_LIMIT"
            if "already registered" in error_msg or "already exists" in error_msg or "duplicate" in error_msg:
                return "EMAIL_EXISTS"
            if "invalid" in error_msg or "unable to validate" in error_msg:
                return "INVALID_EMAIL"

        logger.debug(f"Resposta Supabase signup: {res}")
        user_id = res.user.id
        get_or_create_user(email, name, user_id, role, normalize_language(language))
        logger.info(f"✅ Cadastro iniciado (aguardando confirmação): id={user_id} (role={role})")
        return "OK"

    except Exception as e:
        msg = str(e).lower()
        logger.exception(f"❌ Erro inesperado no cadastro: {msg}")
        if "rate limit" in msg or "too many" in msg or "rate_limit" in msg:
            return "RATE_LIMIT"
        if "already registered" in msg or "already been registered" in msg or "already exists" in msg or "duplicate" in msg:
            return "EMAIL_EXISTS"
        if "invalid" in msg or "unable to validate" in msg:
            return "INVALID_EMAIL"
        return "ERROR"

def login(email: str, password: str):
    try:
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        if hasattr(res, "error") and res.error:
            logger.warning(f"❌ Erro ao logar: {res.error.message}")
            return None, None
        user_id = res.user.id
        # Busca role, nome e idioma do banco
        user_db = get_or_create_user(res.user.email)
        user_role = user_db.get("role", "student") if user_db else "student"
        user_name = user_db.get("name", "Usuário") if user_db else "Usuário"
        user_lang = normalize_language(user_db.get("language") if user_db else None)
        token = create_jwt_token(user_id, res.user.email, user_role, user_name, user_lang)
        logger.info(f"✅ Login bem-sucedido para: id={user_id} (role={user_role})")
        return res.user, token
    except Exception as e:
        logger.exception(f"❌ Erro inesperado no login: {e}")
        return None, None

def create_jwt_token(user_id: str, email: str, role: str = "student", name: str = "Usuário", language: str = "pt-BR"):
    expire = datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": user_id, "email": email, "role": role, "name": name, "language": language, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)
