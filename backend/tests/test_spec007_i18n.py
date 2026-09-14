"""
Testes da SPEC-007 (i18n Fase 0) — persistência do idioma no backend.

Cobre:
- T1: PUT /api/profile/me com language válido → 200 e persiste.
- T2/T3: language não suportado / código não canônico → 400.
- T4: helper de idioma (normalize/is_supported) e default.
- T5: /api/register encaminha o language para signup; get_or_create_user
  inclui language no insert.
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import app.routes.api as api
import app.routes.profile as profile_mod
from app.main import app
from app.auth.security import verify_jwt_token
from app.i18n import SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, is_supported, normalize_language


FAKE_USER = {
    "sub": "00000000-0000-0000-0000-000000000001",
    "email": "aluno@test.local",
    "role": "student",
    "name": "Aluno",
}


@pytest.fixture
def client():
    app.dependency_overrides[verify_jwt_token] = lambda: FAKE_USER
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


def _mock_sb_update(returned_row):
    """MagicMock encadeável do cliente Supabase p/ o update do perfil."""
    sb = MagicMock()
    sb.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [returned_row]
    return sb


# ─── T1 / T2 / T3 — endpoint de update ───────────────────────────────────────

class TestProfileLanguageUpdate:
    def test_language_valido_persiste_200(self, client):
        sb = _mock_sb_update({"id": FAKE_USER["sub"], "language": "es"})
        with patch.object(profile_mod, "get_supabase_client", return_value=sb):
            r = client.put("/api/profile/me", json={"language": "es"})
        assert r.status_code == 200
        # o update foi chamado com o campo language
        update_arg = sb.table.return_value.update.call_args[0][0]
        assert update_arg.get("language") == "es"

    def test_language_update_reemite_jwt_com_novo_idioma(self, client):
        """Ao trocar o idioma, a resposta traz um JWT novo com o language
        atualizado — sem isso o token antigo reverteria a escolha no F5."""
        from jose import jwt as jose_jwt

        from app.config import SECRET_KEY, JWT_ALGORITHM

        sb = _mock_sb_update({"id": FAKE_USER["sub"], "language": "en"})
        with patch.object(profile_mod, "get_supabase_client", return_value=sb):
            r = client.put("/api/profile/me", json={"language": "en"})
        assert r.status_code == 200
        token = r.json().get("token")
        assert token, "resposta deveria conter um token reemitido"
        decoded = jose_jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        assert decoded["language"] == "en"
        assert decoded["sub"] == FAKE_USER["sub"]

    def test_update_sem_language_nao_reemite_token(self, client):
        sb = _mock_sb_update({"id": FAKE_USER["sub"], "name": "Novo Nome"})
        with patch.object(profile_mod, "get_supabase_client", return_value=sb):
            r = client.put("/api/profile/me", json={"name": "Novo Nome"})
        assert r.status_code == 200
        assert "token" not in r.json()

    def test_language_nao_suportado_400(self, client):
        sb = _mock_sb_update({"id": FAKE_USER["sub"]})
        with patch.object(profile_mod, "get_supabase_client", return_value=sb):
            r = client.put("/api/profile/me", json={"language": "de"})
        assert r.status_code == 400
        sb.table.return_value.update.assert_not_called()

    def test_codigo_nao_canonico_400(self, client):
        sb = _mock_sb_update({"id": FAKE_USER["sub"]})
        with patch.object(profile_mod, "get_supabase_client", return_value=sb):
            r = client.put("/api/profile/me", json={"language": "pt_BR"})
        assert r.status_code == 400

    def test_russo_persiste_200(self, client):
        """Russo é idioma suportado desde 2026-07-27 (dicionários ainda em TODO)."""
        sb = _mock_sb_update({"id": FAKE_USER["sub"], "language": "ru"})
        with patch.object(profile_mod, "get_supabase_client", return_value=sb):
            r = client.put("/api/profile/me", json={"language": "ru"})
        assert r.status_code == 200
        assert sb.table.return_value.update.call_args[0][0].get("language") == "ru"


# ─── T4 — helper de idioma ───────────────────────────────────────────────────

class TestLanguageHelper:
    def test_suportados(self):
        assert SUPPORTED_LANGUAGES == ("pt-BR", "en", "es", "ru")
        for lang in SUPPORTED_LANGUAGES:
            assert is_supported(lang)

    def test_nao_suportados(self):
        # `ru` saiu desta lista quando o russo passou a ser suportado; a
        # constraint `users_language_check` do banco precisa acompanhar
        # (migration 20260727000000_add_russian_language.sql).
        for lang in ("de", "pt_BR", "ptbr", "fr", "ru-RU", "", None):
            assert not is_supported(lang)

    def test_normalize_cai_no_default(self):
        assert normalize_language("de") == DEFAULT_LANGUAGE
        assert normalize_language(None) == DEFAULT_LANGUAGE
        assert normalize_language("es") == "es"


# ─── T5 — register encaminha language ────────────────────────────────────────

class TestRegisterForwardsLanguage:
    @pytest.fixture
    def client_no_ratelimit(self):
        api.limiter.enabled = False
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c
        api.limiter.enabled = True
        app.dependency_overrides.clear()

    def test_register_passa_language_para_signup(self, client_no_ratelimit):
        with patch.object(api, "signup", return_value="OK") as m:
            client_no_ratelimit.post(
                "/api/register",
                json={"name": "Fulano", "email": "novo@x.com", "password": "senhaForte123", "language": "es"},
            )
        assert m.call_args[0][4] == "es"  # (name, email, password, role, language)

    def test_register_sem_language_envia_none(self, client_no_ratelimit):
        with patch.object(api, "signup", return_value="OK") as m:
            client_no_ratelimit.post(
                "/api/register",
                json={"name": "Fulano", "email": "novo2@x.com", "password": "senhaForte123"},
            )
        assert m.call_args[0][4] is None

    def test_get_or_create_user_inclui_language_no_insert(self):
        from app.models import user as user_mod

        sb = MagicMock()
        # não acha por email nem por id → cai no insert
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        sb.table.return_value.insert.return_value.execute.return_value.data = [{"id": "u1"}]
        with patch.object(user_mod, "supabase", sb):
            user_mod.get_or_create_user("a@x.com", "A", "u1", "student", "es")
        insert_arg = sb.table.return_value.insert.call_args[0][0]
        assert insert_arg.get("language") == "es"
