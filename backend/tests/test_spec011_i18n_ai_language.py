"""
Testes da SPEC-011 — i18n Fase 2B: idioma do usuário nos prompts de IA.

Estado esperado ANTES da implementação: **FALHAM** (TDD "vermelho").
- `handle_chat_message` / `evaluate_soap` ainda não aceitam `language` → TypeError.
- `app.i18n.language_name` ainda não existe → ImportError.
Após implementar (SPEC-011 §4), todos passam.

Estratégia (decisão de 2026-07-31): **híbrido**. O mecanismo é testado no nível
do service, com `get_prompt`/`complete*` mockados — milissegundos, sem TestClient.
Só o que é integração de fato (a rota extrair o claim do JWT e repassar) usa
TestClient.

Três decisões da spec são travadas aqui como regressão, não só descritas:
- **E1** (T8): `generate_case` NÃO recebe idioma — conteúdo gerado é compartilhado
  e gravado no banco; outro idioma violaria D5.
- **E3** (T6): idioma resolvido **por mensagem**, não por conversa — ninguém deve
  "consertar" isso adicionando `conversations.language` sem retomar a decisão.
- **RF6** (T7): claim ausente cai em `pt-BR` sem exceção.

Alvos de `patch` — os serviços importam **por nome**
(`from app.services.openai_service import get_prompt`), então o binding a
sobrescrever é o do módulo consumidor (`app.services.chat_service.get_prompt`),
nunca o de origem. O mesmo vale para as rotas.
"""
from unittest.mock import MagicMock, patch

import pytest

from app.auth.security import verify_jwt_token
from app.main import app

USER_ID = "00000000-0000-0000-0000-000000000001"
CONV_ID = "00000000-0000-0000-0000-0000000000cf"
CASE_ID = "00000000-0000-0000-0000-0000000000ca"

_ABSENT = object()  # distingue "claim ausente" de "claim com valor"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sb_returning(rows):
    """Mock de query builder cujo `.data` é `rows` em qualquer profundidade."""

    class _M(MagicMock):
        def _get_child_mock(self, **kwargs):
            return self

        @property
        def data(self):
            return rows

    return _M()


@pytest.fixture
def as_user(client):
    """Autentica com `role`/`language` arbitrários.

    `language=_ABSENT` omite o claim — simula JWT emitido antes da Fase 0.
    """

    def _set(role: str = "student", language=_ABSENT):
        payload = {"sub": USER_ID, "email": f"{role}@test.local",
                   "role": role, "name": role.capitalize()}
        if language is not _ABSENT:
            payload["language"] = language
        app.dependency_overrides[verify_jwt_token] = lambda: payload
        return client

    return _set


@pytest.fixture
def chat_deps():
    """Neutraliza tudo que `handle_chat_message` toca, menos o prompt.

    Devolve o mock de `get_prompt` para inspeção do argumento `language`.
    """
    with patch("app.services.chat_service.get_messages", return_value=[]), \
         patch("app.services.chat_service.save_message"), \
         patch("app.services.chat_service.get_max_turns", return_value=100), \
         patch("app.services.chat_service.complete_with_files", return_value="ok"), \
         patch("app.services.chat_service.get_prompt", return_value="SYSTEM") as gp:
        yield gp


@pytest.fixture
def eval_deps():
    """Idem para `evaluate_soap`. `complete_json` devolve JSON cru (a função faz `json.loads`)."""
    with patch("app.services.eval_service.complete_json",
               return_value='{"score": 80, "feedback": "ok"}'), \
         patch("app.services.eval_service.get_prompt", return_value="SYSTEM") as gp:
        yield gp


def _chat_route_patches():
    """Isola a rota `POST /api/gpt` do que não é objeto do teste.

    `app.routes.api.supabase` é um cliente de módulo (`from app.auth.client import
    supabase`, api.py:9) — escapa do `dependency_overrides` e do patch do
    conftest, que só cobre `get_supabase_client`. Sem neutralizá-lo, a busca do
    `patient_prompt` (api.py:220) tenta rede real.
    """
    return (
        patch("app.routes.api.supabase", _sb_returning([])),
        patch("app.routes.api.enforce_daily_limit"),
    )


# ── T1–T2: chat_service recebe e repassa o idioma (RF2/RF3) ───────────────────

