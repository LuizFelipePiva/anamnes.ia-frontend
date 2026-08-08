"""
Rotas de Perfil do Aluno — acessível pelo próprio aluno e por professores/admins.
"""
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.security import validate_uuid, verify_jwt_token
from app.auth.service import create_jwt_token
from app.config import logger
from app.db.supabase import get_supabase_client
from app.errors import http_error
from app.i18n import is_supported

router = APIRouter(prefix="/profile", tags=["profile"])


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _build_profile(student_id: str, sb):
    """Monta o perfil completo de um aluno a partir do Supabase."""

    # Dados do usuário
    try:
        user_res = sb.table("users") \
            .select("id, name, email, institution, role, user_type, language") \
            .eq("id", student_id) \
            .single() \
            .execute()
        user = user_res.data
    except Exception:
        user = None

    if not user:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Turmas do aluno
    enrolled_res = sb.table("class_students") \
        .select("class_id, joined_at, classes(id, name, code, teacher_id)") \
        .eq("student_id", student_id) \
        .execute()
    classes = []
    for row in (enrolled_res.data or []):
        c = row.get("classes") or {}
        if c:
            classes.append({
                "class_id":   c.get("id"),
                "name":       c.get("name"),
                "code":       c.get("code"),
                "joined_at":  row.get("joined_at"),
            })

    # Tentativas com dados do caso
    attempts_res = sb.table("case_attempts") \
        .select("id, case_id, conversation_id, status, score, feedback, started_at, duration_seconds, cases(title, specialty, difficulty)") \
        .eq("student_id", student_id) \
        .order("started_at", desc=True) \
        .execute()

    attempts = attempts_res.data or []

    # Conversas sem caso vinculado (Chat IA, histórico antigo com type=null, etc.)
    # Buscadas aqui para entrar nas estatísticas de tentativas.
    # FUTURAMENTE: será a base para controle de cota por plano.
    linked_conv_ids = {a["conversation_id"] for a in attempts if a.get("conversation_id")}

    ai_convs_res = sb.table("conversations") \
        .select("id, title, created_at, type") \
        .eq("user_id", student_id) \
        .or_("type.neq.case,type.is.null") \
        .order("created_at", desc=True) \
        .execute()

    ai_convs = [c for c in (ai_convs_res.data or []) if c["id"] not in linked_conv_ids]

    # ── Estatísticas gerais ───────────────────────────────────────────────────
    # "Concluído" = SOAP enviado e processado (status=completed), com ou sem score
    completed = [a for a in attempts if a.get("status") == "completed"]
    # Notas e tempo só dos que têm score real (GPT pode falhar e salvar score=null)
    scored    = [a for a in completed if a.get("score") is not None]
    scores    = [a["score"] for a in scored]
    durations = [a["duration_seconds"] for a in completed if a.get("duration_seconds")]

    # Chat IA (legacy sem case_attempt): conta apenas como tentativa iniciada
    total_ai = len(ai_convs)

    stats = {
        "total_attempts":           len(attempts) + total_ai,
        "completed":                len(completed),
        "average_score":            round(sum(scores) / len(scores), 1) if scores else None,
        "best_score":               max(scores) if scores else None,
        "average_duration_seconds": int(sum(durations) / len(durations)) if durations else None,
    }

    # ── Por especialidade ─────────────────────────────────────────────────────
    spec_map: dict = defaultdict(lambda: {"attempts": 0, "completed": 0, "scores": []})
    for a in attempts:
        case = a.get("cases") or {}
        spec = case.get("specialty") or "Geral"
        spec_map[spec]["attempts"] += 1
        if a.get("status") == "completed":
            spec_map[spec]["completed"] += 1
        if a.get("score") is not None:
            spec_map[spec]["scores"].append(a["score"])

    by_specialty = [
        {
            "specialty": spec,
            "attempts":  data["attempts"],
            "completed": data["completed"],
            "average_score": round(sum(data["scores"]) / len(data["scores"]), 1) if data["scores"] else 0,
        }
        for spec, data in spec_map.items()
    ]
    by_specialty.sort(key=lambda x: x["attempts"], reverse=True)

    # ── Evolução semanal (últimas 8 semanas) ──────────────────────────────────
    week_map: dict = defaultdict(list)
    # Case_attempts com score
    for a in scored:
        if not a.get("started_at"):
            continue
        try:
            dt = datetime.fromisoformat(a["started_at"].replace("Z", "+00:00"))
            week_label = f"{dt.isocalendar()[0]}-W{dt.isocalendar()[1]:02d}"
            week_map[week_label].append(a["score"])
        except Exception:
            pass

    # Ordena e pega as últimas 8 semanas
    sorted_weeks = sorted(week_map.keys())[-8:]
    weekly_scores = [
        {
            "week":      w,
            "avg_score": round(sum(week_map[w]) / len(week_map[w]), 1),
        }
        for w in sorted_weeks
    ]

    # ── Histórico por tentativa (case_attempts) ───────────────────────────────
    history = []
    for a in attempts:
        case = a.get("cases") or {}
        form_data = case.get("form_data") or {}
        history.append({
            "attempt_id":        a["id"],
            "case_id":           a["case_id"],
            "case_title":        case.get("title", "Caso sem título"),
            "queixa_principal":  form_data.get("queixa_principal", ""),
            "specialty":         case.get("specialty", "Geral"),
            "difficulty":        case.get("difficulty"),
            "score":             a.get("score"),
            "feedback":          a.get("feedback"),
            "status":            a.get("status"),
            "started_at":        a.get("started_at"),
            "duration_seconds":  a.get("duration_seconds"),
            "is_ai_chat":        False,
            "conversation_id":   a.get("conversation_id"),
        })

    # ── Chats sem caso vinculado (Chat IA, histórico antigo, etc.) ───────────
    # Reutiliza ai_convs já buscado acima para as stats (sem segunda query).
    for ac in ai_convs:
        history.append({
            "attempt_id":        ac["id"],
            "case_id":           None,
            "case_title":        ac.get("title") or "Chat IA",
            "specialty":         None,
            "difficulty":        None,
            "score":             None,
            "feedback":          None,
            "status":            "completed",
            "started_at":        ac.get("created_at"),
            "duration_seconds":  None,
            "is_ai_chat":        True,
            "conversation_id":   ac["id"],
        })

    # Re-ordena todo o histórico por data desc
    history.sort(key=lambda x: x.get("started_at") or "", reverse=True)

    return {
        "user":          user,
        "stats":         stats,
        "by_specialty":  by_specialty,
        "weekly_scores": weekly_scores,
        "history":       history,
        "classes":       classes,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────

class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    institution: str | None = None
    language: str | None = None


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=100)


