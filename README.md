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

## Keine Anmeldung, kein Dienst

Die App fragt niemanden nach irgendetwas: kein Passwort, kein Magic Link,
kein Konto. Wer die Seite aufruft, arbeitet sofort an den Mustern.

Sie braucht das auch nicht mehr: es gibt nichts in der Ferne, worauf sich
ein Zugang beziehen könnte. Alle Daten liegen im Browser des Geräts, und
was dort liegt, kommt ohnehin nur an, wer das Gerät hat.

Der Preis gehört benannt: **die Muster liegen auf genau einem Gerät.**
Wer den Browserspeicher leert oder das Gerät wechselt, fängt neu an.
Ein fertiges Muster gehört deshalb ausgedruckt – dafür ist Schritt 4 da.

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

- **Ändern** richtet sich nach dem Werkzeug. Bei den Auswahlwerkzeugen stehen
  dort die Knöpfe für das Ausgewählte – **immer sichtbar**, ohne Auswahl grau.
  Vorher tauchten sie erst nach dem ersten Tipp auf; wer nicht wusste, dass es
  sie gibt, erfuhr nie, wozu das Auswählen überhaupt gut ist. Bei Pinsel und
  Farbeimer steht dort die Farbwahl als Kacheln, denn die Farbe gehört zum
  Malen und nicht in einen anderen Reiter.
- **Garne** ist die ausführliche Liste mit Marke, Nummer und Verbrauch.
- **Muster** trägt die Maße, den Glättungsregler und die Meldung über
  zusammengelegte Farben.
- **Gemerkt** hält frühere Stände und eigene Motive.

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

Beide Formate tragen eine Fassungsnummer und lesen auch die vorige: dort
hielt ein Feld ein Byte und die 255 stand für „wird nicht gestickt". Wer ein
Muster gespeichert hat, findet es nach dem Aktualisieren unverändert wieder
(`src/lib/speicher/rle.ts`, `src/lib/speicher/motive.ts`).

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
