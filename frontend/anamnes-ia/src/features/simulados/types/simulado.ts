/** Cabeçalho de um simulado (sem questões). */
export interface Simulado {
  id: string;
  title: string;
  description: string | null;
  specialty: string | null;
  subspecialty: string | null;
  num_questions: number;
  created_by: string;
  class_id: string | null;
  due_date: string | null;
  visibility: 'privado' | 'turma' | 'publico';
  created_at: string;
}

/** Payload para criar um simulado. */
export interface SimuladoCreate {
  title: string;
  description?: string;
  specialty?: string | null;
  subspecialty?: string | null;
  num_questions?: number;
  class_id?: string | null;
  due_date?: string | null;
  visibility?: 'privado' | 'turma' | 'publico';
}

/** Questão durante o simulado — sem gabarito. */
export interface SimuladoQuestion {
  id: string;
  statement: string;
  options: Record<string, string>;
  specialty: string;
  subspecialty: string;
  image_url: string | null;
  created_at?: string;
}

/** Resposta do POST /start. */
export interface SimuladoAttemptStart {
  attempt_id: string;
  simulado_id: string;
  questions: SimuladoQuestion[];
}

/** Uma questão no relatório final (com gabarito). */
export interface SimuladoReportQuestion {
  question_id: string;
  statement: string;
  options: Record<string, string>;
  image_url: string | null;
  specialty: string;
  subspecialty: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string | null;
}

/** Relatório completo de uma tentativa finalizada. */
export interface SimuladoReport {
  attempt_id: string;
  simulado_id: string;
  simulado_title: string;
  status: string;
  score: number;
  num_correct: number;
  num_total: number;
  time_spent_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  questions: SimuladoReportQuestion[];
}

/** Resumo de uma tentativa para listagens. */
export interface SimuladoAttemptSummary {
  id: string;
  simulado_id: string;
  student_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  score: number | null;
  num_correct: number | null;
  num_total: number | null;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number | null;
}
