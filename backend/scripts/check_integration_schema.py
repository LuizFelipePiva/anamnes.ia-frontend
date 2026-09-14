"""Verifica, somente por leitura, o schema necessário à entrega integrada."""
import os
from pathlib import Path

import httpx
from dotenv import dotenv_values

REQUIRED_COLUMNS = {
    "cases": "id,form_data",
    "case_attempts": "id,breakdown",
    "weekly_summaries": "id,student_id,iso_year,iso_week,weak_specialties",
    "medical_assets": "id,media_type,storage_mode,attachment_eligible",
    "case_exam_assets": "case_id,asset_id,position",
    "flashcard_decks": "id,student_id,specialty,kind",
    "flashcard_sources": "id,student_id,source_type,source_id",
    "simulados": "id",
}


def main() -> int:
    config = {**dotenv_values(Path(__file__).resolve().parents[1] / ".env"), **os.environ}
    url = config.get("SUPABASE_URL", "")
    key = config.get("SUPABASE_KEY", "")
    if not url or not key:
        print("Configure SUPABASE_URL e SUPABASE_KEY no backend/.env.")
        return 1
    failed = False
    with httpx.Client(timeout=15, headers={"apikey": key, "Authorization": f"Bearer {key}"}) as client:
        for table, columns in REQUIRED_COLUMNS.items():
            try:
                response = client.get(f"{url.rstrip('/')}/rest/v1/{table}", params={"select": columns, "limit": "0"})
                if response.is_success:
                    print(f"{table}: OK")
                else:
                    failed = True
                    print(f"{table}: verificar schema/permissoes (HTTP {response.status_code})")
            except httpx.RequestError:
                print(f"{table}: conexao indisponivel")
                failed = True
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
