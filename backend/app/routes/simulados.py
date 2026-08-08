"""
Rotas de Simulados.

Aluno:
  GET  /simulados                  — lista simulados disponíveis
  POST /simulados                  — cria simulado livre (aluno) ou atribuído (professor)
  GET  /simulados/{id}             — detalhe do cabeçalho
  POST /simulados/{id}/start       — inicia tentativa → retorna questões sem gabarito
  POST /simulados/{id}/attempts/{attempt_id}/answer  — registra resposta de uma questão
  POST /simulados/{id}/attempts/{attempt_id}/finish  — finaliza e retorna relatório
  GET  /simulados/{id}/attempts/{attempt_id}/report  — busca relatório de tentativa já finalizada
  GET  /simulados/my-attempts      — histórico de tentativas do aluno autenticado

Professor/Admin:
  DELETE /simulados/{id}           — remove simulado próprio (admin remove qualquer um)
  GET    /simulados/{id}/attempts  — lista tentativas de alunos num simulado
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from supabase import Client

from app.auth.security import validate_uuid, verify_jwt_token
from app.db.supabase import get_supabase_client
from app.models.schemas import (
    SimuladoAnswerRequest,
    SimuladoAnswerResponse,
    SimuladoAttemptStart,
    SimuladoAttemptSummary,
    SimuladoCreate,
    SimuladoPublic,
    SimuladoReport,
)
from app.services import simulado_service

router = APIRouter(prefix="/simulados", tags=["simulados"])
limiter = Limiter(key_func=get_remote_address)

# Limite máximo realista para tempo gasto (24h em segundos)
_MAX_TIME_SPENT = 86_400


def _current_user(token: dict = Depends(verify_jwt_token)) -> dict:
    return token


def _require_teacher_or_admin(user: dict = Depends(_current_user)) -> dict:
    if user.get("role") not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Acesso restrito a professores e administradores")
    return user


# ── Listagem ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[SimuladoPublic])
def list_simulados(
    user: dict = Depends(_current_user),
    sb: Client = Depends(get_supabase_client),
):
    """Lista simulados disponíveis para o usuário autenticado."""
    return simulado_service.list_simulados(sb, user["sub"], user.get("role", "student"))


@router.get("/my-attempts", response_model=list[SimuladoAttemptSummary])
def my_attempts(
    user: dict = Depends(_current_user),
    sb: Client = Depends(get_supabase_client),
):
    """Histórico de tentativas do aluno autenticado."""
    return simulado_service.get_my_attempts(sb, user["sub"])


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("", response_model=SimuladoPublic, status_code=201)
@limiter.limit("10/minute")
def create_simulado(
    request: Request,
    body: SimuladoCreate,
    user: dict = Depends(_current_user),
    sb: Client = Depends(get_supabase_client),
):
    """
    Cria um novo simulado sorteando questões do banco.
    Qualquer usuário autenticado pode criar simulados livres (pessoais).
    Para atribuir a turmas (class_id), é necessário ser professor ou admin.
    """
    data = body.model_dump()
    if data.get("class_id") and user.get("role") not in ("teacher", "admin"):
        raise HTTPException(
            status_code=403,
            detail="Apenas professores podem atribuir simulados a turmas",
        )
    if data.get("class_id"):
        validate_uuid(data["class_id"], "class_id")
    try:
        return simulado_service.create_simulado(sb, data, user["sub"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/{simulado_id}", response_model=SimuladoPublic)
def get_simulado(
    simulado_id: str,
    user: dict = Depends(_current_user),
    sb: Client = Depends(get_supabase_client),
):
    """Retorna o cabeçalho de um simulado. Verifica acesso do usuário."""
    validate_uuid(simulado_id, "simulado_id")
    try:
        simulado = simulado_service.get_simulado(sb, simulado_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    # Verifica se o usuário tem acesso: criador, admin, ou aluno da turma atribuída
    user_id = user["sub"]
    role = user.get("role", "student")
    is_owner = simulado["created_by"] == user_id
    is_admin = role == "admin"
    if not is_owner and not is_admin:
        # Verifica se é aluno da turma atribuída
        class_id = simulado.get("class_id")
        if class_id:
            check = simulado_service.is_student_in_class(sb, user_id, class_id)
            if not check:
                raise HTTPException(status_code=403, detail="Acesso não autorizado a este simulado")
        else:
            # Simulado privado de outro usuário
            raise HTTPException(status_code=403, detail="Acesso não autorizado a este simulado")
    return simulado


@router.delete("/{simulado_id}", status_code=204)
def delete_simulado(
    simulado_id: str,
    user: dict = Depends(_current_user),
    sb: Client = Depends(get_supabase_client),
):
    """Remove um simulado (criador ou admin)."""
    validate_uuid(simulado_id, "simulado_id")
    try:
        simulado_service.delete_simulado(sb, simulado_id, user["sub"], user.get("role", "student"))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e


# ── Tentativas ────────────────────────────────────────────────────────────────

@router.post("/{simulado_id}/start", response_model=SimuladoAttemptStart)
@limiter.limit("30/minute")
def start_attempt(
    request: Request,
    simulado_id: str,
    user: dict = Depends(_current_user),
    sb: Client = Depends(get_supabase_client),
):
    """Inicia (ou retoma) uma tentativa e retorna as questões sem gabarito."""
    validate_uuid(simulado_id, "simulado_id")
    try:
        return simulado_service.start_attempt(sb, simulado_id, user["sub"])
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post(
    "/{simulado_id}/attempts/{attempt_id}/answer",
    response_model=SimuladoAnswerResponse,
)
def record_answer(
    simulado_id: str,
    attempt_id: str,
    body: SimuladoAnswerRequest,
    user: dict = Depends(_current_user),
    sb: Client = Depends(get_supabase_client),
):
    """Registra a resposta de uma questão (gabarito verificado no servidor, não revelado)."""
    validate_uuid(simulado_id, "simulado_id")
    validate_uuid(attempt_id, "attempt_id")
    validate_uuid(body.question_id, "question_id")
    try:
        return simulado_service.record_answer(
            sb, simulado_id, attempt_id, user["sub"], body.question_id, body.selected_answer
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post(
    "/{simulado_id}/attempts/{attempt_id}/finish",
    response_model=SimuladoReport,
)
def finish_attempt(
    simulado_id: str,
    attempt_id: str,
    time_spent_seconds: int | None = Query(None, ge=0, le=_MAX_TIME_SPENT),
    user: dict = Depends(_current_user),
    sb: Client = Depends(get_supabase_client),
):
    """Finaliza a tentativa, calcula o score e retorna o relatório completo com gabarito."""
    validate_uuid(simulado_id, "simulado_id")
    validate_uuid(attempt_id, "attempt_id")
    try:
        return simulado_service.finish_attempt(
            sb, simulado_id, attempt_id, user["sub"], time_spent_seconds
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e


@router.get(
    "/{simulado_id}/attempts/{attempt_id}/report",
    response_model=SimuladoReport,
)
def get_report(
    simulado_id: str,
    attempt_id: str,
    user: dict = Depends(_current_user),
    sb: Client = Depends(get_supabase_client),
):
    """Retorna o relatório de uma tentativa já finalizada."""
    validate_uuid(simulado_id, "simulado_id")
    validate_uuid(attempt_id, "attempt_id")
    try:
        return simulado_service.get_report(sb, simulado_id, attempt_id, user["sub"])
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e


@router.get("/{simulado_id}/attempts", response_model=list[SimuladoAttemptSummary])
def list_attempts(
    simulado_id: str,
    user: dict = Depends(_require_teacher_or_admin),
    sb: Client = Depends(get_supabase_client),
):
    """Professor/Admin: lista tentativas de alunos. Professor só acessa seus próprios simulados."""
    validate_uuid(simulado_id, "simulado_id")
    try:
        simulado = simulado_service.get_simulado(sb, simulado_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    # Professor só vê tentativas de simulados que ele próprio criou
    if user.get("role") != "admin" and simulado["created_by"] != user["sub"]:
        raise HTTPException(status_code=403, detail="Acesso restrito ao criador do simulado")
    return simulado_service.list_attempts(sb, simulado_id)
