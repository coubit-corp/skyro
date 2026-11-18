-- Teste das mensagens. Rodar num banco novo com stub + todas as migrations +
-- os seeds 01 a 05. Linhas "deve FALHAR" precisam dar ERROR.
-- f8...01 = pessoa real · f8...02 = profissional real · f8...03 = outro profissional real
-- Lucas = pessoa demo · Ana = nutricionista demo
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('f8000000-0000-4000-8000-000000000001', '{"full_name":"Pessoa Real","role":"person"}'),
  ('f8000000-0000-4000-8000-000000000002', '{"full_name":"Pro Real","role":"professional"}'),
  ('f8000000-0000-4000-8000-000000000003', '{"full_name":"Outro Pro","role":"professional"}');
insert into professionals (id, specialty, modality) values
  ('f8000000-0000-4000-8000-000000000002', 'personal', 'online'),
  ('f8000000-0000-4000-8000-000000000003', 'nutricionista', 'online');
-- A pessoa real compartilha com o Pro Real e com a Ana (demo).
insert into shares (person_id, professional_id) values
  ('f8000000-0000-4000-8000-000000000001', 'f8000000-0000-4000-8000-000000000002'),
  ('f8000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002');
set role authenticated;

\echo '== pessoa real =='
set request.jwt.claim.sub = 'f8000000-0000-4000-8000-000000000001';
\echo '-- manda mensagem para o Pro Real (OK):'
insert into messages (person_id, professional_id, sender_id, body)
values (auth.uid(), 'f8000000-0000-4000-8000-000000000002', auth.uid(), 'Oi! Posso treinar com dor no joelho?');
\echo '-- manda para quem nao acompanha (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body)
values (auth.uid(), 'f8000000-0000-4000-8000-000000000003', auth.uid(), 'Oi');
\echo '-- manda em nome do profissional (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body)
values (auth.uid(), 'f8000000-0000-4000-8000-000000000002', 'f8000000-0000-4000-8000-000000000002', 'Pode sim');
\echo '-- mensagem vazia (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body)
values (auth.uid(), 'f8000000-0000-4000-8000-000000000002', auth.uid(), '   ');
\echo '-- marca a propria mensagem como lida (esperado UPDATE 0):'
update messages set read_at = now() where sender_id = auth.uid();
\echo '-- nao ve conversas dos outros (esperado 1):'
select count(*) from messages;

\echo '== Pro Real =='
set request.jwt.claim.sub = 'f8000000-0000-4000-8000-000000000002';
\echo '-- ve a mensagem da paciente (esperado 1):'
select count(*) from messages;
\echo '-- responde (OK):'
insert into messages (person_id, professional_id, sender_id, body)
values ('f8000000-0000-4000-8000-000000000001', auth.uid(), auth.uid(), 'Pode, mas sem agachamento profundo.');
\echo '-- marca como lida a mensagem recebida (esperado UPDATE 1):'
update messages set read_at = now() where sender_id <> auth.uid();
\echo '-- tenta editar o texto (deve FALHAR):'
update messages set body = 'outra coisa' where sender_id = auth.uid();
\echo '-- tenta apagar (deve FALHAR):'
delete from messages;
\echo '-- manda para quem nao compartilha com ele (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body)
values ('d0000000-0000-4000-8000-000000000001', auth.uid(), auth.uid(), 'Oi Lucas');

\echo '== Ana (demo) e a pessoa real =='
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000002';
\echo '-- demo manda mensagem para pessoa real (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body)
values ('f8000000-0000-4000-8000-000000000001', auth.uid(), auth.uid(), 'Oi');
\echo '-- demo conversa com o Lucas, demo (OK):'
insert into messages (person_id, professional_id, sender_id, body)
values ('d0000000-0000-4000-8000-000000000001', auth.uid(), auth.uid(), 'Bom dia, Lucas!');
\echo '-- Ana nao ve a conversa da pessoa real com o Pro Real (esperado 0):'
select count(*) from messages where professional_id = 'f8000000-0000-4000-8000-000000000002';

\echo '== pessoa real para de compartilhar com o Pro Real =='
set request.jwt.claim.sub = 'f8000000-0000-4000-8000-000000000001';
update shares set revoked_at = now() where professional_id = 'f8000000-0000-4000-8000-000000000002';
\echo '-- a pessoa continua vendo o historico (esperado 2):'
select count(*) from messages where professional_id = 'f8000000-0000-4000-8000-000000000002';
\echo '-- mas nao manda mensagem nova (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body)
values (auth.uid(), 'f8000000-0000-4000-8000-000000000002', auth.uid(), 'Oi de novo');

set request.jwt.claim.sub = 'f8000000-0000-4000-8000-000000000002';
\echo '-- o Pro Real perde o acesso ao historico (esperado 0):'
select count(*) from messages;
\echo '-- e nao manda mensagem nova (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body)
values ('f8000000-0000-4000-8000-000000000001', auth.uid(), auth.uid(), 'Volta?');

\echo '== anonimo nao le mensagens (deve FALHAR ou 0) =='
reset role; set role anon;
select count(*) from messages;
reset role;
