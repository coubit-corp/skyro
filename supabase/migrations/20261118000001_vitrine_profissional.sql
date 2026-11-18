-- =============================================================================
-- Skyro · vitrine do profissional: formação, experiência, redes sociais,
-- fotos e vídeos, e avaliações com comentário
--
--   professionals.education         onde se formou (texto livre)
--   professionals.years_experience  anos de atuação na área
--   professionals.birth_year        ano de nascimento (a tela mostra só a idade)
--   professionals.experiences       lista de experiências (até 8 linhas)
--   professionals.social_links      links para Instagram, Facebook, TikTok,
--                                   YouTube, LinkedIn e site
--   professional_media              fotos e vídeos enviados, ou vídeos do
--                                   YouTube, Google Drive e Vimeo
--   bucket "portfolio"              arquivos das fotos e vídeos
--   professional_reviews            nota de 1 a 5 e comentário da pessoa
--
-- Garantias feitas pelo banco (não só pela tela):
--   1. Redes sociais só aceitam links https do próprio site de cada rede.
--      Vídeos de fora guardam só o código do vídeo (nunca um link qualquer),
--      e a tela monta o endereço do player oficial.
--   2. Cada profissional só mexe na própria galeria e só envia arquivos na
--      própria pasta. No máximo 12 itens.
--   3. Só avalia quem já compartilhou a rotina com o profissional (mesmo que
--      tenha parado depois). Uma avaliação por pessoa, que ela pode mudar ou
--      apagar. A nota e o total do perfil são recalculados pelo banco.
--   4. Psicólogos não recebem avaliações públicas (cautela com as regras do
--      CFP, como já estava no catálogo).
--   5. Contas demo são públicas: não enviam fotos nem vídeos, não colocam
--      links de redes sociais e só avaliam profissionais demo.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois das migrations anteriores).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Formação, experiência, idade e redes sociais
-- -----------------------------------------------------------------------------
create or replace function public.valid_experiences(p text[])
returns boolean
language sql
immutable
as $$
  select coalesce(array_length(p, 1), 0) <= 8
     and not exists (select 1 from unnest(p) as e where length(trim(e)) < 2 or length(e) > 120);
$$;

