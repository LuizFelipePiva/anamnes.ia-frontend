"""
Rotas para gerenciamento de Turmas (Classes).
"""
import random
import string

from fastapi import APIRouter, Depends, HTTPException

from app.auth.guards import verify_teacher
from app.auth.security import validate_uuid, verify_jwt_token
from app.config import logger
from app.db.supabase import get_supabase_client
from app.errors import http_error
from app.models.schemas import (
    ClassCreate,
    ClassResponse,
    ClassUpdate,
    ClassWithStudents,
    JoinClassResponse,
)

router = APIRouter(prefix="/classes", tags=["classes"])


def _generate_code(length: int = 6) -> str:
    """Gera código aleatório para turma (ex: A3K9M2)."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))


def _check_access(class_id: str, teacher_id: str, sb, require_owner: bool = False) -> tuple[dict, bool]:
    """
    Verifica se o professor tem acesso à turma.
    Retorna (class_data, is_owner).
    Se require_owner=True, lança 403 se não for dono.
    """
    result = sb.table("classes").select("*").eq("id", class_id).execute()
    if not result.data:
        raise http_error(404, "class_not_found", "Turma não encontrada")

    cls = result.data[0]
    is_owner = cls["teacher_id"] == teacher_id

    if require_owner and not is_owner:
        raise HTTPException(status_code=403, detail="Apenas o dono da turma pode fazer isso")

    if not is_owner:
        shared = sb.table("class_teachers") \
            .select("teacher_id") \
            .eq("class_id", class_id) \
            .eq("teacher_id", teacher_id) \
            .execute()
        if not shared.data:
            raise http_error(403, "access_denied", "Acesso negado")

    return cls, is_owner


# ── POST /api/classes ── Criar turma ──────────────────────
@router.post("", response_model=ClassResponse)
def create_class(data: ClassCreate, payload=Depends(verify_teacher)):
    """
    Cria uma nova turma para o professor autenticado.
    Gera automaticamente um código único de convite.
    """
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    # Gera código único
    code = _generate_code()
    while sb.table("classes").select("id").eq("code", code).execute().data:
        code = _generate_code()

    new_class = sb.table("classes").insert({
        "teacher_id": teacher_id,
        "name": data.name,
        "code": code,
        "term": data.term,
        "open_join": data.open_join,
        "goal": data.goal,
    }).execute()

    if not new_class.data:
        raise HTTPException(status_code=500, detail="Erro ao criar turma")

    logger.info(f"[Classes] Turma criada: {data.name} (code={code}) por teacher={teacher_id}")
    return new_class.data[0]


# ── GET /api/classes ── Listar turmas do professor ────────
@router.get("", response_model=list[ClassResponse])
def list_classes(payload=Depends(verify_teacher)):
    """Lista todas as turmas do professor autenticado (próprias + compartilhadas)."""
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    # Turmas próprias
    own_result = sb.table("classes").select("*").eq("teacher_id", teacher_id).execute()
    own = own_result.data or []
    own_ids = {c["id"] for c in own}

    # Turmas compartilhadas
    shared_rows = sb.table("class_teachers").select("class_id").eq("teacher_id", teacher_id).execute()
    shared_ids = [r["class_id"] for r in (shared_rows.data or []) if r["class_id"] not in own_ids]

    shared = []
    if shared_ids:
        shared_result = sb.table("classes").select("*").in_("id", shared_ids).execute()
        shared = shared_result.data or []

    all_classes = own + shared
    all_classes.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return all_classes


# ── GET /api/classes/{id} ── Detalhes + alunos ───────────
@router.get("/{class_id}", response_model=ClassWithStudents)
def get_class_detail(class_id: str, payload=Depends(verify_teacher)):
    """Retorna detalhes da turma com lista de alunos."""
    validate_uuid(class_id, "class_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    class_data, _ = _check_access(class_id, teacher_id, sb)

    # Busca alunos vinculados
    students_result = sb.table("class_students") \
        .select("student_id, joined_at, users(id, name, email)") \
        .eq("class_id", class_id) \
        .execute()

    students = []
    for row in (students_result.data or []):
        user_data = row.get("users", {})
        if user_data:
            students.append({
                "id": user_data.get("id"),
                "name": user_data.get("name"),
                "email": user_data.get("email"),
                "joined_at": row.get("joined_at"),
            })

    class_data["students"] = students
    class_data["students_count"] = len(students)
    return class_data


# ── PATCH /api/classes/{id} ── Atualizar turma ───────────
@router.patch("/{class_id}", response_model=ClassResponse)
def update_class(class_id: str, data: ClassUpdate, payload=Depends(verify_teacher)):
    """Atualiza dados de uma turma. Acessível ao dono e professores compartilhados."""
    validate_uuid(class_id, "class_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    _check_access(class_id, teacher_id, sb)

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    result = sb.table("classes").update(update_data).eq("id", class_id).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Erro ao atualizar turma")

    return result.data[0]


# ── POST /api/classes/{code}/join ── Aluno entra via código
@router.post("/{code}/join", response_model=JoinClassResponse)
def join_class(code: str, payload=Depends(verify_jwt_token)):
    """Aluno entra numa turma usando o código de convite."""
    student_id = payload.get("sub")
    sb = get_supabase_client()

    # Busca turma pelo código
    result = sb.table("classes").select("*").eq("code", code.upper()).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Código de turma inválido")

    class_data = result.data[0]

    if class_data["status"] != "active":
        raise HTTPException(status_code=400, detail="Esta turma está arquivada")

    if not class_data.get("open_join", True):
        raise HTTPException(status_code=403, detail="Esta turma não aceita novos alunos")

    # Verifica se já está na turma
    existing = sb.table("class_students") \
        .select("id") \
        .eq("class_id", class_data["id"]) \
        .eq("student_id", student_id) \
        .execute()

    if existing.data:
        raise http_error(409, "already_enrolled", "Você já está nesta turma")

    # Insere vínculo
    sb.table("class_students").insert({
        "class_id": class_data["id"],
        "student_id": student_id,
    }).execute()

    logger.info(f"[Classes] Aluno {student_id} entrou na turma {class_data['name']} (code={code})")
    return {
        "message": "Entrou na turma com sucesso",
        "class_name": class_data["name"],
        "class_id": class_data["id"],
    }


# ── DELETE /api/classes/{id} ── Excluir turma ─────────────
@router.delete("/{class_id}")
def delete_class(class_id: str, payload=Depends(verify_teacher)):
    """Exclui uma turma e todos os vínculos. Apenas o dono pode excluir."""
    validate_uuid(class_id, "class_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    _check_access(class_id, teacher_id, sb, require_owner=True)

    # Remove vínculos de compartilhamento
    sb.table("class_teachers").delete().eq("class_id", class_id).execute()
    # Remove vínculos de alunos primeiro
    sb.table("class_students").delete().eq("class_id", class_id).execute()
    # Remove assignments de casos
    sb.table("case_assignments").delete().eq("class_id", class_id).execute()
    # Remove a turma
    sb.table("classes").delete().eq("id", class_id).execute()

    logger.info(f"[Classes] Turma {class_id} excluída por teacher={teacher_id}")
    return {"message": "Turma excluída com sucesso"}


# ── DELETE /api/classes/{id}/students/{student_id} ── Remover aluno
@router.delete("/{class_id}/students/{student_id}")
def remove_student(class_id: str, student_id: str, payload=Depends(verify_teacher)):
    """Remove um aluno de uma turma."""
    validate_uuid(class_id, "class_id")
    validate_uuid(student_id, "student_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    _check_access(class_id, teacher_id, sb)

    result = sb.table("class_students") \
        .delete() \
        .eq("class_id", class_id) \
        .eq("student_id", student_id) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Aluno não encontrado nesta turma")

    logger.info(f"[Classes] Aluno {student_id} removido da turma {class_id}")
    return {"message": "Aluno removido com sucesso"}


# ── GET /api/classes/{id}/teachers ── Listar professores compartilhados ──
@router.get("/{class_id}/teachers")
def list_class_teachers(class_id: str, payload=Depends(verify_teacher)):
    """Retorna o dono + professores com quem a turma foi compartilhada."""
    validate_uuid(class_id, "class_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    cls, is_owner = _check_access(class_id, teacher_id, sb)

    # Dono da turma
    owner_result = sb.table("users").select("id, name, email").eq("id", cls["teacher_id"]).execute()
    owner_data = owner_result.data[0] if owner_result.data else {"id": cls["teacher_id"], "name": "Desconhecido", "email": ""}
    owner_data["is_owner"] = True
    teachers = [owner_data]

    # Compartilhados
    shared_rows = sb.table("class_teachers").select("teacher_id, added_at").eq("class_id", class_id).execute()
    if shared_rows.data:
        for row in shared_rows.data:
            tid = row["teacher_id"]
            user_res = sb.table("users").select("id, name, email").eq("id", tid).execute()
            if user_res.data:
                entry = user_res.data[0]
                entry["is_owner"] = False
                entry["added_at"] = row.get("added_at")
                teachers.append(entry)

    return {"teachers": teachers, "is_owner": is_owner}


# ── GET /api/classes/{id}/institution-teachers ── Professores da mesma instituição ──
@router.get("/{class_id}/institution-teachers")
def list_institution_teachers(class_id: str, payload=Depends(verify_teacher)):
    """
    Lista professores da mesma instituição que ainda não têm acesso à turma.
    Apenas o dono pode gerenciar compartilhamento.
    """
    validate_uuid(class_id, "class_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    cls, _ = _check_access(class_id, teacher_id, sb, require_owner=True)

    # Descobre institution_id do dono
    owner_res = sb.table("users").select("institution_id, institution").eq("id", teacher_id).execute()
    if not owner_res.data:
        return {"teachers": []}

    owner_data = owner_res.data[0]
    institution_id = owner_data.get("institution_id")
    institution_str = owner_data.get("institution")

    if not institution_id and not institution_str:
        return {"teachers": []}

    # Busca professores da mesma instituição pela FK (com fallback para string)
    if institution_id:
        inst_res = sb.table("users") \
            .select("id, name, email") \
            .eq("institution_id", institution_id) \
            .eq("role", "teacher") \
            .neq("id", teacher_id) \
            .execute()
    else:
        inst_res = sb.table("users") \
            .select("id, name, email") \
            .eq("institution", institution_str) \
            .eq("role", "teacher") \
            .neq("id", teacher_id) \
            .execute()

    if not inst_res.data:
        return {"teachers": []}

    # Filtra quem já tem acesso (shared)
    already = sb.table("class_teachers").select("teacher_id").eq("class_id", class_id).execute()
    already_ids = {r["teacher_id"] for r in (already.data or [])}
    already_ids.add(cls["teacher_id"])  # exclui o próprio dono

    available = [t for t in inst_res.data if t["id"] not in already_ids]
    return {"teachers": available}


# ── POST /api/classes/{id}/share/{tid} ── Compartilhar turma ──────────────
@router.post("/{class_id}/share/{target_teacher_id}")
def share_class(class_id: str, target_teacher_id: str, payload=Depends(verify_teacher)):
    """Compartilha a turma com outro professor. Apenas o dono pode fazer isso."""
    validate_uuid(class_id, "class_id")
    validate_uuid(target_teacher_id, "target_teacher_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    _check_access(class_id, teacher_id, sb, require_owner=True)

    if target_teacher_id == teacher_id:
        raise HTTPException(status_code=400, detail="Você já é o dono desta turma")

    # Verifica se já compartilhado
    existing = sb.table("class_teachers") \
        .select("teacher_id") \
        .eq("class_id", class_id) \
        .eq("teacher_id", target_teacher_id) \
        .execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Professor já tem acesso a esta turma")

    sb.table("class_teachers").insert({
        "class_id": class_id,
        "teacher_id": target_teacher_id,
    }).execute()

    logger.info(f"[Classes] Turma {class_id} compartilhada com teacher={target_teacher_id} por owner={teacher_id}")
    return {"message": "Turma compartilhada com sucesso"}


# ── DELETE /api/classes/{id}/share/{tid} ── Remover acesso compartilhado ──
@router.delete("/{class_id}/share/{target_teacher_id}")
def unshare_class(class_id: str, target_teacher_id: str, payload=Depends(verify_teacher)):
    """Remove o acesso de um professor compartilhado. Apenas o dono pode fazer isso."""
    validate_uuid(class_id, "class_id")
    validate_uuid(target_teacher_id, "target_teacher_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    _check_access(class_id, teacher_id, sb, require_owner=True)

    result = sb.table("class_teachers") \
        .delete() \
        .eq("class_id", class_id) \
        .eq("teacher_id", target_teacher_id) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Professor não tem acesso a esta turma")

    logger.info(f"[Classes] Acesso de teacher={target_teacher_id} removido da turma {class_id} por owner={teacher_id}")
    return {"message": "Acesso removido com sucesso"}