-- ---------------------------------------------------------------------------
-- Prüft, dass die Row Level Security wirklich trennt.
--
-- Zwei Nutzerinnen, Anna und Berta. Anna legt ein Muster, einen Stand, eine
-- Legende, ein Motiv, einen Garnvorrat und zwei Dateien an. Danach versucht
-- Berta alles, was ihr nicht zusteht.
--
-- Erwartet wird:
--   * Anna sieht ihre eigenen Daten (je 1) und den Garnkatalog
--   * Berta sieht von Anna nichts (je 0), aber den Garnkatalog
--   * jeder Änderungsversuch Bertas scheitert oder trifft null Zeilen
--
-- Aufruf siehe README, Abschnitt "Row Level Security prüfen".
-- ---------------------------------------------------------------------------

\set ON_ERROR_STOP off
\pset pager off

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'anna@example.de'),
  ('22222222-2222-2222-2222-222222222222', 'berta@example.de')
on conflict do nothing;

insert into public.thread_brands (id, name)
values ('33333333-3333-3333-3333-333333333333', 'DMC')
on conflict do nothing;

insert into public.thread_colors (id, brand_id, code, name, hex, lab_l, lab_a, lab_b)
values ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
        '310', 'Schwarz', '#000000', 0, 0, 0)
on conflict do nothing;

\echo ''
\echo '=== Anna legt ihre Sachen an ==='
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

insert into public.patterns (id, user_id, name, width, height)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'Annas Blume', 100, 100);
insert into public.pattern_versions (id, pattern_id, label, grid_path)
values ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
        'Neu erzeugt', 'p/1.rle');
insert into public.pattern_colors (pattern_id, palette_index, thread_color_id, symbol, stitch_count)
values ('aaaaaaaa-0000-0000-0000-000000000001', 0,
        '44444444-4444-4444-4444-444444444444', 'A', 500);
insert into public.motifs (id, user_id, name, w, h, data_path)
values ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
        'Blatt', 10, 10, 'm/1.rle');
insert into public.user_threads (user_id, thread_color_id)
values ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444');
insert into storage.objects (bucket_id, name) values
  ('raster', '11111111-1111-1111-1111-111111111111/muster1/v1.rle'),
  ('motive', '11111111-1111-1111-1111-111111111111/motiv1.rle');

select 'Anna sieht' as wer,
       (select count(*) from public.patterns)         as muster,
       (select count(*) from public.pattern_versions) as staende,
       (select count(*) from public.pattern_colors)   as legende,
       (select count(*) from public.motifs)           as motive,
       (select count(*) from public.user_threads)     as vorrat,
       (select count(*) from public.thread_colors)    as garnkatalog,
       (select count(*) from storage.objects)         as dateien;

\echo ''
\echo '=== Berta darf von Anna nichts sehen (alles 0 ausser Garnkatalog) ==='
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select 'Berta sieht' as wer,
       (select count(*) from public.patterns)         as muster,
       (select count(*) from public.pattern_versions) as staende,
       (select count(*) from public.pattern_colors)   as legende,
       (select count(*) from public.motifs)           as motive,
       (select count(*) from public.user_threads)     as vorrat,
       (select count(*) from public.thread_colors)    as garnkatalog,
       (select count(*) from storage.objects)         as dateien;

\echo ''
\echo '=== Bertas Versuche (jeder muss scheitern oder null Zeilen treffen) ==='
\echo '-- Annas Muster umbenennen:'
update public.patterns set name = 'gekapert'
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';
\echo '-- Annas Muster loeschen:'
delete from public.patterns where id = 'aaaaaaaa-0000-0000-0000-000000000001';
\echo '-- Annas Motiv loeschen:'
delete from public.motifs where id = 'aaaaaaaa-0000-0000-0000-000000000003';
\echo '-- Ein Muster auf Annas Namen anlegen:'
insert into public.patterns (user_id, name, width, height)
values ('11111111-1111-1111-1111-111111111111', 'untergeschoben', 50, 50);
\echo '-- Den Garnkatalog aendern:'
insert into public.thread_colors (brand_id, code, name, hex, lab_l, lab_a, lab_b)
values ('33333333-3333-3333-3333-333333333333', '999', 'erfunden', '#ff00ff', 50, 50, 50);
\echo '-- Einen Stand an Annas Muster haengen:'
insert into public.pattern_versions (pattern_id, label, grid_path)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'eingeschmuggelt', 'x.rle');
\echo '-- Eine Datei in Annas Ordner legen:'
insert into storage.objects (bucket_id, name)
values ('raster', '11111111-1111-1111-1111-111111111111/geklaut.rle');

\echo ''
\echo '=== Annas Daten sind unveraendert ==='
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select (select name from public.patterns
         where id = 'aaaaaaaa-0000-0000-0000-000000000001') as mustername,
       (select count(*) from public.patterns)         as muster,
       (select count(*) from public.pattern_versions) as staende,
       (select count(*) from public.motifs)           as motive,
       (select count(*) from storage.objects)         as dateien;

reset role;
