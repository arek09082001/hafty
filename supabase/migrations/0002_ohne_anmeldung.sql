-- Die Sicherung ohne Anmeldung.
-- ---------------------------------------------------------------------------
--
-- Vorher hing alles an einem Benutzer: jedes Gerät meldete sich anonym an,
-- bekam dabei eine eigene Kennung, und die Regeln liessen jeden nur an seine
-- eigenen Zeilen. Fuer eine App, die auf Tablet und Telefon dasselbe zeigen
-- soll, war das genau verkehrt herum - zwei Geraete waren zwei Fremde.
--
-- Jetzt gibt es gar keine Anmeldung mehr. Die Rolle `anon` (der oeffentliche
-- Schluessel, der im Programmtext steht) darf lesen und schreiben, und es
-- gibt nur einen Bestand, den alle Geraete teilen.
--
-- Was das heisst, gehoert klar dazugesagt: **wer den oeffentlichen Schluessel
-- hat, kommt an die Muster.** Der steht im Programmtext jeder ausgelieferten
-- Seite und laesst sich in jedem Browser nachlesen. Fuer eine App mit einer
-- Handvoll Stickmustern ist das der bewusste Tausch - kein Anmeldebildschirm
-- gegen keine Geheimhaltung. Wer beides will, nimmt 0001 zurueck und baut
-- eine richtige Anmeldung.

-- --------------------------------------------------------------------------
-- Erst die alten Regeln, dann die Spalte `besitzer`
-- --------------------------------------------------------------------------
-- Die Reihenfolge ist nicht beliebig: die Regeln aus 0001 lesen `besitzer`,
-- und solange sie stehen, laesst Postgres die Spalte nicht fallen -
-- "cannot drop column besitzer ... because other objects depend on it".
-- Diese Migration lief deshalb auf jeder Datenbank, in der 0001 schon einmal
-- gelaufen war, gar nicht durch.
drop policy if exists "eigene projekte" on public.projekte;
drop policy if exists "eigene staende" on public.staende;
drop policy if exists "eigene musterdateien" on storage.objects;

-- Die Spalte zeigte per Fremdschluessel auf auth.users und haette ohne
-- Anmeldung keinen Wert mehr, den man eintragen koennte.
alter table public.projekte drop column if exists besitzer;
alter table public.staende drop column if exists besitzer;

drop index if exists public.projekte_besitzer_zeit;
create index if not exists projekte_zeit on public.projekte (zuletzt_am desc);

-- --------------------------------------------------------------------------
-- Wer darf was: alle, die den oeffentlichen Schluessel haben
-- --------------------------------------------------------------------------
-- Zwei Ebenen, die beide sitzen muessen - das Tabellenrecht und die
-- Zeilenregel. Fehlt das erste, antwortet PostgREST mit 403 und
-- "permission denied for table", und die Regel darunter kommt gar nicht
-- erst zum Zuge.
grant usage on schema public to anon;
grant select, insert, update, delete on public.projekte to anon;
grant select, insert, update, delete on public.staende to anon;

alter table public.projekte enable row level security;
alter table public.staende enable row level security;

drop policy if exists "alle projekte" on public.projekte;
create policy "alle projekte" on public.projekte
  for all to anon
  using (true)
  with check (true);

drop policy if exists "alle staende" on public.staende;
create policy "alle staende" on public.staende
  for all to anon
  using (true)
  with check (true);

-- --------------------------------------------------------------------------
-- Der Dateispeicher: Quellbilder, Raster und Vorschauen
-- --------------------------------------------------------------------------
-- Die Pfade fangen jetzt beim Projekt an, nicht mehr bei einer
-- Benutzerkennung:
--   <projekt>/bild
--   <projekt>/staende/<stand>.rle.gz
--   <projekt>/staende/<stand>.png
insert into storage.buckets (id, name, public)
values ('muster', 'muster', false)
on conflict (id) do nothing;

-- Auch hier erst das Recht, dann die Regel. In einem frischen
-- Supabase-Projekt stehen diese Rechte schon; doppelt vergeben schadet nicht,
-- und fehlen sie, antwortet der Dateispeicher mit 403, noch bevor die Regel
-- darunter zum Zuge kommt.
grant usage on schema storage to anon;
grant select on storage.buckets to anon;
grant select, insert, update, delete on storage.objects to anon;

drop policy if exists "alle musterdateien" on storage.objects;
create policy "alle musterdateien" on storage.objects
  for all to anon
  using (bucket_id = 'muster')
  with check (bucket_id = 'muster');
