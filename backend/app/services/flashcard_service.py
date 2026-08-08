"""
Flashcard Service — lógica de negócio para decks, cards e revisão SM-2.

Algoritmo SuperMemo 2 (SM-2):
    - EF (Ease Factor): fator de facilidade, inicia em 2.5, mínimo 1.3
    - I  (Interval):    intervalo em dias até a próxima revisão
    - n  (Repetitions): número de repetições bem-sucedidas consecutivas (q >= 3)

Qualidade (q):
    0-2 → difícil  (repetição falhou)
    3   → médio    (passou com esforço)
    4-5 → fácil    (passou facilmente)
"""

import math
from datetime import UTC, datetime, timedelta

from app.auth.client import supabase
from app.config import logger

# ── Constantes SM-2 ───────────────────────────────────────────────────────────

_EF_DEFAULT  = 2.5
_EF_MIN      = 1.3
_RATING_MAP  = {"again": 0, "hard": 2, "good": 4, "easy": 5}  # → qualidade q (Anki SM-2)

# ── SM-2 puro (sem I/O) ───────────────────────────────────────────────────────

def _sm2(
    q: int,
    ef: float,
    interval: int,
    repetitions: int,
) -> tuple[float, int, int]:
    """
    Aplica uma rodada do SM-2 e retorna (new_ef, new_interval, new_repetitions).

    q            : qualidade 0-5
    ef           : ease factor atual
    interval     : intervalo atual em dias
    repetitions  : repetições consecutivas bem-sucedidas
    """
    # Atualiza EF
    new_ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    new_ef = max(_EF_MIN, new_ef)

    if q < 3:
        # Falha: reinicia contagem, revisão amanhã
        new_repetitions = 0
        new_interval = 1
    else:
        new_repetitions = repetitions + 1
        if repetitions == 0:
            new_interval = 1
        elif repetitions == 1:
            new_interval = 6
        else:
            new_interval = math.ceil(interval * new_ef)

    return new_ef, new_interval, new_repetitions


# ── Busca estado atual do card para o aluno ───────────────────────────────────

def _get_card_state(flashcard_id: str, student_id: str) -> dict:
    """Retorna o estado SM-2 mais recente para um par (card, aluno), ou defaults."""
    resp = (
        supabase.table("flashcard_reviews")
        .select("rating, ef, interval_days, repetitions, reviewed_at, next_review_at")
        .eq("flashcard_id", flashcard_id)
        .eq("student_id", student_id)
        .order("reviewed_at", desc=True)
        .limit(1)
        .execute()
    )
    if resp.data:
        row = resp.data[0]
        return {
            "ef":           float(row.get("ef") or _EF_DEFAULT),
            "interval":     int(row.get("interval_days") or 1),
            "repetitions":  int(row.get("repetitions") or 0),
        }
    return {"ef": _EF_DEFAULT, "interval": 1, "repetitions": 0}


# ── Registra uma revisão e persiste estado SM-2 ───────────────────────────────

def submit_review(
    flashcard_id: str,
    student_id: str,
    rating: str,          # "easy" | "unsure" | "hard"
) -> dict:
    """
    Registra a avaliação de um card e calcula a próxima data de revisão via SM-2.
    Retorna o estado atualizado: {ef, interval_days, repetitions, next_review_at}.
    """
    q = _RATING_MAP.get(rating, 3)
    state = _get_card_state(flashcard_id, student_id)

    new_ef, new_interval, new_reps = _sm2(
        q=q,
        ef=state["ef"],
        interval=state["interval"],
        repetitions=state["repetitions"],
    )

    now = datetime.now(UTC)
    next_review = now + timedelta(days=new_interval)

    row = {
        "flashcard_id":   flashcard_id,
        "student_id":     student_id,
        "rating":         rating,
        "ef":             round(new_ef, 4),
        "interval_days":  new_interval,
        "repetitions":    new_reps,
        "reviewed_at":    now.isoformat(),
        "next_review_at": next_review.isoformat(),
    }

    supabase.table("flashcard_reviews").insert(row).execute()
    logger.info(
        "SM-2 review saved",
        extra={
            "flashcard_id": flashcard_id,
            "student_id": student_id,
            "rating": rating,
            "q": q,
            "ef": round(new_ef, 4),
            "interval": new_interval,
            "next_review": next_review.date().isoformat(),
        },
    )

    return {
        "ef":             round(new_ef, 4),
        "interval_days":  new_interval,
        "repetitions":    new_reps,
        "next_review_at": next_review.isoformat(),
    }


