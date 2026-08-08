"""
Serviço de Simulados — toda lógica de negócio:
  - criação (sorteia questões do banco por filtro de specialty/subspecialty)
  - início de tentativa (retorna questões sem gabarito)
  - registro de resposta por questão
  - finalização e cálculo de score
  - relatório completo (com gabarito e explicações)
  - listagem de simulados e tentativas
"""
import random
from datetime import UTC, datetime

from supabase import Client

# ─────────────────────────────────────────────────────────────────────────────
# Helpers internos
# ─────────────────────────────────────────────────────────────────────────────

def _now_utc() -> str:
    return datetime.now(UTC).isoformat()


def _sample_questions(
    sb: Client,
    num_questions: int,
    specialty: str | None,
    subspecialty: str | None,
) -> list[dict]:
    """
    Sorteia `num_questions` questões do banco respeitando os filtros.
    Busca até 500 candidatas para ter margem de aleatoriedade.
    """
    query = (
        sb.table("questions_bank")
        .select("id")
        .limit(500)
    )
    if specialty:
        query = query.eq("specialty", specialty)
    if subspecialty:
        query = query.eq("subspecialty", subspecialty)

    resp = query.execute()
    rows = resp.data or []
    if not rows:
        raise ValueError("Nenhuma questão encontrada para os filtros informados")

    total = len(rows)
    n = min(num_questions, total)
    chosen_ids = [r["id"] for r in random.sample(rows, n)]
    return chosen_ids


def _fetch_questions_public(sb: Client, question_ids: list[str]) -> list[dict]:
    """Busca questões pelo id SEM gabarito (campo correct_answer/explanation excluídos)."""
    resp = (
        sb.table("questions_bank")
        .select("id, statement, options, specialty, subspecialty, image_url, created_at")
        .in_("id", question_ids)
        .execute()
    )
    rows = resp.data or []
    # Mantém a ordem original dos ids (que é a ordem embaralhada)
    id_order = {qid: i for i, qid in enumerate(question_ids)}
    rows.sort(key=lambda r: id_order.get(r["id"], 9999))
    return rows


def is_student_in_class(sb: Client, student_id: str, class_id: str) -> bool:
    """Verifica se um aluno está matriculado numa turma."""
    resp = (
        sb.table("class_students")
        .select("class_id")
        .eq("student_id", student_id)
        .eq("class_id", class_id)
        .limit(1)
        .execute()
    )
    return bool(resp.data)


# ─────────────────────────────────────────────────────────────────────────────
# CRUD de simulados
# ─────────────────────────────────────────────────────────────────────────────

def create_simulado(sb: Client, data: dict, created_by: str) -> dict:
    """
    Cria o cabeçalho do simulado e sorteia questões.
    Retorna o simulado criado (sem as questões).
    """
    num_questions = data.get("num_questions", 40)
    specialty = data.get("specialty")
    subspecialty = data.get("subspecialty")

    # Sanitiza strings de filtro para evitar payloads excessivos
    if specialty and len(specialty) > 100:
        raise ValueError("specialty excede o tamanho permitido")
    if subspecialty and len(subspecialty) > 100:
        raise ValueError("subspecialty excede o tamanho permitido")

    # Valida class_id se fornecido
    class_id = data.get("class_id")
    if class_id:
        check = sb.table("classes").select("id").eq("id", class_id).execute()
        if not (check.data):
            raise LookupError("Turma não encontrada")

    # Sorteia as questões
    question_ids = _sample_questions(sb, num_questions, specialty, subspecialty)
    actual_count = len(question_ids)

    # Insere o simulado
    payload = {
        "title": data["title"],
        "description": data.get("description"),
        "specialty": specialty,
        "subspecialty": subspecialty,
        "num_questions": actual_count,
        "created_by": created_by,
        "class_id": class_id,
        "due_date": data.get("due_date"),
        "visibility": data.get("visibility", "privado"),
    }
    resp = sb.table("simulados").insert(payload).execute()
    simulado = resp.data[0]
    simulado_id = simulado["id"]

    # Insere as questões associadas
    sq_rows = [
        {"simulado_id": simulado_id, "question_id": qid, "position": i}
        for i, qid in enumerate(question_ids)
    ]
    sb.table("simulado_questions").insert(sq_rows).execute()

    return simulado


