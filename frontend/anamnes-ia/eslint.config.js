import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import i18next from 'eslint-plugin-i18next'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // i18n (SPEC-007 / RF13 / D9): proíbe strings visíveis hardcoded — ativado
  // pasta a pasta, conforme cada feature é migrada. Piloto: features/auth.
  // Além das features, cobre a UI compartilhada (`app`, `shared`, `core`), que
  // ficou de fora da Fase 1 e por isso regrediu sem ninguém perceber.
  // Ainda fora: features/{payments,minigame,questoes} (adiadas).
  {
    files: ['src/features/auth/**/*.{ts,tsx}', 'src/features/case/**/*.{ts,tsx}', 'src/features/profile/**/*.{ts,tsx}', 'src/features/chat/**/*.{ts,tsx}', 'src/features/student/**/*.{ts,tsx}', 'src/features/navigator/**/*.{ts,tsx}', 'src/features/teacher/**/*.{ts,tsx}', 'src/features/settings/**/*.{ts,tsx}', 'src/features/flashcards/**/*.{ts,tsx}', 'src/features/admin/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}', 'src/core/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['error', {
        mode: 'jsx-text-only',
        // Exclui: texto puramente decorativo (emoji/símbolos, sem letras), o
        // wordmark da marca ("Anamnes", ".IA"), nomes de produtos de terceiros
        // ("Langfuse"), a sigla clínica "SOAP" e o CNPJ do rodapé — nomes
        // próprios, siglas e identificadores fiscais não se traduzem.
        words: { exclude: ['^[^\\p{L}]*$', 'Anamnes', '\\.IA', 'Langfuse', '^SOAP$', '^CNPJ'] },
      }],
    },
  },
])
