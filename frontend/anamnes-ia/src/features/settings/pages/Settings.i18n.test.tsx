import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/core/components';

// ── Mocks das dependências pesadas/externas ──────────────────────────────────
vi.mock('@/shared/components', () => ({ MainMenu: () => null }));
vi.mock('@/features/auth', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'a@x.com' } }) }));
vi.mock('@/config/env', () => ({ config: { apiUrl: 'http://api.test/api' } }));

const authFetchMock = vi.fn<(input: unknown, init?: RequestInit) => Promise<Response>>();
vi.mock('@/core/utils', () => ({ authFetch: (input: unknown, init?: RequestInit) => authFetchMock(input, init) }));

import Settings from './Settings';

function renderSettings() {
  return render(
    <MemoryRouter>
      <ThemeProvider userId="u1">
        <Settings />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

async function openLanguageTabAndSelect(label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /Idioma/i }));
  await user.click(screen.getByRole('button', { name: new RegExp(label, 'i') }));
  return user;
}

describe('Settings — seletor de idioma (T10, T11, T13)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Fixa o idioma base em pt-BR (jsdom reporta navigator.language = en-US),
    // para que os rótulos das abas fiquem determinísticos.
    localStorage.setItem('prefs_u1_lang', 'pt-BR');
    authFetchMock.mockReset();
    authFetchMock.mockResolvedValue({ ok: true } as Response);
  });

  it('T10: selecionar Español persiste em localStorage e no perfil (PUT)', async () => {
    renderSettings();
    await openLanguageTabAndSelect('Español');

    expect(localStorage.getItem('prefs_u1_lang')).toBe('es');
    await waitFor(() => expect(authFetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = authFetchMock.mock.calls[0];
    expect(url).toContain('/profile/me');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(init?.body as string)).toEqual({ language: 'es' });
  });

  it('T13: aviso "em desenvolvimento" aparece ao escolher en/es', async () => {
    renderSettings();
    await openLanguageTabAndSelect('English');
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  });

  it('T11: falha na API não desfaz a troca local', async () => {
    authFetchMock.mockRejectedValueOnce(new Error('network down'));
    renderSettings();
    await openLanguageTabAndSelect('Español');

    // troca local mantida mesmo com o PUT falhando
    expect(localStorage.getItem('prefs_u1_lang')).toBe('es');
    expect(document.documentElement.lang).toBe('es');
  });
});
