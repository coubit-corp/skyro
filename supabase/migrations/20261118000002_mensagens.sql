-- =============================================================================
-- Skyro · mensagens entre a pessoa e os profissionais que acompanham a rotina
--
--   messages   conversa de texto entre uma pessoa e um profissional
--
-- Garantias feitas pelo banco (não só pela tela):
--   1. Só conversa quem tem compartilhamento ATIVO. Se a pessoa para de
--      compartilhar, o profissional perde o acesso à conversa na hora (inclusive
--      ao histórico) e ninguém manda mensagem nova. A pessoa continua lendo o
--      próprio histórico.
--   2. Cada um só manda mensagem em nome próprio e só marca como lida a
--      mensagem que recebeu. Ninguém edita o texto depois de enviado.
--   3. Contas demo são públicas: só conversam com contas demo (não mandam
--      mensagem para pessoas ou profissionais de verdade).
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois das migrations anteriores).
-- =============================================================================

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid not null references public.profiles (id) on delete cascade,
  professional_id  uuid not null references public.professionals (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  body             text not null check (length(trim(body)) between 1 and 2000),
  created_at       timestamptz not null default now(),
  read_at          timestamptz,
  check (sender_id in (person_id, professional_id)),
  check (person_id <> professional_id)
);

comment on table public.messages is 'Mensagens entre a pessoa e um profissional com compartilhamento ativo.';

create index messages_conversa_idx on public.messages (professional_id, person_id, created_at desc);
create index messages_pessoa_idx on public.messages (person_id, created_at desc);

-- Existe compartilhamento ativo entre esta pessoa e este profissional?
create or replace function public.share_is_active(p_person uuid, p_professional uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shares s
    where s.person_id = p_person and s.professional_id = p_professional and s.revoked_at is null
  );
$$;

-- Conta demo só conversa com conta demo.
create or replace function public.can_message(p_person uuid, p_professional uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.share_is_active(p_person, p_professional)
     and (
       public.is_real_account()
       or not exists (
         select 1 from public.profiles p
         where p.id = case when auth.uid() = p_person then p_professional else p_person end
           and not p.is_demo
       )
     );
$$;

alter table public.messages enable row level security;

-- A pessoa lê todo o histórico dela; o profissional, só enquanto ela compartilha.
create policy "messages: leitura" on public.messages
  for select to authenticated
  using (
    person_id = auth.uid()
    or (professional_id = auth.uid() and public.share_is_active(person_id, professional_id))
  );

create policy "messages: enviar" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and auth.uid() in (person_id, professional_id)
    and read_at is null
    and public.can_message(person_id, professional_id)
  );

-- Só quem recebeu marca como lida (e só a coluna read_at).
create policy "messages: marcar como lida" on public.messages
  for update to authenticated
  using (
    sender_id <> auth.uid()
    and (person_id = auth.uid() or (professional_id = auth.uid() and public.share_is_active(person_id, professional_id)))
  )
  with check (sender_id <> auth.uid() and auth.uid() in (person_id, professional_id));

revoke insert, update, delete on public.messages from authenticated, anon;
grant insert (person_id, professional_id, sender_id, body) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