# ── Cards devidos para revisão hoje ──────────────────────────────────────────

def get_due_cards(deck_id: str, student_id: str) -> list[dict]:
    """
    Retorna os cards de um deck que estão vencidos ou nunca foram revisados.
    Nunca revisados = não existem em flashcard_reviews para este aluno.
    """
    now_iso = datetime.now(UTC).isoformat()

    # Todos os cards do deck
    cards_resp = (
        supabase.table("flashcards")
        .select("id, deck_id, front, back, hint, difficulty, tags")
        .eq("deck_id", deck_id)
        .eq("status", "active")
        .execute()
    )
    all_cards = cards_resp.data or []

    if not all_cards:
        return []

    card_ids = [c["id"] for c in all_cards]

    # Última revisão de cada card para este aluno
    reviews_resp = (
        supabase.table("flashcard_reviews")
        .select("flashcard_id, next_review_at")
        .eq("student_id", student_id)
        .in_("flashcard_id", card_ids)
        .order("reviewed_at", desc=True)
        .execute()
    )

    # Pega next_review_at mais recente por card
    latest: dict[str, str | None] = {}
    for r in (reviews_resp.data or []):
        cid = r["flashcard_id"]
        if cid not in latest:
            latest[cid] = r["next_review_at"]

    due = []
    for card in all_cards:
        nra = latest.get(card["id"])
        # Nunca revisado ou vencido
        if nra is None or nra <= now_iso:
            due.append(card)

    return due


# ── Decks com contagem de cards devidos ──────────────────────────────────────

def get_decks_with_due(student_id: str) -> list[dict]:
    """
    Retorna decks acessíveis ao aluno com campo 'due_count' calculado via SM-2.
    Inclui: decks livres (sem turma) + decks das turmas do aluno.
    """
    # 1. Turmas que o aluno está matriculado
    enrolled_resp = (
        supabase.table("class_students")
        .select("class_id")
        .eq("student_id", student_id)
        .execute()
    )
    enrolled_ids = {r["class_id"] for r in (enrolled_resp.data or [])}

    # 2. Todos os decks
    decks_resp = supabase.table("flashcard_decks").select("*").execute()
    all_decks = decks_resp.data or []

    # 3. Mapa deck_id → [class_ids] via junction table
    all_deck_ids = [d["id"] for d in all_decks]
    class_map: dict = {}
    if all_deck_ids:
        junc_all = (
            supabase.table("flashcard_deck_classes")
            .select("deck_id, class_id")
            .in_("deck_id", all_deck_ids)
            .execute()
        )
        for row in (junc_all.data or []):
            class_map.setdefault(row["deck_id"], []).append(row["class_id"])

    # 4. Filtra: livres (nenhuma turma e sem student_id) ou de turma do aluno
    #    ou decks pessoais do próprio aluno
    decks = []
    for deck in all_decks:
        deck_class_ids = class_map.get(deck["id"], [])
        deck_student_id = deck.get("student_id")
        if deck_student_id:
            # Deck pessoal de aluno — só visível ao dono
            if deck_student_id == student_id:
                decks.append(deck)
        elif not deck_class_ids:
            decks.append(deck)  # deck livre — visível para todos
        elif any(cid in enrolled_ids for cid in deck_class_ids):
            decks.append(deck)  # deck de turma do aluno

    # 5. Nomes das turmas relevantes
    relevant_class_ids = list({cid for d in decks for cid in class_map.get(d["id"], [])})
    class_name_map: dict = {}
    if relevant_class_ids:
        classes_resp = (
            supabase.table("classes")
            .select("id, name")
            .in_("id", relevant_class_ids)
            .execute()
        )
        for c in (classes_resp.data or []):
            class_name_map[c["id"]] = c["name"]

    now_iso = datetime.now(UTC).isoformat()

    result = []
    for deck in decks:
        total_resp = (
            supabase.table("flashcards")
            .select("id", count="exact")
            .eq("deck_id", deck["id"])
            .eq("status", "active")
            .execute()
        )
        total = total_resp.count or 0

        if total > 0:
            cards_resp = (
                supabase.table("flashcards")
                .select("id")
                .eq("deck_id", deck["id"])
                .execute()
            )
            card_ids = [c["id"] for c in (cards_resp.data or [])]

            done_resp = (
                supabase.table("flashcard_reviews")
                .select("flashcard_id, next_review_at")
                .eq("student_id", student_id)
                .in_("flashcard_id", card_ids)
                .gt("next_review_at", now_iso)
                .execute()
            )
            reviewed_ids = {r["flashcard_id"] for r in (done_resp.data or [])}
            due_count = total - len(reviewed_ids)
        else:
            due_count = 0

        deck_cids = class_map.get(deck["id"], [])
        result.append({
            **deck,
            "total": total,
            "due_count": max(0, due_count),
            "class_ids": deck_cids,
            "class_names": [class_name_map.get(cid, "") for cid in deck_cids],
        })

    return result


