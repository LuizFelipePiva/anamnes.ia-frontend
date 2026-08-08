# SPEC-010 — i18n Fase 2A: códigos de erro estáveis no backend

- **Contexto**: `docs/I18N.md` (decisão **D4**, item 2.4 do escopo por camada). Fase 0 = `SPEC-007`. Fases 1 e 1.5 (UI) ✅.
- **Par**: `SPEC-011-i18n-fase2b-ia-idioma.md` (idioma nos prompts de IA). As duas formam a Fase 2 e são **independentes** — tocam arquivos e linhas distintos, podem ser implementadas em qualquer ordem, sem bloqueio mútuo.
- **Status**: 🟢 **implementada (2026-07-31)**. T1–T12 verdes (42 casos parametrizados), `ruff check app/` limpo, suíte completa (166 testes) sem regressão. Achado da implementação: nenhum dos 15 sites migrados tinha `detail=str(e)` — RF5 (sanitizar 5xx/preservar 4xx) ficou testado como padrão/convenção, sem site real a migrar nesta spec (ver docstring de `test_spec010_i18n_error_codes.py`).

---

## 1. Contexto / Problema

### 1.1 Erros intraduzíveis

O backend responde erros em **4 formatos diferentes**, todos com texto fixo em pt-BR (ou inglês):

| # | Origem | Formato | Onde |
|---|---|---|---|
| 1 | `HTTPException` nas rotas | `{"detail": "Caso não encontrado"}` (default do FastAPI) | 138 sites em 9 arquivos |
| 2 | `RequestValidationError` (422) | `{"error": "Dados inválidos", "details": [...]}` | `main.py:103` |
| 3 | Exception genérica (500) | `{"error": "Erro interno do servidor", "message": "..."}` | `main.py:115` |
| 4 | `RateLimitExceeded` (429, slowapi) | `{"error": "Rate limit exceeded: 10 per 1 minute"}` — **em inglês** | `main.py:100` |

O front não tem como traduzir isso sem fazer *parsing* de string pt-BR — frágil, quebra a cada reformulação de mensagem. D4 já decidiu a saída: o backend envia um **`code` estável** (`case_not_found`, `email_already_registered`, …), e o front traduz via `t("errors.<code>")`, usando o `detail` pt-BR como fallback quando a chave não existe.

Distribuição dos 138 `HTTPException` em `backend/app/routes/`: `cases.py` 40, `admin.py` 23, `flashcards.py` 21, `profile.py` 18, `classes.py` 14, `api.py` 10, `questions.py` 10, `dashboard.py` 2, `health.py` 0. Além deles, `app/auth/security.py` (`verify_jwt_token`, `validate_uuid`) e `app/auth/guards.py` (`verify_teacher`) lançam os 401/403 que alimentam **quase toda rota autenticada** via `Depends` — dois arquivos com alavancagem desproporcional.

### 1.2 Restrição descoberta na revisão: o handler global é obrigatório

O front lê `.detail` em **43 lugares** (`core/utils/errorHandler.ts:75` faz `if (data.detail) errorMessage = data.detail`, tratando como string). O FastAPI, sem handler custom, serializa `HTTPException(detail=<dict>)` como `{"detail": {…}}` — **aninhado**. Ou seja: adotar `detail` como dict **sem** o handler do RF2 faria 43 pontos do front exibirem `[object Object]`.

O RF2 não é uma conveniência de design: é o que torna a abordagem viável. Tem teste dedicado (T11).

## 2. Objetivo

1. Envelope de erro estável `{"detail": "<texto humano>", "code": "<slug>"}` em **toda** resposta de rota — inclusive nas ainda não migradas, que recebem `"code": null` em vez de quebrar.
2. `security.py` + `guards.py` migrados (cobre 401/403 de praticamente toda rota autenticada) e os **15 códigos de erro mais frequentes** (RF4) cobertos — ~40 dos 138 sites explícitos.
3. Erros com número interpolado (quotas 429) carregam os valores em `params` estruturado, para o front recompor a frase traduzida via `t(key, params)`.

## 3. Não-objetivos

- **Long tail dos ~110 sites restantes** (E1): migráveis a qualquer momento, em PRs mecânicos, sem depender desta spec — o handler do RF2 aceita rota não migrada por construção. Registrado no §9.
- **429 do slowapi** (E3): handler próprio, texto em inglês, sem `detail`. Dívida no §9.
- **Unificar os formatos 2 e 3** (`error`/`details`/`message`): não mudam aqui.
- **Catálogo `t("errors.<code>")` no front**: spec/PR de frontend consumindo os `code`s desta.
- **Idioma nos prompts de IA**: é a `SPEC-011`, independente desta.

## 4. Requisitos funcionais

- **RF1 — helper central**: novo `backend/app/errors.py` com

  ```python
  def http_error(status_code: int, code: str, detail: str, **params) -> HTTPException:
      payload = {"detail": detail, "code": code}
      if params:
          payload["params"] = params
      return HTTPException(status_code=status_code, detail=payload)
  ```

  Todo site novo/migrado usa o helper — nunca `HTTPException(detail="string")` direto.

