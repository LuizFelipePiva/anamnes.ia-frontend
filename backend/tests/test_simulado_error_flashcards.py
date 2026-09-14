from __future__ import annotations

from unittest.mock import MagicMock

from app.services import simulado_service


class FakeResult:
    def __init__(self, data=None, count=None):
        self.data = data or []
        self.count = count


class FakeQuery:
    def __init__(self, db, table):
        self.db = db
        self.table_name = table
        self.filters = []
        self.pending_insert = None
        self.pending_update = None
        self.count_requested = False

    def select(self, *_args, **kwargs):
        self.count_requested = kwargs.get("count") == "exact"
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def limit(self, *_args):
        return self

    def insert(self, row):
        self.pending_insert = row
        return self

    def update(self, row):
        self.pending_update = row
        return self

    def execute(self):
        rows = self.db[self.table_name]
        matched = [
            row
            for row in rows
            if all(row.get(field) == value for field, value in self.filters)
        ]

        if self.pending_insert is not None:
            row = {"id": self.db.next_id(self.table_name), **self.pending_insert}
            rows.append(row)
            return FakeResult([row])

        if self.pending_update is not None:
            for row in matched:
                row.update(self.pending_update)
            return FakeResult(matched)

        return FakeResult(matched, count=len(matched) if self.count_requested else None)


class FakeSupabase(dict):
    def __init__(self, **tables):
        super().__init__(
            {
                "simulado_attempts": [],
                "simulado_answers": [],
                "simulado_questions": [],
                "questions_bank": [],
                **tables,
            }
        )
        self._seq = 0

    def next_id(self, prefix):
        self._seq += 1
        return f"{prefix}-{self._seq}"

    def table(self, name):
        return FakeQuery(self, name)


def _base_sb(*, answers=None, attempt_status="in_progress"):
    return FakeSupabase(
        simulado_attempts=[
            {
                "id": "att1",
                "simulado_id": "sim1",
                "student_id": "student-1",
                "status": attempt_status,
            }
        ],
        simulado_questions=[
            {"simulado_id": "sim1", "question_id": "q-correta"},
            {"simulado_id": "sim1", "question_id": "q-errada"},
        ],
        questions_bank=[
            {"id": "q-correta", "correct_answer": "A"},
            {"id": "q-errada", "correct_answer": "C"},
        ],
        simulado_answers=answers or [],
    )


def test_record_answer_errada_nao_cria_flashcard(monkeypatch):
    sb = _base_sb()
    ensure = MagicMock()
    monkeypatch.setattr(simulado_service.learning_loop_service, "ensure_error_flashcard", ensure)

    result = simulado_service.record_answer(
        sb,
        "sim1",
        "att1",
        "student-1",
        "q-errada",
        "A",
    )

    assert result == {"recorded": True}
    ensure.assert_not_called()


def test_finish_cria_cards_apenas_para_respostas_finais_erradas(monkeypatch):
    sb = _base_sb(
        answers=[
            {"attempt_id": "att1", "question_id": "q-correta", "is_correct": True},
            {"attempt_id": "att1", "question_id": "q-errada", "is_correct": False},
        ]
    )
    ensure = MagicMock(return_value={"created": True, "deck_id": "d", "flashcard_id": "f"})
    monkeypatch.setattr(simulado_service.learning_loop_service, "ensure_error_flashcard", ensure)
    monkeypatch.setattr(
        simulado_service,
        "get_report",
        lambda *_args: {"status": "completed"},
    )

    report = simulado_service.finish_attempt(sb, "sim1", "att1", "student-1")

    ensure.assert_called_once_with(sb, student_id="student-1", question_id="q-errada")
    assert report["status"] == "completed"
    assert sb["simulado_attempts"][0]["status"] == "completed"


def test_finish_nao_cria_card_para_resposta_final_correta(monkeypatch):
    sb = _base_sb(
        answers=[
            {"attempt_id": "att1", "question_id": "q-correta", "is_correct": True},
        ]
    )
    ensure = MagicMock()
    monkeypatch.setattr(simulado_service.learning_loop_service, "ensure_error_flashcard", ensure)
    monkeypatch.setattr(
        simulado_service,
        "get_report",
        lambda *_args: {"status": "completed"},
    )

    simulado_service.finish_attempt(sb, "sim1", "att1", "student-1")

    ensure.assert_not_called()


def test_falha_de_flashcard_nao_impede_finalizacao(monkeypatch):
    sb = _base_sb(
        answers=[
            {"attempt_id": "att1", "question_id": "q-errada", "is_correct": False},
        ]
    )
    monkeypatch.setattr(
        simulado_service.learning_loop_service,
        "ensure_error_flashcard",
        MagicMock(side_effect=RuntimeError("fora")),
    )
    monkeypatch.setattr(
        simulado_service,
        "get_report",
        lambda *_args: {"status": "completed"},
    )

    report = simulado_service.finish_attempt(sb, "sim1", "att1", "student-1")

    assert report["status"] == "completed"
    assert sb["simulado_attempts"][0]["status"] == "completed"


def test_finish_completed_nao_duplica_flashcards(monkeypatch):
    sb = _base_sb(
        answers=[
            {"attempt_id": "att1", "question_id": "q-errada", "is_correct": False},
        ],
        attempt_status="completed",
    )
    ensure = MagicMock()
    monkeypatch.setattr(simulado_service.learning_loop_service, "ensure_error_flashcard", ensure)
    monkeypatch.setattr(
        simulado_service,
        "get_report",
        lambda *_args: {"status": "completed"},
    )

    report = simulado_service.finish_attempt(sb, "sim1", "att1", "student-1")

    assert report["status"] == "completed"
    ensure.assert_not_called()
