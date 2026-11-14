-- =============================================================================
-- Skyro · catálogo demonstrativo do "Perto de você"
--
-- Cria 12 profissionais FICTÍCIOS em bairros de São Paulo (perto de Pinheiros),
-- de todas as especialidades. Eles não têm senha: só aparecem no catálogo,
-- ninguém entra com essas contas.
--
-- Também coloca o Pedro (personal) na equipe do Lucas, como no mockup "Sua saúde".
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
      modality, rating, reviews_count, is_demo
    ) values (
      v_id, r.esp, r.bio, 'Registro fictício (demo)', r.verificado, r.tags, 'São Paulo', r.bairro,
      r.lat, r.lng, r.modalidade, r.nota, r.avaliacoes, true
    );
  end loop;

  -- Pedro (personal) entra na equipe do Lucas, se o Lucas existir
  if exists (select 1 from public.profiles where id = v_lucas) then
    insert into public.shares (person_id, professional_id, created_at)
    values (v_lucas, 'c0000000-0000-4000-8000-000000000003', now() - interval '60 days');
  end if;
end $$;

-- Conferência: quantos profissionais por especialidade
select specialty, count(*) as total
from public.professionals
where is_demo
group by specialty
order by specialty;
