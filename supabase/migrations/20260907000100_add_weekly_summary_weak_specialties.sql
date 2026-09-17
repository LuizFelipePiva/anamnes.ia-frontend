ALTER TABLE "public"."weekly_summaries"
    ADD COLUMN IF NOT EXISTS "weak_specialties" jsonb;

COMMENT ON COLUMN "public"."weekly_summaries"."weak_specialties" IS
    'Snapshot estruturado das até 3 especialidades mais fracas da semana; NULL identifica cache legado ainda não backfilled.';
