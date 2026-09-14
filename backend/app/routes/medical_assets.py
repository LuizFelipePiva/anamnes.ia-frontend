"""
Rotas dos exames complementares (SPEC-014).

Duas visões deliberadamente separadas:

- `/medical-assets` — catálogo do professor, **com** diagnóstico. Restrito a
  docentes justamente porque expõe o gabarito de todo o acervo.
- `/attempts/{id}/exams` — visão do aluno, sem gabarito nenhum.

A rota do aluno é ancorada na **tentativa**, não no caso: quem tem uma
tentativa aberta já provou que podia acessar aquele caso, então a autorização
vira uma checagem só (`student_id == sub`) em vez de reimplementar as regras de
turma, prazo e visibilidade.

O `PUT`/`GET` de exames de um caso fica em `routes/cases.py`, junto do resto do
ciclo de vida do caso.
"""
from fastapi import APIRouter, Depends, Query

from app.auth.guards import verify_teacher
from app.auth.security import validate_uuid, verify_jwt_token
from app.config import SUPABASE_URL, logger
from app.db.supabase import get_supabase_client
from app.errors import http_error
from app.models.schemas import MedicalAssetStudent, MedicalAssetTeacher
from app.services.medical_asset_service import to_student_list, to_teacher_dto

router = APIRouter(tags=["exams"])


def link_rows_to_assets(rows: list[dict]) -> list[dict]:
    """Achata o join `case_exam_assets → medical_assets` numa lista de assets.

    O PostgREST devolve o asset aninhado sob o nome da tabela relacionada; o
    resto do código trabalha com o asset "plano" acrescido de `position`.
    Linhas cujo asset veio nulo são descartadas em silêncio — só acontece se
    alguém apagar um asset por fora do FK RESTRICT, e derrubar a tela do aluno
    inteira por causa disso seria pior do que mostrar os demais exames.
    """
    out: list[dict] = []
    for row in rows or []:
        asset = row.get("medical_assets") or row.get("asset")
        if isinstance(asset, list):
            asset = asset[0] if asset else None
        if not asset:
            continue
        out.append({**asset, "position": row.get("position") or 0})
    return out


@router.get("/medical-assets", response_model=list[MedicalAssetTeacher])
def list_medical_assets(
    modality: str | None = Query(default=None),
    payload=Depends(verify_teacher),
):
    """Catálogo de exames anexáveis, para o seletor do professor.

    Devolve o acervo elegível inteiro (algumas centenas de linhas, ~50 KB): o
    front filtra em memória. Busca server-side por tecla digitada custaria
    latência e um índice de texto para ganhar nada nesta ordem de grandeza.
    """
    sb = get_supabase_client()

    query = sb.table("medical_assets") \
        .select("*") \
        .eq("attachment_eligible", True)

    if modality:
        # Modalidade inexistente devolve lista vazia, não erro: para o front é
        # um filtro sem resultado, não uma falha.
        query = query.eq("modality", modality.strip().lower())

    result = query.order("modality").order("display_name").execute()
    return [to_teacher_dto(row, SUPABASE_URL) for row in (result.data or [])]


@router.get("/attempts/{attempt_id}/exams", response_model=list[MedicalAssetStudent])
def list_attempt_exams(attempt_id: str, payload=Depends(verify_jwt_token)):
    """Exames do caso desta tentativa, na visão do aluno (sem gabarito)."""
    validate_uuid(attempt_id, "attempt_id")
    user_id = payload.get("sub")
    role = payload.get("role", "student")
    sb = get_supabase_client()

    attempt = sb.table("case_attempts") \
        .select("id, case_id, student_id") \
        .eq("id", attempt_id) \
        .limit(1) \
        .execute()

    if not attempt.data:
        raise http_error(404, "attempt_not_found", "Tentativa não encontrada")

    attempt_row = attempt.data[0]
    if role != "admin" and attempt_row.get("student_id") != user_id:
        raise http_error(403, "access_denied", "Acesso negado")

    links = sb.table("case_exam_assets") \
        .select("position, medical_assets(*)") \
        .eq("case_id", attempt_row["case_id"]) \
        .order("position") \
        .execute()

    assets = link_rows_to_assets(links.data or [])
    logger.debug(f"[Exams] Tentativa {attempt_id}: {len(assets)} exame(s)")
    return to_student_list(assets, SUPABASE_URL)
