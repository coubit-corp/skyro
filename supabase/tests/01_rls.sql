-- Teste das regras de acesso (RLS). Linhas "deve FALHAR" precisam dar ERROR.
-- Rodar só no Postgres local, depois de 00_stub_supabase.sql e das migrations.
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','{"full_name":"Ana","role":"professional"}'),
 ('00000000-0000-0000-0000-00000000000b','{"full_name":"Lucas"}'),
 ('00000000-0000-0000-0000-00000000000c','{"full_name":"Beatriz"}');
select id, full_name, role from profiles order by full_name;
-- Ana cria o perfil profissional
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into professionals (id, specialty) values (auth.uid(), 'nutricionista');
\echo '-- Ana tenta se dar selo de verificado (deve FALHAR):'
update professionals set verified = true where id = auth.uid();
\echo '-- Lucas tenta virar profissional (deve FALHAR):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update profiles set role='professional' where id=auth.uid();
insert into daily_logs (user_id, log_date, sleep_hours) values (auth.uid(), current_date, 5.5);
insert into shares (person_id, professional_id) values (auth.uid(), '00000000-0000-0000-0000-00000000000a');
\echo '-- share duplicado ativo (deve FALHAR):'
insert into shares (person_id, professional_id) values (auth.uid(), '00000000-0000-0000-0000-00000000000a');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into daily_logs (user_id, log_date, sleep_hours) values (auth.uid(), current_date, 8);
\echo '-- Beatriz tenta escrever log em nome do Lucas (deve FALHAR):'
insert into daily_logs (user_id, log_date, sleep_hours) values ('00000000-0000-0000-0000-00000000000b', current_date - 1, 9);
\echo '-- Ana ve logs (esperado: so o do Lucas, 5.50):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select user_id, sleep_hours from daily_logs;
\echo '-- Ana ve perfis (esperado: Ana e Lucas):'
select full_name from profiles order by 1;
insert into tips (professional_id, person_id, body) values (auth.uid(), '00000000-0000-0000-0000-00000000000b', 'Jante mais cedo');
\echo '-- Dica para Beatriz, sem share (deve FALHAR):'
insert into tips (professional_id, person_id, body) values (auth.uid(), '00000000-0000-0000-0000-00000000000c', 'oi');
\echo '-- Ana tenta alterar log do Lucas (esperado UPDATE 0):'
update daily_logs set sleep_hours = 9;
\echo '-- Lucas revoga; Ana nao ve mais nada (esperado 0 linhas):'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update shares set revoked_at = now() where person_id = auth.uid();
select body from tips;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select count(*) as logs_visiveis from daily_logs;
