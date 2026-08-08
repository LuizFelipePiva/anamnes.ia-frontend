"""
Serviço de geração de casos clínicos via GPT.
Recebe descrição do professor e retorna JSON estruturado do caso.
"""
import json
import re

from app.config import logger
from app.services.openai_service import complete_json, get_prompt


def _sanitize_description(text: str) -> str:
    """Remove tentativas de prompt injection e caracteres perigosos."""
    # Remove blocos que tentam redefinir instruções
    text = re.sub(r'(?i)(ignore|forget|disregard)\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)', '', text)
    # Remove delimitadores de bloco que poderiam enganar o modelo
    text = re.sub(r'---+', '', text)
    text = re.sub(r'```+', '', text)
    # Garante limite de 500 caracteres
    text = text[:500].strip()
    return text

# ── Prompt local (fallback se Langfuse indisponível) ──────────────────────────
_CASE_GENERATION_PROMPT = """\
Você é um especialista em educação médica. Gere um caso clínico realista para simulação de anamnese.

INSTRUÇÃO DO PROFESSOR:
{description}

NÍVEL DE DIFICULDADE: {difficulty}
(Básico = queixa clara, poucos diferenciais | Intermediário = alguns diferenciais | Avançado = apresentação atípica ou múltiplas comorbidades)

GERE um JSON válido com EXATAMENTE esta estrutura:
{{
  "title": "<nome do caso — ex: 'Dor torácica em homem de 52 anos'>",
  "specialty": "<especialidade principal — ex: Cardiologia, Clínica Médica>",
  "difficulty": "<Básico | Intermediário | Avançado>",
  "summary": "<resumo clínico em 2-3 linhas para o professor — inclui diagnóstico provável>",
  "patient_prompt": "<instruções completas do personagem para a IA jogar o papel do paciente. Inclua: nome, idade, sexo, profissão, personalidade, queixa principal, HDA completa, antecedentes pessoais, medicamentos em uso, histórico familiar relevante, hábitos de vida. Escreva em segunda pessoa: 'Você é João, 52 anos...'. AO FINAL do texto, inclua obrigatoriamente uma seção delimitada exatamente como no exemplo abaixo, com os dados objetivos que o Modo NARRADOR vai usar: 'DADOS OBJETIVOS DO CASO:\\nPA: <valor> | FC: <valor> | FR: <valor> | Temp: <valor> | SpO2: <valor>\\nExame físico: <achados de ausculta, palpação, percussão etc., coerentes com o diagnóstico e a dificuldade do caso>'>"
}}

REGRAS:
- O patient_prompt deve conter informações suficientes para responder qualquer pergunta pertinente de anamnese.
- NÃO inclua o diagnóstico no patient_prompt — apenas sintomas e história. Os DADOS OBJETIVOS DO CASO são achados de exame, não diagnóstico, e não violam esta regra.
- Os valores em DADOS OBJETIVOS DO CASO devem ser clinicamente coerentes com o diagnóstico provável e com o nível de dificuldade (ex.: Avançado pode ter achados atípicos, mas plausíveis).
- O caso deve ser clinicamente coerente e educacionalmente relevante.
- Responda APENAS o JSON, sem texto adicional."""


def generate_case(description: str, difficulty: str) -> dict:
    """
    Gera um caso clínico completo a partir da descrição do professor.

    Returns:
        {
            "patient_prompt": str,
            "summary": str,
            "title": str,
            "specialty": str | None,
        }
    """
    # Sanitiza input antes de inserir no prompt
    description = _sanitize_description(description)

    # Tenta buscar prompt do Langfuse, senão usa fallback local
    prompt = get_prompt(
        "case-generation-prompt",
        description=description,
        difficulty=difficulty,
    )
    if not prompt:
        prompt = _CASE_GENERATION_PROMPT.format(
            description=description,
            difficulty=difficulty,
        )

    messages = [{"role": "user", "content": prompt}]

    try:
        raw = complete_json(messages, temperature=0.7, max_tokens=1200, trace_name="case-generation")
        result = json.loads(raw)
        return {
            "patient_prompt": result.get("patient_prompt", ""),
            "summary": result.get("summary", "Caso clínico gerado por IA"),
            "title": result.get("title", "Caso Clínico"),
            "specialty": result.get("specialty"),
        }
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"[GenerationService] Falha ao parsear caso gerado: {e}")
        raise
