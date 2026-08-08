# features/auth — AI context

Autenticação: login, registro, reset de senha, confirmação de e-mail. Importar via `@/features/auth`.

## Arquivos
- `context/authContext.tsx` — `AuthContext` (estado de sessão/usuário).
- `services/authService.ts` — chamadas de auth via `authFetch`. `register` **não** retorna token (fluxo de confirmação por e-mail, SPEC-006): devolve a mensagem genérica; sem login automático.
- `components/LoginForm.tsx`, `RegisterForm.tsx` — formulários. `RegisterForm` em sucesso mostra a tela "Confirme seu e-mail" (não loga; o acesso só após o link de confirmação).
- `pages/Login.tsx`, `ResetPassword.tsx`, `EmailConfirmed.tsx` — páginas, também internacionalizadas.

**i18n (SPEC-007):** a feature **inteira** usa `useTranslation('auth')` / `<Trans>`; strings em `@/locales/{pt-BR,en,es}/auth.json`. O lint `no-literal-string` está **ativo em todo `features/auth/**`** — nada de texto visível hardcoded. Exceções no lint: emoji/símbolos decorativos e o wordmark da marca ("Anamnes", ".IA"). Texto jurídico dos Termos (`auth:terms.*`) está extraído mas en/es ainda em pt-BR (revisão jurídica pendente).
- `pages/Login.tsx`, `ResetPassword.tsx`, `EmailConfirmed.tsx` — páginas.
- `index.ts` — barrel export.

## Depende de
`@/core` (supabaseClient, useAuth), backend `routes/api.py`.
