-- Teste da aprovação de registros pela equipe. Rodar num banco novo com stub +
-- todas as migrations + os 3 seeds. Linhas "deve FALHAR" precisam dar ERROR.
\set ON_ERROR_STOP 0
-- f1: profissional real (não demo) · f2: pessoa comum · f3: admin real
insert into auth.users (id, raw_user_meta_data) values
  ('f1000000-0000-4000-8000-000000000001', '{"full_name":"Nutri Real","role":"professional"}'),
  ('f1000000-0000-4000-8000-000000000002', '{"full_name":"Pessoa Comum","role":"person"}'),
  ('f1000000-0000-4000-8000-000000000003', '{"full_name":"Admin Real","role":"admin"}');
update profiles set role = 'admin' where id = 'f1000000-0000-4000-8000-000000000003';
insert into professionals (id, specialty, modality, registry, bio)
values ('f1000000-0000-4000-8000-000000000001', 'nutricionista', 'online', 'CRN-3 55555', 'Atendo online.');
set role authenticated;

\echo '-- cadastro pelo app com role admin vira pessoa (esperado person):'
reset role;
insert into auth.users (id, raw_user_meta_data) values ('f1000000-0000-4000-8000-000000000009', '{"full_name":"Esperto","role":"admin"}');
select role from profiles where id = 'f1000000-0000-4000-8000-000000000009';
set role authenticated;

\echo '-- profissional tenta se promover a admin (deve FALHAR):'
set request.jwt.claim.sub = 'f1000000-0000-4000-8000-000000000001';
update profiles set role = 'admin' where id = auth.uid();
\echo '-- profissional tenta se aprovar pela funcao (deve FALHAR: sem_permissao):'
select review_professional(auth.uid(), 'aprovado', 'CRN-3 55555');
\echo '-- profissional tenta apagar a propria recusa direto (deve FALHAR):'
update professionals set rejection_reason = null where id = auth.uid();
\echo '-- profissional tenta gravar no historico (deve FALHAR):'
insert into registry_reviews (professional_id, decision, specialty) values (auth.uid(), 'aprovado', 'nutricionista');

\echo '-- admin demo tenta aprovar perfil REAL (deve FALHAR: demo_so_decide_perfis_demo):'
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000003';
select review_professional('f1000000-0000-4000-8000-000000000001', 'aprovado', 'CRN-3 55555');
\echo '-- admin demo aprova perfil demo pendente, Rafael (OK):'
select review_professional('c0000000-0000-4000-8000-000000000005', 'aprovado', 'Registro fictício (demo)');
select verified, rejection_reason is null as sem_recusa, reviewed_at is not null as revisado
from professionals where id = 'c0000000-0000-4000-8000-000000000005';
\echo '-- recusa sem motivo (deve FALHAR: motivo_invalido):'
select review_professional('c0000000-0000-4000-8000-000000000011', 'recusado', 'Registro fictício (demo)', '  curto ');
\echo '-- decisao desconhecida (deve FALHAR: decisao_invalida):'
select review_professional('c0000000-0000-4000-8000-000000000011', 'talvez', 'Registro fictício (demo)');
\echo '-- aprovar um registro diferente do que esta no banco (deve FALHAR: registro_mudou):'
select review_professional('c0000000-0000-4000-8000-000000000011', 'aprovado', 'CREF 000000-G/SP');
\echo '-- admin demo recusa o Bruno com motivo (OK):'
select review_professional('c0000000-0000-4000-8000-000000000011', 'recusado', 'Registro fictício (demo)', 'Número não encontrado na consulta do CREF.');
select verified, rejection_reason from professionals where id = 'c0000000-0000-4000-8000-000000000011';
\echo '-- admin le o historico (esperado 2):'
select count(*) from registry_reviews;

\echo '-- admin real aprova perfil real (OK):'
set request.jwt.claim.sub = 'f1000000-0000-4000-8000-000000000003';
select review_professional('f1000000-0000-4000-8000-000000000001', 'aprovado', 'CRN-3 55555');
select verified from professionals where id = 'f1000000-0000-4000-8000-000000000001';

\echo '-- pessoa comum nao le o historico (esperado 0):'
set request.jwt.claim.sub = 'f1000000-0000-4000-8000-000000000002';
select count(*) from registry_reviews;
\echo '-- pessoa comum nao chama a funcao (deve FALHAR: sem_permissao):'
select review_professional('c0000000-0000-4000-8000-000000000011', 'aprovado', 'Registro fictício (demo)');
\echo '-- recusado some da busca da pessoa comum (esperado 0):'
select count(*) from professionals where id = 'c0000000-0000-4000-8000-000000000011';
\echo '-- catalogo da pessoa comum: 13 demo + 1 real - 1 recusado (esperado 13):'
select count(*) from professionals;

\echo '-- quem ja tem vinculo continua vendo o recusado (esperado 1):'
reset role;
insert into shares (person_id, professional_id) values ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000011');
set role authenticated;
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
select count(*) from professionals where id = 'c0000000-0000-4000-8000-000000000011';

\echo '-- o proprio recusado ve o motivo (esperado o motivo):'
set request.jwt.claim.sub = 'c0000000-0000-4000-8000-000000000011';
select rejection_reason from professionals where id = auth.uid();
\echo '-- mudar so a bio mantem a recusa (esperado t):'
update professionals set bio = 'Bio corrigida.' where id = auth.uid();
select rejection_reason is not null from professionals where id = auth.uid();
\echo '-- trocar o registro volta para pendente (esperado f, t, t):'
update professionals set registry = 'CREF 123456-G/SP' where id = auth.uid();
select verified, rejection_reason is null as sem_recusa, reviewed_at is null as nao_revisado from professionals where id = auth.uid();
\echo '-- e ele reaparece na busca da pessoa comum (esperado 1):'
set request.jwt.claim.sub = 'f1000000-0000-4000-8000-000000000002';
select count(*) from professionals where id = 'c0000000-0000-4000-8000-000000000011';
\echo '-- anonimo nao chama a funcao (deve FALHAR: permissao negada):'
reset role;
set role anon;
select review_professional('c0000000-0000-4000-8000-000000000011', 'aprovado', 'CREF 123456-G/SP');
reset role;
