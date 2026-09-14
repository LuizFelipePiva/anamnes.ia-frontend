#!/usr/bin/env python
"""
Migra os binários já ingeridos para os caminhos opacos (SPEC-014 §4.1).

`ingest_medical_assets.py` faz isso a partir do **pacote curado em disco**. Este
script faz a mesma migração a partir do **próprio bucket**: baixa cada objeto,
calcula o `sha256` do que está de fato no ar, sobe em `assets/<hh>/<sha256><ext>`
e atualiza a linha correspondente em `medical_assets`.

Serve para quem já tem o acervo em produção e não tem (ou não quer depender de)
a pasta `BIBLIOTECA_EXAMES_REUTILIZAVEIS` na máquina. Como o hash vem do binário
que está no bucket, o resultado é consistente com o que a aplicação serve hoje —
uma cópia local defasada produziria caminho para um conteúdo diferente.

Uso:
    python scripts/rehash_storage_paths.py --dry-run
    python scripts/rehash_storage_paths.py
    python scripts/rehash_storage_paths.py --prune          # apaga os antigos

**Idempotente**: linha já em caminho opaco é contada como `já migrada` e não
baixa nada. Rodar duas vezes seguidas é barato e seguro.

⚠️ `--prune` é o passo que **fecha o vazamento**: até ele, os binários de nome
falante (`assets/radiografia/rx_pneumo_001.webp`) continuam servíveis por URL.
Por isso mesmo ele se recusa a rodar se alguma linha ficou para trás — apagar o
objeto antigo de uma linha não migrada deixaria o exame 404 na tela do aluno.

⚠️ Exige a **service key** (`SUPABASE_KEY` do `.env`).
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

# Mesmo motivo do script de ingestão: rodar por caminho põe `scripts/` no
# sys.path, não a raiz do backend.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.medical_asset_service import BUCKET  # noqa: E402
from scripts.ingest_medical_assets import (  # noqa: E402
    _CONTENT_TYPES,
    prune_legacy,
)

# `assets/<2 hex>/<64 hex><ext>`. Serve para reconhecer o que já está migrado,
# então é deliberadamente estrito: um caminho "quase" no formato (hash curto,
# maiúsculas) é tratado como antigo e migrado de novo — barato e sem risco.
OPAQUE_RE = re.compile(r"^assets/[0-9a-f]{2}/[0-9a-f]{64}(\.[a-z0-9]+)?$")


def opaque_path(digest: str, current_path: str) -> str:
    """`assets/<hh>/<sha256><ext>`, com a extensão herdada do caminho atual.

    A extensão importa: é dela que sai o `content-type` do upload, e um `.mp3`
    servido como `application/octet-stream` faz o Chrome exibir o player de
    áudio sem nunca tocar.
    """
    ext = Path(current_path).suffix.lower()
    return f"assets/{digest[:2]}/{digest}{ext}"


def _copy(sb, origem: str, destino: str) -> None:
    """Cópia server-side, tolerante a destino já existente.

    O `copy` do Storage recusa sobrescrever. Aqui o destino é o hash do
    conteúdo, então "já existe" significa que o byte-a-byte já está lá — dois
    assets idênticos convergem para o mesmo objeto, e uma execução interrompida
    no meio recomeça sem tropeçar no que já copiou.
    """
    try:
        sb.storage.from_(BUCKET).copy(origem, destino)
    except Exception as exc:
        if "exist" not in str(exc).lower():
            raise


def fetch_rows(sb) -> list[dict]:
    """Linhas do catálogo que têm binário nosso.

    Os remotos (vídeos hospedados no Wikimedia) não têm `storage_path` e ficam
    de fora: não controlamos aquelas URLs, e não há o que renomear.
    """
    result = (
        sb.table("medical_assets")
        .select("id, storage_path, storage_mode, sha256")
        .execute()
    )
    return [
        row for row in (result.data or [])
        if row.get("storage_path") and (row.get("storage_mode") or "supabase") != "remote"
    ]


def verify_sample(sb, rows: list[dict], quantidade: int) -> list[tuple[str, str]]:
    """Confere, numa amostra, se o `sha256` da linha é mesmo o do binário.

    O hash gravado veio do `registry.json`, não de uma leitura do bucket. Se o
    pacote e o que está no ar tiverem divergido em algum momento, o caminho novo
    deixa de ser o hash do conteúdo — continua opaco (o vazamento fecha do mesmo
    jeito), mas a próxima ingestão a partir do pacote não reconheceria o objeto
    e subiria tudo de novo. Barato conferir alguns antes de mexer em 300.
    """
    problemas: list[tuple[str, str]] = []
    for row in rows[:quantidade]:
        declarado = (row.get("sha256") or "").strip().lower()
        if not declarado:
            continue
        try:
            blob = sb.storage.from_(BUCKET).download(row["storage_path"])
        except Exception as exc:
            problemas.append((row["id"], f"amostra não pôde ser baixada: {exc}"))
            continue
        real = hashlib.sha256(blob or b"").hexdigest()
        if real != declarado:
            problemas.append(
                (row["id"], f"sha256 do banco ({declarado[:12]}…) difere do binário ({real[:12]}…)")
            )
    return problemas


def rehash(sb, *, dry_run: bool = False, prune: bool = False, verify: int = 0) -> dict:
    """Migra os caminhos e (opcionalmente) apaga os objetos órfãos."""
    rows = fetch_rows(sb)

    migrated: list[tuple[str, str]] = []   # (id, caminho novo)
    already = 0
    failures: list[tuple[str, str]] = []   # (id, motivo)
    if verify:
        failures.extend(verify_sample(sb, rows, verify))
    # Tudo o que deve continuar no bucket ao final — inclusive o caminho antigo
    # de uma linha que falhou, senão o prune apagaria o binário de um exame vivo.
    keep: set[str] = set()

    for row in rows:
        current = row["storage_path"]

        if OPAQUE_RE.match(current):
            already += 1
            keep.add(current)
            continue

        # Caminho barato: o hash já está na linha (veio do registry na ingestão),
        # então o binário nem precisa sair do datacenter — `copy` é server-side.
        # Baixar 300 arquivos só para recalcular um hash que já temos seria
        # trocar segundos por dezenas de megabytes de tráfego.
        digest = (row.get("sha256") or "").strip().lower()
        blob = None

        if not digest:
            try:
                blob = sb.storage.from_(BUCKET).download(current)
            except Exception as exc:  # objeto sumiu, permissão, rede…
                failures.append((row["id"], f"download falhou: {exc}"))
                keep.add(current)
                continue
            if not blob:
                failures.append((row["id"], "objeto vazio no bucket"))
                keep.add(current)
                continue
            digest = hashlib.sha256(blob).hexdigest()

        target = opaque_path(digest, current)

        if not dry_run:
            try:
                if blob is None:
                    _copy(sb, current, target)
                else:
                    sb.storage.from_(BUCKET).upload(
                        path=target,
                        file=blob,
                        file_options={
                            "content-type": _CONTENT_TYPES.get(
                                Path(current).suffix.lower(), "application/octet-stream"
                            ),
                            "upsert": "true",
                        },
                    )
                # A linha só aponta para o caminho novo depois que o objeto
                # existe. Na ordem inversa, uma falha de cópia deixaria o
                # catálogo apontando para o vazio.
                sb.table("medical_assets").update(
                    {"storage_path": target, "sha256": digest}
                ).eq("id", row["id"]).execute()
            except Exception as exc:
                failures.append((row["id"], f"cópia/update falhou: {exc}"))
                keep.add(current)
                continue

        migrated.append((row["id"], target))
        keep.add(target)

    # Falha em qualquer linha cancela a limpeza inteira: o `keep` protege o
    # binário antigo daquela linha, mas uma falha é sinal de que o inventário
    # não é confiável — e apagar é o único passo que não tem volta.
    pruned: list[str] = []
    if prune and not failures:
        pruned = prune_legacy(sb, keep, dry_run=dry_run)

    return {
        "total": len(rows),
        "migrated": migrated,
        "already": already,
        "failures": failures,
        "pruned": pruned,
        "prune_skipped": bool(prune and failures),
        "dry_run": dry_run,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Migra os exames já ingeridos para caminhos opacos, a partir do bucket."
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Mostra o que faria: não copia, não atualiza e não apaga.")
    parser.add_argument("--prune", action="store_true",
                        help="APAGA do bucket os objetos que nenhuma linha referencia "
                             "(os binários de nome falante). É o passo que fecha o vazamento.")
    parser.add_argument("--verify", type=int, default=0, metavar="N",
                        help="Baixa N binários e confere se o sha256 do banco bate com "
                             "o conteúdo real. Divergência vira falha e cancela a limpeza.")
    return parser


def main(argv: list[str] | None = None, sb=None) -> int:
    args = build_parser().parse_args(argv)

    if sb is None:
        from app.db.supabase import get_supabase_client
        sb = get_supabase_client()

    summary = rehash(sb, dry_run=args.dry_run, prune=args.prune, verify=args.verify)

    prefix = "[dry-run] " if summary["dry_run"] else ""
    print(f"{prefix}{summary['total']} linha(s) com binário próprio — "
          f"{len(summary['migrated'])} migrada(s), {summary['already']} já em caminho opaco")

    for asset_id, target in summary["migrated"][:10]:
        print(f"   {asset_id:24s} -> {target}")
    if len(summary["migrated"]) > 10:
        print(f"   ... e mais {len(summary['migrated']) - 10}")

    if summary["pruned"]:
        verbo = "seriam apagados" if summary["dry_run"] else "apagados"
        print(f"\n[ok] {len(summary['pruned'])} objeto(s) orfao(s) {verbo} do bucket:")
        for path in summary["pruned"][:10]:
            print(f"   {path}")
        if len(summary["pruned"]) > 10:
            print(f"   ... e mais {len(summary['pruned']) - 10}")

    if summary["prune_skipped"]:
        print("\n[erro] limpeza NAO executada: ha linha(s) que nao migraram (abaixo). "
              "Apagar agora deixaria o exame 404 para o aluno.", file=sys.stderr)

    if summary["failures"]:
        print(f"\n[erro] {len(summary['failures'])} linha(s) falharam:", file=sys.stderr)
        for asset_id, reason in summary["failures"]:
            print(f"   {asset_id}: {reason}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