@router.put("/me")
def update_my_profile(body: ProfileUpdateRequest, payload=Depends(verify_jwt_token)):
    """Usuário atualiza o próprio nome e/ou instituição."""
    user_id = payload.get("sub")
    sb = get_supabase_client()

    update_data = {}
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Nome não pode ser vazio")
        update_data["name"] = name
    if body.institution is not None:
        update_data["institution"] = body.institution.strip() or None
    if body.language is not None:
        if not is_supported(body.language):
            raise HTTPException(status_code=400, detail="Idioma não suportado")
        update_data["language"] = body.language

    if not update_data:
        raise HTTPException(status_code=422, detail="Nenhum campo para atualizar")

    result = sb.table("users").update(update_data).eq("id", user_id).execute()
    if not result.data:
        raise http_error(404, "user_not_found", "Usuário não encontrado")

    response = {"message": "Perfil atualizado com sucesso", **result.data[0]}

    # Se o idioma mudou, reemite o JWT com o novo `language` (SPEC-007). O token
    # antigo (guardado no front) carrega o idioma de quando o usuário logou e, por
    # ter a maior precedência na detecção, sobrescreveria a escolha no próximo F5.
    if "language" in update_data:
        response["token"] = create_jwt_token(
            user_id,
            payload.get("email", ""),
            payload.get("role", "student"),
            payload.get("name", "Usuário"),
            update_data["language"],
        )

    return response


