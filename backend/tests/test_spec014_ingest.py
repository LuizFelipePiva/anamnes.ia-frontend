"""
SPEC-014 — script de ingestão do acervo (`scripts/ingest_medical_assets.py`).

Contrato: grupos T7 (script) e T8 (integridade do schema).

T8 valida o **SQL da migração**, não um banco de verdade (decisão Q7): a suíte
do backend roda em ~2s justamente por não tocar serviço externo, e subir
Postgres no CI para conferir três constraints não paga o preço.
"""
import hashlib
import json
import re
from pathlib import Path

import pytest

from app.services.medical_asset_service import BUCKET
from scripts.ingest_medical_assets import (
    _CONTENT_TYPES,
    check_coverage,
    ensure_bucket,
    ingest,
    list_bucket_objects,
    load_entries,
    main,
    prune_legacy,
    source_relpath,
    storage_path_for,
    to_row,
)

MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "supabase" / "migrations" / "20260814000000_add_medical_assets.sql"
)

# Áudio (ausculta) chegou depois: o CHECK original fechava em image|video|gif.
MIGRATION_AUDIO = (
    Path(__file__).resolve().parents[2]
    / "supabase" / "migrations" / "20260814120000_add_audio_media_type.sql"
)


# ═══════════════════════════════════════════════════════════════════════════
# Fake do Supabase (tabela + storage)
# ═══════════════════════════════════════════════════════════════════════════

class _FakeStorageBucket:
    def __init__(self, log: list, objects: set, removed: list):
        self.log = log
        self.objects = objects
        self.removed = removed

    def upload(self, path, file, file_options=None):
        self.log.append(path)
        self.objects.add(path)
        return {"path": path}

    def list(self, prefix, options=None):
        """Imita o storage: devolve só os filhos diretos, pastas com `id` nulo."""
        base = prefix.rstrip("/") + "/"
        filhos: dict[str, bool] = {}
        for path in self.objects:
            if not path.startswith(base):
                continue
            resto = path[len(base):]
            nome, _, cauda = resto.partition("/")
            # `True` = é pasta (havia mais caminho depois do nome).
            filhos[nome] = filhos.get(nome, False) or bool(cauda)
        itens = [{"name": nome, "id": None if pasta else nome}
                 for nome, pasta in sorted(filhos.items())]
        offset = (options or {}).get("offset", 0)
        limite = (options or {}).get("limit", 100)
        return itens[offset:offset + limite]

    def remove(self, paths):
        for path in paths:
            self.objects.discard(path)
            self.removed.append(path)
        return paths


class _FakeStorage:
    def __init__(self, log: list, buckets: list | None = None):
        self.log = log
        self.buckets = buckets if buckets is not None else []
        self.created: list[tuple[str, dict]] = []
        # Conteúdo do bucket, para exercitar listagem e limpeza.
        self.objects: set[str] = set()
        self.removed: list[str] = []

    def from_(self, _bucket):
        return _FakeStorageBucket(self.log, self.objects, self.removed)

    def list_buckets(self):
        return [{"name": name} for name in self.buckets]

    def create_bucket(self, name, options=None):
        self.created.append((name, options or {}))
        self.buckets.append(name)
        return {"name": name}


class _FakeTable:
    def __init__(self, rows: dict, upserts: list):
        self.rows = rows
        self.upserts = upserts
        self.payload = None

    def select(self, *_, **__):
        return self

    def upsert(self, payload):
        self.payload = payload
        return self

    def execute(self):
        if self.payload is None:
            # O script compara hash **e** caminho: guardar só o hash faria o
            # fake esconder o defeito de migração de caminho.
            return _Result([{"id": k, **v} for k, v in self.rows.items()])
        for row in self.payload:
            self.rows[row["id"]] = {"sha256": row.get("sha256"),
                                    "storage_path": row.get("storage_path")}
            self.upserts.append(row)
        return _Result(list(self.payload))


class _Result:
    def __init__(self, data):
        self.data = data


