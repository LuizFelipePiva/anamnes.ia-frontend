-- 20260803000001_add_ano_to_questions.sql
-- Adiciona a coluna ano à tabela questions_bank para suporte ao novo layout de simulados.

ALTER TABLE "public"."questions_bank"
  ADD COLUMN IF NOT EXISTS "ano" integer;

CREATE INDEX IF NOT EXISTS "idx_questions_ano" ON "public"."questions_bank" USING btree ("ano");
