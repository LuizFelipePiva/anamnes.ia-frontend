// Inicialização do i18next (SPEC-007). O ThemeProvider é a fonte da verdade do
// `lang` e chama `i18n.changeLanguage(...)`; aqui só configuramos os recursos e
// o idioma inicial (detecção síncrona para reduzir o flash no primeiro paint).
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { FALLBACK_LANG, SUPPORTED_LANGS, detectInitialLang, type Lang } from './resolveLocale';

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

export const resources = {
  'pt-BR': { common: ptCommon, auth: ptAuth, case: ptCase, profile: ptProfile, chat: ptChat, student: ptStudent, navigator: ptNavigator, teacher: ptTeacher, settings: ptSettings, flashcards: ptFlashcards, admin: ptAdmin },
  en: { common: enCommon, auth: enAuth, case: enCase, profile: enProfile, chat: enChat, student: enStudent, navigator: enNavigator, teacher: enTeacher, settings: enSettings, flashcards: enFlashcards, admin: enAdmin },
  es: { common: esCommon, auth: esAuth, case: esCase, profile: esProfile, chat: esChat, student: esStudent, navigator: esNavigator, teacher: esTeacher, settings: esSettings, flashcards: esFlashcards, admin: esAdmin },
  ru: { common: ruCommon, auth: ruAuth, case: ruCase, profile: ruProfile, chat: ruChat, student: ruStudent, navigator: ruNavigator, teacher: ruTeacher, settings: ruSettings, flashcards: ruFlashcards, admin: ruAdmin },
} as const;

// Idioma inicial: localStorage global (o ThemeProvider refina por usuário depois)
// → navegador → fallback. Guardado sob try para ambientes sem window (SSR/testes).
function initialLang(): Lang {
  try {
    return detectInitialLang({
      storedLang: window.localStorage.getItem('prefs_global_lang'),
      navigatorLangs: window.navigator?.languages ?? [window.navigator?.language],
    });
  } catch {
    return FALLBACK_LANG;
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang(),
  fallbackLng: FALLBACK_LANG,
  supportedLngs: SUPPORTED_LANGS as unknown as string[],
  defaultNS: 'common',
  ns: ['common', 'auth', 'case', 'profile', 'chat', 'student', 'navigator', 'teacher', 'settings', 'flashcards', 'admin'],
  interpolation: { escapeValue: false },
  returnNull: false,
  // SPEC-008 RF6: célula em branco no CSV cai no fallback pt-BR (visível) em vez
  // de renderizar "" — o default do i18next faria o texto sumir sem sinal algum.
  returnEmptyString: false,
});

export default i18n;
export { FALLBACK_LANG, SUPPORTED_LANGS };
export type { Lang };
