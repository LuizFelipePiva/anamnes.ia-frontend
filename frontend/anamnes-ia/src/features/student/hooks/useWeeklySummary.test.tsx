/**
 * SPEC-013 §6.9 (T9) — resumo semanal por IA.
 *
 * O caso que importa é o **desligado**: com `WEEKLY_SUMMARY_ENABLED = false` a
 * home não pode fazer nenhuma requisição (critério de aceite 8). Buscar e
 * esconder o card seria a mesma tela e o dobro do custo, então o teste olha a
 * chamada de rede, não só o DOM.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Flag mutável: `vi.mock` é içado e roda uma vez, mas o hook lê a constante
// dentro do efeito, então o getter resolve no momento do render.
const flag = { enabled: true };
vi.mock('@/config/constants', () => ({
  get WEEKLY_SUMMARY_ENABLED() { return flag.enabled; },
  WEEKLY_GOAL: 5,
}));

const mockSummary = {
  summary: 'Você concluiu 3 casos nesta semana.',
  week: '2026-W37',
  cached: false,
  language: 'pt-BR',
  weakSpecialties: [],
};

const fetchWeeklySummary = vi.fn<() => Promise<typeof mockSummary | null>>();
vi.mock('../services/weeklySummaryService', () => ({
  fetchWeeklySummary: () => fetchWeeklySummary(),
}));

import { useWeeklySummary } from './useWeeklySummary';
import SummaryCard from '../components/home/SummaryCard';

const Host: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => (
  <SummaryCard summary={useWeeklySummary(enabled)?.summary ?? null} />
);

beforeEach(() => {
  flag.enabled = true;
  fetchWeeklySummary.mockReset().mockResolvedValue(mockSummary);
});

describe('useWeeklySummary + SummaryCard (T9)', () => {
  it('T9.1: com a flag ligada mostra o card com o texto do backend', async () => {
    render(<Host />);
    const card = await screen.findByTestId('card-summary');
    expect(card).toHaveTextContent('Você concluiu 3 casos nesta semana.');
  });

  it('T9.2: com a flag desligada não busca nada nem renderiza o card', async () => {
    flag.enabled = false;
    render(<Host />);

    await waitFor(() => expect(fetchWeeklySummary).not.toHaveBeenCalled());
    expect(screen.queryByTestId('card-summary')).not.toBeInTheDocument();
  });

  it('T9.3: usuário ainda não carregado não dispara a chamada', async () => {
    render(<Host enabled={false} />);

    await waitFor(() => expect(fetchWeeklySummary).not.toHaveBeenCalled());
    expect(screen.queryByTestId('card-summary')).not.toBeInTheDocument();
  });

  it('T9.4: semana sem atividade (summary null) não renderiza card vazio', async () => {
    fetchWeeklySummary.mockResolvedValue(null);
    render(<Host />);

    await waitFor(() => expect(fetchWeeklySummary).toHaveBeenCalled());
    expect(screen.queryByTestId('card-summary')).not.toBeInTheDocument();
  });

  it('T9.5: falha da rede não quebra a home — o card só não aparece', async () => {
    fetchWeeklySummary.mockRejectedValue(new Error('offline'));
    render(<Host />);

    await waitFor(() => expect(fetchWeeklySummary).toHaveBeenCalled());
    expect(screen.queryByTestId('card-summary')).not.toBeInTheDocument();
  });
});
