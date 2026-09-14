"""
SPEC-014 — migração dos caminhos a partir do bucket (`scripts/rehash_storage_paths.py`).

O script de ingestão migra os caminhos usando o pacote curado em disco; este
outro usa o próprio bucket como fonte. O que se testa aqui é o que difere: o
hash sai do binário baixado, a linha só muda depois que o objeto novo existe, e
a limpeza é cancelada quando alguma linha fica para trás.
"""
import hashlib

import pytest

from scripts.rehash_storage_paths import OPAQUE_RE, main, opaque_path, rehash

CONTEUDO_RX = b"binario-radiografia"
CONTEUDO_ECG = b"binario-ecg"
SHA_RX = hashlib.sha256(CONTEUDO_RX).hexdigest()
SHA_ECG = hashlib.sha256(CONTEUDO_ECG).hexdigest()


# ═══════════════════════════════════════════════════════════════════════════
# Fake do Supabase (tabela com update + storage com download)
# ═══════════════════════════════════════════════════════════════════════════

class _FakeBucket:
    def __init__(self, sb):
        self.sb = sb

    def download(self, path):
        if path in self.sb.quebrados:
            raise RuntimeError("Object not found")
        self.sb.downloads.append(path)
        return self.sb.objects[path]

    def copy(self, origem, destino):
        if origem in self.sb.quebrados:
            raise RuntimeError("Object not found")
        if destino in self.sb.objects:
            # Mesma mensagem do Storage: o script trata isso como sucesso.
            raise RuntimeError("The resource already exists")
        self.sb.copies.append((origem, destino))
        self.sb.objects[destino] = self.sb.objects[origem]
        return {"path": destino}

    def upload(self, path, file, file_options=None):
        self.sb.uploads.append((path, (file_options or {}).get("content-type")))
        self.sb.objects[path] = file
        return {"path": path}

    def list(self, prefix, options=None):
        base = prefix.rstrip("/") + "/"
        filhos: dict[str, bool] = {}
        for path in self.sb.objects:
            if not path.startswith(base):
                continue
            nome, _, cauda = path[len(base):].partition("/")
            filhos[nome] = filhos.get(nome, False) or bool(cauda)
        itens = [{"name": nome, "id": None if pasta else nome}
                 for nome, pasta in sorted(filhos.items())]
        offset = (options or {}).get("offset", 0)
        limite = (options or {}).get("limit", 100)
        return itens[offset:offset + limite]

    def remove(self, paths):
        for path in paths:
            self.sb.objects.pop(path, None)
            self.sb.removed.append(path)
        return paths


class _FakeStorage:
    def __init__(self, sb):
        self.sb = sb

    def from_(self, _bucket):
        return _FakeBucket(self.sb)


class _Result:
    def __init__(self, data):
        self.data = data


class _FakeTable:
    def __init__(self, sb):
        self.sb = sb
        self.payload = None
        self.filtro = None

    def select(self, *_, **__):
        return self

    def update(self, payload):
        self.payload = payload
        return self

    def eq(self, campo, valor):
        self.filtro = (campo, valor)
        return self

    def execute(self):
        if self.payload is None:
            return _Result([{"id": k, **v} for k, v in self.sb.rows.items()])
        campo, valor = self.filtro
        assert campo == "id"
        self.sb.rows[valor].update(self.payload)
        self.sb.updates.append((valor, dict(self.payload)))
        return _Result([self.sb.rows[valor]])


class _FakeSupabase:
    def __init__(self):
        self.rows: dict[str, dict] = {}
        self.objects: dict[str, bytes] = {}
        self.uploads: list[tuple[str, str]] = []
        self.copies: list[tuple[str, str]] = []
        self.downloads: list[str] = []
        self.updates: list[tuple[str, dict]] = []
        self.removed: list[str] = []
        # Caminhos cujo download deve explodir, para exercitar a falha.
        self.quebrados: set[str] = set()
        self.storage = _FakeStorage(self)

    def table(self, _name):
        return _FakeTable(self)


