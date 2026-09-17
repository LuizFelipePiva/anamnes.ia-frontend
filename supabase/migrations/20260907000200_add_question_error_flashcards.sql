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
    WHERE "student_id" IS NOT NULL AND kind = 'question_errors';

CREATE UNIQUE INDEX IF NOT EXISTS "uq_flashcard_sources_student_origin"
    ON "public"."flashcard_sources" ("student_id", "source_type", "source_id")
    WHERE "student_id" IS NOT NULL AND "source_id" IS NOT NULL;
