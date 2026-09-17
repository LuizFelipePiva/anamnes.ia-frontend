# Questões erradas → Flashcards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar de forma idempotente um flashcard pessoal no deck automático `Erros — <Especialidade>` quando o aluno erra uma questão, imediatamente em Questões Avulsas e somente após finalizar um Simulado.

**Architecture:** Um novo `learning_loop_service` recebe apenas `student_id` e `question_id`, relê a questão no backend, encontra/cria o deck automático e cria a origem idempotente em `flashcard_sources`. Questões Avulsas chamam esse serviço depois da correção permitida; Simulados chamam apenas no fechamento da tentativa, quando o relatório já pode revelar gabarito. Constraints PostgreSQL protegem concorrência e o efeito secundário nunca quebra a correção/finalização principal.

**Tech Stack:** FastAPI, Pydantic, Supabase/PostgreSQL, pytest, React/TypeScript apenas para tipagem opcional da resposta de Questões Avulsas.

**Spec:** `docs/superpowers/specs/2026-09-07-learning-loop-summary-simulados-flashcards-design.md`

## Global Constraints

- Trabalhar na branch local `Simulados`; não fazer push sem ordem explícita.
- Não usar IA para gerar cards de questão errada.
- O cliente nunca envia conteúdo do flashcard; backend relê `questions_bank` por `question_id`.
- Um único deck técnico `kind=question_errors` por aluno/especialidade.
- A mesma questão para o mesmo aluno gera no máximo um `flashcard_source` e um card ativo por origem.
- Questões Avulsas podem materializar o card imediatamente porque o gabarito já foi revelado pela própria correção.
- Simulados não criam card em `record_answer`; materializam somente após `finish_attempt` completar a tentativa.
- Falha do learning loop deve ser logada e nunca transformar correção/finalização válida em erro HTTP.
- Não apagar card automático quando o aluno acertar a mesma questão no futuro.

---

### Task 1: Criar constraints e metadados de idempotência no banco

**Files:**
- Create: `supabase/migrations/20260907000200_add_question_error_flashcards.sql`
- Create: `backend/tests/test_learning_loop_migration.py`

**Interfaces:**
- Produces: `flashcard_decks.kind`, `flashcard_sources.student_id` e índices únicos parciais usados pelo `learning_loop_service`.

- [ ] **Step 1: Escrever teste estrutural da migration**

Criar `backend/tests/test_learning_loop_migration.py`:

```python
from pathlib import Path

MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "supabase/migrations/20260907000200_add_question_error_flashcards.sql"
)


def test_migration_declara_kind_student_id_e_constraints():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert 'ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT \'manual\'' in sql
    assert 'ADD COLUMN IF NOT EXISTS "student_id" uuid' in sql
    assert 'kind = \'question_errors\'' in sql
    assert '("student_id", "specialty", "kind")' in sql
    assert '("student_id", "source_type", "source_id")' in sql
```

- [ ] **Step 2: Executar e confirmar RED**

```bash
cd backend
python -m pytest tests/test_learning_loop_migration.py -q
```

Expected: falha porque a migration ainda não existe.

- [ ] **Step 3: Criar migration**

Criar `supabase/migrations/20260907000200_add_question_error_flashcards.sql`:

```sql
ALTER TABLE "public"."flashcard_decks"
    ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'manual';

ALTER TABLE "public"."flashcard_sources"
    ADD COLUMN IF NOT EXISTS "student_id" uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'flashcard_sources_student_id_fkey'
    ) THEN
        ALTER TABLE "public"."flashcard_sources"
            ADD CONSTRAINT "flashcard_sources_student_id_fkey"
            FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_flashcard_decks_question_errors_student_specialty"
    ON "public"."flashcard_decks" ("student_id", "specialty", "kind")
    WHERE "student_id" IS NOT NULL AND "kind" = 'question_errors';

CREATE UNIQUE INDEX IF NOT EXISTS "uq_flashcard_sources_student_origin"
    ON "public"."flashcard_sources" ("student_id", "source_type", "source_id")
    WHERE "student_id" IS NOT NULL AND "source_id" IS NOT NULL;
```

- [ ] **Step 4: Executar teste e commit local**

```bash
cd backend
python -m pytest tests/test_learning_loop_migration.py -q
cd ..
git add supabase/migrations/20260907000200_add_question_error_flashcards.sql \
        backend/tests/test_learning_loop_migration.py
git commit -m "feat: add idempotency constraints for error flashcards"
```

