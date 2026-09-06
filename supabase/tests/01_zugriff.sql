-- ---------------------------------------------------------------------------
-- Prüft die Zugriffsregeln der Fassung ohne Anmeldung.
--
-- Erwartet wird:
--   * die App (Rolle anon) darf Muster, Stände, Legende, Motive, Garnvorrat
--     und Dateien anlegen, lesen und wieder löschen
--   * der Garnkatalog ist für anon lesbar, aber NICHT beschreibbar –
--     dafür gibt es allein den Dienstschlüssel
--
-- Aufruf siehe README, Abschnitt "Zugriffsregeln prüfen".
-- ---------------------------------------------------------------------------

\set ON_ERROR_STOP off
\pset pager off

-- Der Katalog wird angelegt wie vom Importskript (Dienstschlüssel).
insert into public.thread_brands (id, name)
values ('33333333-3333-3333-3333-333333333333', 'DMC')
on conflict do nothing;
insert into public.thread_colors (id, brand_id, code, name, hex, lab_l, lab_a, lab_b)
values ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
        '310', 'Schwarz', '#000000', 0, 0, 0)
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('raster', 'raster', false), ('motive', 'motive', false)
on conflict do nothing;

\echo ''
\echo '=== Die App (Rolle anon) legt an und liest ==='
set role anon;

insert into public.patterns (id, name, width, height)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Blume', 100, 100);
insert into public.pattern_versions (id, pattern_id, label, grid_path)
values ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
        'Neu erzeugt', 'aaaaaaaa-0000-0000-0000-000000000001/v1.rle');
insert into public.pattern_colors (pattern_id, palette_index, thread_color_id, symbol, stitch_count)
values ('aaaaaaaa-0000-0000-0000-000000000001', 0,
        '44444444-4444-4444-4444-444444444444', 'A', 500);
insert into public.motifs (id, name, w, h, data_path)
values ('aaaaaaaa-0000-0000-0000-000000000003', 'Blatt', 10, 10, 'motiv1.rle');
insert into public.user_threads (thread_color_id)
values ('44444444-4444-4444-4444-444444444444');
insert into storage.objects (bucket_id, name) values
  ('raster', 'aaaaaaaa-0000-0000-0000-000000000001/v1.rle'),
  ('motive', 'motiv1.rle');

select 'darf alles' as pruefung,
       (select count(*) from public.patterns)         as muster,
       (select count(*) from public.pattern_versions) as staende,
       (select count(*) from public.pattern_colors)   as legende,
       (select count(*) from public.motifs)           as motive,
       (select count(*) from public.user_threads)     as vorrat,
       (select count(*) from public.thread_colors)    as garnkatalog,
       (select count(*) from storage.objects)         as dateien;

\echo ''
\echo '=== Der Garnkatalog ist fuer die App schreibgeschuetzt (muss scheitern) ==='
\echo '-- Katalog erweitern:'
insert into public.thread_colors (brand_id, code, name, hex, lab_l, lab_a, lab_b)
values ('33333333-3333-3333-3333-333333333333', '999', 'erfunden', '#ff00ff', 50, 50, 50);
\echo '-- Katalog aendern (muss null Zeilen treffen):'
update public.thread_colors set name = 'umbenannt'
 where id = '44444444-4444-4444-4444-444444444444';
\echo '-- Katalog loeschen (muss null Zeilen treffen):'
delete from public.thread_colors where id = '44444444-4444-4444-4444-444444444444';

\echo ''
\echo '=== Aufraeumen darf die App selbst (Kaskade ueber das Muster) ==='
delete from public.motifs where id = 'aaaaaaaa-0000-0000-0000-000000000003';
delete from public.patterns where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select 'nach dem Loeschen' as pruefung,
       (select count(*) from public.patterns)         as muster,
       (select count(*) from public.pattern_versions) as staende,
       (select count(*) from public.pattern_colors)   as legende,
       (select count(*) from public.motifs)           as motive,
       (select count(*) from public.thread_colors)    as garnkatalog;

reset role;
