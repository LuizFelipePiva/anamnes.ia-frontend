"""
Guards de autorização por papel (role), aplicados via FastAPI `Depends`.

`verify_teacher` restringe rotas a docentes (professores e admins). Espelha o
padrão de `verify_admin` (`routes/admin.py`). Ver SPEC-001 / docs/PENTEST_LOCAL.md
(achados #2, #3, #8): sem este guard, um `student` cria/gerencia entidades
docentes e, como "dono", acessa PII e notas de outros alunos.
"""
from fastapi import Depends

from app.auth.security import verify_jwt_token
from app.errors import http_error


def verify_teacher(payload=Depends(verify_jwt_token)):
    """Libera apenas `role` em (teacher, admin); caso contrário, 403."""
    if payload.get("role") not in ("teacher", "admin"):
        raise http_error(403, "forbidden_role", "Acesso restrito a professores")
    return payload
