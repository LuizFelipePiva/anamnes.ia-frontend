-- 20260803000000_add_banca_tema_to_questions.sql
-- Sincroniza colunas banca, tema, subtema na questions_bank.
-- Colunas já podem existir no Supabase (criadas via dashboard);
-- IF NOT EXISTS garante idempotência.

ALTER TABLE "public"."questions_bank"
  ADD COLUMN IF NOT EXISTS "banca"   text,
  ADD COLUMN IF NOT EXISTS "tema"    text,
  ADD COLUMN IF NOT EXISTS "subtema" text;

-- Índices para filtros eficientes nos simulados
CREATE INDEX IF NOT EXISTS "idx_questions_banca"   ON "public"."questions_bank" USING btree ("banca");
CREATE INDEX IF NOT EXISTS "idx_questions_tema"    ON "public"."questions_bank" USING btree ("tema");
CREATE INDEX IF NOT EXISTS "idx_questions_subtema" ON "public"."questions_bank" USING btree ("subtema");
