"""
Testes da SPEC-001 — Role-gate docente (`verify_teacher`).
Cobre achados #2, #3 e #8 de docs/PENTEST_LOCAL.md.

Estado esperado ANTES da implementação: FALHAM (TDD "vermelho").
- Import de `app.auth.guards` quebra (módulo ainda não existe) → todos falham.
- Após implementar, todos passam ("verde").

Estratégia: injeta um `role` via dependency_overrides (conftest) e verifica o
código de status. O guard deve retornar **403 antes** do corpo da rota; por isso
usamos corpos VÁLIDOS (evita ambiguidade com 422 de validação) e afirmamos:
  - student  → 403 nas rotas gateadas (§5, RF2/RF5)
  - teacher/admin → **≠ 403** (o guard libera; o corpo pode 200/500 no mock)
  - student  → **≠ 403** nas rotas de aluno (RF3, não gateadas)
"""
import pytest

# ── RF1: unit test do guard puro ──────────────────────────────────────────────
from fastapi import HTTPException


class TestVerifyTeacherUnit:
    def test_student_bloqueado(self):
        from app.auth.guards import verify_teacher
        with pytest.raises(HTTPException) as exc:
            verify_teacher({"sub": "x", "role": "student"})
        assert exc.value.status_code == 403

    def test_role_ausente_bloqueado(self):
        from app.auth.guards import verify_teacher
        with pytest.raises(HTTPException) as exc:
            verify_teacher({"sub": "x"})
        assert exc.value.status_code == 403

    def test_teacher_liberado(self):
        from app.auth.guards import verify_teacher
        payload = {"sub": "x", "role": "teacher"}
        assert verify_teacher(payload) == payload

    def test_admin_liberado(self):
        from app.auth.guards import verify_teacher
        payload = {"sub": "x", "role": "admin"}
        assert verify_teacher(payload) == payload


# ── Corpos válidos para as rotas de escrita gateadas ──────────────────────────
_VALID_CASE = {"title": "Caso Teste", "specialty": "Cardiologia",
               "patient_prompt": "Paciente com dor toracica ha duas horas"}
_VALID_CLASS = {"name": "Turma Teste", "specialty": "Cardiologia"}
_CASE_ID = "00000000-0000-0000-0000-0000000000ca"
_CLASS_ID = "00000000-0000-0000-0000-0000000000c1"
_ASSIGN_ID = "00000000-0000-0000-0000-0000000000a5"
_STUDENT_ID = "00000000-0000-0000-0000-0000000000d5"
_TEACHER_ID = "00000000-0000-0000-0000-0000000000e0"

# (método, caminho, corpo) — §5/RF2 (escrita) + RF5 (leitura)
GATED = [
    # cases — escrita (RF2)
    ("POST",   "/api/cases", _VALID_CASE),
    ("POST",   "/api/cases/generate", {"specialty": "Cardiologia",
                                        "description": "dor toracica", "difficulty": "Básico"}),
    ("PATCH",  f"/api/cases/{_CASE_ID}", {"title": "Editado"}),
    ("DELETE", f"/api/cases/{_CASE_ID}", None),
    ("POST",   f"/api/cases/{_CASE_ID}/assign", {"class_id": _CLASS_ID}),
    ("PATCH",  f"/api/cases/{_CASE_ID}/assignments/{_ASSIGN_ID}", {}),
    ("DELETE", f"/api/cases/{_CASE_ID}/assignments/{_ASSIGN_ID}", None),
    # classes — escrita (RF2)
    ("POST",   "/api/classes", _VALID_CLASS),
    ("PATCH",  f"/api/classes/{_CLASS_ID}", {"name": "Editada"}),
    ("DELETE", f"/api/classes/{_CLASS_ID}", None),
    ("DELETE", f"/api/classes/{_CLASS_ID}/students/{_STUDENT_ID}", None),
    ("POST",   f"/api/classes/{_CLASS_ID}/share/{_TEACHER_ID}", None),
    ("DELETE", f"/api/classes/{_CLASS_ID}/share/{_TEACHER_ID}", None),
    # cases/classes — leitura docente (RF5)
    ("GET",    "/api/cases", None),
    ("GET",    f"/api/cases/{_CASE_ID}", None),
    ("GET",    f"/api/cases/{_CASE_ID}/attempts", None),
    ("GET",    f"/api/cases/{_CASE_ID}/attempts/{_ASSIGN_ID}/messages", None),
    ("GET",    f"/api/cases/{_CASE_ID}/assignments", None),
    ("GET",    "/api/classes", None),
    ("GET",    f"/api/classes/{_CLASS_ID}", None),
    ("GET",    f"/api/classes/{_CLASS_ID}/teachers", None),
    ("GET",    f"/api/classes/{_CLASS_ID}/institution-teachers", None),
]