---

### Task 2: Implementar `learning_loop_service.ensure_error_flashcard`

**Files:**
- Create: `backend/app/services/learning_loop_service.py`
- Create: `backend/tests/test_learning_loop_service.py`

**Interfaces:**
- Consumes: `student_id: str`, `question_id: str` e cliente Supabase injetado.
- Produces: `ensure_error_flashcard(sb, *, student_id, question_id) -> {created, deck_id, flashcard_id}`.

- [ ] **Step 1: Escrever testes do serviço**

Criar `backend/tests/test_learning_loop_service.py` com fake Supabase determinístico e os casos abaixo:

```python
def test_primeiro_erro_cria_deck_card_e_source():
    result = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q1")
    assert result["created"] is True
    assert inserted_deck["name"] == "Erros — Cardiologia"
    assert inserted_deck["specialty"] == "Cardiologia"
    assert inserted_deck["kind"] == "question_errors"
    assert inserted_card["difficulty"] == "medium"
    assert inserted_card["tags"] == ["questao-errada", "Arritmias"]
    assert "A)" in inserted_card["front"]
    assert "Resposta correta: C)" in inserted_card["back"]
    assert inserted_source == {
        "flashcard_id": result["flashcard_id"],
        "student_id": "student-1",
        "source_type": "question_error",
        "source_id": "q1",
        "source_meta": {"specialty": "Cardiologia", "subspecialty": "Arritmias"},
    }


def test_mesma_questao_reutiliza_origem_sem_novo_card():
    first = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q1")
    second = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q1")
    assert first["flashcard_id"] == second["flashcard_id"]
    assert second["created"] is False
    assert number_of_flashcard_inserts == 1


def test_questao_diferente_mesma_specialty_reutiliza_deck():
    first = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q1")
    second = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q2")
    assert first["deck_id"] == second["deck_id"]
    assert number_of_deck_inserts == 1


def test_specialty_diferente_cria_outro_deck():
    first = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q-cardio")
    second = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q-neuro")
    assert first["deck_id"] != second["deck_id"]
    assert number_of_deck_inserts == 2


def test_specialty_vazia_usa_geral():
    result = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q-geral")
    assert deck_by_id[result["deck_id"]]["specialty"] == "Geral"
    assert deck_by_id[result["deck_id"]]["name"] == "Erros — Geral"
```

O fake de teste deve seguir esta interface concreta:

```python
class FakeResult:
    def __init__(self, data=None):
        self.data = data or []


class FakeQuery:
    def __init__(self, db, table):
        self.db = db
        self.table_name = table
        self.filters = []
        self.pending_insert = None
        self.pending_delete = False

    def select(self, *_args, **_kwargs): return self
    def limit(self, *_args): return self
    def eq(self, field, value):
        self.filters.append((field, value))
        return self
    def insert(self, row):
        self.pending_insert = row
        return self
    def delete(self):
        self.pending_delete = True
        return self

    def execute(self):
        rows = self.db[self.table_name]
        matched = [
            row for row in rows
            if all(row.get(field) == value for field, value in self.filters)
        ]
        if self.pending_insert is not None:
            row = {"id": self.db.next_id(self.table_name), **self.pending_insert}
            rows.append(row)
            self.db.inserts.append((self.table_name, row))
            return FakeResult([row])
        if self.pending_delete:
            ids = {row["id"] for row in matched}
            self.db[self.table_name] = [row for row in rows if row.get("id") not in ids]
            return FakeResult(matched)
        return FakeResult(matched)


class FakeSupabase(dict):
    def __init__(self, **tables):
        super().__init__({
            "questions_bank": [],
            "flashcard_decks": [],
            "flashcards": [],
            "flashcard_sources": [],
            **tables,
        })
        self.inserts = []
        self._seq = 0

    def next_id(self, prefix):
        self._seq += 1
        return f"{prefix}-{self._seq}"

    def table(self, name):
        return FakeQuery(self, name)
```

Nos testes, derivar `number_of_deck_inserts` e `number_of_flashcard_inserts` de `sb.inserts` em vez de variáveis globais.

- [ ] **Step 1b: Escrever testes das duas corridas protegidas por constraint**

Adicionar dois casos em que o fake lança uma exceção somente no primeiro `insert` correspondente e já disponibiliza a linha criada pela corrida concorrente:

