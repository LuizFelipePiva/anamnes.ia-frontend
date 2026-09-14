"""
Testes da SPEC-004 — cota de tentativas atômica (achado #7).

A garantia de atomicidade (não estourar o limite sob concorrência) é verificada
por **re-ataque concorrente** contra o stack real (ver docs/PENTEST_LOCAL.md e a
saída da sessão), pois um unit test com mocks não prova atomicidade de banco.

Aqui cobrimos, de forma determinística, o contrato de normalização do retorno da
RPC `reserve_case_attempt` (`_reserved_attempt_id`), que decide entre 200 (id) e
429 (None) nos endpoints `start_ai_chat`/`start_attempt`.
"""
from app.routes.cases import _reserved_attempt_id

ID = "11111111-2222-3333-4444-555555555555"


class TestReservedAttemptId:
    def test_none_significa_limite(self):
        assert _reserved_attempt_id(None) is None

    def test_lista_vazia_significa_limite(self):
        assert _reserved_attempt_id([]) is None

    def test_string_uuid(self):
        assert _reserved_attempt_id(ID) == ID

    def test_lista_com_string(self):
        assert _reserved_attempt_id([ID]) == ID

    def test_lista_com_dict(self):
        assert _reserved_attempt_id([{"reserve_case_attempt": ID}]) == ID

    def test_dict(self):
        assert _reserved_attempt_id({"reserve_case_attempt": ID}) == ID
