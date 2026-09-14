import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const fetchFilterOptions = vi.fn();
const countAvailableQuestions = vi.fn();
const fetchSimulados = vi.fn();
const fetchMyAttempts = vi.fn();
const createSimulado = vi.fn();

vi.mock('@/shared/components', () => ({ MainMenu: () => null }));
vi.mock('../services/simuladosService', () => ({
  fetchFilterOptions: (...args: unknown[]) => fetchFilterOptions(...args),
  countAvailableQuestions: (...args: unknown[]) => countAvailableQuestions(...args),
  fetchSimulados: (...args: unknown[]) => fetchSimulados(...args),
  fetchMyAttempts: (...args: unknown[]) => fetchMyAttempts(...args),
  createSimulado: (...args: unknown[]) => createSimulado(...args),
}));

import { SimuladosListPage } from './SimuladosListPage';

function renderPage(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/simulados" element={<SimuladosListPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchFilterOptions.mockReset().mockResolvedValue({
    specialties: ['Cardiologia', 'Neurologia'],
    temas_por_especialidade: {
      Cardiologia: ['Arritmias'],
      Neurologia: ['AVC'],
    },
    bancas: [],
    subtemas: [],
    anos: [],
  });
  countAvailableQuestions.mockReset().mockResolvedValue({ count: 20 });
  fetchSimulados.mockReset().mockResolvedValue([]);
  fetchMyAttempts.mockReset().mockResolvedValue([]);
  createSimulado.mockReset();

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(performance.now() + 1000);
    return 1;
  });
});

describe('SimuladosListPage — prefill por query params', () => {
  it('pré-seleciona uma especialidade válida e abre ajustes gerais para intent=create', async () => {
    renderPage('/simulados?specialty=Cardiologia&intent=create');

    expect(await screen.findByText('Cardiologia', { selector: '.sl-fchip' })).toBeInTheDocument();
    expect(await screen.findByText('Ajustes gerais', { selector: '.sl-p-title' })).toBeInTheDocument();
    await waitFor(() => {
      expect(countAvailableQuestions).toHaveBeenCalledWith(
        expect.objectContaining({ specialties: ['Cardiologia'] }),
      );
    });
  });

  it('ignora specialty que não existe nas opções retornadas pelo banco', async () => {
    renderPage('/simulados?specialty=EspecialidadeInexistente&intent=create');

    await waitFor(() => expect(fetchFilterOptions).toHaveBeenCalled());
    expect(screen.queryByText('EspecialidadeInexistente')).not.toBeInTheDocument();
    expect(countAvailableQuestions).not.toHaveBeenCalledWith(
      expect.objectContaining({ specialties: ['EspecialidadeInexistente'] }),
    );
  });
});
