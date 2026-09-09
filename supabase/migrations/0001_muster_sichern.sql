-- Die Sicherung der Muster in der Ferne.
-- ---------------------------------------------------------------------------
--
-- Die App arbeitet auf dem Gerät. Was hier steht, ist ausschließlich das
-- zweite Exemplar: dieselben Projekte und Stände, damit ein verlorenes
-- Tablet oder ein geleerter Browserspeicher nichts kostet.
--
-- Es gibt weiterhin keine Anmeldung, die die Nutzerin zu sehen bekäme. Beim
-- ersten Mal meldet sich das Gerät im Hintergrund anonym an; alles, was es
-- danach schreibt, gehört diesem Benutzer, und die Regeln unten lassen nur
-- ihn selbst heran. Damit das funktioniert, muss in Supabase unter
-- Authentication → Sign In / Providers die Anmeldung „Anonymous" erlaubt
-- sein – das ist der einzige Schalter, der von Hand umgelegt werden muss.

-- --------------------------------------------------------------------------
-- Projekte: ein hochgeladenes Bild und alles, was daraus geworden ist
-- --------------------------------------------------------------------------
create table if not exists public.projekte (
  id uuid primary key,
  besitzer uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Der Dateiname. Daran hängt in der App die Zuordnung eines Bildes zu
  -- seinem Projekt.
  name text not null default '',
  angelegt_am timestamptz not null default now(),
  zuletzt_am timestamptz not null default now(),
  bild_masse jsonb,
  bild_ausschnitt jsonb,
  bild_kennung text,
  einstellungen jsonb,
  -- Ob im Dateispeicher ein Quellbild zu diesem Projekt liegt.
  hat_bild boolean not null default false,
  geaendert_am timestamptz not null default now()
);

create index if not exists projekte_besitzer_zeit on public.projekte (besitzer, zuletzt_am desc);

-- --------------------------------------------------------------------------
-- Stände: die Zeitreise durch ein Muster
-- --------------------------------------------------------------------------
create table if not exists public.staende (
  id uuid primary key,
  besitzer uuid not null default auth.uid() references auth.users (id) on delete cascade,
  projekt_id uuid not null references public.projekte (id) on delete cascade,
  -- Der Stand, aus dem dieser hervorgegangen ist. Bewusst ohne
  -- Fremdschlüssel: die Stände kommen einzeln an, und ein Elternteil kann
  -- noch unterwegs sein.
  eltern_id uuid,
  beschriftung text,
  gemerkt boolean not null default false,
  angelegt_am timestamptz not null default now(),
  palette jsonb,
  einstellungen jsonb,
  breite integer,
  hoehe integer
);

create index if not exists staende_projekt_zeit on public.staende (projekt_id, angelegt_am desc);

-- --------------------------------------------------------------------------
-- Wer darf was: nur der eigene Benutzer, und zwar überall
-- --------------------------------------------------------------------------
alter table public.projekte enable row level security;
alter table public.staende enable row level security;

drop policy if exists "eigene projekte" on public.projekte;
create policy "eigene projekte" on public.projekte
  for all to authenticated
  using (auth.uid() = besitzer)
  with check (auth.uid() = besitzer);

drop policy if exists "eigene staende" on public.staende;
create policy "eigene staende" on public.staende
  for all to authenticated
  using (auth.uid() = besitzer)
  with check (auth.uid() = besitzer);

-- --------------------------------------------------------------------------
-- Der Dateispeicher: Quellbilder, Raster und Vorschauen
-- --------------------------------------------------------------------------
-- Die Pfade fangen immer mit der Benutzerkennung an:
--   <benutzer>/<projekt>/bild
--   <benutzer>/<projekt>/staende/<stand>.rle.gz
--   <benutzer>/<projekt>/staende/<stand>.png
-- Daran hängt die Regel darunter.
insert into storage.buckets (id, name, public)
values ('muster', 'muster', false)
on conflict (id) do nothing;

drop policy if exists "eigene musterdateien" on storage.objects;
create policy "eigene musterdateien" on storage.objects
  for all to authenticated
  using (bucket_id = 'muster' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'muster' and (storage.foldername(name))[1] = auth.uid()::text);
