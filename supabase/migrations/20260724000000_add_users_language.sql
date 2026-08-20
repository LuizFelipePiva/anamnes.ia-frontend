-- SPEC-007 (i18n Fase 0): idioma preferido do usuário.
-- Persiste a escolha de idioma (D3) para que backend e prompts de IA (fase 2)
-- saibam em que idioma responder. Códigos idênticos ao frontend: pt-BR/en/es.

alter table public.users
  add column if not exists language text not null default 'pt-BR';

-- Constraint idempotente (add constraint não aceita "if not exists" no Postgres).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_language_check'
  ) then
    alter table public.users
      add constraint users_language_check
      check (language in ('pt-BR', 'en', 'es'));
  end if;
end $$;