class _FakeSupabase:
    """Guarda o estado entre execuções — é o que permite testar idempotência."""

    def __init__(self, buckets: list | None = None):
        self.rows: dict[str, dict] = {}
        self.upserts: list[dict] = []
        self.uploads: list[str] = []
        self.storage = _FakeStorage(self.uploads, buckets)

    def table(self, _name):
        return _FakeTable(self.rows, self.upserts)


# ═══════════════════════════════════════════════════════════════════════════
# Acervo de mentira em disco
# ═══════════════════════════════════════════════════════════════════════════

def build_source(tmp_path: Path, *, registry=None, dynamic=None, coverage=None) -> Path:
    """Monta uma cópia mínima do pacote, com os binários realmente em disco."""
    source = tmp_path / "medical-assets"
    source.mkdir(parents=True, exist_ok=True)

    registry = registry if registry is not None else [
        {
            "id": "ECG-FA-001", "modality": "ecg",
            "displayName": "ECG — Fibrilação atrial",
            "diagnosisOrFinding": "Fibrilação atrial",
            "filename": "ecg_fa_001.webp", "attachmentEligible": True,
            "tags": ["arritmia"], "sha256": "hash-ecg-1", "credits": [],
        },
        {
            "id": "RX-PNEUMO-001", "modality": "radiografia",
            "displayName": "Radiografia — Pneumotórax",
            "diagnosisOrFinding": "Pneumotórax",
            "filename": "rx_pneumo_001.webp", "attachmentEligible": True,
            "tags": ["tórax"], "sha256": "hash-rx-1", "credits": [],
        },
    ]

    # `encoding="utf-8"` explícito também aqui: escrever com o default do
    # Windows (cp1252) faria o teste de acentuação passar por acidente, lendo
    # de volta a mesma corrupção que ele deveria pegar.
    (source / "registry.json").write_text(
        json.dumps(registry, ensure_ascii=False), encoding="utf-8"
    )

    if dynamic is not None:
        (source / "dynamic-media.json").write_text(
            json.dumps(dynamic, ensure_ascii=False), encoding="utf-8"
        )

    if coverage is not None:
        (source / "coverage.json").write_text(
            json.dumps(coverage, ensure_ascii=False), encoding="utf-8"
        )

    for entry in registry:
        if entry.get("storageMode") == "remote":
            continue
        target = source / source_relpath(entry)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"fake-binary")

    return source


@pytest.fixture
def sb():
    # Bucket já existente é o caso comum (re-execução do script).
    return _FakeSupabase(buckets=[BUCKET])


# ═══════════════════════════════════════════════════════════════════════════
# T7 — script de ingestão
# ═══════════════════════════════════════════════════════════════════════════

def test_t7_1_idempotencia(tmp_path, sb):
    source = build_source(tmp_path)

    first = ingest(source, sb)
    ids_after_first = set(sb.rows)
    second = ingest(source, sb)

    assert first["total"] == second["total"] == 2
    assert set(sb.rows) == ids_after_first
    assert len(sb.rows) == 2


def test_t7_2_sha256_igual_nao_refaz_upload(tmp_path, sb):
    source = build_source(tmp_path)

    ingest(source, sb)
    uploads_after_first = len(sb.uploads)
    result = ingest(source, sb)

    assert uploads_after_first == 2
    assert len(sb.uploads) == uploads_after_first, "não deveria reenviar binário inalterado"
    assert result["skipped"] == 2
    assert result["uploaded"] == 0


def test_t7_3_sha256_diferente_refaz_upload(tmp_path, sb):
    source = build_source(tmp_path)
    ingest(source, sb)

    registry = json.loads((source / "registry.json").read_text(encoding="utf-8"))
    registry[0]["sha256"] = "hash-ecg-2"
    (source / "registry.json").write_text(
        json.dumps(registry, ensure_ascii=False), encoding="utf-8"
    )

    result = ingest(source, sb)
    assert result["uploaded"] == 1
    assert sb.rows["ECG-FA-001"]["sha256"] == "hash-ecg-2"


