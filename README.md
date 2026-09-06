# Stickmuster

Eine Web-App, die ein Foto in ein Kreuzstich-Zählmuster verwandelt. Die gesamte
Bildverarbeitung läuft im Browser in einem Web Worker – für die Musterberechnung
gibt es keinen Server-Roundtrip.

Die Oberfläche ist vollständig deutsch und für eine Nutzerin ohne
Computererfahrung gebaut: Grundschrift 20px, Schaltflächen mindestens 56px hoch,
pro Bildschirm genau eine Hauptaktion, keine versteckten Einstellungen.

## Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS
- Supabase (Anmeldung per Magic Link, Postgres, Storage)
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
| `SUPABASE_SERVICE_ROLE_KEY` | Nur für `npm run garne-importieren`. Gehört niemals in den Browser. |

### Supabase vorbereiten

1. Migrationen anwenden – entweder mit der Supabase-CLI
   (`supabase db push`) oder indem die Dateien aus `supabase/migrations/`
   der Reihe nach im SQL-Editor ausgeführt werden:

   | Datei | Inhalt |
   | --- | --- |
   | `0001_schema.sql` | Tabellen, Fremdschlüssel und Row Level Security |
   | `0002_storage.sql` | Die vier privaten Storage-Buckets und ihre Regeln |

2. Unter *Authentication → URL Configuration* die Adresse
   `http://localhost:3000/auth/bestaetigen` (bzw. die Adresse der
   veröffentlichten App) als Redirect-URL eintragen.

3. Die Garnfarben einlesen:

   ```bash
   npm run garne-importieren -- data/garne-dmc.csv
   ```

   Das Skript rechnet die Lab-Werte **einmal** aus und speichert sie mit;
   zur Laufzeit werden dann nur noch Abstände berechnet. Ohne diesen
   Schritt läuft die App weiter, rechnet dann aber mit den Farben aus dem
   Bild statt mit Herstellergarnen.

### Garnfarben nachliefern

`data/garne-dmc.csv` enthält 44 gut verteilte DMC-Töne als Platzhalter –
keine erfundenen 500 Farbnummern. Das Format ist:

```
brand,code,name,hex
DMC,310,Schwarz,#000000
```

Weitere Hersteller (Anchor, Madeira, Ariadna) kommen als eigene CSV-Datei
mit demselben Kopf dazu und werden mit demselben Skript eingelesen. Die
Hexwerte der Hersteller sind Näherungen; deshalb lässt sich in der App
jede Farbe der Legende von Hand auf ein anderes Garn ändern.

## Aufbau des Projekts

```
src/app/anmelden        Anmeldung per Magic Link
src/app/auth/bestaetigen  Ziel des Links aus der E-Mail
src/app/schritt/…       Die vier Schritte des geführten Weges
src/app/garne           Der eigene Garnvorrat
src/components          Schaltflächen, Fortschrittsleiste, Fenster
src/lib/supabase        Supabase-Clients für Browser, Server und Proxy
supabase/migrations     SQL-Migrationen
scripts                 Importskript für Garnfarben, Beispielbilder
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
nur Verweise und Metadaten. Alle Buckets sind privat, alle Tabellen mit
Nutzerbezug haben Row Level Security.
