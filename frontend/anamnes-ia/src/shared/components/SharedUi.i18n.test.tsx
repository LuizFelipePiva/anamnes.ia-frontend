// SPEC-007 — Fase 1.5: a UI compartilhada (`app`/`shared`/`core`) ficou fora da
// migração por feature e seguia em pt-BR fixo. Estes testes travam a regressão.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import i18n from '@/core/i18n';
import { specialtyLabel, SPECIALTIES } from '@/shared/utils/specialties';

// O jsdom não implementa matchMedia nem IntersectionObserver, e o
// embla-carousel (TipsCarousel) exige ambos na montagem. Stubs mínimos:
// nenhuma media query casa e nada é observado.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
vi.stubGlobal('IntersectionObserver', NoopObserver);
vi.stubGlobal('ResizeObserver', NoopObserver);
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Ana Souza', email: 'ana@x.com', role: 'student' },
    logout: vi.fn(),
  }),
}));

import MainMenu from './MainMenu';
import TipsCarousel from './TipsCarousel';
import SoapForm from './SoapForm';

function renderIn(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('UI compartilhada — i18n (SPEC-007 Fase 1.5)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt-BR');
  });

  describe('MainMenu', () => {
    it('renderiza os rótulos do menu em pt-BR', () => {
      renderIn(<MainMenu mobile />);
      // No mobile os itens só aparecem com o dropdown aberto; o nome do usuário
      // vem do mock e é sempre visível.
      expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    });

    it('traduz os rótulos ao mudar para inglês', async () => {
      const { unmount } = renderIn(<MainMenu />);
      expect(screen.getByTitle('Início')).toBeInTheDocument();
      expect(screen.getByTitle('Configurações')).toBeInTheDocument();
      unmount();

      await i18n.changeLanguage('en');
      renderIn(<MainMenu />);
      expect(screen.getByTitle('Home')).toBeInTheDocument();
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
      expect(screen.queryByTitle('Configurações')).not.toBeInTheDocument();
    });

    it('traduz o item de logout em espanhol', async () => {
      await i18n.changeLanguage('es');
      renderIn(<MainMenu />);
      expect(screen.getByTitle('Salir')).toBeInTheDocument();
    });
  });

  describe('TipsCarousel', () => {
    it('renderiza título e dicas em pt-BR', () => {
      renderIn(<TipsCarousel />);
      expect(screen.getByText('DICAS CLÍNICAS')).toBeInTheDocument();
      expect(screen.getByText('Método OPQA')).toBeInTheDocument();
    });

    it('traduz título e dicas em inglês', async () => {
      await i18n.changeLanguage('en');
      renderIn(<TipsCarousel />);
      expect(screen.queryByText('DICAS CLÍNICAS')).not.toBeInTheDocument();
      expect(screen.getByText('CLINICAL TIPS')).toBeInTheDocument();
      expect(screen.getByText('OPQA method')).toBeInTheDocument();
      expect(screen.getByText('Patient context')).toBeInTheDocument();
    });
  });

  describe('SoapForm', () => {
    it('rotula os quatro campos SOAP em pt-BR', () => {
      renderIn(<SoapForm onSend={vi.fn()} />);
      expect(screen.getByText('Subjetivo')).toBeInTheDocument();
      expect(screen.getByText('Objetivo')).toBeInTheDocument();
      expect(screen.getByText('Avaliação')).toBeInTheDocument();
      expect(screen.getByText('Plano')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Informações subjetivas...')).toBeInTheDocument();
    });

    it('traduz rótulos e placeholders em espanhol', async () => {
      await i18n.changeLanguage('es');
      renderIn(<SoapForm onSend={vi.fn()} />);
      expect(screen.getByText('Subjetivo')).toBeInTheDocument();
      expect(screen.getByText('Evaluación')).toBeInTheDocument();
      expect(screen.queryByText('Avaliação')).not.toBeInTheDocument();
    });

    it('a sigla SOAP não é traduzida', async () => {
      await i18n.changeLanguage('en');
      renderIn(<SoapForm onSend={vi.fn()} />);
      expect(screen.getByRole('heading', { name: 'SOAP' })).toBeInTheDocument();
    });
  });

  describe('specialtyLabel', () => {
    it('traduz o rótulo mas preserva a chave canônica do banco', async () => {
      expect(specialtyLabel('Clínica Geral')).toBe('Clínica Geral');
      await i18n.changeLanguage('en');
      expect(specialtyLabel('Clínica Geral')).toBe('General Practice');
      await i18n.changeLanguage('es');
      expect(specialtyLabel('Urgência e Emergência')).toBe('Urgencias y Emergencias');

      // A key nunca muda — é o valor gravado/consultado no banco (D5)
      expect(SPECIALTIES.map(s => s.key)).toContain('Clínica Geral');
      expect(SPECIALTIES.map(s => s.key)).toContain('Urgência e Emergência');
    });

    it('resolve aliases legados', async () => {
      await i18n.changeLanguage('en');
      expect(specialtyLabel('Clínica')).toBe('General Practice');
      expect(specialtyLabel('Emergência')).toBe('Emergency Medicine');
    });

    it('especialidade fora da lista cai no próprio valor do banco', async () => {
      await i18n.changeLanguage('en');
      expect(specialtyLabel('Reumatologia')).toBe('Reumatologia');
    });

    it('todas as 14 especialidades têm tradução nos três idiomas', async () => {
      for (const lang of ['pt-BR', 'en', 'es'] as const) {
        await i18n.changeLanguage(lang);
        for (const spec of SPECIALTIES) {
          const label = specialtyLabel(spec.key);
          expect(label, `${spec.key} em ${lang}`).toBeTruthy();
          expect(label).not.toContain('specialties.');
        }
      }
    });
  });
});
