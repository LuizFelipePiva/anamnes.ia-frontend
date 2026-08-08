-- 0001_baseline_schema.sql
-- Baseline do schema de PRODUÇÃO capturado em 2026-07-23 (supabase db dump, só estrutura).
-- Representa o estado JÁ APLICADO em prod. NÃO re-rodar em prod.
-- Uso: recriar o banco do zero (ambiente local/novo) antes das migrations 0002+.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "questions";


ALTER SCHEMA "questions" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."case_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "due_date" "date",
    "assigned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."case_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."case_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "conversation_id" "uuid",
    "score" integer,
    "status" "text" DEFAULT 'in_progress'::"text",
    "duration_seconds" integer,
    "feedback" "text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "case_attempts_score_check" CHECK ((("score" >= 0) AND ("score" <= 100))),
    CONSTRAINT "case_attempts_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'abandoned'::"text"])))
);


ALTER TABLE "public"."case_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "specialty" "text",
    "difficulty" "text" DEFAULT 'Intermediário'::"text",
    "summary" "text",
    "patient_prompt" "text" NOT NULL,
    "form_data" "jsonb",
    "published" boolean DEFAULT false,
    "visibility" "text" DEFAULT 'turma'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "available_until" timestamp with time zone,
    CONSTRAINT "cases_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['Básico'::"text", 'Intermediário'::"text", 'Avançado'::"text"]))),
    CONSTRAINT "cases_visibility_check" CHECK (("visibility" = ANY (ARRAY['turma'::"text", 'instituicao'::"text", 'privado'::"text"])))
);


ALTER TABLE "public"."cases" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cases"."available_until" IS 'Data/hora limite (UTC) de disponibilidade do caso. NULL = permanente.';



CREATE TABLE IF NOT EXISTS "public"."class_students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."class_students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_teachers" (
    "class_id" "uuid" NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."class_teachers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "term" "text",
    "status" "text" DEFAULT 'active'::"text",
    "open_join" boolean DEFAULT true,
    "goal" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "classes_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "text",
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'free'::"text",
    CONSTRAINT "conversations_type_check" CHECK (("type" = ANY (ARRAY['free'::"text", 'case'::"text"])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flashcard_deck_classes" (
    "deck_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL
);


ALTER TABLE "public"."flashcard_deck_classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flashcard_decks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "teacher_id" "uuid",
    "class_id" "uuid",
    "specialty" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_id" "uuid"
);


ALTER TABLE "public"."flashcard_decks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flashcard_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flashcard_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "rating" "text" NOT NULL,
    "reviewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "next_review_at" timestamp with time zone,
    "ef" double precision DEFAULT 2.5,
    "interval_days" integer DEFAULT 1,
    "repetitions" integer DEFAULT 0,
    CONSTRAINT "flashcard_reviews_rating_check" CHECK (("rating" = ANY (ARRAY['again'::"text", 'hard'::"text", 'good'::"text", 'easy'::"text"])))
);


