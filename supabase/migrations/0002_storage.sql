-- ---------------------------------------------------------------------------
-- Storage-Buckets.
--
-- Ohne Anmeldung gibt es keine Nutzerkennung, an der sich der Zugriff
-- festmachen liesse. Die Buckets bleiben trotzdem **nicht oeffentlich**: die
-- App holt sich zeitlich begrenzte Links (signed URLs). Wer den oeffentlichen
-- Schluessel hat, kommt an die Dateien – wer nur einen Link hat, nach dessen
-- Ablauf nicht mehr.
--
-- Pfadschema (ohne Nutzerordner):
--   quellbilder/<pattern_id>.<ext>
--   raster/<pattern_id>/<version_id>.rle
--   vorschau/<pattern_id>/<version_id>.png
--   motive/<motif_id>.rle  und  motive/<motif_id>.png
--
-- Die Datei darf mehrfach laufen.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('quellbilder', 'quellbilder', false),
       ('raster',      'raster',      false),
       ('vorschau',    'vorschau',    false),
       ('motive',      'motive',      false)
on conflict (id) do update set public = false;

do $$
declare
  b text;
begin
  foreach b in array array['quellbilder', 'raster', 'vorschau', 'motive'] loop
    execute format('drop policy if exists %I on storage.objects', b || ' alles');
    execute format($p$
      create policy %I on storage.objects for all to anon, authenticated
      using (bucket_id = %L) with check (bucket_id = %L)
    $p$, b || ' alles', b, b);
  end loop;
end;
$$;
