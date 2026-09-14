"""
Serviço do resumo semanal por IA (SPEC-013 §6.9, fase 3a).

Gera 2–3 frases de coaching sobre a semana do aluno. Duas travas de custo, nesta
ordem — quem mexer aqui precisa manter as duas:

1. **Flag** `WEEKLY_SUMMARY_ENABLED` (env, default `false`): com ela desligada a
   rota nem chega neste módulo.
2. **Cache** em `weekly_summaries`, 1 linha por aluno por semana ISO: a segunda
   visita à home na mesma semana lê do banco, não da OpenAI.

Sem atividade na semana não há geração — resumo de semana vazia não ensina nada
e ainda custaria token.
"""
from datetime import UTC, datetime, timedelta

from app.config import logger
from app.i18n import language_name
from app.services.openai_service import complete, get_prompt

# Espelha `WEEKLY_GOAL` do front (`@/config/constants.ts`, D1 da SPEC-013).
# Duplicado de propósito: a meta é copy do produto, não configuração — se um dia
# virar configurável, vira campo no banco e os dois lados leem de lá.
WEEKLY_GOAL = 5

# Ordem canônica S/O/A/P, iguais às chaves de `case_attempts.breakdown`.
_SOAP_DIMS = ("subjetivo", "objetivo", "avaliacao", "plano")

# ── Prompt local (fallback se Langfuse indisponível) ──────────────────────────
# Mesmo padrão de `eval_service`: `get_prompt` devolve "" quando o prompt não
# existe no Langfuse ou o Langfuse está fora, e o chamador cai neste texto.
_WEEKLY_SUMMARY_PROMPT = """\
Você é um preceptor de medicina acompanhando o treino de anamnese de um estudante na plataforma Anamnes.IA.

ESTUDANTE: {student_name}
SEMANA: {week_label}

DADOS DA SEMANA (calculados pela plataforma, não invente outros):
- Casos iniciados: {attempts}
- Casos concluídos: {completed} (meta da semana: {goal})
- Nota média da semana: {avg_score}
- Nota média da semana anterior: {prev_avg_score}
- Especialidades treinadas: {specialties}
- Especialidade com a menor média: {weak_specialty}
- Dimensão SOAP com a menor média: {weak_dimension}

TAREFA:
Escreva um resumo de coaching com **2 a 3 frases**, falando diretamente com o estudante ("você").

REGRAS:
- Comece reconhecendo o que ele fez na semana, usando os números reais acima.
- Aponte **um** ponto concreto para melhorar na próxima semana — o mais evidente dos dados (a especialidade mais fraca ou a dimensão SOAP mais fraca).
- Termine com uma orientação prática e específica, não com frase motivacional genérica.
- Não invente dados que não estão acima. Se um valor for "—", ignore-o em vez de comentar a ausência.
- Não use listas, títulos, markdown nem emojis: apenas texto corrido.
- Tom de preceptor: direto, respeitoso, sem elogio inflado e sem tom de repreensão.

IDIOMA: escreva o resumo inteiro em {language_name}, independentemente do idioma dos dados acima.

Responda apenas com o texto do resumo."""


# ── Semana ISO ────────────────────────────────────────────────────────────────

def iso_week_of(now: datetime) -> tuple[int, int]:
    """(ano ISO, semana ISO) — a chave do cache."""
    cal = now.isocalendar()
    return cal[0], cal[1]


