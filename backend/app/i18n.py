"""
Idiomas suportados pela plataforma (fonte da verdade no backend).

Mantém os códigos **idênticos** aos do frontend (`src/core/i18n`) e à coluna
`users.language` — nunca usar `pt_BR`/`ptbr`. Ver `docs/I18N.md` (D1) e
`docs/specs/SPEC-007-i18n-fase0.md`.

Ao adicionar um idioma, atualize os quatro pontos em conjunto: esta lista,
`SUPPORTED_LANGS` (frontend), `LANGS` em `scripts/i18nCsv.mjs` e a constraint
`users_language_check` no banco (via migration) — senão o usuário escolhe o
idioma, a UI troca, mas o `PUT /profile/me` falha e a escolha some no F5.
"""

SUPPORTED_LANGUAGES: tuple[str, ...] = ("pt-BR", "en", "es", "ru")
DEFAULT_LANGUAGE = "pt-BR"


def is_supported(language: str | None) -> bool:
    return language in SUPPORTED_LANGUAGES


def normalize_language(language: str | None) -> str:
    """Retorna o idioma se suportado; caso contrário, o default (`pt-BR`)."""
    return language if is_supported(language) else DEFAULT_LANGUAGE


# Nome por extenso de cada idioma suportado, usado nos prompts de IA (SPEC-011
# RF4) — "responda em {language_name}" funciona melhor que o código BCP 47.
_LANGUAGE_NAMES: dict[str, str] = {
    "pt-BR": "português brasileiro",
    "en": "English",
    "es": "español",
    "ru": "русский",
}


def language_name(language: str | None) -> str:
    """Nome por extenso do idioma; desconhecido cai no default (`pt-BR`)."""
    return _LANGUAGE_NAMES[normalize_language(language)]
