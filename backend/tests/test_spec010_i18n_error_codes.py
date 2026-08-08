"""
Testes da SPEC-010 — i18n Fase 2A: códigos de erro estáveis no backend.

Estado esperado ANTES da implementação: **FALHAM** (TDD "vermelho").
- `app.errors` ainda não existe → ImportError.
- O handler de `main.py` ainda não normaliza `HTTPException` → rotas migradas
  continuam com `code` ausente.
Após implementar (SPEC-010 §4), todos passam.

Estratégia (decisão de 2026-07-31): **híbrido**.
- T1, T2, T6, T7, T9, T10, T10b, T11, T12 exercitam o **mecanismo**
  (`http_error` + o handler global) contra um app FastAPI descartável — o
  mesmo handler real de `app.main`, importado, não uma reimplementação — sem
  tocar Supabase. Milissegundos.
- T3, T4, T5, T8 são os únicos que batem na **rota real**: os dois guards
  centrais (`verify_jwt_token`/`verify_teacher`, que cobrem quase toda rota
  autenticada) e um spot-check de quota (429). Isso é integração de fato — o
  resto dos 15 códigos é validado no nível do mecanismo (T7), não replicado
  em 15 rotas com mocks de Supabase.

Achado da implementação (não estava nos 15 códigos do RF4, registrado aqui
porque muda o que T10/T10b podem testar): **nenhum dos 15 sites migrados tem
hoje `detail=str(e)`** — todos já eram strings estáticas. RF5 (sanitizar 5xx /
preservar 4xx) não tem, portanto, um site real para migrar nesta spec; T10 e
T10b testam o **padrão** (`http_error` + `logger.exception`) como uma
convenção documentada e reutilizável para quando a dívida do §9 (long tail)
for migrada, não uma regressão de um endpoint específico.
"""
import re
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.errors import _CODE_PATTERN, http_error
from app.main import http_exception_handler

# Os 15 códigos do RF4 — (code, status, detail pt-BR atual). Usado por T7 (o
# envelope de cada um) e T12 (formato do code). Textos copiados literalmente
# dos sites reais (backend/app/routes/*.py) na data da spec.
RF4_CODES = [
    ("invalid_token", 401, "Token inválido ou expirado"),
    ("invalid_uuid", 400, "case_id inválido"),
    ("forbidden_role", 403, "Acesso restrito a professores"),
    ("access_denied", 403, "Acesso negado"),
    ("invalid_credentials", 401, "Credenciais inválidas — verifique email e senha"),
    ("wrong_password", 401, "Senha atual incorreta"),
    ("case_not_found", 404, "Caso não encontrado"),
    ("class_not_found", 404, "Turma não encontrada"),
    ("user_not_found", 404, "Usuário não encontrado"),
    ("conversation_not_found", 404, "Conversa não encontrada"),
    ("email_already_registered", 409, "E-mail já cadastrado"),
    ("already_enrolled", 409, "Você já está nesta turma"),
    ("case_expired", 410, "Este caso expirou e não está mais disponível"),
    ("ai_quota_exceeded", 429, "Limite diário de 20 sessões de Chat IA atingido. Volte amanhã."),
    ("case_quota_exceeded", 429, "Limite diário de 3 casos atingido. Volte amanhã."),
]


@pytest.fixture
def error_app():
    """App descartável com o handler REAL de `app.main` registrado.

    Não reimplementa a lógica de achatamento — importa `http_exception_handler`
    de `app.main` para que um teste que passe aqui garanta o comportamento real,
    não uma cópia que pode divergir dele.
    """
    fake = FastAPI()
    fake.add_exception_handler(StarletteHTTPException, http_exception_handler)

    @fake.get("/migrated")
    def _migrated():
        raise http_error(404, "case_not_found", "Caso não encontrado")

    @fake.get("/with-params")
    def _with_params():
        raise http_error(429, "ai_quota_exceeded", "Limite diário de 20 sessões atingido.", limit=20)

    @fake.get("/legacy")
    def _legacy():
        # Simula um site AINDA NÃO migrado: HTTPException com detail string solta.
        raise HTTPException(status_code=404, detail="x")

    @fake.get("/5xx-leak")
    def _5xx_sanitized():
        # RF5 (5xx): a mensagem interna nunca deveria vazar ao cliente.
        try:
            raise RuntimeError("connection refused by db-internal-host:5432")
        except RuntimeError as e:
            from app.config import logger
            logger.exception("Erro ao salvar caso")
            raise http_error(500, "case_save_failed", "Erro ao salvar caso.") from e

    @fake.get("/4xx-preserve")
    def _4xx_preserved():
        # RF5 (4xx): mensagem de negócio, escrita para humano — preservada.
        try:
            raise ValueError("Turma já cheia")
        except ValueError as e:
            raise http_error(400, "class_full", str(e)) from e

    return TestClient(fake, raise_server_exceptions=False)


# ── T1, T2: o helper monta o envelope certo ───────────────────────────────────

