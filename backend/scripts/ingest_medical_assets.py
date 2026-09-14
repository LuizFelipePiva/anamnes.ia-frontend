#!/usr/bin/env python
"""
Ingestão do acervo de exames complementares (SPEC-014 §4.4).

Lê o pacote curado `BIBLIOTECA_EXAMES_REUTILIZAVEIS`, sobe os binários para o
bucket público `medical-assets` e faz upsert das linhas em `medical_assets`.

**Idempotente por construção**: o `id` do pacote é estável e o `sha256` decide
se o binário precisa subir de novo. Reprocessar o acervo inteiro é seguro e
barato — é assim que exames novos entram enquanto o endpoint de upload (F1 da
spec) não existe.

Uso:
    python -m scripts.ingest_medical_assets --source <pasta/medical-assets>
    python -m scripts.ingest_medical_assets --source <...> --dry-run
    python -m scripts.ingest_medical_assets --source <...> --only-modality ecg
    python -m scripts.ingest_medical_assets --source <...> --prune-legacy --dry-run

A pasta esperada é a que contém `registry.json`, `dynamic-media.json`,
`coverage.json` e `assets/`.

⚠️ O caminho no bucket **não** espelha a pasta de origem: ele é derivado do
`sha256` (`assets/<hh>/<sha256><ext>`), porque a URL do binário é pública e o
nome de arquivo do acervo entrega o diagnóstico. `--prune-legacy` apaga os
objetos do layout antigo que sobraram da migração — confira com `--dry-run`
antes.

⚠️ Exige a **service key** (`SUPABASE_KEY` do `.env`): a escrita no catálogo não
tem policy para `authenticated`, de propósito.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

# `python scripts/ingest_medical_assets.py` roda com o diretório do script no
# sys.path, não o do projeto — sem isto, `import app...` falha.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.medical_asset_service import BUCKET  # noqa: E402

# Campos do registry que existem só para rastrear a origem nas Trilhas. Não têm
# uso aqui e carregá-los para o banco só aumentaria a linha.
_DISCARDED = ("legacyTrailUrls", "originalFilename", "sourceTrailQuestionIds",
              "sourceTrailDataFiles")

_CONTENT_TYPES = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".svg": "image/svg+xml", ".gif": "image/gif",
    ".mp4": "video/mp4", ".ogv": "video/ogg", ".webm": "video/webm",
    # Áudio (ausculta). ⚠️ `.ogg` é ambíguo no padrão — aqui vale como áudio, e
    # vídeo em Ogg entra como `.ogv`. Content-type errado faz o Chrome recusar o
    # <audio> sem erro visível: o player aparece e simplesmente não toca.
    ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav",
    ".m4a": "audio/mp4", ".aac": "audio/aac", ".flac": "audio/flac",
}


def read_json(path: Path):
    """Lê JSON em UTF-8 **explícito**.

    ⚠️ Gotcha que custou uma rodada inteira: os arquivos do pacote são UTF-8 sem
    BOM, e o Python no Windows abre com o encoding da localidade (cp1252). Sem o
    `encoding=` aqui, "TVP — avaliação" entra no banco como "TVP â€” avaliaÃ§Ã£o"
    e só se descobre quando o professor vê o nome torto no seletor.
    """
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def source_relpath(entry: dict) -> str:
    """Caminho **dentro do pacote em disco**: `assets/<modality>/<filename>`.

    É a organização do acervo curado, e continua valendo para achar o binário
    na hora de subir — só não é mais o caminho usado no bucket (ver
    `storage_path_for`).

    `Path(...).name` descarta qualquer diretório embutido no nome — um
    `../../` vindo de um registry adulterado leria fora da pasta de origem.
    O acervo é curado, mas a checagem custa uma linha.
    """
    modality = str(entry.get("modality") or "desconhecida").strip().strip("/").lower()
    modality = Path(modality).name or "desconhecida"
    filename = Path(str(entry.get("filename") or "")).name
    return f"assets/{modality}/{filename}"


def storage_path_for(entry: dict, sha256: str | None) -> str | None:
    """Caminho no bucket: `assets/<hh>/<sha256><ext>` — **opaco de propósito**.

    O bucket é público e a URL do binário aparece inteira no `src` da imagem
    que o aluno vê. Com o caminho antigo (`assets/radiografia/rx_pneumo_001.webp`)
    bastava um clique direito para ler o gabarito — o nome do arquivo do acervo
    é tão falante quanto o `display_name`, que a API nunca envia.

    O hash vem do próprio binário, então dois assets byte-idênticos convergem
    para o mesmo objeto (desejável) e um binário novo nunca sobrescreve o
    antigo — o caminho muda junto. O preço é que o bucket deixa de ser
    navegável a olho: quem precisar rastrear consulta `medical_assets`.

    Os dois primeiros caracteres viram diretório só para não deixar 300+
    objetos num prefixo único.
    """
    if not sha256:
        return None
    # `.name` de novo: sha vindo do registry é dado externo e não pode virar
    # diretório.
    digest = Path(str(sha256)).name.strip().lower()
    ext = Path(str(entry.get("filename") or "")).suffix.lower()
    return f"assets/{digest[:2]}/{digest}{ext}"


def to_row(entry: dict, sha256: str | None = None) -> dict:
    """Converte um registro do pacote (camelCase) numa linha da tabela.

    `sha256` entra por parâmetro porque o caminho no bucket deriva dele: quando
    o registry não traz o hash, quem tem o arquivo em mãos é o chamador.

    Assets remotos não têm binário local: guardam `remote_url` e `sha256` fica
    nulo — não há arquivo nosso para comparar.
    """
    is_remote = (entry.get("storageMode") or "supabase") == "remote"
    sha = sha256 or entry.get("sha256")
    return {
        "id": entry["id"],
        "modality": (entry.get("modality") or "").strip().lower(),
        "display_name": entry.get("displayName") or entry["id"],
        "diagnosis_or_finding": entry.get("diagnosisOrFinding") or "",
        "storage_path": None if is_remote else storage_path_for(entry, sha),
        "remote_url": entry.get("remoteUrl") if is_remote else None,
        "storage_mode": "remote" if is_remote else "supabase",
        "media_type": entry.get("mediaType") or "image",
        "attachment_eligible": bool(entry.get("attachmentEligible", True)),
        "tags": entry.get("tags") or [],
        "license": entry.get("license"),
        "source_url": entry.get("sourceUrl"),
        "credits": entry.get("credits") or None,
        # "REMOTE_NOT_STORED" é o marcador do pacote para "não há binário".
        # Guardá-lo faria o script achar que o hash mudou a cada execução.
        "sha256": None if (is_remote or sha == "REMOTE_NOT_STORED") else sha,
    }


def load_entries(source: Path) -> list[dict]:
    """Registry + mídias dinâmicas, com os campos de proveniência descartados.

    `dynamic-media.json` complementa o registry: os 15 remotos aparecem nos dois
    arquivos, e a versão dinâmica é a que traz `storageMode`/`remoteUrl`.
    """
    entries = {e["id"]: e for e in read_json(source / "registry.json")}

    dynamic_path = source / "dynamic-media.json"
    if dynamic_path.exists():
        for entry in read_json(dynamic_path):
            entries[entry["id"]] = {**entries.get(entry["id"], {}), **entry}

    return [
        {k: v for k, v in entry.items() if k not in _DISCARDED}
        for entry in entries.values()
    ]


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_bucket(sb) -> None:
    """Cria o bucket público se ele não existir.

    Sem isto, rodar o script num projeto novo "funciona": todo upload falha com
    *Bucket not found*, o upsert da tabela passa, e o catálogo fica completo
    apontando para 316 URLs quebradas. O sintoma só aparece na tela do aluno.

    Público de propósito — o conteúdo é didático e de acervo aberto, e URL
    estável é cacheável pelo CDN (§4.1 da spec).
    """
    # O `try` cobre SÓ as chamadas de API. Quando envolvia também o `print` de
    # sucesso, um erro de encoding do console (o "✅" não existe em cp1252, o
    # default do Windows) era capturado aqui e virava "não foi possível criar o
    # bucket" — com o bucket já criado. Alerta falso sobre sucesso é pior que
    # não avisar nada: manda investigar o que está certo.
    try:
        existing = {b["name"] if isinstance(b, dict) else getattr(b, "name", None)
                    for b in (sb.storage.list_buckets() or [])}
        if BUCKET in existing:
            return
        sb.storage.create_bucket(BUCKET, options={"public": True})
    except Exception as exc:
        # Não aborta: o bucket pode existir e a listagem falhar por permissão da
        # chave. Se o problema for real, os uploads falham logo em seguida com
        # mensagem própria.
        print(f"[aviso] não foi possível verificar/criar o bucket '{BUCKET}': {exc}",
              file=sys.stderr)
        return

    print(f"[ok] bucket '{BUCKET}' criado (público)")


def list_bucket_objects(sb, prefix: str = "assets") -> list[str]:
    """Todos os caminhos de objeto sob `prefix`, descendo um nível de cada vez.

    O storage do Supabase não lista recursivamente: cada chamada devolve os
    filhos diretos, e prefixo ("pasta") vem com `id` nulo. A paginação é
    obrigatória — o default do SDK trunca em 100 e o acervo tem ~300 objetos,
    então sem `offset` a limpeza deixaria a maior parte do lixo para trás
    achando que já viu tudo.
    """
    out: list[str] = []
    offset = 0
    while True:
        page = sb.storage.from_(BUCKET).list(
            prefix, {"limit": 100, "offset": offset}
        ) or []
        for item in page:
            name = item.get("name") if isinstance(item, dict) else None
            if not name:
                continue
            path = f"{prefix}/{name}"
            if (item.get("id") if isinstance(item, dict) else None) is None:
                out.extend(list_bucket_objects(sb, path))
            else:
                out.append(path)
        if len(page) < 100:
            return out
        offset += len(page)


def prune_legacy(sb, keep: set[str], *, dry_run: bool = False) -> list[str]:
    """Apaga do bucket os objetos que o acervo atual não referencia.

    Existe por causa da migração para caminhos opacos: os binários no layout
    antigo (`assets/<modalidade>/<nome-falante>.webp`) continuam servíveis por
    URL, e o nome do arquivo era justamente o vazamento que a mudança fecha.

    ⚠️ Destrutivo e cego ao motivo: **só** vale com o acervo inteiro em mãos.
    Rodar junto de `--only-modality` apagaria todas as outras modalidades, por
    isso o `main` recusa a combinação.
    """
    stale = sorted(set(list_bucket_objects(sb)) - keep)
    if stale and not dry_run:
        # Em lotes: o `remove` manda a lista no corpo, e 300 caminhos de uma vez
        # esbarram no limite de payload em alguns ambientes.
        for start in range(0, len(stale), 100):
            sb.storage.from_(BUCKET).remove(stale[start:start + 100])
    return stale


def existing_rows(sb) -> dict[str, dict]:
    """`id → {sha256, storage_path}` do que já está no banco.

    É o que torna o re-run barato — e o `storage_path` faz parte da comparação
    de propósito: quando a **convenção de caminho** muda (foi o que aconteceu na
    migração para caminhos opacos), o hash continua igual e só o destino muda.
    Comparar apenas o hash pularia o upload, e o upsert gravaria uma linha
    apontando para um objeto que nunca subiu — 404 na tela do aluno, com o
    script relatando sucesso.
    """
    result = sb.table("medical_assets").select("id, sha256, storage_path").execute()
    return {
        row["id"]: {"sha256": row.get("sha256"), "storage_path": row.get("storage_path")}
        for row in (result.data or [])
    }


def check_coverage(source: Path, rows: list[dict]) -> list[str]:
    """Compara a contagem ingerida com `coverage.json`.

    Divergência quase sempre significa registry e pasta `assets/` fora de sincronia
    — falha silenciosa que só apareceria como exame faltando no seletor.
    """
    coverage_path = source / "coverage.json"
    if not coverage_path.exists():
        return []

    expected = {
        item["modality"]: item.get("indexedAssets", 0)
        for item in read_json(coverage_path)
    }
    actual: dict[str, int] = {}
    for row in rows:
        actual[row["modality"]] = actual.get(row["modality"], 0) + 1

    problems = []
    for modality, count in expected.items():
        got = actual.get(modality, 0)
        if got != count:
            problems.append(f"{modality}: esperado {count}, ingerido {got}")
    for modality, got in actual.items():
        if modality not in expected:
            problems.append(f"{modality}: {got} ingerido(s), ausente do coverage.json")
    return problems


def ingest(
    source: Path,
    sb,
    *,
    dry_run: bool = False,
    only_modality: str | None = None,
    prune: bool = False,
) -> dict:
    """Executa a ingestão e devolve o resumo (contadores + divergências)."""
    entries = load_entries(source)
    if only_modality:
        wanted = only_modality.strip().lower()
        entries = [e for e in entries if (e.get("modality") or "").lower() == wanted]

    if not dry_run:
        ensure_bucket(sb)

    known = {} if dry_run else existing_rows(sb)

    rows: list[dict] = []
    uploaded = 0
    skipped = 0
    missing_files: list[str] = []

    for entry in entries:
        rel = source_relpath(entry)
        local = source / rel
        is_remote = (entry.get("storageMode") or "supabase") == "remote"

        # O hash do registry manda; o do disco só entra quando o pacote não
        # declara nenhum. Inverter a ordem quebraria o re-upload forçado — é
        # editando o `sha256` do registry que se diz "este binário mudou".
        sha = entry.get("sha256")
        if not is_remote and sha in (None, "", "REMOTE_NOT_STORED") and local.exists():
            sha = file_sha256(local)

        row = to_row(entry, sha)

        # Sem hash e sem arquivo não há caminho no bucket — e uma linha sem
        # `storage_path` nem `remote_url` é rejeitada pelo CHECK do schema. Vale
        # mais deixá-la de fora com aviso do que derrubar o lote inteiro.
        if not is_remote and not row["storage_path"]:
            missing_files.append(rel)
            continue

        rows.append(row)

        if row["storage_mode"] == "remote":
            continue

        if not local.exists():
            missing_files.append(rel)
            continue

        # Hash **e** destino iguais = o binário já está no bucket, neste
        # caminho. Subir de novo custaria banda para produzir o byte idêntico.
        # (O hash já vem resolvido do bloco acima — do registry ou do arquivo.)
        previous = known.get(row["id"]) or {}
        if (previous.get("sha256")
                and previous["sha256"] == row["sha256"]
                and previous.get("storage_path") == row["storage_path"]):
            skipped += 1
            continue

        if not dry_run:
            sb.storage.from_(BUCKET).upload(
                path=row["storage_path"],
                file=local.read_bytes(),
                file_options={
                    "content-type": _CONTENT_TYPES.get(local.suffix.lower(), "application/octet-stream"),
                    "upsert": "true",
                },
            )
        uploaded += 1

    pruned: list[str] = []
    if prune:
        keep = {r["storage_path"] for r in rows if r["storage_path"]}
        pruned = prune_legacy(sb, keep, dry_run=dry_run)

    if not dry_run and rows:
        # Lotes de 100: um upsert de 316 linhas com `tags`/`credits` estoura o
        # limite de payload do PostgREST em alguns ambientes.
        for start in range(0, len(rows), 100):
            sb.table("medical_assets").upsert(rows[start:start + 100]).execute()

    return {
        "total": len(rows),
        "uploaded": uploaded,
        "skipped": skipped,
        "missing_files": missing_files,
        "pruned": pruned,
        # Cobertura só faz sentido no acervo inteiro: com `--only-modality`
        # a divergência seria o esperado, não um defeito.
        "coverage_problems": [] if only_modality else check_coverage(source, rows),
        "by_modality": _count_by_modality(rows),
        "dry_run": dry_run,
    }


def _count_by_modality(rows: list[dict]) -> dict[str, int]:
    out: dict[str, int] = {}
    for row in rows:
        out[row["modality"]] = out.get(row["modality"], 0) + 1
    return dict(sorted(out.items()))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Ingere o acervo de exames complementares.")
    parser.add_argument("--source", required=True,
                        help="Pasta com registry.json, coverage.json e assets/")
    parser.add_argument("--dry-run", action="store_true",
                        help="Não escreve nada: nem upload, nem upsert.")
    parser.add_argument("--only-modality", default=None,
                        help="Processa apenas uma modalidade (ex.: ecg).")
    parser.add_argument("--prune-legacy", action="store_true",
                        help="APAGA do bucket os objetos que o acervo atual não "
                             "referencia (binários do layout antigo). Combine com "
                             "--dry-run primeiro para ver a lista.")
    return parser


def main(argv: list[str] | None = None, sb=None) -> int:
    args = build_parser().parse_args(argv)
    source = Path(args.source).expanduser().resolve()

    if not (source / "registry.json").exists():
        print(f"[erro] registry.json não encontrado em {source}", file=sys.stderr)
        return 2

    # A limpeza compara o bucket inteiro com o que foi ingerido nesta execução:
    # com um recorte de modalidade, "o que sobrou" seria o acervo todo.
    if args.prune_legacy and args.only_modality:
        print("[erro] --prune-legacy nao pode ser usado com --only-modality: "
              "apagaria as demais modalidades.", file=sys.stderr)
        return 2

    if sb is None and not (args.dry_run and not args.prune_legacy):
        from app.db.supabase import get_supabase_client
        sb = get_supabase_client()

    summary = ingest(source, sb, dry_run=args.dry_run,
                     only_modality=args.only_modality,
                     prune=args.prune_legacy)

    prefix = "[dry-run] " if summary["dry_run"] else ""
    print(f"{prefix}{summary['total']} asset(s) processado(s) — "
          f"{summary['uploaded']} upload(s), {summary['skipped']} inalterado(s)")
    for modality, count in summary["by_modality"].items():
        print(f"  {modality:20s} {count}")

    if summary["missing_files"]:
        print(f"\n[aviso] {len(summary['missing_files'])} binário(s) do registry não existem em disco:",
              file=sys.stderr)
        for path in summary["missing_files"][:10]:
            print(f"   {path}", file=sys.stderr)

    if summary["pruned"]:
        verbo = "seriam apagados" if summary["dry_run"] else "apagados"
        print(f"\n[ok] {len(summary['pruned'])} objeto(s) orfao(s) {verbo} do bucket:")
        for path in summary["pruned"][:10]:
            print(f"   {path}")
        if len(summary["pruned"]) > 10:
            print(f"   ... e mais {len(summary['pruned']) - 10}")

    if summary["coverage_problems"]:
        print("\n[erro] Divergência com coverage.json:", file=sys.stderr)
        for problem in summary["coverage_problems"]:
            print(f"   {problem}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
