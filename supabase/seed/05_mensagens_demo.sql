-- =============================================================================
-- Skyro · conversas demonstrativas
--
-- Cria mensagens FICTÍCIAS entre a Ana (nutricionista demo) e alguns pacientes
-- dela, e entre o Lucas e o Pedro (personal). Algumas ficam sem ler, para a
-- caixa de mensagens mostrar o contador.
--
-- Pré-requisito: migration 20261118000002_mensagens.sql.
-- Como rodar: SQL Editor → colar → Run, DEPOIS dos seeds 01, 02 e 03.
-- Pode rodar quantas vezes quiser (as datas acompanham a hora de agora).
-- =============================================================================

do $$
declare
  v_lucas    constant uuid := 'd0000000-0000-4000-8000-000000000001';
  v_ana      constant uuid := 'd0000000-0000-4000-8000-000000000002';
  v_pedro    constant uuid := 'c0000000-0000-4000-8000-000000000003';
  v_beatriz  constant uuid := 'e0000000-0000-4000-8000-000000000001';
  v_rafael   constant uuid := 'e0000000-0000-4000-8000-000000000002';
  v_camila   constant uuid := 'e0000000-0000-4000-8000-000000000003';
begin
  if not exists (select 1 from public.professionals where id = v_ana) then
    raise exception 'Rode primeiro os seeds 01, 02 e 03.';
  end if;

  delete from public.messages where professional_id in (v_ana, v_pedro);

  -- Ana e Lucas
  insert into public.messages (person_id, professional_id, sender_id, body, created_at, read_at) values
    (v_lucas, v_ana, v_lucas, 'Oi, Ana! Essa semana vou ter três dias de plantão. Posso trocar o almoço por marmita congelada?', now() - interval '2 days 3 hours', now() - interval '2 days 2 hours'),
    (v_lucas, v_ana, v_ana,   'Pode sim! Só capricha na proteína e põe uma porção de legume. Te mando umas opções.', now() - interval '2 days 1 hour', now() - interval '2 days'),
    (v_lucas, v_ana, v_ana,   'Vi que você dormiu menos de 6h duas noites seguidas. Nesses dias, evita café depois das 15h, combinado?', now() - interval '3 hours', null);

  -- Ana e Beatriz (bebeu pouca água ontem)
  insert into public.messages (person_id, professional_id, sender_id, body, created_at, read_at) values
    (v_beatriz, v_ana, v_ana,     'Beatriz, ontem a água ficou em 0,8 L. Tudo bem por aí?', now() - interval '5 hours', now() - interval '4 hours'),
    (v_beatriz, v_ana, v_beatriz, 'Correria no trabalho, esqueci a garrafinha em casa 😅', now() - interval '4 hours', null),
    (v_beatriz, v_ana, v_beatriz, 'Hoje já tomei 1 L até agora!', now() - interval '40 minutes', null);

  -- Ana e Rafael (2 dias sem registrar)
  insert into public.messages (person_id, professional_id, sender_id, body, created_at, read_at) values
    (v_rafael, v_ana, v_ana, 'Rafael, senti sua falta nos registros. Se a semana apertou, registra só o sono e a água, já ajuda muito.', now() - interval '1 day', null);

  -- Ana e Camila (em dia)
  insert into public.messages (person_id, professional_id, sender_id, body, created_at, read_at) values
    (v_camila, v_ana, v_camila, 'Ana, posso trocar a tapioca do café por pão integral?', now() - interval '6 days', now() - interval '6 days'),
    (v_camila, v_ana, v_ana,    'Pode! Duas fatias com ovo mexido fica ótimo.', now() - interval '6 days' + interval '2 hours', now() - interval '5 days');

  -- Pedro e Lucas
  if exists (select 1 from public.professionals where id = v_pedro) then
    insert into public.messages (person_id, professional_id, sender_id, body, created_at, read_at) values
      (v_lucas, v_pedro, v_pedro, 'Lucas, faltou ao treino de quarta e quinta. Quer passar para o fim da tarde?', now() - interval '1 day 4 hours', now() - interval '1 day 2 hours'),
      (v_lucas, v_pedro, v_lucas, 'Quero sim, 18h fica melhor para mim.', now() - interval '1 day 2 hours', now() - interval '1 day');
  end if;
end $$;

-- Conferência: mensagens por conversa
select pp.full_name as pessoa, pr.full_name as profissional, count(*) as mensagens,
       count(*) filter (where m.read_at is null) as sem_ler
from public.messages m
join public.profiles pp on pp.id = m.person_id
join public.profiles pr on pr.id = m.professional_id
group by 1, 2
order by 2, 1;
