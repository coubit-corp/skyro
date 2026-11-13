-- Simula o mínimo do Supabase (schema auth, auth.uid(), papel authenticated)
-- para testar as migrations num Postgres comum. NÃO rodar no Supabase de verdade.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
grant usage on schema public to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated, anon;
alter default privileges in schema public grant all on functions to authenticated, anon;
