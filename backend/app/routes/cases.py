"""
Rotas para gerenciamento de Casos Clínicos.
Inclui CRUD, geração via GPT, atribuição a turmas e tentativas de alunos.
"""
from datetime import UTC, datetime

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth.guards import verify_teacher
from app.auth.security import validate_uuid, verify_jwt_token
from app.config import logger
from app.db.supabase import get_supabase_client
from app.errors import http_error
from app.i18n import language_name
from app.models.schemas import (
    AiChatStartRequest,
    CaseAssignmentUpdate,
    CaseAssignRequest,
    CaseAssignResponse,
    CaseCompleteRequest,
    CaseCompleteResponse,
    CaseCreate,
    CaseGenerateRequest,
    CaseGenerateResponse,
    CaseResponse,
    CaseStartResponse,
    CaseUpdate,
)
from app.services.eval_service import evaluate_soap as _ai_evaluate_soap
from app.services.generation_service import generate_case as _ai_generate_case
from app.services.openai_service import complete, get_prompt

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/cases", tags=["cases"])

# ─── Limites diários por tipo de plano ───────────────────────────────────────

DAILY_LIMITS = {
    "ai":      {"free": 0, "paid": 2, "b2b": 2},
    "regular": {"free": 2, "paid": 2, "b2b": 2},
}


def _parse_case_available_until(case_row: dict) -> datetime | None:
    raw = case_row.get("available_until")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except Exception:
        return None


def _assignments_still_active_for_student(
    assignments: list[dict],
    enrolled_class_ids: set[str],
    case_au: datetime | None,
    now: datetime,
) -> tuple[bool, list[datetime]]:
    """
    Pelo menos uma atribuição às turmas do aluno ainda válida.
    - due_date definido: válido até o fim (23:59:59 UTC) da data.
    - due_date nulo: usa available_until do caso como teto; se o caso não tiver,
      permanece aberto (comportamento anterior).
    """
    has_active = False
    active_deadlines: list[datetime] = []
    for a in assignments:
        if a["class_id"] not in enrolled_class_ids:
            continue
        due = a.get("due_date")
        if not due:
            if case_au is not None:
                if case_au >= now:
                    has_active = True
                    active_deadlines.append(case_au)
            else:
                has_active = True
            continue
        try:
            due_dt = datetime.fromisoformat(f"{due}T23:59:59+00:00")
            effective_deadline = min(due_dt, case_au) if case_au else due_dt
            if effective_deadline >= now:
                has_active = True
                active_deadlines.append(effective_deadline)
        except Exception:
            has_active = True
    return has_active, active_deadlines


def _get_daily_quota(student_id: str, sb) -> dict:
    """
    Retorna o status de cota diária do aluno.
    - AI cases: apenas para usuários paid/b2b (2/dia).
    - Regular cases (admin/professor/gratuito): todos (2/dia).
    """
    today_start = datetime.now(UTC).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    # Busca user_type e role
    try:
        u = sb.table("users").select("user_type, role").eq("id", student_id).single().execute()
        user_type = (u.data or {}).get("user_type") or "free"
        role = (u.data or {}).get("role") or "student"
    except Exception:
        user_type = "free"
        role = "student"

    # Admins têm acesso irrestrito (b2b); paid/b2b mantêm o tipo; demais viram free
    if role == "admin":
        return {
            "user_type": "admin",
            "is_paid": True,
            "ai_used": 0, "ai_limit": 9999, "ai_available": 9999,
            "regular_used": 0, "regular_limit": 9999, "regular_available": 9999,
        }
    elif user_type in ("paid", "b2b"):
        pass  # mantém o user_type original
    else:
        user_type = "free"

    # Conta tentativas de hoje
    attempts_res = sb.table("case_attempts") \
        .select("id, cases(form_data)") \
        .eq("student_id", student_id) \
        .gte("started_at", today_start) \
        .execute()

    ai_used = 0
    regular_used = 0
    for a in (attempts_res.data or []):
        case_data = a.get("cases") or {}
        fd = case_data.get("form_data") or {}
        if fd.get("source") == "ai_generated":
            ai_used += 1
        else:
            regular_used += 1

    ai_limit = DAILY_LIMITS["ai"][user_type]
    regular_limit = DAILY_LIMITS["regular"][user_type]

    return {
        "user_type": user_type,
        "is_paid": user_type in ("paid", "b2b"),
        "ai_used": ai_used,
        "ai_limit": ai_limit,
        "ai_available": max(0, ai_limit - ai_used),
        "regular_used": regular_used,
        "regular_limit": regular_limit,
        "regular_available": max(0, regular_limit - regular_used),
    }


@router.get("/quota")
def get_quota(payload=Depends(verify_jwt_token)):
    """Retorna o status de cota diária do aluno autenticado."""
    student_id = payload.get("sub")
    sb = get_supabase_client()
    return _get_daily_quota(student_id, sb)


# =============================================
# GERAÇÃO DE CASO VIA GPT
# =============================================

