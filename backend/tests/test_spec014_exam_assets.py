"""
SPEC-014 — exames complementares anexáveis ao caso.

Contrato: `docs/specs/SPEC-014-casos-de-teste.md`, grupos T1–T6 e T8.

O grupo T1 é o que mais importa: `display_name` é literalmente o diagnóstico
("Pneumotórax"), e entregá-lo junto da imagem resolve o caso para o aluno antes
de ele raciocinar. A defesa é testada em três níveis de propósito — função pura
(T1), HTTP (T5.3) e DOM (T12.3 no Vitest) — porque o vazamento pode nascer em
qualquer um deles independentemente.
"""
from unittest.mock import patch

import pytest

from app.routes.medical_assets import link_rows_to_assets
from app.services.medical_asset_service import (
    KNOWN_MODALITIES,
    MAX_EXAMS_PER_CASE,
    UNKNOWN_LABEL_KEY,
    asset_url,
    neutral_label_key,
    normalize_asset_ids,
    public_url,
    to_student_dto,
    to_student_list,
    to_teacher_dto,
)

BASE_URL = "https://proj.supabase.co"

TEACHER_ID = "00000000-0000-0000-0000-000000000001"
OTHER_TEACHER_ID = "00000000-0000-0000-0000-0000000000ff"
CASE_ID = "11111111-1111-4111-8111-111111111111"
ATTEMPT_ID = "22222222-2222-4222-8222-222222222222"


def asset(**overrides) -> dict:
    """Asset de radiografia com diagnóstico distintivo — a isca dos testes T1."""
    row = {
        "id": "RX-PNEUMO-001",
        "modality": "radiografia",
        "display_name": "Radiografia de tórax — Pneumotórax",
        "diagnosis_or_finding": "Pneumotórax",
        # Caminho opaco (derivado do sha256 pela ingestão): o binário é servido
        # por URL pública e o nome do arquivo aparece inteiro no `src` da <img>.
        # Um `assets/radiografia/rx-pneumo-001.webp` entregava o diagnóstico com
        # um clique direito, sem nem precisar do inspetor.
        "storage_path": "assets/ab/abc123.webp",
        "remote_url": None,
        "storage_mode": "supabase",
        "media_type": "image",
        "attachment_eligible": True,
        "tags": ["tórax", "urgência"],
        "license": None,
        "source_url": None,
        "credits": None,
        "sha256": "abc123",
    }
    row.update(overrides)
    return row


# ═══════════════════════════════════════════════════════════════════════════
# T1 — to_student_dto: anti-vazamento de gabarito
# ═══════════════════════════════════════════════════════════════════════════

def test_t1_1_student_dto_sem_display_name():
    dto = to_student_dto(asset(), None, BASE_URL)
    assert "display_name" not in dto


def test_t1_2_student_dto_sem_diagnosis():
    dto = to_student_dto(asset(), None, BASE_URL)
    assert "diagnosis_or_finding" not in dto


def test_t1_3_nenhum_valor_do_dto_contem_o_diagnostico():
    """Pega vazamento por `label`, `url` ou por um campo novo qualquer.

    Checar chave a chave só encontraria o que já sabemos procurar; varrer os
    valores serializados encontra o campo que alguém acrescentar amanhã.
    """
    row = asset()
    dto = to_student_dto(row, 1, BASE_URL)
    serialized = repr(dto).lower()
    assert row["diagnosis_or_finding"].lower() not in serialized
    # "pneumo" e não "pneumot": o `id` do acervo abrevia ("RX-PNEUMO-001") e o
    # prefixo truncado deixava passar exatamente o vazamento que este teste
    # existe para pegar. Vale para `storage_path` pela mesma razão.
    assert "pneumo" not in serialized


def test_t1_4_student_dto_tem_exatamente_as_chaves_previstas():
    dto = to_student_dto(asset(), 2, BASE_URL)
    assert set(dto.keys()) == {"label", "url", "media_type", "credits"}


