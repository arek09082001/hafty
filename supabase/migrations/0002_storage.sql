-- ---------------------------------------------------------------------------
-- Storage-Buckets. Alle privat – Zugriff ausschliesslich ueber die
-- angemeldete Nutzerin, erkennbar am ersten Ordner im Pfad (= ihre user_id).
--
-- Pfadschema:
--   quellbilder/<user_id>/<pattern_id>.<ext>
--   raster/<user_id>/<pattern_id>/<version_id>.rle
--   vorschau/<user_id>/<pattern_id>/<version_id>.png
--   motive/<user_id>/<motif_id>.rle  und  motive/<user_id>/<motif_id>.png
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
    execute format('drop policy if exists %I on storage.objects', b || ' lesen');
    execute format('drop policy if exists %I on storage.objects', b || ' schreiben');
    execute format('drop policy if exists %I on storage.objects', b || ' aendern');
    execute format('drop policy if exists %I on storage.objects', b || ' loeschen');

    execute format($p$
      create policy %I on storage.objects for select to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)
    $p$, b || ' lesen', b);

    execute format($p$
      create policy %I on storage.objects for insert to authenticated
      with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)
    $p$, b || ' schreiben', b);

    execute format($p$
      create policy %I on storage.objects for update to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)
    $p$, b || ' aendern', b, b);

    execute format($p$
      create policy %I on storage.objects for delete to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)
    $p$, b || ' loeschen', b);
  end loop;
end;
$$;
