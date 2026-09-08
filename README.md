# Stickmuster

Eine Web-App, die ein Foto in ein Kreuzstich-Zählmuster verwandelt. Die gesamte
Bildverarbeitung läuft im Browser in einem Web Worker – für die Musterberechnung
gibt es keinen Server-Roundtrip.

**Die App lässt sich installieren und läuft ohne Internet.** Alles liegt auf
dem Gerät: die Garnfarben im ausgelieferten Programm, Muster, Zwischenstände,
Motive und der Garnvorrat im Browserspeicher. Es gibt keinen Dienst dahinter,
keine Datenbank und keinen Schlüssel – siehe „Ohne Internet" weiter unten.

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
- `pdf-lib` für den Ausdruck, `idb` für den Speicher im Browser
- Kein Server, keine Datenbank, keine Anmeldung

## Einrichten

```bash
npm install
npm run dev
```

Mehr ist es nicht. Es gibt keine Umgebungsvariablen, nichts einzurichten und
nichts freizuschalten: die App bringt alles mit, was sie braucht.

## Ohne Internet

Die App ist eine PWA. Im Browser erscheint ein Knopf zum Installieren
(in Chrome rechts in der Adresszeile, in Safari über „Zum Dock hinzufügen"),
danach liegt sie wie ein Programm im Startmenü.

Damit sie auch ohne Verbindung läuft, gehört alles auf das Gerät:

| Was | Wo |
| --- | --- |
| Die 375 Ariadna-Farben | fest im Programm (`src/lib/garne/katalog-daten.ts`) |
| Muster, Zwischenstände, Motive, Garnvorrat | IndexedDB im Browser |
| Das Programm selbst | Service Worker (`public/sw.js`) |

Der Service Worker holt beim Einrichten die fünf Seiten und liest aus ihrem
Quelltext die Adressen aller Skripte und Stilvorlagen – die tragen einen
Prüfwert im Namen und lassen sich deshalb nicht fest hinschreiben. So ist die
App vollständig, sobald sie einmal geladen wurde, und nicht erst, nachdem man
jede Seite von Hand aufgerufen hat.

Danach gilt: Seitenaufrufe erst über das Netz und nur ersatzweise aus dem
Zwischenspeicher, damit eine neue Fassung ankommt, sobald Verbindung besteht.
Die Bausteine unter `/_next/static/` kommen immer aus dem Zwischenspeicher –
ihr Inhalt ändert sich nie, weil der Prüfwert im Namen steht.

**Was das bedeutet:** die Muster liegen auf genau einem Gerät. Es gibt keine
Kopie in der Ferne. Wer ein fertiges Muster behalten will, druckt es aus –
dafür ist Schritt 4 da.

### Die Garnfarben

Die App kennt genau einen Hersteller: **Ariadna**, weil allein diese Garne
zu Hause liegen. `data/garne-ariadna.csv` enthält alle 375 Farben
(1500–1819 und die Nummern mit Buchstaben) im Format `brand,code,name,hex`.

Die Spalte `name` ist leer: Ariadna vergibt keine Farbnamen, nur Nummern.
Statt welche zu erfinden, beschreibt die App die Farbe selbst – aus dem
Hexwert wird „dunkles Rot" beziehungsweise „ciemny czerwony", je nach
eingestellter Sprache (`src/lib/farbe/farbwort.ts`).

Ausgeliefert wird die Liste nicht als CSV, sondern als Modul im Programm:

```bash
npm run garnkatalog     # data/garne-ariadna.csv -> src/lib/garne/katalog-daten.ts
```

Damit steht der Katalog sofort bereit, auch beim allerersten Start ohne
Verbindung. Die Lab-Werte stehen bewusst **nicht** in der Datei: sie aus 375
Hexwerten zu rechnen dauert weniger als eine Millisekunde, und eine zweite
Wahrheit, die zum Hexwert nicht mehr passt, will man nicht haben.

#### Woher die Ariadna-Werte kommen

Ariadna veröffentlicht keine Farbwerte. Es gibt nur die Nummern und Fotos
der einzelnen Garnstränge im Laden von Coricamo. Aus einem Foto lässt sich
eine Farbe lesen – nur ist die nicht die Garnfarbe: die Bilder sind
nachbearbeitet und deutlich übersättigt, bei roten Garnen liegt der
Grünkanal auf 0. Roh übernommen wäre die Palette zu bunt und zu dunkel.

Für DMC gibt es im selben Laden dieselbe Art Foto **und** eine
veröffentlichte Farbtafel (`data/dmc-farbtafel.csv`). DMC dient dabei nur
als Maßstab und wird nicht als Garn eingelesen. Aus diesen 488 Paaren
lernt `scripts/garne-ableiten.mjs`, wie die Bildbearbeitung des Ladens die
Farben verschiebt, und rechnet das bei den Ariadna-Fotos wieder heraus.
Gerechnet wird in Lab, damit jeder Fehler so schwer wiegt, wie das Auge ihn
sieht; in RGB kam Ariadna 1819 (Schwarz) als Dunkelgrau heraus.

```bash
npm run garne-ableiten     # lädt die Garnfotos und schreibt die CSV neu
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

## Keine Anmeldung, kein Dienst

Die App fragt niemanden nach irgendetwas: kein Passwort, kein Magic Link,
kein Konto. Wer die Seite aufruft, arbeitet sofort an den Mustern.

Sie braucht das auch nicht mehr: es gibt nichts in der Ferne, worauf sich
ein Zugang beziehen könnte. Alle Daten liegen im Browser des Geräts, und
was dort liegt, kommt ohnehin nur an, wer das Gerät hat.

Der Preis gehört benannt: **die Muster liegen auf genau einem Gerät.**
Wer den Browserspeicher leert oder das Gerät wechselt, fängt neu an.
Ein fertiges Muster gehört deshalb ausgedruckt – dafür ist Schritt 4 da.

## Aufbau des Projekts

```
src/app/schritt/…       Die vier Schritte des geführten Weges
src/app/garne           Der eigene Garnvorrat
src/components          Schaltflächen, Fortschrittsleiste, Fenster
src/lib/farbe           Lab, CIEDE2000 und die Farbbeschreibungen
src/lib/garne           Der Garnkatalog, fest im Programm
src/lib/speicher        IndexedDB: Arbeitsstand, Stände, Motive, Garnvorrat
src/lib/sprache         Wörterbuch Deutsch/Polnisch und der Sprachumschalter
public/sw.js            Service Worker – dafür läuft die App ohne Internet
data                    Garnlisten und ihre Quelldaten
scripts                 Garnfarben ableiten, Katalog und Symbole erzeugen
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

Raster (die eigentlichen Stichdaten) liegen nie als lose Zahlenlisten,
sondern immer lauflängenkodiert und danach zusammengedrückt. Ein Muster mit
160 000 Feldern schrumpft dabei auf wenige Kilobyte, und in IndexedDB passt
das bequem neben Quellbild und Vorschau.

In der Datenbank des Browsers liegen vier Läden:

| Laden | Inhalt |
| --- | --- |
| `arbeit` | der aktuelle Stand, laufend mitgeschrieben – gegen Abstürze |
| `staende` | die gespeicherten Zwischenstände je Muster |
| `motive` | gemerkte Ausschnitte, über Muster hinweg |
| `garnvorrat` | welche Garne zu Hause liegen |

Aufgeräumt wird nur bei den Zwischenständen: die letzten 20 automatischen
bleiben, gemerkte nie löschen, und ein Stand, an dem ein anderer als
Elternteil hängt, bleibt ebenfalls stehen – sonst risse der Baum auseinander.
