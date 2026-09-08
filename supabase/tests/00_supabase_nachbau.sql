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

-- Achtung: hier steht bewusst KEIN
--   alter default privileges in schema public grant all on tables to anon…
--
-- Genau das stand hier einmal, und es hat einen echten Fehler verdeckt: die
-- Migration vergab keine Rechte auf ihre Tabellen, der Nachbau schenkte sie
-- aber jeder neuen Tabelle automatisch. Der Test war gruen, die laufende App
-- bekam "permission denied for table thread_colors".
--
-- Ein Supabase-Projekt verteilt diese Rechte nicht von allein. Rechte und
-- RLS sind zwei Tore hintereinander: der GRANT entscheidet, ob eine Rolle
-- die Tabelle ueberhaupt anfassen darf, die Policy entscheidet, welche
-- Zeilen sie dann sieht. Nur mit Policy und ohne GRANT kommt niemand durch.
-- Deshalb muss die Migration ihre Rechte selbst vergeben, und dieser
-- Nachbau muss so streng sein wie das Original.
