# Stickmuster

Eine Web-App, die ein Foto in ein Kreuzstich-Zählmuster verwandelt. Die gesamte
Bildverarbeitung läuft im Browser in einem Web Worker – für die Musterberechnung
gibt es keinen Server-Roundtrip.

Die Oberfläche gibt es auf **Deutsch und Polnisch** und ist für eine Nutzerin
ohne Computererfahrung gebaut: Grundschrift 20px, Schaltflächen mindestens 56px
hoch, pro Bildschirm genau eine Hauptaktion, keine versteckten Einstellungen.

**Es gibt keine Anmeldung.** Die App ist für eine einzige Person gedacht, die
ihre Muster wiederfinden will, ohne sich etwas merken zu müssen: Seite
aufrufen und loslegen. Was das für die Sicherheit bedeutet, steht weiter
unten unter „Keine Anmeldung – was das heißt".

## Zwei Sprachen

Alle sichtbaren Texte stehen in `src/lib/sprache/texte.ts`, Deutsch und
Polnisch nebeneinander. Deutsch ist die Vorlage, Polnisch wird dagegen
getypt – eine fehlende Übersetzung ist damit ein Fehler beim Übersetzen des
Programms und nicht erst im Betrieb zu merken.

Beim allerersten Besuch entscheidet die Spracheinstellung des Geräts; wer
einmal von Hand umschaltet, bekommt ab dann immer seine Sprache. Die beiden
Knöpfe stehen oben rechts, jeder in seiner eigenen Sprache beschriftet.
Übersetzt wird alles: die Oberfläche, die Meldungen, die Zahlen- und
Datumsschreibweise und der Ausdruck.

Für den Ausdruck liegt eine eigene Schriftdatei bei: die eingebauten
Schriften eines PDF beherrschen nur WinAnsi und damit kein einziges
polnisches Sonderzeichen. `public/schriften/` enthält deshalb eine auf die
gebrauchten Zeichen zusammengestrichene Fassung der Liberation Sans
(je rund 20 kB statt 400 kB, Lizenz liegt daneben). Neu erzeugen mit
`node scripts/schrift-verkleinern.mjs`.

## Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS
- Supabase (Postgres und Storage, ohne Auth)
- `pdf-lib` für den Ausdruck, `idb` für die Sicherung im Browser

## Einrichten

```bash
npm install
cp .env.example .env.local   # und die Werte eintragen
npm run dev
```

### Umgebungsvariablen

