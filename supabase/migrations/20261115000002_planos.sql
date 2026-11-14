-- =============================================================================
-- Skyro · "Meu plano": o que cada profissional preparou para a pessoa
--
-- Cada especialidade monta um tipo de item:
--   personal        → treino      (séries × repetições, carga)
--   nutricionista   → refeição    (horário, alimentos)
--   psicólogo       → respiração  (técnica, duração)
--   fisioterapeuta  → fisio       (séries × repetições)
-- Todos podem ter link de vídeo, valem em dias da semana escolhidos e
-- ficam junto com um recado geral do profissional (plan_notes).
--
-- A pessoa marca o item como feito no dia (plan_checks) e, na fisioterapia,
-- registra a dor do dia de 0 a 10 (daily_logs.pain_level).
--
-- Garantias feitas pelo banco (não só pela tela):
--   1. O profissional só escreve no plano de quem compartilha com ele, e só
--      o tipo de item da própria especialidade.
--   2. Quando a pessoa revoga, o profissional deixa de ver e de editar na hora;
--      a pessoa continua vendo o plano (com o aviso de acompanhamento encerrado).
--   3. Só a pessoa marca os próprios itens; o profissional só lê as marcações
--      dos itens dele, enquanto o compartilhamento estiver ativo.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois das migrations anteriores).
-- =============================================================================

-- Tipo de item que cada especialidade monta.
create or replace function public.plan_kind_for(p_specialty text)
returns text
language sql
immutable
as $$
  select case p_specialty
    when 'personal' then 'treino'
    when 'nutricionista' then 'refeicao'
    when 'psicologo' then 'respiracao'
    when 'fisioterapeuta' then 'fisio'
  end;
$$;