# ── Teacher CRUD — Decks ──────────────────────────────────────────────────────

def get_teacher_decks(teacher_id: str) -> list[dict]:
    """Retorna todos os decks criados pelo professor com contagem de cards."""
    resp = (
        supabase.table("flashcard_decks")
        .select("*")
        .eq("teacher_id", teacher_id)
        .order("created_at", desc=True)
        .execute()
    )
    decks = resp.data or []

    # Busca class_ids de todos os decks de uma vez
    class_map: dict = {}
    if decks:
        deck_ids = [d["id"] for d in decks]
        junc_resp = (
            supabase.table("flashcard_deck_classes")
            .select("deck_id, class_id")
            .in_("deck_id", deck_ids)
            .execute()
        )
        for row in (junc_resp.data or []):
            class_map.setdefault(row["deck_id"], []).append(row["class_id"])

    result = []
    for deck in decks:
        total_resp = (
            supabase.table("flashcards")
            .select("id", count="exact")
            .eq("deck_id", deck["id"])
            .eq("status", "active")
            .execute()
        )
        total = total_resp.count or 0
        result.append({**deck, "total": total, "due_count": 0, "class_ids": class_map.get(deck["id"], [])})
    return result


def _sync_deck_classes(deck_id: str, class_ids: list[str]) -> None:
    """Sincroniza a tabela de junção deck<->turmas."""
    supabase.table("flashcard_deck_classes").delete().eq("deck_id", deck_id).execute()
    if class_ids:
        rows = [{"deck_id": deck_id, "class_id": cid} for cid in class_ids]
        supabase.table("flashcard_deck_classes").insert(rows).execute()


def create_deck(teacher_id: str, data: dict) -> dict:
    class_ids: list[str] = data.pop("class_ids", None) or []
    row = {
        "teacher_id": teacher_id,
        "name": data["name"],
        "description": data.get("description"),
        "specialty": data.get("specialty"),
    }
    resp = supabase.table("flashcard_decks").insert(row).execute()
    deck = resp.data[0]
    if class_ids:
        _sync_deck_classes(deck["id"], class_ids)
    return {**deck, "total": 0, "due_count": 0, "class_ids": class_ids}


