-- =============================================================================
-- Skyro · catálogo demonstrativo do "Perto de você"
--
-- Cria 12 profissionais FICTÍCIOS em bairros de São Paulo (perto de Pinheiros),
-- de todas as especialidades. Eles não têm senha: só aparecem no catálogo,
-- ninguém entra com essas contas.
--
-- Também monta a equipe do Lucas: Pedro (personal), como no mockup "Sua saúde",
-- e Carlos (psicólogo) e Fernanda (fisio), para as 4 abas do "Meu plano"
-- terem conteúdo. Cada um deixa um plano fictício, e a semana do Lucas ganha
-- marcações de "feito" e a dor do dia.
--
-- Pré-requisito: todas as migrations, inclusive a 20261115000002_planos.sql.
--
-- Como rodar: SQL Editor → colar → Run, DEPOIS do 01_contas_demo.sql.
-- Se rodar o 01 de novo, rode este também (o 01 recria o Lucas do zero).
-- Pode rodar quantas vezes quiser.
--
-- Psicólogos ficam sem nota (rating nulo): a especificação pede cautela com
-- avaliações públicas até checarmos as regras do CFP.
-- =============================================================================

do $$
declare
  r record;
  v_id uuid;
  v_lucas constant uuid := 'd0000000-0000-4000-8000-000000000001';
  v_today constant date := (now() at time zone 'America/Sao_Paulo')::date;
  v_pedro    constant uuid := 'c0000000-0000-4000-8000-000000000003';
  v_carlos   constant uuid := 'c0000000-0000-4000-8000-000000000001';
  v_fernanda constant uuid := 'c0000000-0000-4000-8000-000000000008';
