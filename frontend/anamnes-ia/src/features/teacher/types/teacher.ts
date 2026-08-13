// src/types/teacher.ts
// Tipos centralizados para o módulo de professor — alinhados com backend

// ─── CLASS (Turma) ────────────────────────
export interface ClassInfo {
  id: string;
  teacher_id: string;
  name: string;
  code: string;
  term: string | null;
  status: string;
  open_join: boolean;
  goal: number;
  created_at: string | null;
}

export interface ClassWithStudents extends ClassInfo {
  students: ClassStudent[];
  students_count: number;
}

export interface ClassStudent {
  id: string;
  name: string;
  email: string;
  joined_at: string;
}

export interface SharedTeacher {
  id: string;
  name: string;
  email: string;
  is_owner: boolean;
  added_at?: string;
}

export interface ClassTeachersResponse {
  teachers: SharedTeacher[];
  is_owner: boolean;
}

export interface InstitutionTeachersResponse {
  teachers: Array<{ id: string; name: string; email: string }>;
}

export interface ClassCreate {
  name: string;
  term?: string;
  open_join?: boolean;
  goal?: number;
}

export interface ClassUpdate {
  name?: string;
  term?: string;
  status?: string;
  open_join?: boolean;
  goal?: number;
}

// ─── CASE (Caso Clínico) ─────────────────
export type CaseVisibility = "turma" | "privado";

export interface CaseInfo {
  id: string;
  teacher_id: string;
  title: string;
  specialty: string | null;
  difficulty: string;
  summary: string | null;
  patient_prompt: string;
  form_data: Record<string, unknown> | null;
  published: boolean;
  visibility: CaseVisibility;
  created_at: string | null;
  updated_at: string | null;
}

export interface CaseFormData {
  patologia: string;
  queixa_principal: string;
  sintomas: string;
  especificidades: string;
  exames: string;
  exame_fisico: string;
  historico_familiar: string;
  habitos: string;
  dificuldade: string;
  especialidade: string;
  persona_nome: string;
  persona_idade: string;
  persona_profissao: string;
  persona_emocional: string;
  persona_contexto: string;
}

export interface CaseCreate {
  title: string;
  specialty?: string;
  difficulty: string;
  summary?: string;
  patient_prompt: string;
  form_data?: Record<string, unknown>;
  published?: boolean;
  visibility?: CaseVisibility;
}

export interface CaseUpdate {
  title?: string;
  specialty?: string;
  difficulty?: string;
  summary?: string;
  patient_prompt?: string;
  published?: boolean;
  visibility?: CaseVisibility;
}

// ─── DASHBOARD ────────────────────────────
export interface DashboardStats {
  total_classes: number;
  total_students: number;
  total_cases: number;
  total_attempts: number;
  completed_attempts: number;
  completion_rate: number;
  average_score: number;
  average_duration_seconds: number;
}

export interface CaseStats {
  case_id: string;
  title: string;
  attempts: number;
  completed: number;
  average_score: number;
  average_duration: number;
}

export interface StudentStats {
  student_id: string;
  name: string;
  email: string;
  attempts: number;
  completed: number;
  average_score: number;
  last_activity: string | null;
}

export interface StudentHistoryItem {
  id: string;
  case_id: string;
  student_id: string;
  conversation_id: string | null;
  score: number | null;
  status: string;
  duration_seconds: number | null;
  feedback: string | null;
  started_at: string | null;
  completed_at: string | null;
  cases?: {
    title: string;
    specialty: string | null;
    difficulty: string;
  };
}

export type StudentHistory = Record<string, StudentHistoryItem[]>;

// ─── CASE ATTEMPTS (professor view) ──────
export interface CaseAttemptItem {
  id: string;
  student_id: string;
  conversation_id: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  users?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | null;
}

// ─── WEEKLY STATS ─────────────────────────
export interface WeeklyStats {
  week: string;      // ex: "2026-W10"
  avg_score: number;
  attempts: number;
}

// ─── VIEW ─────────────────────────────────
export type ViewType = 'reports' | 'classes' | 'students' | 'cases' | 'content' | 'free-cases';

