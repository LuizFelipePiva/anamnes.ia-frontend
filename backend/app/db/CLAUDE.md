# db/ — AI context

Acesso ao Supabase. RLS habilitado em tabelas sensíveis — mudanças de schema podem exigir ajuste de policies.

## Arquivos
- `supabase.py` — factory do cliente Supabase, injetado via dependency injection nas rotas.
