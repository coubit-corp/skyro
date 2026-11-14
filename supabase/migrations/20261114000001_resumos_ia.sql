-- =============================================================================
-- Skyro · cache dos resumos semanais gerados por IA
--
-- Cada resumo é guardado com a "versão" dos registros que o geraram. Enquanto o
-- paciente não registrar nada novo, a ficha reaproveita o resumo salvo, sem uma
-- nova chamada (e sem um novo custo) à API da IA.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois da migration inicial).
-- =============================================================================

create table public.ai_summaries (
  id               uuid primary key default gen_random_uuid(),
  professional_id  uuid not null references public.professionals (id) on delete cascade,
  person_id        uuid not null references public.profiles (id) on delete cascade,
  -- "2026-11-14|2026-11-14T10:00:00Z": dia + último updated_at dos registros usados
  logs_version     text not null,
  lines            text[] not null,
  attention        text not null,
  model            text not null,
  created_at       timestamptz not null default now(),
  unique (professional_id, person_id, logs_version)
);

alter table public.ai_summaries enable row level security;

-- O profissional só lê e grava resumos de quem compartilha com ele agora.
-- Quem revoga o compartilhamento some daqui também.
create policy "ai_summaries: leitura" on public.ai_summaries
  for select to authenticated
  using (professional_id = auth.uid() and public.has_active_share(person_id));

create policy "ai_summaries: profissional grava" on public.ai_summaries
  for insert to authenticated
  with check (professional_id = auth.uid() and public.has_active_share(person_id));

revoke update, delete on public.ai_summaries from authenticated;