- **RF2 — handler global normalizador (obrigatório, ver §1.2)**: `@app.exception_handler(StarletteHTTPException)` em `main.py`:
  - `exc.detail` é `dict` com `code` (migrado) → responde o dict achatado: `{"detail": …, "code": …, "params"?: …}`.
  - `exc.detail` é `str` (não migrado) → responde `{"detail": exc.detail, "code": None}`.

  Resultado: **toda** rota responde com `detail` (string) e `code` presentes. O front nunca recebe `detail` aninhado, e pode checar `code` sem guardas defensivas.

- **RF3 — pontos centrais primeiro**: `verify_jwt_token` (401 → `invalid_token`), `validate_uuid` (400 → `invalid_uuid`) em `security.py`; `verify_teacher` e equivalentes (403 → `forbidden_role`) em `guards.py`.

- **RF4 — os 15 códigos do escopo**: convenção **flat `snake_case`, sem ponto** (E4) — `case_not_found`, nunca `case.not_found`. O front consome como `t("errors.<code>")` e o i18next trata `.` como separador de nível: um `code` com ponto deixaria de ser string opaca e passaria a ditar a estrutura aninhada do JSON nos 4 idiomas. Flat mantém `errors` como objeto plano, fácil de exportar no CSV de revisão (SPEC-009) e de varrer com `npm run i18n:keys`. O `code` é estável mesmo que o texto do `detail` mude depois.

  | `code` | HTTP | `detail` pt-BR atual (preservado) | Origem |
  |---|---|---|---|
  | `invalid_token` | 401 | "Token inválido ou expirado" | `security.py` (central) |
  | `invalid_uuid` | 400 | (mensagem do `validate_uuid`) | `security.py` (central) |
  | `forbidden_role` | 403 | "Acesso restrito a administradores/professores" | `guards.py` (central) |
  | `access_denied` | 403 | "Acesso negado" | `cases.py` (6×), `classes.py` |
  | `invalid_credentials` | 401 | "Credenciais inválidas — verifique email e senha" | `api.py` |
  | `wrong_password` | 401 | "Senha atual incorreta" | `profile.py` (2×) |
  | `case_not_found` | 404 | "Caso não encontrado" | `cases.py` (5×), `admin.py` |
  | `class_not_found` | 404 | "Turma não encontrada" | `classes.py`, `admin.py` |
  | `user_not_found` | 404 | "Usuário não encontrado" | `admin.py` (3×), `profile.py` (2×) |
  | `conversation_not_found` | 404 | "Conversa não encontrada" | `api.py` (2×) |
  | `email_already_registered` | 409 | "E-mail já cadastrado" | `api.py` |
  | `already_enrolled` | 409 | "Você já está nesta turma" | `classes.py` |
  | `case_expired` | 410 | "Caso expirado / não disponível" | `cases.py` (2×) |
  | `ai_quota_exceeded` | 429 | "Limite diário de {n} sessões de Chat IA…" | `cases.py` |
  | `case_quota_exceeded` | 429 | "Limite diário de {n} casos…" | `cases.py` |

- **RF5 — sanitização do `detail` dinâmico, apenas nos 5xx de infra** (E2): a regra depende da **origem** do texto dinâmico, não do fato de ser dinâmico.

  **Sanitizar (5xx)** — `str(e)` é stack de banco/rede/OpenAI, que o usuário não consegue acionar de propósito e não deve vazar:

  ```python
  # antes                                    # depois
  detail=f"Erro ao salvar caso: {e}"         logger.exception("Erro ao salvar caso")
                                             raise http_error(500, "case_save_failed",
                                                              "Erro ao salvar caso.")
  ```

  **Preservar (4xx)** — `str(e)` vem de um `ValueError` de service com mensagem escrita para humano, já revisada e útil. Ganha `code`, mantém o texto:

  ```python
  # ValueError("Turma já cheia") no service
  raise http_error(400, "class_full", str(e))   # texto preservado
  ```

  Consequência assumida: o **texto visível muda apenas nos 5xx** — exceção explícita e delimitada ao critério de "texto preservado" do §6.

- **RF6 — erros com valor numérico (429 de quota)**: `http_error(429, "ai_quota_exceeded", "<texto pt-BR atual>", limit=n)`. O front recompõe via `t("errors.ai_quota_exceeded", { limit: n })` em vez de depender do texto.

## 5. Casos de teste — `backend/tests/test_spec010_i18n_error_codes.py`

