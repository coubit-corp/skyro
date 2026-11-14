-- Teste do "Meu plano". Rodar num banco novo com stub + todas as migrations +
-- os 3 seeds. Linhas "deve FALHAR" precisam dar ERROR.
-- Lucas = d...01 · Ana (nutri) = d...02 · Pedro (personal) = c...03
-- Beatriz (paciente da Ana, não compartilha com o Pedro) = e...01
-- Uma pessoa que não compartilha com ninguém = f2...01
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('f2000000-0000-4000-8000-000000000001', '{"full_name":"Sem Equipe","role":"person"}');
set role authenticated;

\echo '== Ana (nutricionista) =='
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000002';
\echo '-- cria refeicao para o Lucas (OK):'
insert into plan_items (professional_id, person_id, kind, title, weekdays, meal_time, foods)
values (auth.uid(), 'd0000000-0000-4000-8000-000000000001', 'refeicao', 'Ceia', '{1,2,3,4,5,6,7}', '21:30', 'Chá e castanhas');
\echo '-- cria treino, que nao e da especialidade dela (deve FALHAR):'
insert into plan_items (professional_id, person_id, kind, title, weekdays, sets, reps)
values (auth.uid(), 'd0000000-0000-4000-8000-000000000001', 'treino', 'Supino', '{1}', 3, '10');
\echo '-- cria refeicao para quem nao compartilha com ela (deve FALHAR):'
insert into plan_items (professional_id, person_id, kind, title, weekdays, meal_time, foods)
values (auth.uid(), 'f2000000-0000-4000-8000-000000000001', 'refeicao', 'Almoço', '{1}', '12:00', 'Arroz');
\echo '-- cria item em nome do Pedro (deve FALHAR):'
insert into plan_items (professional_id, person_id, kind, title, weekdays, meal_time, foods)
values ('c0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'refeicao', 'Almoço', '{1}', '12:00', 'Arroz');
\echo '-- refeicao sem horario (deve FALHAR):'
insert into plan_items (professional_id, person_id, kind, title, weekdays, foods)
values (auth.uid(), 'd0000000-0000-4000-8000-000000000001', 'refeicao', 'Almoço', '{1}', 'Arroz');
\echo '-- dia da semana 8 (deve FALHAR):'
insert into plan_items (professional_id, person_id, kind, title, weekdays, meal_time, foods)
values (auth.uid(), 'd0000000-0000-4000-8000-000000000001', 'refeicao', 'Almoço', '{8}', '12:00', 'Arroz');
\echo '-- video sem https (deve FALHAR):'
insert into plan_items (professional_id, person_id, kind, title, weekdays, meal_time, foods, video_url)
values (auth.uid(), 'd0000000-0000-4000-8000-000000000001', 'refeicao', 'Almoço', '{1}', '12:00', 'Arroz', 'http://exemplo.com');
\echo '-- passa um item para outra pessoa (deve FALHAR):'
update plan_items set person_id = 'e0000000-0000-4000-8000-000000000001' where professional_id = auth.uid() and title = 'Ceia';
\echo '-- cria refeicao para a Beatriz, paciente dela (OK):'
insert into plan_items (professional_id, person_id, kind, title, weekdays, meal_time, foods)
values (auth.uid(), 'e0000000-0000-4000-8000-000000000001', 'refeicao', 'Almoço', '{1,2,3,4,5}', '12:00', 'Arroz e feijão');
\echo '-- Ana ve as marcacoes dos itens dela (esperado mais de 0):'
select count(*) > 0 as ve_marcacoes from plan_checks;
\echo '-- Ana ve a dor do Lucas (esperado 7 dias com dor):'
select count(pain_level) from daily_logs where user_id = 'd0000000-0000-4000-8000-000000000001';

\echo '== Pedro (personal) =='
set request.jwt.claim.sub = 'c0000000-0000-4000-8000-000000000003';
\echo '-- Pedro nao ve itens da Ana (esperado 0):'
select count(*) from plan_items where professional_id = 'd0000000-0000-4000-8000-000000000002';
\echo '-- Pedro nao ve marcacoes dos itens da Ana (esperado 0):'
select count(*) from plan_checks c where not exists (select 1 from plan_items i where i.id = c.item_id);
\echo '-- Pedro tenta editar item da Ana (esperado UPDATE 0):'
update plan_items set title = 'invadido' where professional_id = 'd0000000-0000-4000-8000-000000000002';
\echo '-- Pedro tenta apagar recado da Ana (esperado DELETE 0):'
delete from plan_notes where professional_id = 'd0000000-0000-4000-8000-000000000002';

\echo '== Lucas (pessoa) =='
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
\echo '-- Lucas ve o plano da equipe toda (esperado 15 itens e 4 recados):'
select (select count(*) from plan_items) as itens, (select count(*) from plan_notes) as recados;
\echo '-- Lucas tenta criar item no proprio plano (deve FALHAR):'
insert into plan_items (professional_id, person_id, kind, title, weekdays, meal_time, foods)
values ('d0000000-0000-4000-8000-000000000002', auth.uid(), 'refeicao', 'Pizza', '{1}', '20:00', 'Pizza');
\echo '-- Lucas marca a ceia como feita hoje (OK):'
insert into plan_checks (item_id, person_id, check_date)
select id, auth.uid(), current_date from plan_items where title = 'Ceia';
\echo '-- Lucas marca item da Beatriz (deve FALHAR):'
reset role;
create temp table item_beatriz as select id from plan_items where person_id = 'e0000000-0000-4000-8000-000000000001';
grant select on item_beatriz to authenticated;
set role authenticated;
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
insert into plan_checks (item_id, person_id, check_date) select id, auth.uid(), current_date from item_beatriz;
\echo '-- Lucas registra dor 11 (deve FALHAR):'
update daily_logs set pain_level = 11 where user_id = auth.uid() and log_date = (select max(log_date) from daily_logs where user_id = auth.uid());
\echo '-- Lucas revoga a Ana (OK):'
update shares set revoked_at = now() where person_id = auth.uid() and professional_id = 'd0000000-0000-4000-8000-000000000002';
\echo '-- Lucas continua vendo o plano da Ana (esperado 5 itens e 1 recado):'
select (select count(*) from plan_items where professional_id = 'd0000000-0000-4000-8000-000000000002') as itens,
       (select count(*) from plan_notes where professional_id = 'd0000000-0000-4000-8000-000000000002') as recados;

\echo '== Ana depois da revogacao =='
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000002';
\echo '-- Ana nao ve mais o plano do Lucas (esperado 0):'
select count(*) from plan_items where person_id = 'd0000000-0000-4000-8000-000000000001';
\echo '-- Ana nao ve mais as marcacoes do Lucas (esperado 0):'
select count(*) from plan_checks where person_id = 'd0000000-0000-4000-8000-000000000001';
\echo '-- Ana tenta criar item para o Lucas (deve FALHAR):'
insert into plan_items (professional_id, person_id, kind, title, weekdays, meal_time, foods)
values (auth.uid(), 'd0000000-0000-4000-8000-000000000001', 'refeicao', 'Almoço', '{1}', '12:00', 'Arroz');
\echo '-- Ana tenta apagar o plano do Lucas (esperado DELETE 0):'
delete from plan_items where person_id = 'd0000000-0000-4000-8000-000000000001';
\echo '-- Ana continua editando o plano da Beatriz (esperado UPDATE 1):'
update plan_items set title = 'Almoço reforçado' where person_id = 'e0000000-0000-4000-8000-000000000001';
reset role;
