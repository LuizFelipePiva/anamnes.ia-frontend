-- Adiciona coluna student_id em flashcard_decks para decks pessoais de alunos
-- Executar no SQL Editor do Supabase

ALTER TABLE flashcard_decks
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Índice para buscas por aluno
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_student_id
  ON flashcard_decks(student_id);
