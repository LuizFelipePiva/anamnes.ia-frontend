import { describe, it, expect } from 'vitest';
import { flatten } from '../../../scripts/i18nCsv.mjs';
import { baseKeys, validatePlurals } from './plurals';

import ptCommon from '@/locales/pt-BR/common.json';
import ptAuth from '@/locales/pt-BR/auth.json';
import ptCase from '@/locales/pt-BR/case.json';
import ptProfile from '@/locales/pt-BR/profile.json';
import ptChat from '@/locales/pt-BR/chat.json';
import ptStudent from '@/locales/pt-BR/student.json';
import ptNavigator from '@/locales/pt-BR/navigator.json';
import ptTeacher from '@/locales/pt-BR/teacher.json';
import ptSettings from '@/locales/pt-BR/settings.json';
import ptFlashcards from '@/locales/pt-BR/flashcards.json';
import ptAdmin from '@/locales/pt-BR/admin.json';
import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enCase from '@/locales/en/case.json';
import enProfile from '@/locales/en/profile.json';
import enChat from '@/locales/en/chat.json';
import enStudent from '@/locales/en/student.json';
import enNavigator from '@/locales/en/navigator.json';
import enTeacher from '@/locales/en/teacher.json';
import enSettings from '@/locales/en/settings.json';
import enFlashcards from '@/locales/en/flashcards.json';
import enAdmin from '@/locales/en/admin.json';
import esCommon from '@/locales/es/common.json';
import esAuth from '@/locales/es/auth.json';
import esCase from '@/locales/es/case.json';
import esProfile from '@/locales/es/profile.json';
import esChat from '@/locales/es/chat.json';
import esStudent from '@/locales/es/student.json';
import esNavigator from '@/locales/es/navigator.json';
import esTeacher from '@/locales/es/teacher.json';
import esSettings from '@/locales/es/settings.json';
import esFlashcards from '@/locales/es/flashcards.json';
import esAdmin from '@/locales/es/admin.json';
import ruCommon from '@/locales/ru/common.json';
import ruAuth from '@/locales/ru/auth.json';
import ruCase from '@/locales/ru/case.json';
import ruProfile from '@/locales/ru/profile.json';
import ruChat from '@/locales/ru/chat.json';
import ruStudent from '@/locales/ru/student.json';
import ruNavigator from '@/locales/ru/navigator.json';
import ruTeacher from '@/locales/ru/teacher.json';
import ruSettings from '@/locales/ru/settings.json';
import ruFlashcards from '@/locales/ru/flashcards.json';
import ruAdmin from '@/locales/ru/admin.json';

// T8 — os três idiomas têm exatamente o mesmo conjunto de chaves por namespace.
const namespaces = {
  common: { 'pt-BR': ptCommon, en: enCommon, es: esCommon, ru: ruCommon },
  auth: { 'pt-BR': ptAuth, en: enAuth, es: esAuth, ru: ruAuth },
  case: { 'pt-BR': ptCase, en: enCase, es: esCase, ru: ruCase },
  profile: { 'pt-BR': ptProfile, en: enProfile, es: esProfile, ru: ruProfile },
  chat: { 'pt-BR': ptChat, en: enChat, es: esChat, ru: ruChat },
  student: { 'pt-BR': ptStudent, en: enStudent, es: esStudent, ru: ruStudent },
  navigator: { 'pt-BR': ptNavigator, en: enNavigator, es: esNavigator, ru: ruNavigator },
  teacher: { 'pt-BR': ptTeacher, en: enTeacher, es: esTeacher, ru: ruTeacher },
  settings: { 'pt-BR': ptSettings, en: enSettings, es: esSettings, ru: ruSettings },
  flashcards: { 'pt-BR': ptFlashcards, en: enFlashcards, es: esFlashcards, ru: ruFlashcards },
  admin: { 'pt-BR': ptAdmin, en: enAdmin, es: esAdmin, ru: ruAdmin },
};

const OTHER_LANGS = ['en', 'es', 'ru'] as const;

// SPEC-008 RF5 — idiomas ainda em migração, isentos do teste de formas plurais.
// `ru` foi traduzido (2026-07-31) e já tem _few/_many completos — allowlist vazia.
const PLURALS_ALLOWLIST: string[] = [];

// SPEC-008 RF4 — a paridade compara chaves-base: um idioma pode ter mais formas
// plurais que o pt-BR (ru precisa de 4, pt-BR usa 2) sem que isso seja divergência.
describe('paridade de dicionários por chave-base (T8 / RF4)', () => {
  for (const [ns, dicts] of Object.entries(namespaces)) {
    it(`namespace "${ns}" tem as mesmas chaves-base em pt-BR/en/es/ru`, () => {
      const base = [...baseKeys(Object.keys(flatten(dicts['pt-BR'])))].sort();
      for (const lang of OTHER_LANGS) {
        const keys = [...baseKeys(Object.keys(flatten(dicts[lang])))].sort();
        const missing = base.filter((k) => !keys.includes(k));
        const extra = keys.filter((k) => !base.includes(k)); // chave órfã (D3)
        expect({ lang, missing, extra }).toEqual({ lang, missing: [], extra: [] });
      }
    });
  }

  // #4 — o caso que a spec inteira existe para permitir.
  it('#4 ru com _one/_few/_many/_other e pt-BR com _one/_other não é divergência', () => {
    const pt = ['days_one', 'days_other'];
    const ru = ['days_one', 'days_few', 'days_many', 'days_other'];
    expect([...baseKeys(ru)]).toEqual([...baseKeys(pt)]);
  });

  // #7 — o que continua sendo erro: chave-base que falta noutro idioma.
  it('#7 chave-base ausente em en continua sendo divergência', () => {
    const pt = [...baseKeys(['days_one', 'days_other', 'title'])];
    const en = [...baseKeys(['days_one', 'days_other'])];
    expect(pt.filter((k) => !en.includes(k))).toEqual(['title']);
  });

  // #8 — chave órfã: existe em en e não em pt-BR (D3).
  it('#8 chave órfã em en é acusada como extra', () => {
    const pt = [...baseKeys(['days_one', 'days_other'])];
    const en = [...baseKeys(['days_one', 'days_other', 'orfa'])];
    expect(en.filter((k) => !pt.includes(k))).toEqual(['orfa']);
  });
});

// SPEC-008 RF5 — as formas plurais de cada dicionário real batem com o que o
// idioma exige (nem forma inválida, nem forma faltando).
describe('formas plurais dos dicionários (RF5)', () => {
  for (const [ns, dicts] of Object.entries(namespaces)) {
    for (const lang of ['pt-BR', ...OTHER_LANGS] as const) {
      const skip = PLURALS_ALLOWLIST.includes(lang);
      it.skipIf(skip)(`${lang}/${ns} usa as formas plurais válidas do idioma`, () => {
        expect(validatePlurals(Object.keys(flatten(dicts[lang])), lang)).toEqual([]);
      });
    }
  }

  it('a allowlist está vazia agora que ru foi traduzido (SPEC-008 D4)', () => {
    expect(PLURALS_ALLOWLIST).toEqual([]);
  });
});
