"""
SPEC-013 §6.9 (fase 3a) — resumo semanal por IA.

O que estes testes protegem, em ordem de importância: **custo**. A feature só
pode ser ligada porque cache e flag garantem no máximo uma chamada à OpenAI por
aluno por semana ISO — se alguém quebrar isso, a regressão é na fatura, não na
tela, e nenhum teste de UI pegaria.
"""
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

from app.services import weekly_summary_service as svc

# Quarta-feira, semana ISO 2026-W33 (a segunda dessa semana é 10/08).
NOW = datetime(2026, 8, 12, 15, 0, tzinfo=timezone.utc)


# ── Fake Supabase ─────────────────────────────────────────────────────────────

class _FakeQuery:
    """Query builder chainável que devolve as linhas configuradas por tabela."""

    def __init__(self, table: str, store: dict):
        self._table = table
        self._store = store

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def gte(self, *_a, **_k):
        return self

    def order(self, *_a, **_k):
        return self

    def insert(self, row):
        self._store["inserts"].append((self._table, row))
        return self

    def update(self, row):
        self._store.setdefault("updates", []).append((self._table, row))
        return self

    def execute(self):
        return SimpleNamespace(data=self._store.get(self._table, []))


class _FakeSupabase:
    def __init__(self, **tables):
        self._store = {"inserts": [], "updates": [], **tables}

    def table(self, name):
        return _FakeQuery(name, self._store)

    @property
    def inserts(self):
        return self._store["inserts"]


def attempt(score=None, status="completed", specialty="cardiologia", started="2026-08-11T10:00:00+00:00", breakdown=None):
    return {
        "status": status,
        "score": score,
        "breakdown": breakdown,
        "started_at": started,
        "cases": {"specialty": specialty},
    }


def full_breakdown(s, o, a, p):
    return {
        "subjetivo": {"score": s},
        "objetivo": {"score": o},
        "avaliacao": {"score": a},
        "plano": {"score": p},
    }


# ── Semana ISO ────────────────────────────────────────────────────────────────

def test_week_start_cai_na_segunda():
    assert svc.week_start(NOW) == datetime(2026, 8, 10, 0, 0, tzinfo=timezone.utc)


def test_iso_week_of():
    assert svc.iso_week_of(NOW) == (2026, 33)


# ── Custo: as duas travas ─────────────────────────────────────────────────────

def test_sem_atividade_na_semana_nao_chama_ia():
    sb = _FakeSupabase(case_attempts=[], weekly_summaries=[])
    with patch.object(svc, "complete") as fake:
        assert svc.get_weekly_summary(sb, "u1", now=NOW) is None
    fake.assert_not_called()
    assert sb.inserts == []


def test_cache_da_semana_evita_segunda_chamada():
    sb = _FakeSupabase(
        case_attempts=[attempt(score=70)],
        weekly_summaries=[{
            "id": "ws1",
            "summary": "Texto já gerado.",
            "language": "pt-BR",
            "created_at": "x",
            "weak_specialties": [
                {"specialty": "cardiologia", "average_score": 70.0, "attempts": 1}
            ],
        }],
    )
    with patch.object(svc, "complete") as fake:
        result = svc.get_weekly_summary(sb, "u1", now=NOW)

    fake.assert_not_called()
    assert result == {
        "summary": "Texto já gerado.",
        "week": "2026-W33",
        "cached": True,
        "language": "pt-BR",
        "weak_specialties": [
            {"specialty": "cardiologia", "average_score": 70.0, "attempts": 1}
        ],
    }


def test_geracao_grava_o_cache_com_a_chave_da_semana():
    sb = _FakeSupabase(case_attempts=[attempt(score=70)], weekly_summaries=[])
    with patch.object(svc, "complete", return_value="  Você concluiu 1 caso.  "):
        result = svc.get_weekly_summary(sb, "u1", language="en", now=NOW)

    assert result["summary"] == "Você concluiu 1 caso."  # sem espaços das pontas
    assert result["cached"] is False
    assert result["week"] == "2026-W33"

    (table, row), = sb.inserts
    assert table == "weekly_summaries"
    assert row["student_id"] == "u1"
    assert (row["iso_year"], row["iso_week"]) == (2026, 33)
    assert row["language"] == "en"


def test_falha_da_ia_nao_grava_cache_nem_derruba_a_home():
    sb = _FakeSupabase(case_attempts=[attempt(score=70)], weekly_summaries=[])
    with patch.object(svc, "complete", side_effect=RuntimeError("openai fora")):
        assert svc.get_weekly_summary(sb, "u1", now=NOW) is None
    # Nada gravado: a próxima visita à home tenta de novo.
    assert sb.inserts == []


def test_resposta_vazia_da_ia_nao_vira_card_em_branco():
    sb = _FakeSupabase(case_attempts=[attempt(score=70)], weekly_summaries=[])
    with patch.object(svc, "complete", return_value="   "):
        assert svc.get_weekly_summary(sb, "u1", now=NOW) is None
    assert sb.inserts == []


# ── Métricas ──────────────────────────────────────────────────────────────────

