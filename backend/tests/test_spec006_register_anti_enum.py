"""
Testes da SPEC-006 — anti-enumeração de e-mail no cadastro (achado #5).

Estado esperado ANTES da implementação: FALHAM (TDD "vermelho") — hoje o
/register responde 409 "E-mail já cadastrado" para e-mail existente e
200 {user, token} para e-mail novo, o que permite enumerar.

Contrato NOVO (a implementar):
- `signup(...)` retorna um **status string** (sem token): "OK" (novo, e-mail de
  confirmação enviado), "EMAIL_EXISTS", "INVALID_EMAIL", "RATE_LIMIT" ou "ERROR".
- `api_register` mapeia:
    "OK" | "EMAIL_EXISTS" -> 200 genérico {"message": ...}, SEM token (indistinguível)
    "INVALID_EMAIL"       -> 400 "E-mail inválido"      (não depende de existência)
    "RATE_LIMIT"          -> 429
    "ERROR"/inesperado    -> 500 genérico
Estratégia: patch de `api.signup` para controlar o status e afirmar que os ramos
"OK" e "EMAIL_EXISTS" são byte-a-byte iguais e nunca trazem token/409.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import app.routes.api as api
from app.main import app

VALID = {"name": "Fulano", "email": "novo@exemplo.com", "password": "senhaForte123"}


@pytest.fixture
def client_no_ratelimit():
    """TestClient com rate limit desabilitado (o /register é 2/min e vários
    testes disparam mais que isso na mesma sessão)."""
    api.limiter.enabled = False
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    api.limiter.enabled = True
    app.dependency_overrides.clear()


def _register(client, **overrides):
    body = {**VALID, **overrides}
    return client.post("/api/register", json=body)


class TestIndistinguivel:
    def test_novo_e_existente_retornam_mesmo_status_e_corpo(self, client_no_ratelimit):
        with patch.object(api, "signup", return_value="OK"):
            r_novo = _register(client_no_ratelimit, email="novo@exemplo.com")
        with patch.object(api, "signup", return_value="EMAIL_EXISTS"):
            r_existe = _register(client_no_ratelimit, email="existe@exemplo.com")

        assert r_novo.status_code == 200
        assert r_existe.status_code == r_novo.status_code
        assert r_existe.json() == r_novo.json()

    def test_nunca_retorna_token(self, client_no_ratelimit):
        for status in ("OK", "EMAIL_EXISTS"):
            with patch.object(api, "signup", return_value=status):
                r = _register(client_no_ratelimit)
            assert r.status_code == 200
            assert "token" not in r.json()

    def test_nunca_retorna_409(self, client_no_ratelimit):
        with patch.object(api, "signup", return_value="EMAIL_EXISTS"):
            r = _register(client_no_ratelimit, email="existe@exemplo.com")
        assert r.status_code != 409


class TestErrosSegurosContinuamExplicitos:
    def test_email_invalido_400(self, client_no_ratelimit):
        with patch.object(api, "signup", return_value="INVALID_EMAIL"):
            r = _register(client_no_ratelimit, email="bad@exemplo.com")
        assert r.status_code == 400

    def test_rate_limit_429(self, client_no_ratelimit):
        with patch.object(api, "signup", return_value="RATE_LIMIT"):
            r = _register(client_no_ratelimit)
        assert r.status_code == 429

    def test_erro_inesperado_500_generico(self, client_no_ratelimit):
        with patch.object(api, "signup", return_value="ERROR"):
            r = _register(client_no_ratelimit)
        assert r.status_code == 500
        assert "token" not in r.json()
