-- SPEC-004 — Reserva atômica de cota de tentativas (corrige race condition #7).
-- Conta + insere na MESMA transação, sob advisory lock por (aluno, tipo),
-- garantindo que o limite diário nunca seja excedido sob concorrência.
--
-- p_kind: 'ai' (caso com form_data->>'source' = 'ai_generated') ou 'regular' (demais).
-- Retorna o id do case_attempt criado, ou NULL se o limite já foi atingido.

create or replace function public.reserve_case_attempt(
    p_student uuid,
    p_case_id uuid,
    p_conversation_id uuid,
    p_kind text,
    p_limit int
) returns uuid
language plpgsql
as $$
declare
    v_used int;
    v_id uuid;
begin
    -- Serializa o trecho crítico por aluno+tipo (liberado no fim da transação).
    perform pg_advisory_xact_lock(hashtext(p_student::text || ':' || p_kind));

    select count(*) into v_used
    from case_attempts a
    join cases c on c.id = a.case_id
    where a.student_id = p_student
      and a.started_at >= date_trunc('day', now())
      and (
            (p_kind = 'ai'      and (c.form_data->>'source') = 'ai_generated')
         or (p_kind = 'regular' and coalesce(c.form_data->>'source', '') <> 'ai_generated')
      );

    if v_used >= p_limit then
        return null;  -- limite atingido → nenhuma inserção
    end if;

    insert into case_attempts (case_id, student_id, conversation_id, status)
    values (p_case_id, p_student, p_conversation_id, 'in_progress')
    returning id into v_id;

    return v_id;
end;
$$;
