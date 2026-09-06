-- ---------------------------------------------------------------------------
-- Stickmuster – Grundschema
--
-- Diese App hat bewusst **keine Anmeldung**. Sie ist für eine einzige Person
-- gedacht, die ihre Muster wiederfinden will, ohne sich etwas merken zu
-- müssen. Es gibt deshalb keine Nutzerkennung: die Datenbank gehört dieser
-- einen Person, und alle Tabellen sind über den öffentlichen Schlüssel les-
-- und schreibbar.
--
-- Was das heisst, steht in der README und soll hier nicht verschwiegen
-- werden: Wer die Adresse der App kennt, kann die Muster lesen und ändern.
-- Der Schutz besteht allein darin, die Adresse nicht herumzureichen.
--
-- Der Garnkatalog (thread_brands / thread_colors) ist die Ausnahme: er wird
-- nur gelesen. Geschrieben wird er ausschliesslich vom Importskript über den
-- Dienstschluessel, damit ein Versehen in der App ihn nicht zerstören kann.
--
-- Grundsatz bleibt: Raster (die eigentlichen Stichdaten) liegen NIEMALS als
-- JSONB in Postgres, sondern immer als lauflaengenkodierte Datei im Storage.
-- In der Datenbank stehen nur Verweise (…_path) und Metadaten.
--
-- Die Datei darf mehrfach laufen.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- Garnhersteller und Garnfarben
-- --------------------------------------------------------------------------

create table if not exists public.thread_brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.thread_colors (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references public.thread_brands (id) on delete cascade,
  code          text not null,
  name          text not null,
  hex           text not null,
  -- Die Lab-Werte werden beim Import einmal vorberechnet und mitgespeichert,
  -- damit zur Laufzeit nur noch Abstaende (CIEDE2000) gerechnet werden muessen.
  lab_l         double precision not null,
  lab_a         double precision not null,
  lab_b         double precision not null,
  discontinued  boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (brand_id, code)
);

create index if not exists thread_colors_brand_idx on public.thread_colors (brand_id);

-- --------------------------------------------------------------------------
-- Muster
-- --------------------------------------------------------------------------

create table if not exists public.patterns (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null default 'Neues Muster',
  width               integer not null check (width  between 10 and 800),
  height              integer not null check (height between 10 and 800),
  fabric_count        integer not null default 14 check (fabric_count between 6 and 22),
  source_image_path   text,
  current_version_id  uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists patterns_zuletzt_idx on public.patterns (updated_at desc);

-- --------------------------------------------------------------------------
-- Gespeicherte Staende. Ueber parent_version_id entsteht ein Baum: von einem
-- alten Stand aus kann in eine andere Richtung weitergearbeitet werden, ohne
-- den neueren Stand zu verlieren.
-- --------------------------------------------------------------------------

create table if not exists public.pattern_versions (
  id                 uuid primary key default gen_random_uuid(),
  pattern_id         uuid not null references public.patterns (id) on delete cascade,
  parent_version_id  uuid references public.pattern_versions (id) on delete set null,
  label              text not null default '',
  grid_path          text not null,          -- RLE-Datei im Storage
  thumbnail_path     text,                   -- PNG-Vorschaubildchen im Storage
  palette            jsonb not null default '[]'::jsonb,
  pinned             boolean not null default false,   -- "Diesen Stand merken"
  created_at         timestamptz not null default now()
);

create index if not exists pattern_versions_pattern_idx
  on public.pattern_versions (pattern_id, created_at desc);
create index if not exists pattern_versions_parent_idx
  on public.pattern_versions (parent_version_id);

-- Der Verweis auf den aktuellen Stand kann erst hier gesetzt werden, weil
-- sich die beiden Tabellen gegenseitig referenzieren.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'patterns_current_version_fk'
  ) then
    alter table public.patterns
      add constraint patterns_current_version_fk
      foreign key (current_version_id)
      references public.pattern_versions (id) on delete set null;
  end if;
end
$$;

-- --------------------------------------------------------------------------
-- Zuordnung Palettenindex -> Garnfarbe (die Legende)
-- --------------------------------------------------------------------------

create table if not exists public.pattern_colors (
  pattern_id       uuid not null references public.patterns (id) on delete cascade,
  palette_index    integer not null check (palette_index >= 0),
  thread_color_id  uuid references public.thread_colors (id) on delete set null,
  symbol           text not null default '',
  stitch_count     integer not null default 0,
  primary key (pattern_id, palette_index)
);

-- --------------------------------------------------------------------------
-- Der Garnvorrat: welche Garne zu Hause liegen. Ohne Anmeldung gibt es genau
-- eine solche Liste.
-- --------------------------------------------------------------------------

create table if not exists public.user_threads (
  thread_color_id  uuid primary key references public.thread_colors (id) on delete cascade,
  created_at       timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Motive: gespeicherte Ausschnitte, die ueber Muster hinweg erhalten bleiben
-- --------------------------------------------------------------------------

create table if not exists public.motifs (
  id              uuid primary key default gen_random_uuid(),
  name            text not null default 'Motiv',
  w               integer not null check (w > 0),
  h               integer not null check (h > 0),
  data_path       text not null,
  thumbnail_path  text,
  palette         jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists motifs_zuletzt_idx on public.motifs (created_at desc);

-- --------------------------------------------------------------------------
-- Zugriffsregeln
--
-- Row Level Security bleibt eingeschaltet, damit der Zugriff eine bewusst
-- gesetzte Regel ist und nicht ein vergessener Schalter. Ohne Anmeldung gibt
-- es aber niemanden zu unterscheiden, deshalb ist die Regel schlicht "alles
-- erlaubt" – ausser beim Garnkatalog, der nur gelesen wird.
-- --------------------------------------------------------------------------

alter table public.patterns          enable row level security;
alter table public.pattern_versions  enable row level security;
alter table public.pattern_colors    enable row level security;
alter table public.user_threads      enable row level security;
alter table public.motifs            enable row level security;
alter table public.thread_brands     enable row level security;
alter table public.thread_colors     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['patterns', 'pattern_versions', 'pattern_colors',
                           'user_threads', 'motifs'] loop
    execute format('drop policy if exists %I on public.%I', 'ohne anmeldung alles', t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true)',
      'ohne anmeldung alles', t);
  end loop;
end
$$;

-- Garnkatalog: lesen ja, schreiben nur ueber den Dienstschluessel
-- (das Importskript) – dafuer gibt es bewusst keine Policy.
drop policy if exists "garnkatalog lesen" on public.thread_brands;
drop policy if exists "garnfarben lesen"  on public.thread_colors;

create policy "garnkatalog lesen" on public.thread_brands
  for select to anon, authenticated using (true);
create policy "garnfarben lesen" on public.thread_colors
  for select to anon, authenticated using (true);

-- updated_at automatisch mitfuehren
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists patterns_touch_updated_at on public.patterns;
create trigger patterns_touch_updated_at
  before update on public.patterns
  for each row execute function public.touch_updated_at();
