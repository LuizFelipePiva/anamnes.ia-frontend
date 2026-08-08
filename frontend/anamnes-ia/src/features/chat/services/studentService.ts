/**
 * Student Service — camada de API para funcionalidades do aluno.
 */
import { authFetch } from '@/core/utils/authFetch';
import { config } from '@/config/env';
import { API_ENDPOINTS, STORAGE_KEYS } from '@/config/constants';

const api = (path: string) => `${config.apiUrl}${path}`;

// ─── TURMAS ───────────────────────────────

export interface JoinClassResult {
  message: string;
  class_name: string;
  class_id: string;
}

export async function joinClass(code: string): Promise<JoinClassResult> {
  const res = await authFetch(api(`${API_ENDPOINTS.CLASSES}/${code.toUpperCase()}/join`), {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao entrar na turma' }));
    throw new Error(err.detail || 'Erro ao entrar na turma');
  }
  return res.json();
}

// ─── CASOS GRATUITOS (públicos) ──────────

export interface FreeCaseFromApi {
  id: string;
  title: string;
  specialty: string | null;
  difficulty: string;
  summary: string | null;
  patient_prompt: string;
  form_data?: Record<string, unknown>;
  available_until?: string | null;
  created_at: string | null;
}

export async function fetchFreeCases(): Promise<FreeCaseFromApi[]> {
  const res = await authFetch(api(API_ENDPOINTS.CASES_FREE));
  if (!res.ok) return [];
  return res.json();
}

// ─── CASOS DISPONÍVEIS ───────────────────

export interface AvailableCase {
  id: string;
  title: string;
  specialty: string | null;
  difficulty: string;
  summary: string | null;
  available_until?: string | null;
  created_at: string | null;
  attempts_count: number;
  best_score: number | null;
  last_status: string | null;
  class_names: string[];
  expires_at?: string | null;
}

export async function fetchAvailableCases(): Promise<AvailableCase[]> {
  const res = await authFetch(api(API_ENDPOINTS.CASES_STUDENT_AVAILABLE));
  if (!res.ok) throw new Error('Erro ao carregar casos disponíveis');
  return res.json();
}

// ─── TENTATIVAS DE CASO ──────────────────

export interface CaseStartResult {
  attempt_id: string;
  thread_id: string;
  conversation_id: string;
  patient_prompt: string;
  case_id?: string;  // retornado pelo /ai/start
}

/** Inicia um Chat IA — cria caso placeholder + attempt no banco.
 *  FUTURAMENTE: sujeito a limite de cota por plano. */
export interface DailyQuota {
  user_type: string;
  is_paid: boolean;
  ai_used: number;
  ai_limit: number;
  ai_available: number;
  regular_used: number;
  regular_limit: number;
  regular_available: number;
}

export async function fetchDailyQuota(): Promise<DailyQuota> {
  const res = await authFetch(api(API_ENDPOINTS.CASES_QUOTA));
  if (!res.ok) throw new Error('Erro ao buscar cota diária');
  return res.json();
}

export async function startAiChat(specialty?: string): Promise<CaseStartResult> {
  const res = await authFetch(api(API_ENDPOINTS.CASES_AI_START), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ specialty: specialty || null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao iniciar Chat IA' }));
    throw new Error(err.detail || 'Erro ao iniciar Chat IA');
  }
  return res.json();
}

export async function startCaseAttempt(caseId: string): Promise<CaseStartResult> {
  const res = await authFetch(api(`${API_ENDPOINTS.CASES}/${caseId}/start`), {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao iniciar caso' }));
    throw new Error(err.detail || 'Erro ao iniciar caso');
  }
  return res.json();
}

export interface SoapBreakdownSection {
  score: number;
  weight: number;
  feedback: string;
}

export interface SoapBreakdown {
  subjetivo: SoapBreakdownSection;
  objetivo: SoapBreakdownSection;
  avaliacao: SoapBreakdownSection;
  plano: SoapBreakdownSection;
}

export interface CaseCompleteResult {
  attempt_id: string;
  score: number | null;
  feedback: string;
  duration_seconds: number;
  breakdown?: SoapBreakdown | null;
}

export async function completeCaseAttempt(caseId: string, soapContent: string): Promise<CaseCompleteResult> {
  const res = await authFetch(api(`${API_ENDPOINTS.CASES}/${caseId}/complete`), {
    method: 'POST',
    body: JSON.stringify({ soap_content: soapContent }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao completar caso' }));
    throw new Error(err.detail || 'Erro ao completar caso');
  }
  return res.json();
}

/** Marca uma tentativa em andamento como 'abandoned'.
 *  Usa fetch direto com keepalive=true para funcionar durante unload/unmount,
 *  sem passar pelo fetchWithRetry (que usa setTimeout e é cancelado no unload). */
export function abandonAttempt(attemptId: string): void {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (!token) return;
  const url = `${config.apiUrl}${API_ENDPOINTS.CASES_ATTEMPT_ABANDON}/${attemptId}/abandon`;
  fetch(url, {
    method: 'PATCH',
    keepalive: true,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }).catch(() => {}); // best-effort, nunca lança
}
