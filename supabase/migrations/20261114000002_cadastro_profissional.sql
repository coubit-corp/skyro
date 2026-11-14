-- =============================================================================
-- Skyro · cadastro de profissional pelo app
--
-- Permite que o próprio profissional complete e edite o perfil, com três garantias
-- feitas pelo banco (não só pela tela):
--   1. Atendimento presencial exige local no mapa (lat/lng).
--   2. Trocar o registro do conselho ou a especialidade tira o selo de
--      verificado: o registro volta a ficar "em verificação".
--   3. O selo de verificado, a nota e a marcação de demo continuam fora do
--      alcance do profissional.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois das migrations anteriores).
-- =============================================================================

-- O profissional passa a poder editar também especialidade, registro e cidade.
grant update (specialty, registry, city) on public.professionals to authenticated;

-- 1. Presencial (ou presencial e online) precisa de um ponto no mapa.
alter table public.professionals
  add constraint professionals_local_presencial
  check (modality = 'online' or (lat is not null and lng is not null));

-- Limites de tamanho, iguais aos da tela.
alter table public.professionals
  add constraint professionals_bio_tamanho check (length(bio) <= 400),
  add constraint professionals_tags_quantidade check (coalesce(array_length(tags, 1), 0) <= 6),
  add constraint professionals_registro_tamanho check (registry is null or length(registry) between 4 and 40);

-- 2. Mudou registro ou especialidade → perde o selo até nova verificação.
create or replace function public.professionals_reset_verified()
returns trigger
language plpgsql
as $$
begin
  if new.registry is distinct from old.registry or new.specialty is distinct from old.specialty then
    new.verified := false;
  end if;
  return new;
end;
$$;

create trigger professionals_reset_verified
  before update on public.professionals
  for each row execute function public.professionals_reset_verified();
