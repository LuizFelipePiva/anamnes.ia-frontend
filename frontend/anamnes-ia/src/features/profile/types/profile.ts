export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  role: string;
  user_type: string | null; // planos futuros
  avatar_url?: string;
}

export interface ProfileStats {
  total_attempts: number;
  completed: number;
  average_score: number | null;
  best_score: number | null;
  average_duration_seconds: number | null;
}

export interface SpecialtyStats {
  specialty: string;
  attempts: number;
  completed: number;
  average_score: number;
}

export interface WeeklyScore {
  week: string;
  avg_score: number;
}

export interface AttemptHistory {
  attempt_id: string;
  case_id: string | null;
  case_title: string;
  specialty: string | null;
  difficulty: string | null;
  score: number | null;
  feedback: string | null;
  status: string;
  started_at: string;
  duration_seconds: number | null;
  /** true quando é um chat gerado pela IA sem caso clínico vinculado.
   *  ATENÇÃO: será o tipo limitado futuramente para contas sem plano pago.
   *  Casos prontos (admin/professor) têm is_ai_chat = false e são gratuitos. */
  is_ai_chat?: boolean;
  /** id da conversa no banco — usado para navegar ao chat anterior */
  conversation_id?: string | null;
  /** queixa principal do paciente (extraída de form_data) */
  queixa_principal?: string;
}

export interface EnrolledClass {
  class_id: string;
  name: string;
  code: string;
  joined_at: string;
}

export interface StudentProfile {
  user: ProfileUser;
  stats: ProfileStats;
  by_specialty: SpecialtyStats[];
  weekly_scores: WeeklyScore[];
  history: AttemptHistory[];
  classes: EnrolledClass[];
}