@router.post("/change-password")
def change_password(body: ChangePasswordRequest, payload=Depends(verify_jwt_token)):
    """Usuário troca a própria senha verificando a senha antiga primeiro."""
    email = payload.get("email", "")
    if not email:
        raise HTTPException(status_code=422, detail="Email não encontrado no token")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=422, detail="A nova senha deve ter pelo menos 8 caracteres")

    sb = get_supabase_client()

    # Verifica a senha atual tentando fazer login
    try:
        sign_in = sb.auth.sign_in_with_password({"email": email, "password": body.old_password})
    except Exception:
        raise http_error(401, "wrong_password", "Senha atual incorreta") from None

    if not sign_in or not sign_in.session:
        raise http_error(401, "wrong_password", "Senha atual incorreta")

    # Usa a sessão obtida para atualizar a senha
    try:
        sb.auth.set_session(sign_in.session.access_token, sign_in.session.refresh_token)
        sb.auth.update_user({"password": body.new_password})
    except Exception:
        raise HTTPException(status_code=500, detail="Erro ao atualizar senha. Tente novamente.") from None

    return {"message": "Senha alterada com sucesso"}


@router.get("/me")
def get_my_profile(payload=Depends(verify_jwt_token)):
    """Aluno (ou admin) visualiza o próprio perfil."""
    caller_role = payload.get("role", "")
    if caller_role not in ("student", "admin"):
        raise HTTPException(status_code=403, detail="Acesso não autorizado")

    sb = get_supabase_client()
    jwt_sub   = payload.get("sub", "")
    jwt_email = payload.get("email", "")
    jwt_name  = payload.get("name", "Usuário")

    # 1. Tenta pelo id (sub)
    resolved_id = None
    try:
        r = sb.table("users").select("id").eq("id", jwt_sub).execute()
        if r.data:
            resolved_id = jwt_sub
    except Exception:
        pass

    # 2. Fallback: busca pelo email
    if not resolved_id and jwt_email:
        try:
            r = sb.table("users").select("id").eq("email", jwt_email).execute()
            if r.data:
                resolved_id = r.data[0]["id"]
        except Exception:
            pass

    # 3. Último recurso: retorna perfil vazio com dados do JWT (admin sem registro na tabela)
    if not resolved_id:
        return {
            "user": {
                "id":          jwt_sub,
                "name":        jwt_name,
                "email":       jwt_email,
                "institution": None,
                "role":        caller_role,
            },
            "stats": {
                "total_attempts":           0,
                "completed":                0,
                "average_score":            0,
                "best_score":               0,
                "average_duration_seconds": 0,
            },
            "by_specialty":  [],
            "weekly_scores": [],
            "history":       [],
            "classes":       [],
        }

    return _build_profile(resolved_id, sb)


# ─── LGPD: Exclusão de conta ────────────────────────────────────────────────

class DeleteAccountRequest(BaseModel):
    confirmation: str = Field(..., description="Deve ser 'EXCLUIR MINHA CONTA'")


@router.delete("/me")
def delete_my_account(body: DeleteAccountRequest, payload=Depends(verify_jwt_token)):
    """
    LGPD Art. 18 — Exclusão de dados pessoais.
    Remove permanentemente a conta e todos os dados associados.
    """
    if body.confirmation != "EXCLUIR MINHA CONTA":
        raise HTTPException(
            status_code=422,
            detail="Para confirmar, envie confirmation='EXCLUIR MINHA CONTA'"
        )

    user_id = payload.get("sub")
    sb = get_supabase_client()

    # Verifica se o usuário existe
    user_res = sb.table("users").select("id, role").eq("id", user_id).execute()
    if not user_res.data:
        raise http_error(404, "user_not_found", "Usuário não encontrado")

    if user_res.data[0].get("role") == "admin":
        raise HTTPException(status_code=403, detail="Contas admin não podem ser auto-excluídas")

    # 1. Exclui mensagens das conversas do usuário
    convs = sb.table("conversations").select("id").eq("user_id", user_id).execute()
    conv_ids = [c["id"] for c in (convs.data or [])]
    if conv_ids:
        sb.table("messages").delete().in_("conversation_id", conv_ids).execute()

    # 2. Exclui conversas
    sb.table("conversations").delete().eq("user_id", user_id).execute()

    # 3. Exclui tentativas de caso
    sb.table("case_attempts").delete().eq("student_id", user_id).execute()

    # 4. Remove de turmas
    sb.table("class_students").delete().eq("student_id", user_id).execute()

    # 5. Exclui de public.users
    sb.table("users").delete().eq("id", user_id).execute()

    # 6. Exclui de auth.users via Admin API
    try:
        sb.auth.admin.delete_user(user_id)
    except Exception:
        logger.warning(f"⚠️  Falha ao excluir {user_id} de auth.users")

    logger.info(f"🗑️  Conta {user_id} auto-excluída (LGPD)")
    return {"message": "Conta e todos os dados associados foram excluídos permanentemente"}


