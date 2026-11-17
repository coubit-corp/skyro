-- Teste das regras do chat. Rodar num banco novo com stub + todas as migrations
-- + os seeds 01 a 04. Linhas "deve FALHAR" precisam dar ERROR.
\set ON_ERROR_STOP 0
set role authenticated;

-- Lucas (pessoa) compartilha com Ana e Pedro; Carlos Souza (c...01) também é da equipe dele.
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
\echo '-- Lucas ve as proprias conversas (esperado 5):'
select count(*) from messages;
\echo '-- Lucas manda mensagem para a Ana (OK):'
insert into messages (person_id, professional_id, sender_id, body) values (auth.uid(), 'd0000000-0000-4000-8000-000000000002', auth.uid(), 'Oi, Ana!');
\echo '-- Lucas manda para profissional SEM compartilhamento, Marina (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body) values (auth.uid(), 'c0000000-0000-4000-8000-000000000004', auth.uid(), 'Oi');
\echo '-- Lucas finge ser a Ana (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body) values (auth.uid(), 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'falso');
\echo '-- mensagem vazia (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body) values (auth.uid(), 'd0000000-0000-4000-8000-000000000002', auth.uid(), '   ');
\echo '-- Lucas edita o texto de uma mensagem (deve FALHAR):'
update messages set body = 'editado' where sender_id = auth.uid();
\echo '-- Lucas apaga mensagem (deve FALHAR):'
delete from messages where sender_id = auth.uid();
\echo '-- Lucas marca como lida a mensagem do Pedro (esperado UPDATE 1):'
update messages set read_at = now() where sender_id = 'c0000000-0000-4000-8000-000000000003' and read_at is null;
\echo '-- Lucas tenta marcar como lida a PROPRIA mensagem (esperado UPDATE 0):'
update messages set read_at = now() where sender_id = auth.uid() and read_at is null;

set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000002';
\echo '-- Ana ve as conversas dos pacientes dela (Lucas 5 + Beatriz 1 = 6):'
select count(*) from messages;
\echo '-- Ana responde a Beatriz (OK):'
insert into messages (person_id, professional_id, sender_id, body) values ('e0000000-0000-4000-8000-000000000001', auth.uid(), auth.uid(), 'Deixe uma garrafa na mesa!');
\echo '-- Ana manda para quem nao compartilha com ela, Carlos do catalogo (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body) values ('c0000000-0000-4000-8000-000000000001', auth.uid(), auth.uid(), 'oi');

set request.jwt.claim.sub = 'c0000000-0000-4000-8000-000000000003';
\echo '-- Pedro nao ve a conversa do Lucas com a Ana (esperado so a dele = 1):'
select count(*) from messages;

\echo '-- Lucas revoga a Ana:'
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
update shares set revoked_at = now() where person_id = auth.uid() and professional_id = 'd0000000-0000-4000-8000-000000000002';
\echo '-- Lucas continua vendo o historico com a Ana (esperado 5):'
select count(*) from messages where professional_id = 'd0000000-0000-4000-8000-000000000002';
\echo '-- Lucas nao consegue mais mandar para a Ana (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body) values (auth.uid(), 'd0000000-0000-4000-8000-000000000002', auth.uid(), 'oi?');
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000002';
\echo '-- Ana deixa de ver a conversa com o Lucas (esperado 0):'
select count(*) from messages where person_id = 'd0000000-0000-4000-8000-000000000001';
\echo '-- Ana nao consegue mandar para o Lucas (deve FALHAR):'
insert into messages (person_id, professional_id, sender_id, body) values ('d0000000-0000-4000-8000-000000000001', auth.uid(), auth.uid(), 'oi');