@pytest.fixture
def sb():
    fake = _FakeSupabase()
    # Espelha produção: a ingestão já gravou o `sha256` de todas as linhas.
    fake.rows = {
        "RX-PNEUMO-001": {"storage_path": "assets/radiografia/rx_pneumo_001.webp",
                          "storage_mode": "supabase", "sha256": SHA_RX},
        "ECG-FA-001": {"storage_path": "assets/ecg/ecg_fa_001.webp",
                       "storage_mode": "supabase", "sha256": SHA_ECG},
        # Remoto: sem binário nosso, fica fora da migração.
        "VID-WIKI-001": {"storage_path": None, "storage_mode": "remote", "sha256": None},
    }
    fake.objects = {
        "assets/radiografia/rx_pneumo_001.webp": CONTEUDO_RX,
        "assets/ecg/ecg_fa_001.webp": CONTEUDO_ECG,
    }
    return fake


# ═══════════════════════════════════════════════════════════════════════════
# Caminho novo
# ═══════════════════════════════════════════════════════════════════════════

def test_caminho_deriva_do_binario_e_nao_do_nome_antigo():
    caminho = opaque_path(SHA_RX, "assets/radiografia/rx_pneumo_001.webp")
    assert caminho == f"assets/{SHA_RX[:2]}/{SHA_RX}.webp"
    assert OPAQUE_RE.match(caminho)
    assert "pneumo" not in caminho
    assert "radiografia" not in caminho


def test_extensao_sobrevive_na_copia(sb):
    """Sem a extensão, o content-type do objeto novo viraria genérico."""
    sb.rows["AUSC-SOPRO-001"] = {"storage_path": "assets/ausculta/sopro.mp3",
                                 "storage_mode": "supabase", "sha256": SHA_RX}
    sb.objects["assets/ausculta/sopro.mp3"] = b"audio"

    rehash(sb)

    destinos = [destino for _, destino in sb.copies]
    assert f"assets/{SHA_RX[:2]}/{SHA_RX}.mp3" in destinos


def test_hash_do_banco_evita_baixar_o_binario(sb):
    """O caminho comum não gasta banda: `copy` é server-side."""
    rehash(sb)

    assert sb.downloads == []
    assert sb.uploads == []
    assert set(sb.copies) == {
        ("assets/radiografia/rx_pneumo_001.webp", f"assets/{SHA_RX[:2]}/{SHA_RX}.webp"),
        ("assets/ecg/ecg_fa_001.webp", f"assets/{SHA_ECG[:2]}/{SHA_ECG}.webp"),
    }


def test_sem_hash_no_banco_o_binario_e_baixado(sb):
    sb.rows["ECG-FA-001"]["sha256"] = None

    rehash(sb)

    assert sb.downloads == ["assets/ecg/ecg_fa_001.webp"]
    assert sb.rows["ECG-FA-001"]["sha256"] == SHA_ECG
    assert sb.rows["ECG-FA-001"]["storage_path"] == f"assets/{SHA_ECG[:2]}/{SHA_ECG}.webp"


def test_destino_ja_existente_nao_e_erro(sb):
    """Dois assets byte-idênticos convergem para o mesmo objeto — e tudo bem."""
    sb.objects[f"assets/{SHA_RX[:2]}/{SHA_RX}.webp"] = CONTEUDO_RX

    resultado = rehash(sb)

    assert resultado["failures"] == []
    assert len(resultado["migrated"]) == 2


# ═══════════════════════════════════════════════════════════════════════════
# Migração
# ═══════════════════════════════════════════════════════════════════════════

def test_migra_binario_e_linha(sb):
    resultado = rehash(sb)

    assert resultado["total"] == 2          # o remoto não entra
    assert len(resultado["migrated"]) == 2
    assert f"assets/{SHA_RX[:2]}/{SHA_RX}.webp" in sb.objects
    assert sb.rows["RX-PNEUMO-001"]["storage_path"] == f"assets/{SHA_RX[:2]}/{SHA_RX}.webp"
    # O hash gravado é o do binário que estava no ar.
    assert sb.rows["ECG-FA-001"]["sha256"] == SHA_ECG