```python
def test_corrida_de_deck_reconsulta_deck_vencedor():
    sb.fail_next_deck_insert_with_existing({
        "id": "deck-race",
        "student_id": "student-1",
        "specialty": "Cardiologia",
        "kind": "question_errors",
    })
    result = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q1")
    assert result["deck_id"] == "deck-race"


def test_corrida_de_source_remove_card_perdedor_e_reutiliza_origem():
    sb.fail_next_source_insert_with_existing(
        source={
            "id": "src-race",
            "student_id": "student-1",
            "source_type": "question_error",
            "source_id": "q1",
            "flashcard_id": "card-winner",
        },
        card={"id": "card-winner", "deck_id": "deck-1"},
    )
    result = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q1")
    assert result == {"created": False, "deck_id": "deck-1", "flashcard_id": "card-winner"}
    assert [card["id"] for card in sb["flashcards"]] == ["card-winner"]
```

Implementar `fail_next_deck_insert_with_existing` e `fail_next_source_insert_with_existing` no fake como flags de uma única execução; `FakeQuery.execute()` deve inserir a linha concorrente no store, limpar a flag e então levantar `RuntimeError("unique violation")`.

- [ ] **Step 2: Executar e confirmar RED**

```bash
cd backend
python -m pytest tests/test_learning_loop_service.py -q
```

Expected: erro de import porque `learning_loop_service.py` ainda não existe.

- [ ] **Step 3: Implementar helpers privados**

Criar `backend/app/services/learning_loop_service.py` com:

```python
QUESTION_SOURCE_TYPE = "question_error"
ERROR_DECK_KIND = "question_errors"


def _normalize_specialty(value: str | None) -> str:
    normalized = (value or "").strip()
    return normalized or "Geral"


def _format_front(question: dict) -> str:
    lines = [question["statement"].strip(), ""]
    for key, text in (question.get("options") or {}).items():
        lines.append(f"{key}) {text}")
    return "\n".join(lines).strip()


def _format_back(question: dict) -> str:
    correct_key = question["correct_answer"].strip().upper()
    correct_text = (question.get("options") or {}).get(correct_key, "")
    back = f"Resposta correta: {correct_key}) {correct_text}".rstrip()
    explanation = (question.get("explanation") or "").strip()
    if explanation:
        back += f"\n\n{explanation}"
    return back
```

- [ ] **Step 4: Implementar busca de origem e get-or-create de deck**

Adicionar:

```python
def _find_existing_source(sb, student_id: str, question_id: str) -> dict | None:
    rows = (
        sb.table("flashcard_sources")
        .select("flashcard_id")
        .eq("student_id", student_id)
        .eq("source_type", QUESTION_SOURCE_TYPE)
        .eq("source_id", question_id)
        .limit(1)
        .execute()
    ).data or []
    if not rows:
        return None
    card_rows = (
        sb.table("flashcards")
        .select("id, deck_id")
        .eq("id", rows[0]["flashcard_id"])
        .limit(1)
        .execute()
    ).data or []
    return card_rows[0] if card_rows else None


def _get_or_create_error_deck(sb, student_id: str, specialty: str) -> dict:
    def find():
        rows = (
            sb.table("flashcard_decks")
            .select("id")
            .eq("student_id", student_id)
            .eq("specialty", specialty)
            .eq("kind", ERROR_DECK_KIND)
            .limit(1)
            .execute()
        ).data or []
        return rows[0] if rows else None

    existing = find()
    if existing:
        return existing

    try:
        rows = sb.table("flashcard_decks").insert({
            "student_id": student_id,
            "name": f"Erros — {specialty}",
            "description": "Revisão automática de questões respondidas incorretamente.",
            "specialty": specialty,
            "kind": ERROR_DECK_KIND,
        }).execute().data or []
        return rows[0]
    except Exception:
        raced = find()
        if raced:
            return raced
        raise
```

- [ ] **Step 5: Implementar `ensure_error_flashcard` com limpeza em corrida de source**

