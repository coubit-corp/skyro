-- =============================================================================
-- Skyro · contas de demonstração
--
-- Cria (ou recria do zero) as três contas dos botões "Entrar como ... (demo)":
--   Pessoa:        demo.pessoa@skyro.app  / skyro-demo-2026   → Lucas Martins
--   Profissional:  demo.nutri@skyro.app   / skyro-demo-2026   → Ana Lima, nutricionista
--   Equipe:        demo.equipe@skyro.app  / skyro-demo-2026   → Equipe Skyro (admin demo)
--
-- A conta da equipe só aprova ou recusa registros de perfis de demonstração
-- (garantido pela migration 20261115000001_aprovacao_registros.sql).
--
-- O Lucas já compartilha a rotina com a Ana e tem registros de hoje e dos 13 dias
-- anteriores, com esta semana em "Atenção" (dormiu pouco, faltou treino, pouca água),
-- igual aos mockups. As datas são relativas a hoje, então a demo nunca "envelhece":
-- é só rodar este arquivo de novo.
--
-- Como rodar: painel do Supabase → SQL Editor → New query → colar → Run.
-- Pré-requisito: todas as migrations de supabase/migrations/ já aplicadas.
-- Pode rodar quantas vezes quiser: apaga as contas demo e cria de novo.
-- =============================================================================

do $$
declare
  -- "Hoje" no horário de Brasília (o current_date do Supabase é UTC e, à noite, já seria amanhã)
  v_today constant date := (now() at time zone 'America/Sao_Paulo')::date;
  v_password  constant text := 'skyro-demo-2026';
  v_person    uuid := 'd0000000-0000-4000-8000-000000000001';
  v_pro       uuid := 'd0000000-0000-4000-8000-000000000002';
  v_admin     uuid := 'd0000000-0000-4000-8000-000000000003';
  v_day       date;
  v_offset    int;
  h_wake      uuid := gen_random_uuid();
  h_workout   uuid := gen_random_uuid();
  h_water     uuid := gen_random_uuid();
  h_focus     uuid := gen_random_uuid();
  h_walk      uuid := gen_random_uuid();
  h_sleep     uuid := gen_random_uuid();
