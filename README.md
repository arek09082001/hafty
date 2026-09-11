# Stickmuster

Eine Web-App, die ein Foto in ein Kreuzstich-Zählmuster verwandelt. Die gesamte
Bildverarbeitung läuft im Browser in einem Web Worker – für die Musterberechnung
gibt es keinen Server-Roundtrip.

**Die App lässt sich installieren und läuft ohne Internet.** Alles liegt auf
dem Gerät: die Garnfarben im ausgelieferten Programm, Muster, Zwischenstände,
Motive und der Garnvorrat im Browserspeicher – siehe „Ohne Internet" weiter
unten. Wer will, hängt zusätzlich ein Supabase-Projekt an; dann liegt jeder
gespeicherte Stand, sobald Verbindung besteht, auch dort. Ohne diese
Einrichtung ändert sich nichts, und die Oberfläche erwähnt sie mit keinem
Wort.

Die Oberfläche ist **polnisch** und für eine Nutzerin ohne Computererfahrung
gebaut: Grundschrift 20px, Schaltflächen mindestens 56px hoch, pro Bildschirm
genau eine Hauptaktion, keine versteckten Einstellungen.

**Es gibt keine Anmeldung – auch nicht im Hintergrund.** Die App ist für eine
einzige Person gedacht, die ihre Muster wiederfinden will, ohne sich etwas
merken zu müssen: Seite aufrufen und loslegen. Mit Sicherung bleibt das so;
alle Geräte sehen denselben Bestand. Was das für die Sicherheit bedeutet,
steht weiter unten unter „Keine Anmeldung, kein Passwort".

## Eine Sprache: Polnisch

Alle sichtbaren Texte stehen in `src/lib/sprache/texte.ts` – Oberfläche,
Meldungen und der Ausdruck. Zahlen, Datum und Uhrzeit werden nach `pl-PL`
geschrieben.

Hier stand einmal dieselbe Tabelle zweimal, deutsch und polnisch, mit zwei
Knöpfen oben rechts. Gebraucht wurde davon eine Hälfte: die App ist für eine
Person gebaut, und die liest Polnisch. Eine Wahl, bei der es nichts zu wählen
gibt, ist für die Nutzerin eine Stolperstelle mehr – ein Fehltipper, und die
App spricht plötzlich eine fremde Sprache.

Die Schlüssel bleiben deutsch benannt (`allgemein.abbrechen`), so wie der
übrige Programmtext. Sie bekommt niemand zu sehen.

Geblieben ist `t()`: die Texte stehen weiter an **einer** Stelle statt
verstreut im Programmtext. Das ist der eigentliche Nutzen, und der hängt
nicht an der Zahl der Sprachen.

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
- Für die freiwillige Sicherung: Supabase, über seine HTTP-Schnittstelle
  angesprochen (`src/lib/ferne`) – ohne zusätzliches Programmpaket
- Kein eigener Server, keine Anmeldung, die jemand sähe

## Einrichten

```bash
npm install
npm run dev
```

Mehr ist es nicht: die App bringt alles mit, was sie braucht, und läuft ohne
eine einzige Umgebungsvariable. Wer die Sicherung im Internet möchte, richtet
sie zusätzlich ein – wie, steht unter „Sicherung im Internet" und in
`.env.example`.

## Ohne Internet

