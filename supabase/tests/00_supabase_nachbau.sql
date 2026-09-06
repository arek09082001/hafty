-- ---------------------------------------------------------------------------
-- Minimalnachbau der Supabase-Teile, die die Migrationen brauchen.
--
-- Nur zum Prüfen der Migrationen und der Row Level Security auf einem
-- gewöhnlichen PostgreSQL. Auf einem echten Supabase-Projekt wird diese
-- Datei nicht gebraucht und darf dort auch nicht laufen.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id     uuid primary key,
  email  text
);

-- Bei Supabase liest auth.uid() die Nutzerkennung aus dem JWT. Hier kommt
-- sie aus einer Sitzungseinstellung, die der Test setzt.
create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table if not exists storage.buckets (
  id      text primary key,
  name    text not null,
  public  boolean not null default false
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text not null references storage.buckets (id),
  name       text not null,
  owner      uuid
);
alter table storage.objects enable row level security;

create or replace function storage.foldername(name text) returns text[]
language sql immutable
as $$ select string_to_array(regexp_replace(name, '/[^/]*$', ''), '/') $$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant all on all tables in schema storage to authenticated;
alter default privileges in schema public grant all on tables to authenticated;
