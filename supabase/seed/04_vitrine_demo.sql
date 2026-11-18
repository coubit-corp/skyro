-- =============================================================================
-- Skyro · vitrine dos profissionais demonstrativos
--
-- Preenche formação, anos na área, idade e experiências da Ana e dos 12
-- profissionais do catálogo, e cria avaliações FICTÍCIAS com comentário:
--   · a Ana é avaliada pelos 5 pacientes demonstrativos dela (03_pacientes_demo.sql);
--   · os outros, por 8 pessoas fictícias (sem senha, ninguém entra com elas)
--     que já foram atendidas e pararam de compartilhar.
-- A nota e o total de cada perfil passam a ser a média e a contagem dessas
-- avaliações (quem calcula é o banco).
--
-- O Lucas (pessoa demo) fica sem avaliar ninguém, para dar para testar
-- "Avaliar" no perfil da Ana, do Pedro ou da Fernanda.
--
-- Fica de fora de propósito: links de redes sociais e fotos e vídeos. Na demo
-- não colocamos links para perfis reais de terceiros nem imagens de pessoas.
--
-- Psicólogos continuam sem nota pública (regras do CFP).
--
-- Pré-requisito: migration 20261118000001_vitrine_profissional.sql.
-- Como rodar: SQL Editor → colar → Run, DEPOIS dos seeds 01, 02 e 03.
-- Se rodar algum deles de novo, rode este também. Pode rodar quantas vezes quiser.
-- =============================================================================

do $$
declare
  v_ana constant uuid := 'd0000000-0000-4000-8000-000000000002';
  r record;
  v_id uuid;
  v_n int;
  v_reviewers uuid[] := '{}';
  v_total int;
  i int;
