"""
Serviço de avaliação SOAP.
Avalia a anamnese do aluno e retorna nota + feedback detalhado por categoria.
A nota final é calculada deterministicamente em Python usando pesos definidos pelo professor.
"""
import json

from app.config import logger
from app.i18n import language_name
from app.services.openai_service import EVAL_MODEL, complete_json, get_prompt

_DEFAULT_WEIGHTS = {"S": 25, "O": 25, "A": 25, "P": 25}

# Mapeamento dimensão → chave do breakdown retornado pela IA
_DIM_KEYS = ["subjetivo", "objetivo", "avaliacao", "plano"]
_DIM_TO_LETTER = {"subjetivo": "S", "objetivo": "O", "avaliacao": "A", "plano": "P"}

# ── Prompt local (fallback se Langfuse indisponível) ──────────────────────────
_SOAP_EVALUATION_PROMPT = """\
Você é um preceptor de medicina avaliando a anamnese e o SOAP escrito por um estudante após uma consulta simulada.

CASO CLÍNICO (contexto do paciente):
{case_summary}

SOAP DO ESTUDANTE:
{soap_content}

PESOS DA AVALIAÇÃO (definidos pelo professor deste caso):
- S — Subjetivo: {weight_S}%
- O — Objetivo:  {weight_O}%
- A — Avaliação: {weight_A}%
- P — Plano:     {weight_P}%

TAREFA:
Avalie o SOAP nas 4 dimensões abaixo. Para cada uma, dê uma nota de **0 a 100** e um comentário direto.
Direcione seu rigor de acordo com os pesos: dimensões com peso maior merecem avaliação mais criteriosa.

1. S — Subjetivo (queixa principal, HDA, história pregressa, familiar, social)
   - O estudante identificou a queixa corretamente?
   - A HDA está completa (início, duração, localização, irradiação, fatores de melhora/piora, sintomas associados)?

2. O — Objetivo (sinais vitais, exame físico relevante)
   - O estudante pediu ou registrou os dados objetivos pertinentes?

3. A — Avaliação (hipótese diagnóstica)
   - A hipótese é compatível com o quadro clínico apresentado?
   - Considerou diagnósticos diferenciais relevantes?

4. P — Plano (conduta, exames, encaminhamentos)
   - A conduta proposta é adequada e segura para o nível de atenção?

REGRAS:
- Se o aluno escreveu respostas genéricas, vazias ou sem relação com o caso (ex: "teste", "abc"), a nota DEVE ser entre 0 e 10.
- Se o SOAP está incompleto ou superficial, a nota deve ser proporcional ao esforço real.
- Seja justo mas rigoroso. Não infle notas.
- O campo "score" no JSON deve ser ignorado pelo sistema — ele é apenas referência. A nota final será calculada pelo servidor usando as notas individuais e os pesos.

IDIOMA: Escreva o campo "feedback" (e os "feedback" do breakdown) sempre em {language_name}, independentemente do idioma do SOAP ou do caso clínico.

Responda APENAS em JSON válido, sem texto fora do JSON:
{{
  "breakdown": {{
    "subjetivo": {{"score": <0-100>, "feedback": "<comentário direto>"}},
    "objetivo":  {{"score": <0-100>, "feedback": "<comentário direto>"}},
    "avaliacao": {{"score": <0-100>, "feedback": "<comentário direto>"}},
    "plano":     {{"score": <0-100>, "feedback": "<comentário direto>"}}
  }},
  "feedback": "<parágrafo final com os pontos mais importantes para o estudante melhorar>"
}}"""


def _normalize_weights(weights: dict | None) -> dict:
    """Normaliza pesos para frações (somam 1.0). Usa default 25/25/25/25 se None."""
    w = {k: float(v) for k, v in (weights or _DEFAULT_WEIGHTS).items()}
    total = sum(w.values())
    if total <= 0:
        total = 100.0
    return {k: v / total for k, v in w.items()}


