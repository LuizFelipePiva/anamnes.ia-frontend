from unittest.mock import MagicMock


QUESTION_ID = "00000000-0000-0000-0000-000000000020"
STUDENT_ID = "00000000-0000-0000-0000-000000000001"


def test_erro_de_aluno_cria_flashcard(as_role, monkeypatch):
    from app.routes import questions as route

    monkeypatch.setattr(
        route.questions_service,
        "check_answer",
        lambda *_: {
            "correct": False,
            "correct_answer": "C",
            "explanation": "Explicação",
        },
    )
    ensure = MagicMock(
        return_value={
            "created": True,
            "deck_id": "00000000-0000-0000-0000-000000000010",
            "flashcard_id": "00000000-0000-0000-0000-000000000011",
        }
    )
    monkeypatch.setattr(route.learning_loop_service, "ensure_error_flashcard", ensure)

    response = as_role("student").post(
        f"/api/questions/{QUESTION_ID}/answer",
        json={"answer": "A"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["correct"] is False
    assert body["review_flashcard"]["created"] is True
    ensure.assert_called_once()
    assert ensure.call_args.kwargs == {
        "student_id": STUDENT_ID,
        "question_id": QUESTION_ID,
    }


def test_acerto_nao_cria_flashcard(as_role, monkeypatch):
    from app.routes import questions as route

    monkeypatch.setattr(
        route.questions_service,
        "check_answer",
        lambda *_: {
            "correct": True,
            "correct_answer": "C",
            "explanation": "Explicação",
        },
    )
    ensure = MagicMock()
    monkeypatch.setattr(route.learning_loop_service, "ensure_error_flashcard", ensure)

    response = as_role("student").post(
        f"/api/questions/{QUESTION_ID}/answer",
        json={"answer": "C"},
    )

    assert response.status_code == 200
    assert response.json()["review_flashcard"] is None
    ensure.assert_not_called()


def test_falha_do_flashcard_nao_quebra_correcao(as_role, monkeypatch):
    from app.routes import questions as route

    monkeypatch.setattr(
        route.questions_service,
        "check_answer",
        lambda *_: {
            "correct": False,
            "correct_answer": "C",
            "explanation": "Explicação",
        },
    )
    monkeypatch.setattr(
        route.learning_loop_service,
        "ensure_error_flashcard",
        MagicMock(side_effect=RuntimeError("flashcards indisponíveis")),
    )

    response = as_role("student").post(
        f"/api/questions/{QUESTION_ID}/answer",
        json={"answer": "A"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["correct"] is False
    assert body["correct_answer"] == "C"
    assert body["review_flashcard"] is None


def test_role_nao_student_nao_cria_flashcard(as_role, monkeypatch):
    from app.routes import questions as route

    monkeypatch.setattr(
        route.questions_service,
        "check_answer",
        lambda *_: {
            "correct": False,
            "correct_answer": "C",
            "explanation": "Explicação",
        },
    )
    ensure = MagicMock()
    monkeypatch.setattr(route.learning_loop_service, "ensure_error_flashcard", ensure)

    response = as_role("teacher").post(
        f"/api/questions/{QUESTION_ID}/answer",
        json={"answer": "A"},
    )

    assert response.status_code == 200
    assert response.json()["review_flashcard"] is None
    ensure.assert_not_called()