ALTER TABLE "public"."flashcard_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flashcard_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flashcard_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid",
    "source_meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."flashcard_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flashcards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deck_id" "uuid",
    "created_by" "uuid",
    "front" "text" NOT NULL,
    "back" "text" NOT NULL,
    "hint" "text",
    "tags" "text"[],
    "specialty" "text",
    "difficulty" "text",
    "ai_generated" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "flashcards_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"]))),
    CONSTRAINT "flashcards_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."flashcards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."institutions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "address" character varying(300),
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."institutions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "text" NOT NULL,
    "content" "text",
    "timestamp" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions_bank" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "statement" "text" NOT NULL,
    "options" "jsonb" NOT NULL,
    "correct_answer" "text" NOT NULL,
    "explanation" "text",
    "specialty" "text" NOT NULL,
    "subspecialty" "text" NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."questions_bank" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "name" "text" NOT NULL,
    "user_type" "text" DEFAULT 'free'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text" DEFAULT 'student'::"text",
    "institution" "text",
    "active" boolean DEFAULT true,
    "institution_id" "uuid",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['student'::"text", 'teacher'::"text", 'admin'::"text"]))),
    CONSTRAINT "users_user_type_check" CHECK (("user_type" = ANY (ARRAY['free'::"text", 'paid'::"text", 'b2b'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Usuários';



ALTER TABLE ONLY "public"."case_assignments"
    ADD CONSTRAINT "case_assignments_case_id_class_id_key" UNIQUE ("case_id", "class_id");



ALTER TABLE ONLY "public"."case_assignments"
    ADD CONSTRAINT "case_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."case_attempts"
    ADD CONSTRAINT "case_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cases"
    ADD CONSTRAINT "cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_class_id_student_id_key" UNIQUE ("class_id", "student_id");



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_teachers"
    ADD CONSTRAINT "class_teachers_pkey" PRIMARY KEY ("class_id", "teacher_id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flashcard_deck_classes"
    ADD CONSTRAINT "flashcard_deck_classes_pkey" PRIMARY KEY ("deck_id", "class_id");



ALTER TABLE ONLY "public"."flashcard_decks"
    ADD CONSTRAINT "flashcard_decks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flashcard_reviews"
    ADD CONSTRAINT "flashcard_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flashcard_sources"
    ADD CONSTRAINT "flashcard_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flashcards"
    ADD CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."institutions"
    ADD CONSTRAINT "institutions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."institutions"
    ADD CONSTRAINT "institutions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."questions_bank"
    ADD CONSTRAINT "questions_bank_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_case_assignments_case" ON "public"."case_assignments" USING "btree" ("case_id");



CREATE INDEX "idx_case_assignments_class" ON "public"."case_assignments" USING "btree" ("class_id");



CREATE INDEX "idx_case_assignments_due_date" ON "public"."case_assignments" USING "btree" ("due_date");



CREATE INDEX "idx_case_attempts_case" ON "public"."case_attempts" USING "btree" ("case_id");



CREATE INDEX "idx_case_attempts_status" ON "public"."case_attempts" USING "btree" ("status");



CREATE INDEX "idx_case_attempts_student" ON "public"."case_attempts" USING "btree" ("student_id");



CREATE INDEX "idx_cases_available_until" ON "public"."cases" USING "btree" ("available_until");



CREATE INDEX "idx_cases_teacher" ON "public"."cases" USING "btree" ("teacher_id");



CREATE INDEX "idx_class_students_class" ON "public"."class_students" USING "btree" ("class_id");



CREATE INDEX "idx_class_students_student" ON "public"."class_students" USING "btree" ("student_id");



CREATE INDEX "idx_classes_teacher" ON "public"."classes" USING "btree" ("teacher_id");



CREATE INDEX "idx_flashcard_decks_student_id" ON "public"."flashcard_decks" USING "btree" ("student_id");



CREATE INDEX "idx_flashcard_reviews_next" ON "public"."flashcard_reviews" USING "btree" ("student_id", "next_review_at");



CREATE INDEX "idx_flashcard_reviews_student" ON "public"."flashcard_reviews" USING "btree" ("student_id");



CREATE INDEX "idx_flashcard_sources_card" ON "public"."flashcard_sources" USING "btree" ("flashcard_id");



CREATE INDEX "idx_flashcard_sources_meta" ON "public"."flashcard_sources" USING "gin" ("source_meta");



CREATE INDEX "idx_flashcard_sources_source_id" ON "public"."flashcard_sources" USING "btree" ("source_id") WHERE ("source_id" IS NOT NULL);



CREATE INDEX "idx_flashcard_sources_type" ON "public"."flashcard_sources" USING "btree" ("source_type");



ALTER TABLE ONLY "public"."case_assignments"
    ADD CONSTRAINT "case_assignments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_assignments"
    ADD CONSTRAINT "case_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_attempts"
    ADD CONSTRAINT "case_attempts_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_attempts"
    ADD CONSTRAINT "case_attempts_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id");



ALTER TABLE ONLY "public"."case_attempts"
    ADD CONSTRAINT "case_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cases"
    ADD CONSTRAINT "cases_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_teachers"
    ADD CONSTRAINT "class_teachers_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."flashcard_deck_classes"
    ADD CONSTRAINT "flashcard_deck_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flashcard_deck_classes"
    ADD CONSTRAINT "flashcard_deck_classes_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."flashcard_decks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flashcard_decks"
    ADD CONSTRAINT "flashcard_decks_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."flashcard_decks"
    ADD CONSTRAINT "flashcard_decks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flashcard_decks"
    ADD CONSTRAINT "flashcard_decks_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."flashcard_reviews"
    ADD CONSTRAINT "flashcard_reviews_flashcard_id_fkey" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flashcard_reviews"
    ADD CONSTRAINT "flashcard_reviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flashcard_sources"
    ADD CONSTRAINT "flashcard_sources_flashcard_id_fkey" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flashcards"
    ADD CONSTRAINT "flashcards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."flashcards"
    ADD CONSTRAINT "flashcards_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."flashcard_decks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE SET NULL;



CREATE POLICY "Enable read access for all authenticated users" ON "public"."questions_bank" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "No direct access" ON "public"."class_teachers" USING (false);



CREATE POLICY "No direct access" ON "public"."institutions" USING (false);



ALTER TABLE "public"."case_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."case_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_teachers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flashcard_deck_classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flashcard_decks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flashcard_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flashcard_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flashcards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."institutions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions_bank" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_all" ON "public"."flashcard_decks" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."flashcard_reviews" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."flashcard_sources" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."flashcards" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."case_assignments" TO "anon";
GRANT ALL ON TABLE "public"."case_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."case_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."case_attempts" TO "anon";
GRANT ALL ON TABLE "public"."case_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."case_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."cases" TO "anon";
GRANT ALL ON TABLE "public"."cases" TO "authenticated";
GRANT ALL ON TABLE "public"."cases" TO "service_role";



GRANT ALL ON TABLE "public"."class_students" TO "anon";
GRANT ALL ON TABLE "public"."class_students" TO "authenticated";
GRANT ALL ON TABLE "public"."class_students" TO "service_role";



GRANT ALL ON TABLE "public"."class_teachers" TO "anon";
GRANT ALL ON TABLE "public"."class_teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."class_teachers" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."flashcard_deck_classes" TO "anon";
GRANT ALL ON TABLE "public"."flashcard_deck_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."flashcard_deck_classes" TO "service_role";



GRANT ALL ON TABLE "public"."flashcard_decks" TO "anon";
GRANT ALL ON TABLE "public"."flashcard_decks" TO "authenticated";
GRANT ALL ON TABLE "public"."flashcard_decks" TO "service_role";



GRANT ALL ON TABLE "public"."flashcard_reviews" TO "anon";
GRANT ALL ON TABLE "public"."flashcard_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."flashcard_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."flashcard_sources" TO "anon";
GRANT ALL ON TABLE "public"."flashcard_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."flashcard_sources" TO "service_role";



GRANT ALL ON TABLE "public"."flashcards" TO "anon";
GRANT ALL ON TABLE "public"."flashcards" TO "authenticated";
GRANT ALL ON TABLE "public"."flashcards" TO "service_role";



GRANT ALL ON TABLE "public"."institutions" TO "anon";
GRANT ALL ON TABLE "public"."institutions" TO "authenticated";
GRANT ALL ON TABLE "public"."institutions" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON TABLE "public"."questions_bank" TO "anon";
GRANT ALL ON TABLE "public"."questions_bank" TO "authenticated";
GRANT ALL ON TABLE "public"."questions_bank" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