```python
def ensure_error_flashcard(sb, *, student_id: str, question_id: str) -> dict:
    existing = _find_existing_source(sb, student_id, question_id)
    if existing:
        return {
            "created": False,
            "deck_id": existing["deck_id"],
            "flashcard_id": existing["id"],
        }

    question_rows = (
        sb.table("questions_bank")
        .select("id, statement, options, correct_answer, explanation, specialty, subspecialty")
        .eq("id", question_id)
        .limit(1)
        .execute()
    ).data or []
    if not question_rows:
        raise LookupError("Questão não encontrada")

    question = question_rows[0]
    specialty = _normalize_specialty(question.get("specialty"))
    deck = _get_or_create_error_deck(sb, student_id, specialty)
    tags = ["questao-errada"]
    subspecialty = (question.get("subspecialty") or "").strip()
    if subspecialty:
        tags.append(subspecialty)

    card = (sb.table("flashcards").insert({
        "deck_id": deck["id"],
        "created_by": student_id,
        "front": _format_front(question),
        "back": _format_back(question),
        "hint": None,
        "tags": tags,
        "specialty": specialty,
        "difficulty": "medium",
        "ai_generated": False,
        "status": "active",
    }).execute().data or [])[0]

    source_row = {
        "flashcard_id": card["id"],
        "student_id": student_id,
        "source_type": QUESTION_SOURCE_TYPE,
        "source_id": question_id,
        "source_meta": {
            "specialty": specialty,
            "subspecialty": subspecialty or None,
        },
    }
    try:
        sb.table("flashcard_sources").insert(source_row).execute()
    except Exception:
        sb.table("flashcards").delete().eq("id", card["id"]).execute()
        raced = _find_existing_source(sb, student_id, question_id)
        if raced:
            return {
                "created": False,
                "deck_id": raced["deck_id"],
                "flashcard_id": raced["id"],
            }
        raise

    return {"created": True, "deck_id": deck["id"], "flashcard_id": card["id"]}
```

- [ ] **Step 6: Rodar testes e commit local**

```bash
cd backend
python -m pytest tests/test_learning_loop_service.py -q
cd ..
git add backend/app/services/learning_loop_service.py backend/tests/test_learning_loop_service.py
git commit -m "feat: create idempotent error flashcards"
```

---

### Task 3: Integrar Questões Avulsas ao learning loop

**Files:**
- Modify: `backend/app/models/schemas.py`
- Modify: `backend/app/routes/questions.py`
- Create: `backend/tests/test_question_error_flashcards.py`
- Modify: `frontend/anamnes-ia/src/features/questoes/types/question.ts`

**Interfaces:**
- Consumes: `questions_service.check_answer` e `learning_loop_service.ensure_error_flashcard`.
- Produces: `QuestionAnswerResponse.review_flashcard` opcional sem quebrar campos existentes.

- [ ] **Step 1: Escrever testes da rota**

Criar `backend/tests/test_question_error_flashcards.py` com mocks de `check_answer` e `ensure_error_flashcard`:

```python
def test_erro_de_aluno_cria_flashcard(as_role, monkeypatch):
    from app.routes import questions as route

    monkeypatch.setattr(route.questions_service, "check_answer", lambda *_: {
        "correct": False,
        "correct_answer": "C",
        "explanation": "Explicação",
    })
    ensure = MagicMock(return_value={
        "created": True,
        "deck_id": "00000000-0000-0000-0000-000000000010",
        "flashcard_id": "00000000-0000-0000-0000-000000000011",
    })
    monkeypatch.setattr(route.learning_loop_service, "ensure_error_flashcard", ensure)

    response = as_role("student").post(
        "/api/questions/00000000-0000-0000-0000-000000000020/answer",
        json={"answer": "A"},
    )

    assert response.status_code == 200
    assert response.json()["review_flashcard"]["created"] is True
    ensure.assert_called_once()


def test_acerto_nao_cria_flashcard(as_role, monkeypatch):
    from app.routes import questions as route
    monkeypatch.setattr(route.questions_service, "check_answer", lambda *_: {
        "correct": True,
        "correct_answer": "C",
        "explanation": None,
    })
    ensure = MagicMock()
    monkeypatch.setattr(route.learning_loop_service, "ensure_error_flashcard", ensure)

    response = as_role("student").post(
        "/api/questions/00000000-0000-0000-0000-000000000020/answer",
        json={"answer": "C"},
    )

    assert response.status_code == 200
    assert response.json()["review_flashcard"] is None
    ensure.assert_not_called()


def test_falha_do_flashcard_nao_quebra_correcao(as_role, monkeypatch):
    from app.routes import questions as route
    monkeypatch.setattr(route.questions_service, "check_answer", lambda *_: {
        "correct": False,
        "correct_answer": "C",
        "explanation": "Explicação",
    })
    monkeypatch.setattr(
        route.learning_loop_service,
        "ensure_error_flashcard",
        MagicMock(side_effect=RuntimeError("flashcards indisponíveis")),
    )

    response = as_role("student").post(
        "/api/questions/00000000-0000-0000-0000-000000000020/answer",
        json={"answer": "A"},
    )

    assert response.status_code == 200
    assert response.json()["correct"] is False
    assert response.json()["correct_answer"] == "C"
    assert response.json()["review_flashcard"] is None
```

