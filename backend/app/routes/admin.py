"""
Rotas de Administração — acesso restrito a role=admin.
"""
import os
import secrets
import string
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.auth.security import validate_uuid, verify_jwt_token
from app.auth.service import signup
from app.config import logger
from app.db.supabase import get_supabase_client
from app.errors import http_error
from app.models.user import get_or_create_user
from app.services.email_service import send_welcome_email

router = APIRouter(prefix="/admin", tags=["admin"])


# ─── Dependency: somente admin ───────────────────────────────────────────────

def verify_admin(payload=Depends(verify_jwt_token)):
    if payload.get("role") != "admin":
        raise http_error(403, "forbidden_role", "Acesso restrito a administradores")
    return payload


# ─── Schemas ─────────────────────────────────────────────────────────────────

class InstitutionCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    address: str | None = None


class InstitutionUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    description: str | None = None
    address: str | None = None
    active: bool | None = None


class CreateTeacherRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    institution_id: str = Field(..., description="UUID da instituição")
    password: str | None = None


class CreateStudentRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    institution_id: str | None = None
    password: str | None = None
    user_type: str | None = "free"


class BulkCreateStudentsRequest(BaseModel):
    institution_id: str | None = None
    students: list[CreateStudentRequest]
    user_type: str | None = "free"
    skip_email_confirmation: bool | None = False


class BulkCreateTeachersRequest(BaseModel):
    institution_id: str
    teachers: list[CreateTeacherRequest]
    skip_email_confirmation: bool | None = False