# Rotas de aluno que NÃO podem ser gateadas (RF3)
NOT_GATED_FOR_STUDENT = [
    ("POST", f"/api/cases/{_CASE_ID}/start", {}),
    ("POST", f"/api/cases/{_CASE_ID}/complete", {"soap_content": "S:.. O:.. A:.. P:.."}),
    ("POST", "/api/cases/evaluate-soap", {"soap_content": "S:.. O:.. A:.. P:.."}),
    ("PATCH", f"/api/cases/attempts/{_ASSIGN_ID}/abandon", None),
    ("POST", "/api/classes/ABC123/join", None),
]


# Mensagem do 403 de ROLE (D3). Usada para distinguir o gate de role de um
# 403 de POSSE ("Acesso negado") ou de um 500 induzido pelo mock.
ROLE_MSG = "Acesso restrito a professores"


def _call(client, method, path, body):
    return client.request(method, path, json=body if body is not None else None)


def _is_role_block(r) -> bool:
    """True somente se a resposta é o 403 do guard de role (por mensagem)."""
    if r.status_code != 403:
        return False
    try:
        return r.json().get("detail") == ROLE_MSG
    except Exception:
        return False


class TestGatedRejectStudent:
    """§5: student é bloqueado pelo guard de role em TODA rota gateada."""
    @pytest.mark.parametrize("method,path,body", GATED)
    def test_student_role_block(self, as_role, method, path, body):
        r = _call(as_role("student"), method, path, body)
        assert _is_role_block(r), (
            f"{method} {path}: esperado 403 '{ROLE_MSG}' para student, "
            f"veio {r.status_code} {r.text[:120]}"
        )


class TestGatedAllowTeacherAdmin:
    """§5: teacher/admin NUNCA recebem o 403 de role (o guard os libera).

    Podem receber outros status (200/404/500/403-de-posse) — o que importa é
    que não seja o bloqueio por role."""
    @pytest.mark.parametrize("method,path,body", GATED)
    def test_teacher_passa_guard(self, as_role, method, path, body):
        r = _call(as_role("teacher"), method, path, body)
        assert not _is_role_block(r), f"{method} {path} não deveria bloquear teacher por role"

    @pytest.mark.parametrize("method,path,body", GATED)
    def test_admin_passa_guard(self, as_role, method, path, body):
        r = _call(as_role("admin"), method, path, body)
        assert not _is_role_block(r), f"{method} {path} não deveria bloquear admin por role"


class TestStudentActionsUntouched:
    """RF3: rotas de aluno nunca recebem o 403 de role."""
    @pytest.mark.parametrize("method,path,body", NOT_GATED_FOR_STUDENT)
    def test_student_nao_role_block(self, as_role, method, path, body):
        r = _call(as_role("student"), method, path, body)
        assert not _is_role_block(r), f"{method} {path} não deveria bloquear student por role"


class TestGenerateStatusCodes:
    """Regressão da nota de implementação da SPEC-001.

    A spec registrou que `POST /cases/generate` devolvia **400** a todos os
    papéis porque o `@limiter.limit` do slowapi consumia o corpo antes do guard.
    O comportamento não é mais reproduzível: o handler é síncrono, o slowapi lê
    apenas `request.client`, e o corpo chega íntegro à validação. Estes testes
    fixam os dois lados para que uma volta ao async (ou um upgrade de slowapi)
    que reintroduza o bug quebre aqui, e não em produção.
    """
    _BODY = {"specialty": "Cardiologia", "description": "dor toracica",
             "difficulty": "Básico"}

    def test_teacher_recebe_200_e_nao_400(self, as_role):
        from unittest.mock import patch
        with patch("app.routes.cases._ai_generate_case", return_value={
                "patient_prompt": "p", "summary": "s", "title": "t",
                "specialty": "Cardiologia"}):
            r = as_role("teacher").post("/api/cases/generate", json=self._BODY)
        assert r.status_code == 200, f"esperado 200, veio {r.status_code} {r.text[:160]}"

    def test_student_recebe_403_de_role(self, as_role):
        r = as_role("student").post("/api/cases/generate", json=self._BODY)
        assert _is_role_block(r), f"esperado 403 de role, veio {r.status_code} {r.text[:160]}"
