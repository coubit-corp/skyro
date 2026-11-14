-- Teste das regras de acesso dos resumos por IA. Rodar depois de 01_rls.sql NÃO:
-- use um banco novo com stub + migrations + os 3 seeds. A linha "deve FALHAR" precisa dar ERROR.
\set ON_ERROR_STOP 0
set role authenticated;
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000002';
\echo '-- Ana grava resumo do Lucas (OK):'
insert into ai_summaries (professional_id, person_id, logs_version, lines, attention, model) values (auth.uid(), 'd0000000-0000-4000-8000-000000000001', 'v1', '{a}', 'x', 'm');
\echo '-- Ana grava resumo de quem NAO compartilha (deve FALHAR):'
insert into ai_summaries (professional_id, person_id, logs_version, lines, attention, model) values (auth.uid(), 'c0000000-0000-4000-8000-000000000001', 'v1', '{a}', 'x', 'm');
set request.jwt.claim.sub = 'c0000000-0000-4000-8000-000000000003';
\echo '-- Pedro (outro profissional) le os resumos da Ana (esperado 0):'
select count(*) from ai_summaries;
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
update shares set revoked_at = now() where person_id = auth.uid() and professional_id = 'd0000000-0000-4000-8000-000000000002';
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000002';
\echo '-- Lucas revogou; Ana nao ve mais o resumo (esperado 0):'
select count(*) from ai_summaries;