def test_t7_4_encoding_preserva_acentuacao(tmp_path, sb):
    """Regressão do gotcha de UTF-8 (§4.4).

    Ler com o encoding default do Windows transforma "TVP — avaliação" em
    "TVP â€” avaliaÃ§Ã£o" — e o defeito só apareceria como texto torto no
    seletor do professor, muito depois da ingestão.
    """
    source = build_source(tmp_path, registry=[{
        "id": "US-TVP-001", "modality": "ultrassonografia",
        "displayName": "TVP — avaliação transversal",
        "diagnosisOrFinding": "Trombose venosa profunda: avaliação",
        "filename": "us_tvp_001.webp", "attachmentEligible": True,
        "tags": ["compressibilidade"], "sha256": "hash-us-1",
    }])

    ingest(source, sb)
    row = sb.upserts[0]
    assert row["display_name"] == "TVP — avaliação transversal"
    assert "Ã" not in row["display_name"]
    assert row["diagnosis_or_finding"] == "Trombose venosa profunda: avaliação"


def test_t7_5_midias_dinamicas_entram_como_remotas(tmp_path, sb):
    source = build_source(tmp_path, dynamic=[{
        "id": "US-TVP-VIDEO-001", "modality": "ultrassonografia",
        "displayName": "TVP — vídeo", "diagnosisOrFinding": "Trombose venosa profunda",
        "filename": "tvp.ogv", "attachmentEligible": True,
        "mediaType": "video", "storageMode": "remote",
        "remoteUrl": "https://upload.wikimedia.org/tvp.ogv",
        "sha256": "REMOTE_NOT_STORED", "tags": [],
    }])

    result = ingest(source, sb)
    remote = next(r for r in sb.upserts if r["id"] == "US-TVP-VIDEO-001")

    assert remote["storage_mode"] == "remote"
    assert remote["media_type"] == "video"
    assert remote["remote_url"] == "https://upload.wikimedia.org/tvp.ogv"
    assert remote["storage_path"] is None
    # O marcador do pacote não pode virar hash, senão o script acharia que o
    # binário mudou a cada execução.
    assert remote["sha256"] is None
    assert "tvp.ogv" not in sb.uploads
    assert result["total"] == 3


def test_t7_6_dry_run_nao_escreve_nada(tmp_path, sb):
    source = build_source(tmp_path)
    result = ingest(source, sb, dry_run=True)

    assert result["dry_run"] is True
    assert sb.uploads == []
    assert sb.upserts == []
    assert sb.rows == {}


def test_t7_7_divergencia_com_coverage_e_reportada(tmp_path, sb):
    source = build_source(tmp_path, coverage=[
        {"modality": "ecg", "indexedAssets": 41, "attachmentEligible": 25},
        {"modality": "radiografia", "indexedAssets": 1, "attachmentEligible": 1},
    ])
    result = ingest(source, sb)
    assert result["coverage_problems"], "41 esperados vs 1 ingerido deveria acusar"
    assert any("ecg" in problem for problem in result["coverage_problems"])


def test_t7_7_coverage_batendo_nao_reclama(tmp_path, sb):
    source = build_source(tmp_path, coverage=[
        {"modality": "ecg", "indexedAssets": 1, "attachmentEligible": 1},
        {"modality": "radiografia", "indexedAssets": 1, "attachmentEligible": 1},
    ])
    assert ingest(source, sb)["coverage_problems"] == []


def test_t7_8_only_modality_toca_apenas_a_modalidade(tmp_path, sb):
    source = build_source(tmp_path)
    result = ingest(source, sb, only_modality="ecg")

    assert result["total"] == 1
    assert [r["id"] for r in sb.upserts] == ["ECG-FA-001"]
    # Caminho derivado do hash, não da modalidade (ver `storage_path_for`).
    assert sb.uploads == ["assets/ha/hash-ecg-1.webp"]


