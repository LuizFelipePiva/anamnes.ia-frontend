import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/core/i18n';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SummaryCard from './SummaryCard';

describe('SummaryCard training CTA', () => {
  beforeEach(async () => { await i18n.changeLanguage('pt-BR'); });
  it('preserva o texto e chama onTrain para especialidade fraca', async () => {
    const onTrain = vi.fn();
    render(
      <SummaryCard
        summary="Revise Cardiologia nesta semana."
        weakSpecialty="Cardiologia"
        trainingMode="recommended"
        onTrain={onTrain}
      />,
    );

    expect(screen.getByText('Revise Cardiologia nesta semana.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Cardiologia/i }));
    expect(onTrain).toHaveBeenCalledTimes(1);
  });

  it('não renderiza CTA sem especialidade fraca', () => {
    render(<SummaryCard summary="Texto" weakSpecialty={null} trainingMode={null} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('mantém resumo visível enquanto recomendação ainda está carregando', () => {
    render(<SummaryCard summary="Texto" weakSpecialty="Cardiologia" trainingMode={null} />);
    expect(screen.getByText('Texto')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
