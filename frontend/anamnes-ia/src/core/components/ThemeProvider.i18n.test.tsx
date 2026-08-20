import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import i18n from '@/core/i18n';
import { ThemeProvider } from './ThemeProvider';
import { usePreferences } from './themePreferences';

function Probe() {
  const { lang } = usePreferences();
  return <span data-testid="lang">{lang}</span>;
}

describe('ThemeProvider — sincronização de idioma (T12)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('perfil prevalece sobre localStorage no login e sincroniza i18next + <html lang>', async () => {
    localStorage.setItem('prefs_u1_lang', 'pt-BR');

    const { getByTestId } = render(
      <ThemeProvider userId="u1" profileLang="en">
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId('lang').textContent).toBe('en');
    await waitFor(() => {
      expect(document.documentElement.lang).toBe('en');
      expect(i18n.language).toBe('en');
    });
  });

  it('usa localStorage quando não há idioma de perfil', async () => {
    localStorage.setItem('prefs_u2_lang', 'es');

    const { getByTestId } = render(
      <ThemeProvider userId="u2" profileLang={null}>
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId('lang').textContent).toBe('es');
    await waitFor(() => expect(document.documentElement.lang).toBe('es'));
  });
});
