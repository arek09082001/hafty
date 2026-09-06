-- ---------------------------------------------------------------------------
-- Minimalnachbau der Supabase-Teile, die die Migrationen brauchen.
--
-- Nur zum Prüfen der Migrationen auf einem gewöhnlichen PostgreSQL. Auf einem
-- echten Supabase-Projekt wird diese Datei nicht gebraucht und darf dort auch
-- nicht laufen.
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

create schema if not exists storage;

create table if not exists storage.buckets (
  id      text primary key,
  name    text not null,
  public  boolean not null default false
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text not null references storage.buckets (id),
  name       text not null
);
alter table storage.objects enable row level security;

grant usage on schema public, storage to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
