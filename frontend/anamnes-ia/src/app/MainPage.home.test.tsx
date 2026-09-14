/**
 * SPEC-013 §8 — testes de render da home (T7.1–T7.7).
 * Só o que a lógica pura de `studyPlan.ts` não cobre; toda regra de negócio
 * é testada em `features/student/utils/studyPlan.test.ts`.
 *
 * Fase vermelha: a home ainda não tem os blocos da SPEC-013.
 *
 * Contrato de `data-testid` que a implementação precisa cumprir (travado aqui
 * de propósito — sem isso o teste de render vira adivinhação de texto):
 *   reco-empty · reco-card · card-streak · card-mastery · card-pending
 *   card-goal  · card-summary · pending-flashcards · resume-block (não deve existir)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import i18n from '@/core/i18n';
import type { StudentProfile } from '@/features/profile/types/profile';
import type { AvailableCase, DailyQuota } from '@/features/chat/services/studentService';

// ── Mocks de dependências pesadas ────────────────────────────────────────────
vi.mock('@/shared/components', () => ({
  MainMenu: () => null,
  TipsCarousel: () => null,
}));
vi.mock('@/features/chat', () => ({ ChatHistoryCarousel: () => null }));
vi.mock('@/features/auth', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Ana', email: 'a@x.com' } }) }));
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }));

const fetchRecommendedSimuladosMock = vi.fn();
vi.mock('@/features/simulados/services/simuladosService', () => ({
  fetchRecommendedSimulados: (...args: unknown[]) => fetchRecommendedSimuladosMock(...args),
}));

const authFetchMock = vi.fn<(input: unknown, init?: RequestInit) => Promise<Response>>();
vi.mock('@/core/utils/authFetch', () => ({
  authFetch: (input: unknown, init?: RequestInit) => authFetchMock(input, init),
}));

const fetchMyProfile = vi.fn<() => Promise<StudentProfile>>();
vi.mock('@/features/profile/services/profileService', () => ({ fetchMyProfile: () => fetchMyProfile() }));

const fetchAvailableCases = vi.fn<() => Promise<AvailableCase[]>>();
const fetchFreeCases = vi.fn<() => Promise<unknown[]>>();
const fetchDailyQuota = vi.fn<() => Promise<DailyQuota>>();
vi.mock('@/features/chat/services/studentService', () => ({
  fetchAvailableCases: () => fetchAvailableCases(),
  fetchFreeCases: () => fetchFreeCases(),
  fetchDailyQuota: () => fetchDailyQuota(),
}));

const fetchDecks = vi.fn<() => Promise<{ id: string; due_count: number }[]>>();
vi.mock('@/features/flashcards/services/flashcardService', () => ({ fetchDecks: () => fetchDecks() }));

import MainPage from './MainPage';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function emptyProfile(): StudentProfile {
  return {
    user: { id: 'u1', name: 'Ana', email: 'a@x.com', institution: null, role: 'student', user_type: null },
    stats: { total_attempts: 0, completed: 0, average_score: null, best_score: null, average_duration_seconds: null },
    by_specialty: [],
    weekly_scores: [],
    history: [],
    classes: [],
  };
}

function activeProfile(): StudentProfile {
  const p = emptyProfile();
  p.stats = { total_attempts: 4, completed: 3, average_score: 62, best_score: 80, average_duration_seconds: 900 };
  p.by_specialty = [{ specialty: 'cardiologia', attempts: 3, completed: 3, average_score: 52 }];
  p.history = [
    {
      attempt_id: 'h1', case_id: 'x1', case_title: 'Caso', specialty: 'cardiologia', difficulty: null,
      score: 52, feedback: null, status: 'completed', started_at: new Date().toISOString(),
      duration_seconds: 600, is_ai_chat: false,
    },
  ];
  return p;
}

function quota(regular_available = 3): DailyQuota {
  return {
    user_type: 'free', is_paid: false,
    ai_used: 0, ai_limit: 3, ai_available: 3,
    regular_used: 0, regular_limit: 3, regular_available,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderHome() {
  return render(
    <MemoryRouter>
      <MainPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authFetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
  fetchMyProfile.mockReset().mockResolvedValue(activeProfile());
  fetchAvailableCases.mockReset().mockResolvedValue([]);
  fetchFreeCases.mockReset().mockResolvedValue([]);
  fetchDailyQuota.mockReset().mockResolvedValue(quota());
  fetchDecks.mockReset().mockResolvedValue([]);
  fetchRecommendedSimuladosMock.mockReset().mockResolvedValue({ specialty: 'Cardiologia', items: [] });
});

afterEach(async () => {
  await i18n.changeLanguage('pt-BR');
});

// ─── T7 ──────────────────────────────────────────────────────────────────────

describe('MainPage — home plano de estudos (T7)', () => {
  it('T7.1: aluno zerado mostra o empty state e esconde streak, domínio e pendências', async () => {
    fetchMyProfile.mockResolvedValue(emptyProfile());
    renderHome();

    expect(await screen.findByTestId('reco-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('card-streak')).not.toBeInTheDocument();
    expect(screen.queryByTestId('card-mastery')).not.toBeInTheDocument();
    expect(screen.queryByTestId('card-pending')).not.toBeInTheDocument();
  });

  it('T7.2: due_count somado > 0 mostra o item de flashcards com o total; soma 0 esconde', async () => {
    fetchDecks.mockResolvedValue([{ id: 'd1', due_count: 4 }, { id: 'd2', due_count: 3 }]);
    const { unmount } = renderHome();
    expect(await screen.findByTestId('pending-flashcards')).toHaveTextContent('7');
    unmount();

    fetchDecks.mockResolvedValue([{ id: 'd1', due_count: 0 }]);
    renderHome();
    await waitFor(() => expect(fetchDecks).toHaveBeenCalled());
    expect(screen.queryByTestId('pending-flashcards')).not.toBeInTheDocument();
  });

  it('T7.3: cota esgotada desabilita os cards de recomendação', async () => {
    fetchDailyQuota.mockResolvedValue(quota(0));
    fetchFreeCases.mockResolvedValue([
      { id: 'f1', title: 'Caso livre', specialty: 'cardiologia', difficulty: 'Intermediário', summary: null, patient_prompt: '—', created_at: '2026-08-01T00:00:00' },
    ]);
    renderHome();

    const cards = await screen.findAllByTestId('reco-card');
    for (const card of cards) {
      expect(card).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('T7.4: com WEEKLY_SUMMARY_ENABLED = true a home busca e mostra o resumo da semana', async () => {
    // A flag ligada (2026-08-12) inverteu este teste: antes ele garantia que
    // *nenhuma* chamada partia da home. O caso desligado continua coberto em
    // `features/student/hooks/useWeeklySummary.test.tsx` (T9.2), que mocka a
    // constante — aqui só dá para observar o default real do app.
    authFetchMock.mockImplementation(async (url: unknown) =>
      /weekly-summary/.test(String(url))
        ? ({ ok: true, json: async () => ({ summary: 'Você concluiu 3 casos.' }) } as Response)
        : ({ ok: true, json: async () => ({}) } as Response),
    );
    renderHome();

    expect(await screen.findByTestId('card-summary')).toHaveTextContent('Você concluiu 3 casos.');
  });

  it('T7.4b: resumo vazio (semana sem atividade ou backend desligado) não renderiza o card', async () => {
    // authFetch default do beforeEach devolve `{}` → summary undefined.
    renderHome();
    await waitFor(() => expect(fetchMyProfile).toHaveBeenCalled());

    expect(screen.queryByTestId('card-summary')).not.toBeInTheDocument();
  });

  it('T7.4c: especialidade fraca com simulado pronto navega direto para execução', async () => {
    authFetchMock.mockImplementation(async (url: unknown) =>
      /weekly-summary/.test(String(url))
        ? ({
            ok: true,
            json: async () => ({
              summary: 'Resumo semanal',
              week: '2026-W37',
              cached: false,
              language: 'pt-BR',
              weak_specialties: [
                { specialty: 'Cardiologia', average_score: 42.5, attempts: 2 },
              ],
            }),
          } as Response)
        : ({ ok: true, json: async () => ({}) } as Response),
    );
    fetchRecommendedSimuladosMock.mockResolvedValue({
      specialty: 'Cardiologia',
      items: [{
        id: 'sim-1',
        title: 'Revisão de Cardiologia',
        description: null,
        specialty: 'Cardiologia',
        subspecialty: null,
        num_questions: 10,
        created_by: 't1',
        class_id: null,
        due_date: null,
        visibility: 'privado',
        created_at: '2026-09-07T10:00:00Z',
      }],
    });

    renderHome();
    expect(await screen.findByText('Resumo semanal')).toBeInTheDocument();
    const button = await screen.findByRole('button', { name: /Cardiologia/i });
    expect(screen.getByText('Resumo semanal')).toBeInTheDocument();
    await userEvent.click(button);

    expect(screen.getByTestId('location')).toHaveTextContent('/simulados/sim-1/run');
  });

  it('T7.4d: sem simulado pronto abre criação já filtrada pela especialidade fraca', async () => {
    authFetchMock.mockImplementation(async (url: unknown) =>
      /weekly-summary/.test(String(url))
        ? ({
            ok: true,
            json: async () => ({
              summary: 'Resumo semanal',
              week: '2026-W37',
              cached: false,
              language: 'pt-BR',
              weak_specialties: [
                { specialty: 'Cardiologia', average_score: 42.5, attempts: 2 },
              ],
            }),
          } as Response)
        : ({ ok: true, json: async () => ({}) } as Response),
    );
    fetchRecommendedSimuladosMock.mockRejectedValue(new Error('offline'));

    renderHome();
    expect(await screen.findByText('Resumo semanal')).toBeInTheDocument();
    const button = await screen.findByRole('button', { name: /Cardiologia/i });
    expect(screen.getByText('Resumo semanal')).toBeInTheDocument();
    await userEvent.click(button);

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/simulados?specialty=Cardiologia&intent=create',
    );
  });

  it('T7.5: nenhum bloco "Retomar" ou anel de progresso no DOM (SPEC-014 não existe ainda)', async () => {
    renderHome();
    await waitFor(() => expect(fetchMyProfile).toHaveBeenCalled());

    expect(screen.queryByTestId('resume-block')).not.toBeInTheDocument();
    expect(screen.queryByText(/retomar/i)).not.toBeInTheDocument();
  });

  it('T7.6: barras de progresso expõem role progressbar com aria-valuenow correto', async () => {
    const p = activeProfile();
    p.by_specialty = [{ specialty: 'cardiologia', attempts: 3, completed: 3, average_score: 52 }];
    fetchMyProfile.mockResolvedValue(p);
    renderHome();

    const bars = await screen.findAllByRole('progressbar');
    expect(bars.length).toBeGreaterThan(0);
    expect(bars.some(b => b.getAttribute('aria-valuenow') === '52')).toBe(true);
  });

  it('T7.8: perfil SOAP aparece com ≥3 tentativas avaliadas e some abaixo disso', async () => {
    const p = activeProfile();
    p.soap_profile = { attempts: 5, subjetivo: 71, objetivo: 58, avaliacao: 83, plano: 64 };
    fetchMyProfile.mockResolvedValue(p);
    const { unmount } = renderHome();

    const card = await screen.findByTestId('card-soap');
    expect(card).toHaveTextContent('71');
    expect(card).toHaveTextContent('58');
    unmount();

    // Menos de 3 avaliadas: a média é ruído, o bloco não renderiza (§6.8).
    const poucos = activeProfile();
    poucos.soap_profile = { attempts: 2, subjetivo: 71, objetivo: 58, avaliacao: 83, plano: 64 };
    fetchMyProfile.mockResolvedValue(poucos);
    renderHome();
    await waitFor(() => expect(fetchMyProfile).toHaveBeenCalled());
    expect(screen.queryByTestId('card-soap')).not.toBeInTheDocument();
  });

  it('T7.9: perfil sem soap_profile (backend antigo/tentativas pré-migration) não quebra a home', async () => {
    const p = activeProfile();
    delete p.soap_profile;
    fetchMyProfile.mockResolvedValue(p);
    renderHome();

    expect(await screen.findByTestId('card-mastery')).toBeInTheDocument();
    expect(screen.queryByTestId('card-soap')).not.toBeInTheDocument();
  });

  it('T7.7: em en não aparece texto pt-BR nos blocos novos', async () => {
    await i18n.changeLanguage('en');
    renderHome();
    await waitFor(() => expect(fetchMyProfile).toHaveBeenCalled());

    for (const pt of [/Sequência/i, /Meta da semana/i, /Recomendado pra você/i, /Pendências/i]) {
      expect(screen.queryByText(pt)).not.toBeInTheDocument();
    }
  });
});
