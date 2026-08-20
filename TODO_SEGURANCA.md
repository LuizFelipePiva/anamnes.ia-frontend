# Correções de segurança pendentes — revisão dos fluxos de auth (2026-07-07)

> Revisão de login/cadastro/troca/recuperação de senha. Apagar itens conforme forem resolvidos.

## 🔴 Prioritárias

> ✅ Resolvidas em 2026-07-08 (código). Pendências de painel abaixo.

1. ~~**Registro público aceita `role: "teacher"`**~~ ✅
   - `RegisterRequest.role` agora tem `pattern="^(student)$"` (`schemas.py`); professor só via admin.

2. ~~**Reset de senha aceita mínimo de 6 caracteres**~~ ✅ (código)
   - `ResetPassword.tsx`: validação e `minLength` subidos para 8.
   - ⚠️ **Pendente (painel)**: Supabase → Authentication → Passwords → *Minimum password length* = 8.

3. ~~**Sessão Supabase fica no localStorage após o reset**~~ ✅
   - `supabase.auth.signOut()` após `updatePassword` em `ResetPassword.tsx`.

4. ~~**Rate limit por IP inefetivo atrás do proxy (Render/Railway)**~~ ✅
   - Sem `--proxy-headers`, `request.client.host` era o IP do proxy → limites (login 10/min etc.) viravam globais: brute-force não limitado por atacante e possibilidade de travar o login de todos.
   - Fix: `--proxy-headers --forwarded-allow-ips "*"` no `backend/Dockerfile` (CMD prod) e `backend/railway.toml` (startCommand).

## 🟡 Menores / cientes (sem urgência)

- Cadastro responde 409 "E-mail já cadastrado" — enumeração leve, padrão de mercado, rate-limited (2/min). Ok manter.
- JWT não é revogável: trocar senha não invalida tokens já emitidos (valem até 24h). Mitigação futura: exp menor + refresh token, ou versão de token por usuário no banco.
- Role vai dentro do JWT: rebaixar/promover usuário só vale no próximo login (até 24h de defasagem).
- `authFetch` usa `window.alert` para sessão expirada → trocar por toast/redirect silencioso.
- Leaked password protection (HaveIBeenPwned) indisponível no plano Free do Supabase. Alternativa gratuita: checagem k-anonymity na API pública do HIBP no `signup`/troca de senha (backend).

## Painel Supabase (pendências de config já conhecidas)

- OTP de e-mail < 1h (Authentication → Sign In / Up → Email).
- Upgrade do Postgres (Settings → Infrastructure) — patches de segurança; ~minutos de downtime.