def test_t1_7_id_do_acervo_nao_vai_para_o_aluno():
    """O identificador é falante — `RX-PNEUMO-001` é o diagnóstico por extenso.

    Não bastava esconder `display_name`: o `id` viajava no JSON e aparecia na
    aba Network com um clique. Nada do lado do aluno depende dele (a ordem vem
    do professor), então a correção é simplesmente não enviá-lo.
    """
    dto = to_student_dto(asset(), None, BASE_URL)
    assert "id" not in dto
    assert "RX-PNEUMO-001" not in repr(dto)


def test_t1_5_student_dto_preserva_credits():
    """Atribuição de licença é obrigação legal, não enfeite (§9 Q3)."""
    credits = {"author": "Dr. Fulano", "license": "CC BY-SA 4.0"}
    dto = to_student_dto(asset(credits=credits), None, BASE_URL)
    assert dto["credits"] == credits


def test_t1_6_audio_chega_ao_aluno_como_audio_e_sem_gabarito():
    """Ausculta: o aluno precisa saber que é som, e nada mais.

    Se `media_type` se perdesse no caminho, o front cairia no ramo `<img>` e o
    exame viraria imagem quebrada — falha silenciosa, porque nada estoura.
    """
    # `id` e caminho falantes de propósito: nenhum dos dois pode reaparecer no
    # DTO. Era assim que o gabarito escapava antes — não pelo `display_name`,
    # que sempre esteve barrado, mas pelo identificador e pelo nome do arquivo.
    row = asset(
        id="AUSC-SOPRO-001",
        modality="ausculta_cardiaca",
        display_name="Ausculta cardíaca — Sopro sistólico aórtico",
        diagnosis_or_finding="Sopro sistólico aórtico",
        storage_path="assets/9f/9f21ee.mp3",
        media_type="audio",
    )
    dto = to_student_dto(row, None, BASE_URL)

    assert dto["media_type"] == "audio"
    assert dto["label"]["key"] == "exams.modality.ausculta_cardiaca"
    assert "sopro" not in repr(dto).lower()


def test_t1_r2_nao_muta_a_entrada():
    row = asset()
    snapshot = dict(row)
    to_student_dto(row, 1, BASE_URL)
    to_teacher_dto(row, BASE_URL)
    assert row == snapshot


# ═══════════════════════════════════════════════════════════════════════════
# T2 — neutral_label_key
# ═══════════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("modality", KNOWN_MODALITIES)
def test_t2_1_modalidades_conhecidas(modality):
    assert neutral_label_key(modality) == f"exams.modality.{modality}"


def test_t2_2_modalidade_desconhecida_nao_cai_no_display_name():
    assert neutral_label_key("pet-ct") == UNKNOWN_LABEL_KEY


@pytest.mark.parametrize("value", [None, "", "   "])
def test_t2_3_modalidade_vazia_nao_lanca(value):
    assert neutral_label_key(value) == UNKNOWN_LABEL_KEY


@pytest.mark.parametrize("value", [None, "ecg", "pet-ct", "ECG"])
def test_t2_4_retorno_e_sempre_chave_i18n(value):
    assert neutral_label_key(value).startswith("exams.modality.")


# ═══════════════════════════════════════════════════════════════════════════
# T3 — public_url / asset_url
# ═══════════════════════════════════════════════════════════════════════════

def test_t3_1_monta_a_url_publica_do_bucket():
    url = public_url("assets/ecg/x.webp", BASE_URL)
    assert url == f"{BASE_URL}/storage/v1/object/public/medical-assets/assets/ecg/x.webp"


def test_t3_2_barra_final_na_base_nao_duplica():
    assert "//storage" not in public_url("assets/ecg/x.webp", BASE_URL + "/")


