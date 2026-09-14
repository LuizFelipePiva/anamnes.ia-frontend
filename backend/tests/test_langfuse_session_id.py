"""Rastreamento por sessão no Langfuse: `session_id` = `conversation_id`.

Antes disto, os traces do paciente virtual eram anônimos — `openai_service` só
passava `name=trace_name`, sem nada que ligasse a chamada à conversa. Duas
consequências práticas: não dava para reconstruir uma consulta inteira no
Langfuse (cada mensagem virava um trace solto), nem para anexar uma avaliação
externa (anamnes-bench) de volta à conversa que a originou.

O ponto delicado é a degradação: `session_id`/`name` só existem no wrapper
`langfuse.openai`. Sem Langfuse configurado, `client` é o SDK puro da OpenAI e
esses kwargs derrubariam a chamada — por isso `_langfuse_kwargs` devolve dict
vazio nesse caso, e é isso que os testes travam.
"""

from unittest.mock import MagicMock, patch

from app.services import openai_service


class TestLangfuseKwargs:
    def test_sem_langfuse_nao_passa_kwargs_de_rastreamento(self):
        """O SDK puro da OpenAI rejeita `name`/`session_id` — o dict tem de sair vazio."""
        with patch.object(openai_service, "_langfuse", None):
            assert openai_service._langfuse_kwargs("qualquer", "conv-1") == {}

    def test_com_langfuse_passa_name_e_session_id(self):
        with patch.object(openai_service, "_langfuse", MagicMock()):
            kwargs = openai_service._langfuse_kwargs("patient-chat", "conv-42")

        assert kwargs == {"name": "patient-chat", "session_id": "conv-42"}

    def test_session_id_ausente_mantem_so_o_name(self):
        """Chamadas fora de conversa (geração de caso, avaliação SOAP) não têm sessão."""
        with patch.object(openai_service, "_langfuse", MagicMock()):
            assert openai_service._langfuse_kwargs("gerar-caso") == {"name": "gerar-caso"}

    def test_session_id_vazio_nao_vira_sessao(self):
        with patch.object(openai_service, "_langfuse", MagicMock()):
            assert "session_id" not in openai_service._langfuse_kwargs("x", "")

    def test_responses_metadata_vazio_sem_langfuse(self):
        with patch.object(openai_service, "_langfuse", None):
            assert openai_service._responses_metadata("conv-1") == {}

    def test_responses_metadata_vazio_sem_sessao(self):
        with patch.object(openai_service, "_langfuse", MagicMock()):
            assert openai_service._responses_metadata(None) == {}