class ToggleUserStatusRequest(BaseModel):
    active: bool


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _generate_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _get_institution_name(sb, institution_id: str) -> str:
    """Busca o nome da instituição pelo ID."""
    res = sb.table("institutions").select("name, active").eq("id", institution_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Instituição não encontrada")
    if not res.data[0].get("active", True):
        raise HTTPException(status_code=400, detail="Esta instituição está desativada")
    return res.data[0]["name"]


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/overview")
def admin_overview(payload=Depends(verify_admin)):
    """Estatísticas globais da plataforma."""
    sb = get_supabase_client()

    sb = get_supabase_client()

    users_res     = sb.table("users").select("role, active").execute()
    all_users     = users_res.data or []
    inst_res      = sb.table("institutions").select("id").execute()
    cases_res     = sb.table("cases").select("id").execute()
    classes_res   = sb.table("classes").select("id").execute()
    attempts_res  = sb.table("case_attempts").select("id, status").execute()

    attempts  = attempts_res.data or []
    completed = [a for a in attempts if a.get("status") == "completed"]

    return {
        "total_users":        len(all_users),
        "total_students":     sum(1 for u in all_users if u.get("role") == "student"),
        "total_teachers":     sum(1 for u in all_users if u.get("role") == "teacher"),
        "total_admins":       sum(1 for u in all_users if u.get("role") == "admin"),
        "total_institutions": len(inst_res.data or []),
        "total_cases":        len(cases_res.data or []),
        "total_classes":      len(classes_res.data or []),
        "total_attempts":     len(attempts),
        "total_completed":    len(completed),
    }


@router.get("/institutions")
def list_institutions(payload=Depends(verify_admin)):
    """Lista todas as instituições com contagem de usuários."""
    sb = get_supabase_client()

    inst_res = sb.table("institutions").select("*").order("name").execute()
    institutions = inst_res.data or []

    users_res = sb.table("users").select("role, institution_id, active").execute()
    all_users = users_res.data or []

    counts: dict = {}
    for u in all_users:
        iid = u.get("institution_id")
        if not iid:
            continue
        if iid not in counts:
            counts[iid] = {"teachers": 0, "students": 0, "active_users": 0, "inactive_users": 0}
        if u.get("role") == "teacher":
            counts[iid]["teachers"] += 1
        elif u.get("role") == "student":
            counts[iid]["students"] += 1
        if u.get("active", True):
            counts[iid]["active_users"] += 1
        else:
            counts[iid]["inactive_users"] += 1

    result = []
    for inst in institutions:
        c = counts.get(inst["id"], {"teachers": 0, "students": 0, "active_users": 0, "inactive_users": 0})
        result.append({
            "id":            inst["id"],
            "name":          inst["name"],
            "description":   inst.get("description"),
            "address":       inst.get("address"),
            "active":        inst.get("active", True),
            "created_at":    inst.get("created_at"),
            "teachers":      c["teachers"],
            "students":      c["students"],
            "active_users":  c["active_users"],
            "inactive_users": c["inactive_users"],
        })
    return result


@router.post("/institutions", status_code=201)
def create_institution(data: InstitutionCreate, payload=Depends(verify_admin)):
    """Cria uma nova instituição."""
    sb = get_supabase_client()

    dup = sb.table("institutions").select("id").eq("name", data.name).execute()
    if dup.data:
        raise HTTPException(status_code=409, detail="Já existe uma instituição com este nome")

    res = sb.table("institutions").insert({
        "name": data.name,
        "description": data.description,
        "address": data.address,
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao criar instituição")

    logger.info(f"✅ Instituição criada: {data.name}")
    return res.data[0]


@router.patch("/institutions/{institution_id}")
def update_institution(institution_id: str, data: InstitutionUpdate, payload=Depends(verify_admin)):
    validate_uuid(institution_id, "institution_id")
    """Atualiza dados de uma instituição."""
    sb = get_supabase_client()

    existing = sb.table("institutions").select("id, name").eq("id", institution_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Instituição não encontrada")

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    old_name = existing.data[0]["name"]
    new_name = update_data.get("name")

    res = sb.table("institutions").update(update_data).eq("id", institution_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao atualizar instituição")

    # Mantém campo institution (string) sincronizado nos usuários
    if new_name and new_name != old_name:
        sb.table("users").update({"institution": new_name}).eq("institution", old_name).execute()
        logger.info(f"✅ Instituição renomeada: '{old_name}' → '{new_name}'")

    return res.data[0]


@router.delete("/institutions/{institution_id}")
def delete_institution(institution_id: str, payload=Depends(verify_admin)):
    validate_uuid(institution_id, "institution_id")
    """Remove uma instituição (somente se não houver usuários vinculados)."""
    sb = get_supabase_client()

    users_check = sb.table("users").select("id").eq("institution_id", institution_id).limit(1).execute()
    if users_check.data:
        raise HTTPException(
            status_code=409,
            detail="Não é possível excluir: há usuários vinculados. Desative a instituição em vez disso."
        )

    sb.table("institutions").delete().eq("id", institution_id).execute()
    logger.info(f"✅ Instituição {institution_id} excluída")
    return {"message": "Instituição excluída com sucesso"}


@router.get("/users")
def list_users(
    role: str | None = None,
    institution: str | None = None,
    payload=Depends(verify_admin),
):
    """Lista usuários com filtros opcionais por role e instituição."""
    sb = get_supabase_client()
    query = sb.table("users").select("id, name, email, role, institution, active, created_at, user_type")
    if role == "student":
        query = query.in_("role", ["student", "admin"])
    elif role:
        query = query.eq("role", role)
    if institution:
        query = query.eq("institution", institution)
    result = query.order("created_at", desc=True).execute()
    return result.data or []


@router.post("/users/teacher", status_code=201)
def create_teacher(data: CreateTeacherRequest, payload=Depends(verify_admin)):
    """Cria um professor vinculado a uma instituição."""
    sb = get_supabase_client()
    institution_name = _get_institution_name(sb, data.institution_id)

    password = data.password or _generate_password()
    result, token = signup(data.name, data.email, password, role="teacher")

    if result == "EMAIL_EXISTS":
        raise http_error(409, "email_already_registered", "E-mail já cadastrado")
    if result in ("RATE_LIMIT", "INVALID_EMAIL", None):
        raise HTTPException(status_code=400, detail=f"Erro ao criar conta: {result}")

    user_row = sb.table("users").select("id").eq("email", data.email).execute()
    if user_row.data:
        sb.table("users").update({
            "institution":    institution_name,
            "institution_id": data.institution_id,
            "active":         True,
        }).eq("id", user_row.data[0]["id"]).execute()

    send_welcome_email(data.name, data.email, password, role="teacher")
    logger.info(f"✅ Professor criado: id={user_row.data[0]['id'] if user_row.data else 'unknown'} | {institution_name}")
    return {
        "message": "Professor criado com sucesso",
        "email": data.email,
        "temporary_password": password,
        "institution": institution_name,
    }


@router.post("/users/students/bulk", status_code=201)
def create_students_bulk(data: BulkCreateStudentsRequest, payload=Depends(verify_admin)):
    """Cria múltiplos alunos de uma vez para uma instituição."""
    sb = get_supabase_client()
    institution_name = _get_institution_name(sb, data.institution_id) if data.institution_id else None
    institution_fields = {"institution": institution_name, "institution_id": data.institution_id} if institution_name else {}
    results = []

    for student in data.students:
        password = student.password or _generate_password()
        # Plano: usa o user_type do lote se definido, senão o individual
        effective_type = data.user_type if data.user_type != "free" else student.user_type

        if data.skip_email_confirmation:
            # Usa Admin API para criar sem precisar confirmar email
            try:
                res = sb.auth.admin.create_user({
                    "email": student.email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"name": student.name},
                })
                if not res.user:
                    results.append({"email": student.email, "status": "erro: falha na criação", "temporary_password": None})
                    continue
                user_id = res.user.id
            except Exception as e:
                msg = str(e).lower()
                if "already exists" in msg or "already registered" in msg or "already been registered" in msg or "duplicate" in msg:
                    existing = sb.table("users").select("id").eq("email", student.email).execute()
                    if existing.data:
                        sb.table("users").update({
                            "name":      student.name,
                            "user_type": effective_type,
                            **institution_fields,
                        }).eq("id", existing.data[0]["id"]).execute()
                        results.append({"email": student.email, "status": "atualizado", "temporary_password": None})
                    else:
                        results.append({"email": student.email, "status": "já existe", "temporary_password": None})
                else:
                    results.append({"email": student.email, "status": f"erro: {str(e)[:80]}", "temporary_password": None})
                continue

            get_or_create_user(student.email, student.name, user_id, "student")
            sb.table("users").update({
                "active":    True,
                "user_type": effective_type,
                **institution_fields,
            }).eq("id", user_id).execute()
        else:
            result, _token = signup(student.name, student.email, password, role="student")
            if result == "EMAIL_EXISTS":
                existing = sb.table("users").select("id").eq("email", student.email).execute()
                if existing.data:
                    sb.table("users").update({
                        "name":      student.name,
                        "user_type": effective_type,
                        **institution_fields,
                    }).eq("id", existing.data[0]["id"]).execute()
                    results.append({"email": student.email, "status": "atualizado", "temporary_password": None})
                else:
                    results.append({"email": student.email, "status": "já existe", "temporary_password": None})
                continue
            if result in ("RATE_LIMIT", "INVALID_EMAIL", None):
                results.append({"email": student.email, "status": f"erro: {result}", "temporary_password": None})
                continue

            user_row = sb.table("users").select("id").eq("email", student.email).execute()
            if user_row.data:
                sb.table("users").update({
                    "active":    True,
                    "user_type": effective_type,
                    **institution_fields,
                }).eq("id", user_row.data[0]["id"]).execute()

        results.append({"email": student.email, "status": "criado", "temporary_password": password})
        send_welcome_email(student.name, student.email, password, role="student")
        logger.info(f"✅ Aluno criado | {institution_name or 'sem instituição'} | plano={effective_type} | conf_skip={data.skip_email_confirmation}")

    return {"institution": institution_name or "", "results": results}


@router.post("/users/teachers/bulk", status_code=201)
def create_teachers_bulk(data: BulkCreateTeachersRequest, payload=Depends(verify_admin)):
    """Cria múltiplos professores de uma vez para uma instituição."""
    sb = get_supabase_client()
    institution_name = _get_institution_name(sb, data.institution_id)
    results = []

    for teacher in data.teachers:
        password = teacher.password or _generate_password()

        if data.skip_email_confirmation:
            try:
                res = sb.auth.admin.create_user({
                    "email": teacher.email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"name": teacher.name},
                })
                if not res.user:
                    results.append({"email": teacher.email, "status": "erro: falha na criação", "temporary_password": None})
                    continue
                user_id = res.user.id
            except Exception as e:
                msg = str(e).lower()
                if "already exists" in msg or "already registered" in msg or "already been registered" in msg or "duplicate" in msg:
                    existing = sb.table("users").select("id").eq("email", teacher.email).execute()
                    if existing.data:
                        sb.table("users").update({
                            "name":           teacher.name,
                            "institution":    institution_name,
                            "institution_id": data.institution_id,
                        }).eq("id", existing.data[0]["id"]).execute()
                        results.append({"email": teacher.email, "status": "atualizado", "temporary_password": None})
                    else:
                        results.append({"email": teacher.email, "status": "já existe", "temporary_password": None})
                else:
                    results.append({"email": teacher.email, "status": f"erro: {str(e)[:80]}", "temporary_password": None})
                continue

            get_or_create_user(teacher.email, teacher.name, user_id, "teacher")
            sb.table("users").update({
                "institution":    institution_name,
                "institution_id": data.institution_id,
                "active":         True,
            }).eq("id", user_id).execute()
        else:
            result, _token = signup(teacher.name, teacher.email, password, role="teacher")
            if result == "EMAIL_EXISTS":
                existing = sb.table("users").select("id").eq("email", teacher.email).execute()
                if existing.data:
                    sb.table("users").update({
                        "name":           teacher.name,
                        "institution":    institution_name,
                        "institution_id": data.institution_id,
                    }).eq("id", existing.data[0]["id"]).execute()
                    results.append({"email": teacher.email, "status": "atualizado", "temporary_password": None})
                else:
                    results.append({"email": teacher.email, "status": "já existe", "temporary_password": None})
                continue
            if result in ("RATE_LIMIT", "INVALID_EMAIL", None):
                results.append({"email": teacher.email, "status": f"erro: {result}", "temporary_password": None})
                continue

            user_row = sb.table("users").select("id").eq("email", teacher.email).execute()
            if user_row.data:
                sb.table("users").update({
                    "institution":    institution_name,
                    "institution_id": data.institution_id,
                    "active":         True,
                }).eq("id", user_row.data[0]["id"]).execute()

        results.append({"email": teacher.email, "status": "criado", "temporary_password": password})
        send_welcome_email(teacher.name, teacher.email, password, role="teacher")
        logger.info(f"✅ Professor criado (bulk) | {institution_name} | conf_skip={data.skip_email_confirmation}")

    return {"institution": institution_name, "results": results}


@router.patch("/users/{user_id}/status")
def toggle_user_status(user_id: str, data: ToggleUserStatusRequest, payload=Depends(verify_admin)):
    """Ativa ou desativa uma conta de usuário."""
    validate_uuid(user_id, "user_id")
    caller_id = payload.get("sub")
    if user_id == caller_id:
        raise HTTPException(status_code=400, detail="Você não pode alterar o status da sua própria conta")
    sb = get_supabase_client()
    # Impede alterar status de outros admins
    target = sb.table("users").select("role").eq("id", user_id).execute()
    if not target.data:
        raise http_error(404, "user_not_found", "Usuário não encontrado")
    if target.data[0].get("role") == "admin":
        raise HTTPException(status_code=403, detail="Não é possível alterar o status de outro administrador")
    result = sb.table("users").update({"active": data.active}).eq("id", user_id).execute()
    if not result.data:
        raise http_error(404, "user_not_found", "Usuário não encontrado")
    status_label = "ativado" if data.active else "desativado"
    logger.info(f"✅ Usuário {user_id} {status_label}")
    return {"message": f"Usuário {status_label} com sucesso", "active": data.active}


@router.delete("/users/{user_id}")
def delete_user(user_id: str, payload=Depends(verify_admin)):
    """Remove permanentemente um usuário de public.users e auth.users."""
    validate_uuid(user_id, "user_id")
    caller_id = payload.get("sub")
    if user_id == caller_id:
        raise HTTPException(status_code=400, detail="Você não pode excluir sua própria conta")

    sb = get_supabase_client()

    # Busca dados do usuário antes de deletar
    user_res = sb.table("users").select("id, name, email, role").eq("id", user_id).execute()
    if not user_res.data:
        raise http_error(404, "user_not_found", "Usuário não encontrado")

    target = user_res.data[0]
    if target.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Não é possível excluir uma conta de administrador")

    # 1. Deleta de public.users (cascade via FK deleta dados vinculados conforme regras do banco)
    sb.table("users").delete().eq("id", user_id).execute()

    # 2. Deleta de auth.users via Admin API (service_role)
    try:
        sb.auth.admin.delete_user(user_id)
    except Exception as e:
        # Não falha se o usuário já não existia no auth (pode ter sido criado só no public)
        logger.warning(f"⚠️  Falha ao excluir {user_id} de auth.users: {e}")

    logger.info(f"🗑️  Usuário {user_id} excluído permanentemente por admin {caller_id}")
    return {"message": f"Usuário {target['name']} excluído permanentemente", "deleted_email": target['email']}


@router.post("/users/{user_id}/reset-daily-quota")
def reset_daily_quota(user_id: str, payload=Depends(verify_admin)):
    """
    Admin reseta a cota diária de um aluno deletando as tentativas
    in_progress e abandoned de hoje. Tentativas concluídas (com score) são preservadas.
    """
    validate_uuid(user_id, "user_id")
    sb = get_supabase_client()

    user_res = sb.table("users").select("id, name, role").eq("id", user_id).execute()
    if not user_res.data:
        raise http_error(404, "user_not_found", "Usuário não encontrado")

    user_data = user_res.data[0]

    today_start = datetime.now(UTC).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    # Busca tentativas não-concluídas de hoje
    attempts_res = sb.table("case_attempts") \
        .select("id, status") \
        .eq("student_id", user_id) \
        .gte("started_at", today_start) \
        .in_("status", ["in_progress", "abandoned"]) \
        .execute()

    deleted_count = 0
    if attempts_res.data:
        attempt_ids = [a["id"] for a in attempts_res.data]
        sb.table("case_attempts").delete().in_("id", attempt_ids).execute()
        deleted_count = len(attempt_ids)

    logger.info(
        f"✅ Admin resetou cota de {user_data['name']} ({user_id}): "
        f"{deleted_count} tentativa(s) removida(s)"
    )
    return {
        "message": f"Cota resetada: {deleted_count} tentativa(s) removida(s)",
        "deleted_count": deleted_count,
        "user_name": user_data["name"],
    }


@router.get("/classes")
def list_all_classes(payload=Depends(verify_admin)):
    """Lista todas as turmas de todos os professores para o painel admin."""
    sb = get_supabase_client()

    classes_res = sb.table("classes").select("*").order("created_at", desc=True).execute()
    classes = classes_res.data or []
    if not classes:
        return []

    teacher_ids = list({c["teacher_id"] for c in classes})
    teachers_res = sb.table("users").select("id, name, email").in_("id", teacher_ids).execute()
    teacher_map = {u["id"]: u for u in (teachers_res.data or [])}

    class_ids = [c["id"] for c in classes]

    students_res = sb.table("class_students").select("class_id").in_("class_id", class_ids).execute()
    student_count: dict = {}
    for row in (students_res.data or []):
        cid = row["class_id"]
        student_count[cid] = student_count.get(cid, 0) + 1

    assignments_res = sb.table("case_assignments").select("class_id").in_("class_id", class_ids).execute()
    case_count: dict = {}
    for row in (assignments_res.data or []):
        cid = row["class_id"]
        case_count[cid] = case_count.get(cid, 0) + 1

    result = []
    for cls in classes:
        teacher = teacher_map.get(cls["teacher_id"], {})
        result.append({
            "id":             cls["id"],
            "name":           cls["name"],
            "code":           cls["code"],
            "term":           cls.get("term"),
            "status":         cls.get("status", "active"),
            "open_join":      cls.get("open_join", True),
            "created_at":     cls.get("created_at"),
            "teacher_name":   teacher.get("name", "—"),
            "teacher_email":  teacher.get("email", ""),
            "students_count": student_count.get(cls["id"], 0),
            "cases_count":    case_count.get(cls["id"], 0),
        })
    return result


@router.get("/classes/{class_id}")
def get_admin_class_detail(class_id: str, payload=Depends(verify_admin)):
    validate_uuid(class_id, "class_id")
    """Detalhes completos de uma turma: professores, alunos e casos atribuídos."""
    sb = get_supabase_client()

    cls_res = sb.table("classes").select("*").eq("id", class_id).execute()
    if not cls_res.data:
        raise http_error(404, "class_not_found", "Turma não encontrada")
    cls = cls_res.data[0]

    # Professor titular
    owner_res = sb.table("users").select("id, name, email").eq("id", cls["teacher_id"]).execute()
    teachers = []
    if owner_res.data:
        t = owner_res.data[0]
        teachers.append({"id": t["id"], "name": t["name"], "email": t["email"], "is_owner": True})

    # Professores compartilhados (separate queries to avoid FK-join naming issues)
    shared_res = sb.table("class_teachers") \
        .select("teacher_id") \
        .eq("class_id", class_id) \
        .execute()
    for row in (shared_res.data or []):
        tid = row["teacher_id"]
        if tid == cls["teacher_id"]:
            continue
        u_res = sb.table("users").select("id, name, email").eq("id", tid).execute()
        if u_res.data:
            u = u_res.data[0]
            teachers.append({"id": u["id"], "name": u["name"], "email": u["email"], "is_owner": False})

    # Alunos
    students_res = sb.table("class_students") \
        .select("student_id, joined_at") \
        .eq("class_id", class_id) \
        .execute()
    students = []
    for row in (students_res.data or []):
        sid = row["student_id"]
        u_res = sb.table("users").select("id, name, email").eq("id", sid).execute()
        if u_res.data:
            u = u_res.data[0]
            students.append({"id": u["id"], "name": u.get("name", ""), "email": u.get("email", ""), "joined_at": row.get("joined_at")})

    # Casos atribuídos
    assignments_res = sb.table("case_assignments") \
        .select("case_id, due_date") \
        .eq("class_id", class_id) \
        .execute()
    cases = []
    for row in (assignments_res.data or []):
        cid = row["case_id"]
        c_res = sb.table("cases").select("id, title, specialty, difficulty, published").eq("id", cid).execute()
        if c_res.data:
            c = c_res.data[0]
            cases.append({
                "id":        c["id"],
                "title":     c["title"],
                "specialty": c.get("specialty"),
                "difficulty": c.get("difficulty", "Intermediário"),
                "published": c.get("published", False),
                "due_date":  row.get("due_date"),
            })

    return {"teachers": teachers, "students": students, "cases": cases}


@router.delete("/cases/{case_id}")
def delete_admin_free_case(case_id: str, payload=Depends(verify_admin)):
    validate_uuid(case_id, "case_id")
    """Admin pode deletar qualquer caso criado por um admin (casos gratuitos)."""
    sb = get_supabase_client()

    case = sb.table("cases").select("id, teacher_id").eq("id", case_id).execute()
    if not case.data:
        raise http_error(404, "case_not_found", "Caso não encontrado")

    owner = sb.table("users").select("role").eq("id", case.data[0]["teacher_id"]).execute()
    if not owner.data or owner.data[0].get("role") != "admin":
        raise HTTPException(status_code=403, detail="Só é possível deletar casos gratuitos (criados por admin) por aqui")

    sb.table("cases").delete().eq("id", case_id).execute()
    logger.info(f"✅ Caso gratuito {case_id} deletado pelo admin {payload.get('sub')}")
    return {"message": "Caso removido com sucesso"}


# ─── GPT Settings ─────────────────────────────────────────────────────────────

# Default values (used when no row exists in platform_settings)
_GPT_DEFAULTS = {
    "gpt_max_tokens": 600,
    "gpt_max_turns": 30,
    "gpt_daily_message_limit": 100,
}

class GptSettingsUpdate(BaseModel):
    gpt_max_tokens: int | None = Field(None, ge=100, le=4000)
    gpt_max_turns: int | None = Field(None, ge=5, le=200)
    gpt_daily_message_limit: int | None = Field(None, ge=1, le=500)


def _read_settings(sb, defaults: dict) -> dict:
    """Lê várias chaves de platform_settings numa única query; usa defaults para o que faltar."""
    settings = dict(defaults)
    try:
        res = sb.table("platform_settings").select("key, value").in_("key", list(defaults)).execute()
        for row in (res.data or []):
            key = row["key"]
            try:
                settings[key] = type(defaults[key])(row["value"])
            except (KeyError, TypeError, ValueError):
                pass
    except Exception:
        pass
    return settings


def _write_setting(sb, key: str, value) -> None:
    sb.table("platform_settings").upsert(
        {"key": key, "value": str(value)}, on_conflict="key"
    ).execute()


@router.get("/gpt-settings")
def get_gpt_settings(payload=Depends(verify_admin)):
    """Retorna as configurações atuais de controle do GPT."""
    sb = get_supabase_client()
    return {**_read_settings(sb, _GPT_DEFAULTS), "defaults": _GPT_DEFAULTS}


@router.put("/gpt-settings")
def update_gpt_settings(data: GptSettingsUpdate, payload=Depends(verify_admin)):
    """Atualiza as configurações de controle do GPT."""
    sb = get_supabase_client()
    updated = {}
    if data.gpt_max_tokens is not None:
        _write_setting(sb, "gpt_max_tokens", data.gpt_max_tokens)
        updated["gpt_max_tokens"] = data.gpt_max_tokens
    if data.gpt_max_turns is not None:
        _write_setting(sb, "gpt_max_turns", data.gpt_max_turns)
        updated["gpt_max_turns"] = data.gpt_max_turns
    if data.gpt_daily_message_limit is not None:
        _write_setting(sb, "gpt_daily_message_limit", data.gpt_daily_message_limit)
        updated["gpt_daily_message_limit"] = data.gpt_daily_message_limit
    if updated:
        # invalida o cache de 60s do openai_service para o novo valor valer já
        from app.services import openai_service as oai
        oai._settings_cache.clear()
    logger.info(f"✅ GPT settings atualizadas pelo admin {payload.get('sub')}: {updated}")
    return {"message": "Configurações salvas", "updated": updated}


@router.get("/gpt-info")
def get_gpt_info(payload=Depends(verify_admin)):
    """Retorna modelo ativo e status do Langfuse."""
    from app.services import openai_service as oai
    langfuse_active = oai._langfuse is not None
    return {
        "model": oai.DEFAULT_MODEL,
        "eval_model": oai.EVAL_MODEL,
        "vector_store_configured": bool(oai.VECTOR_STORE_ID),
        "langfuse_active": langfuse_active,
        "langfuse_host": os.getenv("LANGFUSE_BASE_URL") or os.getenv("LANGFUSE_HOST") or "https://cloud.langfuse.com",
    }


@router.get("/gpt-usage")
def get_gpt_usage(payload=Depends(verify_admin)):
    """
    Retorna o uso de tokens GPT dos últimos 30 dias.
    Tenta a OpenAI Usage API v2 (range nativo). Se falhar ou retornar zeros,
    estima tokens a partir das mensagens salvas no banco de dados.
    """
    import httpx

    today = datetime.now(UTC).date()
    start = today - timedelta(days=30)
    start_ts = int(datetime(start.year, start.month, start.day, tzinfo=UTC).timestamp())
    end_ts = int(datetime(today.year, today.month, today.day, 23, 59, 59, tzinfo=UTC).timestamp())

    api_key = os.getenv("OPENAI_API_KEY", "")

    # ── 1. Tenta OpenAI Usage API v2 (suporta range, uma única requisição) ──
    if api_key:
        try:
            resp = httpx.get(
                "https://api.openai.com/v1/organization/usage/completions",
                params={"start_time": start_ts, "end_time": end_ts, "bucket_width": "1d", "limit": 31},
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10,
            )
            if resp.status_code == 200:
                raw = resp.json()
                total_prompt = 0
                total_completion = 0
                for bucket in raw.get("data", []):
                    for result in bucket.get("results", []):
                        total_prompt += result.get("input_tokens", 0)
                        total_completion += result.get("output_tokens", 0)
                if total_prompt > 0 or total_completion > 0:
                    return {
                        "period_start": start.isoformat(),
                        "period_end": today.isoformat(),
                        "total_prompt_tokens": total_prompt,
                        "total_completion_tokens": total_completion,
                        "total_tokens": total_prompt + total_completion,
                        "source": "openai_usage_api",
                    }
            else:
                logger.warning(f"[GPT Usage] OpenAI v2 retornou {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.warning(f"[GPT Usage] OpenAI v2 API falhou: {e}")

    # ── 2. Fallback: estimativa a partir das mensagens salvas no banco ──
    # ~3.5 caracteres por token para português (estimativa conservadora)
    sb = get_supabase_client()
    try:
        start_iso = datetime(start.year, start.month, start.day, tzinfo=UTC).isoformat()
        res = sb.table("messages").select("role, content").gte("timestamp", start_iso).execute()
        rows = res.data or []
        prompt_chars = sum(
            len(r.get("content") or "")
            for r in rows if r.get("role") in ("user", "system")
        )
        completion_chars = sum(
            len(r.get("content") or "")
            for r in rows if r.get("role") == "assistant"
        )
        prompt_tokens = int(prompt_chars / 3.5)
        completion_tokens = int(completion_chars / 3.5)
        return {
            "period_start": start.isoformat(),
            "period_end": today.isoformat(),
            "total_prompt_tokens": prompt_tokens,
            "total_completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "source": "db_estimate",
        }
    except Exception as e:
        logger.error(f"[GPT Usage] DB fallback falhou: {e}")
        return {
            "period_start": start.isoformat(),
            "period_end": today.isoformat(),
            "total_tokens": None,
            "source": "error",
            "detail": str(e),
        }


@router.get("/gpt-balance")
def get_gpt_balance(payload=Depends(verify_admin)):
    """
    Retorna o saldo/créditos da conta OpenAI.
    Tenta credit_grants (créditos pré-pagos/trial) e depois subscription (pay-per-use).
    """
    import httpx
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY não configurada")

    headers = {"Authorization": f"Bearer {api_key}"}

    # ── 1. Créditos pré-pagos / trial ──────────────────────────────────────
    try:
        resp = httpx.get(
            "https://api.openai.com/v1/dashboard/billing/credit_grants",
            headers=headers,
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            grants = data.get("grants", {}).get("data", [])
            expires_at = None
            if grants:
                expires_ts = grants[0].get("expires_at")
                if expires_ts:
                    expires_at = datetime.fromtimestamp(expires_ts, tz=UTC).isoformat()
            return {
                "has_credits": True,
                "total_granted": data.get("total_granted"),
                "total_used": data.get("total_used"),
                "total_available": data.get("total_available"),
                "credits_expire_at": expires_at,
                "source": "credit_grants",
            }
        logger.warning(f"[GPT Balance] credit_grants retornou {resp.status_code}")
    except Exception as e:
        logger.warning(f"[GPT Balance] credit_grants falhou: {e}")

    # ── 2. Subscription (pay-per-use com cartão) ────────────────────────────
    try:
        resp = httpx.get(
            "https://api.openai.com/v1/dashboard/billing/subscription",
            headers=headers,
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            return {
                "has_credits": False,
                "has_payment_method": data.get("has_payment_method", False),
                "hard_limit_usd": data.get("hard_limit_usd") or data.get("hard_limit"),
                "soft_limit_usd": data.get("soft_limit_usd") or data.get("soft_limit"),
                "source": "subscription",
            }
        logger.warning(f"[GPT Balance] subscription retornou {resp.status_code}")
    except Exception as e:
        logger.warning(f"[GPT Balance] subscription falhou: {e}")

    return {
        "has_credits": False,
        "source": "unavailable",
        "detail": "Verifique em platform.openai.com/settings/organization/billing",
    }


@router.get("/conversation-stats")
def get_conversation_stats(payload=Depends(verify_admin)):
    """Estatísticas de mensagens por conversa para monitorar consumo."""
    sb = get_supabase_client()
    try:
        res = sb.table("messages") \
            .select("conversation_id, role") \
            .execute()
        counts: dict = {}
        for row in (res.data or []):
            cid = row["conversation_id"]
            counts[cid] = counts.get(cid, 0) + 1

        total_msgs = sum(counts.values())
        total_convos = len(counts)
        avg = round(total_msgs / total_convos, 1) if total_convos > 0 else 0
        over_limit = sum(1 for v in counts.values() if v > 60)

        return {
            "total_conversations": total_convos,
            "total_messages": total_msgs,
            "avg_messages_per_conversation": avg,
            "conversations_over_60_messages": over_limit,
        }
    except Exception as e:
        logger.error(f"[ConvStats] {e}")
        return {"total_conversations": 0, "total_messages": 0, "avg_messages_per_conversation": 0, "conversations_over_60_messages": 0}


@router.post("/data-retention/cleanup")
def run_data_retention(payload=Depends(verify_admin)):
    """
    LGPD Art. 15 & 16 — Executa limpeza de dados antigos (>90 dias).
    Anonimiza conteúdo de mensagens preservando metadados para estatísticas.
    """
    from app.services.retention_service import cleanup_old_messages
    result = cleanup_old_messages()
    return {"message": "Política de retenção executada", **result}