def test_t3_3_asset_remoto_usa_remote_url_e_ignora_storage_path():
    row = asset(storage_mode="remote", remote_url="https://upload.wikimedia.org/a.ogv")
    assert asset_url(row, BASE_URL) == "https://upload.wikimedia.org/a.ogv"


def test_t3_4_sem_caminho_e_sem_url_devolve_none():
    assert asset_url(asset(storage_path=None), BASE_URL) is None
    assert public_url(None, BASE_URL) is None


# ═══════════════════════════════════════════════════════════════════════════
# Numeração posicional (§6) — desempate de exames da mesma modalidade
# ═══════════════════════════════════════════════════════════════════════════

def test_exame_unico_da_modalidade_nao_recebe_numeracao():
    dtos = to_student_list([asset(id="A", position=0)], BASE_URL)
    assert dtos[0]["label"]["ordinal"] is None


def test_modalidade_repetida_recebe_numeracao_por_posicao():
    rows = [
        asset(id="B", position=1, storage_path="assets/bb/bb.webp"),
        asset(id="A", position=0, storage_path="assets/aa/aa.webp"),
        asset(id="C", modality="ecg", position=2, storage_path="assets/cc/cc.webp"),
    ]
    dtos = to_student_list(rows, BASE_URL)
    # A ordem é conferida pela URL: o `id` deixou de ir para o aluno, e é a URL
    # que amarra cada item ao asset certo na tela.
    assert [d["url"].rsplit("/", 1)[-1] for d in dtos] == ["aa.webp", "bb.webp", "cc.webp"]
    assert [d["label"]["ordinal"] for d in dtos] == [1, 2, None]


# ═══════════════════════════════════════════════════════════════════════════
# normalize_asset_ids (Q6 — dedup silencioso)
# ═══════════════════════════════════════════════════════════════════════════

def test_normalize_deduplica_preservando_a_ordem():
    assert normalize_asset_ids(["A", "A", "B", " ", "", "B", "C"]) == ["A", "B", "C"]


# ═══════════════════════════════════════════════════════════════════════════
# Fake do Supabase para as rotas
# ═══════════════════════════════════════════════════════════════════════════

class _FakeQuery:
    """Query builder mínimo: registra filtros e resolve no `execute()`.

    Só implementa o que estas rotas usam. Fake em vez de MagicMock porque os
    testes de idempotência (T4.8) precisam que o estado sobreviva entre
    chamadas — um mock devolveria sempre a mesma resposta encenada e provaria
    apenas que a rota foi chamada, não que o resultado no banco é o mesmo.
    """

    def __init__(self, db: dict, table: str):
        self.db = db
        self.table_name = table
        self.op = "select"
        self.payload = None
        self.filters: dict = {}
        self.in_filters: dict = {}
        self.joined = False

    def select(self, columns="*", *_, **__):
        self.op = "select"
        self.joined = "medical_assets(" in str(columns)
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def upsert(self, payload):
        self.op, self.payload = "upsert", payload
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, column, value):
        self.filters[column] = value
        return self

    def in_(self, column, values):
        self.in_filters[column] = list(values)
        return self

    def order(self, *_, **__):
        return self

    def limit(self, *_, **__):
        return self

    def single(self):
        return self

    def _matches(self, row: dict) -> bool:
        if any(row.get(col) != val for col, val in self.filters.items()):
            return False
        return all(row.get(col) in vals for col, vals in self.in_filters.items())

    def execute(self):
        rows = self.db.setdefault(self.table_name, [])

        if self.op == "delete":
            self.db[self.table_name] = [r for r in rows if not self._matches(r)]
            return _FakeResult([])

        if self.op in ("insert", "upsert"):
            new = self.payload if isinstance(self.payload, list) else [self.payload]
            rows.extend(new)
            return _FakeResult(list(new))

        matched = [r for r in rows if self._matches(r)]

        if self.joined:
            assets = {a["id"]: a for a in self.db.get("medical_assets", [])}
            matched = [
                {"position": r.get("position", 0), "medical_assets": assets.get(r["asset_id"])}
                for r in sorted(matched, key=lambda r: r.get("position", 0))
            ]

        return _FakeResult(matched)