def test_dry_run_nao_escreve_nada(sb):
    resultado = rehash(sb, dry_run=True)

    assert len(resultado["migrated"]) == 2   # relata o que faria
    assert sb.copies == []
    assert sb.uploads == []
    assert sb.updates == []
    assert sb.rows["RX-PNEUMO-001"]["storage_path"] == "assets/radiografia/rx_pneumo_001.webp"


def test_reexecucao_nao_copia_de_novo(sb):
    rehash(sb)
    sb.copies.clear()

    resultado = rehash(sb)

    assert resultado["already"] == 2
    assert resultado["migrated"] == []
    assert sb.copies == []


def test_linha_remota_fica_de_fora(sb):
    rehash(sb)
    assert "VID-WIKI-001" not in dict(sb.updates)


# ═══════════════════════════════════════════════════════════════════════════
# Limpeza
# ═══════════════════════════════════════════════════════════════════════════

def test_prune_apaga_so_os_caminhos_falantes(sb):
    resultado = rehash(sb, prune=True)

    assert set(resultado["pruned"]) == {
        "assets/radiografia/rx_pneumo_001.webp",
        "assets/ecg/ecg_fa_001.webp",
    }
    assert set(sb.objects) == {
        f"assets/{SHA_RX[:2]}/{SHA_RX}.webp",
        f"assets/{SHA_ECG[:2]}/{SHA_ECG}.webp",
    }


def test_falha_numa_linha_cancela_a_limpeza_inteira(sb):
    sb.quebrados.add("assets/ecg/ecg_fa_001.webp")

    resultado = rehash(sb, prune=True)

    assert resultado["failures"] and resultado["prune_skipped"]
    assert resultado["pruned"] == []
    # Nada foi apagado — inclusive o binário da linha que migrou bem, porque a
    # limpeza é tudo-ou-nada.
    assert "assets/radiografia/rx_pneumo_001.webp" in sb.objects
    assert "assets/ecg/ecg_fa_001.webp" in sb.objects


def test_objeto_de_linha_que_nao_migrou_nunca_e_apagado(sb):
    """Mesmo com a limpeza liberada, o binário de uma linha viva fica."""
    sb.rows["ECG-FA-001"]["storage_path"] = f"assets/{SHA_ECG[:2]}/{SHA_ECG}.webp"
    sb.objects[f"assets/{SHA_ECG[:2]}/{SHA_ECG}.webp"] = CONTEUDO_ECG
    sb.objects["assets/ecg/ecg_fa_001.webp"] = CONTEUDO_ECG

    resultado = rehash(sb, prune=True)

    assert f"assets/{SHA_ECG[:2]}/{SHA_ECG}.webp" in sb.objects
    assert "assets/ecg/ecg_fa_001.webp" in resultado["pruned"]


# ═══════════════════════════════════════════════════════════════════════════
# Verificação por amostra
# ═══════════════════════════════════════════════════════════════════════════

def test_verify_aceita_hash_que_bate(sb):
    resultado = rehash(sb, verify=2)

    assert resultado["failures"] == []
    assert len(resultado["migrated"]) == 2


def test_verify_pega_hash_defasado_e_cancela_a_limpeza(sb):
    """O sha256 veio do registry; se o binário no ar for outro, é sinal de alerta."""
    sb.objects["assets/ecg/ecg_fa_001.webp"] = b"conteudo-diferente-do-registry"

    resultado = rehash(sb, verify=2, prune=True)

    assert any("difere do binário" in motivo for _, motivo in resultado["failures"])
    assert resultado["pruned"] == []
    assert "assets/ecg/ecg_fa_001.webp" in sb.objects


def test_main_devolve_1_quando_alguma_linha_falha(sb, capsys):
    sb.quebrados.add("assets/ecg/ecg_fa_001.webp")
    assert main(["--prune"], sb=sb) == 1
    assert "limpeza NAO executada" in capsys.readouterr().err


def test_main_ok(sb, capsys):
    assert main([], sb=sb) == 0
    assert "2 migrada(s)" in capsys.readouterr().out
