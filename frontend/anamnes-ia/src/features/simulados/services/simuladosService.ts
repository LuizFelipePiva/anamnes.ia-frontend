import { authFetch } from '@/core/utils/authFetch';
import type {
  Simulado,
  SimuladoAttemptStart,
  SimuladoAttemptSummary,
  SimuladoCreate,
  SimuladoFilterOptions,
  SimuladoReport,
} from '../types/simulado';

const BASE = import.meta.env.VITE_API_URL ?? '';

async function parseError(res: Response, fallback: string): Promise<never> {
  const err = await res.json().catch(() => ({}));
  throw new Error((err as { detail?: string }).detail ?? fallback);
}

// ── Filtros ───────────────────────────────────────────────────────────────────

export async function fetchFilterOptions(): Promise<SimuladoFilterOptions> {
  const res = await authFetch(`${BASE}/simulados/filter-options`);
  if (!res.ok) return parseError(res, 'Erro ao buscar opções de filtro');
  return res.json();
}

export async function countAvailableQuestions(filters: Partial<SimuladoCreate>): Promise<{ count: number }> {
  const res = await authFetch(`${BASE}/simulados/count-available`, {
    method: 'POST',
    body: JSON.stringify(filters),
  });
  if (!res.ok) return parseError(res, 'Erro ao contar questões disponíveis');
  return res.json();
}

// ── Listagem e CRUD ──────────────────────────────────────────────────────────

export async function fetchSimulados(): Promise<Simulado[]> {
  const res = await authFetch(`${BASE}/simulados`);
  if (!res.ok) return parseError(res, 'Erro ao buscar simulados');
  return res.json();
}

export async function fetchSimulado(id: string): Promise<Simulado> {
  const res = await authFetch(`${BASE}/simulados/${id}`);
  if (!res.ok) return parseError(res, 'Erro ao buscar simulado');
  return res.json();
}

export async function createSimulado(data: SimuladoCreate): Promise<Simulado> {
  const res = await authFetch(`${BASE}/simulados`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) return parseError(res, 'Erro ao criar simulado');
  return res.json();
}

export async function deleteSimulado(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/simulados/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) return parseError(res, 'Erro ao remover simulado');
}

// ── Tentativas ────────────────────────────────────────────────────────────────

export async function startAttempt(simuladoId: string): Promise<SimuladoAttemptStart> {
  const res = await authFetch(`${BASE}/simulados/${simuladoId}/start`, {
    method: 'POST',
  });
  if (!res.ok) return parseError(res, 'Erro ao iniciar simulado');
  return res.json();
}

export async function recordAnswer(
  simuladoId: string,
  attemptId: string,
  questionId: string,
  selectedAnswer: string,
): Promise<{ recorded: boolean }> {
  const res = await authFetch(
    `${BASE}/simulados/${simuladoId}/attempts/${attemptId}/answer`,
    {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, selected_answer: selectedAnswer }),
    },
  );
  if (!res.ok) return parseError(res, 'Erro ao registrar resposta');
  return res.json();
}

export async function finishAttempt(
  simuladoId: string,
  attemptId: string,
  timeSpentSeconds?: number,
): Promise<SimuladoReport> {
  const qs = timeSpentSeconds != null ? `?time_spent_seconds=${timeSpentSeconds}` : '';
  const res = await authFetch(
    `${BASE}/simulados/${simuladoId}/attempts/${attemptId}/finish${qs}`,
    { method: 'POST' },
  );
  if (!res.ok) return parseError(res, 'Erro ao finalizar simulado');
  return res.json();
}

export async function fetchReport(
  simuladoId: string,
  attemptId: string,
): Promise<SimuladoReport> {
  const res = await authFetch(
    `${BASE}/simulados/${simuladoId}/attempts/${attemptId}/report`,
  );
  if (!res.ok) return parseError(res, 'Erro ao buscar relatório');
  return res.json();
}

export async function fetchMyAttempts(): Promise<SimuladoAttemptSummary[]> {
  const res = await authFetch(`${BASE}/simulados/my-attempts`);
  if (!res.ok) return parseError(res, 'Erro ao buscar histórico');
  return res.json();
}

export async function fetchAttemptsBySimulado(
  simuladoId: string,
): Promise<SimuladoAttemptSummary[]> {
  const res = await authFetch(`${BASE}/simulados/${simuladoId}/attempts`);
  if (!res.ok) return parseError(res, 'Erro ao buscar tentativas');
  return res.json();
}
