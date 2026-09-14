"""
SPEC-013 §6.8 (fase 3b) — perfil SOAP.

Cobre a agregação por dimensão em `routes/profile.py::_soap_profile`: janela
móvel das últimas N tentativas avaliadas, descarte de tentativas sem
`breakdown` (anteriores à migration ou com falha da IA) e de breakdown parcial.
"""
from app.routes.profile import _SOAP_WINDOW, _soap_profile


def attempt(subjetivo=None, objetivo=None, avaliacao=None, plano=None, breakdown="auto"):
    """Tentativa com breakdown no formato gravado por `eval_service.evaluate_soap`."""
    if breakdown == "auto":
        breakdown = {
            dim: {"score": score, "weight": 25, "feedback": ""}
            for dim, score in (
                ("subjetivo", subjetivo), ("objetivo", objetivo),
                ("avaliacao", avaliacao), ("plano", plano),
            )
            if score is not None
        }
    return {"id": "a", "score": 70, "breakdown": breakdown}


def test_media_por_dimensao():
    out = _soap_profile([
        attempt(80, 60, 40, 20),
        attempt(60, 40, 20, 80),
    ])
    assert out == {"attempts": 2, "subjetivo": 70.0, "objetivo": 50.0, "avaliacao": 30.0, "plano": 50.0}


def test_sem_breakdown_devolve_none():
    """Aluno com tentativas todas anteriores à migration: nada a exibir."""
    assert _soap_profile([attempt(breakdown=None), attempt(breakdown=None)]) is None
    assert _soap_profile([]) is None


def test_ignora_tentativas_sem_breakdown_sem_zerar_a_media():
    out = _soap_profile([attempt(breakdown=None), attempt(80, 80, 80, 80)])
    assert out["attempts"] == 1
    assert out["subjetivo"] == 80.0


def test_breakdown_parcial_e_descartado():
    """Faltando uma dimensão, a tentativa inteira sai: senão as médias ficam
    calculadas sobre amostras de tamanhos diferentes e deixam de ser comparáveis."""
    assert _soap_profile([attempt(80, 80, 80)]) is None


def test_breakdown_em_formato_invalido_nao_quebra():
    assert _soap_profile([{"id": "a", "breakdown": "não é dict"}]) is None
    assert _soap_profile([attempt("alto", 60, 40, 20)]) is None


def test_janela_movel_pega_as_mais_recentes():
    """`attempts` chega ordenado por started_at desc — a janela é o começo da lista."""
    recentes = [attempt(90, 90, 90, 90) for _ in range(_SOAP_WINDOW)]
    antigas = [attempt(10, 10, 10, 10) for _ in range(5)]

    out = _soap_profile(recentes + antigas)
    assert out["attempts"] == _SOAP_WINDOW
    assert out["subjetivo"] == 90.0


def test_arredonda_para_uma_casa():
    out = _soap_profile([attempt(70, 0, 0, 0), attempt(71, 0, 0, 0), attempt(73, 0, 0, 0)])
    assert out["subjetivo"] == 71.3