begin
  -- Limpa o catálogo anterior (só as contas de catálogo, não as duas contas demo de login)
  delete from auth.users where email like 'demo.catalogo.%@skyro.app';

  for r in
    select * from (values
      -- n, nome,              especialidade,    bairro,          lat,       lng,       modalidade,   nota, aval., verificado, tags, bio
      (1,  'Carlos Souza',     'psicologo',      'Pinheiros',     -23.5662,  -46.6880,  'ambos',      null, 0,   true,
           array['Ansiedade','Rotina e sono','Adultos'],
           'Psicólogo clínico. Atendo adultos com ansiedade e dificuldade de manter rotina. Uso o que você registra no app como ponto de partida das sessões.'),
      (2,  'Júlia Ramos',      'psicologo',      'Vila Madalena', -23.5531,  -46.6910,  'online',     null, 0,   true,
           array['Terapia cognitivo-comportamental','Estresse no trabalho'],
           'Atendimento online para quem vive na correria. Sessões de 50 minutos, com tarefas curtas entre uma sessão e outra.'),
      (3,  'Pedro Alves',      'personal',       'Pinheiros',     -23.5640,  -46.6845,  'presencial', 4.8,  64,  true,
           array['Hipertrofia','Treino funcional','Iniciantes'],
           'Personal trainer. Monto treinos que cabem em 45 minutos e ajusto a carga pelo que você registra: se dormiu mal, o treino muda.'),
      (4,  'Marina Costa',     'personal',       'Jardins',       -23.5671,  -46.6650,  'ambos',      4.7,  41,  true,
           array['Corrida','Emagrecimento'],
           'Treino de corrida e condicionamento, presencial no Ibirapuera ou por videochamada.'),
      (5,  'Rafael Nunes',     'personal',       'Butantã',       -23.5710,  -46.7080,  'presencial', 4.6,  28,  false,
           array['Mobilidade','Terceira idade'],
           'Foco em mobilidade e força para quem está voltando a treinar ou tem mais de 60 anos.'),
      (6,  'Beatriz Lopes',    'nutricionista',  'Perdizes',      -23.5380,  -46.6770,  'online',     4.8,  92,  true,
           array['Vegetariana','Saúde da mulher'],
           'Nutricionista com foco em alimentação vegetariana e saúde da mulher. Planos práticos, sem cardápio engessado.'),
      (7,  'Thiago Moreira',   'nutricionista',  'Itaim Bibi',    -23.5840,  -46.6770,  'ambos',      4.5,  37,  true,
           array['Nutrição esportiva','Performance'],
           'Nutrição para quem treina pesado ou corre provas. Ajusto o plano pela semana de treino que você registra.'),
      (8,  'Fernanda Dias',    'fisioterapeuta', 'Pinheiros',     -23.5605,  -46.6870,  'presencial', 4.9,  55,  true,
           array['Ombro e coluna','Pós-treino'],
           'Fisioterapia esportiva. Exercícios de 15 minutos para fazer em casa, combinados com o seu personal.'),
      (9,  'Gustavo Prado',    'fisioterapeuta', 'Vila Mariana',  -23.5890,  -46.6340,  'ambos',      4.7,  33,  true,
           array['Postura','Trabalho remoto'],
           'Dor nas costas de quem passa o dia sentado. Avaliação presencial e acompanhamento online.'),
      (10, 'Larissa Teixeira', 'psicologo',      'Consolação',    -23.5530,  -46.6600,  'ambos',      null, 0,   true,
           array['Jovens adultos','Hábitos'],
           'Psicóloga para jovens adultos que querem organizar a rotina e criar hábitos que duram.'),
      (11, 'Bruno Carvalho',   'personal',       'Lapa',          -23.5270,  -46.7040,  'ambos',      4.4,  19,  false,
           array['Treino em casa','Sem equipamento'],
           'Treinos sem equipamento, para fazer em casa ou no parque. Ideal para quem viaja muito.'),
      (12, 'Camila Ferreira',  'nutricionista',  'Moema',         -23.6010,  -46.6650,  'presencial', 4.6,  47,  true,
           array['Reeducação alimentar','Família'],
           'Reeducação alimentar para a família toda. Consultas presenciais com retorno mensal.')
    ) as t(n, nome, esp, bairro, lat, lng, modalidade, nota, avaliacoes, verificado, tags, bio)
  loop
    v_id := ('c0000000-0000-4000-8000-' || lpad(r.n::text, 12, '0'))::uuid;

    insert into auth.users (
      instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'demo.catalogo.' || r.n || '@skyro.app',
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', r.nome, 'role', 'professional'),
      now(), now(), '', '', '', ''
    );

    update public.profiles
       set is_demo = true, avatar_seed = lower(replace(r.nome, ' ', '-'))
     where id = v_id;

    insert into public.professionals (
      id, specialty, bio, registry, verified, tags, city, neighborhood, lat, lng,
      modality, rating, reviews_count, is_demo, availability
    ) values (
      v_id, r.esp, r.bio, 'Registro fictício (demo)', r.verificado, r.tags, 'São Paulo', r.bairro,
      r.lat, r.lng, r.modalidade, r.nota, r.avaliacoes, true,
      -- Horários fictícios: os de número par também atendem sábado de manhã
      case when r.n % 2 = 0
        then '{"1":["09:00","19:00"],"2":["09:00","19:00"],"3":["09:00","19:00"],"4":["09:00","19:00"],"5":["09:00","18:00"],"6":["09:00","13:00"]}'::jsonb
        else '{"1":["07:00","17:00"],"2":["07:00","17:00"],"3":["07:00","17:00"],"4":["07:00","17:00"],"5":["07:00","16:00"]}'::jsonb
      end
    );
  end loop;

  -- Equipe do Lucas e os planos de cada um, se o Lucas existir
  if exists (select 1 from public.profiles where id = v_lucas) then
    insert into public.shares (person_id, professional_id, created_at) values
      (v_lucas, v_pedro,    now() - interval '60 days'),
      (v_lucas, v_carlos,   now() - interval '45 days'),
      (v_lucas, v_fernanda, now() - interval '30 days');

    -- Treino (Pedro): A na segunda, quarta e sexta; B na terça e quinta.
    insert into public.plan_items (professional_id, person_id, kind, title, weekdays, sets, reps, load, notes, position) values
      (v_pedro, v_lucas, 'treino', 'Agachamento livre',          '{1,3,5}', 4, '10',   '40 kg', null, 1),
      (v_pedro, v_lucas, 'treino', 'Supino reto',                '{1,3,5}', 4, '10',   '30 kg', null, 2),
      (v_pedro, v_lucas, 'treino', 'Remada curvada',             '{2,4}',   3, '12',   '25 kg', null, 3),
      (v_pedro, v_lucas, 'treino', 'Desenvolvimento de ombros',  '{2,4}',   3, '12',   '10 kg', 'Depois dos exercícios da fisio', 4),
      (v_pedro, v_lucas, 'treino', 'Prancha',                    '{1,2,3,4,5}', 3, '40 s', null, null, 5);
    insert into public.plan_notes (professional_id, person_id, note)
    values (v_pedro, v_lucas, 'Se dormir menos de 6h, faça metade das séries. Melhor um treino leve do que faltar.');

    -- Mente (Carlos): respiração.
    insert into public.plan_items (professional_id, person_id, kind, title, weekdays, duration_min, notes, position) values
      (v_carlos, v_lucas, 'respiracao', 'Respiração 4-7-8 antes de dormir', '{1,2,3,4,5,6,7}', 5,
       'Inspire em 4 s, segure por 7 s e solte em 8 s', 1),
      (v_carlos, v_lucas, 'respiracao', 'Respiração quadrada no trabalho', '{1,2,3,4,5}', 4,
       '4 s para inspirar, segurar, soltar e esperar', 2);
    insert into public.plan_notes (professional_id, person_id, note)
    values (v_carlos, v_lucas, 'Faça a 4-7-8 já deitado, com a luz apagada. Na próxima sessão, conversamos sobre como foi o sono.');

    -- Fisio (Fernanda): ombro, como no mockup.
    insert into public.plan_items (professional_id, person_id, kind, title, weekdays, sets, reps, notes, position) values
      (v_fernanda, v_lucas, 'fisio', 'Rotação externa com elástico',      '{1,3,5}',           3, '15',   null, 1),
      (v_fernanda, v_lucas, 'fisio', 'Alongamento de peitoral na parede', '{1,2,3,4,5,6,7}',   3, '30 s', null, 2),
      (v_fernanda, v_lucas, 'fisio', 'Mobilidade de ombro com bastão',    '{1,2,3,4,5,6,7}',   2, '10',   null, 3);
    insert into public.plan_notes (professional_id, person_id, note)
    values (v_fernanda, v_lucas, 'Faça antes do treino de ombros. Combinei com seu personal.');

    -- Marcações dos últimos 6 dias (hoje fica em aberto). Treino e fisio
    -- acompanham as faltas ao treino registradas no 01; o resto falha às vezes.
    insert into public.plan_checks (item_id, person_id, check_date)
    select i.id, v_lucas, d.day
    from public.plan_items i
    cross join lateral (select (v_today - o)::date as day, o from generate_series(1, 6) as o) d
    left join public.daily_logs l on l.user_id = v_lucas and l.log_date = d.day
    where i.person_id = v_lucas
      and extract(isodow from d.day)::smallint = any (i.weekdays)
      and case
            when i.kind in ('treino', 'fisio') then coalesce(l.workout_done, false)
            else (d.o + i.position) % 4 <> 0
          end;

    -- Dor no ombro (0 a 10) da última semana: melhorando aos poucos.
    update public.daily_logs
       set pain_level = case (v_today - log_date) when 0 then 2 when 1 then 3 when 2 then 3 when 3 then 4
                                                  when 4 then 4 when 5 then 5 when 6 then 5 end
     where user_id = v_lucas and log_date between v_today - 6 and v_today;
  end if;
end $$;

-- Conferência: quantos profissionais por especialidade
select specialty, count(*) as total
from public.professionals
where is_demo
group by specialty
order by specialty;
