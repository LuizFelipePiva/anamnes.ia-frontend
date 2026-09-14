/**
 * SPEC-014 — grupo T12: visualizador de exames do aluno.
 *
 * T12.3 é a última linha de defesa do §6: mesmo que a API passasse a mandar o
 * achado, o DOM não pode exibi-lo. Por isso o mock devolve `credits` com um
 * texto perigoso — se algum campo livre for renderizado sem critério, o teste
 * pega.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Inicializa o singleton do i18next que o `useTranslation` dos componentes usa.
// Sem isto o DOM renderiza a chave crua e todo assert por texto falha.
import i18n from '@/core/i18n';

import type { StudentExam } from '../types/exams';

const fetchAttemptExams = vi.fn<() => Promise<StudentExam[]>>();
vi.mock('../services/examService', () => ({
  fetchAttemptExams: () => fetchAttemptExams(),
}));

const { default: ExamViewer } = await import('./ExamViewer');

const ATTEMPT_ID = '22222222-2222-4222-8222-222222222222';

const EXAMES: StudentExam[] = [
  {
    label: { key: 'exams.modality.radiografia', ordinal: 1 },
    url: 'https://x.local/rx1.webp',
    media_type: 'image',
    credits: null,
  },
  {
    label: { key: 'exams.modality.radiografia', ordinal: 2 },
    url: 'https://x.local/rx2.webp',
    media_type: 'image',
    credits: { author: 'Dr. Fulano', license: 'CC BY-SA 4.0' },
  },
];

// jsdom reporta o idioma do navegador como `en`; sem fixar pt-BR os asserts
// por texto testariam a tradução errada.
beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

beforeEach(() => {
  fetchAttemptExams.mockReset();
  fetchAttemptExams.mockResolvedValue(EXAMES);
});

describe('ExamViewer (T12)', () => {
  it('T12.1 — o botão só aparece quando o caso tem exames', async () => {
    fetchAttemptExams.mockResolvedValue([]);
    render(<ExamViewer attemptId={ATTEMPT_ID} />);

    // Espera o fetch resolver antes de concluir a ausência.
    await vi.waitFor(() => expect(fetchAttemptExams).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Exames complementares/ })).not.toBeInTheDocument();
  });

  it('T12.1 — com exames, o botão aparece', async () => {
    render(<ExamViewer attemptId={ATTEMPT_ID} />);
    expect(await screen.findByRole('button', { name: /Exames complementares/ })).toBeInTheDocument();
  });

  it('T12.2 — abrir mostra um item por exame, com rótulo neutro numerado', async () => {
    const user = userEvent.setup();
    render(<ExamViewer attemptId={ATTEMPT_ID} />);
    await user.click(await screen.findByRole('button', { name: /Exames complementares/ }));

    expect(screen.getByText('Radiografia 1')).toBeInTheDocument();
    expect(screen.getByText('Radiografia 2')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('T12.3 — o DOM renderizado não contém o diagnóstico', async () => {
    const user = userEvent.setup();
    // Cenário adversarial: a API "regrediu" e passou a mandar o achado.
    fetchAttemptExams.mockResolvedValue([
      {
        ...EXAMES[0],
        display_name: 'Radiografia — Pneumotórax',
        diagnosis_or_finding: 'Pneumotórax',
      } as unknown as StudentExam,
    ]);

    const { container } = render(<ExamViewer attemptId={ATTEMPT_ID} />);
    await user.click(await screen.findByRole('button', { name: /Exames complementares/ }));

    expect(screen.queryByText(/pneumotórax/i)).toBeNull();
    // `innerHTML` cobre também atributo (alt/title), que `queryByText` não vê.
    expect(container.innerHTML.toLowerCase()).not.toContain('pneumot');
  });

  it('T12.4 — asset com credits renderiza a atribuição', async () => {
    const user = userEvent.setup();
    render(<ExamViewer attemptId={ATTEMPT_ID} />);
    await user.click(await screen.findByRole('button', { name: /Exames complementares/ }));

    expect(screen.getByText(/Dr\. Fulano/)).toBeInTheDocument();
    expect(screen.getByText(/CC BY-SA 4\.0/)).toBeInTheDocument();
  });

  it('T12.5 — o alt da imagem é o rótulo neutro, nunca o diagnóstico', async () => {
    const user = userEvent.setup();
    render(<ExamViewer attemptId={ATTEMPT_ID} />);
    await user.click(await screen.findByRole('button', { name: /Exames complementares/ }));

    const alts = screen.getAllByRole('img').map(img => img.getAttribute('alt'));
    expect(alts).toEqual(['Radiografia 1', 'Radiografia 2']);
  });

  it('T12.6 — exame de áudio vira player, não imagem quebrada', async () => {
    const user = userEvent.setup();
    fetchAttemptExams.mockResolvedValue([
      {
        label: { key: 'exams.modality.ausculta_cardiaca', ordinal: null },
        url: 'https://x.local/ausc1.mp3',
        media_type: 'audio',
        credits: null,
      },
    ]);
    render(<ExamViewer attemptId={ATTEMPT_ID} />);
    await user.click(await screen.findByRole('button', { name: /Exames complementares/ }));

    // O modal vive no body (portal), então a busca parte do document.
    const player = document.querySelector('audio');
    expect(player).not.toBeNull();
    expect(player).toHaveAttribute('src', 'https://x.local/ausc1.mp3');
    expect(player).toHaveAttribute('controls');
    // Sem <img>: uma <img> apontando para .mp3 é o defeito que este teste trava.
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Ausculta cardíaca')).toBeInTheDocument();
  });

  it('T12.7 — o aria-label do player é o rótulo neutro, nunca o diagnóstico', async () => {
    const user = userEvent.setup();
    // De novo o cenário adversarial: player é mais um lugar por onde o nome do
    // asset — que é o gabarito — poderia sair.
    fetchAttemptExams.mockResolvedValue([
      {
        label: { key: 'exams.modality.ausculta_cardiaca', ordinal: null },
        url: 'https://x.local/ausc1.mp3',
        media_type: 'audio',
        credits: null,
        display_name: 'Ausculta — Sopro sistólico aórtico',
      } as unknown as StudentExam,
    ]);
    const { container } = render(<ExamViewer attemptId={ATTEMPT_ID} />);
    await user.click(await screen.findByRole('button', { name: /Exames complementares/ }));

    expect(document.querySelector('audio')).toHaveAttribute('aria-label', 'Ausculta cardíaca');
    expect(container.innerHTML.toLowerCase()).not.toContain('sopro');
    expect(document.body.innerHTML.toLowerCase()).not.toContain('sopro');
  });

  it('T12.8 — dois exames indistinguíveis renderizam os dois (chave por posição)', async () => {
    const user = userEvent.setup();
    // O aluno não recebe mais `id` — o identificador do acervo é falante e
    // vazava o diagnóstico. A chave de renderização passou a ser a posição, e é
    // este o caso que a quebraria: dois itens sem nada que os diferencie.
    const gemeo = {
      label: { key: 'exams.modality.radiografia', ordinal: 1 },
      url: 'https://x.local/mesma.webp',
      media_type: 'image' as const,
      credits: null,
    };
    fetchAttemptExams.mockResolvedValue([gemeo, { ...gemeo, label: { ...gemeo.label, ordinal: 2 } }]);
    render(<ExamViewer attemptId={ATTEMPT_ID} />);
    await user.click(await screen.findByRole('button', { name: /Exames complementares/ }));

    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('modalidade desconhecida cai no rótulo genérico', async () => {
    const user = userEvent.setup();
    fetchAttemptExams.mockResolvedValue([
      { ...EXAMES[0], label: { key: 'exams.modality.pet-ct', ordinal: null } },
    ]);
    render(<ExamViewer attemptId={ATTEMPT_ID} />);
    await user.click(await screen.findByRole('button', { name: /Exames complementares/ }));

    expect(screen.getByText('Exame complementar')).toBeInTheDocument();
  });

  // Regressão do defeito relatado em 2026-08-13: o modal abria deslocado e às
  // vezes atrás do SOAP. Causa: o header do chat usa `backdrop-blur`, que cria
  // bloco de contenção para descendentes `fixed` — o modal ficava preso na
  // faixa do header — e disputava `z-50` com o SOAP, que vence por vir depois
  // no DOM. Estilo não se testa, mas as duas condições que o consertam sim.
  it('o modal é montado no body, fora da árvore do componente (portal)', async () => {
    const user = userEvent.setup();
    const { container } = render(<ExamViewer attemptId={ATTEMPT_ID} />);
    await user.click(await screen.findByRole('button', { name: /Exames complementares/ }));

    const dialog = screen.getByRole('dialog');
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it('o modal fica acima do SOAP na ordem de empilhamento', async () => {
    const user = userEvent.setup();
    render(<ExamViewer attemptId={ATTEMPT_ID} />);
    await user.click(await screen.findByRole('button', { name: /Exames complementares/ }));

    // O SOAP usa `z-50`; empatar significaria perder para ele.
    expect(screen.getByRole('dialog').className).toContain('z-[60]');
  });

  it('Esc fecha o modal', async () => {
    const user = userEvent.setup();
    render(<ExamViewer attemptId={ATTEMPT_ID} />);
    await user.click(await screen.findByRole('button', { name: /Exames complementares/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clicar no fundo fecha o modal, clicar no conteúdo não', async () => {
    const user = userEvent.setup();
    render(<ExamViewer attemptId={ATTEMPT_ID} />);
    await user.click(await screen.findByRole('button', { name: /Exames complementares/ }));

    await user.click(screen.getByText('Radiografia 1'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('falha ao carregar não mostra botão nem erro na tela', async () => {
    fetchAttemptExams.mockRejectedValue(new Error('boom'));
    render(<ExamViewer attemptId={ATTEMPT_ID} />);

    await vi.waitFor(() => expect(fetchAttemptExams).toHaveBeenCalled());
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
