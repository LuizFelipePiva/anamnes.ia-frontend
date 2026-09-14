from __future__ import annotations

from app.services import learning_loop_service as svc


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

    def select(self, *_args, **_kwargs):
        return self

    def limit(self, *_args):
        return self

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
            row
            for row in rows
            if all(row.get(field) == value for field, value in self.filters)
        ]

        if self.pending_insert is not None:
            if self.table_name == "flashcard_decks" and self.db._deck_race is not None:
                concurrent = self.db._deck_race
                self.db._deck_race = None
                rows.append(concurrent)
                raise RuntimeError("unique violation")

            if self.table_name == "flashcard_sources" and self.db._source_race is not None:
                source, card = self.db._source_race
                self.db._source_race = None
                if not any(item.get("id") == card["id"] for item in self.db["flashcards"]):
                    self.db["flashcards"].append(card)
                rows.append(source)
                raise RuntimeError("unique violation")

            row = {"id": self.db.next_id(self.table_name), **self.pending_insert}
            rows.append(row)
            self.db.inserts.append((self.table_name, row))
            return FakeResult([row])

        if self.pending_delete:
            ids = {row["id"] for row in matched}
            self.db[self.table_name] = [
                row for row in rows if row.get("id") not in ids
            ]
            return FakeResult(matched)

        return FakeResult(matched)


class FakeSupabase(dict):
    def __init__(self, **tables):
        super().__init__(
            {
                "questions_bank": [],
                "flashcard_decks": [],
                "flashcards": [],
                "flashcard_sources": [],
                **tables,
            }
        )
        self.inserts = []
        self._seq = 0
        self._deck_race = None
        self._source_race = None

    def next_id(self, prefix):
        self._seq += 1
        return f"{prefix}-{self._seq}"

    def table(self, name):
        return FakeQuery(self, name)

    def fail_next_deck_insert_with_existing(self, deck):
        self._deck_race = deck

    def fail_next_source_insert_with_existing(self, *, source, card):
        self._source_race = (source, card)


def _question(
    question_id: str,
    specialty: str | None = "Cardiologia",
    subspecialty: str | None = "Arritmias",
):
    return {
        "id": question_id,
        "statement": "Paciente com palpitações. Qual a melhor conduta?",
        "options": {
            "A": "Observar",
            "B": "Solicitar radiografia",
            "C": "Realizar ECG",
            "D": "Prescrever antibiótico",
        },
        "correct_answer": "C",
        "explanation": "O ECG é o exame inicial para avaliação do ritmo cardíaco.",
        "specialty": specialty,
        "subspecialty": subspecialty,
    }


def _insert_count(sb, table):
    return sum(1 for table_name, _row in sb.inserts if table_name == table)


def test_primeiro_erro_cria_deck_card_e_source():
    sb = FakeSupabase(questions_bank=[_question("q1")])

    result = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q1")

    assert result["created"] is True
    inserted_deck = next(row for table, row in sb.inserts if table == "flashcard_decks")
    inserted_card = next(row for table, row in sb.inserts if table == "flashcards")
    inserted_source = next(row for table, row in sb.inserts if table == "flashcard_sources")

    assert inserted_deck["name"] == "Erros — Cardiologia"
    assert inserted_deck["specialty"] == "Cardiologia"
    assert inserted_deck["kind"] == "question_errors"
    assert inserted_card["difficulty"] == "medium"
    assert inserted_card["tags"] == ["questao-errada", "Arritmias"]
    assert "A) Observar" in inserted_card["front"]
    assert "Resposta correta: C) Realizar ECG" in inserted_card["back"]
    assert inserted_source == {
        "id": inserted_source["id"],
        "flashcard_id": result["flashcard_id"],
        "student_id": "student-1",
        "source_type": "question_error",
        "source_id": "q1",
        "source_meta": {"specialty": "Cardiologia", "subspecialty": "Arritmias"},
    }


def test_mesma_questao_reutiliza_origem_sem_novo_card():
    sb = FakeSupabase(questions_bank=[_question("q1")])

    first = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q1")
    second = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q1")

    assert first["flashcard_id"] == second["flashcard_id"]
    assert second["created"] is False
    assert _insert_count(sb, "flashcards") == 1


def test_questao_diferente_mesma_specialty_reutiliza_deck():
    sb = FakeSupabase(questions_bank=[_question("q1"), _question("q2")])

    first = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q1")
    second = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q2")

    assert first["deck_id"] == second["deck_id"]
    assert _insert_count(sb, "flashcard_decks") == 1


def test_specialty_diferente_cria_outro_deck():
    sb = FakeSupabase(
        questions_bank=[
            _question("q-cardio", specialty="Cardiologia"),
            _question("q-neuro", specialty="Neurologia", subspecialty="AVC"),
        ]
    )

    first = svc.ensure_error_flashcard(
        sb, student_id="student-1", question_id="q-cardio"
    )
    second = svc.ensure_error_flashcard(
        sb, student_id="student-1", question_id="q-neuro"
    )

    assert first["deck_id"] != second["deck_id"]
    assert _insert_count(sb, "flashcard_decks") == 2


def test_specialty_vazia_usa_geral():
    sb = FakeSupabase(questions_bank=[_question("q-geral", specialty="", subspecialty=None)])

    result = svc.ensure_error_flashcard(
        sb, student_id="student-1", question_id="q-geral"
    )

    deck_by_id = {row["id"]: row for row in sb["flashcard_decks"]}
    assert deck_by_id[result["deck_id"]]["specialty"] == "Geral"
    assert deck_by_id[result["deck_id"]]["name"] == "Erros — Geral"


def test_corrida_de_deck_reconsulta_deck_vencedor():
    sb = FakeSupabase(questions_bank=[_question("q1")])
    sb.fail_next_deck_insert_with_existing(
        {
            "id": "deck-race",
            "student_id": "student-1",
            "specialty": "Cardiologia",
            "kind": "question_errors",
        }
    )

    result = svc.ensure_error_flashcard(sb, student_id="student-1", question_id="q1")

    assert result["deck_id"] == "deck-race"


def test_corrida_de_source_remove_card_perdedor_e_reutiliza_origem():
    sb = FakeSupabase(
        questions_bank=[_question("q1")],
        flashcard_decks=[
            {
                "id": "deck-1",
                "student_id": "student-1",
                "specialty": "Cardiologia",
                "kind": "question_errors",
            }
        ],
    )
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

    assert result == {
        "created": False,
        "deck_id": "deck-1",
        "flashcard_id": "card-winner",
    }
    assert [card["id"] for card in sb["flashcards"]] == ["card-winner"]
