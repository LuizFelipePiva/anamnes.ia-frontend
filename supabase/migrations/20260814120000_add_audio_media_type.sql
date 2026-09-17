ALTER TABLE "public"."medical_assets"
    DROP CONSTRAINT IF EXISTS "medical_assets_media_type_check";

ALTER TABLE "public"."medical_assets"
    ADD CONSTRAINT "medical_assets_media_type_check"
    CHECK ("media_type" = ANY (ARRAY['image', 'video', 'gif', 'audio']));