class TestChatServiceLanguage:
    def test_t1_repassa_idioma_ao_prompt(self, chat_deps):
        """T1 — `language="en"` chega ao `get_prompt` do paciente virtual."""
        from app.services.chat_service import handle_chat_message

        handle_chat_message(USER_ID, CONV_ID, "oi", "persona", language="en")

        assert chat_deps.call_args.kwargs.get("language") == "en", (
            "get_prompt deveria receber language='en'; recebeu "
            f"{chat_deps.call_args.kwargs!r}"
        )

    def test_t2_default_pt_br(self, chat_deps):
        """T2 — sem `language`, o default é pt-BR (regressão: chamador antigo não quebra)."""
        from app.services.chat_service import handle_chat_message

        handle_chat_message(USER_ID, CONV_ID, "oi", "persona")

        assert chat_deps.call_args.kwargs.get("language") == "pt-BR"


# ── T3: eval_service recebe e repassa o idioma (RF2/RF3) ──────────────────────

class TestEvalServiceLanguage:
    def test_t3_repassa_idioma_ao_prompt(self, eval_deps):
        """T3 — `language="es"` entra nas variáveis do prompt de avaliação."""
        from app.services.eval_service import evaluate_soap

        evaluate_soap("S: ... O: ... A: ... P: ...", "resumo do caso", language="es")

        assert eval_deps.call_args.kwargs.get("language") == "es", (
            "get_prompt deveria receber language='es'; recebeu "
            f"{eval_deps.call_args.kwargs!r}"
        )


# ── T4, T6, T7: a rota de chat extrai o claim e repassa (RF1/RF6/E3) ──────────

class TestChatRouteLanguage:
    def _post(self, client, msg="oi"):
        return client.post("/api/gpt", json={"thread_id": CONV_ID, "message": msg})

    def test_t4_idioma_do_jwt_chega_ao_service(self, as_user):
        """T4 — JWT com `language: "en"` → `handle_chat_message(language="en")`."""
        from app.db.supabase import get_supabase_client

        p_sb, p_limit = _chat_route_patches()
        with p_sb, p_limit, \
             patch("app.routes.api.handle_chat_message", return_value="resp") as hcm:
            app.dependency_overrides[get_supabase_client] = \
                lambda: _sb_returning([{"user_id": USER_ID}])
            r = self._post(as_user("student", "en"))

        assert r.status_code == 200, f"esperado 200, veio {r.status_code}: {r.text[:200]}"
        assert hcm.call_args.kwargs.get("language") == "en", (
            f"handle_chat_message deveria receber language='en'; veio {hcm.call_args!r}"
        )

    def test_t6_idioma_resolvido_por_mensagem(self, as_user):
        """T6 — duas mensagens na MESMA conversa, idiomas diferentes (trava a E3).

        Se alguém travar o idioma na conversa (via `conversations.language`),
        a segunda chamada continuaria em pt-BR e este teste quebra.
        """
        from app.db.supabase import get_supabase_client

        p_sb, p_limit = _chat_route_patches()
        with p_sb, p_limit, \
             patch("app.routes.api.handle_chat_message", return_value="resp") as hcm:
            app.dependency_overrides[get_supabase_client] = \
                lambda: _sb_returning([{"user_id": USER_ID}])

            self._post(as_user("student", "pt-BR"), "primeira")
            self._post(as_user("student", "en"), "segunda")

        idiomas = [c.kwargs.get("language") for c in hcm.call_args_list]
        assert idiomas == ["pt-BR", "en"], (
            f"cada mensagem deveria usar o idioma do momento; veio {idiomas}"
        )

    def test_t7_claim_ausente_cai_em_pt_br(self, as_user):
        """T7 — JWT sem o claim `language` (token pré-Fase 0) → pt-BR, sem exceção."""
        from app.db.supabase import get_supabase_client

        p_sb, p_limit = _chat_route_patches()
        with p_sb, p_limit, \
             patch("app.routes.api.handle_chat_message", return_value="resp") as hcm:
            app.dependency_overrides[get_supabase_client] = \
                lambda: _sb_returning([{"user_id": USER_ID}])
            r = self._post(as_user("student"))  # sem language

        assert r.status_code == 200, f"claim ausente não pode virar erro; veio {r.status_code}"
        assert hcm.call_args.kwargs.get("language") == "pt-BR"


# ── T5: os DOIS caminhos de avaliação SOAP (§1.2) ─────────────────────────────

