"""
Testes da SPEC-012 — RF10: achados objetivos no caso gerado.

Cobre apenas o recorte de RF10 (dentro do escopo pedido): a seção "DADOS
OBJETIVOS DO CASO" dentro do `patient_prompt` gerado, e a instrução no
`_PATIENT_SYSTEM_PROMPT` para o Modo NARRADOR usar esses valores quando
presentes (RF11: degradar sem erro quando ausentes).

Testes de nível de serviço, com `complete_json`/`get_prompt` mockados —
sem chamada real à OpenAI.
"""
import json
from unittest.mock import patch

from app.services.chat_service import _PATIENT_SYSTEM_PROMPT
from app.services.generation_service import generate_case


# ── T21 — patient_prompt COM seção de achados objetivos ──────────────────────

def test_system_prompt_instructs_use_of_provided_objective_data():
    """RF10: o Modo NARRADOR deve ser instruído a usar os valores da seção quando presentes."""
    system = _PATIENT_SYSTEM_PROMPT.format(
        patient_prompt="Você é João, 52 anos.", language_name="Português (Brasil)"
    )
    assert "DADOS OBJETIVOS DO CASO" in system
    assert "USE EXATAMENTE esses valores" in system


def test_objective_data_section_is_preserved_verbatim_in_system_prompt():
    """RF10: os valores do caso (PA, FC etc.) chegam intactos ao prompt do Modo NARRADOR."""
    patient_prompt = (
        "Você é João, 52 anos, dor torácica.\n\n"
        "DADOS OBJETIVOS DO CASO:\n"
        "PA: 130/85 mmHg | FC: 88 bpm | FR: 18 irpm | Temp: 37,4°C | SpO2: 96%\n"
        "Exame físico: ausculta cardíaca sem sopros, MV presente bilateralmente."
    )
    system = _PATIENT_SYSTEM_PROMPT.format(
        patient_prompt=patient_prompt, language_name="Português (Brasil)"
    )
    assert "PA: 130/85 mmHg" in system
    assert "ausculta cardíaca sem sopros" in system


# ── T22 — patient_prompt SEM seção (caso antigo/manual) — RF11 ───────────────

def test_objective_data_section_absent_does_not_raise():
    """RF11: caso sem a seção (manual ou antigo) monta o prompt normalmente, sem erro."""
    patient_prompt = "Você é Maria, 30 anos, cefaleia há 3 dias."
    system = _PATIENT_SYSTEM_PROMPT.format(
        patient_prompt=patient_prompt, language_name="Português (Brasil)"
    )
    assert "DADOS OBJETIVOS DO CASO" not in patient_prompt
    # A redação exata mudou ao sincronizar o fallback com a v15 do Langfuse
    # (2026-08-06): "improvise valores plausíveis" virou "gere um achado
    # plausível e coerente com a hipótese central do caso". O que o RF11 exige
    # é a INSTRUÇÃO de improviso continuar existindo — não a frase antiga.
    assert "gere um achado plausível" in system


# ── Prompt de geração de caso (fonte da seção) ────────────────────────────────

def test_case_generation_prompt_requires_objective_data_section():
    """RF10: o prompt de geração instrui a IA a produzir a seção DADOS OBJETIVOS DO CASO."""
    with patch("app.services.generation_service.get_prompt", return_value=""), \
         patch("app.services.generation_service.complete_json") as mock_complete:
        mock_complete.return_value = json.dumps({
            "title": "t", "specialty": "s", "summary": "su", "patient_prompt": "p",
        })
        generate_case("dor torácica há 2 dias", "Básico")

        sent_messages = mock_complete.call_args[0][0]
        sent_prompt = sent_messages[0]["content"]
        assert "DADOS OBJETIVOS DO CASO" in sent_prompt


def test_case_generation_prompt_keeps_diagnosis_hidden_rule_alongside_objective_data():
    """RF10: achado objetivo não é diagnóstico — a regra de não revelar diagnóstico continua."""
    with patch("app.services.generation_service.get_prompt", return_value=""), \
         patch("app.services.generation_service.complete_json") as mock_complete:
        mock_complete.return_value = json.dumps({
            "title": "t", "specialty": "s", "summary": "su", "patient_prompt": "p",
        })
        generate_case("dor torácica há 2 dias", "Básico")

        sent_prompt = mock_complete.call_args[0][0][0]["content"]
        assert "NÃO inclua o diagnóstico" in sent_prompt
