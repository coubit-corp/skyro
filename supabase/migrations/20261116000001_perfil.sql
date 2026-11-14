-- =============================================================================
-- Skyro · configurações de perfil: foto, bio, telefone e horários
--
--   profiles.bio            apresentação curta da pessoa (o profissional usa a
--                           bio de professionals, que aparece no catálogo)
--   profiles.avatar_path    caminho da foto no bucket "avatars" (nulo = avatar
--                           ilustrado, como antes)
--   private_contacts        telefone: SEMPRE privado, só a própria conta lê
--   professionals.availability  horários por dia da semana
--   bucket "avatars"        fotos de perfil (públicas para leitura pelo link)
--
-- Garantias feitas pelo banco (não só pela tela):
--   1. O telefone fica numa tabela separada, que só o dono lê e escreve. Nem
--      o profissional que acompanha a pessoa enxerga.
--   2. Cada conta só envia e apaga fotos na própria pasta, e só aponta o
--      perfil para um arquivo dessa pasta (nunca para um link de fora).
--   3. As contas demo são públicas: elas não enviam foto nem guardam
--      telefone, para ninguém colocar uma imagem qualquer ou um número no
--      perfil que os jurados veem.
--   4. Só JPEG ou WebP de até 1 MB (o app já reduz a foto antes de enviar).
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois das migrations anteriores).
-- =============================================================================

-- 1. Bio e foto no perfil
alter table public.profiles
  add column bio text not null default '' check (length(bio) <= 300),
  add column avatar_path text;

alter table public.profiles
  add constraint profiles_avatar_na_propria_pasta check (
    avatar_path is null
    or (avatar_path like id::text || '/%' and length(avatar_path) <= 120 and avatar_path !~ '\.\.')
  );

grant update (bio, avatar_path) on public.profiles to authenticated;

-- As contas demo são públicas (qualquer pessoa entra nelas): não guardam
-- telefone nem enviam foto.
create or replace function public.is_real_account()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and not is_demo);
$$;

-- 2. Telefone: sempre privado
create table public.private_contacts (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  -- Só dígitos, com DDD (10 ou 11) e, se houver, o código do país
  phone       text check (phone is null or phone ~ '^[0-9]{10,13}$'),
  updated_at  timestamptz not null default now()
);

comment on table public.private_contacts is 'Contato privado de cada conta. Só o dono lê e escreve.';

create trigger private_contacts_touch
  before update on public.private_contacts
  for each row execute function public.touch_updated_at();

alter table public.private_contacts enable row level security;

create policy "private_contacts: só o dono" on public.private_contacts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_real_account());

-- 3. Horários de disponibilidade do profissional
--    Formato: {"1": ["08:00", "18:00"], "6": ["09:00", "12:00"]}
--    (1 = segunda … 7 = domingo; dia ausente = não atende)
create or replace function public.valid_availability(p jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  k text;
  v jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return false;
  end if;
  for k, v in select * from jsonb_each(p) loop
    if k !~ '^[1-7]$' or jsonb_typeof(v) <> 'array' or jsonb_array_length(v) <> 2 then
      return false;
    end if;
    if (v ->> 0) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or (v ->> 1) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      return false;
    end if;
    if (v ->> 0) >= (v ->> 1) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.professionals
  add column availability jsonb not null default '{}'::jsonb
  constraint professionals_horarios_validos check (public.valid_availability(availability));

grant update (availability) on public.professionals to authenticated;
grant insert (availability) on public.professionals to authenticated;

-- 4. Fotos de perfil (Supabase Storage)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars: listar a própria pasta" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: enviar na própria pasta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_real_account()
  );

create policy "avatars: apagar da própria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
