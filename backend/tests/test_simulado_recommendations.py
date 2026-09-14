from datetime import UTC, datetime

from app.services import simulado_service as svc

NOW = datetime(2026, 9, 7, 15, 0, tzinfo=UTC)


def sim(id, specialty="Cardiologia", due_date=None, created_at="2026-09-01T12:00:00+00:00"):
    return {
        "id": id,
        "title": id,
        "description": None,
        "specialty": specialty,
        "subspecialty": None,
        "num_questions": 10,
        "created_by": "owner",
        "class_id": None,
        "due_date": due_date,
        "visibility": "privado",
        "created_at": created_at,
    }


def test_recommend_filtra_specialty_sobre_lista_ja_autorizada(monkeypatch):
    monkeypatch.setattr(svc, "list_simulados", lambda *_: [
        sim("cardio"),
        sim("neuro", specialty="Neurologia"),
    ])
    monkeypatch.setattr(svc, "get_my_attempts", lambda *_: [])

    items = svc.recommend_simulados(None, "student-1", "student", "Cardiologia", now=NOW)

    assert [item["id"] for item in items] == ["cardio"]


def test_recommend_prioriza_nao_concluido_e_depois_mais_recente(monkeypatch):
    monkeypatch.setattr(svc, "list_simulados", lambda *_: [
        sim("done", created_at="2026-09-06T12:00:00+00:00"),
        sim("new", created_at="2026-09-05T12:00:00+00:00"),
        sim("old", created_at="2026-09-01T12:00:00+00:00"),
    ])
    monkeypatch.setattr(svc, "get_my_attempts", lambda *_: [
        {"simulado_id": "done", "status": "completed"},
    ])

    items = svc.recommend_simulados(None, "student-1", "student", "Cardiologia", now=NOW)

    assert [item["id"] for item in items] == ["new", "old", "done"]


def test_recommend_coloca_expirado_depois_dos_validos(monkeypatch):
    monkeypatch.setattr(svc, "list_simulados", lambda *_: [
        sim("expired", due_date="2026-09-01T00:00:00+00:00", created_at="2026-09-07T12:00:00+00:00"),
        sim("active", due_date="2026-09-10T00:00:00+00:00", created_at="2026-09-01T12:00:00+00:00"),
    ])
    monkeypatch.setattr(svc, "get_my_attempts", lambda *_: [])

    items = svc.recommend_simulados(None, "student-1", "student", "Cardiologia", now=NOW)

    assert [item["id"] for item in items] == ["active", "expired"]


def test_recommend_sem_candidato_retorna_lista_vazia(monkeypatch):
    monkeypatch.setattr(svc, "list_simulados", lambda *_: [])
    monkeypatch.setattr(svc, "get_my_attempts", lambda *_: [])

    assert svc.recommend_simulados(None, "student-1", "student", "Cardiologia", now=NOW) == []


def test_endpoint_recommended_retorna_envelope(as_role, monkeypatch):
    from app.routes import simulados as route_module

    monkeypatch.setattr(
        route_module.simulado_service,
        "recommend_simulados",
        lambda *args, **kwargs: [sim("cardio")],
    )
    client = as_role("student")

    response = client.get("/api/simulados/recommended?specialty=Cardiologia")

    assert response.status_code == 200
    body = response.json()
    assert body["specialty"] == "Cardiologia"
    assert body["items"][0]["id"] == "cardio"