# ─── LGPD: Exportação de dados ──────────────────────────────────────────────

@router.get("/me/export")
def export_my_data(payload=Depends(verify_jwt_token)):
    """
    LGPD Art. 18 — Portabilidade dos dados.
    Retorna todos os dados pessoais do usuário em formato JSON.
    """
    user_id = payload.get("sub")
    sb = get_supabase_client()

    # Dados do usuário
    user_res = sb.table("users") \
        .select("id, name, email, institution, role, user_type, active, created_at") \
        .eq("id", user_id).execute()
    user_data = user_res.data[0] if user_res.data else None
    if not user_data:
        raise http_error(404, "user_not_found", "Usuário não encontrado")

    # Conversas e mensagens
    convs_res = sb.table("conversations") \
        .select("id, title, type, created_at") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True).execute()
    conversations = convs_res.data or []

    conv_ids = [c["id"] for c in conversations]
    messages = []
    if conv_ids:
        msgs_res = sb.table("messages") \
            .select("id, conversation_id, role, content, created_at") \
            .in_("conversation_id", conv_ids) \
            .order("created_at").execute()
        messages = msgs_res.data or []

    # Tentativas de caso
    attempts_res = sb.table("case_attempts") \
        .select("id, case_id, conversation_id, status, score, feedback, started_at, duration_seconds") \
        .eq("student_id", user_id) \
        .order("started_at", desc=True).execute()
    attempts = attempts_res.data or []

    # Turmas
    classes_res = sb.table("class_students") \
        .select("class_id, joined_at, classes(name, code)") \
        .eq("student_id", user_id).execute()
    classes = []
    for row in (classes_res.data or []):
        c = row.get("classes") or {}
        classes.append({
            "class_id": row.get("class_id"),
            "name": c.get("name"),
            "code": c.get("code"),
            "joined_at": row.get("joined_at"),
        })

    return {
        "export_date": datetime.utcnow().isoformat(),
        "user": user_data,
        "conversations": conversations,
        "messages": messages,
        "case_attempts": attempts,
        "classes": classes,
    }


@router.get("/{student_id}")
def get_student_profile(student_id: str, payload=Depends(verify_jwt_token)):
    """Professor ou admin visualiza o perfil de um aluno."""
    validate_uuid(student_id, "student_id")
    caller_role = payload.get("role", "")
    caller_id   = payload.get("sub")

    # Próprio aluno pode acessar seu perfil por qualquer rota
    if caller_id == student_id:
        sb = get_supabase_client()
        return _build_profile(student_id, sb)

    if caller_role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Acesso não autorizado")

    sb = get_supabase_client()

    # Professor: verifica se aluno está em uma de suas turmas
    if caller_role == "teacher":
        classes = sb.table("classes").select("id").eq("teacher_id", caller_id).execute()
        if not classes.data:
            raise HTTPException(status_code=403, detail="Aluno não está em suas turmas")

        class_ids = [c["id"] for c in classes.data]
        enrolled = sb.table("class_students") \
            .select("id") \
            .eq("student_id", student_id) \
            .in_("class_id", class_ids) \
            .execute()

        if not enrolled.data:
            raise HTTPException(status_code=403, detail="Aluno não está em suas turmas")

    # Audit log: registra acesso a dados de aluno por terceiro
    logger.info(f"[Audit] {caller_role}={caller_id} acessou perfil do aluno {student_id}")

    return _build_profile(student_id, sb)
