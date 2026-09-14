# models/ — AI context

Schemas Pydantic de request/response. Sem lógica de negócio.

## Arquivos
- `schemas.py` — schemas de I/O das rotas (cases, chat, flashcards, etc.).
- `user.py` — modelo de usuário e papéis (`student`, `teacher`, `admin`).

⚠️ `MedicalAssetTeacher` e `MedicalAssetStudent` (SPEC-014) são modelos **separados**, não um herdando do outro: o do aluno não pode ganhar `display_name`/`diagnosis_or_finding` por herança acidental. Ver `../services/medical_asset_service.py`.
