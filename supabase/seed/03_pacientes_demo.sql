-- =============================================================================
-- Skyro · pacientes demonstrativos da Ana (painel do profissional)
--
-- Cria 5 pessoas FICTÍCIAS (sem senha, ninguém entra com elas) que compartilham
-- a rotina com a Ana, cada uma num cenário diferente das regras de alerta:
--   Beatriz Santos   → Atenção: bebeu 0,8 L de 2 L ontem
--   Rafael Ferreira  → Atenção: sem registro há 2 dias
--   Camila Andrade   → Em dia
--   Gustavo Pereira  → Em dia (strike longo)
--   Júlia Nogueira   → Em dia
-- Junto com o Lucas (01_contas_demo.sql), a Ana fica com 6 pacientes, 3 em Atenção,
-- como no mockup "Seus pacientes".
--
-- Como rodar: SQL Editor → colar → Run, DEPOIS do 01_contas_demo.sql.
-- Pode rodar quantas vezes quiser (as datas acompanham o dia de hoje).
-- =============================================================================

do $$
declare
  -- "Hoje" no horário de Brasília (o current_date do Supabase é UTC e, à noite, já seria amanhã)
  v_today constant date := (now() at time zone 'America/Sao_Paulo')::date;
  v_ana constant uuid := 'd0000000-0000-4000-8000-000000000002';
  r record;
  v_id uuid;
  v_offset int;
  v_day date;
  h1 uuid;
  h2 uuid;
  h3 uuid;
begin
  if not exists (select 1 from public.professionals where id = v_ana) then
    raise exception 'Rode primeiro o 01_contas_demo.sql (a Ana ainda não existe).';
  end if;

  delete from auth.users where email like 'demo.paciente.%@skyro.app';

  for r in
    select * from (values
      -- n, nome,              sono, água ontem, último registro (dias atrás), dias de strike, meses de acompanhamento
      (1, 'Beatriz Santos',    7.2,  0.8,  0, 9,  2),
      (2, 'Rafael Ferreira',   7.0,  2.0,  2, 0,  1),
      (3, 'Camila Andrade',    7.7,  2.2,  0, 11, 5),
      (4, 'Gustavo Pereira',   7.4,  2.4,  0, 20, 8),
      (5, 'Júlia Nogueira',    7.9,  2.0,  0, 6,  3)
    ) as t(n, nome, sono, agua_ontem, ultimo, strike, meses)
  loop
    v_id := ('e0000000-0000-4000-8000-' || lpad(r.n::text, 12, '0'))::uuid;

    insert into auth.users (
      instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'demo.paciente.' || r.n || '@skyro.app',
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', r.nome, 'role', 'person'),
      now(), now(), '', '', '', ''
    );

    update public.profiles
       set is_demo = true, avatar_seed = lower(replace(r.nome, ' ', '-'))
     where id = v_id;

    h1 := gen_random_uuid(); h2 := gen_random_uuid(); h3 := gen_random_uuid();
    insert into public.habits (id, user_id, name, kind, scheduled_time, goal) values
      (h1, v_id, 'Treino',            'treino', '07:00', '45 min'),
      (h2, v_id, 'Beber 2 L de água', 'agua',   null,    '2 L'),
      (h3, v_id, 'Dormir até 23h',    'sono',   '23:00', '7 h');

    -- 14 dias de registros, parando no "último registro" do cenário
    for v_offset in r.ultimo..13 loop
      v_day := v_today - v_offset;
      insert into public.daily_logs (
        user_id, log_date, sleep_hours, water_liters, water_goal_liters,
        focus_minutes, workout_planned, workout_done
      ) values (
        v_id, v_day,
        r.sono + ((v_offset % 3) - 1) * 0.3,
        case when v_offset = 1 then r.agua_ontem else 2.0 + (v_offset % 2) * 0.2 end,
        2,
        50 + (v_offset % 4) * 10,
        extract(isodow from v_day) <= 5,
        extract(isodow from v_day) <= 5 and v_offset <> 4   -- só 1 falta: não dispara alerta
      );
    end loop;

    -- Marcações: um dia sim nos últimos `strike` dias (o strike), mais algumas antes
    insert into public.habit_checks (habit_id, user_id, check_date)
    select h, v_id, v_today - d
    from generate_series(case when r.ultimo > 0 then r.ultimo else 0 end, greatest(r.strike, r.ultimo) + 3) as d,
         unnest(array[h1, h2, h3]) as h
    where d < r.strike or d > r.strike;   -- o dia `strike` fica sem marcação e quebra a sequência

    insert into public.shares (person_id, professional_id, created_at)
    values (v_id, v_ana, now() - make_interval(months => r.meses));
  end loop;
end $$;

-- Conferência: pacientes da Ana
select p.full_name, s.created_at::date as desde
from public.shares s join public.profiles p on p.id = s.person_id
where s.professional_id = 'd0000000-0000-4000-8000-000000000002' and s.revoked_at is null
order by p.full_name;
