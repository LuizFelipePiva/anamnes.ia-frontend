-- SPEC-007 (i18n): adiciona russo (`ru`) aos idiomas aceitos.
-- A constraint criada em 20260724000000_add_users_language.sql só permitia
-- pt-BR/en/es; sem esta migration o PUT /profile/me falha ao salvar 'ru' e a
-- escolha do usuário reverte no reload.
--
-- Mantém os códigos idênticos ao frontend (`SUPPORTED_LANGS`) e ao backend
-- (`app/i18n.py`). Idempotente: pode rodar mais de uma vez sem erro.

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'users_language_check'
  ) then
    alter table public.users drop constraint users_language_check;
  end if;

  alter table public.users
    add constraint users_language_check
    check (language in ('pt-BR', 'en', 'es', 'ru'));
end $$;
