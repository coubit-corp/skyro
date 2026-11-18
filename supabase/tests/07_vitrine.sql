-- Teste da vitrine do profissional (formação, redes, galeria e avaliações).
-- Rodar num banco novo com stub + todas as migrations + os 4 seeds.
-- Linhas "deve FALHAR" precisam dar ERROR.
-- f7...01 = pessoa real · f7...02 = profissional real · f7...03 = outra pessoa real
-- Lucas = pessoa demo · Ana = nutricionista demo · Carlos (c...01) = psicólogo demo
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('f7000000-0000-4000-8000-000000000001', '{"full_name":"Paula Real Souza","role":"person"}'),
  ('f7000000-0000-4000-8000-000000000002', '{"full_name":"Pro Real","role":"professional"}'),
  ('f7000000-0000-4000-8000-000000000003', '{"full_name":"Outra Pessoa","role":"person"}');
insert into professionals (id, specialty, modality, registry, bio)
values ('f7000000-0000-4000-8000-000000000002', 'personal', 'online', 'CREF 123456-G/SP', 'Treinos online.');
-- Paula já compartilhou com o Pro Real e parou; a Outra Pessoa nunca compartilhou.
insert into shares (person_id, professional_id, revoked_at)
values ('f7000000-0000-4000-8000-000000000001', 'f7000000-0000-4000-8000-000000000002', now());
set role authenticated;

\echo '== profissional real: formacao e redes =='
set request.jwt.claim.sub = 'f7000000-0000-4000-8000-000000000002';
\echo '-- salva formacao, anos, ano de nascimento e experiencias (OK):'
update professionals set education = 'Educação Física pela USP', years_experience = 8, birth_year = 1990,
  experiences = array['Assessoria de corrida', 'Musculação'] where id = auth.uid();
\echo '-- salva redes validas (OK):'
update professionals set social_links = '{"instagram":"https://www.instagram.com/pro.real","facebook":"https://www.facebook.com/proreal","tiktok":"https://www.tiktok.com/@pro.real","youtube":"https://www.youtube.com/@proreal","linkedin":"https://www.linkedin.com/in/pro-real","site":"https://proreal.com.br/sobre"}' where id = auth.uid();
\echo '-- instagram apontando para outro site (deve FALHAR):'
update professionals set social_links = '{"instagram":"https://evil.com/instagram.com/x"}' where id = auth.uid();
\echo '-- link javascript (deve FALHAR):'
update professionals set social_links = '{"site":"javascript:alert(1)"}' where id = auth.uid();
\echo '-- link sem https (deve FALHAR):'
update professionals set social_links = '{"site":"http://proreal.com.br"}' where id = auth.uid();
\echo '-- rede desconhecida (deve FALHAR):'
update professionals set social_links = '{"orkut":"https://orkut.com/x"}' where id = auth.uid();
\echo '-- 9 experiencias (deve FALHAR):'
update professionals set experiences = array['aa','bb','cc','dd','ee','ff','gg','hh','ii'] where id = auth.uid();
\echo '-- 80 anos na area (deve FALHAR):'
update professionals set years_experience = 80 where id = auth.uid();
\echo '-- tenta mudar a propria nota (deve FALHAR):'
update professionals set rating = 5 where id = auth.uid();

\echo '== profissional real: galeria =='
\echo '-- envia foto na propria pasta do portfolio (OK):'
insert into storage.objects (bucket_id, name) values ('portfolio', 'f7000000-0000-4000-8000-000000000002/1.jpg');
\echo '-- envia na pasta de outra conta (deve FALHAR):'
insert into storage.objects (bucket_id, name) values ('portfolio', 'd0000000-0000-4000-8000-000000000002/1.jpg');
\echo '-- adiciona foto, video do YouTube e do Drive (OK):'
insert into professional_media (professional_id, kind, storage_path, caption)
values (auth.uid(), 'foto', 'f7000000-0000-4000-8000-000000000002/1.jpg', 'Treino no parque');
insert into professional_media (professional_id, kind, provider, external_id) values (auth.uid(), 'link', 'youtube', 'dQw4w9WgXcQ');
insert into professional_media (professional_id, kind, provider, external_id) values (auth.uid(), 'link', 'drive', '1AbCdEfGhIjKlMnOpQrStUv');
\echo '-- foto apontando para arquivo de outra conta (deve FALHAR):'
insert into professional_media (professional_id, kind, storage_path) values (auth.uid(), 'foto', 'd0000000-0000-4000-8000-000000000002/x.jpg');
\echo '-- link com URL inteira no lugar do codigo (deve FALHAR):'
insert into professional_media (professional_id, kind, provider, external_id) values (auth.uid(), 'link', 'youtube', 'https://evil.com');
\echo '-- adiciona na galeria de outro profissional (deve FALHAR):'
insert into professional_media (professional_id, kind, provider, external_id) values ('d0000000-0000-4000-8000-000000000002', 'link', 'youtube', 'dQw4w9WgXcQ');
\echo '-- muda a legenda (OK, UPDATE 1):'
update professional_media set caption = 'Aula de corrida' where kind = 'foto' and professional_id = auth.uid();
\echo '-- 10 de uma vez, passando de 12 (deve FALHAR, nada entra):'
insert into professional_media (professional_id, kind, provider, external_id)
select auth.uid(), 'link', 'vimeo', (100000 + g)::text from generate_series(1, 10) g;

