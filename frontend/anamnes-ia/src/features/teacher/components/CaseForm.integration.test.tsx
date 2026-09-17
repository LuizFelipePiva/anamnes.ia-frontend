import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/core/i18n';
import type { CaseInfo } from '../types/teacher';
import { updateCase } from '../services/teacherService';
import { fetchCaseExams, saveCaseExams } from '@/features/case';
import CaseForm from './CaseForm';

vi.mock('../services/teacherService', () => ({ createCase: vi.fn(), updateCase: vi.fn(), assignCase: vi.fn() }));
vi.mock('@/features/case', () => ({
  fetchCaseExams: vi.fn(), saveCaseExams: vi.fn(),
  ExamPicker: ({ onSave }: { onSave: (ids: string[]) => void }) => <button onClick={() => onSave(['asset-1'])}>SELECT_ASSET</button>,
}));

const existing: CaseInfo = {
  id: 'case-1', teacher_id: 'teacher-1', title: 'Paciente', specialty: 'Cardiologia',
  difficulty: 'Intermediário', summary: 'Resumo', patient_prompt: 'Prompt do paciente',
  published: true, visibility: 'turma', available_until: null, created_at: null, updated_at: null,
  form_data: { patologia: 'Diagnóstico reservado', queixa_principal: 'Queixa', persona_nome: 'Paciente',
    exame_fisico: 'Achado físico do professor', exames: 'ECG', especialidade: 'Cardiologia' },
};
const label = (key: string) => i18n.t(`teacher:caseForm.${key}` as never) as string;

beforeEach(async () => {
  vi.resetAllMocks();
  await i18n.changeLanguage('pt-BR');
  vi.mocked(fetchCaseExams).mockResolvedValue([]);
  vi.mocked(updateCase).mockResolvedValue(existing);
  vi.mocked(saveCaseExams).mockResolvedValue([]);
});

function mount() {
  const onCaseCreated = vi.fn();
  render(<CaseForm editingCase={existing} classes={[]} onCaseCreated={onCaseCreated} onClose={vi.fn()} showToast={vi.fn()} />);
  return onCaseCreated;
}

describe('integration of local cases and ZIP evaluation', () => {
  it('edits an older case while preserving physical findings and adding SOAP weights', async () => {
    const onCaseCreated = mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: label('back_to_form') }));
    const weights = screen.getAllByRole('spinbutton');
    [40, 30, 20, 10].forEach((value, i) => fireEvent.change(weights[i], { target: { value: String(value) } }));
    await user.click(screen.getByRole('button', { name: label('generate_prompt') }));
    await user.click(screen.getByRole('button', { name: label('save_case') }));
    await waitFor(() => expect(onCaseCreated).toHaveBeenCalled());
    expect(updateCase).toHaveBeenCalledWith('case-1', expect.objectContaining({
      form_data: expect.objectContaining({ exame_fisico: 'Achado físico do professor', exames: 'ECG', soap_weights: { S: 40, O: 30, A: 20, P: 10 } }),
    }));
  });

  it('does not erase attachments when their initial load fails', async () => {
    vi.mocked(fetchCaseExams).mockRejectedValue(new Error('offline'));
    mount();
    await waitFor(() => expect(fetchCaseExams).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: label('save_case') }));
    await waitFor(() => expect(updateCase).toHaveBeenCalled());
    expect(saveCaseExams).not.toHaveBeenCalled();
  });

  it('persists selected media alongside the local form fields', async () => {
    mount();
    await userEvent.click(screen.getByRole('button', { name: i18n.t('case:exams.picker.attach') }));
    await userEvent.click(screen.getByRole('button', { name: 'SELECT_ASSET' }));
    await userEvent.click(screen.getByRole('button', { name: label('save_case') }));
    await waitFor(() => expect(saveCaseExams).toHaveBeenCalledWith('case-1', ['asset-1']));
  });
});