Die App ist eine PWA. Im Browser erscheint ein Knopf zum Installieren
(in Chrome rechts in der Adresszeile, in Safari über „Zum Dock hinzufügen"),
danach liegt sie wie ein Programm im Startmenü.

Damit sie auch ohne Verbindung läuft, gehört alles auf das Gerät:

| Was | Wo |
| --- | --- |
| Die 375 Ariadna-Farben | fest im Programm (`src/lib/garne/katalog-daten.ts`) |
| Projekte, Muster, Zwischenstände, Motive, Garnvorrat | IndexedDB im Browser |
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

**Was das bedeutet:** ohne eingerichtete Sicherung liegen die Muster auf genau
einem Gerät. Wer ein fertiges Muster sicher behalten will, druckt es aus –
dafür ist Schritt 4 da – oder richtet die Sicherung im Internet ein.

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

## Wie viele Farben

Die Farbanzahl reicht von 2 bis 375 – so viele Garne hat der Katalog. Eine
Zahl darunter wäre eine willkürliche Grenze: wer jede Nuance eines Fotos
haben will, soll sie bekommen, und ob ein Muster mit 300 Farben zu sticken
ist, entscheidet die Nutzerin.

Meistens kommen weniger Farben heraus, als eingestellt sind. Das liegt nicht
an einer Deckelung, sondern am Katalog: zwei Clusterzentren, die dicht
beieinanderliegen, bekommen dasselbe nächstliegende Garn und werden
zusammengelegt. Aus 375 gewünschten Farben werden bei einem Foto in voller
Größe typischerweise um die hundert Garne – die App sagt das als ganzen Satz
(„Aus 375 Farben sind 102 geworden …").

Zwei Stellen mussten dafür umgebaut werden:

- **Ein Feld hält zwei Byte statt einem.** Mit einem Byte war bei 255 Farben
  Schluss, und die 255 war schon für „wird nicht gestickt" vergeben. Jetzt
  laufen die Palettenindizes von 0 bis 1022, die 1023 ist das freie Feld
  (`LEER` in `src/lib/muster/typen.ts`). Gespeicherte Muster und Motive aus
  der Zeit davor werden beim Lesen umgeschrieben.
- **Die Abstandstabelle ist eine Abstandsliste geworden.** Vorher stand für
  jedes Feld der Abstand zu jeder Palettenfarbe in einer Tabelle: bei 160 000
  Feldern und 48 Farben 30 MB, bei 375 Farben aber 240 MB – das überlebt kein
  Tablet. Jetzt stehen dort nur noch die zwölf nächstliegenden Farben je Feld,
  rund 12 MB, unabhängig von der Farbanzahl. Das Ergebnis ist dasselbe: für
  jede Farbe, die in der Nachbarschaft eines Feldes nicht vorkommt, ist die
  Strafe der Glättung gleich hoch, also kann unter ihnen nur die farbtreueste
  gewinnen – und die steht in der Liste. Warum das genau aufgeht, steht in
  `src/lib/muster/glaettung.ts`.

Gerechnet wird dadurch nicht weniger: ein Muster in voller Größe (400 × 400
Stiche) mit 375 Farben braucht rund fünf Sekunden statt der knapp vier bei 48
Farben, das meiste davon im k-Means. Die Fortschrittsleiste sagt, woran
gerade gearbeitet wird.

Eines bleibt begrenzt: der Schwarzweißdruck hat 66 gut unterscheidbare
Symbole (`src/lib/muster/symbole.ts`). Wer mehr Farben verwendet, findet
manche Symbole doppelt und muss sich nach dem Farbdruck richten – der liegt
demselben PDF ohnehin bei.

## Nur ein Motiv sticken

Ein Tipp auf die Blume, und die Blume ist ausgewählt – das ist das Werkzeug
„Ganzes Motiv auswählen" im Editor (`src/lib/muster/motivsuche.ts`). Danach
genügt „Nur das Ausgewählte sticken", und der Rest des Bildes bleibt blanker
Stoff.

Gesucht wird auf dem fertigen Stichraster und nicht auf dem Foto. Das ist der
bessere Ort: dort ist das Bild bereits auf die Garnfarben zusammengefasst und
geglättet, die Kanten sind sauber, und ausgewählt wird genau das, was später
auch gestickt wird. Ein Tipp kostet auf einem Muster mit 400 × 400 Stichen
rund 4 ms – kein Grund für einen Worker.

Von der angetippten Stelle aus wächst die Auswahl über die Nachbarfelder
weiter, solange deren Farbe der angetippten ähnlich genug ist, gemessen in
CIEDE2000. Wie ähnlich, sagen zwei Knöpfe („Mehr dazunehmen" / „Weniger"),
nie eine Zahl.

Mehrere Elemente gehen ohne Schalter: **jeder Tipp nimmt eines dazu**, und ein
Tipp auf ein schon ausgewähltes nimmt es wieder heraus. Dafür merkt sich der
Editor zu jedem Tipp die Fläche, die er ausgewählt hat, und sucht beim
nächsten Tipp, in welcher davon er liegt. Ein Schalter „mehrere auf einmal"
wäre auf einem Handy genau der Knopf, den man erst suchen und dann verstehen
müsste. Über Eck geht es nur weiter, wenn auch eines der beiden Felder
daneben passt – sonst liefe die Auswahl durch eine einzelne Ecke hindurch, an
der sich zwei Flächen nur berühren.

Eingeschlossene Löcher kommen mit hinein: die gelbe Blütenmitte gehört zur
Blume, obwohl ihre Farbe weit weg liegt. Damit ein Tipp **in den Hintergrund**
trotzdem tut, was er soll, gibt es zwei Bremsen – ist mehr als die halbe
Musterfläche gewachsen, wird gar kein Loch gefüllt, und ein einzelnes Loch
wird nur gefüllt, wenn es kleiner ist als die Hälfte des Gewachsenen. So
lässt sich genauso gut der Hintergrund antippen und weglassen.

Freigestellt wird nicht durch Löschen: die Felder bekommen den reservierten
Wert 255 („hier nicht sticken") in der **Bearbeitungsebene**. Damit hängt das
Freistellen an derselben Mechanik wie ein Pinselstrich – „Rückgängig" nimmt
es zurück, es bleibt beim Ändern der Farbanzahl erhalten, und es liegt in
jedem gespeicherten Stand mit drin. Auf dem Bildschirm bekommt so ein Feld
die Farbe des Stoffes (ein Leinenton, kein Weiß – sonst wäre es von weißem
Garn nicht zu unterscheiden), auf dem Papier bleibt das Kästchen leer.

Die Garnliste wird vor jeder Anzeige und vor dem Ausdruck neu gezählt. Sonst
stünde dort weiter, was beim Erzeugen herauskam: aus zwölf Farben und 100 m
Garn werden beim Freistellen einer Blüte schnell sieben Farben und 28 m, und
diese Liste ist die Einkaufsliste.

## Meine Muster: die Startseite

Vorher fing die App immer mit „Bild aussuchen" an. Für den ersten Besuch ist
das richtig, für jeden weiteren nicht: die Nutzerin kommt zurück, um an dem
Muster von gestern weiterzumachen – und musste das Foto dafür noch einmal auf
der Festplatte suchen.

Die Startseite (`src/app/Startseite.tsx`) zeigt deshalb, was da ist: je
hochgeladenem Bild eine Kachel mit dem Foto, dem Zeitpunkt der letzten
Änderung und den letzten Ständen als Bildchen. Ein Tipp auf die Kachel öffnet
den neuesten Stand, ein Tipp auf ein Bildchen genau diesen.

Geöffnet wird, indem der gewünschte Stand zum **Arbeitsstand** gemacht wird –
genau der, den die App nach einem Absturz ohnehin zurückholt
(`projektOeffnen` in `src/lib/speicher/projekte.ts`). So gibt es einen Weg
ins Muster hinein und nicht zwei, die auseinanderlaufen können.

### Ein Bild, ein Projekt – zugeordnet über den Dateinamen

Ein Projekt ist genau das, was die Nutzerin ohnehin im Kopf hat: ein
hochgeladenes Bild und alles, was daraus geworden ist. Wer „blume.jpg" ein
zweites Mal aussucht, arbeitet weiter an demselben Projekt: die Fassung mit
12 Farben und die mit 30 stehen danach nebeneinander, statt zwei fremde
Muster zu werden. Schritt 1 sagt das dazu, und die Einstellungen vom letzten
Mal kommen gleich mit – wer dasselbe Bild noch einmal nimmt, will fast immer
eine Kleinigkeit ändern und nicht bei den Voreinstellungen anfangen.

Die Zuordnung geht über den Dateinamen, ohne Rücksicht auf Groß- und
Kleinschreibung. Das ist die Ordnung, die beim Benennen der Fotos ohnehin
entsteht; eine zweite, die die App sich ausdenkt, bräuchte niemand.

### Ein neues Foto lässt das alte Projekt los

Damit ein Absturz nichts kostet, schreibt die App laufend einen
**Arbeitsstand** mit und holt ihn beim Öffnen zurück. Genau das stand einem
neuen Foto im Weg: Wer „Neues Bild aussuchen" tippte, fand in Schritt 1 das
zuletzt bearbeitete Bild vor, und wer dann doch ein anderes aussuchte,
bekam in Schritt 3 weiter das Muster des vorherigen Projekts zu sehen –
bis er in Schritt 2 noch einmal auf „Muster erstellen" tippte. Es sah aus,
als käme man von dem alten Projekt nicht los.

Drei Stellen sorgen jetzt dafür, dass ein neues Foto wirklich ein neues
Foto ist:

- **„Neues Bild aussuchen" fängt leer an.** Der Knopf auf der Startseite
  führt nach `/schritt/bild?neu=1`; Schritt 1 räumt daraufhin Bild, Muster
  und Projektzuordnung aus der Anzeige. Gelöscht wird nichts – über „Meine
  Muster" führt der Weg zu jedem Projekt zurück.
- **Die Wahl der Nutzerin schlägt den Arbeitsstand.** Er kommt aus der
  Datenbank und braucht dafür einen Augenblick. Trifft er ein, nachdem
  inzwischen ein Foto ausgesucht wurde, wird er verworfen statt eingesetzt
  (`eigeneWahl` in `MusterProvider.tsx`).
- **Mit dem Bild geht das Muster.** `bildWaehlen` räumt das bisherige Muster
  weg; was seit dem letzten Sichern von Hand gemalt wurde, wird vorher als
  Stand gemerkt („Vor dem Bildwechsel gemerkt") und ist über „Alle
  Versionen" wieder zu haben.

### Schritt 3 rechnet ein fehlendes Muster selbst

Wer ein Foto ausgesucht hat, will es sehen. Findet Schritt 3 ein Bild vor,
zu dem noch kein Muster gehört, rechnet er es deshalb von selbst und zeigt
so lange das Foto mit der Fortschrittsanzeige – statt eines fremden Musters
oder der Meldung „Hier ist noch kein Muster". Verglichen wird dafür die
Grundkennung des Bildes, also das Foto selbst: einen anderen **Ausschnitt**
bestätigt die Nutzerin weiterhin in Schritt 2, sonst wären ihre von Hand
gemalten Stiche schon beim versehentlichen Verschieben des Rahmens weg.

Ein Arbeitsstand darf seither auch aus dem Bild allein bestehen (Maße
0 × 0). Sonst stünde nach dem Neuladen der Seite wieder das vorherige
Projekt da, obwohl gerade ein neues Foto ausgesucht wurde.

## Alle Versionen ansehen

„Einmal habe ich mehr Farben genommen, einmal die Größe geändert – welches
war besser?" An zwei Bildchen von 140 Punkten Breite lässt sich das nicht
beantworten. „Alle Versionen ansehen" macht daraus einen ganzen Bildschirm –
aus dem Editor heraus und von der Startseite aus
(`src/components/Vergleich.tsx`).

Zuerst standen dort zwei Fassungen nebeneinander, jede mit eigenen
Blätterknöpfen. Das war nicht zu bedienen: wer wissen will, welche der acht
Fassungen ihm gefällt, müsste sie paarweise durchgehen und dabei im Kopf
behalten, welche er schon gesehen hat. Zwei Bilder nebeneinander helfen,
wenn man die beiden schon kennt – nicht beim Suchen.

Deshalb jetzt: **erst die Übersicht, dann das Einzelne.**

- **Alle Versionen liegen als Kacheln da**, so wie Fotos auf dem Tisch. Man
  sieht auf einen Schlag, wo es dunkler wurde, wo mehr Farben dazukamen,
  welche die schmale war. Unter jeder steht, wann sie entstanden ist, wie
  viele Farben und wie viele Stiche sie hat und warum es sie gibt („Neu
  erzeugt", „Gemerkt"). Die Fassung, an der gerade gearbeitet wird, ist
  grün hinterlegt.
- **Drei Kachelgrößen** über „Kleiner" und „Größer" – auf einem Tablet will
  man große Bilder, auf einem breiten Bildschirm lieber alle gleichzeitig.
  Das Bild sitzt in einem festen Rahmen, etwas höher als breit: sonst
  verrutschten in einer Reihe aus einem hochkanten und einem querformatigen
  Muster die Beschriftungen gegeneinander.
- **Ein Tipp macht eine Version groß.** Dort wird aus den vollen
  Rasterdaten gezeichnet und nicht aus dem Vorschaubildchen – wer eine
  Fassung groß ansieht, will die Kästchen zählen können –, es lässt sich
  vergrößern und schieben, und mit „Frühere Version" / „Spätere Version"
  geht es dieselbe Reihe entlang. „Diese Version nehmen" holt sie zurück in
  die Arbeit; ist es die, an der ohnehin gearbeitet wird, steht das da,
  statt dass der Knopf nichts täte.

Die Kacheln zeigen das gespeicherte Vorschaubild – es liegt neben jedem
Stand und ist sofort da. Erst die große Ansicht holt das volle Raster, und
ein einmal geholtes bleibt liegen, damit das Durchblättern nicht wartet.

Die Kachel hat die **Form des Musters**: alle Versionen eines Bildes sind
fast immer gleich geformt, und dann sitzt das Vorschaubild randlos darin
statt zwischen zwei leeren Streifen. Vorgegeben ist dabei die Höhe und nicht
die Breite – ein hochkantes Muster wäre sonst bei der größten Stufe
siebenhundert Punkte hoch, und von der zweiten Reihe wäre nichts mehr zu
sehen. Vergrößert wird hart und nicht weichgezeichnet (`img.raster` in
`globals.css`): ein Stichraster ist blockig, und so soll es auch aussehen.

**Löschen** geht von hier aus, in der Kachel und in der großen Ansicht, immer
mit Rückfrage. Hängt ein jüngerer Stand als Kind an dem gelöschten, bekommt
er dessen Elternteil – sonst risse der Baum an dieser Stelle auseinander. Die
**letzte** Version eines Musters bleibt: ein Projekt ohne jede Version stünde
auf der Startseite und ließe sich nicht mehr öffnen. Wer es ganz loswerden
will, löscht dort das Projekt.

Die Maße („100 × 173 Stiche") standen bei Ständen von vor dieser Übersicht
nicht im Satz, sondern nur im gepackten Raster – in der Kachel stand dann
„0 × 0". Sie werden jetzt beim ersten Anzeigen aus dem 14 Byte langen Kopf
der Rasterdatei nachgetragen (`masseLesen` in `speicher/rle.ts`) und wandern
gleich in den Satz zurück.

## Sicherung im Internet

Ohne Einrichtung gibt es sie nicht, und die Oberfläche erwähnt sie mit keinem
Wort. Mit Einrichtung gilt: **gespeichert wird immer zuerst auf dem Gerät,
und was gespeichert wurde, geht bei bestehender Verbindung sofort hinauf.**

Die Reihenfolge ist der Kern der Sache (`src/lib/ferne/abgleich.ts`):

1. Der Stand landet in IndexedDB. Sofort, auch ohne Empfang.
2. Er steht danach in der Vormerkliste – Art und Kennung, mehr nicht
   (`src/lib/speicher/abgleichliste.ts`).
3. Sobald Verbindung besteht, wird diese Liste abgearbeitet: beim Start, bei
   jedem Speichern, sobald das Gerät wieder Netz meldet, sobald die App nach
   vorn geholt wird, und alle 20 Sekunden, solange etwas wartet.

Damit wartet die Nutzerin nie auf das Netz, und trotzdem ist binnen Sekunden
alles oben. Bricht die Verbindung mitten im Hochladen ab, bleibt die
Vormerkung stehen; hochgeladen wird immer unter derselben Kennung wie auf dem
Gerät, zweimal schadet also nicht. In der Kopfzeile steht in einem Satz, wie
es steht: „Gesichert im Internet" oder „Wird gesichert, sobald Sie Internet
haben (3)".

In die andere Richtung geht es einmal beim Start: was in der Ferne liegt und
hier fehlt, wird geholt. Das ist der Fall, für den das Ganze gebaut ist –
neues Gerät, geleerter Browserspeicher. Beim Arbeiten ist immer das Gerät die
Wahrheit; die Ferne ist die Sicherung und schreibt nie etwas um, was hier
schon liegt.

Was hochgeht: eine Zeile je Projekt, eine je Stand, dazu drei Dateien im
Dateispeicher – das Quellfoto (genau einmal, es ändert sich nie), das
zusammengedrückte Raster und das Vorschaubild. Ein Muster mit 160 000 Feldern
wiegt dabei ein paar Kilobyte, das Foto ist das Schwere daran.

Eingerichtet ist es mit zwei Handgriffen:

```bash
# 1. Tabellen und Regeln anlegen – beide Dateien, in dieser Reihenfolge:
#    supabase/migrations/0001_muster_sichern.sql
#    supabase/migrations/0002_ohne_anmeldung.sql
# 2. .env.local anlegen (Vorlage: .env.example)
NEXT_PUBLIC_SUPABASE_URL=https://…supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
```

Mehr ist es nicht: kein Konto, kein Schalter unter Authentication, kein
Schlüssel, der geheim bleiben müsste.

### Erst das Projekt, dann seine Stände

In der Ferne hängt jeder Stand mit einem Fremdschlüssel an seinem Projekt
(`staende.projekt_id`). Fehlt dessen Zeile, antwortet der Dienst mit **409
Conflict** – und das war kein Sonderfall: Beim Sichern wird zuerst der Stand
vorgemerkt und erst danach das Projekt, das vorher noch sein kleines Foto
baut. Ein Lauf, der genau dazwischen fiel (der Takt geht alle 20 Sekunden),
sah einen Stand ohne sein Projekt und bekam den 409.

Deshalb schiebt `standHochladen` die Projektzeile jetzt selbst voraus, statt
sich auf die Reihenfolge in der Warteschlange zu verlassen. Ist das Projekt
auf dem Gerät noch gar nicht angelegt, bleibt der Stand einfach vorgemerkt
und kommt im nächsten Lauf wieder dran – ein Fehler ist das nicht.

### Ein Eintrag, der klemmt, hält den Rest nicht auf

Vorher brach der ganze Lauf beim ersten Fehler ab. Eine einzige Sache, die
der Dienst dauerhaft ablehnte, hielt damit alles andere fest: alle 20
Sekunden dieselbe abgelehnte Anfrage, und kein einziges anderes Muster kam
hinauf. Jetzt bleibt so ein Eintrag vorgemerkt, der Rest der Liste geht
trotzdem. Nur bei „kein Netz" und „kein Zugang" hört der Lauf sofort auf –
dann klappt der Rest ohnehin nicht.

Sagt die Kopfzeile „Die Sicherung im Internet klappt gerade nicht", hat der
Dienst abgelehnt, und im Netzwerk-Reiter des Browsers steht, woran es liegt.
Zweimal ist es dasselbe Loch in der Einrichtung:

| Antwort | Was fehlt |
| --- | --- |
| `/rest/v1/…` → 403, `permission denied for table` | die `grant`-Zeilen aus 0002 sind nicht gelaufen |
| `/rest/v1/…` → 401 oder 403 mit `row-level security` | die Regeln aus 0002 sind nicht gelaufen – es gelten noch die alten aus 0001, die eine Anmeldung verlangen |
| `POST /rest/v1/projekte` → 400, `besitzer … violates not-null` | 0002 ist nicht gelaufen: die Spalte steht noch und will eine Benutzerkennung |
| `/storage/v1/…` → 400 oder 403 | die Regel für den Eimer `muster` aus 0002 fehlt |

Angesprochen wird Supabase über seine HTTP-Schnittstelle, ohne zusätzliches
Programmpaket (`src/lib/ferne/supabase.ts`). Gebraucht werden Schreiben,
Lesen und zwei Dateibefehle – das sind hundertfünfzig Zeilen. Ein
Paket dafür wöge mehr als der ganze Rest der App und läge auf einem Gerät,
das die App gerade ohne Verbindung geöffnet hat.

## Keine Anmeldung, kein Passwort

Die App fragt niemanden nach irgendetwas: kein Passwort, kein Magic Link,
kein Konto. Wer die Seite aufruft, arbeitet sofort an den Mustern.

Ohne eingerichtete Sicherung gibt es dafür auch nichts einzurichten: alle
Daten liegen im Browser des Geräts, und was dort liegt, bekommt ohnehin nur,
wer das Gerät hat.

Mit Sicherung bleibt die Oberfläche dieselbe, und es kommt auch im
Hintergrund keine Anmeldung dazu. Geschickt wird nur der **öffentliche
Schlüssel**, sonst nichts. Es gibt einen Bestand, und den sehen alle Geräte –
deshalb steht auf dem Telefon dasselbe wie auf dem Tablet.

Vorher meldete sich jedes Gerät im Hintergrund **anonym** an. Supabase legte
dafür jedes Mal einen neuen Benutzer an, und die Regeln in der Datenbank
liessen jeden nur an seine eigenen Zeilen. Die Sicherung lief also – aber
jedes Gerät sicherte in seine eigene Ecke, und auf dem zweiten Gerät stand
nichts. Wer von dort kommt: der alte Zugang liegt noch unter
`stickmuster-ferne-sitzung` im Browserspeicher und wird nicht mehr angefasst;
die Muster, die unter ihm in der Ferne liegen, holt niemand mehr. Auf dem
Gerät selbst stehen sie weiter und gehen beim nächsten Sichern in den
gemeinsamen Bestand.

Drei Dinge gehören dazugesagt:

- **Wer den öffentlichen Schlüssel hat, kommt an die Muster.** Er steht im
  Programmtext jeder ausgelieferten Seite und lässt sich in jedem Browser
  nachlesen. Das ist der bewusst gewählte Tausch – kein Anmeldebildschirm
  gegen keine Geheimhaltung. Wer beides will, lässt 0002 weg und baut auf den
  Regeln aus 0001 eine richtige Anmeldung; die Datenbank trüge sie ohne
  Änderung mit, es fehlte nur die Oberfläche dafür.
- Der Browserspeicher darf geleert werden: es gibt nichts darin, was für die
  Sicherung gebraucht würde. Das war mit der anonymen Anmeldung anders – da
  war mit dem Zugang auch die Sicherung weg.
- Ein fertiges Muster gehört trotzdem ausgedruckt. Papier überlebt jede
  Datenbank.

## Wie die Oberfläche gebaut ist

Zuerst war jeder Abschnitt eine Karte: weißer Grund, 2px-Rahmen, runde Ecken,
20px Innenabstand – und darin oft noch eine Karte. Bei fünf Karten
untereinander sieht man nur noch Rahmen und keinen Zusammenhang mehr, und auf
einem breiten Bildschirm stand das Muster in einer Karte, die links und rechts
handbreit leer blieb.

Jetzt gilt:

- **Eine Fläche, Haarlinien statt Kästen.** Abschnitte werden durch eine 1px
  Linie getrennt (`src/components/Abschnitt.tsx`), nicht durch einen Rahmen.
- **Ränder nur um Dinge, die man anfassen kann:** Knöpfe, Eingabefelder,
  Listeneinträge. Alles andere kommt ohne aus.
- **Farbe nur, wo etwas passiert.** Grün gefüllt ist genau ein Ding je
  Bildschirm: die Hauptaktion unten rechts. Der offene Reiter trägt nur einen
  Strich, die gewählte Zeile einen getönten Grund.
- **Das Muster liegt wie ein Blatt auf dem Tisch:** feine Kante, weicher
  Schatten, ringsum der Papierton der Seite. So ist die freie Fläche neben
  einem hochkanten Muster sichtbar Arbeitsfläche und nicht ein Kasten, der
  nicht gefüllt wurde.
- **Zwei Seitenarten** (`src/components/Seite.tsx`): Leseseiten haben eine
  Spalte, die schmal genug zum Lesen bleibt; Arbeitsseiten (Muster, Drucken)
  füllen den Bildschirm. Schritt 3 hat drei Spalten: links die Werkzeuge, in
  der Mitte das Muster, rechts 420 Punkte Bedienung.
- **Was man anfassen kann, sagt das auch** (`src/app/globals.css`): Zeigefinger
  auf allem Anklickbaren, „verboten" auf allem Gesperrten, Fadenkreuz über dem
  Raster (und die offene Hand, wo geschoben wird), und jeder Zustand antwortet
  auf den Mauszeiger – auch die schon gewählte Zeile, die sonst als einzige
  tot wirkte.
- **Zugeschnitten wird wie überall** (`src/components/Zuschnitt.tsx`): Rahmen
  schieben, an Ecken und Kanten ziehen, neben dem Rahmen aufsetzen für einen
  ganz neuen. Für jede dieser Bewegungen stand vorher noch eine Reihe Knöpfe
  daneben – zusammen mehr Bedienfeld als Bild. Sichtbar sind jetzt dünne
  weiße Winkel und die Drittellinien, anzufassen bleiben 60 Bildschirmpunkte.
- **Der Glättungsregler hat keine Rastpunkte** (`src/lib/muster/typen.ts`): er
  läuft stufenlos von „jedes Kästchen darf seine eigene Farbe haben" bis zu
  einer Farbe je 10 × 10 Kästchen, und unter ihm steht in Kästchen, was die
  Stellung bedeutet. Während des Ziehens wird immer nur die zuletzt gewünschte
  Stellung gerechnet, nie die Zwischenwerte (`src/lib/zustand/MusterProvider.tsx`).

Was davon unberührt bleibt, sind die Regeln für die Nutzerin: Grundschrift
20px, jede Schaltfläche mindestens 56px hoch, jede mit Text beschriftet, pro
Bildschirm genau eine Hauptaktion. Nur zwei Leisten dürfen flacher sein: die
Fortschrittsleiste oben und die schwebenden Ansichtsknöpfe auf der Leinwand
haben 44 Punkte. Beide stehen auf jeder Arbeitsseite ständig im Bild, und
jeder Punkt Höhe fehlt dem Muster.

## Im Muster bewegen

Schritt 3 ist die Seite, auf der wirklich gearbeitet wird – deshalb gehört
dort so viel Bildschirm wie möglich dem Muster. Weggefallen sind: die
Überschriftenzeile mit den Maßen (sie ändern sich beim Arbeiten nie und
stehen jetzt im Reiter „Muster"), die Knopfleiste über der Leinwand (die
Knöpfe schweben jetzt unten links **auf** der Leinwand) und die Rollbalken.
Zusammen mit der flacheren Fortschritts- und Fußleiste sind das rund 180
Punkte Höhe, die das Muster dazubekommen hat.

Bewegt wird wie auf einer Landkarte (`src/components/Arbeitsflaeche.tsx`):

| Was | Tut |
| --- | --- |
| Mausrad | größer und kleiner, **zum Zeiger hin** |
| Ziehen mit dem Werkzeug „Verschieben" | das Muster schieben |
| Mittlere Maustaste, Leertaste festhalten | schieben, ohne das Werkzeug zu wechseln |
| Zwei Finger | schieben und zugleich zoomen |

Vorher lag das Muster in einem Kasten mit Rollbalken. Auf einem großen Muster
hieß das: mit der einen Hand am Balken ziehen, mit der anderen die Lupe
suchen – und nach jedem Vergrößern war man an einer anderen Stelle als
gedacht, weil ein Rollbalken die Mitte nicht kennt.

Gezeichnet wird dabei **nur der sichtbare Ausschnitt** auf eine Leinwand in
Fenstergröße (`src/lib/muster/leinwand.ts`). Das ist nicht nur schneller,
sondern überhaupt die Voraussetzung für freies Zoomen: ein Muster mit
400 × 400 Stichen bei vierzigfacher Vergrößerung wäre sonst eine Leinwand von
16 000 Punkten Kantenlänge, und die legt kein Browser mehr an. Rasterlinien,
Symbole und die Auswahl laufen aus demselben Grund nur über die Felder, die
gerade im Fenster liegen.

Aus dem Bild schieben lässt sich das Muster nicht: 120 Punkte davon bleiben
immer sichtbar. Sonst zieht man einmal zu weit und sieht nur noch leere
Fläche, ohne zu wissen, in welche Richtung das Muster liegt.

## Wie es gestickt aussähe

Der Knopf „Jak w haftcie" unten am Bild tauscht den Kästchenplan gegen das
fertige Stück: Aidastoff, und darauf echte Kreuze aus Faden
(`sticheZeichnen` in `src/lib/muster/leinwand.ts`).

Ein Plan beantwortet „welche Farbe wohin" – aber nicht die Frage, die vor dem
Anfangen zählt: sieht das gestickt gut aus? Auf dem Stoff ist ein Stich kein
Quadrat, sondern ein Kreuz aus zwei Fäden mit Stoff dazwischen. Deshalb wirkt
eine Stickerei aus der Nähe grober und aus der Ferne weicher als ihr Plan.

Drei Dinge mussten stimmen, bis daraus Kreuze wurden statt Streifen:

- **Der Faden hört vor der Ecke auf.** Der obere Faden eines Kästchens und der
  des schräg benachbarten liegen auf *einer* Geraden. Reichen sie bis in die
  Ecke, verschmelzen sie zu einer Schnur quer über das ganze Bild – und genau
  das kam bei den ersten Anläufen heraus. Die kleine Lücke an der Ecke ist das
  Loch im Stoff, und sie macht aus der Schnur wieder einzelne Stiche.
- **Der untere Faden ist dunkler.** Beide Fäden eines Stiches haben dieselbe
  Garnfarbe. Ohne diesen Unterschied deckte der obere den unteren fast ganz
  zu; sichtbar blieben zwei Stummel, die wie Beulen an der Schnur aussahen.
- **Der Faden ist rund.** Gezeichnet als fünf Striche aufeinander, von außen
  dunkel nach innen hell. Mit dreien sah er aus wie ein flaches Band mit
  aufgemalten Streifen, und das Muster wirkte wie ein Schottenkaro.

### Nah gezeichnet, fern verkleinert

Man soll die Stickerei **von weitem** sehen und nicht erst beim Hineinzoomen.
Bei einem Muster, das ganz auf den Bildschirm passt, fallen auf einen Stich
aber nur zwei oder drei Bildpunkte – zu wenig für zwei Fäden und ein Loch.
Der erste Anlauf zeigte deshalb unterhalb von sechs Punkten je Stich wieder
den Kästchenplan, und genau das war der Fehler: die Ansicht tat nur beim
Hineinzoomen etwas.

Deshalb zwei Wege zum selben Bild:

- **Nah** wird frisch gezeichnet, nur für die sichtbaren Felder – je Farbe ein
  Pfad für die unteren und einer für die oberen Fäden, gestrichen erst danach.
  So ist jeder Faden scharf, egal wie weit hineingezoomt wird.
- **Fern** liegt ein einmal gebautes Stickbild, verkleinert. Das Verkleinern
  besorgt der Browser und mittelt dabei – genau das, was auch das Auge tut,
  wenn es aus zwei Metern hinschaut. Die Struktur bleibt als Körnung erhalten,
  statt zu einer Fläche zu werden.

Umgeschaltet wird genau bei der Feinheit des Stickbildes (acht Punkte je
Stich, bei großen Mustern weniger). So wird es nur verkleinert und nie
vergrößert.

Gebaut wird das Stickbild nicht Stich für Stich, sondern aus **Stempeln**: je
Garnfarbe einmal ein Kästchen zeichnen, den Block danach nur noch kopieren.
Das ist nicht kosmetisch. Bei 400 Stichen Breite sind über zweihunderttausend
Kästchen zu füllen; einzeln gezeichnet blockierte das Umschalten den Browser
**sieben Sekunden**, kopiert sind es **85 ms**. Verloren geht dabei nur, dass
die Fäden benachbarter Stiche einander leicht überlappen – bei acht
Bildpunkten je Stich sieht das niemand, und beim Hineinzoomen wird ohnehin
frisch gezeichnet.

Das Schieben kostet in beiden Ansichten dasselbe: 16,7 ms je Bild, das
schlechteste Bild 24 statt 18 ms.

## Die Werkzeuge und die Bedienspalte

Die Werkzeuge stehen als Schiene an der Leinwand
(`src/components/Werkzeugleiste.tsx`): Sinnbild und kurzes Wort, in drei
Gruppen – Ansehen, Auswählen, Malen. Vorher waren sie eine Liste ganzer Sätze
im Reiter „Werkzeug": sieben Zeilen, die den halben Bedienbereich füllten,
und sobald man auf „Farbe" wechselte, war nicht mehr zu sehen, womit man
eigentlich arbeitet.

Rechts steht ganz oben – **fest über den Reitern** – der volle Name des
gewählten Werkzeugs und ein Satz dazu, was ein Tipp ins Muster bewirkt. Das
ist die Frage, auf die die alte Oberfläche keine Antwort gab: „Was soll ich
hier eigentlich tun?"

Darunter zeigen vier Reiter, was zum Werkzeug gehört:

- **Ändern** richtet sich nach dem Werkzeug. Bei den Auswahlwerkzeugen steht
  dort der Auswahlbereich (siehe unten). Bei Pinsel und Farbeimer steht dort
  die Farbwahl als Kacheln, denn die Farbe gehört zum Malen und nicht in einen
  anderen Reiter.
- **Garne** ist die ausführliche Liste mit Marke, Nummer und Verbrauch.
- **Muster** trägt die Maße, den Glättungsregler und die Meldung über
  zusammengelegte Farben.
- **Gemerkt** hält frühere Stände und eigene Motive.

### Auswählen: zwei Zustände, keine toten Knöpfe

Im Auswahlbereich standen zuerst immer alle sechs Knöpfe, und solange nichts
ausgewählt war, waren alle sechs grau. Gemeint war das als Angebot („seht
her, das ginge"), angekommen ist es als Rätsel: sechs tote Knöpfe, und keiner
sagt, warum er nicht geht oder welchen man zuerst braucht.

`src/components/Auswahlbereich.tsx` zeigt deshalb genau einen von zwei
Zuständen:

- **Noch nichts ausgewählt:** kein einziger Knopf. Stattdessen der Griff, der
  jetzt dran ist – der Satz zum gewählten Werkzeug, also „Tippen Sie mitten
  in die Blume" oder „Ziehen Sie einen Rahmen auf" –, und darunter in Worten,
  wozu das gut sein wird. Nichts zu drücken heißt: der nächste Schritt liegt
  im Muster und nicht in dieser Spalte.
- **Etwas ausgewählt:** die Zahl der Stiche als Überschrift, dann die Knöpfe,
  alle benutzbar. Zuoberst und größer als der Rest „Nur das sticken" – das
  ist der Grund, aus dem man überhaupt auswählt –, darunter „Das hier
  weglassen", beide mit einem Satz, was danach anders ist. Erst dann Färben,
  Kopieren und Merken, und ganz unten leise der Weg zurück.

Die Rangfolge läuft über Größe und Reihenfolge, nicht über Farbe: grün
gefüllt bleibt genau ein Ding je Bildschirm, und das ist „Weiter zum Drucken"
unten rechts.

## Aufbau des Projekts

```
src/app/page.tsx        Die Startseite: die zuletzt bearbeiteten Projekte
src/app/schritt/…       Die vier Schritte des geführten Weges
src/app/garne           Der eigene Garnvorrat
src/components          Schaltflächen, Fortschrittsleiste, Fenster, Vergleich
src/lib/farbe           Lab, CIEDE2000 und die Farbbeschreibungen
src/lib/garne           Der Garnkatalog, fest im Programm
src/lib/speicher        IndexedDB: Projekte, Arbeitsstand, Stände, Motive, Garne
src/lib/ferne           Die freiwillige Sicherung bei Supabase
src/lib/sprache         Alle sichtbaren Texte, auf Polnisch
public/sw.js            Service Worker – dafür läuft die App ohne Internet
supabase/migrations     Tabellen und Regeln für die Sicherung
data                    Garnlisten und ihre Quelldaten
scripts                 Garnfarben ableiten, Katalog und Symbole erzeugen
```

## Der Ausdruck

„Muster drucken“ erzeugt das PDF vollständig im Browser (`pdf-lib`):

1. Vorschau der fertigen Stickerei, dazu ein Blattplan, wenn es mehrere
   Blätter werden
2. Garnliste mit Symbol, Garnnummer, Farbname, Stichzahl und geschätztem
   Garnverbrauch in Metern
3. Das Muster in Farbe mit Symbolen, Blatt für Blatt

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

Beide Formate tragen eine Fassungsnummer und lesen auch die vorige: dort
hielt ein Feld ein Byte und die 255 stand für „wird nicht gestickt". Wer ein
Muster gespeichert hat, findet es nach dem Aktualisieren unverändert wieder
(`src/lib/speicher/rle.ts`, `src/lib/speicher/motive.ts`).

In der Datenbank des Browsers liegen sechs Läden:

| Laden | Inhalt |
| --- | --- |
| `arbeit` | der aktuelle Stand, laufend mitgeschrieben – gegen Abstürze |
| `projekte` | ein Eintrag je hochgeladenem Bild: Foto, Name, Zeitpunkt |
| `staende` | die gespeicherten Zwischenstände je Muster |
| `motive` | gemerkte Ausschnitte, über Muster hinweg |
| `garnvorrat` | welche Garne zu Hause liegen |
| `abgleich` | was noch in die Sicherung muss (nur Art und Kennung) |

Aufgeräumt wird nur bei den Zwischenständen: die letzten 20 automatischen
bleiben, gemerkte nie löschen, und ein Stand, an dem ein anderer als
Elternteil hängt, bleibt ebenfalls stehen – sonst risse der Baum auseinander.
