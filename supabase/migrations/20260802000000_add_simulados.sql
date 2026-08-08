-- 20260802000000_add_simulados.sql
-- Sistema de Simulados: 4 tabelas + RLS.
-- simulados          → cabeçalho do simulado (criado por professor ou aluno)
-- simulado_questions → questões selecionadas para um simulado
-- simulado_attempts  → tentativa de um aluno em um simulado
-- simulado_answers   → resposta do aluno por questão

-- ── simulados ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."simulados" (
    "id"                  uuid DEFAULT gen_random_uuid() NOT NULL,
    "title"               text NOT NULL,
    "description"         text,
    "specialty"           text,       -- NULL = todas especialidades
    "subspecialty"        text,       -- NULL = todas subespecialidades
    "num_questions"       integer NOT NULL DEFAULT 40,
    "created_by"          uuid NOT NULL,
    "class_id"            uuid,       -- NULL = simulado livre/pessoal
    "due_date"            timestamp with time zone,
    "visibility"          text NOT NULL DEFAULT 'privado'::text,
    "created_at"          timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "simulados_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "simulados_visibility_check" CHECK (
        "visibility" = ANY (ARRAY['privado'::text, 'turma'::text, 'publico'::text])
    ),
    CONSTRAINT "simulados_num_questions_check" CHECK ("num_questions" >= 1 AND "num_questions" <= 200),
    CONSTRAINT "simulados_created_by_fkey" FOREIGN KEY ("created_by")
        REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "simulados_class_id_fkey" FOREIGN KEY ("class_id")
        REFERENCES "public"."classes"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."simulados" OWNER TO "postgres";

CREATE INDEX "idx_simulados_created_by" ON "public"."simulados" USING btree ("created_by");
CREATE INDEX "idx_simulados_class_id"   ON "public"."simulados" USING btree ("class_id");
CREATE INDEX "idx_simulados_due_date"   ON "public"."simulados" USING btree ("due_date");


-- ── simulado_questions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."simulado_questions" (
    "simulado_id"   uuid NOT NULL,
    "question_id"   uuid NOT NULL,
    "position"      integer NOT NULL DEFAULT 0,
    CONSTRAINT "simulado_questions_pkey" PRIMARY KEY ("simulado_id", "question_id"),
    CONSTRAINT "simulado_questions_simulado_id_fkey" FOREIGN KEY ("simulado_id")
        REFERENCES "public"."simulados"("id") ON DELETE CASCADE,
    CONSTRAINT "simulado_questions_question_id_fkey" FOREIGN KEY ("question_id")
        REFERENCES "public"."questions_bank"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."simulado_questions" OWNER TO "postgres";

CREATE INDEX "idx_simulado_questions_simulado" ON "public"."simulado_questions" USING btree ("simulado_id");


-- ── simulado_attempts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."simulado_attempts" (
    "id"                   uuid DEFAULT gen_random_uuid() NOT NULL,
    "simulado_id"          uuid NOT NULL,
    "student_id"           uuid NOT NULL,
    "status"               text NOT NULL DEFAULT 'in_progress'::text,
    "score"                integer,         -- percentual de acertos 0-100
    "num_correct"          integer,
    "num_total"            integer,
    "started_at"           timestamp with time zone DEFAULT now() NOT NULL,
    "completed_at"         timestamp with time zone,
    "time_spent_seconds"   integer,
    CONSTRAINT "simulado_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "simulado_attempts_status_check" CHECK (
        "status" = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text])
    ),
    CONSTRAINT "simulado_attempts_score_check" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 100)),
    CONSTRAINT "simulado_attempts_simulado_id_fkey" FOREIGN KEY ("simulado_id")
        REFERENCES "public"."simulados"("id") ON DELETE CASCADE,
    CONSTRAINT "simulado_attempts_student_id_fkey" FOREIGN KEY ("student_id")
        REFERENCES "public"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."simulado_attempts" OWNER TO "postgres";

CREATE INDEX "idx_simulado_attempts_simulado" ON "public"."simulado_attempts" USING btree ("simulado_id");
CREATE INDEX "idx_simulado_attempts_student"  ON "public"."simulado_attempts" USING btree ("student_id");
CREATE INDEX "idx_simulado_attempts_status"   ON "public"."simulado_attempts" USING btree ("status");


-- ── simulado_answers ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."simulado_answers" (
    "id"               uuid DEFAULT gen_random_uuid() NOT NULL,
    "attempt_id"       uuid NOT NULL,
    "question_id"      uuid NOT NULL,
    "selected_answer"  text NOT NULL,
    "is_correct"       boolean NOT NULL,
    "answered_at"      timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "simulado_answers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "simulado_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id")
        REFERENCES "public"."simulado_attempts"("id") ON DELETE CASCADE,
    CONSTRAINT "simulado_answers_question_id_fkey" FOREIGN KEY ("question_id")
        REFERENCES "public"."questions_bank"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."simulado_answers" OWNER TO "postgres";

CREATE INDEX "idx_simulado_answers_attempt"  ON "public"."simulado_answers" USING btree ("attempt_id");
CREATE INDEX "idx_simulado_answers_question" ON "public"."simulado_answers" USING btree ("question_id");


-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE "public"."simulados"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."simulado_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."simulado_attempts"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."simulado_answers"   ENABLE ROW LEVEL SECURITY;

-- service_role tem acesso total (backend usa service_role key)
CREATE POLICY "service_role_all" ON "public"."simulados"
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON "public"."simulado_questions"
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON "public"."simulado_attempts"
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON "public"."simulado_answers"
    TO service_role USING (true) WITH CHECK (true);

-- authenticated pode ler simulados (filtragem de visibilidade feita no backend)
CREATE POLICY "authenticated_read_simulados" ON "public"."simulados"
    FOR SELECT TO authenticated USING (true);

-- authenticated pode ler questões de um simulado (sem gabarito — o backend não expõe)
CREATE POLICY "authenticated_read_simulado_questions" ON "public"."simulado_questions"
    FOR SELECT TO authenticated USING (true);

-- aluno só vê suas próprias tentativas
CREATE POLICY "student_own_attempts" ON "public"."simulado_attempts"
    FOR SELECT TO authenticated USING (auth.uid() = "student_id");

-- aluno só vê suas próprias respostas
CREATE POLICY "student_own_answers" ON "public"."simulado_answers"
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "public"."simulado_attempts" sa
            WHERE sa.id = "simulado_answers"."attempt_id"
              AND sa.student_id = auth.uid()
        )
    );