class _FakeResult:
    def __init__(self, data):
        self.data = data


class _FakeSupabase:
    def __init__(self, db: dict):
        self.db = db

    def table(self, name: str) -> _FakeQuery:
        return _FakeQuery(self.db, name)


@pytest.fixture
def db():
    """Banco em memória com um caso do professor e três assets."""
    return {
        "cases": [{"id": CASE_ID, "teacher_id": TEACHER_ID, "title": "Caso"}],
        "case_exam_assets": [],
        "case_attempts": [],
        "medical_assets": [
            asset(),
            asset(id="RX-DERRAME-001", diagnosis_or_finding="Derrame pleural",
                  display_name="Radiografia — Derrame pleural"),
            asset(id="ECG-FA-001", modality="ecg", diagnosis_or_finding="Fibrilação atrial",
                  display_name="ECG — Fibrilação atrial"),
            asset(id="GASO-001", modality="gasometria", attachment_eligible=False,
                  diagnosis_or_finding="Acidose metabólica",
                  display_name="Gasometria — Acidose metabólica"),
        ],
    }


@pytest.fixture
def api(as_role, db):
    """Cliente autenticado com o `_FakeSupabase` no lugar do mock genérico."""
    def _build(role: str = "teacher"):
        client = as_role(role)
        fake = _FakeSupabase(db)
        stack = [
            patch("app.routes.cases.get_supabase_client", return_value=fake),
            patch("app.routes.medical_assets.get_supabase_client", return_value=fake),
        ]
        for item in stack:
            item.start()
        _build.patches.extend(stack)
        return client

    _build.patches = []
    yield _build
    for item in _build.patches:
        item.stop()


# ═══════════════════════════════════════════════════════════════════════════
# T4 — PUT /api/cases/{case_id}/exams
# ═══════════════════════════════════════════════════════════════════════════

def test_t4_1_aluno_nao_anexa_exames(api):
    res = api("student").put(f"/api/cases/{CASE_ID}/exams", json={"asset_ids": []})
    assert res.status_code == 403


def test_t4_2_professor_que_nao_e_dono(api, db):
    db["cases"][0]["teacher_id"] = OTHER_TEACHER_ID
    res = api("teacher").put(f"/api/cases/{CASE_ID}/exams", json={"asset_ids": []})
    assert res.status_code == 403


def test_t4_3_admin_passa_em_caso_de_terceiro(api, db):
    db["cases"][0]["teacher_id"] = OTHER_TEACHER_ID
    res = api("admin").put(f"/api/cases/{CASE_ID}/exams",
                           json={"asset_ids": ["RX-PNEUMO-001"]})
    assert res.status_code == 200


def test_t4_4_asset_inexistente(api):
    res = api("teacher").put(f"/api/cases/{CASE_ID}/exams",
                             json={"asset_ids": ["NAO-EXISTE-001"]})
    assert res.status_code == 422
    assert res.json()["code"] == "asset_not_found"


def test_t4_5_asset_inelegivel(api):
    res = api("teacher").put(f"/api/cases/{CASE_ID}/exams",
                             json={"asset_ids": ["GASO-001"]})
    assert res.status_code == 422
    assert res.json()["code"] == "asset_not_attachable"


def test_t4_6_acima_do_limite(api, db):
    extras = [asset(id=f"RX-{i:03d}") for i in range(MAX_EXAMS_PER_CASE + 1)]
    db["medical_assets"].extend(extras)
    res = api("teacher").put(f"/api/cases/{CASE_ID}/exams",
                             json={"asset_ids": [a["id"] for a in extras]})
    assert res.status_code == 422
    assert res.json()["code"] == "too_many_exams"


