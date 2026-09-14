import { describe, expect, it, vi } from 'vitest';

const authFetchMock = vi.fn();
vi.mock('@/core/utils/authFetch', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
}));

import { fetchRecommendedSimulados } from './simuladosService';

describe('fetchRecommendedSimulados', () => {
  it('busca simulados recomendados pela especialidade e limite', async () => {
    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        specialty: 'Cardiologia',
        items: [
          {
            id: 's1',
            title: 'Revisão',
            description: null,
            specialty: 'Cardiologia',
            subspecialty: null,
            num_questions: 10,
            created_by: 't1',
            class_id: null,
            due_date: null,
            visibility: 'privado',
            created_at: '2026-09-07T10:00:00Z',
          },
        ],
      }),
    });

    const result = await fetchRecommendedSimulados('Cardiologia', 3);

    expect(authFetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/simulados/recommended?specialty=Cardiologia&limit=3'),
    );
    expect(result.specialty).toBe('Cardiologia');
    expect(result.items[0]?.id).toBe('s1');
  });
});
