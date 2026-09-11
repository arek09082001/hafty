-- Die Motive gehören auch in die Sicherung.
-- ---------------------------------------------------------------------------
--
-- Projekte und Stände liegen seit 0001/0002 in der Ferne, die Motive nicht:
-- sie lagen allein im Browser. Wer sein Tablet verlor oder die Websitedaten
-- löschte, hatte seine Muster noch – aber die Sammlung an Motiven, die über
-- Monate entstanden ist, war weg. Und auf dem Telefon stand sie ohnehin nie.
--
-- Diese Migration legt nur dazu: sie ändert keine bestehende Tabelle, keine
-- Regel und keine Datei. Wer sie ausführt, verliert nichts von dem, was schon
-- gesichert ist – und die Motive, die jetzt im Browser liegen, wandern beim
-- nächsten Abgleich von selbst hinauf.
--
-- Die Dateien liegen im schon vorhandenen Eimer `muster`, unter
--   motive/<motiv>.rle.gz   – der gepackte Ausschnitt
--   motive/<motiv>.png      – das kleine Vorschaubild
-- Die Regel aus 0002 gilt für den ganzen Eimer; für den Dateispeicher ist
-- deshalb nichts zu tun.

create table if not exists public.motive (
  id uuid primary key,
  name text not null default '',
  -- Maße des Ausschnitts in Stichen.
  breite integer,
  hoehe integer,
  -- Die Farben des Motivs. Ohne sie wären die Feldnummern im Raster in einem
  -- anderen Muster bedeutungslos.
  palette jsonb,
  -- Fassung des gepackten Ausschnitts (siehe lib/speicher/motive.ts).
  fassung integer not null default 2,
  hat_vorschau boolean not null default false,
  angelegt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now()
);

create index if not exists motive_zeit on public.motive (angelegt_am desc);

-- Wer darf was: dieselbe Abmachung wie bei Projekten und Ständen – die Rolle
-- `anon`, also jeder, der den öffentlichen Schlüssel hat. Erst das
-- Tabellenrecht, dann die Zeilenregel; fehlt das erste, antwortet PostgREST
-- mit 403, noch bevor die Regel zum Zuge kommt.
grant usage on schema public to anon;
grant select, insert, update, delete on public.motive to anon;

alter table public.motive enable row level security;

drop policy if exists "alle motive" on public.motive;
create policy "alle motive" on public.motive
  for all to anon
  using (true)
  with check (true);