- [ ] **Step 2: Executar e confirmar RED**

```bash
cd backend
python -m pytest tests/test_question_error_flashcards.py -q
```

Expected: falha porque a rota não importa/chama `learning_loop_service` e schema não tem `review_flashcard`.

- [ ] **Step 3: Estender schema compatível**

Em `backend/app/models/schemas.py`:

```python
class ReviewFlashcardResult(BaseModel):
    created: bool
    deck_id: str
    flashcard_id: str


class QuestionAnswerResponse(BaseModel):
    correct: bool
    correct_answer: str
    explanation: str | None = None
    review_flashcard: ReviewFlashcardResult | None = None
```

- [ ] **Step 4: Integrar efeito secundário na rota**

Em `backend/app/routes/questions.py`, importar `logger` e `learning_loop_service`, trocar `_user` por `user` e usar:

```python
result = questions_service.check_answer(sb, question_id, body.answer)
result["review_flashcard"] = None

if result["correct"] is False and user.get("role", "student") == "student":
    try:
        result["review_flashcard"] = learning_loop_service.ensure_error_flashcard(
            sb,
            student_id=user["sub"],
            question_id=question_id,
        )
    except Exception as e:
        logger.warning(f"[LearningLoop] Falha ao criar flashcard de {question_id}: {e}")

return result
```

Manter o `except ValueError` existente para questão inexistente.

- [ ] **Step 5: Atualizar type frontend sem mudar UX**

Em `frontend/anamnes-ia/src/features/questoes/types/question.ts`:

```ts
export interface ReviewFlashcardResult {
  created: boolean;
  deck_id: string;
  flashcard_id: string;
}

export interface QuestionAnswerResult {
  correct: boolean;
  correct_answer: string;
  explanation: string | null;
  review_flashcard?: ReviewFlashcardResult | null;
}
```

Nenhuma UI nova é necessária nesta entrega; a criação automática já aparece no módulo de Flashcards.

- [ ] **Step 6: Executar testes e commit local**

```bash
cd backend
python -m pytest tests/test_question_error_flashcards.py tests/test_learning_loop_service.py -q
cd ../frontend/anamnes-ia
npx tsc -b --noEmit
cd ../..
git add backend/app/models/schemas.py backend/app/routes/questions.py \
        backend/tests/test_question_error_flashcards.py \
        frontend/anamnes-ia/src/features/questoes/types/question.ts
git commit -m "feat: create review flashcards from wrong answers"
```

---

### Task 4: Materializar flashcards somente ao finalizar Simulados

**Files:**
- Modify: `backend/app/services/simulado_service.py`
- Create: `backend/tests/test_simulado_error_flashcards.py`

**Interfaces:**
- Consumes: respostas finais em `simulado_answers` e `learning_loop_service.ensure_error_flashcard`.
- Produces: cards para respostas finais erradas apenas após transição para `completed`.

- [ ] **Step 1: Escrever teste de segurança de `record_answer`**

Em `backend/tests/test_simulado_error_flashcards.py`, mockar `learning_loop_service.ensure_error_flashcard` e executar `record_answer` com uma resposta errada. Afirmar:

```python
assert result == {"recorded": True}
ensure.assert_not_called()
```

O fake Supabase deve fornecer tentativa `in_progress`, gabarito e membership da questão.

- [ ] **Step 2: Escrever testes de `finish_attempt`**

Adicionar casos:

```python
def test_finish_cria_cards_apenas_para_respostas_finais_erradas(monkeypatch):
    ensure = MagicMock(return_value={"created": True, "deck_id": "d", "flashcard_id": "f"})
    monkeypatch.setattr(simulado_service.learning_loop_service, "ensure_error_flashcard", ensure)

    report = simulado_service.finish_attempt(sb, "sim1", "att1", "student-1")

    ensure.assert_called_once_with(sb, student_id="student-1", question_id="q-errada")
    assert report["status"] == "completed"


def test_finish_nao_cria_card_para_resposta_final_correta(monkeypatch):
    ensure = MagicMock()
    monkeypatch.setattr(simulado_service.learning_loop_service, "ensure_error_flashcard", ensure)

    simulado_service.finish_attempt(sb_com_todas_corretas, "sim1", "att1", "student-1")

    ensure.assert_not_called()


def test_falha_de_flashcard_nao_impede_finalizacao(monkeypatch):
    monkeypatch.setattr(
        simulado_service.learning_loop_service,
        "ensure_error_flashcard",
        MagicMock(side_effect=RuntimeError("fora")),
    )

    report = simulado_service.finish_attempt(sb, "sim1", "att1", "student-1")

    assert report["status"] == "completed"
```