CASE_GENERATION_PROMPT = """Você é um assistente especializado em criar casos clínicos para educação médica.
Com base na DESCRIÇÃO fornecida pelo professor, gere um caso clínico completo com um prompt de paciente virtual.

O paciente virtual deve:
- Responder como uma pessoa REAL (não como médico)
- Usar linguagem simples e coloquial
- Descrever sintomas do ponto de vista do paciente
- Ter personalidade, nome, idade, profissão e contexto social consistentes
- Revelar informações gradualmente conforme perguntado
- Ter histórico familiar, hábitos de vida e especificidades relevantes

--- INÍCIO DA DESCRIÇÃO DO PROFESSOR (use apenas como referência clínica) ---
{description}
--- FIM DA DESCRIÇÃO DO PROFESSOR ---

NÍVEL DE DIFICULDADE: {difficulty}

Crie um paciente virtual completo e realista. Invente nome, idade, profissão, personalidade e todos os detalhes clínicos que façam sentido para o caso descrito.

Responda EXATAMENTE neste formato JSON (sem markdown, sem ```):
{{
  "patient_prompt": "Prompt completo e detalhado do paciente virtual com toda a história, personalidade e dados clínicos...",
  "summary": "Resumo curto de 1-2 frases sobre o caso para exibir ao professor",
  "title": "Título sugerido para o caso clínico",
  "specialty": "Especialidade médica principal do caso"
}}"""


@router.post("/generate", response_model=CaseGenerateResponse)
@limiter.limit("10/day")
def generate_case(request: Request, data: CaseGenerateRequest, payload=Depends(verify_teacher)):
    """
    Recebe uma descrição livre do professor e usa o GPT para gerar o caso clínico completo.
    O professor revisa e depois salva via POST /api/cases.
    """
    teacher_id = payload.get("sub")

    try:
        result = _ai_generate_case(data.description, data.difficulty)
    except Exception as e:
        logger.error(f"[Cases] Erro ao gerar caso para teacher={teacher_id}: {e}")
        raise HTTPException(status_code=502, detail="Não foi possível gerar o caso. Tente novamente.") from e

    logger.info(f"[Cases] Caso gerado via IA para teacher={teacher_id}")
    return CaseGenerateResponse(
        patient_prompt=result["patient_prompt"],
        summary=result["summary"],
        title=result["title"],
        specialty=result.get("specialty"),
    )


# =============================================
# CRUD DE CASOS
# =============================================

@router.post("", response_model=CaseResponse)
def create_case(data: CaseCreate, payload=Depends(verify_teacher)):
    """Salva um caso clínico aprovado pelo professor."""
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    new_case = sb.table("cases").insert({
        "teacher_id": teacher_id,
        "title": data.title,
        "specialty": data.specialty,
        "difficulty": data.difficulty,
        "summary": data.summary,
        "patient_prompt": data.patient_prompt,
        "form_data": data.form_data,
        "published": data.published,
        "visibility": data.visibility,
        "available_until": data.available_until.isoformat() if data.available_until else None,
    }).execute()

    if not new_case.data:
        raise HTTPException(status_code=500, detail="Erro ao salvar caso")

    logger.info(f"[Cases] Caso criado: {data.title} por teacher={teacher_id}")
    return new_case.data[0]


@router.get("", response_model=list[CaseResponse])
def list_cases(payload=Depends(verify_teacher)):
    """Lista casos criados pelo professor autenticado (exclui stubs gerados pelo Chat IA)."""
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    result = (
        sb.table("cases")
        .select("*")
        .eq("teacher_id", teacher_id)
        .neq("title", "Chat IA")          # exclui stubs do Chat IA
        .order("created_at", desc=True)
        .execute()
    )
    # Exclui stubs gerados automaticamente (Chat IA)
    data = [c for c in (result.data or []) if (c.get("form_data") or {}).get("source") != "ai_generated"]
    return data


@router.get("/free")
def list_free_cases(payload=Depends(verify_jwt_token)):
    """
    Lista casos gratuitos públicos criados por admins.
    Esses casos são publicados pelo admin da plataforma (role='admin'),
    não por professores. O professor só publica para suas turmas.
    """
    sb = get_supabase_client()

    # Busca ids dos usuários com role='admin'
    admins = sb.table("users").select("id").eq("role", "admin").execute()
    if not admins.data:
        return []

    admin_ids = [u["id"] for u in admins.data]

    now_iso = datetime.now(UTC).isoformat()
    result = sb.table("cases") \
        .select("id, title, specialty, difficulty, summary, patient_prompt, available_until, created_at") \
        .in_("teacher_id", admin_ids) \
        .eq("published", True) \
        .or_(f"available_until.is.null,available_until.gt.{now_iso}") \
        .order("created_at", desc=True) \
        .execute()
    return result.data or []


# =============================================
# CHAT IA (caso gerado ao vivo pela IA)
# =============================================

