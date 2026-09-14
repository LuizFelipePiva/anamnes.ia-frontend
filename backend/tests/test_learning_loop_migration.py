from pathlib import Path

MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "supabase/migrations/20260907000200_add_question_error_flashcards.sql"
)


def test_migration_declara_kind_student_id_e_constraints():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert 'ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT \'manual\'' in sql
    assert 'ADD COLUMN IF NOT EXISTS "student_id" uuid' in sql
    assert "kind = 'question_errors'" in sql
    assert '("student_id", "specialty", "kind")' in sql
    assert '("student_id", "source_type", "source_id")' in sql