class TestHttpErrorHelper:
    def test_t1_envelope_basico(self):
        exc = http_error(404, "case_not_found", "Caso não encontrado")
        assert exc.status_code == 404
        assert exc.detail == {"detail": "Caso não encontrado", "code": "case_not_found"}

    def test_t2_params_estruturado(self):
        exc = http_error(429, "ai_quota_exceeded", "Limite diário de 20 atingido.", limit=20)
        assert exc.detail["params"] == {"limit": 20}
        assert exc.detail["code"] == "ai_quota_exceeded"


# ── T6, T11: o handler global normaliza migrado E não migrado ────────────────

class TestHandlerNormalization:
    def test_t6_rota_nao_migrada_vira_code_none(self, error_app):
        """Site com `HTTPException(detail="x")` cru não quebra — ganha code: None."""
        r = error_app.get("/legacy")
        assert r.status_code == 404
        assert r.json() == {"detail": "x", "code": None}

    def test_t11_detail_nunca_e_dict(self, error_app):
        """Trava a regressão do §1.2: 43 pontos do front leem `.detail` como string."""
        for path in ("/migrated", "/legacy", "/with-params"):
            body = error_app.get(path).json()
            assert isinstance(body["detail"], str), (
                f"{path}: detail deveria ser str, veio {type(body['detail'])}"
            )


# ── T7, T12: os 15 códigos do RF4 — envelope e formato ────────────────────────

class TestRF4Codes:
    @pytest.mark.parametrize("code,http_status,detail", RF4_CODES)
    def test_t7_cada_codigo_produz_envelope_correto(self, code, http_status, detail):
        exc = http_error(http_status, code, detail)
        assert exc.status_code == http_status
        assert exc.detail == {"detail": detail, "code": code}

    @pytest.mark.parametrize("code,_status,_detail", RF4_CODES)
    def test_t12_formato_flat_snake_case(self, code, _status, _detail):
        """Trava a convenção E4 contra drift: nunca `case.not_found`, sempre `case_not_found`."""
        assert re.match(_CODE_PATTERN, code), f"code '{code}' não é flat snake_case"


# ── T9: os outros 3 formatos de erro NÃO mudam (regressão do não-objetivo) ────

class TestOtherFormatsUnchanged:
    def test_t9_validation_error_mantem_formato_error_details(self, client):
        r = client.post("/api/login", json={"email": "not-an-email"})
        assert r.status_code == 422
        body = r.json()
        assert "error" in body and "details" in body
        assert "code" not in body

    def test_t9b_exception_generica_mantem_formato_error_message(self):
        """Chama o handler real de `main.py` direto — sem subir um app inteiro
        só para provocar um 500 não tratado."""
        import asyncio
        import json

        from app.main import global_exception_handler

        fake_request = MagicMock()
        fake_request.url.path = "/qualquer"

        resp = asyncio.run(global_exception_handler(fake_request, RuntimeError("boom")))
        body = json.loads(resp.body)

        assert resp.status_code == 500
        assert "error" in body and "message" in body
        assert "code" not in body


# ── T10, T10b: o padrão RF5 (sanitizar 5xx / preservar 4xx) ───────────────────

class TestRF5Pattern:
    def test_t10_5xx_sanitiza_mensagem_interna(self, error_app):
        with patch("app.config.logger.exception") as mock_log:
            r = error_app.get("/5xx-leak")

        assert r.status_code == 500
        body = r.json()
        assert body["code"] == "case_save_failed"
        assert "db-internal-host" not in body["detail"], (
            "a mensagem interna (str(e)) não deve vazar no corpo da resposta"
        )
        assert mock_log.called, "a mensagem interna deveria ir para o log via logger.exception"

    def test_t10b_4xx_preserva_texto_de_negocio(self, error_app):
        r = error_app.get("/4xx-preserve")
        assert r.status_code == 400
        body = r.json()
        assert body["detail"] == "Turma já cheia", (
            "erro de negócio (ValueError com mensagem para humano) deve manter o texto"
        )
        assert body["code"] == "class_full"


# ── T3, T4, T5, T8: os únicos testes de integração real (guards + quota) ─────

class TestRealGuardsAndQuota:
    def test_t3_token_invalido_vira_invalid_token(self, client):
        r = client.get("/api/cases", headers={"Authorization": "Bearer garbage-token"})
        assert r.status_code == 401
        assert r.json().get("code") == "invalid_token"

    def test_t4_student_em_rota_de_professor_vira_forbidden_role(self, as_role):
        r = as_role("student").get("/api/cases")
        assert r.status_code == 403
        assert r.json().get("code") == "forbidden_role"

    def test_t5_uuid_malformado_vira_invalid_uuid(self, as_role):
        r = as_role("admin").delete("/api/admin/users/not-a-uuid")
        assert r.status_code == 400
        assert r.json().get("code") == "invalid_uuid"

    def test_t8_quota_de_ia_esgotada(self, as_role):
        with patch("app.routes.cases._get_daily_quota", return_value={
            "is_paid": True, "ai_available": 0, "ai_limit": 20,
            "regular_available": 5, "regular_limit": 5,
        }):
            r = as_role("student").post("/api/cases/ai/start", json={})

        assert r.status_code == 429
        body = r.json()
        assert body["code"] == "ai_quota_exceeded"
        assert body.get("params", {}).get("limit") == 20
