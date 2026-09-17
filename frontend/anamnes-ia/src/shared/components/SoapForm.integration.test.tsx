import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/core/i18n';
import SoapForm from './SoapForm';

beforeEach(async () => { await i18n.changeLanguage('pt-BR'); });

it('includes a manually entered prescription in the submitted SOAP plan', async () => {
  const onSend = vi.fn().mockResolvedValue(undefined);
  render(<SoapForm onSend={onSend} initialValues={{ S: 'História', O: 'Observações', A: 'Avaliação', P: 'Retorno' }} />);
  await userEvent.click(screen.getByTitle(i18n.t('common:soap.add_medicine')));
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('common:prescription.label') }), { target: { value: 'Prescrição registrada pelo aluno' } });
  await userEvent.click(screen.getByRole('button', { name: i18n.t('common:prescription.confirm') }));
  await userEvent.click(screen.getByRole('button', { name: i18n.t('common:soap.send') }));
  expect(onSend).toHaveBeenCalledWith('S: História\nO: Observações\nA: Avaliação\nP: Retorno\nPrescrição registrada pelo aluno');
});