begin
  if not exists (select 1 from public.professionals where id = v_ana) then
    raise exception 'Rode primeiro os seeds 01, 02 e 03.';
  end if;

  -- 1. Formação, anos na área, idade e experiências
  for r in
    select p.id, p.specialty,
           -- número fixo por profissional, só para variar os dados fictícios
           abs(hashtext(p.id::text)) % 1000 as n
    from public.professionals p
    where p.is_demo
  loop
    update public.professionals set
      years_experience = 3 + r.n % 15,
      birth_year       = 1978 + r.n % 18,
      education = case r.specialty
        when 'nutricionista'  then (array['Nutrição pela USP', 'Nutrição pela Unifesp', 'Nutrição pelo Centro Universitário São Camilo'])[1 + r.n % 3]
        when 'personal'       then (array['Educação Física pela USP', 'Educação Física pela Unicamp', 'Educação Física pela Universidade São Judas'])[1 + r.n % 3]
        when 'fisioterapeuta' then (array['Fisioterapia pela Unifesp', 'Fisioterapia pela PUC-Campinas'])[1 + r.n % 2]
        else                       (array['Psicologia pela PUC-SP', 'Psicologia pela USP', 'Psicologia pelo Mackenzie'])[1 + r.n % 3]
      end,
      experiences = case r.specialty
        when 'nutricionista' then array[
          'Pós-graduação em Nutrição Esportiva',
          'Nutricionista em academia por 4 anos',
          'Atendimento em clínica multidisciplinar']
        when 'personal' then array[
          'Especialização em Fisiologia do Exercício',
          'Coordenação de musculação em academia',
          'Assessoria de corrida para provas de 5 e 10 km']
        when 'fisioterapeuta' then array[
          'Especialização em Fisioterapia Esportiva',
          'Atendimento a atletas amadores de corrida',
          'Pilates clínico']
        else array[
          'Formação em Terapia Cognitivo-Comportamental',
          'Atendimento em clínica-escola',
          'Grupos de manejo de ansiedade']
      end
    where id = r.id;
  end loop;

  -- 2. Pessoas fictícias que avaliam o catálogo
  delete from auth.users where email like 'demo.avaliador.%@skyro.app';

  for r in
    select * from (values
      (1, 'Renata Oliveira'), (2, 'Diego Santana'), (3, 'Patrícia Gomes'), (4, 'Marcelo Rocha'),
      (5, 'Aline Barbosa'),   (6, 'Felipe Cardoso'), (7, 'Vanessa Lima'), (8, 'Rodrigo Mendes')
    ) as t(n, nome)
  loop
    v_id := ('a1000000-0000-4000-8000-' || lpad(r.n::text, 12, '0'))::uuid;
    insert into auth.users (
      instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'demo.avaliador.' || r.n || '@skyro.app',
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', r.nome, 'role', 'person'),
      now(), now(), '', '', '', ''
    );
    update public.profiles set is_demo = true, avatar_seed = lower(replace(r.nome, ' ', '-')) where id = v_id;
    v_reviewers := v_reviewers || v_id;
  end loop;

  -- 3. Avaliações do catálogo: 4 a 6 por profissional (menos psicólogos).
  --    Cada avaliador já compartilhou a rotina e parou depois.
  for r in
    select p.id, p.specialty, right(p.id::text, 2)::int as n
    from public.professionals p
    where p.is_demo and p.id <> v_ana and p.specialty <> 'psicologo'
  loop
    v_total := 4 + r.n % 3;
    for i in 1 .. v_total loop
      v_id := v_reviewers[1 + (r.n + i) % 8];
      insert into public.shares (person_id, professional_id, created_at, revoked_at)
      values (v_id, r.id, now() - make_interval(days => 200 - i * 10), now() - make_interval(days => 60 - i * 5));
      insert into public.professional_reviews (professional_id, person_id, rating, comment, created_at)
      values (
        r.id, v_id,
        case when (r.n * 3 + i) % 4 = 0 then 4 when (r.n + i * 5) % 11 = 0 then 3 else 5 end,
        case r.specialty
          when 'nutricionista' then (array[
            'Plano simples, sem dieta maluca. Perdi 4 kg em dois meses sem passar fome.',
            'Ajustou o cardápio para a minha rotina de plantão. Muito atenciosa.',
            'Me ensinou a montar marmitas para a semana. Fez toda a diferença.',
            'Acompanhamento próximo, respondia as dúvidas entre as consultas.',
            'Gostei de como cruzou meu sono com a fome à noite. Faz sentido!',
            'Consulta pontual e objetiva. Recomendo.'])[1 + (r.n + i) % 6]
          when 'personal' then (array[
            'Treinos curtos e puxados, do jeito que eu precisava. Voltei a correr sem dor.',
            'Muito paciente com quem está começando. Me sinto seguro nos exercícios.',
            'Adapta o treino quando eu durmo mal. Nunca mais faltei por cansaço.',
            'Ganhei força e disposição em três meses. Profissional sério.',
            'Pontual, motivador e explica o porquê de cada exercício.',
            'Bom treino, mas às vezes remarcava os horários.'])[1 + (r.n + i) % 6]
          else (array[
            'A dor no ombro sumiu em poucas semanas com os exercícios de casa.',
            'Explica tudo com calma e combina os exercícios com o personal.',
            'Melhorou muito minha postura no home office.',
            'Atendimento cuidadoso, sessões bem organizadas.',
            'Os exercícios de 15 minutos são fáceis de encaixar no dia.',
            'Boa profissional, só achei o horário de sábado concorrido.'])[1 + (r.n + i) % 6]
        end,
        now() - make_interval(days => 50 - i * 6)
      );
    end loop;
  end loop;

  -- 4. Avaliações da Ana pelos pacientes demonstrativos dela
  for r in
    select * from (values
      (1, 5, 'A Ana percebeu que eu bebia pouca água antes de mim. As dicas pelo app ajudam muito.'),
      (2, 4, 'Plano prático e fácil de seguir. Só queria mais receitas.'),
      (3, 5, 'Primeira nutri que olhou meu sono e meu treino juntos. Mudou meu jeito de comer.'),
      (4, 5, 'Oito meses de acompanhamento e nunca me senti de dieta. Recomendo demais.'),
      (5, 5, 'Atenciosa, objetiva e o plano cabe na minha rotina corrida.')
    ) as t(n, nota, comentario)
  loop
    v_id := ('e0000000-0000-4000-8000-' || lpad(r.n::text, 12, '0'))::uuid;
    if exists (select 1 from public.profiles where id = v_id) then
      insert into public.professional_reviews (professional_id, person_id, rating, comment, created_at)
      values (v_ana, v_id, r.nota, r.comentario, now() - make_interval(days => r.n * 4))
      on conflict (professional_id, person_id) do update set rating = excluded.rating, comment = excluded.comment;
    end if;
  end loop;
end $$;

-- Conferência: nota e total de avaliações de cada profissional demo
select pr.full_name, p.specialty, p.rating, p.reviews_count, p.years_experience, p.education
from public.professionals p
join public.profiles pr on pr.id = p.id
where p.is_demo
order by p.specialty, pr.full_name;
