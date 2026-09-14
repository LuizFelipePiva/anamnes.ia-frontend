from __future__ import annotations

QUESTION_SOURCE_TYPE = "question_error"
ERROR_DECK_KIND = "question_errors"


def _normalize_specialty(value: str | None) -> str:
    normalized = (value or "").strip()
    return normalized or "Geral"


def _format_front(question: dict) -> str:
    lines = [question["statement"].strip(), ""]
    for key, text in (question.get("options") or {}).items():
        lines.append(f"{key}) {text}")
    return "\n".join(lines).strip()


def _format_back(question: dict) -> str:
    correct_key = question["correct_answer"].strip().upper()
    correct_text = (question.get("options") or {}).get(correct_key, "")
    back = f"Resposta correta: {correct_key}) {correct_text}".rstrip()
    explanation = (question.get("explanation") or "").strip()
    if explanation:
        back += f"\n\n{explanation}"
    return back


def _find_existing_source(sb, student_id: str, question_id: str) -> dict | None:
    rows = (
        sb.table("flashcard_sources")
        .select("flashcard_id")
        .eq("student_id", student_id)
        .eq("source_type", QUESTION_SOURCE_TYPE)
        .eq("source_id", question_id)
        .limit(1)
        .execute()
    ).data or []
    if not rows:
        return None

    card_rows = (
        sb.table("flashcards")
        .select("id, deck_id")
        .eq("id", rows[0]["flashcard_id"])
        .limit(1)
        .execute()
    ).data or []
    return card_rows[0] if card_rows else None


def _get_or_create_error_deck(sb, student_id: str, specialty: str) -> dict:
    def find() -> dict | None:
        rows = (
            sb.table("flashcard_decks")
            .select("id")
            .eq("student_id", student_id)
            .eq("specialty", specialty)
            .eq("kind", ERROR_DECK_KIND)
            .limit(1)
            .execute()
        ).data or []
        return rows[0] if rows else None

    existing = find()
    if existing:
        return existing

    try:
        rows = (
            sb.table("flashcard_decks")
            .insert(
                {
                    "student_id": student_id,
                    "name": f"Erros — {specialty}",
                    "description": "Revisão automática de questões respondidas incorretamente.",
                    "specialty": specialty,
                    "kind": ERROR_DECK_KIND,
                }
            )
            .execute()
        ).data or []
        return rows[0]
    except Exception:
        raced = find()
        if raced:
            return raced
        raise


def ensure_error_flashcard(sb, *, student_id: str, question_id: str) -> dict:
    existing = _find_existing_source(sb, student_id, question_id)
    if existing:
        return {
            "created": False,
            "deck_id": existing["deck_id"],
            "flashcard_id": existing["id"],
        }

    question_rows = (
        sb.table("questions_bank")
        .select(
            "id, statement, options, correct_answer, explanation, specialty, subspecialty"
        )
        .eq("id", question_id)
        .limit(1)
        .execute()
    ).data or []
    if not question_rows:
        raise LookupError("Questão não encontrada")

    question = question_rows[0]
    specialty = _normalize_specialty(question.get("specialty"))
    deck = _get_or_create_error_deck(sb, student_id, specialty)

    tags = ["questao-errada"]
    subspecialty = (question.get("subspecialty") or "").strip()
    if subspecialty:
        tags.append(subspecialty)

    card_rows = (
        sb.table("flashcards")
        .insert(
            {
                "deck_id": deck["id"],
                "created_by": student_id,
                "front": _format_front(question),
                "back": _format_back(question),
                "hint": None,
                "tags": tags,
                "specialty": specialty,
                "difficulty": "medium",
                "ai_generated": False,
                "status": "active",
            }
        )
        .execute()
    ).data or []
    card = card_rows[0]

    source_row = {
        "flashcard_id": card["id"],
        "student_id": student_id,
        "source_type": QUESTION_SOURCE_TYPE,
        "source_id": question_id,
        "source_meta": {
            "specialty": specialty,
            "subspecialty": subspecialty or None,
        },
    }

    try:
        sb.table("flashcard_sources").insert(source_row).execute()
    except Exception:
        sb.table("flashcards").delete().eq("id", card["id"]).execute()
        raced = _find_existing_source(sb, student_id, question_id)
        if raced:
            return {
                "created": False,
                "deck_id": raced["deck_id"],
                "flashcard_id": raced["id"],
            }
        raise

    return {
        "created": True,
        "deck_id": deck["id"],
        "flashcard_id": card["id"],
    }
