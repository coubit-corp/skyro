-- =============================================================================
-- Skyro · aprovação dos registros de conselho pela equipe
--
-- Cria o papel "admin" (equipe Skyro) e o fluxo de verificação do registro:
--   pendente  → verified = false e sem motivo de recusa (o padrão de hoje)
--   aprovado  → verified = true
--   recusado  → verified = false e rejection_reason preenchido
--
-- Garantias feitas pelo banco (não só pela tela):
--   1. Só admin aprova ou recusa, e só pela função review_professional().
--      Ninguém vira admin pelo app: o papel só é dado por SQL.
--   2. A conta demo da equipe só decide sobre perfis de demonstração.
--   3. Recusar exige motivo. Cada decisão fica no histórico (quem, quando, o quê).
--   4. A equipe aprova exatamente o registro que viu: se o profissional trocou
--      o número enquanto isso, a aprovação é recusada.
--   5. Recusado some da busca até corrigir. Continua visível para ele mesmo, para
--      a equipe e para quem já tem vínculo com ele (equipe da pessoa, dicas).
--   6. Trocar o registro ou a especialidade apaga a recusa e volta a "pendente".
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois das migrations anteriores).
-- =============================================================================

-- 1. Novo papel: admin (equipe Skyro). O gatilho de cadastro continua criando só
--    person ou professional, então o admin só nasce por SQL.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('person', 'professional', 'admin'));

-- 2. Situação da verificação no próprio cadastro do profissional.
alter table public.professionals
  add column rejection_reason text,
  add column reviewed_at timestamptz;

alter table public.professionals
  add constraint professionals_recusa_sem_selo check (not (verified and rejection_reason is not null)),
  add constraint professionals_motivo_tamanho check (
    rejection_reason is null or length(rejection_reason) between 10 and 300
  );

comment on column public.professionals.rejection_reason is
  'Motivo da recusa do registro, escrito pela equipe. Nulo = pendente ou aprovado.';
comment on column public.professionals.reviewed_at is
  'Quando a equipe decidiu pela última vez. Nulo = nunca revisado.';

-- 3. Histórico das decisões (só a equipe lê).
create table public.registry_reviews (
  id               uuid primary key default gen_random_uuid(),
  professional_id  uuid not null references public.professionals (id) on delete cascade,
  reviewer_id      uuid references public.profiles (id) on delete set null,
  decision         text not null check (decision in ('aprovado', 'recusado')),
  reason           text,
  registry         text,
  specialty        text not null,
  created_at       timestamptz not null default now()
);

create index registry_reviews_professional_idx on public.registry_reviews (professional_id, created_at desc);

comment on table public.registry_reviews is 'Histórico de aprovações e recusas de registro feitas pela equipe.';

-- 4. Quem é admin (security definer para não cair em recursão de RLS).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 5. Mudou registro ou especialidade → volta a "pendente" (sem selo e sem recusa).
create or replace function public.professionals_reset_verified()
returns trigger
language plpgsql
as $$
begin
  if new.registry is distinct from old.registry or new.specialty is distinct from old.specialty then
    new.verified := false;
    new.rejection_reason := null;
    new.reviewed_at := null;
  end if;
  return new;
end;
$$;

-- 6. Aprovar ou recusar. Única porta de entrada para mudar o selo pelo app.
create or replace function public.review_professional(
  p_professional uuid,
  p_decision     text,
  p_registry     text,
  p_reason       text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer public.profiles;
  v_pro      public.professionals;
  v_reason   text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_reviewer from public.profiles where id = auth.uid();
  if v_reviewer.id is null or v_reviewer.role <> 'admin' then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  select * into v_pro from public.professionals where id = p_professional for update;
  if v_pro.id is null then
    raise exception 'profissional_nao_encontrado' using errcode = 'P0002';
  end if;

  if v_reviewer.is_demo and not v_pro.is_demo then
    raise exception 'demo_so_decide_perfis_demo' using errcode = '42501';
  end if;

  if v_pro.registry is null then
    raise exception 'sem_registro' using errcode = '22023';
  end if;

  if p_registry is distinct from v_pro.registry then
    raise exception 'registro_mudou' using errcode = '40001';
  end if;

  if p_decision = 'aprovado' then
    update public.professionals
       set verified = true, rejection_reason = null, reviewed_at = now()
     where id = p_professional;
  elsif p_decision = 'recusado' then
    if v_reason is null or length(v_reason) not between 10 and 300 then
      raise exception 'motivo_invalido' using errcode = '22023';
    end if;
    update public.professionals
       set verified = false, rejection_reason = v_reason, reviewed_at = now()
     where id = p_professional;
  else
    raise exception 'decisao_invalida' using errcode = '22023';
  end if;

  insert into public.registry_reviews (professional_id, reviewer_id, decision, reason, registry, specialty)
  values (p_professional, v_reviewer.id, p_decision, case when p_decision = 'recusado' then v_reason end,
          v_pro.registry, v_pro.specialty);
end;
$$;

revoke execute on function public.review_professional(uuid, text, text, text) from public, anon;
grant execute on function public.review_professional(uuid, text, text, text) to authenticated;

-- 7. Quem enxerga um profissional: recusado sai da busca, mas não some para quem
--    já tem vínculo com ele (senão a equipe da pessoa e as dicas quebrariam).
create or replace function public.can_see_professional(p_professional uuid, p_rejected boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not p_rejected
      or p_professional = auth.uid()
      or public.is_admin()
      or exists (select 1 from public.shares s where s.professional_id = p_professional and s.person_id = auth.uid())
      or exists (select 1 from public.tips t where t.professional_id = p_professional and t.person_id = auth.uid());
$$;

drop policy "professionals: leitura" on public.professionals;
create policy "professionals: leitura" on public.professionals
  for select to authenticated
  using (public.can_see_professional(id, rejection_reason is not null));

-- 8. Histórico: só a equipe lê; ninguém grava direto (só pela função).
alter table public.registry_reviews enable row level security;

create policy "registry_reviews: equipe lê" on public.registry_reviews
  for select to authenticated
  using (public.is_admin());

revoke insert, update, delete on public.registry_reviews from authenticated, anon;
