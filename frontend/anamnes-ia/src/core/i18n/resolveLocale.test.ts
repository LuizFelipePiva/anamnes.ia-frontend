import { describe, it, expect } from 'vitest';
import { normalizeLocale, resolveLocale, detectInitialLang, dirFor } from './resolveLocale';

// T6 — mapeamento de locale bruto → idioma suportado
describe('normalizeLocale / resolveLocale (T6)', () => {
  it('mapeia variantes conhecidas', () => {
    expect(resolveLocale('en-US')).toBe('en');
    expect(resolveLocale('es-MX')).toBe('es');
    expect(resolveLocale('pt-PT')).toBe('pt-BR');
    expect(resolveLocale('pt-BR')).toBe('pt-BR');
    expect(resolveLocale('ru')).toBe('ru');
    expect(resolveLocale('ru-RU')).toBe('ru');
  });

  it('cai no fallback pt-BR para idiomas não suportados', () => {
    expect(resolveLocale('fr-FR')).toBe('pt-BR');
    expect(resolveLocale('')).toBe('pt-BR');
    expect(resolveLocale(null)).toBe('pt-BR');
  });

  it('normalizeLocale retorna null quando não há correspondência', () => {
    expect(normalizeLocale('fr-FR')).toBeNull();
    expect(normalizeLocale('de')).toBeNull();
    expect(normalizeLocale('en-GB')).toBe('en');
  });

  // SPEC-008 §9.6 — casa subtag, não prefixo de string
  it('não confunde idioma distinto que começa com o mesmo prefixo', () => {
    expect(normalizeLocale('rue')).toBeNull(); // russino ≠ russo
    expect(normalizeLocale('enm')).toBeNull(); // inglês médio ≠ inglês
    expect(normalizeLocale('esu')).toBeNull(); // yupik central ≠ espanhol
    expect(normalizeLocale('ptt')).toBeNull(); // enrekang ≠ português
  });

  it('aceita separador POSIX, espaços e caixa alta', () => {
    expect(normalizeLocale('pt_BR')).toBe('pt-BR');
    expect(normalizeLocale('  EN-us  ')).toBe('en');
  });

  it('ignora tags de uso privado e grandfathered irregulares', () => {
    expect(normalizeLocale('x-pirate')).toBeNull();
    expect(normalizeLocale('i-klingon')).toBeNull();
    expect(normalizeLocale('-')).toBeNull();
  });

  it('resolve códigos ISO 639 legados para o canônico', () => {
    // iw→he e in→id não são suportados, mas não podem casar por acidente:
    // o ponto é que a normalização acontece antes da comparação.
    expect(normalizeLocale('iw-IL')).toBeNull();
    expect(normalizeLocale('in-ID')).toBeNull();
  });

  it('ignora script e região ao casar idioma sem variantes de script', () => {
    expect(normalizeLocale('ru-Cyrl-RU')).toBe('ru');
    expect(normalizeLocale('es-419')).toBe('es');
  });
});

// SPEC-008 §9.7 — direção derivada do ICU
describe('dirFor (SPEC-008 §9.7)', () => {
  it('os 4 idiomas suportados são ltr', () => {
    for (const lang of ['pt-BR', 'en', 'es', 'ru']) expect(dirFor(lang)).toBe('ltr');
  });

  it('reconhece idiomas RTL não suportados hoje', () => {
    expect(dirFor('ar')).toBe('rtl');
    expect(dirFor('he-IL')).toBe('rtl');
    expect(dirFor('fa')).toBe('rtl');
  });

  it('cai em ltr para entrada vazia ou malformada', () => {
    expect(dirFor(null)).toBe('ltr');
    expect(dirFor('')).toBe('ltr');
    expect(dirFor('não é uma tag')).toBe('ltr');
  });
});

// T7 / T12 — precedência: perfil > localStorage > navegador > fallback
describe('detectInitialLang (T7, T12)', () => {
  it('perfil prevalece sobre localStorage e navegador', () => {
    expect(
      detectInitialLang({ profileLang: 'en', storedLang: 'pt-BR', navigatorLangs: ['es-ES'] }),
    ).toBe('en');
  });

  it('localStorage vence o navegador quando não há perfil', () => {
    expect(
      detectInitialLang({ profileLang: null, storedLang: 'es', navigatorLangs: ['en-US'] }),
    ).toBe('es');
  });

  it('usa o navegador quando não há perfil nem localStorage', () => {
    expect(
      detectInitialLang({ storedLang: null, navigatorLangs: ['en-US', 'pt-BR'] }),
    ).toBe('en');
  });

  it('fallback pt-BR quando nada casa', () => {
    expect(detectInitialLang({ navigatorLangs: ['fr-FR', 'de-DE'] })).toBe('pt-BR');
    expect(detectInitialLang({})).toBe('pt-BR');
  });
});