def evaluate_soap(
    soap_content: str,
    case_summary: str,
    conversation_history: str = "",
    weights: dict | None = None,
    language: str = "pt-BR",
) -> dict:
    """
    Avalia o SOAP do aluno e retorna score + feedback.
    weights: {"S": int, "O": int, "A": int, "P": int} somando 100. None → 25/25/25/25.
    language: idioma do aluno (claim do JWT — SPEC-011). O feedback nasce no
        idioma do aluno, não do professor que criou o caso (decisão E2, ver
        SPEC-011 §8): a tentativa fica coerente — SOAP e feedback no mesmo idioma.

    Returns:
        {"score": int, "feedback": str, "breakdown": dict | None}
    """
    fractions = _normalize_weights(weights)
    raw_weights = weights or _DEFAULT_WEIGHTS

    # Monta contexto enriquecido com histórico da conversa (se disponível)
    full_summary = case_summary
    if conversation_history:
        full_summary = f"{case_summary}\n\nHISTÓRICO DA ANAMNESE:\n{conversation_history}"

    # Tenta buscar prompt do Langfuse, senão usa fallback local
    prompt_vars = {
        "case_summary": full_summary,
        "soap_content": soap_content,
        "weight_S": raw_weights.get("S", 25),
        "weight_O": raw_weights.get("O", 25),
        "weight_A": raw_weights.get("A", 25),
        "weight_P": raw_weights.get("P", 25),
        "language": language,
        "language_name": language_name(language),
    }
    system = get_prompt("soap-evaluation-prompt", **prompt_vars)
    if not system:
        system = _SOAP_EVALUATION_PROMPT.format(**prompt_vars)

    messages = [{"role": "user", "content": system}]

    try:
        raw = complete_json(messages, model=EVAL_MODEL, temperature=0.3, max_tokens=2500, trace_name="soap-evaluation")
        result = json.loads(raw)

        breakdown_raw = result.get("breakdown") or {}

        if breakdown_raw:
            # Calcula score final deterministicamente com pesos do professor
            score = 0.0
            breakdown = {}
            for dim_key in _DIM_KEYS:
                letter = _DIM_TO_LETTER[dim_key]
                dim_data = breakdown_raw.get(dim_key, {})
                dim_score = min(100, max(0, int(dim_data.get("score", 0))))
                weight_pct = int(raw_weights.get(letter, 25))
                fraction = fractions.get(letter, 0.25)
                score += dim_score * fraction
                breakdown[dim_key] = {
                    "score": dim_score,
                    "weight": weight_pct,
                    "feedback": dim_data.get("feedback", ""),
                }
            score = round(score)
        else:
            # Sem breakdown (ex.: prompt do Langfuse em formato antigo) —
            # usa o score top-level do modelo em vez de zerar a nota do aluno
            logger.warning("[EvalService] Resposta sem 'breakdown'; usando score top-level do modelo")
            score = int(result.get("score") or 0)
            breakdown = None

        score = min(100, max(0, score))

        feedback = result.get("feedback") or result.get("feedback_geral") or "Não foi possível avaliar."

        # Cap anti-inflação: SOAP vazio/genérico → score 10
        soap_stripped = soap_content.strip()
        meaningful_words = [w for w in soap_stripped.split() if w.lower() not in ("s:", "o:", "a:", "p:")]
        if len(meaningful_words) <= 8 and score > 10:
            logger.info(f"[EvalService] SOAP trivial detectado ({len(meaningful_words)} palavras), cap score {score}→10")
            score = 10

        return {"score": score, "feedback": feedback, "breakdown": breakdown}

    except (json.JSONDecodeError, ValueError, Exception) as e:
        logger.warning(f"[EvalService] Falha ao parsear avaliação SOAP: {e}")
        return {
            "score": None,
            "feedback": "Não foi possível avaliar automaticamente. Consulte seu professor.",
            "breakdown": None,
        }