def test_t7_9_caminho_de_origem_sem_traversal():
    """Registry adulterado não pode ler fora da pasta do pacote."""
    path = source_relpath({
        "modality": "../../etc", "filename": "../../../passwd",
    })
    assert ".." not in path
    assert not path.startswith("/")
    assert path.startswith("assets/")


def test_t7_9_caminho_de_origem_normal():
    assert source_relpath({"modality": "ECG", "filename": "x.webp"}) == "assets/ecg/x.webp"


# ═══════════════════════════════════════════════════════════════════════════
# Caminho opaco no bucket — o nome do arquivo era gabarito
# ═══════════════════════════════════════════════════════════════════════════

def test_caminho_no_bucket_nao_revela_diagnostico_nem_modalidade():
    """A URL do binário é pública e aparece inteira no `src` da <img>.

    Com `assets/radiografia/rx_pneumo_001.webp`, o aluno lia o gabarito num
    clique direito — sem inspetor, sem aba Network.
    """
    entry = {"modality": "radiografia", "filename": "rx_pneumo_001.webp"}
    path = storage_path_for(entry, "a1b2c3d4e5")

    assert path == "assets/a1/a1b2c3d4e5.webp"
    assert "pneumo" not in path
    assert "radiografia" not in path


def test_caminho_no_bucket_preserva_a_extensao():
    """O content-type é escolhido pela extensão — perdê-la faz o player mudo."""
    assert storage_path_for({"filename": "ausc.mp3"}, "ff00").endswith(".mp3")


def test_mesmo_binario_converge_para_o_mesmo_caminho():
    """Hash do conteúdo: dois registros do mesmo arquivo não duplicam o objeto."""
    a = storage_path_for({"filename": "um.webp"}, "deadbeef")
    b = storage_path_for({"filename": "outro.webp"}, "deadbeef")
    assert a == b


def test_sha_do_registry_nao_pode_virar_diretorio():
    """`sha256` é dado externo: um `../` ali escreveria fora do prefixo."""
    path = storage_path_for({"filename": "x.webp"}, "../../etc/passwd")
    assert ".." not in path
    assert path.startswith("assets/")


def test_sem_hash_no_registry_o_hash_vem_do_arquivo(tmp_path, sb):
    """Registry sem `sha256` ainda precisa render um caminho — e um estável."""
    source = build_source(tmp_path, registry=[{
        "id": "ECG-X-001", "modality": "ecg", "displayName": "ECG — X",
        "diagnosisOrFinding": "X", "filename": "ecg_x.webp",
        "attachmentEligible": True, "tags": [],
    }])

    ingest(source, sb)
    row = sb.upserts[0]

    # sha256("fake-binary"), o conteúdo que `build_source` grava.
    esperado = hashlib.sha256(b"fake-binary").hexdigest()
    assert row["sha256"] == esperado
    assert row["storage_path"] == f"assets/{esperado[:2]}/{esperado}.webp"


def test_sem_hash_e_sem_arquivo_a_linha_fica_de_fora(tmp_path, sb):
    """Sem caminho e sem `remote_url` o CHECK do schema rejeita a linha inteira.

    Deixar de fora com aviso preserva o resto do lote — um registro incompleto
    não pode derrubar a ingestão dos outros 300.
    """
    source = build_source(tmp_path, registry=[{
        "id": "ECG-X-001", "modality": "ecg", "displayName": "ECG — X",
        "diagnosisOrFinding": "X", "filename": "ecg_x.webp",
    }])
    (source / "assets" / "ecg" / "ecg_x.webp").unlink()

    result = ingest(source, sb)

    assert sb.upserts == []
    assert result["missing_files"] == ["assets/ecg/ecg_x.webp"]