def update_deck(deck_id: str, teacher_id: str, data: dict) -> dict:
    class_ids: list[str] | None = data.pop("class_ids", None)
    existing = (
        supabase.table("flashcard_decks")
        .select("id")
        .eq("id", deck_id)
        .eq("teacher_id", teacher_id)
        .execute()
    )
    if not existing.data:
        raise ValueError("Deck não encontrado ou sem permissão")
    if data:
        resp = supabase.table("flashcard_decks").update(data).eq("id", deck_id).execute()
        updated = resp.data[0]
    else:
        updated = supabase.table("flashcard_decks").select("*").eq("id", deck_id).execute().data[0]
    if class_ids is not None:
        _sync_deck_classes(deck_id, class_ids)
    # Retorna class_ids atuais
    junc_resp = supabase.table("flashcard_deck_classes").select("class_id").eq("deck_id", deck_id).execute()
    current_class_ids = [r["class_id"] for r in (junc_resp.data or [])]
    total_resp = (
        supabase.table("flashcards")
        .select("id", count="exact")
        .eq("deck_id", deck_id)
        .eq("status", "active")
        .execute()
    )
    return {**updated, "total": total_resp.count or 0, "due_count": 0, "class_ids": current_class_ids}


def delete_deck(deck_id: str, teacher_id: str) -> None:
    existing = (
        supabase.table("flashcard_decks")
        .select("id")
        .eq("id", deck_id)
        .eq("teacher_id", teacher_id)
        .execute()
    )
    if not existing.data:
        raise ValueError("Deck não encontrado ou sem permissão")
    supabase.table("flashcards").delete().eq("deck_id", deck_id).execute()
    supabase.table("flashcard_decks").delete().eq("id", deck_id).execute()


# ── Teacher CRUD — Cards ──────────────────────────────────────────────────────

def get_deck_cards_manage(deck_id: str) -> list[dict]:
    """Retorna todos os cards de um deck para gerenciamento (professor)."""
    resp = (
        supabase.table("flashcards")
        .select("id, deck_id, front, back, hint, difficulty, tags, status")
        .eq("deck_id", deck_id)
        .order("created_at", desc=False)
        .execute()
    )
    return resp.data or []


def create_card(deck_id: str, teacher_id: str, data: dict) -> dict:
    existing = (
        supabase.table("flashcard_decks")
        .select("id")
        .eq("id", deck_id)
        .eq("teacher_id", teacher_id)
        .execute()
    )
    if not existing.data:
        raise ValueError("Deck não encontrado ou sem permissão")
    row = {
        "deck_id": deck_id,
        "front": data["front"],
        "back": data["back"],
        "hint": data.get("hint"),
        "difficulty": data.get("difficulty", "medium"),
        "tags": data.get("tags") or [],
        "status": "active",
    }
    resp = supabase.table("flashcards").insert(row).execute()
    return resp.data[0]


def update_card(card_id: str, teacher_id: str, data: dict) -> dict:
    card_resp = supabase.table("flashcards").select("deck_id").eq("id", card_id).execute()
    if not card_resp.data:
        raise ValueError("Card não encontrado")
    deck_id = card_resp.data[0]["deck_id"]
    deck_resp = (
        supabase.table("flashcard_decks")
        .select("id")
        .eq("id", deck_id)
        .eq("teacher_id", teacher_id)
        .execute()
    )
    if not deck_resp.data:
        raise ValueError("Sem permissão para editar este card")
    resp = supabase.table("flashcards").update(data).eq("id", card_id).execute()
    return resp.data[0]


def delete_card(card_id: str, teacher_id: str) -> None:
    card_resp = supabase.table("flashcards").select("deck_id").eq("id", card_id).execute()
    if not card_resp.data:
        raise ValueError("Card não encontrado")
    deck_id = card_resp.data[0]["deck_id"]
    deck_resp = (
        supabase.table("flashcard_decks")
        .select("id")
        .eq("id", deck_id)
        .eq("teacher_id", teacher_id)
        .execute()
    )
    if not deck_resp.data:
        raise ValueError("Sem permissão para deletar este card")
    supabase.table("flashcard_reviews").delete().eq("flashcard_id", card_id).execute()
    supabase.table("flashcards").delete().eq("id", card_id).execute()


# ── Admin CRUD (sem verificação de propriedade) ───────────────────────────────

