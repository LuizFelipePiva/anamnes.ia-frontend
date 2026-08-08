"""
Infra de testes do backend.

Define variáveis de ambiente mínimas ANTES de importar a app (o módulo de
config e o cliente Supabase são resolvidos no import) e expõe helpers para
injetar um usuário autenticado com um `role` arbitrário via dependency_overrides.
"""
import os

# Env mínimo para importar a app sem tocar em serviços reais.
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_KEY", "test-service-role-key")
os.environ.setdefault("SECRET_KEY", "test-secret-key-0123456789-abcdefghij-KL")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-dummy")
os.environ.setdefault("OPENAI_VECTOR_STORE_ID", "vs_test")
os.environ.setdefault("ENVIRONMENT", "development")

from contextlib import ExitStack
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.auth.security import verify_jwt_token
from app.db.supabase import get_supabase_client
from app.main import app

# Módulos que chamam `get_supabase_client()` DIRETO (não via `Depends`).
#
# `app.dependency_overrides` só intercepta o que a rota declara como dependência
# do FastAPI — hoje 9 sites. Os outros 64 chamam a função direto no corpo do
# handler, escapam do override e constroem um cliente Supabase real, que tenta
# rede de verdade e só desiste no timeout. Era o que fazia a suíte levar 3min39s
# (`test_spec001` sozinho respondia por ~46 clientes reais).
#
# Ao adicionar um módulo novo que use o cliente direto, inclua-o aqui.
_MODULES_WITH_DIRECT_CLIENT = (
    "app.routes.admin",
    "app.routes.api",
    "app.routes.cases",
    "app.routes.classes",
    "app.routes.dashboard",
    "app.routes.health",
    "app.routes.profile",
    "app.routes.questions",
)


class SupabaseChainMock(MagicMock):
    """Mock do query builder do Supabase que devolve **resultado vazio**.

    Um `MagicMock` cru não serve: `.execute().data` vira um mock, que é sempre
    *truthy*. `classes.create_class` faz

        while sb.table("classes").select("id").eq("code", code).execute().data:

    para sortear um código livre — com `.data` truthy isso é um **laço infinito**.
    Aqui `.data` é `[]` (falsy) e qualquer encadeamento devolve o próprio objeto,
    então cadeias de qualquer profundidade funcionam sem configuração.

    Um teste que precise de linhas de volta sobrescreve o trecho que lhe importa
    com um `MagicMock` comum, como já fazem `test_spec007` e `test_spec004`.
    """

    def _get_child_mock(self, **kwargs):
        return self

    @property
    def data(self):
        return []


@pytest.fixture(autouse=True)
def _no_real_openai():
    """Blindagem de rede: nenhum teste toca a API da OpenAI de verdade.

    `openai_service` expõe wrappers (`complete`, `complete_json`, …) que os
    services importam **por nome** — patchar os wrappers exigiria conhecer cada
    binding. O cliente do SDK, porém, é global do módulo e resolvido em runtime
    dentro dos wrappers: um patch aqui cobre todos os caminhos de uma vez.

    Sem isso, qualquer rota que chegue à IA com a chave dummy do ambiente de
    teste faz HTTP real e só desiste no timeout + retries — era o que fazia
    `POST /api/cases/generate` custar ~5,9s por teste.
    """
    with patch("app.services.openai_service.client", MagicMock()):
        yield


def _fake_payload(role: str) -> dict:
    return {
        "sub": "00000000-0000-0000-0000-000000000001",
        "email": f"{role}@test.local",
        "role": role,
        "name": role.capitalize(),
    }


@pytest.fixture
def client():
    """TestClient sem nenhuma chamada real ao banco.

    Cobre os dois caminhos pelos quais uma rota obtém o cliente: o `Depends`
    (via `dependency_overrides`) e a chamada direta no corpo do handler (via
    `patch` no símbolo importado em cada módulo — ver `_MODULES_WITH_DIRECT_CLIENT`).
    """
    app.dependency_overrides[get_supabase_client] = lambda: SupabaseChainMock()
    with ExitStack() as stack:
        for module in _MODULES_WITH_DIRECT_CLIENT:
            stack.enter_context(
                patch(f"{module}.get_supabase_client", return_value=SupabaseChainMock())
            )
        # raise_server_exceptions=False: um 500 induzido pelo mock vira resposta 500,
        # não uma exceção re-levantada — isolamos o que testamos (o guard de role).
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c
    app.dependency_overrides.clear()


@pytest.fixture
def as_role(client):
    """
    Retorna uma função que fixa o `role` do usuário autenticado.
    Uso: as_role("student") -> client autenticado como student.
    """
    def _set(role: str):
        app.dependency_overrides[verify_jwt_token] = lambda: _fake_payload(role)
        return client
    return _set
