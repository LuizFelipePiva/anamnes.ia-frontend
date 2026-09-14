from unittest.mock import MagicMock

from app.routes import cases

CASE_ID = "10000000-0000-0000-0000-000000000001"
USER_ID = "00000000-0000-0000-0000-000000000001"


def test_case_edit_persists_physical_exam_and_soap_weights(as_role, monkeypatch):
    client = as_role("teacher")
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"teacher_id": USER_ID}]
    form = {"exame_fisico": "Achado registrado", "soap_weights": {"S": 40, "O": 30, "A": 20, "P": 10}}
    sb.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{
        "id": CASE_ID, "teacher_id": USER_ID, "title": "Paciente",
        "patient_prompt": "Prompt do paciente", "form_data": form,
    }]
    monkeypatch.setattr(cases, "get_supabase_client", lambda: sb)
    response = client.patch(f"/api/cases/{CASE_ID}", json={"form_data": form})
    assert response.status_code == 200
    assert response.json()["form_data"] == form
    assert sb.table.return_value.update.call_args.args[0]["form_data"] == form


def test_start_returns_physical_findings_without_the_teacher_form(as_role, monkeypatch):
    client = as_role("student")
    tables = {name: MagicMock() for name in ("cases", "case_assignments", "conversations")}
    tables["cases"].select.return_value.eq.return_value.execute.return_value.data = [{
        "id": CASE_ID, "title": "Paciente", "published": True, "patient_prompt": "Prompt",
        "form_data": {"exame_fisico": "Achado A, com detalhe\nAchado B", "patologia": "Diagnostico privado"},
    }]
    tables["case_assignments"].select.return_value.eq.return_value.execute.return_value.data = []
    tables["conversations"].insert.return_value.execute.return_value.data = [{"id": "conversation-1"}]
    sb = MagicMock()
    sb.table.side_effect = tables.__getitem__
    sb.rpc.return_value.execute.return_value.data = "attempt-1"
    monkeypatch.setattr(cases, "get_supabase_client", lambda: sb)
    monkeypatch.setattr(cases, "_get_daily_quota", lambda *_: {"regular_available": 3, "regular_limit": 3})
    response = client.post(f"/api/cases/{CASE_ID}/start")
    assert response.status_code == 200
    assert response.json()["physical_exam"] == "Achado A, com detalhe\nAchado B"
    assert "form_data" not in response.json()
    assert "Diagnostico privado" not in response.text
