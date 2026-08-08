export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  institution: string | null;
  active: boolean;
  created_at: string;
  user_type: string | null; // planos futuros
}

export interface Institution {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  active: boolean;
  created_at: string | null;
  teachers: number;
  students: number;
  active_users: number;
  inactive_users: number;
}

export interface InstitutionCreate {
  name: string;
  description?: string;
  address?: string;
}

export interface InstitutionUpdate {
  name?: string;
  description?: string;
  address?: string;
  active?: boolean;
}

export interface AdminOverview {
  total_users: number;
  total_students: number;
  total_teachers: number;
  total_admins: number;
  total_institutions: number;
  total_cases: number;
  total_classes: number;
  total_attempts: number;
  total_completed: number;
}

export interface CreateTeacherPayload {
  name: string;
  email: string;
  institution_id: string;
  password?: string;
}

export interface BulkStudent {
  name: string;
  email: string;
  password?: string;
  user_type?: string;
}

export interface BulkCreateResult {
  email: string;
  status: string;
  temporary_password?: string;
}

export type AdminTab = 'overview' | 'institutions' | 'teachers' | 'students' | 'classes' | 'free-cases' | 'gpt' | 'flashcards';

export interface GptSettings {
  gpt_max_tokens: number;
  gpt_max_turns: number;
  gpt_daily_message_limit: number;
  defaults: { gpt_max_tokens: number; gpt_max_turns: number; gpt_daily_message_limit: number };
}

export interface GptInfo {
  model: string;
  eval_model: string;
  vector_store_configured: boolean;
  langfuse_active: boolean;
  langfuse_host: string;
}

export interface GptUsage {
  period_start: string;
  period_end: string;
  total_tokens: number | null;
  total_prompt_tokens?: number;
  total_completion_tokens?: number;
  source: 'openai_usage_api' | 'db_estimate' | 'unavailable' | 'error';
  detail?: string;
  daily?: { date: string; prompt_tokens: number; completion_tokens: number }[];
}

export interface GptBalance {
  has_credits: boolean;
  total_granted?: number;
  total_used?: number;
  total_available?: number;
  credits_expire_at?: string | null;
  has_payment_method?: boolean;
  hard_limit_usd?: number;
  soft_limit_usd?: number;
  source: 'credit_grants' | 'subscription' | 'unavailable' | 'error';
  detail?: string;
}

export interface ConversationStats {
  total_conversations: number;
  total_messages: number;
  avg_messages_per_conversation: number;
  conversations_over_60_messages: number;
}

export interface AdminClassDetail {
  teachers: { id: string; name: string; email: string; is_owner: boolean }[];
  students: { id: string; name: string; email: string; joined_at: string | null }[];
  cases: { id: string; title: string; specialty: string | null; difficulty: string; published: boolean; due_date: string | null }[];
}

export interface AdminClass {
  id: string;
  name: string;
  code: string;
  term: string | null;
  status: string;
  open_join: boolean;
  created_at: string | null;
  teacher_name: string;
  teacher_email: string;
  students_count: number;
  cases_count: number;
}

export interface AdminFreeCase {
  id: string;
  title: string;
  specialty: string | null;
  difficulty: string;
  summary: string | null;
  patient_prompt: string;
  available_until: string | null;
  created_at: string | null;
}

export interface CreateFreeCasePayload {
  title: string;
  specialty?: string;
  difficulty: string;
  summary?: string;
  patient_prompt: string;
  form_data?: Record<string, unknown>;
  available_until?: string | null;
}