| Variable | Wofür |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Adresse des Supabase-Projekts (Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Öffentlicher Schlüssel des Projekts |
| `SUPABASE_SERVICE_ROLE_KEY` | Nur für `npm run garne-importieren`. Gehört niemals in den Browser und nicht zum Hoster. |

### Supabase vorbereiten

1. Migrationen anwenden – entweder mit der Supabase-CLI
   (`supabase db push`) oder indem die Dateien aus `supabase/migrations/`
   der Reihe nach im SQL-Editor ausgeführt werden:

   | Datei | Inhalt |
   | --- | --- |
   | `0001_schema.sql` | Tabellen, Fremdschlüssel und Row Level Security |
   | `0002_storage.sql` | Die vier privaten Storage-Buckets und ihre Regeln |

2. Die Garnfarben einlesen – erst Ariadna, dann DMC:

   ```bash
   npm run garne-importieren -- data/garne-ariadna.csv
   npm run garne-importieren -- data/garne-dmc.csv
   ```

   Das Skript rechnet die Lab-Werte **einmal** aus und speichert sie mit;
   zur Laufzeit werden dann nur noch Abstände berechnet. Ohne diesen
   Schritt läuft die App weiter, rechnet dann aber mit den Farben aus dem
   Bild statt mit Herstellergarnen.

### Die Garnfarben

Im Projekt liegen zwei Farblisten, beide im Format `brand,code,name,hex`:

| Datei | Inhalt |
| --- | --- |
| `data/garne-ariadna.csv` | 375 Ariadna-Farben (1500–1819 und die Nummern mit Buchstaben) |
| `data/garne-dmc.csv` | 489 DMC-Farben mit den Namen des Herstellers |

Ariadna steht vorn, weil das die Garne sind, die zu Hause liegen. Die
Spalte `name` ist dort leer: Ariadna vergibt keine Farbnamen, nur Nummern.
Statt welche zu erfinden, beschreibt die App die Farbe selbst – aus dem
Hexwert wird „dunkles Rot" beziehungsweise „ciemny czerwony", je nach
eingestellter Sprache (`src/lib/farbe/farbwort.ts`).

Das Importskript legt neue Farben an und aktualisiert vorhandene, löscht
aber nie welche. Wer eine ältere Liste eingelesen hatte, wird alte Zeilen
also von Hand los.

#### Woher die Ariadna-Werte kommen

Ariadna veröffentlicht keine Farbwerte. Es gibt nur die Nummern und Fotos
der einzelnen Garnstränge im Laden von Coricamo. Aus einem Foto lässt sich
eine Farbe lesen – nur ist die nicht die Garnfarbe: die Bilder sind
nachbearbeitet und deutlich übersättigt, bei roten Garnen liegt der
Grünkanal auf 0. Roh übernommen wäre die Palette zu bunt und zu dunkel.

Für DMC gibt es im selben Laden dieselbe Art Foto **und** eine
veröffentlichte Farbtafel (`data/dmc-farbtafel.csv`). Aus diesen 488 Paaren
lernt `scripts/garne-ableiten.mjs`, wie die Bildbearbeitung des Ladens die
Farben verschiebt, und rechnet das bei den Ariadna-Fotos wieder heraus.
Gerechnet wird in Lab, damit jeder Fehler so schwer wiegt, wie das Auge ihn
sieht; in RGB kam Ariadna 1819 (Schwarz) als Dunkelgrau heraus.

```bash
npm run garne-ableiten     # lädt die Garnfotos und schreibt beide CSV neu
```

Wie genau das ist, misst das Skript selbst, indem es ein Fünftel der
DMC-Farben zurückhält, auf dem Rest eicht und an den zurückgehaltenen prüft:

| | Abstand zur DMC-Farbtafel (CIEDE2000) |
| --- | --- |
| Foto ohne Eichung | Mittel 7,5 · Median 7,1 |
| Foto mit Eichung | **Mittel 5,0 · Median 4,7** |
| Zwei veröffentlichte DMC-Tafeln untereinander | Mittel 9,1 · Median 8,3 |

Die dritte Zeile ist der Maßstab: unsere aus Fotos gerechneten Werte liegen
näher an der Farbtafel, als zwei veröffentlichte Tafeln beieinander liegen.
Eine allgemeingültige „richtige" Zahl für ein Garn gibt es nicht.

Als Gegenprobe dient `data/coricamo-zuordnung.csv`. Darin steht, welche
DMC-Farbe der Laden selbst zu jeder Ariadna-Farbe nennt – eine Angabe, die
in die Rechnung nirgends eingeflossen ist. Unsere Ariadna-Werte liegen im
Median ΔE 10 von der jeweils genannten DMC-Farbe entfernt; zufällig
gepaarte Farben lägen bei ΔE 34. Der Rest ist die Umrechnung selbst, die
laut Coricamo ausdrücklich nur ein Anhaltspunkt ist.

Alle Farbwerte bleiben also Näherungen. Sie ersetzen keine Garnkarte, und
deshalb lässt sich in der App jede Farbe der Legende von Hand auf ein
anderes Garn ändern.

## Keine Anmeldung – was das heißt

Die App fragt niemanden nach irgendetwas: kein Passwort, kein Magic Link,
kein Konto. Wer die Seite aufruft, arbeitet sofort an den Mustern.

Der Preis dafür gehört benannt: **wer die Adresse der App kennt, kann die
Muster lesen, ändern und löschen.** Der öffentliche Schlüssel steht im
Quelltext der ausgelieferten Seite, daran führt kein Weg vorbei. Der
Schutz besteht allein darin, die Adresse nicht herumzureichen.

Für ein Muster-Programm auf einem Familientablet ist das in Ordnung. Wenn
es doch einmal enger werden soll, ohne dass sich für die Nutzerin etwas
ändert, gibt es zwei Wege, die nichts mit der App zu tun haben:

- beim Hoster einen Zugangsschutz einschalten (bei Vercel z. B.
  *Deployment Protection*), oder
- die App gar nicht veröffentlichen und mit `npm run dev` auf dem Gerät
  laufen lassen, auf dem gestickt wird.

Die einzige Ausnahme von „alles erlaubt" ist der Garnkatalog: er ist aus
der App heraus nur lesbar. Geschrieben wird er ausschließlich vom
Importskript über den Dienstschlüssel, damit ein Versehen ihn nicht
zerstören kann.

### Zugriffsregeln prüfen

Die Regeln lassen sich ohne Supabase-Projekt auf einem gewöhnlichen
PostgreSQL nachprüfen. `supabase/tests/00_supabase_nachbau.sql` baut die
paar Supabase-Teile nach, die die Migrationen brauchen (`storage.objects`,
die Rollen), `01_zugriff.sql` prüft dann, was die App darf:

```bash
createdb stickmuster_test
psql -d stickmuster_test -c 'create extension if not exists pgcrypto;'
psql -v ON_ERROR_STOP=1 -d stickmuster_test -f supabase/tests/00_supabase_nachbau.sql
psql -v ON_ERROR_STOP=1 -d stickmuster_test -f supabase/migrations/0001_schema.sql
psql -v ON_ERROR_STOP=1 -d stickmuster_test -f supabase/migrations/0002_storage.sql
psql -d stickmuster_test -f supabase/tests/01_zugriff.sql
```

Erwartet wird: die App darf Muster, Stände, Legende, Motive, Garnvorrat und
Dateien anlegen und wieder löschen, und jeder Schreibversuch am Garnkatalog
endet mit `violates row-level security policy` oder trifft null Zeilen.

Wichtig: die Ausgabe nicht durch `head` schicken. psql bricht dann mitten
in der Migration ab und es fehlen stillschweigend die letzten Regeln.

## Aufbau des Projekts

```
src/app/schritt/…       Die vier Schritte des geführten Weges
src/app/garne           Der eigene Garnvorrat
src/components          Schaltflächen, Fortschrittsleiste, Fenster
src/lib/farbe           Lab, CIEDE2000 und die Farbbeschreibungen
src/lib/sprache         Wörterbuch Deutsch/Polnisch und der Sprachumschalter
src/lib/supabase        Zugang zur Datenbank
data                    Garnlisten und ihre Quelldaten
supabase/migrations     SQL-Migrationen
supabase/tests          Nachbau und Prüfung der Zugriffsregeln
scripts                 Garnfarben ableiten und einlesen, Beispielbilder
```

## Der Ausdruck

„Muster drucken“ erzeugt das PDF vollständig im Browser (`pdf-lib`):

1. Vorschau der fertigen Stickerei, dazu ein Blattplan, wenn es mehrere
   Blätter werden
2. Garnliste mit Symbol, Garnnummer, Farbname, Stichzahl und geschätztem
   Garnverbrauch in Metern
3. Das Muster in Schwarzweiß mit Symbolen, Blatt für Blatt
4. Dasselbe noch einmal in Farbe

Die Blätter überlappen sich um zwei Reihen, jede zehnte Rasterlinie ist
dicker, und an den Rändern stehen die Reihen- und Spaltennummern. Die
Zehnerlinien werden ab dem Ursprung des Musters gezählt, nicht ab dem
Blattrand – sonst passten sie beim Zusammenlegen nicht zusammen.

Der Garnverbrauch ist geschätzt: ein volles Kreuz zieht den Faden zweimal
über die Diagonale und zweimal auf der Rückseite entlang, das sind rund
`4,83 · Kästchenseite`, plus 15 % für Anfänge, Enden und Übergänge. Auf
Aida 14 ergibt das etwa einen Meter je hundert Stiche.

## Datenhaltung

Raster (die eigentlichen Stichdaten) liegen **nie** als JSONB in Postgres,
sondern immer lauflängenkodiert als Datei im Storage. In der Datenbank stehen
nur Verweise und Metadaten.

Die Buckets sind nicht öffentlich; die App holt sich zeitlich begrenzte Links
(signed URLs). Row Level Security ist auf allen Tabellen eingeschaltet, damit
der Zugriff eine bewusst gesetzte Regel ist und nicht ein vergessener
Schalter – ohne Anmeldung lautet diese Regel für die Musterdaten allerdings
schlicht „alles erlaubt".
