-- Teste do cadastro de profissional. Rodar num banco novo com stub + todas as
-- migrations + os 3 seeds. Linhas "deve FALHAR" precisam dar ERROR.
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('f0000000-0000-4000-8000-000000000001', '{"full_name":"Nova Nutri","role":"professional"}'),
  ('f0000000-0000-4000-8000-000000000002', '{"full_name":"Pessoa Comum","role":"person"}');
set role authenticated;

set request.jwt.claim.sub = 'f0000000-0000-4000-8000-000000000001';
\echo '-- presencial sem local no mapa (deve FALHAR):'
insert into professionals (id, specialty, modality) values (auth.uid(), 'nutricionista', 'presencial');
\echo '-- so online, sem local (OK):'
insert into professionals (id, specialty, modality, registry, bio) values (auth.uid(), 'nutricionista', 'online', 'CRN-3 12345', 'Atendo online.');
\echo '-- passa a presencial com local e muda a bio (OK):'
update professionals set modality = 'ambos', lat = -23.56, lng = -46.68, neighborhood = 'Pinheiros', bio = 'Atendo em Pinheiros.' where id = auth.uid();
\echo '-- tenta se dar selo de verificado (deve FALHAR):'
update professionals set verified = true where id = auth.uid();
\echo '-- bio com mais de 400 caracteres (deve FALHAR):'
update professionals set bio = repeat('a', 401) where id = auth.uid();
\echo '-- 7 especialidades (deve FALHAR):'
update professionals set tags = array['a','b','c','d','e','f','g'] where id = auth.uid();
reset role;
update professionals set verified = true where id = 'f0000000-0000-4000-8000-000000000001';
set role authenticated;
set request.jwt.claim.sub = 'f0000000-0000-4000-8000-000000000001';
\echo '-- mudar so a bio mantem o selo (esperado t):'
update professionals set bio = 'Bio nova.' where id = auth.uid();
select verified from professionals where id = auth.uid();
\echo '-- trocar o registro tira o selo (esperado f):'
update professionals set registry = 'CRN-3 99999' where id = auth.uid();
select verified from professionals where id = auth.uid();
\echo '-- editar o perfil de outro profissional (esperado UPDATE 0 / nenhuma linha):'
update professionals set bio = 'invadido' where id = 'd0000000-0000-4000-8000-000000000002' returning id;
\echo '-- pessoa comum tenta criar perfil profissional (deve FALHAR):'
set request.jwt.claim.sub = 'f0000000-0000-4000-8000-000000000002';
insert into professionals (id, specialty, modality) values (auth.uid(), 'personal', 'online');
\echo '-- a pessoa ja enxerga a nova nutri no catalogo (esperado 1):'
select count(*) from professionals where id = 'f0000000-0000-4000-8000-000000000001';