\echo '== Ana (profissional demo) =='
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000002';
\echo '-- demo envia foto no portfolio (deve FALHAR):'
insert into storage.objects (bucket_id, name) values ('portfolio', 'd0000000-0000-4000-8000-000000000002/1.jpg');
\echo '-- demo adiciona video na galeria (deve FALHAR):'
insert into professional_media (professional_id, kind, provider, external_id) values (auth.uid(), 'link', 'youtube', 'dQw4w9WgXcQ');
\echo '-- demo coloca link de rede social (deve FALHAR):'
update professionals set social_links = '{"instagram":"https://www.instagram.com/qualquer"}' where id = auth.uid();
\echo '-- demo salva o perfil sem mexer nas redes (OK):'
update professionals set education = 'Nutrição pela USP', social_links = '{}' where id = auth.uid();
\echo '-- Ana ve a galeria do Pro Real (esperado 3):'
select count(*) from professional_media where professional_id = 'f7000000-0000-4000-8000-000000000002';
\echo '-- Ana nao apaga a galeria dos outros (esperado DELETE 0):'
delete from professional_media where professional_id = 'f7000000-0000-4000-8000-000000000002';
\echo '-- Ana tenta se avaliar (deve FALHAR):'
insert into professional_reviews (professional_id, person_id, rating) values (auth.uid(), auth.uid(), 5);

\echo '== avaliacoes =='
set request.jwt.claim.sub = 'f7000000-0000-4000-8000-000000000001';
\echo '-- Paula (ja compartilhou e parou) avalia o Pro Real (OK):'
insert into professional_reviews (professional_id, person_id, rating, comment)
values ('f7000000-0000-4000-8000-000000000002', auth.uid(), 4, '  Treinos ótimos.  ');
\echo '-- nome curto e nota recalculada (esperado "Paula S." e 4.0 / 1):'
select author_name, comment from professional_reviews where person_id = auth.uid();
select rating, reviews_count from professionals where id = 'f7000000-0000-4000-8000-000000000002';
\echo '-- avalia de novo o mesmo profissional (deve FALHAR):'
insert into professional_reviews (professional_id, person_id, rating) values ('f7000000-0000-4000-8000-000000000002', auth.uid(), 5);
\echo '-- muda a nota para 5 (OK) e a media acompanha (esperado 5.0 / 1):'
update professional_reviews set rating = 5 where person_id = auth.uid();
select rating, reviews_count from professionals where id = 'f7000000-0000-4000-8000-000000000002';
\echo '-- nota 6 (deve FALHAR):'
update professional_reviews set rating = 6 where person_id = auth.uid();
\echo '-- troca o nome que aparece (deve FALHAR):'
update professional_reviews set author_name = 'Outra' where person_id = auth.uid();
\echo '-- avalia em nome de outra pessoa (deve FALHAR):'
insert into professional_reviews (professional_id, person_id, rating) values ('f7000000-0000-4000-8000-000000000002', 'f7000000-0000-4000-8000-000000000003', 1);
\echo '-- avalia a Ana sem nunca ter compartilhado (deve FALHAR):'
insert into professional_reviews (professional_id, person_id, rating) values ('d0000000-0000-4000-8000-000000000002', auth.uid(), 1);

set request.jwt.claim.sub = 'f7000000-0000-4000-8000-000000000003';
\echo '-- Outra Pessoa nunca compartilhou e tenta avaliar (deve FALHAR):'
insert into professional_reviews (professional_id, person_id, rating) values ('f7000000-0000-4000-8000-000000000002', auth.uid(), 1);
\echo '-- mas le as avaliacoes (esperado 1):'
select count(*) from professional_reviews where professional_id = 'f7000000-0000-4000-8000-000000000002';

\echo '== Lucas (pessoa demo) =='
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
\echo '-- avalia a Ana, com quem compartilha (OK):'
insert into professional_reviews (professional_id, person_id, rating, comment) values ('d0000000-0000-4000-8000-000000000002', auth.uid(), 5, 'Ótima!');
\echo '-- avalia o Carlos, psicologo (deve FALHAR):'
insert into professional_reviews (professional_id, person_id, rating) values ('c0000000-0000-4000-8000-000000000001', auth.uid(), 5);
\echo '-- Ana tem 6 avaliacoes agora (esperado 6):'
select reviews_count from professionals where id = 'd0000000-0000-4000-8000-000000000002';
\echo '-- apaga a propria avaliacao (esperado DELETE 1) e o total volta a 5:'
delete from professional_reviews where person_id = auth.uid();
select reviews_count from professionals where id = 'd0000000-0000-4000-8000-000000000002';

\echo '== anonimo nao le a vitrine (deve FALHAR ou 0) =='
reset role; set role anon;
select count(*) from professional_reviews;
reset role;