class TestPropagacaoNasChamadas:
    def _cliente_fake(self):
        cliente = MagicMock()
        cliente.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content="resposta"))
        ]
        cliente.responses.create.return_value.output_text = "resposta"
        return cliente

    def test_complete_repassa_session_id(self):
        cliente = self._cliente_fake()
        with (
            patch.object(openai_service, "client", cliente),
            patch.object(openai_service, "_langfuse", MagicMock()),
            patch.object(openai_service, "get_max_tokens", return_value=600),
        ):
            openai_service.complete([{"role": "user", "content": "oi"}], session_id="conv-7")

        assert cliente.chat.completions.create.call_args.kwargs["session_id"] == "conv-7"

    def test_complete_with_files_usa_metadata_nunca_session_id(self):
        """REGRESSÃO de um bug real (2026-08-06) que quebrava toda conversa.

        O wrapper `langfuse.openai` extrai `session_id` em
        `chat.completions.create`, mas NÃO em `responses.create` — lá o kwarg
        vaza para o SDK e levanta
        `Responses.create() got an unexpected keyword argument 'session_id'`.
        Como `responses.create` é o caminho do paciente virtual em produção
        (com vector store), a conversa inteira caía no fallback
        "Desculpe, não consegui processar sua mensagem".

        Testes com cliente falso NÃO pegam isso: um MagicMock aceita qualquer
        kwarg. Por isso este teste afirma o que NÃO pode ser passado.
        """
        cliente = self._cliente_fake()
        with (
            patch.object(openai_service, "client", cliente),
            patch.object(openai_service, "_langfuse", MagicMock()),
            patch.object(openai_service, "VECTOR_STORE_ID", "vs-1"),
            patch.object(openai_service, "get_max_tokens", return_value=600),
        ):
            openai_service.complete_with_files(
                [{"role": "system", "content": "sys"}, {"role": "user", "content": "oi"}],
                trace_name="patient-chat",
                session_id="conv-9",
            )

        kwargs = cliente.responses.create.call_args.kwargs
        assert "session_id" not in kwargs, "responses.create rejeita session_id"
        assert "name" not in kwargs, "responses.create rejeita name"
        assert kwargs["metadata"]["langfuse_session_id"] == "conv-9"
        assert kwargs["metadata"]["conversation_id"] == "conv-9"

    def test_fallback_sem_vector_store_preserva_session_id(self):
        """Sem vector store cai em `complete()` — a sessão não pode se perder no caminho."""
        cliente = self._cliente_fake()
        with (
            patch.object(openai_service, "client", cliente),
            patch.object(openai_service, "_langfuse", MagicMock()),
            patch.object(openai_service, "VECTOR_STORE_ID", None),
            patch.object(openai_service, "get_max_tokens", return_value=600),
        ):
            openai_service.complete_with_files(
                [{"role": "user", "content": "oi"}],
                trace_name="patient-chat",
                session_id="conv-11",
            )

        assert cliente.chat.completions.create.call_args.kwargs["session_id"] == "conv-11"

    def test_sem_langfuse_a_chamada_nao_leva_kwargs_extras(self):
        """Regressão: passar `session_id` ao SDK puro quebraria toda conversa."""
        cliente = self._cliente_fake()
        with (
            patch.object(openai_service, "client", cliente),
            patch.object(openai_service, "_langfuse", None),
            patch.object(openai_service, "get_max_tokens", return_value=600),
        ):
            openai_service.complete([{"role": "user", "content": "oi"}], session_id="conv-13")

        kwargs = cliente.chat.completions.create.call_args.kwargs
        assert "session_id" not in kwargs
        assert "name" not in kwargs


def test_chat_service_usa_o_conversation_id_como_sessao():
    """O elo que motivou tudo: o id da conversa no banco vira a sessão no Langfuse."""
    from app.services import chat_service

    with (
        patch.object(chat_service, "get_messages", return_value=[]),
        patch.object(chat_service, "save_message"),
        patch.object(chat_service, "get_prompt", return_value="system"),
        patch.object(chat_service, "get_max_turns", return_value=30),
        patch.object(chat_service, "complete_with_files", return_value="ok") as chamada,
    ):
        chat_service.handle_chat_message(
            user_id="u-1",
            conversation_id="conv-abc",
            message="Bom dia",
            patient_prompt="paciente",
        )

    assert chamada.call_args.kwargs["session_id"] == "conv-abc"


class TestPromptLabel:
    """`LANGFUSE_PROMPT_LABEL` permite validar prompt candidato sem promover.

    Sem isto, testar uma mudança no prompt do paciente exigia publicá-la com o
    label `production` — ou seja, para todos os alunos — e só então descobrir
    se funcionou.
    """

    def test_default_e_production(self, monkeypatch):
        monkeypatch.delenv("LANGFUSE_PROMPT_LABEL", raising=False)
        lf = MagicMock()
        with patch.object(openai_service, "_langfuse", lf):
            openai_service.get_prompt("patient-system-prompt")

        assert lf.get_prompt.call_args.kwargs["label"] == "production"

    def test_env_var_troca_o_label(self, monkeypatch):
        monkeypatch.setenv("LANGFUSE_PROMPT_LABEL", "guardrail-declarativa-v14")
        lf = MagicMock()
        with patch.object(openai_service, "_langfuse", lf):
            openai_service.get_prompt("patient-system-prompt")

        assert lf.get_prompt.call_args.kwargs["label"] == "guardrail-declarativa-v14"

    def test_label_inexistente_cai_no_fallback_local(self, monkeypatch):
        """Nunca derruba a conversa: string vazia faz o chamador usar o prompt local."""
        monkeypatch.setenv("LANGFUSE_PROMPT_LABEL", "nao-existe")
        lf = MagicMock()
        lf.get_prompt.side_effect = RuntimeError("not found")
        with patch.object(openai_service, "_langfuse", lf):
            assert openai_service.get_prompt("patient-system-prompt") == ""
