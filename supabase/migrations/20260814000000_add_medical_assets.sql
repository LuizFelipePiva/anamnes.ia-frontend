CREATE TABLE IF NOT EXISTS "public"."medical_assets" (
    "id" text PRIMARY KEY,
    "modality" text NOT NULL,
    "display_name" text NOT NULL,
    "diagnosis_or_finding" text NOT NULL,
    "storage_path" text,
    "remote_url" text,
    "storage_mode" text NOT NULL DEFAULT 'supabase'
        CHECK ("storage_mode" IN ('supabase', 'remote')),
    "media_type" text NOT NULL DEFAULT 'image',
    "attachment_eligible" boolean NOT NULL DEFAULT true,
    "tags" text[] NOT NULL DEFAULT '{}',
    "license" text,
    "source_url" text,
    "credits" jsonb,
    "sha256" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "medical_assets_media_type_check"
        CHECK ("media_type" = ANY (ARRAY['image', 'video', 'gif'])),
    CONSTRAINT "medical_assets_location_check" CHECK (
        ("storage_mode" = 'supabase' AND "storage_path" IS NOT NULL)
        OR ("storage_mode" = 'remote' AND "remote_url" IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS "medical_assets_modality_idx"
    ON "public"."medical_assets" ("modality") WHERE "attachment_eligible";

CREATE TABLE IF NOT EXISTS "public"."case_exam_assets" (
    "case_id" uuid NOT NULL REFERENCES "public"."cases"("id") ON DELETE CASCADE,
    "asset_id" text NOT NULL REFERENCES "public"."medical_assets"("id") ON DELETE RESTRICT,
    "position" integer NOT NULL DEFAULT 0 CHECK ("position" >= 0),
    PRIMARY KEY ("case_id", "asset_id")
);

ALTER TABLE "public"."medical_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."case_exam_assets" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON "public"."medical_assets", "public"."case_exam_assets" TO service_role;
REVOKE ALL ON "public"."medical_assets", "public"."case_exam_assets" FROM anon, authenticated;
GRANT SELECT ON "public"."medical_assets" TO authenticated;

-- Os metadados contêm o diagnóstico: somente professores e admins podem lê-los.
DROP POLICY IF EXISTS "authenticated_read" ON "public"."medical_assets";
CREATE POLICY "authenticated_read" ON "public"."medical_assets" FOR SELECT
    TO authenticated USING (
        EXISTS (SELECT 1 FROM "public"."users" u
                WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

-- O catálogo binário é preenchido pelo script de ingestão. Caminhos são hashes.
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-assets', 'medical-assets', true)
ON CONFLICT (id) DO NOTHING;