def list_simulados(sb: Client, user_id: str, role: str) -> list[dict]:
    """
    Lista simulados disponíveis para o usuário.
    - Aluno vê: seus próprios simulados livres + simulados atribuídos às suas turmas
    - Professor/Admin vê: todos os que criou
    """
    if role in ("teacher", "admin"):
        resp = (
            sb.table("simulados")
            .select("*")
            .eq("created_by", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    else:
        # Simulados livres criados pelo próprio aluno
        personal = (
            sb.table("simulados")
            .select("*")
            .eq("created_by", user_id)
            .order("created_at", desc=True)
            .execute()
        ).data or []

        # Simulados atribuídos via class_id das turmas do aluno
        class_resp = (
            sb.table("class_students")
            .select("class_id")
            .eq("student_id", user_id)
            .execute()
        )
        class_ids = [r["class_id"] for r in (class_resp.data or [])]

        class_simulados: list[dict] = []
        if class_ids:
            assigned = (
                sb.table("simulados")
                .select("*")
                .in_("class_id", class_ids)
                .order("created_at", desc=True)
                .execute()
            )
            class_simulados = assigned.data or []

        # Junta e deduplica por id
        seen: set[str] = set()
        combined: list[dict] = []
        for s in personal + class_simulados:
            if s["id"] not in seen:
                seen.add(s["id"])
                combined.append(s)
        return combined

    return resp.data or []


def get_simulado(sb: Client, simulado_id: str) -> dict:
    """Retorna o cabeçalho de um simulado ou levanta LookupError."""
    resp = sb.table("simulados").select("*").eq("id", simulado_id).execute()
    if not resp.data:
        raise LookupError("Simulado não encontrado")
    return resp.data[0]


def delete_simulado(sb: Client, simulado_id: str, user_id: str, role: str) -> None:
    """Remove simulado se o usuário for o criador (ou admin)."""
    simulado = get_simulado(sb, simulado_id)
    if role != "admin" and simulado["created_by"] != user_id:
        raise PermissionError("Você não tem permissão para remover este simulado")
    sb.table("simulados").delete().eq("id", simulado_id).execute()


# ─────────────────────────────────────────────────────────────────────────────
# Tentativas
# ─────────────────────────────────────────────────────────────────────────────

def start_attempt(sb: Client, simulado_id: str, student_id: str) -> dict:
    """
    Cria uma tentativa em aberto e retorna as questões sem gabarito.
    Impede múltiplas tentativas simultâneas no mesmo simulado.
    """
    # Verifica se simulado existe
    get_simulado(sb, simulado_id)

    # Evita tentativa duplicada in_progress
    existing = (
        sb.table("simulado_attempts")
        .select("id")
        .eq("simulado_id", simulado_id)
        .eq("student_id", student_id)
        .eq("status", "in_progress")
        .execute()
    )
    if existing.data:
        # Retorna a tentativa existente
        attempt_id = existing.data[0]["id"]
    else:
        att_resp = sb.table("simulado_attempts").insert({
            "simulado_id": simulado_id,
            "student_id": student_id,
            "status": "in_progress",
        }).execute()
        attempt_id = att_resp.data[0]["id"]

    # Busca questões na ordem definida (sem gabarito)
    sq_resp = (
        sb.table("simulado_questions")
        .select("question_id, position")
        .eq("simulado_id", simulado_id)
        .order("position")
        .execute()
    )
    question_ids = [r["question_id"] for r in (sq_resp.data or [])]
    questions = _fetch_questions_public(sb, question_ids)

    return {
        "attempt_id": attempt_id,
        "simulado_id": simulado_id,
        "questions": questions,
    }


def record_answer(
    sb: Client,
    simulado_id: str,
    attempt_id: str,
    student_id: str,
    question_id: str,
    selected_answer: str,
) -> dict:
    """
    Registra a resposta de uma questão durante a tentativa.
    Verifica o gabarito no backend e persiste is_correct.
    Não revela o gabarito ao chamador.
    """
    # Valida tentativa
    att_resp = (
        sb.table("simulado_attempts")
        .select("status, student_id")
        .eq("id", attempt_id)
        .eq("simulado_id", simulado_id)
        .execute()
    )
    if not att_resp.data:
        raise LookupError("Tentativa não encontrada")
    att = att_resp.data[0]
    if att["student_id"] != student_id:
        raise PermissionError("Tentativa pertence a outro aluno")
    if att["status"] != "in_progress":
        raise ValueError("Tentativa já finalizada")

    # Verifica gabarito
    q_resp = (
        sb.table("questions_bank")
        .select("correct_answer")
        .eq("id", question_id)
        .execute()
    )
    if not q_resp.data:
        raise LookupError("Questão não encontrada")

    # Verifica que a questão pertence ao simulado (prevenção de IDOR cruzado)
    membership = (
        sb.table("simulado_questions")
        .select("question_id")
        .eq("simulado_id", simulado_id)
        .eq("question_id", question_id)
        .limit(1)
        .execute()
    )
    if not membership.data:
        raise PermissionError("Questão não faz parte deste simulado")

    correct = q_resp.data[0]["correct_answer"]
    is_correct = selected_answer.strip().upper() == correct.strip().upper()

    # Upsert: se já respondeu esta questão, atualiza
    existing_ans = (
        sb.table("simulado_answers")
        .select("id")
        .eq("attempt_id", attempt_id)
        .eq("question_id", question_id)
        .execute()
    )
    if existing_ans.data:
        sb.table("simulado_answers").update({
            "selected_answer": selected_answer,
            "is_correct": is_correct,
            "answered_at": _now_utc(),
        }).eq("id", existing_ans.data[0]["id"]).execute()
    else:
        sb.table("simulado_answers").insert({
            "attempt_id": attempt_id,
            "question_id": question_id,
            "selected_answer": selected_answer,
            "is_correct": is_correct,
        }).execute()

    return {"recorded": True}


def finish_attempt(
    sb: Client,
    simulado_id: str,
    attempt_id: str,
    student_id: str,
    time_spent_seconds: int | None = None,
) -> dict:
    """
    Finaliza a tentativa, calcula o score e retorna o relatório completo.
    """
    # Valida tentativa
    att_resp = (
        sb.table("simulado_attempts")
        .select("*")
        .eq("id", attempt_id)
        .eq("simulado_id", simulado_id)
        .execute()
    )
    if not att_resp.data:
        raise LookupError("Tentativa não encontrada")
    att = att_resp.data[0]
    if att["student_id"] != student_id:
        raise PermissionError("Tentativa pertence a outro aluno")
    if att["status"] == "completed":
        # Idempotente: retorna o relatório já salvo
        return get_report(sb, simulado_id, attempt_id, student_id)

    # Busca respostas e total real do simulado
    ans_resp = (
        sb.table("simulado_answers")
        .select("is_correct")
        .eq("attempt_id", attempt_id)
        .execute()
    )
    answers = ans_resp.data or []
    num_correct = sum(1 for a in answers if a["is_correct"])

    # num_total = total de questões do simulado (não apenas as respondidas)
    sq_count = (
        sb.table("simulado_questions")
        .select("question_id", count="exact")
        .eq("simulado_id", simulado_id)
        .execute()
    )
    num_total = sq_count.count or len(answers)
    score = round((num_correct / num_total) * 100) if num_total > 0 else 0

    now = _now_utc()
    sb.table("simulado_attempts").update({
        "status": "completed",
        "score": score,
        "num_correct": num_correct,
        "num_total": num_total,
        "completed_at": now,
        "time_spent_seconds": time_spent_seconds,
    }).eq("id", attempt_id).execute()

    return get_report(sb, simulado_id, attempt_id, student_id)


def get_report(
    sb: Client,
    simulado_id: str,
    attempt_id: str,
    student_id: str,
) -> dict:
    """Monta e retorna o relatório completo de uma tentativa."""
    # Tentativa
    att_resp = (
        sb.table("simulado_attempts")
        .select("*")
        .eq("id", attempt_id)
        .eq("simulado_id", simulado_id)
        .execute()
    )
    if not att_resp.data:
        raise LookupError("Tentativa não encontrada")
    att = att_resp.data[0]
    if att["student_id"] != student_id:
        raise PermissionError("Acesso negado")

    # Cabeçalho do simulado
    sim = get_simulado(sb, simulado_id)

    # Respostas do aluno
    ans_resp = (
        sb.table("simulado_answers")
        .select("question_id, selected_answer, is_correct")
        .eq("attempt_id", attempt_id)
        .execute()
    )
    answers_by_qid = {a["question_id"]: a for a in (ans_resp.data or [])}

    # Questões do simulado (na ordem)
    sq_resp = (
        sb.table("simulado_questions")
        .select("question_id, position")
        .eq("simulado_id", simulado_id)
        .order("position")
        .execute()
    )
    question_ids = [r["question_id"] for r in (sq_resp.data or [])]

    # Busca questões COM gabarito (relatório pós-simulado pode revelar)
    q_resp = (
        sb.table("questions_bank")
        .select("id, statement, options, specialty, subspecialty, image_url, correct_answer, explanation")
        .in_("id", question_ids)
        .execute()
    )
    q_by_id = {q["id"]: q for q in (q_resp.data or [])}

    report_questions = []
    for qid in question_ids:
        q = q_by_id.get(qid)
        ans = answers_by_qid.get(qid)
        if q is None:
            continue
        report_questions.append({
            "question_id": qid,
            "statement": q["statement"],
            "options": q["options"],
            "image_url": q.get("image_url"),
            "specialty": q["specialty"],
            "subspecialty": q["subspecialty"],
            "selected_answer": ans["selected_answer"] if ans else "",
            "correct_answer": q["correct_answer"],
            "is_correct": ans["is_correct"] if ans else False,
            "explanation": q.get("explanation"),
        })

    return {
        "attempt_id": attempt_id,
        "simulado_id": simulado_id,
        "simulado_title": sim["title"],
        "status": att["status"],
        "score": att.get("score") or 0,
        "num_correct": att.get("num_correct") or 0,
        "num_total": att.get("num_total") or 0,
        "time_spent_seconds": att.get("time_spent_seconds"),
        "started_at": att["started_at"],
        "completed_at": att.get("completed_at"),
        "questions": report_questions,
    }


def list_attempts(sb: Client, simulado_id: str) -> list[dict]:
    """Listagem de todas as tentativas de um simulado (para professor/admin)."""
    resp = (
        sb.table("simulado_attempts")
        .select("*")
        .eq("simulado_id", simulado_id)
        .order("started_at", desc=True)
        .execute()
    )
    return resp.data or []


def get_my_attempts(sb: Client, student_id: str) -> list[dict]:
    """Histórico de tentativas do próprio aluno (todos os simulados)."""
    resp = (
        sb.table("simulado_attempts")
        .select("*")
        .eq("student_id", student_id)
        .order("started_at", desc=True)
        .execute()
    )
    return resp.data or []