Adicionar também um caso de tentativa já `completed`; a segunda chamada deve retornar relatório e não duplicar efeitos. A deduplicação do serviço continua sendo a barreira final.

- [ ] **Step 3: Executar e confirmar RED**

```bash
cd backend
python -m pytest tests/test_simulado_error_flashcards.py -q
```

Expected: testes de `finish_attempt` falham porque nenhum learning loop é chamado; teste de `record_answer` deve permanecer verde e documenta a barreira de segurança.

- [ ] **Step 4: Implementar materialização pós-completion**

Em `backend/app/services/simulado_service.py`, importar:

```python
from app.config import logger
from app.services import learning_loop_service
```

Depois do `update` que muda `simulado_attempts.status` para `completed`, antes de `return get_report(...)`, buscar somente respostas finais erradas:

```python
wrong_rows = (
    sb.table("simulado_answers")
    .select("question_id")
    .eq("attempt_id", attempt_id)
    .eq("is_correct", False)
    .execute()
).data or []

for row in wrong_rows:
    try:
        learning_loop_service.ensure_error_flashcard(
            sb,
            student_id=student_id,
            question_id=row["question_id"],
        )
    except Exception as e:
        logger.warning(
            f"[LearningLoop] Falha ao criar flashcard do simulado {simulado_id} "
            f"questão {row['question_id']}: {e}"
        )
```

Não adicionar nenhuma chamada em `record_answer`.

No caminho `att["status"] == "completed"`, manter o retorno idempotente atual sem executar loop novamente. Isso evita efeitos desnecessários; cards faltantes por uma falha anterior não serão recuperados numa segunda chamada de finish, decisão alinhada ao caráter não-bloqueante do efeito secundário.

- [ ] **Step 5: Executar testes e commit local**

```bash
cd backend
python -m pytest tests/test_simulado_error_flashcards.py tests/test_learning_loop_service.py -q
cd ..
git add backend/app/services/simulado_service.py backend/tests/test_simulado_error_flashcards.py
git commit -m "feat: materialize wrong-answer flashcards after simulados"
```

---

### Task 5: Verificar o ciclo Questões → Flashcards fim a fim no backend

**Files:**
- No production files expected unless verification exposes a regression.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: evidência de que segurança, idempotência e compatibilidade permanecem válidas.

- [ ] **Step 1: Rodar toda a bateria nova**

```bash
cd backend
python -m pytest \
  tests/test_learning_loop_migration.py \
  tests/test_learning_loop_service.py \
  tests/test_question_error_flashcards.py \
  tests/test_simulado_error_flashcards.py \
  -q
```

Expected: 0 failures.

- [ ] **Step 2: Rodar regressões existentes de questões/resumo/segurança**

```bash
python -m pytest \
  tests/test_spec013_weekly_summary.py \
  tests/test_spec014_exam_assets.py \
  tests/test_spec010_i18n_error_codes.py \
  -q
```

Expected: 0 failures.

- [ ] **Step 3: Rodar verificação sintática e frontend types**

```bash
python -m compileall -q app
cd ../frontend/anamnes-ia
npx tsc -b --noEmit
cd ../..
git diff --check
```

Expected: todos os comandos retornam código 0.

- [ ] **Step 4: Revisar invariantes de segurança por busca**

```bash
rg -n "ensure_error_flashcard" backend/app/routes/questions.py backend/app/services/simulado_service.py
rg -n "ensure_error_flashcard" backend/app/services/simulado_service.py -C 8
```

Confirmar manualmente que:

- existe chamada após correção em Questões Avulsas;
- não existe chamada dentro de `record_answer`;
- existe chamada em `finish_attempt` somente depois de marcar a tentativa como `completed`.

- [ ] **Step 5: Registrar checkpoint local**

```bash
git status --short --branch
git log --oneline -6
```

Expected: branch `Simulados`, commits das Tasks 1–4 presentes e nenhuma alteração de produção não rastreada.
