# features/settings — AI context

Configurações do usuário (tema, preferências). Feature mínima (uma página).

## Arquivos
- `pages/Settings.tsx` — página de configurações; usa `@/core` ThemeProvider. O seletor de idioma (aba "Idioma") troca `lang` via `setLang`, mostra aviso "em desenvolvimento" para en/es e persiste no perfil via `PUT /api/profile/me {language}` (SPEC-007). A resposta traz um JWT reemitido (`token`) com o novo idioma; o handler chama `login(token)` para trocar o token local — sem isso o token antigo reverteria a escolha no F5. A página é internacionalizada via i18next — namespace `settings` (`@/locales/*/settings.json`), `useTranslation('settings')`; o dict inline antigo foi removido. Os **nomes dos idiomas** no seletor vêm de `common.language_names.<code>` via um segundo `useTranslation('common')` (`tCommon`) — a lista local só guarda `code` + bandeira; não repita os nomes aqui. Lint `no-literal-string` ativo em `features/settings`.