class TestBothSoapPaths:
    """A avaliação SOAP tem dois call sites e é fácil migrar só um.

    - `cases.py:950` usa o alias do topo (`_ai_evaluate_soap`).
    - `cases.py:873` (`/evaluate-soap`) faz **import local dentro da função**, então
      o patch precisa mirar a origem (`app.services.eval_service.evaluate_soap`),
      não o módulo da rota.

    Migrar só um deixa metade da avaliação em português sem sintoma óbvio.
    """

    def test_t5a_rota_standalone_repassa_idioma(self, as_user):
        with patch("app.services.eval_service.evaluate_soap",
                   return_value={"score": 80, "feedback": "ok"}) as ev:
            c = as_user("student", "es")
            r = c.post("/api/cases/evaluate-soap",
                       json={"soap_content": "S: .. O: .. A: .. P: .."})

        assert r.status_code == 200, f"esperado 200, veio {r.status_code}: {r.text[:200]}"
        assert ev.call_args.kwargs.get("language") == "es", (
            f"/evaluate-soap deveria repassar language='es'; veio {ev.call_args!r}"
        )

    def test_t5b_rota_complete_repassa_idioma(self, as_user):
        # `complete_attempt` chama `get_supabase_client()` direto (cases.py:905),
        # fora do `Depends` — o alvo é o símbolo no módulo, não o override.
        attempt = [{"id": CASE_ID, "student_id": USER_ID, "case_id": CASE_ID,
                    "conversation_id": CONV_ID, "status": "in_progress"}]
        with patch("app.routes.cases.get_supabase_client",
                   return_value=_sb_returning(attempt)), \
             patch("app.routes.cases._ai_evaluate_soap",
                   return_value={"score": 80, "feedback": "ok"}) as ev:
            c = as_user("student", "es")
            r = c.post(f"/api/cases/{CASE_ID}/complete",
                       json={"soap_content": "S: .. O: .. A: .. P: .."})

        assert ev.called, (
            f"o fluxo de complete não chegou à avaliação (status {r.status_code}); "
            "ajuste o mock do attempt se a rota mudou"
        )
        assert ev.call_args.kwargs.get("language") == "es", (
            f"/complete deveria repassar language='es'; veio {ev.call_args!r}"
        )


# ── T8: generate_case NÃO recebe idioma (trava a E1 / D5) ─────────────────────

class TestGenerateStaysPortuguese:
    def test_t8_generate_nao_recebe_idioma(self, as_user):
        """T8 — caso gerado é conteúdo compartilhado do banco: continua pt-BR.

        Este teste existe para **impedir** que alguém adicione `language` aqui por
        simetria com chat/eval. Ver SPEC-011 §8 (E1) e docs/I18N.md (D5).
        """
        with patch("app.routes.cases._ai_generate_case", return_value={
                "patient_prompt": "p", "summary": "s", "title": "t",
                "specialty": "Cardiologia"}) as gen:
            c = as_user("teacher", "ru")
            c.post("/api/cases/generate", json={
                "specialty": "Cardiologia", "description": "dor toracica",
                "difficulty": "Básico"})

        assert gen.called, "a rota de geração não foi exercitada"
        assert "language" not in gen.call_args.kwargs, (
            "generate_case NÃO deve receber idioma (E1/D5): conteúdo gerado é "
            "compartilhado da turma e gravado no banco. Se a decisão mudou, "
            "atualize a SPEC-011 §8 antes deste teste."
        )


# ── T9: mapeamento de idioma para nome legível (RF4) ──────────────────────────

class TestLanguageName:
    @pytest.mark.parametrize("code,esperado", [
        ("pt-BR", "português brasileiro"),
        ("en", "English"),
        ("es", "español"),
        ("ru", "русский"),
    ])
    def test_t9_mapeia_idiomas_suportados(self, code, esperado):
        from app.i18n import language_name

        assert language_name(code) == esperado

    @pytest.mark.parametrize("code", [None, "", "de", "pt_BR", "xx-YY"])
    def test_t9b_desconhecido_cai_no_default(self, code):
        """Idioma fora dos 4 suportados → pt-BR, coerente com `normalize_language`."""
        from app.i18n import language_name

        assert language_name(code) == "português brasileiro"

    def test_t9c_cobre_todos_os_idiomas_suportados(self):
        """Guarda: idioma novo em SUPPORTED_LANGUAGES exige entrada em language_name.

        Sem isto, adicionar um 5º idioma passaria silenciosamente a gerar prompts
        pedindo resposta em "português brasileiro".
        """
        from app.i18n import SUPPORTED_LANGUAGES, language_name

        default = language_name("pt-BR")
        sem_mapeamento = [
            lang for lang in SUPPORTED_LANGUAGES
            if lang != "pt-BR" and language_name(lang) == default
        ]
        assert not sem_mapeamento, (
            f"idiomas suportados sem nome próprio em language_name: {sem_mapeamento}"
        )