def test_linha_no_caminho_antigo_e_reenviada_mesmo_com_hash_igual(tmp_path, sb):
    """O caso da migração: hash idêntico, caminho novo.

    Comparar só o `sha256` faria o script pular o upload e ainda assim gravar o
    `storage_path` novo — a linha apontaria para um objeto que nunca subiu. O
    aluno veria imagem quebrada e o script diria "0 upload, tudo inalterado".
    """
    source = build_source(tmp_path)
    # Estado pré-migração: mesmo hash, caminho no layout falante antigo.
    sb.rows["ECG-FA-001"] = {"sha256": "hash-ecg-1",
                             "storage_path": "assets/ecg/ecg_fa_001.webp"}

    result = ingest(source, sb)

    assert "assets/ha/hash-ecg-1.webp" in sb.uploads
    assert result["uploaded"] == 2


def test_prune_apaga_o_layout_antigo_e_preserva_o_atual(tmp_path, sb):
    """Migração de caminho: o binário antigo continua servível até ser apagado.

    Ele é o vazamento — o nome do arquivo é o diagnóstico —, então sobrar no
    bucket significa a correção não ter surtido efeito.
    """
    source = build_source(tmp_path)
    sb.storage.objects.add("assets/radiografia/rx_pneumo_001.webp")

    result = ingest(source, sb, prune=True)

    assert result["pruned"] == ["assets/radiografia/rx_pneumo_001.webp"]
    assert "assets/radiografia/rx_pneumo_001.webp" not in sb.storage.objects
    # Os recém-enviados não podem ser levados junto.
    assert "assets/ha/hash-ecg-1.webp" in sb.storage.objects


def test_prune_em_dry_run_apenas_lista(tmp_path, sb):
    source = build_source(tmp_path)
    sb.storage.objects.add("assets/ecg/legado.webp")

    result = ingest(source, sb, prune=True, dry_run=True)

    assert result["pruned"] == ["assets/ecg/legado.webp"]
    assert sb.storage.removed == []
    assert "assets/ecg/legado.webp" in sb.storage.objects


def test_listagem_do_bucket_pagina(sb):
    """Sem `offset`, a limpeza pararia em 100 e deixaria 2/3 do lixo para trás."""
    sb.storage.objects.update(f"assets/ab/obj{i:03d}.webp" for i in range(250))
    assert len(list_bucket_objects(sb)) == 250


def test_prune_sem_nada_a_apagar_nao_chama_remove(tmp_path, sb):
    source = build_source(tmp_path)
    ingest(source, sb)          # popula o bucket com os caminhos atuais
    prune_legacy(sb, {f"assets/ha/hash-{x}-1.webp" for x in ("ecg", "rx")})
    assert sb.storage.removed == []


def test_prune_desligado_por_padrao(tmp_path, sb):
    source = build_source(tmp_path)
    sb.storage.objects.add("assets/ecg/legado.webp")
    result = ingest(source, sb)

    assert result["pruned"] == []
    assert "assets/ecg/legado.webp" in sb.storage.objects


def test_prune_recusado_junto_de_only_modality(tmp_path, sb, capsys):
    """Com recorte de modalidade, 'o que sobrou' seria o acervo inteiro."""
    source = build_source(tmp_path)
    code = main(["--source", str(source), "--only-modality", "ecg",
                 "--prune-legacy", "--dry-run"], sb=sb)

    assert code == 2
    assert sb.storage.removed == []
    assert "prune-legacy" in capsys.readouterr().err


def test_binario_ausente_e_reportado_sem_derrubar_a_ingestao(tmp_path, sb):
    """Arquivo faltando é problema de curadoria, não motivo para abortar tudo."""
    source = build_source(tmp_path)
    (source / "assets" / "ecg" / "ecg_fa_001.webp").unlink()

    result = ingest(source, sb)
    assert result["missing_files"] == ["assets/ecg/ecg_fa_001.webp"]
    assert result["uploaded"] == 1
    assert len(sb.upserts) == 2


