-- =============================================================================
-- Skyro · chat entre a pessoa e os profissionais da equipe dela
--
-- Regras, garantidas pelo banco:
--   1. Só existe conversa entre a pessoa e um profissional com quem ela tem
--      compartilhamento ATIVO.
--   2. Cada um só envia mensagem em nome próprio.
--   3. Quando a pessoa revoga o compartilhamento, o profissional deixa de ver a
--      conversa (como já acontece com a rotina) e não envia mais nada. A pessoa
--      continua vendo o histórico.
--   4. Ninguém edita nem apaga mensagens. Quem recebe só marca como lida.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois das migrations anteriores).
-- =============================================================================

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid not null references public.profiles (id) on delete cascade,
  professional_id  uuid not null references public.professionals (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  body             text not null check (length(btrim(body)) between 1 and 2000),
  created_at       timestamptz not null default now(),
  read_at          timestamptz,
  check (sender_id in (person_id, professional_id))
);

create index messages_conversa_idx on public.messages (person_id, professional_id, created_at);
create index messages_profissional_idx on public.messages (professional_id, created_at desc);

-- A pessoa tem compartilhamento ativo com este profissional?
create or replace function public.shares_with(p_professional uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shares s
    where s.person_id = auth.uid()
      and s.professional_id = p_professional
      and s.revoked_at is null
  );
$$;

alter table public.messages enable row level security;

create policy "messages: leitura" on public.messages
  for select to authenticated
  using (
    person_id = auth.uid()
    or (professional_id = auth.uid() and public.has_active_share(person_id))
  );

create policy "messages: envio" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and read_at is null
    and (
      (person_id = auth.uid() and public.shares_with(professional_id))
      or (professional_id = auth.uid() and public.has_active_share(person_id))
    )
  );

-- Quem recebe marca como lida (e só isso: a coluna é a única liberada para update).
create policy "messages: marcar como lida" on public.messages
  for update to authenticated
  using (
    sender_id <> auth.uid()
    and (
      person_id = auth.uid()
      or (professional_id = auth.uid() and public.has_active_share(person_id))
    )
  )
  with check (sender_id <> auth.uid());

revoke update, delete on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- Mensagens novas chegam na hora (Supabase Realtime). As regras acima também
-- valem para o tempo real. Em bancos sem essa publicação (ex.: teste local),
-- o passo é pulado e o app busca as mensagens de tempos em tempos.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;
