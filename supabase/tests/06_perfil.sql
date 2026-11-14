-- Teste das configurações de perfil. Rodar num banco novo com stub + todas as
-- migrations + os 3 seeds. Linhas "deve FALHAR" precisam dar ERROR.
-- f3...01 = pessoa real · f3...02 = profissional real · Lucas e Ana = contas demo
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('f3000000-0000-4000-8000-000000000001', '{"full_name":"Pessoa Real","role":"person"}'),
  ('f3000000-0000-4000-8000-000000000002', '{"full_name":"Pro Real","role":"professional"}');
insert into shares (person_id, professional_id) values ('f3000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002');
set role authenticated;

\echo '== pessoa real =='
set request.jwt.claim.sub = 'f3000000-0000-4000-8000-000000000001';
\echo '-- salva bio e telefone (OK):'
update profiles set bio = 'Corro aos fins de semana.' where id = auth.uid();
insert into private_contacts (user_id, phone) values (auth.uid(), '11987654321');
\echo '-- telefone com letras (deve FALHAR):'
update private_contacts set phone = '(11) 98765-4321' where user_id = auth.uid();
\echo '-- bio com 301 caracteres (deve FALHAR):'
update profiles set bio = repeat('a', 301) where id = auth.uid();
\echo '-- grava telefone em nome de outra conta (deve FALHAR):'
insert into private_contacts (user_id, phone) values ('f3000000-0000-4000-8000-000000000002', '11999999999');
\echo '-- envia foto na propria pasta (OK):'
insert into storage.objects (bucket_id, name) values ('avatars', 'f3000000-0000-4000-8000-000000000001/foto-1.jpg');
\echo '-- envia foto na pasta de outra conta (deve FALHAR):'
insert into storage.objects (bucket_id, name) values ('avatars', 'f3000000-0000-4000-8000-000000000002/foto-1.jpg');
\echo '-- aponta o perfil para a propria foto (OK):'
update profiles set avatar_path = 'f3000000-0000-4000-8000-000000000001/foto-1.jpg' where id = auth.uid();
\echo '-- aponta o perfil para a foto de outra conta (deve FALHAR):'
update profiles set avatar_path = 'f3000000-0000-4000-8000-000000000002/foto-1.jpg' where id = auth.uid();
\echo '-- aponta o perfil para um link de fora (deve FALHAR):'
update profiles set avatar_path = 'https://exemplo.com/x.jpg' where id = auth.uid();
\echo '-- tenta escapar da pasta com ".." (deve FALHAR):'
update profiles set avatar_path = 'f3000000-0000-4000-8000-000000000001/../x.jpg' where id = auth.uid();
\echo '-- tenta virar demo para nada (deve FALHAR):'
update profiles set is_demo = true where id = auth.uid();

\echo '== Ana (profissional demo, acompanha a pessoa real) =='
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000002';
\echo '-- Ana ve a bio da paciente (esperado a bio):'
select bio from profiles where id = 'f3000000-0000-4000-8000-000000000001';
\echo '-- Ana NAO ve o telefone da paciente (esperado 0):'
select count(*) from private_contacts;
\echo '-- conta demo tenta enviar foto (deve FALHAR):'
insert into storage.objects (bucket_id, name) values ('avatars', 'd0000000-0000-4000-8000-000000000002/foto.jpg');
\echo '-- conta demo tenta guardar telefone (deve FALHAR):'
insert into private_contacts (user_id, phone) values (auth.uid(), '11911112222');
\echo '-- Ana nao lista nem apaga a foto da paciente (esperado 0 e DELETE 0):'
select count(*) from storage.objects;
delete from storage.objects where bucket_id = 'avatars';
\echo '-- Ana salva horarios validos (OK):'
update professionals set availability = '{"1":["08:00","12:00"],"3":["14:00","18:00"]}' where id = auth.uid();
\echo '-- horario com fim antes do inicio (deve FALHAR):'
update professionals set availability = '{"1":["18:00","08:00"]}' where id = auth.uid();
\echo '-- dia 8 (deve FALHAR):'
update professionals set availability = '{"8":["08:00","12:00"]}' where id = auth.uid();
\echo '-- hora invalida (deve FALHAR):'
update professionals set availability = '{"1":["8h","12h"]}' where id = auth.uid();
\echo '-- horarios de outro profissional (esperado UPDATE 0):'
update professionals set availability = '{}' where id = 'c0000000-0000-4000-8000-000000000003';

\echo '== profissional real =='
set request.jwt.claim.sub = 'f3000000-0000-4000-8000-000000000002';
\echo '-- nao ve o telefone de ninguem (esperado 0):'
select count(*) from private_contacts;
\echo '-- cria o perfil ja com horarios (OK):'
insert into professionals (id, specialty, modality, registry, bio, availability)
values (auth.uid(), 'personal', 'online', 'CREF 123456-G/SP', 'Treinos online.', '{"2":["07:00","11:00"]}');

\echo '== pessoa real apaga a propria foto (esperado DELETE 1) =='
set request.jwt.claim.sub = 'f3000000-0000-4000-8000-000000000001';
delete from storage.objects where bucket_id = 'avatars';
\echo '== anonimo nao ve telefones (deve FALHAR ou 0) =='
reset role; set role anon;
select count(*) from private_contacts;
reset role;
