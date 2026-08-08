"""
Serviço do banco de questões (questions_bank) — listagem sem gabarito para o
aluno, correção de resposta e CRUD/importação/upload de imagem para o admin.
Toda escrita passa por aqui (RLS bloqueia escrita direta do browser).
"""
import uuid

from supabase import Client

PUBLIC_FIELDS = "id, statement, options, specialty, subspecialty, image_url, created_at"
IMAGE_BUCKET = "question-images"
ALLOWED_IMAGE_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
}


# ── Aluno ─────────────────────────────────────────────────────────────────────

def list_public_questions(sb: Client, limit: int = 50, offset: int = 0) -> list[dict]:
    """Lista questões sem correct_answer/explanation (gabarito nunca vai ao browser)."""
    resp = (
        sb.table("questions_bank")
        .select(PUBLIC_FIELDS)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return resp.data or []


def check_answer(sb: Client, question_id: str, answer: str) -> dict:
    """Corrige a resposta do aluno e só então revela gabarito e explicação."""
    resp = (
        sb.table("questions_bank")
        .select("correct_answer, explanation")
        .eq("id", question_id)
        .execute()
    )
    if not resp.data:
        raise ValueError("Questão não encontrada")
    row = resp.data[0]
    return {
        "correct": answer.strip().upper() == row["correct_answer"].strip().upper(),
        "correct_answer": row["correct_answer"],
        "explanation": row.get("explanation"),
    }


# ── Admin ─────────────────────────────────────────────────────────────────────

def admin_list_questions(sb: Client) -> list[dict]:
    resp = sb.table("questions_bank").select("*").order("created_at", desc=True).execute()
    return resp.data or []


def _validate_answer_in_options(data: dict) -> None:
    options = data.get("options")
    correct = data.get("correct_answer")
    if options is not None and correct is not None and correct not in options:
        raise ValueError("correct_answer deve ser uma das chaves de options")


def create_question(sb: Client, data: dict) -> dict:
    _validate_answer_in_options(data)
    resp = sb.table("questions_bank").insert(data).execute()
    return resp.data[0]


def update_question(sb: Client, question_id: str, data: dict) -> dict:
    if not data:
        raise ValueError("Nenhum campo para atualizar")
    current = sb.table("questions_bank").select("options, correct_answer").eq("id", question_id).execute()
    if not current.data:
        raise LookupError("Questão não encontrada")
    merged = {**current.data[0], **data}
    _validate_answer_in_options(merged)
    resp = sb.table("questions_bank").update(data).eq("id", question_id).execute()
    return resp.data[0]


def delete_question(sb: Client, question_id: str) -> None:
    resp = sb.table("questions_bank").delete().eq("id", question_id).execute()
    if not resp.data:
        raise LookupError("Questão não encontrada")


def import_questions(sb: Client, items: list[dict]) -> int:
    """Importa questões em lote aceitando chaves em pt-BR ou en."""
    payloads = []
    for item in items:
        payload = {
            "statement": item.get("enunciado") or item.get("statement") or "",
            "options": item.get("alternativas") or item.get("options") or {},
            "correct_answer": item.get("resposta_correta") or item.get("correct_answer") or "",
            "explanation": item.get("explicacao") or item.get("explanation") or "",
            "specialty": item.get("especialidade") or item.get("specialty") or "Geral",
            "subspecialty": item.get("subespecialidade") or item.get("subspecialty") or "Geral",
            "image_url": None,
        }
        if not payload["statement"] or not payload["options"] or not payload["correct_answer"]:
            raise ValueError("Cada questão precisa de enunciado, alternativas e resposta_correta")
        _validate_answer_in_options(payload)
        payloads.append(payload)
    sb.table("questions_bank").insert(payloads).execute()
    return len(payloads)


def upload_question_image(sb: Client, content: bytes, content_type: str) -> str:
    """Sobe a imagem no bucket público question-images e retorna a URL pública."""
    ext = ALLOWED_IMAGE_TYPES.get(content_type)
    if ext is None:
        raise ValueError("Tipo de imagem não suportado (use png, jpeg, webp ou gif)")
    path = f"images/{uuid.uuid4().hex}.{ext}"
    sb.storage.from_(IMAGE_BUCKET).upload(path, content, {"content-type": content_type})
    # o SDK devolve a URL com "?" sobrando no final
    return sb.storage.from_(IMAGE_BUCKET).get_public_url(path).rstrip("?")
