import { describe, it, expect } from 'vitest';
import i18next from 'i18next';
import {
  PLURAL_SUFFIXES,
  baseKey,
  pluralSuffix,
  pluralCategories,
  reachableCategories,
  allowedSuffixes,
  requiredSuffixes,
  validatePlurals,
} from './plurals';

// SPEC-008 RF5 — formas plurais válidas por idioma, derivadas de Intl.PluralRules.

describe('chave-base e sufixo (RF4)', () => {
  it('remove o sufixo de plural, inclusive _zero', () => {
    expect(baseKey('days_one')).toBe('days');
    expect(baseKey('days_few')).toBe('days');
    expect(baseKey('days_many')).toBe('days');
    expect(baseKey('days_other')).toBe('days');
    expect(baseKey('days_two')).toBe('days');
    expect(baseKey('days_zero')).toBe('days');
  });

  it('preserva chave sem sufixo de plural', () => {
    expect(baseKey('login.submit')).toBe('login.submit');
    expect(baseKey('cases.total')).toBe('cases.total');
  });

  it('pluralSuffix devolve o sufixo ou null', () => {
    expect(pluralSuffix('days_few')).toBe('few');
    expect(pluralSuffix('login.submit')).toBeNull();
  });

  it('PLURAL_SUFFIXES cobre as seis categorias do CLDR', () => {
    expect([...PLURAL_SUFFIXES].sort()).toEqual(['few', 'many', 'one', 'other', 'two', 'zero']);
  });
});

// D7 — Intl.PluralRules depende do ICU do runtime. Node com small-icu degrada as
// categorias de idiomas não-ingleses e tornaria todo o RF5 um falso negativo.
// Melhor quebrar aqui, explicitamente, do que aprovar dicionário quebrado.
describe('ambiente (D7)', () => {
  it('o Node em uso tem ICU completo (ru declara "few")', () => {
    expect(pluralCategories('ru')).toContain('few');
  });
});

describe('categorias alcançáveis (RF5b)', () => {
  it('pt-BR e es declaram "many" no CLDR mas não o alcançam com inteiros', () => {
    // "many" é a forma de números compactos ("1 milhão"), que a UI não usa.
    expect(pluralCategories('pt-BR')).toContain('many');
    expect([...reachableCategories('pt-BR')].sort()).toEqual(['one', 'other']);
    expect([...reachableCategories('es')].sort()).toEqual(['one', 'other']);
  });

  it('ru alcança one/few/many por inteiros — "other" só em fracionários', () => {
    expect([...reachableCategories('ru')].sort()).toEqual(['few', 'many', 'one']);
    expect([...reachableCategories('ru', { fractions: true })].sort()).toEqual([
      'few',
      'many',
      'one',
      'other',
    ]);
  });

  it('cs/sk/lt só alcançam "many" com decimais (D9)', () => {
    for (const lang of ['cs', 'sk', 'lt']) {
      expect([...reachableCategories(lang)]).not.toContain('many');
      expect([...reachableCategories(lang, { fractions: true })]).toContain('many');
    }
  });

  it('a varredura vai até 200 por padrão e o limite é parametrizável', () => {
    // Medido em 2026-07-30: nenhum dos idiomas avaliados distingue 100 de 200 —
    // em ro, "few" já é alcançado por n=0. 200 é margem, não necessidade.
    expect(reachableCategories('ro', { max: 200 })).toEqual(reachableCategories('ro'));
    expect([...reachableCategories('ro', { max: 0 })]).toEqual(['few']);
  });

  it('requiredSuffixes = alcançáveis por inteiros + "other" como rede', () => {
    expect([...requiredSuffixes('ru')].sort()).toEqual(['few', 'many', 'one', 'other']);
    expect([...requiredSuffixes('pt-BR')].sort()).toEqual(['one', 'other']);
    expect([...requiredSuffixes('en')].sort()).toEqual(['one', 'other']);
  });
});