def test_t4_7_lista_vazia_desanexa_tudo(api, db):
    client = api("teacher")
    client.put(f"/api/cases/{CASE_ID}/exams", json={"asset_ids": ["RX-PNEUMO-001"]})
    res = client.put(f"/api/cases/{CASE_ID}/exams", json={"asset_ids": []})
    assert res.status_code == 200
    assert res.json() == []
    assert db["case_exam_assets"] == []


def test_t4_8_idempotente(api, db):
    client = api("teacher")
    payload = {"asset_ids": ["RX-PNEUMO-001", "ECG-FA-001"]}
    first = client.put(f"/api/cases/{CASE_ID}/exams", json=payload)
    second = client.put(f"/api/cases/{CASE_ID}/exams", json=payload)
    assert first.json() == second.json()
    assert len(db["case_exam_assets"]) == 2


def test_t4_9_ordem_enviada_vira_position(api, db):
    api("teacher").put(f"/api/cases/{CASE_ID}/exams",
                       json={"asset_ids": ["ECG-FA-001", "RX-PNEUMO-001"]})
    positions = {r["asset_id"]: r["position"] for r in db["case_exam_assets"]}
    assert positions == {"ECG-FA-001": 0, "RX-PNEUMO-001": 1}


def test_t4_10_id_repetido_e_deduplicado_em_silencio(api, db):
    """Q6: o par (caso, exame) é único por natureza — 422 puniria um não-erro."""
    res = api("teacher").put(
        f"/api/cases/{CASE_ID}/exams",
        json={"asset_ids": ["RX-PNEUMO-001", "RX-PNEUMO-001", "ECG-FA-001"]},
    )
    assert res.status_code == 200
    assert len(db["case_exam_assets"]) == 2


def test_t4_11_case_id_nao_uuid(api):
    res = api("teacher").put("/api/cases/nao-e-uuid/exams", json={"asset_ids": []})
    assert res.status_code == 400


def test_t4_payload_invalido_nao_apaga_o_que_ja_estava(api, db):
    """Validar antes de apagar: um ID errado não pode zerar o caso."""
    client = api("teacher")
    client.put(f"/api/cases/{CASE_ID}/exams", json={"asset_ids": ["RX-PNEUMO-001"]})
    client.put(f"/api/cases/{CASE_ID}/exams", json={"asset_ids": ["NAO-EXISTE"]})
    assert [r["asset_id"] for r in db["case_exam_assets"]] == ["RX-PNEUMO-001"]


# ═══════════════════════════════════════════════════════════════════════════
# T5 — GET /api/attempts/{attempt_id}/exams (visão do aluno)
# ═══════════════════════════════════════════════════════════════════════════

STUDENT_ID = "00000000-0000-0000-0000-000000000001"


def _attempt(db, student_id=STUDENT_ID):
    db["case_attempts"].append(
        {"id": ATTEMPT_ID, "case_id": CASE_ID, "student_id": student_id}
    )


def test_t5_1_aluno_dono_recebe_a_lista(api, db):
    api("teacher").put(f"/api/cases/{CASE_ID}/exams",
                       json={"asset_ids": ["RX-PNEUMO-001"]})
    _attempt(db)
    res = api("student").get(f"/api/attempts/{ATTEMPT_ID}/exams")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_t5_2_aluno_de_outra_tentativa(api, db):
    _attempt(db, student_id="99999999-9999-4999-8999-999999999999")
    res = api("student").get(f"/api/attempts/{ATTEMPT_ID}/exams")
    assert res.status_code == 403


