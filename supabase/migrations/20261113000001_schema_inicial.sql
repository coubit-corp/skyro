-- =============================================================================
-- Skyro · schema inicial do MVP
-- Tabelas, gatilho de criação de perfil e regras de acesso (RLS).
-- Rodar no Supabase: painel → SQL Editor → colar este arquivo inteiro → Run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Perfis (1 para 1 com auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'person' check (role in ('person', 'professional')),
  avatar_seed text,                       -- semente do avatar ilustrado (DiceBear)
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'Dados públicos básicos de cada conta: pessoa ou profissional.';

-- -----------------------------------------------------------------------------
-- Dados do profissional (catálogo do "Perto de você")
-- -----------------------------------------------------------------------------
create table public.professionals (
  id             uuid primary key references public.profiles (id) on delete cascade,
  specialty      text not null check (specialty in ('nutricionista', 'psicologo', 'personal', 'fisioterapeuta')),
  bio            text not null default '',
  registry       text,                    -- ex.: CRN-3 12345 (fictício na demo)
  verified       boolean not null default false,
  tags           text[] not null default '{}',
  city           text not null default 'São Paulo',
  neighborhood   text,
  lat            double precision,
  lng            double precision,
  modality       text not null default 'ambos' check (modality in ('presencial', 'online', 'ambos')),
  rating         numeric(2, 1) check (rating between 0 and 5),  -- nulo = sem nota exibida
  reviews_count  integer not null default 0,
  is_demo        boolean not null default false,
  created_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Rotina da pessoa
-- -----------------------------------------------------------------------------
create table public.habits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  name            text not null,
  kind            text not null default 'outro' check (kind in ('treino', 'agua', 'foco', 'sono', 'outro')),
  scheduled_time  time,                   -- nulo = "dia todo"
  goal            text,                   -- ex.: "2 L", "50 min"
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create index habits_user_idx on public.habits (user_id);

-- Marcação de um hábito em um dia (o checklist do Início/Rotina)
create table public.habit_checks (
  habit_id    uuid not null references public.habits (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  check_date  date not null,
  created_at  timestamptz not null default now(),
  primary key (habit_id, check_date)
);

create index habit_checks_user_date_idx on public.habit_checks (user_id, check_date);

-- Registro numérico do dia: sono, água, foco e treino
create table public.daily_logs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  log_date           date not null,
  sleep_hours        numeric(4, 2) check (sleep_hours between 0 and 24),
  water_liters       numeric(4, 2) check (water_liters >= 0),
  water_goal_liters  numeric(4, 2) not null default 2 check (water_goal_liters > 0),
  focus_minutes      integer check (focus_minutes >= 0),
  workout_planned    boolean not null default false,
  workout_done       boolean not null default false,
  mood               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, log_date)
);

-- -----------------------------------------------------------------------------
-- Compartilhamento (consentimento explícito e revogável)
-- -----------------------------------------------------------------------------
create table public.shares (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid not null references public.profiles (id) on delete cascade,
  professional_id  uuid not null references public.professionals (id) on delete cascade,
  created_at       timestamptz not null default now(),
  revoked_at       timestamptz,
  check (person_id <> professional_id)
);

-- Só pode existir um compartilhamento ATIVO por par pessoa/profissional
create unique index shares_active_unique
  on public.shares (person_id, professional_id)
  where revoked_at is null;

-- -----------------------------------------------------------------------------
-- Dicas do profissional para a pessoa
-- -----------------------------------------------------------------------------
create table public.tips (
  id               uuid primary key default gen_random_uuid(),
  professional_id  uuid not null references public.professionals (id) on delete cascade,
  person_id        uuid not null references public.profiles (id) on delete cascade,
  body             text not null check (length(body) between 1 and 1000),
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);

create index tips_person_idx on public.tips (person_id, created_at desc);

-- =============================================================================
-- Funções auxiliares
-- =============================================================================

-- O profissional logado tem acesso ativo aos dados desta pessoa?
-- security definer: evita recursão de RLS ao consultar shares dentro de políticas.
create or replace function public.has_active_share(p_person uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shares s
    where s.person_id = p_person
      and s.professional_id = auth.uid()
      and s.revoked_at is null
  );
$$;

-- Cria o perfil automaticamente no cadastro (Supabase Auth).
-- Lê full_name e role de raw_user_meta_data (enviados no signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, avatar_seed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'professional' then 'professional' else 'person' end,
    new.id::text
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém daily_logs.updated_at em dia
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger daily_logs_touch
  before update on public.daily_logs
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Regras de acesso (Row Level Security)
-- =============================================================================
alter table public.profiles      enable row level security;
alter table public.professionals enable row level security;
alter table public.habits        enable row level security;
alter table public.habit_checks  enable row level security;
alter table public.daily_logs    enable row level security;
alter table public.shares        enable row level security;
alter table public.tips          enable row level security;

-- profiles: cada um vê o próprio; todos logados veem perfis de profissionais;
-- o profissional vê o perfil de quem compartilhou com ele.
create policy "profiles: leitura" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or role = 'professional'
    or public.has_active_share(id)
  );

create policy "profiles: editar o próprio" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- professionals: catálogo visível para quem está logado; só o dono edita.
create policy "professionals: leitura" on public.professionals
  for select to authenticated
  using (true);

create policy "professionals: criar o próprio" on public.professionals
  for insert to authenticated
  with check (
    id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'professional')
  );

create policy "professionals: editar o próprio" on public.professionals
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- habits / habit_checks / daily_logs: dono faz tudo; profissional com
-- compartilhamento ativo só lê.
create policy "habits: dono" on public.habits
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "habits: profissional lê" on public.habits
  for select to authenticated
  using (public.has_active_share(user_id));

create policy "habit_checks: dono" on public.habit_checks
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
  );

create policy "habit_checks: profissional lê" on public.habit_checks
  for select to authenticated
  using (public.has_active_share(user_id));

create policy "daily_logs: dono" on public.daily_logs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "daily_logs: profissional lê" on public.daily_logs
  for select to authenticated
  using (public.has_active_share(user_id));

-- shares: a pessoa cria e revoga; os dois lados leem.
create policy "shares: leitura" on public.shares
  for select to authenticated
  using (person_id = auth.uid() or professional_id = auth.uid());

create policy "shares: pessoa cria" on public.shares
  for insert to authenticated
  with check (person_id = auth.uid() and revoked_at is null);

create policy "shares: pessoa revoga" on public.shares
  for update to authenticated
  using (person_id = auth.uid())
  with check (person_id = auth.uid());

-- tips: o profissional só envia para quem compartilha com ele;
-- a pessoa lê as suas e marca como lida.
create policy "tips: leitura" on public.tips
  for select to authenticated
  using (person_id = auth.uid() or professional_id = auth.uid());

create policy "tips: profissional envia" on public.tips
  for insert to authenticated
  with check (professional_id = auth.uid() and public.has_active_share(person_id));

create policy "tips: pessoa marca como lida" on public.tips
  for update to authenticated
  using (person_id = auth.uid())
  with check (person_id = auth.uid());

-- =============================================================================
-- Colunas que o próprio usuário NÃO pode alterar
-- (papel, selo de verificado, nota e marcação de demo)
-- =============================================================================
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_seed) on public.profiles to authenticated;

revoke update on public.professionals from authenticated;
grant update (bio, tags, neighborhood, lat, lng, modality) on public.professionals to authenticated;

revoke insert on public.professionals from authenticated;
grant insert (id, specialty, bio, registry, tags, city, neighborhood, lat, lng, modality) on public.professionals to authenticated;
