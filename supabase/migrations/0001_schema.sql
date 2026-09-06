-- ---------------------------------------------------------------------------
-- Stickmuster – Grundschema
--
-- Grundsatz: Raster (die eigentlichen Stichdaten) liegen NIEMALS als JSONB in
-- Postgres, sondern immer als lauflaengenkodierte Datei im Supabase Storage.
-- In der Datenbank stehen nur Verweise (…_path) und Metadaten.
--
-- Row Level Security ist von Anfang an auf jeder Tabelle mit Nutzerbezug
-- aktiv. Die Garnkataloge (thread_brands / thread_colors) sind oeffentlich
-- lesbar, aber nur ueber den service_role-Schluessel beschreibbar.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- Garnhersteller und Garnfarben (gemeinsamer Katalog fuer alle Nutzerinnen)
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
  user_id             uuid not null references auth.users (id) on delete cascade,
  name                text not null default 'Neues Muster',
  width               integer not null check (width  between 10 and 800),
  height              integer not null check (height between 10 and 800),
  fabric_count        integer not null default 14 check (fabric_count between 6 and 22),
  source_image_path   text,
  current_version_id  uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists patterns_user_idx on public.patterns (user_id, updated_at desc);

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

alter table public.patterns
  add constraint patterns_current_version_fk
  foreign key (current_version_id)
  references public.pattern_versions (id) on delete set null;

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
-- Der Garnvorrat: welche Garne die Nutzerin zu Hause hat
-- --------------------------------------------------------------------------

create table if not exists public.user_threads (
  user_id          uuid not null references auth.users (id) on delete cascade,
  thread_color_id  uuid not null references public.thread_colors (id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (user_id, thread_color_id)
);

-- --------------------------------------------------------------------------
-- Motive: gespeicherte Ausschnitte, die ueber Muster hinweg erhalten bleiben
-- --------------------------------------------------------------------------

create table if not exists public.motifs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null default 'Motiv',
  w               integer not null check (w > 0),
  h               integer not null check (h > 0),
  data_path       text not null,
  thumbnail_path  text,
  palette         jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists motifs_user_idx on public.motifs (user_id, created_at desc);

-- --------------------------------------------------------------------------
-- Row Level Security
-- --------------------------------------------------------------------------

alter table public.patterns          enable row level security;
alter table public.pattern_versions  enable row level security;
alter table public.pattern_colors    enable row level security;
alter table public.user_threads      enable row level security;
alter table public.motifs            enable row level security;
alter table public.thread_brands     enable row level security;
alter table public.thread_colors     enable row level security;

-- patterns: nur die eigenen
drop policy if exists "eigene muster lesen"    on public.patterns;
drop policy if exists "eigene muster anlegen"  on public.patterns;
drop policy if exists "eigene muster aendern"  on public.patterns;
drop policy if exists "eigene muster loeschen" on public.patterns;

create policy "eigene muster lesen"    on public.patterns for select using  (auth.uid() = user_id);
create policy "eigene muster anlegen"  on public.patterns for insert with check (auth.uid() = user_id);
create policy "eigene muster aendern"  on public.patterns for update using  (auth.uid() = user_id)
                                                              with check (auth.uid() = user_id);
create policy "eigene muster loeschen" on public.patterns for delete using  (auth.uid() = user_id);

-- pattern_versions: ueber das zugehoerige Muster
drop policy if exists "eigene staende lesen"    on public.pattern_versions;
drop policy if exists "eigene staende anlegen"  on public.pattern_versions;
drop policy if exists "eigene staende aendern"  on public.pattern_versions;
drop policy if exists "eigene staende loeschen" on public.pattern_versions;

create policy "eigene staende lesen" on public.pattern_versions for select
  using (exists (select 1 from public.patterns p
                  where p.id = pattern_versions.pattern_id and p.user_id = auth.uid()));
create policy "eigene staende anlegen" on public.pattern_versions for insert
  with check (exists (select 1 from public.patterns p
                       where p.id = pattern_versions.pattern_id and p.user_id = auth.uid()));
create policy "eigene staende aendern" on public.pattern_versions for update
  using (exists (select 1 from public.patterns p
                  where p.id = pattern_versions.pattern_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.patterns p
                       where p.id = pattern_versions.pattern_id and p.user_id = auth.uid()));
create policy "eigene staende loeschen" on public.pattern_versions for delete
  using (exists (select 1 from public.patterns p
                  where p.id = pattern_versions.pattern_id and p.user_id = auth.uid()));

-- pattern_colors: ueber das zugehoerige Muster
drop policy if exists "eigene legende lesen"    on public.pattern_colors;
drop policy if exists "eigene legende schreiben" on public.pattern_colors;
drop policy if exists "eigene legende aendern"  on public.pattern_colors;
drop policy if exists "eigene legende loeschen" on public.pattern_colors;

create policy "eigene legende lesen" on public.pattern_colors for select
  using (exists (select 1 from public.patterns p
                  where p.id = pattern_colors.pattern_id and p.user_id = auth.uid()));
create policy "eigene legende schreiben" on public.pattern_colors for insert
  with check (exists (select 1 from public.patterns p
                       where p.id = pattern_colors.pattern_id and p.user_id = auth.uid()));
create policy "eigene legende aendern" on public.pattern_colors for update
  using (exists (select 1 from public.patterns p
                  where p.id = pattern_colors.pattern_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.patterns p
                       where p.id = pattern_colors.pattern_id and p.user_id = auth.uid()));
create policy "eigene legende loeschen" on public.pattern_colors for delete
  using (exists (select 1 from public.patterns p
                  where p.id = pattern_colors.pattern_id and p.user_id = auth.uid()));

-- user_threads: nur der eigene Garnvorrat
drop policy if exists "eigener vorrat lesen"    on public.user_threads;
drop policy if exists "eigener vorrat anlegen"  on public.user_threads;
drop policy if exists "eigener vorrat loeschen" on public.user_threads;

create policy "eigener vorrat lesen"    on public.user_threads for select using (auth.uid() = user_id);
create policy "eigener vorrat anlegen"  on public.user_threads for insert with check (auth.uid() = user_id);
create policy "eigener vorrat loeschen" on public.user_threads for delete using (auth.uid() = user_id);

-- motifs: nur die eigenen
drop policy if exists "eigene motive lesen"    on public.motifs;
drop policy if exists "eigene motive anlegen"  on public.motifs;
drop policy if exists "eigene motive aendern"  on public.motifs;
drop policy if exists "eigene motive loeschen" on public.motifs;

create policy "eigene motive lesen"    on public.motifs for select using  (auth.uid() = user_id);
create policy "eigene motive anlegen"  on public.motifs for insert with check (auth.uid() = user_id);
create policy "eigene motive aendern"  on public.motifs for update using  (auth.uid() = user_id)
                                                             with check (auth.uid() = user_id);
create policy "eigene motive loeschen" on public.motifs for delete using  (auth.uid() = user_id);

-- Garnkatalog: fuer angemeldete Nutzerinnen lesbar, Schreiben nur ueber
-- service_role (das Importskript) – dafuer gibt es bewusst keine Policy.
drop policy if exists "garnkatalog lesen"  on public.thread_brands;
drop policy if exists "garnfarben lesen"   on public.thread_colors;

create policy "garnkatalog lesen" on public.thread_brands for select to authenticated using (true);
create policy "garnfarben lesen"  on public.thread_colors for select to authenticated using (true);

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