def test_t5_3_resposta_http_nao_traz_o_gabarito(api, db):
    """T1 no nível HTTP: o vazamento pode nascer na rota, não só na função."""
    api("teacher").put(f"/api/cases/{CASE_ID}/exams",
                       json={"asset_ids": ["RX-PNEUMO-001", "ECG-FA-001"]})
    _attempt(db)
    res = api("student").get(f"/api/attempts/{ATTEMPT_ID}/exams")
    body = res.text.lower()
    assert "pneumo" not in body
    assert "fibrila" not in body
    assert "display_name" not in body
    # O id do acervo é falante; nem ele nem a chave que o carregava podem sair
    # daqui. `"id"` cru pega também um campo novo que reintroduza o vazamento.
    assert '"id"' not in body
    assert "ecg-fa-001" not in body


def test_t5_4_caso_sem_exames_devolve_lista_vazia(api, db):
    _attempt(db)
    res = api("student").get(f"/api/attempts/{ATTEMPT_ID}/exams")
    assert res.status_code == 200
    assert res.json() == []


def test_t5_5_itens_vem_ordenados_por_position(api, db):
    api("teacher").put(f"/api/cases/{CASE_ID}/exams",
                       json={"asset_ids": ["ECG-FA-001", "RX-PNEUMO-001"]})
    _attempt(db)
    res = api("student").get(f"/api/attempts/{ATTEMPT_ID}/exams")
    # Pelo rótulo, não pelo id: o aluno não recebe identificador (T1.7).
    assert [item["label"]["key"] for item in res.json()] == [
        "exams.modality.ecg", "exams.modality.radiografia",
    ]


def test_t5_6_attempt_id_nao_uuid(api):
    res = api("student").get("/api/attempts/nao-e-uuid/exams")
    assert res.status_code == 400


def test_t5_tentativa_inexistente(api):
    res = api("student").get(f"/api/attempts/{ATTEMPT_ID}/exams")
    assert res.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════
# T6 — GET /api/medical-assets (catálogo do professor)
# ═══════════════════════════════════════════════════════════════════════════

def test_t6_1_aluno_nao_acessa_o_catalogo(api):
    """O catálogo expõe o diagnóstico de todo o acervo — é gabarito em massa."""
    assert api("student").get("/api/medical-assets").status_code == 403


def test_t6_2_professor_recebe_so_os_elegiveis(api):
    res = api("teacher").get("/api/medical-assets")
    assert res.status_code == 200
    ids = [item["id"] for item in res.json()]
    assert "GASO-001" not in ids
    assert len(ids) == 3


def test_t6_3_filtro_por_modalidade(api):
    res = api("teacher").get("/api/medical-assets?modality=ecg")
    assert [item["id"] for item in res.json()] == ["ECG-FA-001"]


def test_t6_3_modalidade_invalida_devolve_lista_vazia(api):
    res = api("teacher").get("/api/medical-assets?modality=pet-ct")
    assert res.status_code == 200
    assert res.json() == []


def test_t6_4_catalogo_do_professor_traz_o_diagnostico(api):
    """Aqui é intencional: sem o achado o professor não escolhe o exame certo."""
    item = api("teacher").get("/api/medical-assets").json()[0]
    assert item["diagnosis_or_finding"]
    assert item["url"].startswith("http")


def test_get_case_exams_traz_o_diagnostico_para_o_professor(api):
    client = api("teacher")
    client.put(f"/api/cases/{CASE_ID}/exams", json={"asset_ids": ["RX-PNEUMO-001"]})
    res = client.get(f"/api/cases/{CASE_ID}/exams")
    assert res.status_code == 200
    assert res.json()[0]["diagnosis_or_finding"] == "Pneumotórax"


# ═══════════════════════════════════════════════════════════════════════════
# link_rows_to_assets
# ═══════════════════════════════════════════════════════════════════════════

def test_join_com_asset_nulo_nao_derruba_a_lista():
    """Um vínculo órfão não pode apagar a tela inteira de exames do aluno."""
    rows = [{"position": 0, "medical_assets": None},
            {"position": 1, "medical_assets": asset()}]
    assert [a["id"] for a in link_rows_to_assets(rows)] == ["RX-PNEUMO-001"]