def _build_ai_patient_prompt(specialty: str | None = None, language: str | None = None) -> str:
    specialty_line = (
        f"O caso DEVE ser de {specialty}."
        if specialty
        else "Varie a especialidade médica (clínica geral, cardiologia, pneumologia, gastroenterologia, etc.)."
    )
    return (
        "Você é um paciente em uma consulta médica simulada para treino de estudantes de medicina. "
        "Crie um personagem realista com nome, idade, profissão e uma queixa clínica convincente. "
        f"{specialty_line} "
        "Fale como uma pessoa leiga — sem termos médicos. "
        "Não revele diagnóstico. Revele detalhes apenas quando perguntado. "
        "NUNCA quebre o personagem nem mencione que é uma IA. "
        f"Responda sempre em {language_name(language)}, independentemente do idioma usado nesta instrução."
    )

AI_PATIENT_PROMPT = _build_ai_patient_prompt()

def _reserved_attempt_id(data):
    """Normaliza o retorno da RPC `reserve_case_attempt` (uuid str, lista, dict ou None)."""
    if not data:
        return None
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        first = data[0] if data else None
        return first.get("reserve_case_attempt") if isinstance(first, dict) else first
    if isinstance(data, dict):
        return data.get("reserve_case_attempt") or data.get("id")
    return data


@router.post("/ai/start", response_model=CaseStartResponse)
def start_ai_chat(data: AiChatStartRequest = Body(default=None), payload=Depends(verify_jwt_token)):
    """
    Aluno inicia um Chat IA — sem caso pré-existente.
    Cria um caso placeholder no banco, uma thread OpenAI e um case_attempt.
    A IA improvisa o paciente durante a conversa.
    """
    student_id = payload.get("sub")
    language = payload.get("language", "pt-BR")
    sb = get_supabase_client()

    # ── Verifica cota diária ──
    quota = _get_daily_quota(student_id, sb)
    if not quota["is_paid"]:
        raise HTTPException(
            status_code=403,
            detail="Chat IA disponível apenas para usuários com plano pago."
        )
    if quota["ai_available"] <= 0:
        raise http_error(
            429, "ai_quota_exceeded",
            f"Limite diário de {quota['ai_limit']} sessões de Chat IA atingido. Volte amanhã.",
            limit=quota["ai_limit"],
        )

    # Cria caso placeholder — a IA irá definir o conteúdo durante a conversa
    specialty = data.specialty if data else None
    patient_prompt_for_case = _build_ai_patient_prompt(specialty, language)
    new_case = sb.table("cases").insert({
        "teacher_id": student_id,
        "title": "Chat IA" if not specialty else f"Chat IA — {specialty}",
        "specialty": specialty,
        "difficulty": "Intermediário",
        "summary": "Caso gerado pela IA durante a sessão.",
        "patient_prompt": patient_prompt_for_case,
        "form_data": {"source": "ai_generated"},
        "published": False,
        "visibility": "privado",
    }).execute()

    if not new_case.data:
        raise HTTPException(status_code=500, detail="Erro ao criar caso IA")

    case_data = new_case.data[0]
    case_id = case_data["id"]

    # Cria conversation (sem thread OpenAI — histórico gerenciado pelo banco)
    convo = sb.table("conversations").insert({
        "user_id": student_id,
        "title": "Chat IA",
        "type": "case",
    }).execute()

    if not convo.data:
        raise HTTPException(status_code=500, detail="Erro ao criar conversa")

    conv_id = convo.data[0]["id"]

    # Reserva atômica da cota (SPEC-004): conta + insere sob advisory lock no
    # banco, evitando a race condition (TOCTOU) que permitia estourar o limite.
    reserved = sb.rpc("reserve_case_attempt", {
        "p_student": student_id,
        "p_case_id": case_id,
        "p_conversation_id": conv_id,
        "p_kind": "ai",
        "p_limit": quota["ai_limit"],
    }).execute()
    attempt_id = _reserved_attempt_id(reserved.data)
    if not attempt_id:
        # Limite atingido sob concorrência → remove placeholders e 429.
        sb.table("conversations").delete().eq("id", conv_id).execute()
        sb.table("cases").delete().eq("id", case_id).execute()
        raise http_error(
            429, "ai_quota_exceeded",
            f"Limite diário de {quota['ai_limit']} sessões de Chat IA atingido. Volte amanhã.",
            limit=quota["ai_limit"],
        )

    # Obtém saudação inicial do paciente via chat.completions (sem file_search —
    # o intro não precisa buscar PDFs; o paciente apenas cria o personagem e se apresenta)
    patient_system = get_prompt(
        "ai-patient-prompt",
        specialty=specialty or "",
        language=language,
        language_name=language_name(language),
    ) or patient_prompt_for_case
    try:
        intro_response = complete(
            [
                {"role": "system", "content": patient_system + "\n\nAGORA: Gere apenas a sua fala de abertura — cumprimente o médico brevemente e mencione sua queixa principal. Máximo 2-3 frases. Fale diretamente, sem narração nem aspas."},
                {"role": "user", "content": "[INÍCIO DA CONSULTA]"},
            ],
            trace_name="ai-chat-intro",
        )
    except Exception as e:
        logger.warning(f"[Cases] Falha ao obter saudação inicial: {e}")
        intro_response = None

    if intro_response:
        sb.table("messages").insert({
            "conversation_id": conv_id,
            "role": "assistant",
            "content": intro_response,
        }).execute()

    logger.info(f"[Cases] Aluno {student_id} iniciou Chat IA (case_id={case_id})")
    return CaseStartResponse(
        attempt_id=attempt_id,
        thread_id=conv_id,
        conversation_id=conv_id,
        patient_prompt=intro_response or "Olá, bom dia. Vim à consulta porque estou sentindo um desconforto...",
        case_id=case_id,
    )