def test_campos_de_proveniencia_das_trilhas_sao_descartados(tmp_path):
    source = build_source(tmp_path, registry=[{
        "id": "X-001", "modality": "ecg", "displayName": "X",
        "diagnosisOrFinding": "X", "filename": "x.webp",
        "legacyTrailUrls": ["/trilhas/x.jpg"], "originalFilename": "x.jpg",
        "sourceTrailQuestionIds": ["q1"], "sourceTrailDataFiles": ["a.json"],
    }])
    entry = load_entries(source)[0]
    assert "legacyTrailUrls" not in entry
    assert "sourceTrailQuestionIds" not in entry
    assert set(to_row(entry)) == {
        "id", "modality", "display_name", "diagnosis_or_finding", "storage_path",
        "remote_url", "storage_mode", "media_type", "attachment_eligible", "tags",
        "license", "source_url", "credits", "sha256",
    }


def test_bucket_e_criado_publico_quando_nao_existe(tmp_path):
    """Projeto novo: sem o bucket, todo upload falharia com "Bucket not found"
    enquanto o upsert da tabela passa — o catálogo fica completo apontando para
    URLs quebradas, e o sintoma só aparece na tela do aluno."""
    novo = _FakeSupabase(buckets=[])
    ingest(build_source(tmp_path), novo)

    assert novo.storage.created == [(BUCKET, {"public": True})]


def test_bucket_existente_nao_e_recriado(tmp_path):
    ja_existe = _FakeSupabase(buckets=[BUCKET])
    ingest(build_source(tmp_path), ja_existe)
    assert ja_existe.storage.created == []


def test_criar_bucket_com_sucesso_nao_emite_aviso(tmp_path, capsys):
    """Regressão de 2026-08-13, pega em produção.

    O `print` de sucesso estava **dentro** do `try`. No console do Windows
    (cp1252) o "✅" não existe, o `print` levantava `UnicodeEncodeError`, e o
    `except` largo transformava um bucket criado com êxito em "não foi possível
    criar o bucket". Alerta falso sobre sucesso é pior que silêncio: manda
    investigar o que está certo.

    Daí a saída do script ser ASCII (`[ok]`/`[aviso]`/`[erro]`) — mensagem de
    console não pode depender do encoding do terminal de quem roda.
    """
    novo = _FakeSupabase(buckets=[])
    ingest(build_source(tmp_path), novo)

    saida = capsys.readouterr()
    assert "[ok]" in saida.out
    assert "aviso" not in (saida.out + saida.err).lower()
    assert novo.storage.created == [(BUCKET, {"public": True})]


def test_saida_do_script_e_ascii():
    """Nenhum `print` pode carregar caractere fora do ASCII no prefixo."""
    fonte = (Path(__file__).resolve().parents[1]
             / "scripts" / "ingest_medical_assets.py").read_text(encoding="utf-8")

    prefixos = re.findall(r'print\((?:f?")([^"]{0,12})', fonte)
    problemas = [p for p in prefixos if any(ord(c) > 0x2000 for c in p)]
    assert problemas == [], f"prefixo não-ASCII em print(): {problemas}"


def test_falha_ao_listar_buckets_nao_aborta_a_ingestao():
    """A chave pode não ter permissão de listar buckets e ainda assim escrever
    neles. Abortar aqui trocaria um aviso por uma parada desnecessária."""
    class _SemPermissao:
        def list_buckets(self):
            raise RuntimeError("403")

    class _Sb:
        storage = _SemPermissao()

    ensure_bucket(_Sb())  # não levanta


def test_dry_run_nao_cria_bucket(tmp_path):
    novo = _FakeSupabase(buckets=[])
    ingest(build_source(tmp_path), novo, dry_run=True)
    assert novo.storage.created == []


def test_coverage_ausente_nao_e_erro(tmp_path):
    """`coverage.json` é opcional: um acervo novo pode não ter esse arquivo."""
    source = build_source(tmp_path)
    assert check_coverage(source, [{"modality": "ecg"}]) == []


# ═══════════════════════════════════════════════════════════════════════════
# T8 — integridade declarada na migração
# ═══════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def migration_sql() -> str:
    assert MIGRATION.exists(), f"migração não encontrada: {MIGRATION}"
    return MIGRATION.read_text(encoding="utf-8")