-- O profissional logado pode escrever no plano desta pessoa, com este tipo?
create or replace function public.can_write_plan(p_person uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_active_share(p_person)
     and exists (
       select 1 from public.professionals p
       where p.id = auth.uid() and public.plan_kind_for(p.specialty) = p_kind
     );
$$;

-- -----------------------------------------------------------------------------
-- Itens do plano
-- -----------------------------------------------------------------------------
create table public.plan_items (
  id               uuid primary key default gen_random_uuid(),
  professional_id  uuid not null references public.professionals (id) on delete cascade,
  person_id        uuid not null references public.profiles (id) on delete cascade,
  kind             text not null check (kind in ('treino', 'refeicao', 'respiracao', 'fisio')),
  title            text not null check (length(btrim(title)) between 2 and 80),
  -- 1 = segunda … 7 = domingo (ISO). Pelo menos um dia.
  weekdays         smallint[] not null check (
                     cardinality(weekdays) between 1 and 7
                     and weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
                   ),
  sets             smallint check (sets between 1 and 20),
  reps             text check (length(reps) <= 20),          -- "12", "30 s", "até a falha"
  load             text check (length(load) <= 20),          -- "20 kg", "elástico leve"
  meal_time        time,
  foods            text check (length(foods) <= 300),
  duration_min     smallint check (duration_min between 1 and 120),
  notes            text check (length(notes) <= 200),        -- observação curta do item
  video_url        text check (video_url is null or (video_url ~ '^https://' and length(video_url) <= 300)),
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Campos de cada tipo
  constraint plan_items_campos_treino check (kind not in ('treino', 'fisio') or sets is not null),
  constraint plan_items_campos_refeicao check (kind <> 'refeicao' or (meal_time is not null and foods is not null)),
  constraint plan_items_campos_respiracao check (kind <> 'respiracao' or duration_min is not null)
);

create index plan_items_person_idx on public.plan_items (person_id, professional_id, position);

create trigger plan_items_touch
  before update on public.plan_items
  for each row execute function public.touch_updated_at();

comment on table public.plan_items is 'Itens do plano que cada profissional monta para a pessoa (treino, refeição, respiração, fisio).';

-- -----------------------------------------------------------------------------
-- Recado geral do profissional (um por profissional e pessoa)
-- -----------------------------------------------------------------------------
create table public.plan_notes (
  professional_id  uuid not null references public.professionals (id) on delete cascade,
  person_id        uuid not null references public.profiles (id) on delete cascade,
  note             text not null check (length(btrim(note)) between 1 and 300),
  updated_at       timestamptz not null default now(),
  primary key (professional_id, person_id)
);

create trigger plan_notes_touch
  before update on public.plan_notes
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Marcações de "feito" da pessoa
-- -----------------------------------------------------------------------------
create table public.plan_checks (
  item_id     uuid not null references public.plan_items (id) on delete cascade,
  person_id   uuid not null references public.profiles (id) on delete cascade,
  check_date  date not null,
  created_at  timestamptz not null default now(),
  primary key (item_id, check_date)
);

create index plan_checks_person_idx on public.plan_checks (person_id, check_date);

-- -----------------------------------------------------------------------------
-- Dor do dia (fisioterapia), junto com os outros registros do dia
-- -----------------------------------------------------------------------------
alter table public.daily_logs
  add column pain_level smallint check (pain_level between 0 and 10);

-- =============================================================================
-- Regras de acesso
-- =============================================================================
alter table public.plan_items  enable row level security;
alter table public.plan_notes  enable row level security;
alter table public.plan_checks enable row level security;

-- plan_items: a pessoa lê sempre os seus; o profissional lê e escreve os que
-- ele criou, só enquanto o compartilhamento estiver ativo.
create policy "plan_items: pessoa lê" on public.plan_items
  for select to authenticated
  using (person_id = auth.uid());

create policy "plan_items: profissional lê" on public.plan_items
  for select to authenticated
  using (professional_id = auth.uid() and public.has_active_share(person_id));

create policy "plan_items: profissional cria" on public.plan_items
  for insert to authenticated
  with check (professional_id = auth.uid() and public.can_write_plan(person_id, kind));

create policy "plan_items: profissional edita" on public.plan_items
  for update to authenticated
  using (professional_id = auth.uid() and public.has_active_share(person_id))
  with check (professional_id = auth.uid() and public.can_write_plan(person_id, kind));

create policy "plan_items: profissional apaga" on public.plan_items
  for delete to authenticated
  using (professional_id = auth.uid() and public.has_active_share(person_id));

-- Dono e paciente de um item não mudam depois de criado.
revoke update on public.plan_items from authenticated;
grant update (kind, title, weekdays, sets, reps, load, meal_time, foods, duration_min, notes, video_url, position)
  on public.plan_items to authenticated;

-- plan_notes: mesma regra dos itens.
create policy "plan_notes: pessoa lê" on public.plan_notes
  for select to authenticated
  using (person_id = auth.uid());

create policy "plan_notes: profissional lê" on public.plan_notes
  for select to authenticated
  using (professional_id = auth.uid() and public.has_active_share(person_id));

create policy "plan_notes: profissional cria" on public.plan_notes
  for insert to authenticated
  with check (professional_id = auth.uid() and public.has_active_share(person_id));

create policy "plan_notes: profissional edita" on public.plan_notes
  for update to authenticated
  using (professional_id = auth.uid() and public.has_active_share(person_id))
  with check (professional_id = auth.uid() and public.has_active_share(person_id));

create policy "plan_notes: profissional apaga" on public.plan_notes
  for delete to authenticated
  using (professional_id = auth.uid() and public.has_active_share(person_id));

revoke update on public.plan_notes from authenticated;
grant update (note) on public.plan_notes to authenticated;

-- plan_checks: só a pessoa marca, e só itens do próprio plano; o profissional
-- lê as marcações dos itens dele enquanto o compartilhamento estiver ativo.
create policy "plan_checks: pessoa" on public.plan_checks
  for all to authenticated
  using (person_id = auth.uid())
  with check (
    person_id = auth.uid()
    and exists (select 1 from public.plan_items i where i.id = item_id and i.person_id = auth.uid())
  );

create policy "plan_checks: profissional lê" on public.plan_checks
  for select to authenticated
  using (
    public.has_active_share(person_id)
    and exists (select 1 from public.plan_items i where i.id = item_id and i.professional_id = auth.uid())
  );
