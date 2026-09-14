import { beforeEach, describe, expect, it, vi } from 'vitest';

const authFetch = vi.fn();
vi.mock('@/core/utils/authFetch', () => ({
  authFetch: (...args: unknown[]) => authFetch(...args),
}));

import { fetchWeeklySummary } from './weeklySummaryService';

beforeEach(() => {
  authFetch.mockReset();
});

describe('fetchWeeklySummary', () => {
  it('adapta weak_specialties do backend para camelCase no frontend', async () => {
    authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: 'Você treinou Cardiologia.',
        week: '2026-W37',
        cached: false,
        language: 'pt-BR',
        weak_specialties: [
          { specialty: 'Cardiologia', average_score: 42.5, attempts: 2 },
        ],
      }),
    });

    await expect(fetchWeeklySummary()).resolves.toEqual({
      summary: 'Você treinou Cardiologia.',
      week: '2026-W37',
      cached: false,
      language: 'pt-BR',
      weakSpecialties: [
        { specialty: 'Cardiologia', averageScore: 42.5, attempts: 2 },
      ],
    });
  });
});
