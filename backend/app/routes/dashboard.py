"""
Rotas para Dashboard do Professor — métricas agregadas.
"""
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.auth.guards import verify_teacher
from app.db.supabase import get_supabase_client
from app.models.schemas import CaseStats, DashboardStats, StudentStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _teacher_class_ids(sb, teacher_id: str) -> list[str]:
    """Turmas visíveis ao professor — próprias + compartilhadas via class_teachers."""
    owned = sb.table("classes").select("id").eq("teacher_id", teacher_id).execute()
    shared = sb.table("class_teachers").select("class_id").eq("teacher_id", teacher_id).execute()
    return list({c["id"] for c in (owned.data or [])} | {r["class_id"] for r in (shared.data or [])})


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(payload=Depends(verify_teacher)):
    """
    Retorna métricas agregadas do professor:
    total de turmas, alunos, casos, tentativas, taxa de conclusão, média de notas.
    """
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    # Total de turmas — próprias + compartilhadas (consistente com /students e /history)
    class_ids = _teacher_class_ids(sb, teacher_id)
    total_classes = len(class_ids)

    # Total de alunos únicos nas turmas do professor
    total_students = 0
    if class_ids:
        students = sb.table("class_students") \
            .select("student_id") \
            .in_("class_id", class_ids) \
            .execute()
        unique_students = set(s["student_id"] for s in (students.data or []))
        total_students = len(unique_students)

    # Total de casos (exclui stubs do Chat IA)
    cases = sb.table("cases").select("id, form_data").eq("teacher_id", teacher_id).execute()
    filtered_cases = [c for c in (cases.data or []) if (c.get("form_data") or {}).get("source") != "ai_generated"]
    total_cases = len(filtered_cases)
    case_ids = [c["id"] for c in filtered_cases]

    # Tentativas nos casos do professor
    total_attempts = 0
    completed_attempts = 0
    total_score = 0
    total_duration = 0
    scored_count = 0

    if case_ids:
        attempts = sb.table("case_attempts") \
            .select("status, score, duration_seconds") \
            .in_("case_id", case_ids) \
            .execute()

        for a in (attempts.data or []):
            total_attempts += 1
            if a["status"] == "completed":
                completed_attempts += 1
                if a.get("score") is not None:
                    total_score += a["score"]
                    scored_count += 1
                if a.get("duration_seconds"):
                    total_duration += a["duration_seconds"]

    completion_rate = (completed_attempts / total_attempts * 100) if total_attempts > 0 else 0
    average_score = (total_score / scored_count) if scored_count > 0 else 0
    average_duration = (total_duration // completed_attempts) if completed_attempts > 0 else 0

    return DashboardStats(
        total_classes=total_classes,
        total_students=total_students,
        total_cases=total_cases,
        total_attempts=total_attempts,
        completed_attempts=completed_attempts,
        completion_rate=round(completion_rate, 1),
        average_score=round(average_score, 1),
        average_duration_seconds=average_duration,
    )


@router.get("/cases", response_model=list[CaseStats])
def get_cases_stats(payload=Depends(verify_teacher)):
    """Retorna estatísticas por caso do professor."""
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    cases = sb.table("cases").select("id, title").eq("teacher_id", teacher_id).execute()
    if not cases.data:
        return []

    case_ids = [c["id"] for c in cases.data]

    attempts = sb.table("case_attempts") \
        .select("case_id, status, score, duration_seconds") \
        .in_("case_id", case_ids) \
        .execute()

    # Agrupa por caso
    stats_map = {}
    for c in cases.data:
        stats_map[c["id"]] = {
            "case_id": c["id"],
            "title": c["title"],
            "attempts": 0,
            "completed": 0,
            "total_score": 0,
            "total_duration": 0,
            "scored_count": 0,
        }

    for a in (attempts.data or []):
        cid = a["case_id"]
        if cid in stats_map:
            stats_map[cid]["attempts"] += 1
            if a["status"] == "completed":
                stats_map[cid]["completed"] += 1
                if a.get("score") is not None:
                    stats_map[cid]["total_score"] += a["score"]
                    stats_map[cid]["scored_count"] += 1
                if a.get("duration_seconds"):
                    stats_map[cid]["total_duration"] += a["duration_seconds"]

    result = []
    for s in stats_map.values():
        result.append(CaseStats(
            case_id=s["case_id"],
            title=s["title"],
            attempts=s["attempts"],
            completed=s["completed"],
            average_score=round(s["total_score"] / s["scored_count"], 1) if s["scored_count"] else 0,
            average_duration=s["total_duration"] // s["completed"] if s["completed"] else 0,
        ))

    return result


@router.get("/students", response_model=list[StudentStats])
def get_students_stats(payload=Depends(verify_teacher)):
    """Retorna estatísticas por aluno das turmas do professor."""
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    # Turmas do professor — próprias + compartilhadas via class_teachers
    class_ids = _teacher_class_ids(sb, teacher_id)
    if not class_ids:
        return []

    # Alunos nessas turmas (com class_id para saber em qual turma cada aluno está)
    enrollments = sb.table("class_students") \
        .select("student_id, class_id, users(id, name, email)") \
        .in_("class_id", class_ids) \
        .execute()

    if not enrollments.data:
        return []

    # Deduplica alunos e mapeia student_id → classes
    students_map = {}
    student_classes: dict[str, list[str]] = {}  # student_id → [class_id]
    for e in enrollments.data:
        user = e.get("users", {})
        if user:
            sid = user["id"]
            cid = e.get("class_id")
            if sid not in students_map:
                students_map[sid] = {
                    "student_id": sid,
                    "name": user.get("name", ""),
                    "email": user.get("email", ""),
                }
            if cid:
                student_classes.setdefault(sid, []).append(cid)

    student_ids = list(students_map.keys())

    # ── 1. completed (global) e last_activity (global, inclui Chat IA) ──────────
    global_stats: dict[str, dict] = {
        sid: {"completed": 0, "last": None}
        for sid in student_ids
    }

    all_attempts_res = sb.table("case_attempts") \
        .select("student_id, status, started_at") \
        .in_("student_id", student_ids) \
        .execute()

    for a in (all_attempts_res.data or []):
        sid = a["student_id"]
        if sid not in global_stats:
            continue
        if a["status"] == "completed":
            global_stats[sid]["completed"] += 1
        ts = a.get("started_at")
        if ts and (not global_stats[sid]["last"] or ts > global_stats[sid]["last"]):
            global_stats[sid]["last"] = ts

    # ── 2. Média — apenas tentativas concluídas em casos atribuídos às turmas ──
    avg_stats: dict[str, dict] = {
        sid: {"total_score": 0, "scored": 0}
        for sid in student_ids
    }

    teacher_attempts_count: dict[str, int] = {sid: 0 for sid in student_ids}

    # ── 3. Por turma: casos concluídos atribuídos a cada turma do professor ────
    all_assignments = sb.table("case_assignments") \
        .select("case_id, class_id") \
        .in_("class_id", class_ids) \
        .execute()
    all_case_to_classes: dict[str, list[str]] = {}
    for a in (all_assignments.data or []):
        all_case_to_classes.setdefault(a["case_id"], []).append(a["class_id"])

    completed_by_class: dict[str, dict[str, int]] = {sid: {} for sid in student_ids}

    all_assigned_case_ids = list(all_case_to_classes.keys())
    if all_assigned_case_ids:
        class_attempts = sb.table("case_attempts") \
            .select("student_id, case_id, status, score") \
            .in_("student_id", student_ids) \
            .in_("case_id", all_assigned_case_ids) \
            .execute()

        for a in (class_attempts.data or []):
            sid = a["student_id"]
            if sid not in completed_by_class:
                continue
            # conta tentativas de qualquer status em casos atribuídos (exclui Chat IA livre)
            if sid in teacher_attempts_count:
                teacher_attempts_count[sid] += 1
            if a["status"] != "completed":
                continue
            for cls_id in all_case_to_classes.get(a["case_id"], []):
                if cls_id in student_classes.get(sid, []):
                    completed_by_class[sid][cls_id] = completed_by_class[sid].get(cls_id, 0) + 1
            if a.get("score") is not None:
                avg_stats[sid]["total_score"] += a["score"]
                avg_stats[sid]["scored"] += 1

    # ── Monta resultado ───────────────────────────────────────────────────────
    result = []
    for sid, info in students_map.items():
        g = global_stats[sid]
        avg = avg_stats[sid]
        result.append(StudentStats(
            student_id=info["student_id"],
            name=info["name"],
            email=info["email"],
            attempts=teacher_attempts_count.get(sid, 0),
            completed=g["completed"],
            completed_by_class=completed_by_class.get(sid, {}),
            average_score=round(avg["total_score"] / avg["scored"], 1) if avg["scored"] else 0,
            last_activity=g["last"],
        ))

    return result


@router.get("/students/{student_id}/history")
def get_student_history(student_id: str, payload=Depends(verify_teacher)):
    """Retorna histórico de tentativas de um aluno específico."""
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    # Verifica se o aluno está em alguma turma do professor (próprias + compartilhadas)
    class_ids = _teacher_class_ids(sb, teacher_id)
    if not class_ids:
        raise HTTPException(status_code=404, detail="Nenhuma turma encontrada")

    enrolled = sb.table("class_students") \
        .select("id") \
        .eq("student_id", student_id) \
        .in_("class_id", class_ids) \
        .execute()

    if not enrolled.data:
        raise HTTPException(status_code=403, detail="Aluno não está em suas turmas")

    # Casos do professor
    cases = sb.table("cases").select("id").eq("teacher_id", teacher_id).execute()
    case_ids = [c["id"] for c in (cases.data or [])]

    if not case_ids:
        return []

    # Tentativas do aluno nos casos do professor
    attempts = sb.table("case_attempts") \
        .select("*, cases(title, specialty, difficulty)") \
        .eq("student_id", student_id) \
        .in_("case_id", case_ids) \
        .order("started_at", desc=True) \
        .execute()

    return attempts.data or []


@router.get("/weekly")
def get_weekly_stats(payload=Depends(verify_teacher)):
    """
    Retorna médias semanais das tentativas concluídas nos casos do professor
    (últimas 10 semanas com atividade).
    """
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    cases = sb.table("cases").select("id").eq("teacher_id", teacher_id).execute()
    if not cases.data:
        return []

    case_ids = [c["id"] for c in cases.data]

    attempts = (
        sb.table("case_attempts")
        .select("started_at, score")
        .in_("case_id", case_ids)
        .eq("status", "completed")
        .not_.is_("score", "null")
        .not_.is_("started_at", "null")
        .execute()
    )

    week_map: dict = defaultdict(list)
    for a in (attempts.data or []):
        try:
            dt = datetime.fromisoformat(a["started_at"].replace("Z", "+00:00"))
            week_label = f"{dt.isocalendar()[0]}-W{dt.isocalendar()[1]:02d}"
            week_map[week_label].append(a["score"])
        except Exception:
            pass

    sorted_weeks = sorted(week_map.keys())[-10:]
    return [
        {
            "week": w,
            "avg_score": round(sum(week_map[w]) / len(week_map[w]), 1),
            "attempts": len(week_map[w]),
        }
        for w in sorted_weeks
    ]
