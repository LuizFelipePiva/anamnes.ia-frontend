# SPEC-001 — Role-gate docente (`verify_teacher`)

- **Achados que resolve**: #2 (aluno cria turma), #3 (aluno cria/gera caso), #8 (vazamento de PII + notas de outros alunos via cadeia de posse)
- **Fonte**: `docs/PENTEST_LOCAL.md`
- **Status**: ✅ implementado (75 testes verdes, ruff limpo, re-ataque confirmou #2/#3/#8 fechados)

---

## 1. Contexto / Problema

As rotas de criação e gestão docente (casos, turmas, atribuições) exigem apenas `verify_jwt_token` — ou seja, **qualquer usuário autenticado**, incluindo `student`. Como todo cadastro público cria um `student`, um aluno consegue:

- Criar turmas e casos, virando "dono" dessas entidades (`teacher_id`/owner = ele).
- Por ser dono, acessar os endpoints docentes de **leitura** (que checam dono, não role) e **colher PII (nome/email) e notas de outros alunos** (confirmado no pentest: `GET /classes/{id}` → email de quem entra; `GET /cases/{id}/attempts` → `score`/`feedback` de quem faz).

A barreira "cadastro não cria professor" existe só no registro; falta na **camada de rotas**.

## 2. Objetivo

Garantir que **apenas usuários com `role` em (`teacher`, `admin`)** possam criar/gerir entidades docentes (casos, turmas, atribuições, compartilhamentos), mantendo intactas as ações de aluno.

## 3. Não-objetivos

- Não alterar a lógica de **posse** existente (checagens `teacher_id != sub → 403` continuam).
- Não mudar as rotas de **aluno** (join, start attempt, complete, evaluate-soap, abandon, chat).
- Não mexer em RLS/Supabase nem no fluxo de cadastro/login.
- Não introduzir novos papéis nem promoção de papel.

## 4. Requisitos funcionais

- **RF1** — Criar uma dependency `verify_teacher(payload=Depends(verify_jwt_token))` que:
  - retorna o `payload` se `payload["role"] in ("teacher", "admin")`;
  - levanta `HTTPException(403, "Acesso restrito a professores")` caso contrário.
  - Espelha o padrão de `verify_admin` (`routes/admin.py:23`).
- **RF2** — Aplicar `verify_teacher` (substituindo o `Depends(verify_jwt_token)`) **exatamente** nestes endpoints:

  **`routes/cases.py`**
  | Linha | Rota | Ação |
  |---|---|---|
  | 188 | `POST /cases/generate` | gerar caso por IA |
  | 216 | `POST /cases` | criar caso |
  | 456 | `PATCH /cases/{case_id}` | editar caso |
  | 492 | `DELETE /cases/{case_id}` | excluir caso |
  | 513 | `POST /cases/{case_id}/assign` | atribuir caso a turma |
  | 566 | `PATCH /cases/{case_id}/assignments/{id}` | editar atribuição |
  | 603 | `DELETE /cases/{case_id}/assignments/{id}` | remover atribuição |

  **`routes/classes.py`**
  | Linha | Rota | Ação |
  |---|---|---|
  | 53 | `POST /classes` | criar turma |
  | 142 | `PATCH /classes/{class_id}` | editar turma |
  | 207 | `DELETE /classes/{class_id}` | excluir turma |
  | 230 | `DELETE /classes/{class_id}/students/{student_id}` | remover aluno |
  | 338 | `POST /classes/{class_id}/share/{target_teacher_id}` | compartilhar turma |
  | 370 | `DELETE /classes/{class_id}/share/{target_teacher_id}` | descompartilhar |

- **RF3** — **NÃO** aplicar `verify_teacher` a (permanecem em `verify_jwt_token`): `POST /cases/{id}/start`, `POST /cases/ai/start`, `POST /cases/{id}/complete`, `POST /cases/evaluate-soap`, `PATCH /cases/attempts/{id}/abandon`, `POST /classes/{code}/join`.
- **RF4** — `admin` sempre passa em todo endpoint gateado (consistência com `RoleRoute`/`verify_admin`).
- **RF5** (D2 — defesa em profundidade) — aplicar `verify_teacher` também nas **leituras docentes** (confirmado que nenhum aluno as consome — `_check_access` só libera dono/professor compartilhado; aluno vê turmas via `profile.py`):

  | Arquivo | Rota | 
  |---|---|
  | cases.py | `GET /cases` (lista do professor) |
  | cases.py | `GET /cases/{id}` |
  | cases.py | `GET /cases/{id}/attempts` (expõe score/PII) |
  | cases.py | `GET /cases/{id}/attempts/{aid}/messages` |
  | cases.py | `GET /cases/{id}/assignments` |
  | classes.py | `GET /classes` (lista do professor) |
  | classes.py | `GET /classes/{id}` (expõe emails dos alunos) |
  | classes.py | `GET /classes/{id}/teachers` |
  | classes.py | `GET /classes/{id}/institution-teachers` |
  | dashboard.py | **todos** os endpoints (métricas docentes; sem consumidor aluno) |

## 5. Tabela de comportamento (vira teste)

| Endpoint | role=student | role=teacher (dono) | role=teacher (não dono) | role=admin | sem token |
|---|---|---|---|---|---|
| `POST /cases` | **403** | 200/201 | 200/201 | 200/201 | 401 |
| `PATCH /cases/{id}` | **403** | 200 | 403 (posse) | 200 | 401 |
| `DELETE /cases/{id}` | **403** | 200 | 403 (posse) | 200 | 401 |
| `POST /cases/generate` | **403** | 200 | 200 | 200 | 401 |
| `POST /classes` | **403** | 200/201 | 200/201 | 200/201 | 401 |
| `PATCH /classes/{id}` | **403** | 200 | 403 (posse) | 200 | 401 |
| `POST /classes/{code}/join` | **200** (inalterado) | 200 | — | 200 | 401 |
| `POST /cases/{id}/start` | **200** (inalterado) | — | — | 200 | 401 |

> Regra de ordem: o **role-gate (403 por não ser professor)** ocorre **antes** da checagem de posse. Um student sempre recebe 403 por role, nunca chega a testar posse.

## 6. Critérios de aceite

- [x] `verify_teacher` existe e é reutilizável (import único, não duplicado por rota).
- [x] Todos os endpoints da RF2 retornam **403** para `student` e **≠403** para `teacher`/`admin`.
- [x] Nenhum endpoint da RF3 mudou de comportamento para `student`.
- [x] Re-execução do pentest: #2, #3 e #8 deixam de ser reproduzíveis (aluno toma 403 ao criar turma/caso; endpoints de PII/notas ficam inacessíveis a ele).
- [x] `ruff check app/` passa.

> ~~Nota de implementação: `POST /cases/generate` fica **bloqueado** para student, porém retorna **400** (não 403) por um bug pré-existente do slowapi (`@limiter.limit` consome o corpo antes do guard) — atinge todos os papéis.~~
>
> **Resolvido / não reproduzível (verificado em 2026-07-30).** O handler é síncrono e o `@limiter.limit` só lê `request.client`, então o corpo chega íntegro à validação: `teacher` recebe **200** e `student`, **403** de role. Não foi preciso mudar código; o comportamento ficou travado por regressão em `TestGenerateStatusCodes` (`backend/tests/test_spec001_verify_teacher.py`), que quebra se uma volta ao `async def` ou um upgrade de slowapi reintroduzir o bug. Nenhuma SPEC própria é necessária.

## 7. Arquivos afetados

- **Novo**: `app/auth/guards.py` — define `verify_teacher` (decisão D1). Opcional: mover `verify_admin` pra cá depois (fora do escopo desta spec).
- `app/routes/cases.py`, `app/routes/classes.py`, `app/routes/dashboard.py` — trocar a dependency nos endpoints da RF2 e RF5.
- Doc: `backend/app/routes/CLAUDE.md` e `backend/app/auth/CLAUDE.md` (registrar o guard).

## 8. Decisões (resolvidas)

- **D1** ✅ — `verify_teacher` vai em **`app/auth/guards.py`** (novo). `verify_admin` fica onde está por ora.
- **D2** ✅ — **Sim**, gatear as leituras docentes (RF5). Verificado: `_check_access` (classes) e as checagens de `teacher_id` (cases/dashboard) já restringem a dono/professor; alunos usam `profile.py` para ver turmas → gatear não quebra fluxo de aluno.
- **D3** ✅ — Mensagem do 403 padronizada: **"Acesso restrito a professores"**.