describe('sufixos permitidos (RF5a)', () => {
  it('_zero é permitido em qualquer idioma (D8)', () => {
    for (const lang of ['pt-BR', 'en', 'es', 'ru']) {
      expect(allowedSuffixes(lang)).toContain('zero');
    }
  });

  it('pt-BR não permite _few; ru permite', () => {
    expect(allowedSuffixes('pt-BR')).not.toContain('few');
    expect(allowedSuffixes('ru')).toContain('few');
  });
});

describe('validatePlurals — tabela §5 da SPEC-008', () => {
  // #6 — forma supérflua: _few não existe em português.
  it('#6 pt-BR com _few acusa sufixo inválido', () => {
    const errors = validatePlurals(['days_one', 'days_few', 'days_other'], 'pt-BR');
    expect(errors.join(' ')).toMatch(/days_few/);
  });

  // #6b — _many é declarado no CLDR de pt-BR, mas não é alcançável por inteiros.
  it('#6b pt-BR sem _many passa', () => {
    expect(validatePlurals(['days_one', 'days_other'], 'pt-BR')).toEqual([]);
  });

  // #6c — _zero é override de UX legítimo, fora do CLDR.
  it('#6c pt-BR com _zero passa', () => {
    expect(validatePlurals(['days_zero', 'days_one', 'days_other'], 'pt-BR')).toEqual([]);
  });

  // #5 — forma faltando: ru precisa de one/few/many/other.
  it('#5 ru sem _many acusa forma faltando', () => {
    const errors = validatePlurals(['days_one', 'days_few', 'days_other'], 'ru');
    expect(errors.join(' ')).toMatch(/many/);
  });

  it('ru completo passa', () => {
    expect(
      validatePlurals(['days_one', 'days_few', 'days_many', 'days_other'], 'ru'),
    ).toEqual([]);
  });

  // #6d — ro sem _few (a spec citava a faixa 0–200; ro alcança few já em n=0).
  it('#6d ro sem _few acusa forma faltando', () => {
    const errors = validatePlurals(['days_one', 'days_other'], 'ro');
    expect(errors.join(' ')).toMatch(/few/);
  });

  it('chave sem plural nenhum é ignorada', () => {
    expect(validatePlurals(['login.submit', 'cases.total'], 'ru')).toEqual([]);
  });

  it('avalia cada chave-base isoladamente', () => {
    const errors = validatePlurals(
      ['days_one', 'days_few', 'days_many', 'days_other', 'items_one', 'items_other'],
      'ru',
    );
    expect(errors.join(' ')).toMatch(/items/);
    expect(errors.join(' ')).not.toMatch(/days/);
  });

  // RF5c — nasce desligada; ligada, exige as formas de fracionários (D9).
  it('RF5c fracionários: desligado por padrão, cs exige _many quando ligado', () => {
    const keys = ['days_one', 'days_few', 'days_other'];
    expect(validatePlurals(keys, 'cs')).toEqual([]);
    expect(validatePlurals(keys, 'cs', { fractions: true }).join(' ')).toMatch(/many/);
  });
});

// D8 — a base do RF5(a): o i18next trata _zero como override explícito, fora do
// CLDR. Se isso mudar numa versão futura, a regra (a) precisa ser revista.
describe('_zero em runtime (D8)', () => {
  it('item_zero vence para count 0 em pt-BR, idioma sem categoria "zero"', async () => {
    const instance = i18next.createInstance();
    await instance.init({
      lng: 'pt-BR',
      resources: {
        'pt-BR': {
          translation: {
            item_zero: 'Nenhum caso',
            item_one: '{{count}} caso',
            item_other: '{{count}} casos',
          },
        },
      },
    });
    // `i18next.d.ts` tipa as chaves a partir do pt-BR real; aqui as chaves são
    // sintéticas de propósito, então a chamada precisa escapar da tipagem.
    const t = instance.t as unknown as (key: string, opts?: Record<string, unknown>) => string;
    expect(t('item', { count: 0 })).toBe('Nenhum caso');
    expect(t('item', { count: 1 })).toBe('1 caso');
    expect(t('item', { count: 5 })).toBe('5 casos');
  });
});
