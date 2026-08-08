// Tipagem das chaves de tradução (RF5): o dicionário pt-BR é a fonte da verdade.
// `t('auth.login.submit')` fica tipado; chave inexistente → erro de compilação.
import 'i18next';
import type ptCommon from '@/locales/pt-BR/common.json';
import type ptAuth from '@/locales/pt-BR/auth.json';
import type ptCase from '@/locales/pt-BR/case.json';
import type ptProfile from '@/locales/pt-BR/profile.json';
import type ptChat from '@/locales/pt-BR/chat.json';
import type ptStudent from '@/locales/pt-BR/student.json';
import type ptNavigator from '@/locales/pt-BR/navigator.json';
import type ptTeacher from '@/locales/pt-BR/teacher.json';
import type ptSettings from '@/locales/pt-BR/settings.json';
import type ptFlashcards from '@/locales/pt-BR/flashcards.json';
import type ptAdmin from '@/locales/pt-BR/admin.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof ptCommon;
      auth: typeof ptAuth;
      case: typeof ptCase;
      profile: typeof ptProfile;
      chat: typeof ptChat;
      student: typeof ptStudent;
      navigator: typeof ptNavigator;
      teacher: typeof ptTeacher;
      settings: typeof ptSettings;
      flashcards: typeof ptFlashcards;
      admin: typeof ptAdmin;
    };
  }
}
