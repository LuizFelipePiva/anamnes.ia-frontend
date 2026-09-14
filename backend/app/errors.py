"""
Envelope de erro estável para o front traduzir (SPEC-010, D4).

Todo `HTTPException` migrado usa `http_error()` em vez de `detail="string"`
direto — o `code` é o que o front consome via `t("errors.<code>")`; o `detail`
continua o texto pt-BR de hoje, usado como fallback se a chave não existir.

O achatamento de `{"detail", "code", "params"?}` no corpo da resposta HTTP
acontece no handler global (`app/main.py`), não aqui — sem ele, o FastAPI
serializaria este `detail` (um dict) aninhado dentro de outro `detail`.
"""
from fastapi import HTTPException

# `code` é string opaca para o front (E4): flat snake_case, sem ponto — o
# i18next trataria `.` como separador de nível e acoplaria o code à estrutura
# aninhada do dicionário de tradução.
_CODE_PATTERN = r"^[a-z][a-z0-9_]*$"


def http_error(status_code: int, code: str, detail: str, **params) -> HTTPException:
    """Monta um `HTTPException` com `code` estável (e `params` opcional).

    `params` carrega valores estruturados (ex.: `limit=20`) para erros cujo
    texto interpola números — o front recompõe a frase traduzida via
    `t("errors.<code>", params)` em vez de depender do `detail` pt-BR.
    """
    payload: dict = {"detail": detail, "code": code}
    if params:
        payload["params"] = params
    return HTTPException(status_code=status_code, detail=payload)
