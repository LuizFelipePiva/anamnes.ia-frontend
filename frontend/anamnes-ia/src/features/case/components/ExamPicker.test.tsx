/**
 * SPEC-014 — grupo T11: seletor de exames do professor.
 *
 * O catálogo vem mockado no nível do service: o que se testa aqui é a seleção
 * e o limite, não o transporte HTTP (esse é do pytest e do E2E).
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Inicializa o singleton do i18next que o `useTranslation` dos componentes usa.
// Sem isto o DOM renderiza a chave crua e todo assert por texto falha.
import i18n from '@/core/i18n';

import type { MedicalAsset } from '../types/exams';
import { MAX_EXAMS_PER_CASE } from '../utils/examLabel';

const fetchMedicalAssets = vi.fn<() => Promise<MedicalAsset[]>>();
vi.mock('../services/examService', () => ({
  fetchMedicalAssets: () => fetchMedicalAssets(),
}));

// Import depois do mock — o componente resolve o service no import.
const { default: ExamPicker } = await import('./ExamPicker');

function makeAsset(overrides: Partial<MedicalAsset> = {}): MedicalAsset {
  return {
    id: 'RX-PNEUMO-001',
    modality: 'radiografia',
    display_name: 'Radiografia de tórax — Pneumotórax',
    diagnosis_or_finding: 'Pneumotórax',
    url: null,
    media_type: 'image',
    tags: ['tórax'],
    attachment_eligible: true,
    credits: null,
    license: null,
    source_url: null,
    ...overrides,
  };
}

const CATALOGO = [
  makeAsset(),
  makeAsset({
    id: 'ECG-FA-001', modality: 'ecg',
    display_name: 'ECG — Fibrilação atrial',
    diagnosis_or_finding: 'Fibrilação atrial',
    tags: ['arritmia'],
  }),
  makeAsset({ id: 'GASO-001', modality: 'gasometria', attachment_eligible: false,
              display_name: 'Gasometria — Acidose' }),
];

// jsdom reporta o idioma do navegador como `en`; sem fixar pt-BR os asserts
// por texto testariam a tradução errada.
beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

beforeEach(() => {
  fetchMedicalAssets.mockReset();
  fetchMedicalAssets.mockResolvedValue(CATALOGO);
});

describe('ExamPicker (T11)', () => {
  it('T11.1 — renderiza os assets elegíveis vindos do service', async () => {
    render(<ExamPicker onSave={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByText(/Pneumotórax/)).toBeInTheDocument();
    expect(screen.getByText(/Fibrilação atrial/)).toBeInTheDocument();
    // Inelegível não aparece: o filtro é do `filterAssets`, mas quem regride é aqui.
    expect(screen.queryByText(/Acidose/)).not.toBeInTheDocument();
  });

  it('T11.2 — digitar no campo de busca filtra a lista exibida', async () => {
    const user = userEvent.setup();
    render(<ExamPicker onSave={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText(/Pneumotórax/);

    await user.type(screen.getByRole('textbox'), 'fibrilacao');

    await waitFor(() => {
      expect(screen.queryByText(/Pneumotórax/)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Fibrilação atrial/)).toBeInTheDocument();
  });

  it('T11.3 — selecionar marca; selecionar de novo desmarca', async () => {
    const user = userEvent.setup();
    render(<ExamPicker onSave={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText(/Pneumotórax/);

    const item = screen.getByText(/Pneumotórax/).closest('button')!;
    expect(item).toHaveAttribute('aria-pressed', 'false');

    await user.click(item);
    expect(item).toHaveAttribute('aria-pressed', 'true');

    await user.click(item);
    expect(item).toHaveAttribute('aria-pressed', 'false');
  });

  it('T11.4 — no limite, os não selecionados desabilitam e o aviso aparece', async () => {
    const cheio = Array.from({ length: MAX_EXAMS_PER_CASE + 1 }, (_, i) =>
      makeAsset({ id: `RX-${i}`, display_name: `Radiografia ${i}` }),
    );
    fetchMedicalAssets.mockResolvedValue(cheio);

    const jaSelecionados = cheio.slice(0, MAX_EXAMS_PER_CASE).map(a => a.id);
    render(<ExamPicker initialSelectedIds={jaSelecionados} onSave={vi.fn()} onClose={vi.fn()} />);

    const excedente = await screen.findByText(`Radiografia ${MAX_EXAMS_PER_CASE}`);
    expect(excedente.closest('button')).toBeDisabled();
    expect(screen.getByText(/Limite de 8 exames/)).toBeInTheDocument();

    // Desmarcar precisa continuar possível, senão o professor fica preso.
    expect(screen.getByText('Radiografia 0').closest('button')).not.toBeDisabled();
  });

  it('T11.5 — salvar entrega os IDs na ordem de seleção', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ExamPicker onSave={onSave} onClose={vi.fn()} />);
    await screen.findByText(/Pneumotórax/);

    // Ordem inversa à do catálogo, de propósito: é ela que vira `position`.
    await user.click(screen.getByText(/Fibrilação atrial/).closest('button')!);
    await user.click(screen.getByText(/Pneumotórax/).closest('button')!);
    await user.click(screen.getByRole('button', { name: /Salvar exames/ }));

    expect(onSave).toHaveBeenCalledWith(['ECG-FA-001', 'RX-PNEUMO-001']);
  });

  it('T11.6 — clicar na miniatura abre o preview e não altera a seleção', async () => {
    const user = userEvent.setup();
    fetchMedicalAssets.mockResolvedValue([
      makeAsset({ url: 'https://cdn.test/rx.png' }),
    ]);
    render(<ExamPicker onSave={vi.fn()} onClose={vi.fn()} />);

    const item = (await screen.findByText(/Pneumotórax/)).closest('button')!;
    await user.click(screen.getByRole('button', { name: /Visualizar/ }));

    // Ampliar não é selecionar.
    expect(item).toHaveAttribute('aria-pressed', 'false');
    // A miniatura também é uma `img` com o mesmo `alt` — busca ancorada no modal.
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('img', { name: /Pneumotórax/ })).toHaveAttribute(
      'src', 'https://cdn.test/rx.png',
    );
  });

  it('T11.7 — selecionar de dentro do preview marca o item e fecha o modal', async () => {
    const user = userEvent.setup();
    fetchMedicalAssets.mockResolvedValue([
      makeAsset({ url: 'https://cdn.test/rx.png' }),
    ]);
    render(<ExamPicker onSave={vi.fn()} onClose={vi.fn()} />);

    const item = (await screen.findByText(/Pneumotórax/)).closest('button')!;
    await user.click(screen.getByRole('button', { name: /Visualizar/ }));
    await user.click(screen.getByRole('button', { name: 'Selecionar exame' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(item).toHaveAttribute('aria-pressed', 'true');
  });

  it('T11.8 — asset de áudio abre um player, e a miniatura não é imagem', async () => {
    const user = userEvent.setup();
    fetchMedicalAssets.mockResolvedValue([
      makeAsset({
        id: 'AUSC-001', modality: 'ausculta_cardiaca',
        display_name: 'Ausculta cardíaca — Sopro sistólico',
        diagnosis_or_finding: 'Sopro sistólico',
        url: 'https://cdn.test/ausc.mp3', media_type: 'audio',
      }),
    ]);
    render(<ExamPicker onSave={vi.fn()} onClose={vi.fn()} />);
    // Pelo diagnóstico: "Ausculta cardíaca" sozinho casa também com o rótulo de
    // modalidade no card e com a opção do filtro.
    await screen.findByText(/Sopro sistólico/);

    // Nada de <img> no card: apontar uma <img> para o .mp3 renderiza o ícone de
    // imagem quebrada e passa a impressão de asset defeituoso.
    expect(screen.queryByRole('img')).toBeNull();

    // "Ouvir", não "Visualizar" — quem depende de leitor de tela é justamente
    // quem mais precisa saber que o exame é sonoro.
    await user.click(screen.getByRole('button', { name: /Ouvir/ }));

    const dialog = screen.getByRole('dialog');
    const player = dialog.querySelector('audio');
    expect(player).not.toBeNull();
    expect(player).toHaveAttribute('src', 'https://cdn.test/ausc.mp3');
    expect(player).toHaveAttribute('controls');
  });

  it('falha ao carregar o catálogo não quebra a tela', async () => {
    fetchMedicalAssets.mockRejectedValue(new Error('boom'));
    render(<ExamPicker onSave={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText(/Nenhum exame encontrado/)).toBeInTheDocument();
  });
});
