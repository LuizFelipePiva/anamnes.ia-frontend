/**
 * SPEC-013 §6.9 — resumo semanal por IA, atrás de `WEEKLY_SUMMARY_ENABLED`.
 *
 * A flag é lida aqui e não no componente: com ela desligada o efeito nem roda,
 * então a home não dispara **nenhuma** requisição (critério de aceite 8). Um
 * card que renderiza `null` depois de buscar já teria custado o token.
 */
import { useEffect, useState } from 'react';
import { WEEKLY_SUMMARY_ENABLED } from '@/config/constants';
import {
  fetchWeeklySummary,
  type WeeklySummary,
} from '../services/weeklySummaryService';

export function useWeeklySummary(enabled: boolean): WeeklySummary | null {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  useEffect(() => {
    if (!enabled || !WEEKLY_SUMMARY_ENABLED) return;
    let alive = true;
    fetchWeeklySummary()
      .then(data => { if (alive) setSummary(data); })
      .catch(() => { if (alive) setSummary(null); });
    return () => { alive = false; };
  }, [enabled]);

  return summary;
}
