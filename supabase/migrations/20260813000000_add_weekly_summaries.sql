CREATE TABLE IF NOT EXISTS "public"."weekly_summaries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "iso_year" integer NOT NULL,
    "iso_week" integer NOT NULL CHECK ("iso_week" BETWEEN 1 AND 53),
    "summary" text NOT NULL,
    "language" text NOT NULL DEFAULT 'pt-BR',
    "created_at" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("student_id", "iso_year", "iso_week")
);

ALTER TABLE "public"."weekly_summaries" ENABLE ROW LEVEL SECURITY;
-- O backend autentica o aluno e acessa o cache com service_role.
GRANT ALL ON "public"."weekly_summaries" TO service_role;
REVOKE ALL ON "public"."weekly_summaries" FROM anon, authenticated;