def week_start(now: datetime) -> datetime:
    """Segunda-feira 00:00 da semana de `now`, no mesmo fuso de `now`."""
    monday = now - timedelta(days=now.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


def _parse(iso: str | None) -> datetime | None:
    if not iso:
        return None
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None


# ── Métricas ──────────────────────────────────────────────────────────────────

def collect_metrics(sb, student_id: str, now: datetime) -> dict:
    """
    Números da semana corrente do aluno + a média da semana anterior (para o
    prompt poder falar de evolução). Busca as duas semanas numa query só.
    """
    this_monday = week_start(now)
    prev_monday = this_monday - timedelta(days=7)

    res = sb.table("case_attempts") \
        .select("status, score, breakdown, started_at, cases(specialty)") \
        .eq("student_id", student_id) \
        .gte("started_at", prev_monday.isoformat()) \
        .order("started_at", desc=True) \
        .execute()

    this_week, prev_week = [], []
    for a in (res.data or []):
        started = _parse(a.get("started_at"))
        if not started:
            continue
        (this_week if started >= this_monday else prev_week).append(a)

    scores = [a["score"] for a in this_week if a.get("score") is not None]
    prev_scores = [a["score"] for a in prev_week if a.get("score") is not None]

    # Especialidade mais fraca: só entram as que têm nota, senão uma
    # especialidade com uma tentativa sem avaliação viraria "a mais fraca".
    by_spec: dict[str, list[int]] = {}
    for a in this_week:
        if a.get("score") is None:
            continue
        spec = (a.get("cases") or {}).get("specialty") or "Geral"
        by_spec.setdefault(spec, []).append(a["score"])

    weak_specialties = [
        {
            "specialty": specialty,
            "average_score": round(sum(values) / len(values), 1),
            "attempts": len(values),
        }
        for specialty, values in by_spec.items()
    ]
    weak_specialties.sort(
        key=lambda item: (
            item["average_score"],
            -item["attempts"],
            item["specialty"].casefold(),
        )
    )
    weak_specialties = weak_specialties[:3]
    weak_specialty = weak_specialties[0]["specialty"] if weak_specialties else None

    # Dimensão SOAP mais fraca da semana. Só tentativas com breakdown completo,
    # pela mesma razão de `profile.py::_soap_profile`: média por dimensão tem de
    # sair sempre da mesma amostra.
    dim_totals: dict[str, list[float]] = {d: [] for d in _SOAP_DIMS}
    for a in this_week:
        bd = a.get("breakdown")
        if not isinstance(bd, dict):
            continue
        values = {}
        for dim in _SOAP_DIMS:
            value = (bd.get(dim) or {}).get("score")
            if isinstance(value, int | float):
                values[dim] = float(value)
        if len(values) == len(_SOAP_DIMS):
            for dim, value in values.items():
                dim_totals[dim].append(value)

    weak_dimension = None
    if dim_totals[_SOAP_DIMS[0]]:
        weak_dimension = min(_SOAP_DIMS, key=lambda d: sum(dim_totals[d]) / len(dim_totals[d]))

    return {
        "attempts": len(this_week),
        "completed": len([a for a in this_week if a.get("status") == "completed"]),
        "avg_score": round(sum(scores) / len(scores), 1) if scores else None,
        "prev_avg_score": round(sum(prev_scores) / len(prev_scores), 1) if prev_scores else None,
        "specialties": sorted(by_spec.keys()),
        "weak_specialties": weak_specialties,
        "weak_specialty": weak_specialty,
        "weak_dimension": weak_dimension,
    }


# ── Cache ─────────────────────────────────────────────────────────────────────

def _read_cache(sb, student_id: str, year: int, week: int) -> dict | None:
    try:
        res = sb.table("weekly_summaries") \
            .select("id, summary, language, created_at, weak_specialties") \
            .eq("student_id", student_id) \
            .eq("iso_year", year) \
            .eq("iso_week", week) \
            .execute()
    except Exception as e:  # cache indisponível não pode derrubar a home
        logger.warning(f"[WeeklySummary] Falha ao ler cache: {e}")
        return None
    rows = res.data or []
    return rows[0] if rows else None


def _write_cache(
    sb,
    student_id: str,
    year: int,
    week: int,
    summary: str,
    language: str,
    weak_specialties: list[dict],
) -> None:
    try:
        sb.table("weekly_summaries").insert({
            "student_id": student_id,
            "iso_year": year,
            "iso_week": week,
            "summary": summary,
            "language": language,
            "weak_specialties": weak_specialties,
        }).execute()
    except Exception as e:
        # Conflito da unique key (duas abas pedindo ao mesmo tempo) cai aqui e é
        # benigno: o texto já gerado volta nesta resposta e a próxima leitura
        # pega a linha da corrida vencedora.
        logger.warning(f"[WeeklySummary] Falha ao gravar cache: {e}")


def _backfill_cache_weak_specialties(
    sb,
    cache_id: str,
    weak_specialties: list[dict],
) -> None:
    try:
        sb.table("weekly_summaries").update({
            "weak_specialties": weak_specialties,
        }).eq("id", cache_id).execute()
    except Exception as e:
        logger.warning(f"[WeeklySummary] Falha ao atualizar cache legado: {e}")


# ── API pública ───────────────────────────────────────────────────────────────

def get_weekly_summary(
    sb,
    student_id: str,
    student_name: str = "",
    language: str = "pt-BR",
    now: datetime | None = None,
) -> dict | None:
    """
    Resumo da semana corrente do aluno.

    Returns:
        {"summary": str, "week": "AAAA-Www", "cached": bool, "language": str,
         "weak_specialties": list[dict]}
        ou `None` quando o aluno não teve atividade na semana (nada a resumir —
        e nenhuma chamada à OpenAI).
    """
    now = now or datetime.now(UTC)
    year, week = iso_week_of(now)
    week_label = f"{year}-W{week:02d}"

    cached = _read_cache(sb, student_id, year, week)
    if cached:
        weak_specialties = cached.get("weak_specialties")
        if weak_specialties is None:
            metrics = collect_metrics(sb, student_id, now)
            weak_specialties = metrics["weak_specialties"]
            if cached.get("id"):
                _backfill_cache_weak_specialties(sb, cached["id"], weak_specialties)
        return {
            "summary": cached["summary"],
            "week": week_label,
            "cached": True,
            "language": cached.get("language", language),
            "weak_specialties": weak_specialties,
        }

    metrics = collect_metrics(sb, student_id, now)
    if metrics["attempts"] == 0:
        return None

    prompt_vars = {
        "student_name": student_name or "estudante",
        "week_label": week_label,
        "attempts": metrics["attempts"],
        "completed": metrics["completed"],
        "goal": WEEKLY_GOAL,
        "avg_score": metrics["avg_score"] if metrics["avg_score"] is not None else "—",
        "prev_avg_score": metrics["prev_avg_score"] if metrics["prev_avg_score"] is not None else "—",
        "specialties": ", ".join(metrics["specialties"]) or "—",
        "weak_specialty": metrics["weak_specialty"] or "—",
        "weak_dimension": metrics["weak_dimension"] or "—",
        "language": language,
        "language_name": language_name(language),
    }

    system = get_prompt("weekly-summary-prompt", **prompt_vars)
    if not system:
        system = _WEEKLY_SUMMARY_PROMPT.format(**prompt_vars)

    try:
        summary = complete(
            [{"role": "user", "content": system}],
            temperature=0.6,
            max_tokens=250,
            trace_name="weekly-summary",
        )
    except Exception as e:
        # Falha da IA não vira erro na home: o card simplesmente não aparece, e
        # nada é gravado no cache — a próxima visita tenta de novo.
        logger.warning(f"[WeeklySummary] Falha ao gerar resumo de {student_id}: {e}")
        return None

    summary = (summary or "").strip()
    if not summary:
        return None

    _write_cache(
        sb,
        student_id,
        year,
        week,
        summary,
        language,
        metrics["weak_specialties"],
    )
    return {
        "summary": summary,
        "week": week_label,
        "cached": False,
        "language": language,
        "weak_specialties": metrics["weak_specialties"],
    }