def _normalized(sql: str) -> str:
    return re.sub(r"\s+", " ", sql).lower()


def test_t8_1_apagar_caso_remove_os_vinculos(migration_sql):
    sql = _normalized(migration_sql)
    assert 'references "public"."cases"("id") on delete cascade' in sql


def test_t8_2_asset_em_uso_nao_pode_ser_apagado(migration_sql):
    """RESTRICT, não CASCADE: apagar um asset usado quebraria a tentativa aberta."""
    sql = _normalized(migration_sql)
    assert 'references "public"."medical_assets"("id") on delete restrict' in sql


def test_t8_3_par_caso_exame_e_unico(migration_sql):
    sql = _normalized(migration_sql)
    assert 'primary key ("case_id", "asset_id")' in sql


def test_t8_rls_habilitada_nas_duas_tabelas(migration_sql):
    sql = _normalized(migration_sql)
    assert 'alter table "public"."medical_assets" enable row level security' in sql
    assert 'alter table "public"."case_exam_assets" enable row level security' in sql


def test_t8_catalogo_nao_tem_policy_de_escrita_para_authenticated(migration_sql):
    """Só o script (service_role) escreve no catálogo — §4.2 da spec."""
    sql = _normalized(migration_sql)
    assert 'create policy "authenticated_read" on "public"."medical_assets" for select' in sql
    assert 'for insert to authenticated' not in sql
    assert 'for update to authenticated' not in sql


def test_t8_asset_sem_caminho_e_sem_url_e_rejeitado(migration_sql):
    """Asset sem binário e sem URL é irrecuperável: barrar no schema."""
    assert "medical_assets_location_check" in migration_sql


# ═══════════════════════════════════════════════════════════════════════════
# Áudio (ausculta)
# ═══════════════════════════════════════════════════════════════════════════

def test_migracao_de_audio_amplia_o_check_sem_abrir_o_dominio():
    """'audio' entra no CHECK; tipo desconhecido continua barrado.

    Trocar o CHECK por nada (ou por um domínio livre) faria a `<img>` quebrada
    voltar a ser possível — o defeito só apareceria na tela do aluno.
    """
    sql = _normalized(MIGRATION_AUDIO.read_text(encoding="utf-8"))
    assert "drop constraint if exists \"medical_assets_media_type_check\"" in sql
    for tipo in ("'image'", "'video'", "'gif'", "'audio'"):
        assert tipo in sql
    assert "check (\"media_type\" = any" in sql


def test_ingestao_preserva_media_type_audio(tmp_path, sb):
    """`mediaType: audio` do pacote precisa sobreviver até a linha da tabela."""
    source = build_source(tmp_path, registry=[{
        "id": "AUSC-SOPRO-001", "modality": "ausculta_cardiaca",
        "displayName": "Ausculta cardíaca — Sopro sistólico",
        "diagnosisOrFinding": "Sopro sistólico",
        "filename": "ausc_sopro_001.mp3", "mediaType": "audio",
        "attachmentEligible": True, "tags": ["sopro"],
        "sha256": "hash-ausc-1", "credits": [],
    }])

    ingest(source, sb)

    row = next(r for r in sb.upserts if r["id"] == "AUSC-SOPRO-001")
    assert row["media_type"] == "audio"
    assert row["storage_path"] == "assets/ha/hash-ausc-1.mp3"


@pytest.mark.parametrize("ext, expected", [
    (".mp3", "audio/mpeg"), (".wav", "audio/wav"),
    (".m4a", "audio/mp4"), (".ogg", "audio/ogg"),
    # `.ogv` continua vídeo: o container Ogg serve aos dois, e é o sufixo que
    # decide. Trocar um pelo outro faz o navegador recusar a mídia em silêncio.
    (".ogv", "video/ogg"),
])
def test_content_type_por_extensao_de_audio(ext, expected):
    assert _CONTENT_TYPES[ext] == expected