| # | Cenário | Esperado |
|---|---|---|
| T1 | `http_error(404, "case_not_found", "Caso não encontrado")` | `detail == {"detail": "Caso não encontrado", "code": "case_not_found"}` |
| T2 | `http_error(429, "ai_quota_exceeded", "…", limit=20)` | `detail` inclui `{"params": {"limit": 20}}` |
| T3 | Rota autenticada sem token válido | 401 com `code: "invalid_token"` |
| T4 | Aluno em rota `Depends(verify_teacher)` | 403 com `code: "forbidden_role"` |
| T5 | UUID malformado em path param | 400 com `code: "invalid_uuid"` |
| T6 | Rota **não** migrada (`HTTPException(404, detail="x")` cru) | `{"detail": "x", "code": None}` — handler tolerante, nada quebra |
| T7 | Parametrizado sobre os 15 códigos do RF4 | Cada um retorna seu `code`, e o `detail` bate com o texto pt-BR atual |
| T8 | 429 de quota de IA | `code: "ai_quota_exceeded"` e `params.limit` igual ao limite configurado |
| T9 | `RequestValidationError` (422) e exception genérica (500) | Formato **inalterado** (`{"error": …}`) — regressão do não-objetivo |
| T10 | **5xx** de infra (RF5): service levanta exception com mensagem interna | `detail` genérico; `str(e)` **ausente** do corpo e **presente** no log |
| T10b | **4xx** de negócio (RF5): service levanta `ValueError("Turma já cheia")` | `detail == "Turma já cheia"` (texto **preservado**) + `code` presente — trava a delimitação da E2 |
| T11 | Qualquer rota migrada | `response.json()["detail"]` é `str`, nunca `dict` — trava a regressão do §1.2 que quebraria os 43 pontos do front |
| T12 | Todos os `code` do RF4 | Casam `^[a-z][a-z0-9_]*$` — sem ponto, sem maiúscula (trava a convenção da E4 contra drift futuro) |

## 6. Critérios de aceite

- [ ] T1–T12 verdes (pytest).
- [ ] `ruff check app/` limpo.
- [ ] Texto de `detail` preservado em todos os sites migrados, **exceto os 5xx de infra** sanitizados pelo RF5 (mudança intencional e delimitada, E2). Nenhum 4xx muda de texto.
- [ ] Todos os `code` em flat `snake_case`, sem ponto (E4, travado por T12).
- [ ] `response.json()["detail"]` nunca é `dict` em nenhuma rota (T11).
- [ ] Formatos 2, 3 e 4 (`RequestValidationError`, 500 genérico, 429 slowapi) inalterados.
- [ ] Docs no mesmo PR: `docs/I18N.md`, `docs/BACKEND.md`, `backend/app/{routes,auth}/CLAUDE.md`.

## 7. Arquivos afetados

**Novos**
- `backend/app/errors.py` — `http_error()`.
- `backend/tests/test_spec010_i18n_error_codes.py`

**Modificados**
- `backend/app/main.py` — handler `StarletteHTTPException` (RF2).
- `backend/app/auth/security.py`, `backend/app/auth/guards.py` — RF3.
- `backend/app/routes/{cases,classes,profile,api,admin}.py` — apenas os sites dos 15 códigos do RF4 (não os 138).

> Nenhum arquivo de `app/services/` é tocado — isso é a `SPEC-011`.

## 8. Decisões (fechadas em 2026-07-31)

| ID | Decisão | Escolha | Motivo |
|---|---|---|---|
| E1 | Escopo da migração dos 138 sites | **Infra + guards + 15 códigos mais frequentes**; long tail vira dívida | Cobre a maior parte do tráfego real de erro com fração do trabalho; o handler tolerante (RF2) permite migrar o resto a qualquer momento sem coordenação |
| E2 | `detail=str(e)` nos sites migrados | **Sanitizar só nos 5xx de infra**; 4xx de negócio preservam o texto | No 5xx o `str(e)` é stack de banco/rede/OpenAI — não deve vazar e o usuário não o aciona. No 4xx é mensagem escrita para humano, já revisada e útil; genericizá-la degradaria UX sem ganho de segurança |
| E3 | 429 do slowapi | **Dívida** (§9) | Handler isolado e trocável depois; manter a spec focada |
| E4 | Formato do `code` | **Flat `snake_case`, sem ponto** | O front consome via `t("errors.<code>")` e o i18next trata `.` como separador de nível — ponto acoplaria o `code` à estrutura aninhada do JSON nos 4 idiomas. Flat mantém o `code` como string opaca e o `errors` como objeto plano (melhor para o CSV da SPEC-009 e para o `i18n:keys`) |

## 9. Dívida registrada (não resolvida aqui)

- **Long tail (~110 `HTTPException`)** ainda respondendo `code: null`. Migração mecânica, PR por arquivo, sem bloqueio. Ordem sugerida (menor risco primeiro): `dashboard.py` → `questions.py` → `flashcards.py` → resto de `profile.py`/`classes.py`/`api.py`/`admin.py`/`cases.py`.
- **4 formatos de erro coexistindo**: esta spec padroniza o formato 1; os formatos 2 (`error`/`details`), 3 (`error`/`message`) e 4 (429 slowapi, em inglês) continuam divergentes. Unificar sob o mesmo envelope é trabalho futuro.
- **429 do slowapi em inglês e sem `code`**: é um erro que o usuário final vê de fato (login com muitas tentativas). Rota de saída: trocar `_rate_limit_exceeded_handler` por handler custom no envelope `{detail, code: "rate_limited"}`.
