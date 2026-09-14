"""
Rotas de Flashcards — CRUD de decks/cards + revisão SM-2.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.auth.client import supabase
from app.auth.security import verify_jwt_token
from app.models.schemas import (
    CardCreate,
    CardUpdate,
    DeckCreate,
    DeckResponse,
    DeckUpdate,
    FlashcardGenerateRequest,
    FlashcardGenerateResponse,
    FlashcardResponse,
    FlashcardReviewRequest,
    FlashcardReviewResponse,
)
from app.services import flashcard_service

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


def _current_user(token: dict = Depends(verify_jwt_token)) -> dict:
    return token


# ── Decks ─────────────────────────────────────────────────────────────────────

@router.get("/decks", response_model=list[DeckResponse])
def list_decks(user: dict = Depends(_current_user)):
    """Lista todos os decks acessíveis ao aluno, com contagem de cards devidos."""
    return flashcard_service.get_decks_with_due(student_id=user["sub"])


# ── Cards de um deck ──────────────────────────────────────────────────────────

@router.get("/decks/{deck_id}/cards", response_model=list[FlashcardResponse])
def list_due_cards(
    deck_id: str,
    user: dict = Depends(_current_user),
):
    """Retorna os cards do deck que estão vencidos (ou nunca revisados) para o aluno."""
    return flashcard_service.get_due_cards(
        deck_id=deck_id,
        student_id=user["sub"],
    )


@router.get("/decks/{deck_id}/cards/all", response_model=list[FlashcardResponse])
def list_all_cards(
    deck_id: str,
    user: dict = Depends(_current_user),  # noqa: ARG001
):
    """Retorna todos os cards ativos de um deck (para revisão completa)."""
    resp = (
        supabase.table("flashcards")
        .select("id, deck_id, front, back, hint, difficulty, tags")
        .eq("deck_id", deck_id)
        .eq("status", "active")
        .execute()
    )
    return resp.data or []


# ── Revisão SM-2 ──────────────────────────────────────────────────────────────

@router.post("/review", response_model=FlashcardReviewResponse)
def submit_review(
    body: FlashcardReviewRequest,
    user: dict = Depends(_current_user),
):
    """
    Registra a avaliação de um card (easy / unsure / hard) e aplica o SM-2.
    Retorna o estado atualizado: EF, intervalo, próxima revisão.
    """
    try:
        result = flashcard_service.submit_review(
            flashcard_id=body.flashcard_id,
            student_id=user["sub"],
            rating=body.rating,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return FlashcardReviewResponse(
        flashcard_id=body.flashcard_id,
        **result,
    )


# ── Teacher CRUD ──────────────────────────────────────────────────────────────

def _require_teacher(user: dict = Depends(_current_user)) -> dict:
    if user.get("role") not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Apenas professores podem acessar este recurso")
    return user


@router.get("/teacher/decks", response_model=list[DeckResponse])
def list_teacher_decks(user: dict = Depends(_require_teacher)):
    """Lista os decks criados pelo professor autenticado."""
    return flashcard_service.get_teacher_decks(teacher_id=user["sub"])


@router.post("/decks", response_model=DeckResponse, status_code=201)
def create_deck(body: DeckCreate, user: dict = Depends(_require_teacher)):
    """Cria um novo deck."""
    return flashcard_service.create_deck(teacher_id=user["sub"], data=body.model_dump())


@router.put("/decks/{deck_id}", response_model=DeckResponse)
def update_deck(deck_id: str, body: DeckUpdate, user: dict = Depends(_require_teacher)):
    """Atualiza nome/descrição/especialidade de um deck."""
    try:
        return flashcard_service.update_deck(deck_id, user["sub"], body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/decks/{deck_id}", status_code=204)
def delete_deck(deck_id: str, user: dict = Depends(_require_teacher)):
    """Remove um deck e todos os seus cards."""
    try:
        flashcard_service.delete_deck(deck_id, user["sub"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/decks/{deck_id}/cards/manage", response_model=list[FlashcardResponse])
def list_deck_cards_manage(deck_id: str, _user: dict = Depends(_require_teacher)):
    """Lista todos os cards de um deck para gerenciamento."""
    return flashcard_service.get_deck_cards_manage(deck_id)


@router.post("/decks/{deck_id}/cards", response_model=FlashcardResponse, status_code=201)
def create_card(deck_id: str, body: CardCreate, user: dict = Depends(_require_teacher)):
    """Adiciona um card a um deck."""
    try:
        return flashcard_service.create_card(deck_id, user["sub"], body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.put("/cards/{card_id}", response_model=FlashcardResponse)
def update_card(card_id: str, body: CardUpdate, user: dict = Depends(_require_teacher)):
    """Edita um card."""
    try:
        return flashcard_service.update_card(card_id, user["sub"], body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/cards/{card_id}", status_code=204)
def delete_card(card_id: str, user: dict = Depends(_require_teacher)):
    """Remove um card."""
    try:
        flashcard_service.delete_card(card_id, user["sub"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


# ── Student CRUD — Decks e Cards pessoais ────────────────────────────────────

@router.get("/student/decks", response_model=list[DeckResponse])
def list_student_decks(user: dict = Depends(_current_user)):
    """Lista os decks pessoais criados pelo aluno autenticado."""
    return flashcard_service.get_student_decks(student_id=user["sub"])


@router.post("/student/decks", response_model=DeckResponse, status_code=201)
def create_student_deck(body: DeckCreate, user: dict = Depends(_current_user)):
    """Cria um deck pessoal para o aluno."""
    return flashcard_service.create_student_deck(student_id=user["sub"], data=body.model_dump())


@router.put("/student/decks/{deck_id}", response_model=DeckResponse)
def update_student_deck(deck_id: str, body: DeckUpdate, user: dict = Depends(_current_user)):
    """Atualiza um deck pessoal do aluno."""
    try:
        return flashcard_service.update_student_deck(deck_id, user["sub"], body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/student/decks/{deck_id}", status_code=204)
def delete_student_deck(deck_id: str, user: dict = Depends(_current_user)):
    """Remove um deck pessoal do aluno."""
    try:
        flashcard_service.delete_student_deck(deck_id, user["sub"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/student/decks/{deck_id}/cards", response_model=list[FlashcardResponse])
def list_student_deck_cards(deck_id: str, user: dict = Depends(_current_user)):
    """Lista os cards de um deck pessoal do aluno."""
    try:
        return flashcard_service.get_student_deck_cards(deck_id, user["sub"])
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e


@router.post("/student/decks/{deck_id}/cards", response_model=FlashcardResponse, status_code=201)
def create_student_card(deck_id: str, body: CardCreate, user: dict = Depends(_current_user)):
    """Adiciona um card a um deck pessoal do aluno."""
    try:
        return flashcard_service.create_student_card(deck_id, user["sub"], body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.put("/student/cards/{card_id}", response_model=FlashcardResponse)
def update_student_card(card_id: str, body: CardUpdate, user: dict = Depends(_current_user)):
    """Edita um card de um deck pessoal do aluno."""
    try:
        return flashcard_service.update_student_card(card_id, user["sub"], body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/student/cards/{card_id}", status_code=204)
def delete_student_card(card_id: str, user: dict = Depends(_current_user)):
    """Remove um card de um deck pessoal do aluno."""
    try:
        flashcard_service.delete_student_card(card_id, user["sub"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


# ── Geração de Flashcards via IA ─────────────────────────────────────────────

@router.post("/generate-from-conversation", response_model=FlashcardGenerateResponse, status_code=201)
def generate_flashcards_from_conversation(
    body: FlashcardGenerateRequest,
    user: dict = Depends(_current_user),
):
    """
    Gera flashcards automaticamente via GPT a partir de uma conversa de anamnese.
    Cria (ou adiciona a) um deck pessoal do aluno.
    """
    try:
        result = flashcard_service.generate_flashcards_from_conversation(
            conversation_id=body.conversation_id,
            student_id=user["sub"],
            deck_name=body.deck_name,
            existing_deck_id=body.existing_deck_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar flashcards: {e}") from e

    return FlashcardGenerateResponse(**result)


# ── Admin CRUD (acesso total, sem verificação de propriedade) ─────────────────

def _require_admin(user: dict = Depends(_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return user


@router.get("/admin/decks", response_model=list[DeckResponse])
def admin_list_decks(_user: dict = Depends(_require_admin)):
    """Admin: lista todos os decks do sistema."""
    return flashcard_service.admin_get_all_decks()


@router.post("/admin/decks", response_model=DeckResponse, status_code=201)
def admin_create_deck(body: DeckCreate, user: dict = Depends(_require_admin)):
    """Admin: cria um deck (vinculado ao admin como teacher_id)."""
    return flashcard_service.create_deck(teacher_id=user["sub"], data=body.model_dump())


@router.put("/admin/decks/{deck_id}", response_model=DeckResponse)
def admin_update_deck(deck_id: str, body: DeckUpdate, _user: dict = Depends(_require_admin)):
    """Admin: atualiza qualquer deck sem verificação de propriedade."""
    try:
        return flashcard_service.admin_update_deck(deck_id, body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/admin/decks/{deck_id}", status_code=204)
def admin_delete_deck(deck_id: str, _user: dict = Depends(_require_admin)):
    """Admin: remove qualquer deck."""
    try:
        flashcard_service.admin_delete_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/admin/decks/{deck_id}/cards/manage", response_model=list[FlashcardResponse])
def admin_list_deck_cards(deck_id: str, _user: dict = Depends(_require_admin)):
    """Admin: lista todos os cards de um deck."""
    return flashcard_service.get_deck_cards_manage(deck_id)


@router.post("/admin/decks/{deck_id}/cards", response_model=FlashcardResponse, status_code=201)
def admin_create_card_route(deck_id: str, body: CardCreate, _user: dict = Depends(_require_admin)):
    """Admin: adiciona um card a qualquer deck."""
    try:
        return flashcard_service.admin_create_card(deck_id, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.put("/admin/cards/{card_id}", response_model=FlashcardResponse)
def admin_update_card_route(card_id: str, body: CardUpdate, _user: dict = Depends(_require_admin)):
    """Admin: edita qualquer card."""
    try:
        return flashcard_service.admin_update_card(card_id, body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/admin/cards/{card_id}", status_code=204)
def admin_delete_card_route(card_id: str, _user: dict = Depends(_require_admin)):
    """Admin: remove qualquer card."""
    try:
        flashcard_service.admin_delete_card(card_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
