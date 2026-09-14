/**
 * SPEC-013 §6.9 — resumo semanal por IA.
 *
 * O backend responde 404 quando a feature está desligada lá (env
 * `WEEKLY_SUMMARY_ENABLED`) e `{"summary": null}` quando o aluno não teve
 * atividade na semana. Os dois casos são "não há card", não erro: a home nunca
 * mostra falha por causa deste bloco.
 */
import { authFetch } from '@/core/utils/authFetch';

const BASE = import.meta.env.VITE_API_URL ?? '';

export interface WeakSpecialtySummary {
  specialty: string;
  averageScore: number;
  attempts: number;
}

export interface WeeklySummary {
  summary: string;
  week: string;
  cached: boolean;
  language: string;
  weakSpecialties: WeakSpecialtySummary[];
}

type WeeklySummaryApi = {
  summary?: string | null;
  week?: string;
  cached?: boolean;
  language?: string;
  weak_specialties?: Array<{
    specialty: string;
    average_score: number;
    attempts: number;
  }>;
};

export async function fetchWeeklySummary(): Promise<WeeklySummary | null> {
  const res = await authFetch(`${BASE}/profile/me/weekly-summary`);
  if (!res.ok) return null;

  const data = (await res.json()) as WeeklySummaryApi;
  const summary = data.summary?.trim();
  if (!summary) return null;

  return {
    summary,
    week: data.week ?? '',
    cached: data.cached ?? false,
    language: data.language ?? 'pt-BR',
    weakSpecialties: (data.weak_specialties ?? []).map(item => ({
      specialty: item.specialty,
      averageScore: item.average_score,
      attempts: item.attempts,
    })),
  };
}
