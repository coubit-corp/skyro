-- =============================================================================
-- Skyro · conversas demonstrativas do chat
--
-- Recria as conversas fictícias da demo (a do Lucas com a Ana segue o mockup
-- "Chat"). Algumas ficam sem ler, para a demo mostrar os avisos:
--   Ana tem 2 não lidas (Lucas e Beatriz); Lucas tem 1 não lida (Pedro).
--
-- Como rodar: SQL Editor → colar → Run, DEPOIS dos seeds 01, 02 e 03
-- e da migration 20261117000001_chat.sql. Pode rodar quantas vezes quiser.
-- =============================================================================

do $$
declare
  v_lucas   constant uuid := 'd0000000-0000-4000-8000-000000000001';
  v_ana     constant uuid := 'd0000000-0000-4000-8000-000000000002';
  v_pedro   constant uuid := 'c0000000-0000-4000-8000-000000000003';
  v_beatriz constant uuid := 'e0000000-0000-4000-8000-000000000001';
begin
  if not exists (select 1 from public.profiles where id = v_lucas)
     or not exists (select 1 from public.professionals where id = v_pedro)
     or not exists (select 1 from public.profiles where id = v_beatriz) then
    raise exception 'Rode antes os seeds 01, 02 e 03.';
  end if;

  delete from public.messages
   where person_id in (select id from public.profiles where is_demo);

  -- Lucas ↔ Ana (nutricionista): a conversa do mockup
  insert into public.messages (person_id, professional_id, sender_id, body, created_at, read_at) values
    (v_lucas, v_ana, v_ana,   'Vi que você dormiu 5h30 ontem. Como foi o dia?',                                   now() - interval '5 hours',    now() - interval '4 hours'),
    (v_lucas, v_ana, v_lucas, 'Cansado, acabei tomando café à tarde.',                                            now() - interval '4 hours',    now() - interval '3 hours 50 minutes'),
    (v_lucas, v_ana, v_ana,   'Entendi. Ajustei o jantar para ficar mais leve e mais cedo. Já está no seu plano.', now() - interval '3 hours 48 minutes', now() - interval '3 hours'),
    (v_lucas, v_ana, v_lucas, 'Valeu! Vou seguir hoje.',                                                          now() - interval '2 hours 50 minutes', null);

  -- Lucas ↔ Pedro (personal): uma mensagem nova para o Lucas
  insert into public.messages (person_id, professional_id, sender_id, body, created_at) values
    (v_lucas, v_pedro, v_pedro, 'Lucas, como você dormiu pouco, deixei o treino de amanhã mais leve. Bora?', now() - interval '40 minutes');

  -- Beatriz ↔ Ana: uma dúvida ainda sem resposta
  insert into public.messages (person_id, professional_id, sender_id, body, created_at) values
    (v_beatriz, v_ana, v_beatriz, 'Oi, Ana! Esqueci de beber água de novo ontem. Tem alguma dica para lembrar?', now() - interval '1 hour 20 minutes');
end $$;

select p.full_name as pessoa, pr.full_name as profissional, count(*) as mensagens,
       count(*) filter (where m.read_at is null) as nao_lidas
from public.messages m
join public.profiles p on p.id = m.person_id
join public.profiles pr on pr.id = m.professional_id
group by 1, 2 order by 1, 2;