def test_semana_anterior_entra_so_como_comparacao():
    sb = _FakeSupabase(case_attempts=[
        attempt(score=80, started="2026-08-11T10:00:00+00:00"),   # semana corrente
        attempt(score=60, started="2026-08-05T10:00:00+00:00"),   # semana anterior
        attempt(score=40, started="2026-08-03T10:00:00+00:00"),   # semana anterior
    ])
    m = svc.collect_metrics(sb, "u1", NOW)

    assert m["attempts"] == 1          # só a da semana corrente conta
    assert m["avg_score"] == 80.0
    assert m["prev_avg_score"] == 50.0


def test_weak_specialties_ordena_media_tentativas_e_nome():
    sb = _FakeSupabase(case_attempts=[
        attempt(score=50, specialty="Pediatria"),
        attempt(score=50, specialty="Cardiologia"),
        attempt(score=50, specialty="Cardiologia"),
        attempt(score=70, specialty="Neurologia"),
        attempt(score=None, specialty="Ortopedia"),
    ])

    metrics = svc.collect_metrics(sb, "u1", NOW)

    assert metrics["weak_specialties"] == [
        {"specialty": "Cardiologia", "average_score": 50.0, "attempts": 2},
        {"specialty": "Pediatria", "average_score": 50.0, "attempts": 1},
        {"specialty": "Neurologia", "average_score": 70.0, "attempts": 1},
    ]
    assert metrics["weak_specialty"] == "Cardiologia"


def test_cache_novo_devolve_snapshot_de_weak_specialties_sem_recalcular():
    cached = [{
        "id": "ws1",
        "summary": "Texto já gerado.",
        "language": "pt-BR",
        "created_at": "x",
        "weak_specialties": [
            {"specialty": "Cardiologia", "average_score": 42.5, "attempts": 2}
        ],
    }]
    sb = _FakeSupabase(case_attempts=[], weekly_summaries=cached)

    with patch.object(svc, "collect_metrics") as collect, patch.object(svc, "complete") as complete:
        result = svc.get_weekly_summary(sb, "u1", now=NOW)

    collect.assert_not_called()
    complete.assert_not_called()
    assert result["weak_specialties"] == cached[0]["weak_specialties"]


def test_cache_legado_recalcula_metricas_sem_chamar_ia_e_faz_backfill():
    sb = _FakeSupabase(
        case_attempts=[attempt(score=40, specialty="Cardiologia")],
        weekly_summaries=[{
            "id": "ws1",
            "summary": "Texto legado.",
            "language": "pt-BR",
            "created_at": "x",
            "weak_specialties": None,
        }],
    )

    with patch.object(svc, "complete") as complete:
        result = svc.get_weekly_summary(sb, "u1", now=NOW)

    complete.assert_not_called()
    assert result["weak_specialties"] == [
        {"specialty": "Cardiologia", "average_score": 40.0, "attempts": 1}
    ]
    assert (
        "weekly_summaries",
        {"weak_specialties": result["weak_specialties"]},
    ) in sb._store["updates"]


def test_especialidade_mais_fraca_ignora_tentativa_sem_nota():
    # Neurologia só tem tentativa sem avaliação: não pode virar "a mais fraca".
    sb = _FakeSupabase(case_attempts=[
        attempt(score=90, specialty="cardiologia"),
        attempt(score=55, specialty="pediatria"),
        attempt(score=None, specialty="neurologia"),
    ])
    m = svc.collect_metrics(sb, "u1", NOW)

    assert m["weak_specialty"] == "pediatria"
    assert m["specialties"] == ["cardiologia", "pediatria"]


def test_dimensao_soap_mais_fraca_descarta_breakdown_parcial():
    sb = _FakeSupabase(case_attempts=[
        attempt(score=70, breakdown=full_breakdown(80, 40, 90, 85)),
        # Parcial: entraria com 3 dimensões e distorceria a média das outras.
        attempt(score=70, breakdown={"subjetivo": {"score": 10}}),
        attempt(score=70, breakdown=None),
    ])
    m = svc.collect_metrics(sb, "u1", NOW)

    assert m["weak_dimension"] == "objetivo"


def test_sem_breakdown_nenhum_nao_inventa_dimensao_fraca():
    sb = _FakeSupabase(case_attempts=[attempt(score=70)])
    assert svc.collect_metrics(sb, "u1", NOW)["weak_dimension"] is None


def test_completed_conta_so_o_status_completed():
    sb = _FakeSupabase(case_attempts=[
        attempt(status="completed"),
        attempt(status="in_progress"),
        attempt(status="abandoned"),
    ])
    m = svc.collect_metrics(sb, "u1", NOW)

    assert (m["attempts"], m["completed"]) == (3, 1)


# ── Rota ──────────────────────────────────────────────────────────────────────

def test_endpoint_404_com_a_flag_desligada(as_role):
    """Default de produção: a flag do backend é a trava que sobra se o front chamar."""
    c = as_role("student")
    r = c.get("/api/profile/me/weekly-summary")
    assert r.status_code == 404
    assert r.json().get("code") == "feature_disabled"