def admin_get_all_decks() -> list[dict]:
    """Retorna todos os decks do sistema com class_ids, class_names e total (admin)."""
    decks_resp = (
        supabase.table("flashcard_decks")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    decks = decks_resp.data or []

    all_deck_ids = [d["id"] for d in decks]
    class_map: dict = {}
    if all_deck_ids:
        junc_resp = (
            supabase.table("flashcard_deck_classes")
            .select("deck_id, class_id")
            .in_("deck_id", all_deck_ids)
            .execute()
        )
        for row in (junc_resp.data or []):
            class_map.setdefault(row["deck_id"], []).append(row["class_id"])

    all_class_ids = list({cid for ids in class_map.values() for cid in ids})
    class_name_map: dict = {}
    if all_class_ids:
        classes_resp = supabase.table("classes").select("id, name").in_("id", all_class_ids).execute()
        for c in (classes_resp.data or []):
            class_name_map[c["id"]] = c["name"]

    result = []
    for deck in decks:
        total_resp = (
            supabase.table("flashcards")
            .select("id", count="exact")
            .eq("deck_id", deck["id"])
            .eq("status", "active")
            .execute()
        )
        total = total_resp.count or 0
        deck_cids = class_map.get(deck["id"], [])
        result.append({
            **deck,
            "total": total,
            "due_count": 0,
            "class_ids": deck_cids,
            "class_names": [class_name_map.get(cid, "") for cid in deck_cids],
        })
    return result


def admin_update_deck(deck_id: str, data: dict) -> dict:
    class_ids: list[str] | None = data.pop("class_ids", None)
    existing = supabase.table("flashcard_decks").select("id").eq("id", deck_id).execute()
    if not existing.data:
        raise ValueError("Deck não encontrado")
    if data:
        resp = supabase.table("flashcard_decks").update(data).eq("id", deck_id).execute()
        updated = resp.data[0]
    else:
        updated = supabase.table("flashcard_decks").select("*").eq("id", deck_id).execute().data[0]
    if class_ids is not None:
        _sync_deck_classes(deck_id, class_ids)
    junc_resp = supabase.table("flashcard_deck_classes").select("class_id").eq("deck_id", deck_id).execute()
    current_cids = [r["class_id"] for r in (junc_resp.data or [])]
    total_resp = (
        supabase.table("flashcards")
        .select("id", count="exact")
        .eq("deck_id", deck_id)
        .eq("status", "active")
        .execute()
    )
    return {**updated, "total": total_resp.count or 0, "due_count": 0, "class_ids": current_cids, "class_names": []}


def admin_delete_deck(deck_id: str) -> None:
    existing = supabase.table("flashcard_decks").select("id").eq("id", deck_id).execute()
    if not existing.data:
        raise ValueError("Deck não encontrado")
    supabase.table("flashcards").delete().eq("deck_id", deck_id).execute()
    supabase.table("flashcard_decks").delete().eq("id", deck_id).execute()


def admin_create_card(deck_id: str, data: dict) -> dict:
    existing = supabase.table("flashcard_decks").select("id").eq("id", deck_id).execute()
    if not existing.data:
        raise ValueError("Deck não encontrado")
    row = {
        "deck_id": deck_id,
        "front": data["front"],
        "back": data["back"],
        "hint": data.get("hint"),
        "difficulty": data.get("difficulty", "medium"),
        "tags": data.get("tags") or [],
        "status": "active",
    }
    resp = supabase.table("flashcards").insert(row).execute()
    return resp.data[0]


def admin_update_card(card_id: str, data: dict) -> dict:
    card_resp = supabase.table("flashcards").select("id").eq("id", card_id).execute()
    if not card_resp.data:
        raise ValueError("Card não encontrado")
    resp = supabase.table("flashcards").update(data).eq("id", card_id).execute()
    return resp.data[0]


def admin_delete_card(card_id: str) -> None:
    card_resp = supabase.table("flashcards").select("id").eq("id", card_id).execute()
    if not card_resp.data:
        raise ValueError("Card não encontrado")
    supabase.table("flashcard_reviews").delete().eq("flashcard_id", card_id).execute()
    supabase.table("flashcards").delete().eq("id", card_id).execute()


# ── Student CRUD — Decks pessoais ─────────────────────────────────────────────

def get_student_decks(student_id: str) -> list[dict]:
    """Retorna os decks pessoais criados pelo aluno, com contagem de cards."""
    resp = (
        supabase.table("flashcard_decks")
        .select("*")
        .eq("student_id", student_id)
        .order("created_at", desc=True)
        .execute()
    )
    decks = resp.data or []
    result = []
    for deck in decks:
        total_resp = (
            supabase.table("flashcards")
            .select("id", count="exact")
            .eq("deck_id", deck["id"])
            .eq("status", "active")
            .execute()
        )
        result.append({**deck, "total": total_resp.count or 0, "due_count": 0, "class_ids": [], "class_names": []})
    return result


def create_student_deck(student_id: str, data: dict) -> dict:
    data.pop("class_ids", None)
    row = {
        "student_id": student_id,
        "name": data["name"],
        "description": data.get("description"),
        "specialty": data.get("specialty"),
    }
    resp = supabase.table("flashcard_decks").insert(row).execute()
    deck = resp.data[0]
    return {**deck, "total": 0, "due_count": 0, "class_ids": [], "class_names": []}


def update_student_deck(deck_id: str, student_id: str, data: dict) -> dict:
    data.pop("class_ids", None)
    existing = (
        supabase.table("flashcard_decks")
        .select("id")
        .eq("id", deck_id)
        .eq("student_id", student_id)
        .execute()
    )
    if not existing.data:
        raise ValueError("Deck não encontrado ou sem permissão")
    if data:
        resp = supabase.table("flashcard_decks").update(data).eq("id", deck_id).execute()
        updated = resp.data[0]
    else:
        updated = supabase.table("flashcard_decks").select("*").eq("id", deck_id).execute().data[0]
    total_resp = (
        supabase.table("flashcards")
        .select("id", count="exact")
        .eq("deck_id", deck_id)
        .eq("status", "active")
        .execute()
    )
    return {**updated, "total": total_resp.count or 0, "due_count": 0, "class_ids": [], "class_names": []}


def delete_student_deck(deck_id: str, student_id: str) -> None:
    existing = (
        supabase.table("flashcard_decks")
        .select("id")
        .eq("id", deck_id)
        .eq("student_id", student_id)
        .execute()
    )
    if not existing.data:
        raise ValueError("Deck não encontrado ou sem permissão")
    supabase.table("flashcards").delete().eq("deck_id", deck_id).execute()
    supabase.table("flashcard_decks").delete().eq("id", deck_id).execute()


# ── Student CRUD — Cards ──────────────────────────────────────────────────────

def get_student_deck_cards(deck_id: str, student_id: str) -> list[dict]:
    existing = (
        supabase.table("flashcard_decks")
        .select("id")
        .eq("id", deck_id)
        .eq("student_id", student_id)
        .execute()
    )
    if not existing.data:
        raise ValueError("Deck não encontrado ou sem permissão")
    resp = (
        supabase.table("flashcards")
        .select("id, deck_id, front, back, hint, difficulty, tags, status")
        .eq("deck_id", deck_id)
        .order("created_at", desc=False)
        .execute()
    )
    return resp.data or []


def create_student_card(deck_id: str, student_id: str, data: dict) -> dict:
    existing = (
        supabase.table("flashcard_decks")
        .select("id")
        .eq("id", deck_id)
        .eq("student_id", student_id)
        .execute()
    )
    if not existing.data:
        raise ValueError("Deck não encontrado ou sem permissão")
    row = {
        "deck_id": deck_id,
        "front": data["front"],
        "back": data["back"],
        "hint": data.get("hint"),
        "difficulty": data.get("difficulty", "medium"),
        "tags": data.get("tags") or [],
        "status": "active",
    }
    resp = supabase.table("flashcards").insert(row).execute()
    return resp.data[0]


def update_student_card(card_id: str, student_id: str, data: dict) -> dict:
    card_resp = supabase.table("flashcards").select("deck_id").eq("id", card_id).execute()
    if not card_resp.data:
        raise ValueError("Card não encontrado")
    deck_id = card_resp.data[0]["deck_id"]
    deck_resp = (
        supabase.table("flashcard_decks")
        .select("id")
        .eq("id", deck_id)
        .eq("student_id", student_id)
        .execute()
    )
    if not deck_resp.data:
        raise ValueError("Sem permissão para editar este card")
    resp = supabase.table("flashcards").update(data).eq("id", card_id).execute()
    return resp.data[0]


def delete_student_card(card_id: str, student_id: str) -> None:
    card_resp = supabase.table("flashcards").select("deck_id").eq("id", card_id).execute()
    if not card_resp.data:
        raise ValueError("Card não encontrado")
    deck_id = card_resp.data[0]["deck_id"]
    deck_resp = (
        supabase.table("flashcard_decks")
        .select("id")
        .eq("id", deck_id)
        .eq("student_id", student_id)
        .execute()
    )
    if not deck_resp.data:
        raise ValueError("Sem permissão para deletar este card")
    supabase.table("flashcard_reviews").delete().eq("flashcard_id", card_id).execute()
    supabase.table("flashcards").delete().eq("id", card_id).execute()


# ── Geração de Flashcards via IA ──────────────────────────────────────────────

_FLASHCARD_GENERATION_FALLBACK = """\
Você é um especialista em educação médica e aprendizado espaçado (spaced repetition).

Com base no caso clínico abaixo, gere flashcards para revisar os conceitos mais importantes que o estudante deve memorizar.

CASO CLÍNICO:
{case_summary}

CONVERSA DA ANAMNESE (use para identificar lacunas do aluno):
{conversation_summary}

GERE um JSON válido com EXATAMENTE esta estrutura:
{{
  "flashcards": [
    {{
      "frente": "<pergunta direta e objetiva>",
      "verso": "<resposta concisa, máximo 3 linhas>",
      "categoria": "<Semiologia | Fisiopatologia | Diagnóstico | Conduta | Farmacologia>"
    }}
  ]
}}

REGRAS:
- Gere entre 8 e 15 flashcards por caso.
- Priorize conceitos que o estudante provavelmente erraria em prova.
- Frentes devem ser perguntas clínicas diretas — evite perguntas teóricas abstratas.
- Versos devem ser respostas memoráveis, não textos longos.
- Varie as categorias para cobrir diferentes aspectos do caso.
- Inclua pelo menos 1 flashcard sobre diagnósticos diferenciais e 1 sobre conduta.
- Responda APENAS o JSON, sem texto adicional.\
"""


def generate_flashcards_from_conversation(
    conversation_id: str,
    student_id: str,
    deck_name: str,
    existing_deck_id: str | None = None,
) -> dict:
    """
    Gera flashcards via GPT a partir de uma conversa de anamnese.
    Cria (ou reutiliza) um deck pessoal do aluno e insere os cards gerados.
    Retorna dict com deck_id, deck_name, cards_created e specialty.
    """
    import json

    from app.services.openai_service import complete_json, get_prompt

    # ── 1. Busca dados da conversa e do caso vinculado ─────────────────────────
    messages_res = (
        supabase.table("messages")
        .select("role, content")
        .eq("conversation_id", conversation_id)
        .order("timestamp")
        .execute()
    )
    raw_messages = messages_res.data or []

    # Monta resumo da conversa (apenas user e assistant, sem sistema/SOAP)
    conv_lines = []
    for m in raw_messages:
        role = m.get("role", "")
        content = m.get("content", "").strip()
        if role not in ("user", "assistant"):
            continue
        if content.startswith("[SOAP_SUBMISSION]") or "[MODO AVALIADOR" in content:
            break
        if role == "user" and conv_lines == []:
            continue  # ignora patient_prompt inicial
        label = "Estudante" if role == "user" else "Paciente"
        conv_lines.append(f"{label}: {content}")
    conversation_summary = "\n".join(conv_lines[:60])  # limita para não exceder tokens

    # Dados do caso vinculado (specialty + summary)
    case_summary = ""
    specialty = None
    try:
        attempt_res = (
            supabase.table("case_attempts")
            .select("case_id")
            .eq("conversation_id", conversation_id)
            .limit(1)
            .execute()
        )
        if attempt_res.data:
            case_id = attempt_res.data[0]["case_id"]
            case_res = (
                supabase.table("cases")
                .select("title, specialty, summary")
                .eq("id", case_id)
                .single()
                .execute()
            )
            if case_res.data:
                c = case_res.data
                specialty = c.get("specialty")
                case_summary = (
                    f"Título: {c.get('title', '')}\n"
                    f"Especialidade: {specialty or 'Não informada'}\n"
                    f"Resumo: {c.get('summary') or 'Não disponível'}"
                )
    except Exception as e:
        logger.warning(f"[FlashcardAI] Erro ao buscar caso da conversa {conversation_id}: {e}")

    if not case_summary:
        case_summary = "Caso clínico de anamnese simulada."

    # ── 2. Monta prompt e chama GPT ───────────────────────────────────────────
    system_prompt = get_prompt(
        "flashcard-generation-prompt",
        case_summary=case_summary,
        conversation_summary=conversation_summary or "Conversa não disponível.",
    )
    if not system_prompt:
        system_prompt = _FLASHCARD_GENERATION_FALLBACK.format(
            case_summary=case_summary,
            conversation_summary=conversation_summary or "Conversa não disponível.",
        )

    raw_json = complete_json(
        messages=[{"role": "user", "content": system_prompt}],
        max_tokens=2000,
        trace_name="flashcard_generation",
    )

    try:
        parsed = json.loads(raw_json)
        cards_data = parsed.get("flashcards", [])
    except Exception as e:
        logger.error(f"[FlashcardAI] JSON inválido do GPT: {e}\nRaw: {raw_json[:300]}")
        raise ValueError("A IA retornou um formato inválido. Tente novamente.") from e

    if not cards_data:
        raise ValueError("Nenhum flashcard foi gerado. Tente novamente.")

    # ── 3. Cria ou reutiliza o deck pessoal do aluno ──────────────────────────
    deck_id = existing_deck_id

    if not deck_id:
        new_deck = supabase.table("flashcard_decks").insert({
            "name": deck_name,
            "description": "Gerado automaticamente pela IA a partir de uma conversa de anamnese.",
            "specialty": specialty,
            "student_id": student_id,
        }).execute()
        if not new_deck.data:
            raise ValueError("Erro ao criar deck pessoal.")
        deck_id = new_deck.data[0]["id"]
    else:
        # Verifica que o deck pertence ao aluno
        check = (
            supabase.table("flashcard_decks")
            .select("id")
            .eq("id", deck_id)
            .eq("student_id", student_id)
            .execute()
        )
        if not check.data:
            raise ValueError("Deck não encontrado ou sem permissão.")

    # ── 4. Insere os cards no deck ────────────────────────────────────────────
    cards_to_insert = []
    for card in cards_data:
        front = str(card.get("frente") or card.get("front") or "").strip()
        back = str(card.get("verso") or card.get("back") or "").strip()
        categoria = str(card.get("categoria") or card.get("category") or "").strip()
        if not front or not back:
            continue
        cards_to_insert.append({
            "deck_id": deck_id,
            "front": front,
            "back": back,
            "hint": categoria or None,
            "difficulty": "medium",
            "status": "active",
            "tags": [categoria] if categoria else [],
        })

    if cards_to_insert:
        supabase.table("flashcards").insert(cards_to_insert).execute()

    return {
        "deck_id": deck_id,
        "deck_name": deck_name,
        "cards_created": len(cards_to_insert),
        "specialty": specialty,
    }
