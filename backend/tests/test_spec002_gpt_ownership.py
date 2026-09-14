"""
Testes da SPEC-002 — checagem de dono da conversa em `POST /api/gpt` (achado #1).

Estado esperado ANTES da implementação: FALHAM (TDD "vermelho") — hoje o /gpt
não checa dono, então atacante recebe != 404 e a escrita acontece.

Estratégia: isola a checagem de dono.
- `get_supabase_client` (DI) é substituído por um mock cujo SELECT em
  `conversations` retorna o dono controlado (ou vazio = inexistente).
- `enforce_daily_limit`, `handle_chat_message` e o `supabase` de módulo (usado no
  lookup de patient_prompt) são patchados no namespace de `app.routes.api`, para
  que o único fator sob teste seja o dono.
Assim afirmamos: atacante → 404 e `handle_chat_message` NÃO chamado (sem escrita);
RF2 → `enforce_daily_limit` também não chamado (ownership antes da cota).
"""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

import app.routes.api as api
from app.main import app
from app.auth.security import verify_jwt_token
from app.db.supabase import get_supabase_client

VICTIM = "00000000-0000-0000-0000-000000000001"
ATTACKER = "00000000-0000-0000-0000-000000000002"
OWNER = VICTIM


def _sb_with_owner(owner):
    """Mock do cliente Supabase: SELECT em conversations retorna o dono dado
    (owner=None → conversa inexistente)."""
    sb = MagicMock()
    data = [] if owner is None else [{"user_id": owner}]
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = data
    return sb


@pytest.fixture
def gpt_env(monkeypatch):
    """Prepara o ambiente e devolve um builder (owner, caller) -> (client, spies)."""
    hcm = MagicMock(return_value="resposta do paciente")
    edl = MagicMock(return_value=None)
    monkeypatch.setattr(api, "handle_chat_message", hcm)
    monkeypatch.setattr(api, "enforce_daily_limit", edl)
    monkeypatch.setattr(api, "supabase", MagicMock())  # evita rede no lookup de patient_prompt

    def _build(owner, caller):
        app.dependency_overrides[get_supabase_client] = lambda: _sb_with_owner(owner)
        app.dependency_overrides[verify_jwt_token] = lambda: {
            "sub": caller, "email": "x@test.local", "role": "student", "name": "x",
        }
        client = TestClient(app, raise_server_exceptions=False)
        return client, hcm, edl

    yield _build
    app.dependency_overrides.clear()


def _post_gpt(client, thread_id="00000000-0000-0000-0000-0000000000c1", message="oi"):
    return client.post("/api/gpt", json={"thread_id": thread_id, "message": message})


class TestGptOwnership:
    def test_atacante_recebe_404_sem_escrever(self, gpt_env):
        """Atacante com conversa de outro → 404 e handle_chat_message NÃO chamado."""
        client, hcm, edl = gpt_env(owner=VICTIM, caller=ATTACKER)
        r = _post_gpt(client)
        assert r.status_code == 404, f"esperado 404, veio {r.status_code} {r.text[:120]}"
        assert r.json().get("detail") == "Acesso negado"
        hcm.assert_not_called()  # nenhuma mensagem gravada
        edl.assert_not_called()  # RF2: dono checado antes da cota

    def test_conversa_inexistente_404(self, gpt_env):
        client, hcm, _ = gpt_env(owner=None, caller=ATTACKER)
        r = _post_gpt(client)
        assert r.status_code == 404
        assert r.json().get("detail") == "Conversa não encontrada"
        hcm.assert_not_called()

    def test_dono_legitimo_passa(self, gpt_env):
        """Dono da conversa → não é bloqueado por dono; fluxo segue (handle chamado)."""
        client, hcm, _ = gpt_env(owner=OWNER, caller=OWNER)
        r = _post_gpt(client)
        assert r.status_code != 404, f"dono não deveria tomar 404, veio {r.status_code}"
        hcm.assert_called_once()

    def test_sem_thread_id_400(self, gpt_env):
        """Comportamento inalterado: falta thread_id (message válido) → 400."""
        client, _, _ = gpt_env(owner=OWNER, caller=OWNER)
        r = client.post("/api/gpt", json={"message": "oi"})
        assert r.status_code == 400