begin
  -- 1. Limpa as contas demo anteriores (o "on delete cascade" leva perfil, registros, etc.)
  delete from auth.users where id in (v_person, v_pro, v_admin)
     or email in ('demo.pessoa@skyro.app', 'demo.nutri@skyro.app', 'demo.equipe@skyro.app');

  -- 2. Cria os usuários no Supabase Auth, já com e-mail confirmado.
  --    O gatilho on_auth_user_created cria o perfil (profiles) automaticamente.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values
    ('00000000-0000-0000-0000-000000000000', v_person, 'authenticated', 'authenticated',
     'demo.pessoa@skyro.app', extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"full_name":"Lucas Martins","role":"person"}',
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_pro, 'authenticated', 'authenticated',
     'demo.nutri@skyro.app', extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"full_name":"Ana Lima","role":"professional"}',
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_admin, 'authenticated', 'authenticated',
     'demo.equipe@skyro.app', extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}',
     '{"full_name":"Equipe Skyro"}',
     now(), now(), '', '', '', '');

  -- Identidade de e-mail (necessária para o login por senha funcionar)
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), v_person, v_person::text, 'email',
     jsonb_build_object('sub', v_person::text, 'email', 'demo.pessoa@skyro.app', 'email_verified', true),
     now(), now(), now()),
    (gen_random_uuid(), v_pro, v_pro::text, 'email',
     jsonb_build_object('sub', v_pro::text, 'email', 'demo.nutri@skyro.app', 'email_verified', true),
     now(), now(), now()),
    (gen_random_uuid(), v_admin, v_admin::text, 'email',
     jsonb_build_object('sub', v_admin::text, 'email', 'demo.equipe@skyro.app', 'email_verified', true),
     now(), now(), now());

  -- 3. Marca os perfis como demo e fixa os avatares
  update public.profiles set is_demo = true, avatar_seed = 'lucas-martins' where id = v_person;
  update public.profiles set is_demo = true, avatar_seed = 'ana-lima'      where id = v_pro;
  -- O papel admin só é dado aqui, por SQL: o cadastro pelo app nunca cria admin.
  update public.profiles set is_demo = true, avatar_seed = 'equipe-skyro', role = 'admin' where id = v_admin;

  -- 4. Perfil profissional da Ana (dados fictícios, como no mockup)
  insert into public.professionals (
    id, specialty, bio, registry, verified, tags, city, neighborhood, lat, lng,
    modality, rating, reviews_count, is_demo
  ) values (
    v_pro, 'nutricionista',
    'Trabalho com alimentação para quem treina e tem rotina corrida. Monto planos simples, que cabem no seu dia, e acompanho pelo app o seu sono, treinos e água para ajustar quando precisar.',
    'CRN-3 00000 (fictício)', true,
    array['Nutrição esportiva', 'Ganho de massa', 'Reeducação alimentar'],
    'São Paulo', 'Pinheiros', -23.5614, -46.6819,
    'ambos', 4.9, 128, true
  );

  -- 5. Rotina do Lucas (mockup "Rotina de hoje")
  insert into public.habits (id, user_id, name, kind, scheduled_time, goal) values
    (h_wake,    v_person, 'Acordar',              'sono',   '06:30', 'Meta de sono: 7 h'),
    (h_workout, v_person, 'Treino de força',      'treino', '07:00', 'Plano do personal'),
    (h_water,   v_person, 'Beber 2 L de água',    'agua',   null,    '2 L'),
    (h_focus,   v_person, 'Bloco de foco',        'foco',   '15:00', '50 min'),
    (h_walk,    v_person, 'Caminhada',            'treino', '18:30', '30 min'),
    (h_sleep,   v_person, 'Dormir',               'sono',   '23:00', 'Deitar até 23h');

  -- 6. Registros de hoje e dos 13 dias anteriores (o sono de um dia é o da noite anterior).
  --    Até ~1 semana atrás: tudo bem. Esta semana: piorando.
  --    Hoje: dormiu 5h30 e ainda não treinou; faltou ao treino ontem e há 3 dias
  --    (2 faltas na semana) → o Lucas aparece em "Atenção" para a Ana.
  --    As duas faltas vêm depois de noites curtas (6h12 e 5h54): é o padrão que o
  --    resumo da semana aponta ("nos dias em que dormiu menos de 6h30, faltou…").
  for v_offset in 0..13 loop
    v_day := v_today - v_offset;
    insert into public.daily_logs (
      user_id, log_date, sleep_hours, water_liters, water_goal_liters,
      focus_minutes, workout_planned, workout_done, mood
    ) values (
      v_person, v_day,
      case v_offset when 0 then 5.5 when 1 then 6.2 when 2 then 5.8 when 3 then 5.9 when 4 then 6.5 when 5 then 7.2
                    else 7.0 + (v_offset % 3) * 0.4 end,
      case v_offset when 0 then 0.8 when 1 then 1.6 when 2 then 1.4 when 3 then 1.9 else 2.1 end,
      2,
      case v_offset when 0 then 40 else
        case when v_offset <= 5 then 45 + v_offset * 5 else 60 + (v_offset % 4) * 10 end end,
      -- Treina de segunda a sexta; hoje, ontem e há 3 dias o treino estava planejado
      -- mesmo que caia no fim de semana.
      extract(isodow from v_day) <= 5 or v_offset in (0, 1, 3),
      extract(isodow from v_day) <= 5 and v_offset not in (0, 1, 3),
      case when v_offset <= 2 then 'cansado' else 'bem' end
    );

    -- Hábitos marcados em cada dia (dias ruins têm menos marcações)
    insert into public.habit_checks (habit_id, user_id, check_date)
    select h, v_person, v_day
    from unnest(
      case
        when v_offset = 0 then array[h_wake]
        when v_offset = 1 then array[h_wake, h_focus]
        when v_offset = 3 then array[h_wake, h_focus, h_sleep]
        when extract(isodow from v_day) > 5 then array[h_wake, h_water, h_walk, h_sleep]
        else array[h_wake, h_workout, h_water, h_focus, h_sleep]
      end
    ) as h;
  end loop;

  -- 7. Lucas compartilha a rotina com a Ana desde 3 meses atrás
  insert into public.shares (person_id, professional_id, created_at)
  values (v_person, v_pro, now() - interval '90 days');

  -- 8. Uma dica da Ana já enviada (aparece no Início do Lucas)
  insert into public.tips (professional_id, person_id, body, created_at)
  values (v_pro, v_person,
          'Vi que você dormiu pouco esta semana. Ajustei o jantar para ficar mais leve e mais cedo: tente comer até as 20h e evitar café depois das 16h.',
          now() - interval '2 hours');
end $$;

-- Conferência: deve listar as três contas
select p.full_name, p.role, u.email, p.is_demo
from public.profiles p join auth.users u on u.id = p.id
where p.is_demo
order by p.role;