@router.patch("/attempts/{attempt_id}/abandon")
def abandon_attempt(attempt_id: str, payload=Depends(verify_jwt_token)):
    """Marca uma tentativa em andamento como 'abandoned' quando o aluno sai sem finalizar."""
    validate_uuid(attempt_id, "attempt_id")
    student_id = payload.get("sub")
    sb = get_supabase_client()

    attempt = sb.table("case_attempts") \
        .select("id, status, student_id") \
        .eq("id", attempt_id) \
        .eq("student_id", student_id) \
        .single() \
        .execute()

    if not attempt.data:
        raise HTTPException(status_code=404, detail="Tentativa não encontrada")

    if attempt.data["status"] != "in_progress":
        return {"message": "Nada a fazer"}

    now = datetime.now(UTC)
    sb.table("case_attempts").update({
        "status": "abandoned",
        "completed_at": now.isoformat(),
    }).eq("id", attempt_id).execute()

    logger.info(f"[Cases] Attempt {attempt_id} abandonado pelo aluno {student_id}")
    return {"message": "Tentativa marcada como abandonada"}


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: str, payload=Depends(verify_teacher)):
    """Retorna detalhes de um caso específico."""
    validate_uuid(case_id, "case_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    result = sb.table("cases").select("*").eq("id", case_id).execute()
    if not result.data:
        raise http_error(404, "case_not_found", "Caso não encontrado")

    case = result.data[0]
    if case["teacher_id"] != teacher_id:
        raise http_error(403, "access_denied", "Acesso negado")

    return case


@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(case_id: str, data: CaseUpdate, payload=Depends(verify_teacher)):
    """Atualiza um caso (editar, publicar, mudar visibilidade)."""
    validate_uuid(case_id, "case_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    existing = sb.table("cases").select("teacher_id").eq("id", case_id).execute()
    if not existing.data:
        raise http_error(404, "case_not_found", "Caso não encontrado")
    if existing.data[0]["teacher_id"] != teacher_id:
        raise http_error(403, "access_denied", "Acesso negado")

    update_data = data.model_dump(exclude_unset=True)
    # Null explícito só é permitido em available_until (torna o caso permanente);
    # nos demais campos, null seria gravado no banco e apagaria o valor existente.
    update_data = {
        k: v for k, v in update_data.items()
        if v is not None or k == "available_until"
    }
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    if "available_until" in update_data:
        au = update_data["available_until"]
        update_data["available_until"] = au.isoformat() if au else None

    update_data["updated_at"] = datetime.now(UTC).isoformat()

    result = sb.table("cases").update(update_data).eq("id", case_id).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Erro ao atualizar caso")

    return result.data[0]


@router.delete("/{case_id}")
def delete_case(case_id: str, payload=Depends(verify_teacher)):
    """Remove um caso clínico."""
    validate_uuid(case_id, "case_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    existing = sb.table("cases").select("teacher_id").eq("id", case_id).execute()
    if not existing.data:
        raise http_error(404, "case_not_found", "Caso não encontrado")
    if existing.data[0]["teacher_id"] != teacher_id:
        raise http_error(403, "access_denied", "Acesso negado")

    sb.table("cases").delete().eq("id", case_id).execute()
    return {"message": "Caso removido com sucesso"}


# =============================================
# ATRIBUIÇÃO DE CASO A TURMA
# =============================================

@router.post("/{case_id}/assign", response_model=CaseAssignResponse)
def assign_case(case_id: str, data: CaseAssignRequest, payload=Depends(verify_teacher)):
    """Atribui um caso a uma turma."""
    validate_uuid(case_id, "case_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()


    # Verifica se o caso pertence ao professor
    case = sb.table("cases").select("teacher_id").eq("id", case_id).execute()
    if not case.data or case.data[0]["teacher_id"] != teacher_id:
        raise http_error(403, "access_denied", "Caso não encontrado ou acesso negado")

    # Permite atribuir caso se o professor tem acesso à turma (dono ou compartilhado)
    from app.routes.classes import _check_access
    _check_access(data.class_id, teacher_id, sb)

    # Verifica se já está atribuído
    existing = sb.table("case_assignments") \
        .select("id").eq("case_id", case_id).eq("class_id", data.class_id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Caso já atribuído a esta turma")

    assignment = sb.table("case_assignments").insert({
        "case_id": case_id,
        "class_id": data.class_id,
        "due_date": data.due_date.isoformat() if data.due_date else None,
    }).execute()

    if not assignment.data:
        raise HTTPException(status_code=500, detail="Erro ao atribuir caso")

    logger.info(f"[Cases] Caso {case_id} atribuído à turma {data.class_id}")
    return assignment.data[0]


@router.get("/{case_id}/assignments")
def list_case_assignments(case_id: str, payload=Depends(verify_teacher)):
    """Lista turmas às quais um caso está atribuído."""
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    case = sb.table("cases").select("teacher_id").eq("id", case_id).execute()
    if not case.data or case.data[0]["teacher_id"] != teacher_id:
        raise http_error(403, "access_denied", "Acesso negado")

    result = sb.table("case_assignments") \
        .select("*, classes(id, name, code)") \
        .eq("case_id", case_id).execute()

    return result.data or []


@router.patch("/{case_id}/assignments/{assignment_id}")
def update_case_assignment(
    case_id: str,
    assignment_id: str,
    data: CaseAssignmentUpdate,
    payload=Depends(verify_teacher),
):
    """Altera a data de entrega (ou remove o prazo) de uma atribuição caso↔turma."""
    validate_uuid(case_id, "case_id")
    validate_uuid(assignment_id, "assignment_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    case = sb.table("cases").select("teacher_id").eq("id", case_id).execute()
    if not case.data or case.data[0]["teacher_id"] != teacher_id:
        raise http_error(403, "access_denied", "Acesso negado")

    row = sb.table("case_assignments") \
        .select("id, case_id") \
        .eq("id", assignment_id) \
        .execute()
    if not row.data or row.data[0]["case_id"] != case_id:
        raise HTTPException(status_code=404, detail="Atribuição não encontrada")

    updates = data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    if "due_date" in updates:
        d = updates["due_date"]
        updates["due_date"] = d.isoformat() if d else None

    upd = sb.table("case_assignments").update(updates).eq("id", assignment_id).execute()
    if not upd.data:
        raise HTTPException(status_code=500, detail="Erro ao atualizar atribuição")
    return upd.data[0]


@router.delete("/{case_id}/assignments/{assignment_id}")
def delete_case_assignment(
    case_id: str,
    assignment_id: str,
    payload=Depends(verify_teacher),
):
    """Remove o vínculo do caso com a turma (o caso em si permanece)."""
    validate_uuid(case_id, "case_id")
    validate_uuid(assignment_id, "assignment_id")
    teacher_id = payload.get("sub")
    sb = get_supabase_client()

    case = sb.table("cases").select("teacher_id").eq("id", case_id).execute()
    if not case.data or case.data[0]["teacher_id"] != teacher_id:
        raise http_error(403, "access_denied", "Acesso negado")

    chk = sb.table("case_assignments") \
        .select("id") \
        .eq("id", assignment_id) \
        .eq("case_id", case_id) \
        .execute()
    if not chk.data:
        raise HTTPException(status_code=404, detail="Atribuição não encontrada")

    sb.table("case_assignments").delete().eq("id", assignment_id).execute()
    return Response(status_code=204)


@router.get("/{case_id}/attempts")
def list_case_attempts(case_id: str, payload=Depends(verify_teacher)):
    """
    Retorna todas as tentativas de alunos para um caso do professor.
    Inclui dados do aluno, score, status, duração e mensagens da conversa.
    Accessível apenas pelo professor dono do caso (ou admin).
    """
    validate_uuid(case_id, "case_id")
    teacher_id = payload.get("sub")
    role = payload.get("role", "teacher")
    sb = get_supabase_client()

    # Verifica propriedade do caso
    case_res = sb.table("cases").select("teacher_id, title").eq("id", case_id).execute()
    if not case_res.data:
        raise http_error(404, "case_not_found", "Caso não encontrado")
    if role != "admin" and case_res.data[0]["teacher_id"] != teacher_id:
        raise http_error(403, "access_denied", "Acesso negado")

    # Busca tentativas com dados do aluno
    attempts_res = sb.table("case_attempts") \
        .select("id, student_id, conversation_id, status, score, feedback, duration_seconds, started_at, completed_at, users(id, name, email)") \
        .eq("case_id", case_id) \
        .order("started_at", desc=True) \
        .execute()

    return attempts_res.data or []


@router.get("/{case_id}/attempts/{attempt_id}/messages")
def get_attempt_messages(case_id: str, attempt_id: str, payload=Depends(verify_teacher)):
    """
    Retorna as mensagens de uma tentativa específica de um aluno.
    Acessível apenas pelo professor dono do caso (ou admin).
    """
    validate_uuid(case_id, "case_id")
    validate_uuid(attempt_id, "attempt_id")
    teacher_id = payload.get("sub")
    role = payload.get("role", "teacher")
    sb = get_supabase_client()

    # Verifica propriedade do caso
    case_res = sb.table("cases").select("teacher_id").eq("id", case_id).execute()
    if not case_res.data:
        raise http_error(404, "case_not_found", "Caso não encontrado")
    if role != "admin" and case_res.data[0]["teacher_id"] != teacher_id:
        raise http_error(403, "access_denied", "Acesso negado")

    # Verifica que a tentativa pertence ao caso
    attempt_res = sb.table("case_attempts") \
        .select("conversation_id") \
        .eq("id", attempt_id) \
        .eq("case_id", case_id) \
        .execute()

    if not attempt_res.data:
        raise HTTPException(status_code=404, detail="Tentativa não encontrada")

    conv_id = attempt_res.data[0].get("conversation_id")
    if not conv_id:
        return []

    messages_res = sb.table("messages") \
        .select("id, role, content, timestamp") \
        .eq("conversation_id", conv_id) \
        .order("timestamp", desc=False) \
        .execute()

    return messages_res.data or []


# =============================================
# TENTATIVAS DOS ALUNOS
# =============================================

@router.post("/{case_id}/start", response_model=CaseStartResponse)
def start_attempt(case_id: str, payload=Depends(verify_jwt_token)):
    """
    Aluno inicia uma tentativa de caso clínico.
    Cria thread OpenAI, conversation no banco e attempt vinculado.
    """
    validate_uuid(case_id, "case_id")
    student_id = payload.get("sub")
    sb = get_supabase_client()

    # ── Verifica cota diária de casos regulares ──
    quota = _get_daily_quota(student_id, sb)
    if quota["regular_available"] <= 0:
        raise http_error(
            429, "case_quota_exceeded",
            f"Limite diário de {quota['regular_limit']} casos atingido. Volte amanhã.",
            limit=quota["regular_limit"],
        )

    # Busca o caso
    case = sb.table("cases").select("*").eq("id", case_id).execute()
    if not case.data:
        raise http_error(404, "case_not_found", "Caso não encontrado")
    case_data = case.data[0]

    # Verifica acesso:
    # Casos atribuídos a turmas → verifica matrícula (published não exigido).
    # Casos sem atribuição de turma (catálogo livre/admin) → exige published=True.
    now = datetime.now(UTC)
    assignments = sb.table("case_assignments").select("class_id, due_date").eq("case_id", case_id).execute()
    if assignments.data:
        class_ids = [a["class_id"] for a in assignments.data]
        enrolled = sb.table("class_students") \
            .select("class_id") \
            .eq("student_id", student_id) \
            .in_("class_id", class_ids) \
            .execute()
        if not enrolled.data:
            raise HTTPException(status_code=403, detail="Você não está matriculado em nenhuma turma com este caso")

        enrolled_ids = {e["class_id"] for e in (enrolled.data or [])}
        case_au = _parse_case_available_until(case_data)
        has_active, _ = _assignments_still_active_for_student(
            assignments.data or [],
            enrolled_ids,
            case_au,
            now,
        )
        if not has_active:
            raise http_error(410, "case_expired", "Este caso não está mais disponível para sua turma")
    else:
        if not case_data.get("published"):
            raise HTTPException(status_code=403, detail="Este caso ainda não foi publicado")
        available_until_raw = case_data.get("available_until")
        if available_until_raw:
            try:
                available_until = datetime.fromisoformat(str(available_until_raw).replace("Z", "+00:00"))
                if available_until < now:
                    raise http_error(410, "case_expired", "Este caso expirou e não está mais disponível")
            except HTTPException:
                raise
            except Exception:
                pass

    # Cria conversation (sem thread OpenAI — histórico gerenciado pelo banco)
    convo = sb.table("conversations").insert({
        "user_id": student_id,
        "title": case_data["title"],
        "type": "case",
    }).execute()

    if not convo.data:
        raise HTTPException(status_code=500, detail="Erro ao criar conversa")

    conv_id = convo.data[0]["id"]

    # Reserva atômica da cota (SPEC-004): conta + insere sob advisory lock no banco.
    reserved = sb.rpc("reserve_case_attempt", {
        "p_student": student_id,
        "p_case_id": case_id,
        "p_conversation_id": conv_id,
        "p_kind": "regular",
        "p_limit": quota["regular_limit"],
    }).execute()
    attempt_id = _reserved_attempt_id(reserved.data)
    if not attempt_id:
        sb.table("conversations").delete().eq("id", conv_id).execute()
        raise http_error(
            429, "case_quota_exceeded",
            f"Limite diário de {quota['regular_limit']} casos atingido. Volte amanhã.",
            limit=quota["regular_limit"],
        )

    # Retorna o patient_prompt bruto — o frontend envia ao GPT após a escolha de modo,
    # evitando bloquear a navegação enquanto aguarda resposta da OpenAI.
    # thread_id = conv_id para compatibilidade com o frontend existente.
    logger.info(f"[Cases] Aluno {student_id} iniciou tentativa do caso {case_id}")
    return CaseStartResponse(
        attempt_id=attempt_id,
        thread_id=conv_id,
        conversation_id=conv_id,
        patient_prompt=case_data["patient_prompt"],
    )


SOAP_EVALUATION_PROMPT = """Você é um avaliador rigoroso de educação médica. O aluno acabou de completar uma anamnese simulada e enviou o seguinte SOAP:

{soap_content}

O caso clínico era sobre: {case_summary}

Avalie de 0 a 100 considerando:
- Subjetivo (S): O aluno coletou informações relevantes do paciente? (25 pontos)
- Objetivo (O): Exame físico e observações estão coerentes? (25 pontos)  
- Avaliação (A): O diagnóstico ou hipótese diagnóstica é adequado? (25 pontos)
- Plano (P): O plano terapêutico é coerente? (25 pontos)

REGRAS IMPORTANTES:
- Se o aluno escreveu respostas genéricas, vazias, sem sentido ou sem relação com o caso (ex: "teste", "abc", "asdf", textos aleatórios), a nota DEVE ser entre 0 e 10.
- Se o SOAP está incompleto ou superficial, a nota deve ser proporcional ao esforço real.
- Seja justo mas rigoroso. Não infle notas.

Responda EXATAMENTE neste formato JSON (sem markdown, sem ```):
{{
  "score": <número de 0 a 100>,
  "feedback": "Feedback detalhado e construtivo para o aluno..."
}}"""


class EvaluateSoapRequest(BaseModel):
    soap_content: str
    case_summary: str | None = None
    conversation_id: str | None = None


@router.post("/evaluate-soap")
def evaluate_soap_standalone(data: EvaluateSoapRequest, payload=Depends(verify_jwt_token)):
    """Avalia um SOAP sem necessidade de case_id — usado para free cases sem attempt."""
    from app.services.eval_service import evaluate_soap as _eval
    sb = get_supabase_client()

    # Recupera histórico da conversa se conversation_id for passado
    conversation_history = ""
    if getattr(data, "conversation_id", None):
        try:
            msgs = sb.table("messages").select("role, content") \
                .eq("conversation_id", data.conversation_id) \
                .not_.like("content", "[SOAP_SUBMISSION]%") \
                .order("created_at") \
                .execute()
            if msgs.data:
                lines = []
                for m in msgs.data:
                    role_label = "Médico" if m["role"] == "user" else "Paciente"
                    lines.append(f"{role_label}: {m['content']}")
                conversation_history = "\n".join(lines)
        except Exception as e:
            logger.warning(f"[Cases] Não foi possível recuperar histórico: {e}")

    # Idioma do claim do JWT (SPEC-011 RF1/RF6) — feedback nasce no idioma do
    # aluno (decisão E2), não do professor que criou o caso.
    language = payload.get("language", "pt-BR")

    result = _eval(
        data.soap_content, data.case_summary or "Caso clínico livre",
        conversation_history, language=language,
    )
    return result


@router.post("/{case_id}/complete", response_model=CaseCompleteResponse)
def complete_attempt(case_id: str, data: CaseCompleteRequest, payload=Depends(verify_jwt_token)):
    """
    Aluno finaliza a tentativa enviando o SOAP.
    GPT avalia e retorna nota + feedback.
    """
    student_id = payload.get("sub")
    sb = get_supabase_client()

    # Busca tentativa em andamento
    attempt = sb.table("case_attempts") \
        .select("*") \
        .eq("case_id", case_id) \
        .eq("student_id", student_id) \
        .eq("status", "in_progress") \
        .order("started_at", desc=True) \
        .limit(1) \
        .execute()

    if not attempt.data:
        raise HTTPException(status_code=404, detail="Nenhuma tentativa em andamento para este caso")

    attempt_data = attempt.data[0]

    # Busca caso para contexto e pesos SOAP definidos pelo professor
    case = sb.table("cases").select("summary, title, form_data").eq("id", case_id).execute()
    case_data = case.data[0] if case.data else {}
    case_summary = case_data.get("summary") or "Caso clínico"
    soap_weights = (case_data.get("form_data") or {}).get("soap_weights") or None

    # Busca histórico da conversa para enriquecer contexto da avaliação
    conversation_history = ""
    conv_id = attempt_data.get("conversation_id")
    if conv_id:
        try:
            msgs = sb.table("messages").select("role, content") \
                .eq("conversation_id", conv_id) \
                .not_.like("content", "[SOAP_SUBMISSION]%") \
                .order("created_at") \
                .execute()
            if msgs.data:
                lines = []
                for m in msgs.data:
                    role_label = "Médico" if m["role"] == "user" else "Paciente"
                    lines.append(f"{role_label}: {m['content']}")
                conversation_history = "\n".join(lines)
        except Exception as e:
            logger.warning(f"[Cases] Não foi possível recuperar histórico: {e}")

    # Idioma do claim do JWT (SPEC-011 RF1/RF6) — feedback nasce no idioma do
    # aluno (decisão E2), não do professor que criou o caso.
    language = payload.get("language", "pt-BR")

    # Avalia SOAP via eval_service com pesos do professor
    breakdown = None
    try:
        eval_result = _ai_evaluate_soap(
            data.soap_content, case_summary, conversation_history, soap_weights,
            language=language,
        )
        score = eval_result["score"]
        feedback = eval_result["feedback"]
        breakdown = eval_result.get("breakdown")
        logger.info(f"[Cases] Avaliação SOAP score={score} para aluno={student_id}")
    except Exception as e:
        logger.error(f"[Cases] Erro ao avaliar SOAP: {e}")
        score = None
        feedback = "Não foi possível avaliar automaticamente. Consulte seu professor."

    # Calcula duração
    started = datetime.fromisoformat(attempt_data["started_at"].replace("Z", "+00:00"))
    now = datetime.now(UTC)
    duration = int((now - started).total_seconds())

    # Salva o SOAP enviado como mensagem na conversa (marcador para extração no frontend)
    conv_id = attempt_data.get("conversation_id")
    if conv_id and data.soap_content:
        sb.table("messages").insert({
            "conversation_id": conv_id,
            "role": "user",
            "content": f"[SOAP_SUBMISSION]\n{data.soap_content}",
        }).execute()

    # Atualiza attempt
    sb.table("case_attempts").update({
        "score": score,
        "status": "completed",
        "feedback": feedback,
        "duration_seconds": duration,
        "completed_at": now.isoformat(),
    }).eq("id", attempt_data["id"]).execute()

    logger.info(f"[Cases] Aluno {student_id} completou caso {case_id} com score={score}")
    return CaseCompleteResponse(
        attempt_id=attempt_data["id"],
        score=score,
        feedback=feedback,
        duration_seconds=duration,
        breakdown=breakdown,
    )


# =============================================
# CASOS DISPONÍVEIS PARA ALUNO
# =============================================

@router.get("/student/available")
def list_available_cases(payload=Depends(verify_jwt_token)):
    """
    Lista todos os casos disponíveis para o aluno,
    baseado nas turmas em que está matriculado.
    Admin vê todos os casos atribuídos publicados (sem filtro de turma).
    """
    student_id = payload.get("sub")
    sb = get_supabase_client()

    # Filtra pelas turmas em que o usuário está matriculado (mesma lógica para alunos e admins)
    enrollments = sb.table("class_students").select("class_id").eq("student_id", student_id).execute()
    if not enrollments.data:
        return []

    class_ids = [e["class_id"] for e in enrollments.data]

    # Assignments dessas turmas
    assignments = sb.table("case_assignments") \
        .select("case_id, class_id, due_date, classes(name)") \
        .in_("class_id", class_ids) \
        .execute()

    if not assignments.data:
        return []

    case_ids = list(set(a["case_id"] for a in assignments.data))

    # Busca casos atribuídos — a atribuição à turma é a permissão de acesso;
    # não exige published=True para que casos do professor apareçam para alunos.
    cases = sb.table("cases") \
        .select("id, title, specialty, difficulty, summary, created_at, available_until") \
        .in_("id", case_ids) \
        .execute()

    # Busca tentativas do aluno
    attempts = sb.table("case_attempts") \
        .select("case_id, status, score") \
        .eq("student_id", student_id) \
        .execute()

    attempts_map = {}
    for a in (attempts.data or []):
        cid = a["case_id"]
        if cid not in attempts_map:
            attempts_map[cid] = []
        attempts_map[cid].append(a)

    # Monta mapa case_id -> class_names (lista de turmas)
    case_classes_map: dict = {}
    for a in (assignments.data or []):
        cid = a["case_id"]
        classes_val = a.get("classes")
        class_name = None
        if isinstance(classes_val, dict):
            class_name = classes_val.get("name")
        elif isinstance(classes_val, list) and classes_val:
            class_name = classes_val[0].get("name")
        if class_name:
            if cid not in case_classes_map:
                case_classes_map[cid] = []
            if class_name not in case_classes_map[cid]:
                case_classes_map[cid].append(class_name)

    # Monta resposta enriquecida
    result = []
    now = datetime.now(UTC)
    assignments_by_case: dict[str, list] = {}
    for a in (assignments.data or []):
        assignments_by_case.setdefault(a["case_id"], []).append(a)

    enrolled_class_ids = set(class_ids)
    for case in (cases.data or []):
        case_assignments = assignments_by_case.get(case["id"], [])
        case_au = _parse_case_available_until(case)
        has_active_assignment, active_due_dates = _assignments_still_active_for_student(
            case_assignments,
            enrolled_class_ids,
            case_au,
            now,
        )

        fallback_available_until = None
        if not has_active_assignment:
            # Todas as entregas da turma venceram; só mantém o caso se houver
            # available_until no próprio caso (prorrogação além do prazo da turma).
            available_until_raw = case.get("available_until")
            if not available_until_raw:
                continue
            try:
                available_until = datetime.fromisoformat(str(available_until_raw).replace("Z", "+00:00"))
                if available_until < now:
                    continue
                fallback_available_until = available_until
            except Exception:
                pass

        expires_at = None
        if active_due_dates:
            expires_at = min(active_due_dates).isoformat()
        elif fallback_available_until:
            expires_at = fallback_available_until.isoformat()

        case_attempts = attempts_map.get(case["id"], [])
        result.append({
            **case,
            "attempts_count": len(case_attempts),
            "best_score": max((a.get("score") or 0 for a in case_attempts), default=None),
            "last_status": case_attempts[-1]["status"] if case_attempts else None,
            "class_names": case_classes_map.get(case["id"], []),
            "expires_at": expires_at,
        })

    return result
