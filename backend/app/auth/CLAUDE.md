# auth/ — AI context

Segurança JWT e middleware de cabeçalhos. RLS do Supabase complementa no nível do banco.

## Arquivos
- `service.py` — emissão/validação de JWT, lógica de autenticação.
- `client.py` — cliente Supabase Auth.
- `security.py` — `SecurityHeadersMiddleware` (registrado em `../main.py`), `verify_jwt_token` (401 `code: "invalid_token"`), `validate_uuid` (400 `code: "invalid_uuid"`). Erros usam `app.errors.http_error` (SPEC-010) — nunca `HTTPException(detail="string")` direto.
- `guards.py` — guards de autorização por papel via `Depends`. `verify_teacher` (role em teacher/admin → senão 403 `code: "forbidden_role"`, `detail` "Acesso restrito a professores"). `verify_admin` fica em `../routes/admin.py` (mesmo `code`, `detail` "Acesso restrito a administradores").

## Códigos de erro estáveis (SPEC-010)

Toda `HTTPException` migrada usa `app.errors.http_error(status_code, code, detail, **params)` em vez de `detail="string"` cru — o `code` (flat `snake_case`, ex. `case_not_found`) é o que o front consome via `t("errors.<code>")`; `detail` continua o texto pt-BR de hoje como fallback. O achatamento do envelope acontece no `exception_handler(StarletteHTTPException)` de `../main.py`: rota migrada responde `{"detail", "code"}`; rota **não migrada** responde `{"detail", "code": null}` — nunca quebra. `guards.py`/`security.py` cobrem os 401/403 de quase toda rota autenticada; o restante dos ~110 sites fora do escopo da SPEC-010 é dívida registrada (migração mecânica, sem bloqueio).

## Convenção de autorização
Rotas de aluno usam `Depends(verify_jwt_token)`. Rotas de criação/gestão/leitura **docente** (casos, turmas, atribuições, dashboard) usam `Depends(verify_teacher)` — ver SPEC-001 e `docs/PENTEST_LOCAL.md`. A checagem de **posse** (`teacher_id != sub → 403`) permanece dentro das rotas, depois do guard.
