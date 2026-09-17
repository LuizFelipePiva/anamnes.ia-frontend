-- Notas por dimensão usadas pelo perfil SOAP e pelo plano de estudos.
ALTER TABLE "public"."case_attempts"
    ADD COLUMN IF NOT EXISTS "breakdown" jsonb;
