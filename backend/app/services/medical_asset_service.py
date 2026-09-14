"""
Exames complementares anexáveis ao caso (SPEC-014).

Este módulo é deliberadamente composto de **funções puras**: montagem de URL,
serialização e rótulo. A regra que mais importa aqui — o aluno nunca recebe o
diagnóstico — só é testável de forma barata se estiver fora da rota.

`base_url` é sempre parâmetro, nunca leitura de env dentro da função: sem isso
o teste passaria a depender do `.env` da máquina.
"""

# Nome do bucket público que guarda os binários (ver a migração 20260814).
BUCKET = "medical-assets"

# Modalidades reconhecidas. A lista existe para que uma modalidade nova entre no
# catálogo sem que o aluno veja um rótulo cru do banco: o que não estiver aqui
# cai em `unknown` (§6 da spec).
KNOWN_MODALITIES = (
    "ecg",
    "radiografia",
    "tomografia",
    "ultrassonografia",
    "fundoscopia",
    "dermatoscopia",
    "espirometria",
    "gasometria",
    "colonoscopia",
    # Ausculta é sonora e vem separada por foco: dizer ao aluno se o estetoscópio
    # estava no precórdio ou no tórax posterior é dado do exame, não gabarito —
    # o achado (sopro, sibilo) continua só no `display_name`, que ele não recebe.
    "ausculta_cardiaca",
    "ausculta_pulmonar",
)

# Teto por caso (§7). Não é limitação técnica: são quantos exames cabem numa
# tentativa sem virar caça ao tesouro.
MAX_EXAMS_PER_CASE = 8

_LABEL_PREFIX = "exams.modality."
UNKNOWN_LABEL_KEY = f"{_LABEL_PREFIX}unknown"


def public_url(storage_path: str | None, base_url: str) -> str | None:
    """URL pública do binário no bucket, a partir do caminho relativo.

    A tabela guarda só `storage_path`; compor aqui é o que permite trocar de
    bucket ou pôr um CDN na frente sem reescrever centenas de linhas.
    """
    if not storage_path:
        return None
    return f"{(base_url or '').rstrip('/')}/storage/v1/object/public/{BUCKET}/{storage_path.lstrip('/')}"


def asset_url(row: dict, base_url: str) -> str | None:
    """URL de exibição do asset, respeitando o modo de armazenamento.

    `remote` (mídia hospedada por terceiros) ignora `storage_path` — o binário
    nunca foi para o nosso bucket, então compor o caminho daria um 404.
    """
    if (row.get("storage_mode") or "supabase") == "remote":
        return row.get("remote_url")
    return public_url(row.get("storage_path"), base_url)


def neutral_label_key(modality: str | None) -> str:
    """Chave i18n do rótulo que o aluno vê.

    Devolve **chave**, nunca texto pronto: a tradução é do front, e um texto
    aqui vazaria idioma para dentro da API. Modalidade desconhecida ou vazia cai
    no genérico — jamais no `display_name`, que é o gabarito.
    """
    slug = (modality or "").strip().lower()
    if slug not in KNOWN_MODALITIES:
        return UNKNOWN_LABEL_KEY
    return f"{_LABEL_PREFIX}{slug}"


def to_teacher_dto(row: dict, base_url: str) -> dict:
    """Serialização para professor/admin — **inclui o gabarito**, de propósito."""
    return {
        "id": row.get("id"),
        "modality": row.get("modality"),
        "display_name": row.get("display_name"),
        "diagnosis_or_finding": row.get("diagnosis_or_finding"),
        "url": asset_url(row, base_url),
        "media_type": row.get("media_type") or "image",
        "tags": row.get("tags") or [],
        "attachment_eligible": bool(row.get("attachment_eligible", True)),
        "credits": row.get("credits"),
        "license": row.get("license"),
        "source_url": row.get("source_url"),
    }


def to_student_dto(row: dict, ordinal: int | None, base_url: str) -> dict:
    """Serialização para o aluno — **sem** `display_name` e `diagnosis_or_finding`.

    Construída campo a campo, e não filtrando o DTO do professor: se amanhã o
    catálogo ganhar uma coluna com o achado, ela não aparece aqui por omissão.
    É a diferença entre uma regra que se mantém sozinha e uma que depende de
    alguém lembrar de atualizar uma lista de exclusão.

    ⚠️ **`id` não vai para o aluno**, e a ausência é a regra, não um esquecimento:
    o acervo usa identificadores falantes (`RX-PNEUMO-001`, `DERM-ANGIOMA-001`),
    então o campo era gabarito escrito por extenso — bastava abrir a aba Network.
    Nada do lado do aluno precisa dele: a lista é ordenada pelo professor e o
    front usa a posição. Se algum dia precisar (marcar "já vi este exame"), o
    identificador tem que ser opaco — não este.

    `label` é um par `{key, ordinal}` em vez de texto: a numeração de exames
    repetidos ("Radiografia 1", "Radiografia 2") é desempate posicional, então
    precisa sobreviver à tradução sem que o backend escolha o idioma.
    """
    return {
        "label": {"key": neutral_label_key(row.get("modality")), "ordinal": ordinal},
        "url": asset_url(row, base_url),
        "media_type": row.get("media_type") or "image",
        "credits": row.get("credits"),
    }


def to_student_list(rows: list[dict], base_url: str) -> list[dict]:
    """DTOs do aluno na ordem definida pelo professor, com a numeração resolvida.

    A numeração só aparece quando a modalidade se repete no caso: um único ECG
    é "Eletrocardiograma", não "Eletrocardiograma 1" — o índice sem par não
    informa nada e só polui a tela.
    """
    ordered = sorted(rows, key=lambda r: (r.get("position") or 0, str(r.get("id") or "")))

    counts: dict[str, int] = {}
    for row in ordered:
        key = neutral_label_key(row.get("modality"))
        counts[key] = counts.get(key, 0) + 1

    seen: dict[str, int] = {}
    out: list[dict] = []
    for row in ordered:
        key = neutral_label_key(row.get("modality"))
        if counts[key] > 1:
            seen[key] = seen.get(key, 0) + 1
            ordinal = seen[key]
        else:
            ordinal = None
        out.append(to_student_dto(row, ordinal, base_url))
    return out


def normalize_asset_ids(asset_ids: list[str]) -> list[str]:
    """Limpa a lista recebida no `PUT`: sem vazios, sem repetidos, ordem preservada.

    Duplicata é deduplicada em silêncio (decisão Q6 do contrato de teste): o par
    (caso, exame) é único por natureza, e devolver 422 para o professor que
    clicou duas vezes seria punir um não-erro.
    """
    seen: set[str] = set()
    out: list[str] = []
    for raw in asset_ids or []:
        asset_id = (raw or "").strip()
        if not asset_id or asset_id in seen:
            continue
        seen.add(asset_id)
        out.append(asset_id)
    return out
