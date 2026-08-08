"""
Rotas do banco de questões — listagem/correção para alunos autenticados e
CRUD/importação/upload de imagem para admin. Substitui o acesso direto do
browser ao Supabase (RLS agora bloqueia escrita fora do backend).
"""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from supabase import Client

from app.auth.security import validate_uuid, verify_jwt_token
from app.db.supabase import get_supabase_client
from app.models.schemas import (
    QuestionAdmin,
    QuestionAnswerRequest,
    QuestionAnswerResponse,
    QuestionCreate,
    QuestionImageUploadResponse,
    QuestionPublic,
    QuestionsImportRequest,
    QuestionsImportResponse,
    QuestionUpdate,
)
from app.services import questions_service

router = APIRouter(prefix="/questions", tags=["questions"])

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


def _current_user(token: dict = Depends(verify_jwt_token)) -> dict:
    return token


def _require_admin(user: dict = Depends(_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return user


# ── Aluno ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[QuestionPublic])
def list_questions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _user: dict = Depends(_current_user),
    sb: Client = Depends(get_supabase_client),
):
    """Lista questões paginadas, sem gabarito."""
    return questions_service.list_public_questions(sb, limit=limit, offset=offset)


@router.post("/{question_id}/answer", response_model=QuestionAnswerResponse)
def answer_question(
    question_id: str,
    body: QuestionAnswerRequest,
    _user: dict = Depends(_current_user),
    sb: Client = Depends(get_supabase_client),
):
    """Corrige a resposta e revela gabarito/explicação da questão respondida."""
    validate_uuid(question_id, "question_id")
    try:
        return questions_service.check_answer(sb, question_id, body.answer)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/admin", response_model=list[QuestionAdmin])
def admin_list_questions(
    _user: dict = Depends(_require_admin),
    sb: Client = Depends(get_supabase_client),
):
    """Admin: lista todas as questões com gabarito."""
    return questions_service.admin_list_questions(sb)


@router.post("", response_model=QuestionAdmin, status_code=201)
def create_question(
    body: QuestionCreate,
    _user: dict = Depends(_require_admin),
    sb: Client = Depends(get_supabase_client),
):
    """Admin: cria uma questão."""
    try:
        return questions_service.create_question(sb, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("/{question_id}", response_model=QuestionAdmin)
def update_question(
    question_id: str,
    body: QuestionUpdate,
    _user: dict = Depends(_require_admin),
    sb: Client = Depends(get_supabase_client),
):
    """Admin: atualiza uma questão."""
    validate_uuid(question_id, "question_id")
    try:
        return questions_service.update_question(
            sb, question_id, body.model_dump(exclude_unset=True, exclude_none=True)
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/{question_id}", status_code=204)
def delete_question(
    question_id: str,
    _user: dict = Depends(_require_admin),
    sb: Client = Depends(get_supabase_client),
):
    """Admin: remove uma questão."""
    validate_uuid(question_id, "question_id")
    try:
        questions_service.delete_question(sb, question_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/import", response_model=QuestionsImportResponse)
def import_questions(
    body: QuestionsImportRequest,
    _user: dict = Depends(_require_admin),
    sb: Client = Depends(get_supabase_client),
):
    """Admin: importa questões em lote (JSON com chaves pt-BR ou en)."""
    try:
        imported = questions_service.import_questions(sb, body.items)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return QuestionsImportResponse(imported=imported)


@router.post("/images", response_model=QuestionImageUploadResponse, status_code=201)
async def upload_question_image(
    file: UploadFile = File(...),
    _user: dict = Depends(_require_admin),
    sb: Client = Depends(get_supabase_client),
):
    """Admin: sobe a imagem de uma questão e retorna a URL pública."""
    content = await file.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Imagem acima de 5 MB")
    try:
        url = questions_service.upload_question_image(sb, content, file.content_type or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao subir imagem: {e}") from e
    return QuestionImageUploadResponse(image_url=url)