create or replace function public.valid_social_links(p jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  k text;
  v jsonb;
  url text;
  ok boolean;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return false;
  end if;
  for k, v in select * from jsonb_each(p) loop
    if jsonb_typeof(v) <> 'string' then
      return false;
    end if;
    url := v #>> '{}';
    if length(url) > 200 or url ~ '[\s<>"''\\]' then
      return false;
    end if;
    ok := case k
      when 'instagram' then url ~ '^https://(www\.)?instagram\.com/[A-Za-z0-9._]{1,30}/?$'
      when 'facebook'  then url ~ '^https://(www\.|m\.)?facebook\.com/[^/?#][^#]*$'
      when 'tiktok'    then url ~ '^https://(www\.)?tiktok\.com/@[A-Za-z0-9._]{1,30}/?$'
      when 'youtube'   then url ~ '^https://(www\.)?youtube\.com/[^/?#][^#]*$'
      when 'linkedin'  then url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/(in|company)/[^/?#]+/?$'
      when 'site'      then url ~ '^https://[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(/[^#]*)?$'
      else false
    end;
    if not ok then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.professionals
  add column education text not null default ''
    constraint professionals_formacao_tamanho check (length(education) <= 200),
  add column years_experience smallint
    constraint professionals_anos_na_area check (years_experience between 0 and 70),
  add column birth_year smallint
    constraint professionals_ano_nascimento check (birth_year between 1920 and 2010),
  add column experiences text[] not null default '{}'
    constraint professionals_experiencias_validas check (public.valid_experiences(experiences)),
  add column social_links jsonb not null default '{}'::jsonb
    constraint professionals_redes_validas check (public.valid_social_links(social_links));

comment on column public.professionals.birth_year is 'Ano de nascimento. O app mostra só a idade, nunca a data.';
comment on column public.professionals.social_links is '{"instagram": "https://www.instagram.com/…", …}. Só https das próprias redes.';

grant update (education, years_experience, birth_year, experiences, social_links) on public.professionals to authenticated;
grant insert (education, years_experience, birth_year, experiences, social_links) on public.professionals to authenticated;

-- Conta demo não coloca link de rede social (qualquer pessoa entra nela).
-- O seed roda sem usuário logado (auth.uid() nulo) e passa.
create or replace function public.professionals_demo_sem_redes()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and new.social_links <> '{}'::jsonb
     and new.social_links is distinct from (case when tg_op = 'UPDATE' then old.social_links end)
     and not public.is_real_account() then
    raise exception 'Contas de demonstração não podem colocar links de redes sociais.';
  end if;
  return new;
end;
$$;

create trigger professionals_demo_sem_redes
  before insert or update of social_links on public.professionals
  for each row execute function public.professionals_demo_sem_redes();

-- -----------------------------------------------------------------------------
-- 2. Fotos e vídeos
-- -----------------------------------------------------------------------------
create table public.professional_media (
  id               uuid primary key default gen_random_uuid(),
  professional_id  uuid not null references public.professionals (id) on delete cascade,
  -- foto e video = arquivo no bucket "portfolio"; link = vídeo do YouTube, Google Drive ou Vimeo
  kind             text not null check (kind in ('foto', 'video', 'link')),
  storage_path     text,
  provider         text check (provider in ('youtube', 'drive', 'vimeo')),
  external_id      text,
  caption          text not null default '' check (length(caption) <= 140),
  created_at       timestamptz not null default now(),
  constraint professional_media_origem check (
    case kind
      when 'link' then
        storage_path is null and provider is not null and external_id is not null
        and case provider
              when 'youtube' then external_id ~ '^[A-Za-z0-9_-]{11}$'
              when 'drive'   then external_id ~ '^[A-Za-z0-9_-]{10,100}$'
              when 'vimeo'   then external_id ~ '^[0-9]{6,12}$'
            end
      else
        provider is null and external_id is null and storage_path is not null
        and storage_path like professional_id::text || '/%'
        and length(storage_path) <= 120 and storage_path !~ '\.\.'
    end
  )
);

comment on table public.professional_media is 'Galeria do profissional: fotos e vídeos dele atendendo, para os pacientes verem.';

create index professional_media_pro_idx on public.professional_media (professional_id, created_at desc);

-- No máximo 12 itens por profissional.
create or replace function public.professional_media_limite()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.professional_media where professional_id = new.professional_id) >= 12 then
    raise exception 'A galeria aceita no máximo 12 fotos e vídeos. Apague um para colocar outro.';
  end if;
  return new;
end;
$$;

create trigger professional_media_limite
  before insert on public.professional_media
  for each row execute function public.professional_media_limite();

alter table public.professional_media enable row level security;

-- Quem vê o perfil vê a galeria (a regra de quem vê o perfil é a da tabela professionals).
create policy "professional_media: leitura" on public.professional_media
  for select to authenticated
  using (exists (select 1 from public.professionals p where p.id = professional_id));

create policy "professional_media: dono adiciona" on public.professional_media
  for insert to authenticated
  with check (professional_id = auth.uid() and public.is_real_account());

create policy "professional_media: dono muda a legenda" on public.professional_media
  for update to authenticated
  using (professional_id = auth.uid())
  with check (professional_id = auth.uid());

create policy "professional_media: dono apaga" on public.professional_media
  for delete to authenticated
  using (professional_id = auth.uid());

revoke update on public.professional_media from authenticated;
grant update (caption) on public.professional_media to authenticated;

-- Arquivos (Supabase Storage): fotos já reduzidas no aparelho e vídeos curtos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 52428800,
        array['image/jpeg', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "portfolio: listar a própria pasta" on storage.objects
  for select to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "portfolio: enviar na própria pasta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_real_account()
    and exists (select 1 from public.professionals p where p.id = auth.uid())
  );

create policy "portfolio: apagar da própria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- 3. Avaliações
-- -----------------------------------------------------------------------------
create table public.professional_reviews (
  id                  uuid primary key default gen_random_uuid(),
  professional_id     uuid not null references public.professionals (id) on delete cascade,
  person_id           uuid not null references public.profiles (id) on delete cascade,
  rating              smallint not null check (rating between 1 and 5),
  comment             text not null default '' check (length(comment) <= 500),
  -- Nome curto ("Lucas M.") e avatar ilustrado de quem avaliou, gravados pelo
  -- banco: o perfil da pessoa não é público, então a avaliação guarda só isso.
  author_name         text not null default '',
  author_avatar_seed  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (professional_id, person_id)
);

comment on table public.professional_reviews is 'Nota e comentário de quem já compartilhou a rotina com o profissional.';

create index professional_reviews_pro_idx on public.professional_reviews (professional_id, created_at desc);

-- A pessoa já compartilhou a rotina com este profissional (mesmo que tenha parado)?
create or replace function public.ever_shared_with(p_professional uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shares s
    where s.professional_id = p_professional and s.person_id = auth.uid()
  );
$$;

-- Este profissional pode receber avaliações desta conta?
-- Pessoa, que já compartilhou, profissional que não é psicólogo, e conta
-- demo só avalia profissional demo.
create or replace function public.can_review(p_professional uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles me
    join public.professionals pro on pro.id = p_professional
    where me.id = auth.uid()
      and me.role = 'person'
      and pro.specialty <> 'psicologo'
      and (not me.is_demo or pro.is_demo)
  ) and public.ever_shared_with(p_professional);
$$;

-- Preenche o nome curto e o avatar de quem avalia, e a data da mudança.
create or replace function public.professional_reviews_autor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_seed text;
begin
  select trim(full_name), avatar_seed into v_name, v_seed from public.profiles where id = new.person_id;
  v_name := coalesce(nullif(v_name, ''), 'Paciente');
  -- "Lucas Martins" → "Lucas M."
  new.author_name := split_part(v_name, ' ', 1)
    || case when position(' ' in v_name) > 0
            then ' ' || upper(left(regexp_replace(v_name, '^.*\s', ''), 1)) || '.'
            else '' end;
  new.author_avatar_seed := v_seed;
  new.comment := trim(new.comment);
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger professional_reviews_autor
  before insert or update on public.professional_reviews
  for each row execute function public.professional_reviews_autor();

-- Nota e total do perfil = média e contagem das avaliações (o profissional
-- continua sem poder mexer nessas colunas).
create or replace function public.professional_reviews_recalcula()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pro uuid := coalesce(new.professional_id, old.professional_id);
begin
  update public.professionals p
     set rating = r.media, reviews_count = r.total
    from (
      select round(avg(rating)::numeric, 1) as media, count(*)::int as total
      from public.professional_reviews where professional_id = v_pro
    ) r
   where p.id = v_pro;
  return null;
end;
$$;

create trigger professional_reviews_recalcula
  after insert or update or delete on public.professional_reviews
  for each row execute function public.professional_reviews_recalcula();

alter table public.professional_reviews enable row level security;

create policy "professional_reviews: leitura" on public.professional_reviews
  for select to authenticated
  using (exists (select 1 from public.professionals p where p.id = professional_id));

create policy "professional_reviews: pessoa avalia" on public.professional_reviews
  for insert to authenticated
  with check (person_id = auth.uid() and public.can_review(professional_id));

create policy "professional_reviews: pessoa muda a sua" on public.professional_reviews
  for update to authenticated
  using (person_id = auth.uid())
  with check (person_id = auth.uid() and public.can_review(professional_id));

create policy "professional_reviews: pessoa apaga a sua" on public.professional_reviews
  for delete to authenticated
  using (person_id = auth.uid());

revoke insert, update on public.professional_reviews from authenticated;
grant insert (professional_id, person_id, rating, comment) on public.professional_reviews to authenticated;
grant update (rating, comment) on public.professional_reviews to authenticated;
