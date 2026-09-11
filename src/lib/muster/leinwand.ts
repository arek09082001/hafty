/**
 * Das Stichraster zeichnen.
 * ---------------------------------------------------------------------------
 *
 * Der Kern liegt hier und nicht in einer Komponente, weil es zwei Stellen
 * gibt, die dasselbe Bild brauchen: die Arbeitsfläche in Schritt 3, die einen
 * Ausschnitt in beliebiger Vergrößerung zeigt, und die Vorschau vor dem
 * Drucken, die das ganze Muster in einer festen Größe zeigt.
 *
 * Gezeichnet wird in zwei Lagen. Zuerst entsteht ein Bild mit genau einem
 * Bildpunkt je Stich (`kleinbildZeichnen`); dieses Bild wird beim Anzeigen
 * ohne Weichzeichnen vergrößert, damit die Kästchen scharf bleiben. Erst
 * darüber kommen Rasterlinien, Symbole und die Auswahl – und die nur für den
 * Teil des Musters, der gerade zu sehen ist. Sonst würde jedes Verschieben
 * bei einem großen Muster über hunderttausend Felder laufen.
 */

import { hexNachRgb, istDunkel } from "@/lib/farbe/lab";
import { FARBINDIZES, LEER, STOFFFARBE, type PalettenEintrag } from "@/lib/muster/typen";

/** Ein Stück, das gerade verschoben und noch nicht festgeschrieben ist. */
export type Einfuegevorschau = {
  x: number;
  y: number;
  w: number;
  h: number;
  daten: Uint16Array;
  maske: Uint8Array;
};

/**
 * Nachgeschlagen wird über den Index des Eintrags und nicht über seine Stelle
 * in der Liste: die Garnliste wird an anderer Stelle gefiltert (Farben ohne
 * Stiche fallen heraus), und dann stimmen beide nicht mehr überein. Ein Feld
 * mit einer falschen Farbe wäre der schlimmste denkbare Fehler in dieser App.
 */
export type Farbtabelle = {
  farben: Array<[number, number, number] | undefined>;
  eintraege: Array<PalettenEintrag | undefined>;
  stoff: [number, number, number];
};

export function farbtabelle(palette: PalettenEintrag[]): Farbtabelle {
  const farben = new Array<[number, number, number] | undefined>(FARBINDIZES);
  const eintraege = new Array<PalettenEintrag | undefined>(FARBINDIZES);
  for (const eintrag of palette) {
    farben[eintrag.index] = hexNachRgb(eintrag.hex);
    eintraege[eintrag.index] = eintrag;
  }
  // Was nicht gestickt wird, bekommt die Farbe des Stoffes.
  const stoff = hexNachRgb(STOFFFARBE);
  farben[LEER] = stoff;
  return { farben, eintraege, stoff };
}

/** Das Bild mit einem Bildpunkt je Stich – die Grundlage aller Anzeigen. */
export function kleinbildZeichnen(
  klein: HTMLCanvasElement,
  breite: number,
  hoehe: number,
  raster: Uint16Array,
  tabelle: Farbtabelle,
  vorschau?: Einfuegevorschau | null,
): void {
  if (klein.width !== breite || klein.height !== hoehe) {
    klein.width = breite;
    klein.height = hoehe;
  }
  const stift = klein.getContext("2d");
  if (!stift) return;

  const { farben, stoff } = tabelle;
  const bild = stift.createImageData(breite, hoehe);

  for (let i = 0; i < raster.length; i++) {
    const farbe = farben[raster[i]] ?? stoff;
    bild.data[i * 4] = farbe[0];
    bild.data[i * 4 + 1] = farbe[1];
    bild.data[i * 4 + 2] = farbe[2];
    bild.data[i * 4 + 3] = 255;
  }

  // Die verschiebbare Vorschau beim Einfügen liegt obenauf.
  if (vorschau) {
    for (let y = 0; y < vorschau.h; y++) {
      const zy = vorschau.y + y;
      if (zy < 0 || zy >= hoehe) continue;
      for (let x = 0; x < vorschau.w; x++) {
        const zx = vorschau.x + x;
        if (zx < 0 || zx >= breite) continue;
        const q = y * vorschau.w + x;
        if (!vorschau.maske[q]) continue;
        const farbe = farben[vorschau.daten[q]] ?? stoff;
        const z = (zy * breite + zx) * 4;
        bild.data[z] = farbe[0];
        bild.data[z + 1] = farbe[1];
        bild.data[z + 2] = farbe[2];
        bild.data[z + 3] = 255;
      }
    }
  }

  stift.putImageData(bild, 0, 0);
}

export type Zeichenauftrag = {
  breite: number;
  hoehe: number;
  raster: Uint16Array;
  tabelle: Farbtabelle;
  /** Bildpunkte je Stich. */
  zoom: number;
  /** Wo die linke obere Ecke des Musters auf der Leinwand liegt. */
  versatzX: number;
  versatzY: number;
  /** Größe der Leinwand in Bildschirmpunkten. */
  sichtBreite: number;
  sichtHoehe: number;
  mitLinien?: boolean;
  mitSymbolen?: boolean;
  /**
   * Das Muster als Stickerei zeigen statt als Kästchenplan: echte Kreuze aus
   * Faden auf Aidastoff. Schaltet Rasterlinien und Symbole aus – die gehören
   * zum Plan, nicht zum fertigen Stück.
   */
  mitStichen?: boolean;
  /**
   * Das einmal gebaute Bild der ganzen Stickerei (siehe `stichbildZeichnen`).
   * Wird gebraucht, sobald so weit herausgezoomt ist, dass sich einzelne
   * Fäden nicht mehr zeichnen lassen.
   */
  stichbild?: HTMLCanvasElement | null;
  auswahl?: Uint8Array | null;
  vorschau?: Einfuegevorschau | null;
  /** Kante und Schatten ringsum – das Muster als Blatt auf dem Tisch. */
  mitBlatt?: boolean;
  /**
   * Bildpunkte je Bildschirmpunkt. Ohne Angabe die Feinheit des Bildschirms.
   * Die Vorschau vor dem Drucken legt ihre Leinwand so groß an wie das ganze
   * Muster und setzt deshalb 1 – doppelt so viele Punkte kosteten dort nur
   * Speicher und brächten nichts.
   */
  dichte?: number;
};

// ---------------------------------------------------------------------------
// Die Stickansicht
// ---------------------------------------------------------------------------

/**
 * Wie das fertige Stück aussähe.
 * ---------------------------------------------------------------------------
 *
 * Ein Kästchenplan beantwortet die Frage „welche Farbe wohin" – aber nicht
 * die, die vor dem Anfangen zählt: sieht das gestickt gut aus? Auf dem Stoff
 * ist ein Stich kein Quadrat, sondern ein Kreuz aus zwei Fäden, zwischen
 * denen an den Ecken Stoff stehenbleibt. Deshalb wirkt eine Stickerei aus der
 * Nähe grober und aus der Ferne weicher als ihr Plan.
 *
 * Nachgebaut wird, was man wirklich sieht:
 *
 *  - Der **Stoff** liegt darunter, nicht Weiß: Aida ist gewebt, und zwischen
 *    den Blöcken laufen Rillen. Die sind hier die feinen dunklen Linien.
 *  - Der **untere Faden** geht von links unten nach rechts oben, der
 *    **obere** von links oben nach rechts unten – bei allen Stichen gleich
 *    herum. Genau das macht den ruhigen Glanz einer sauberen Stickerei; wer
 *    die Richtung wechselt, sieht es dem Stück sofort an.
 *  - Der obere Faden wirft einen **Schatten** auf den unteren, und der untere
 *    ist ohnehin gedämpft: er liegt im Schatten.
 *  - Jeder Faden ist ein **runder Zylinder** – am Rand dunkel, in der Mitte
 *    hell.
 *  - An jeder Ecke des Kästchens sitzt ein **Loch**. Dort verschwindet der
 *    Faden im Gewebe.
 *
 * Die letzten drei Punkte sind nicht Zierrat, sondern das, woran man
 * überhaupt Kreuze erkennt – siehe die Begründungen bei den Konstanten.
 */



/** Fadendicke im Verhältnis zum Kästchen. */
const FADENDICKE = 0.5;

/**
 * Wie weit der Faden vor der Ecke aufhört.
 *
 * Das ist die Konstante, an der die ganze Ansicht hing.
 *
 * Der obere Faden eines Kästchens und der des schräg benachbarten liegen auf
 * **einer** Geraden. Reichen sie bis in die Ecke – oder ragt gar ihre runde
 * Kappe darüber hinaus –, verschmelzen sie zu einer Schnur, die quer über das
 * ganze Bild läuft. Genau das kam bei den ersten Anläufen heraus: schräge
 * Streifen wie auf gestreiftem Stoff, und von einzelnen Kreuzen war nichts zu
 * sehen. Kein Schatten und kein Glanz half dagegen, denn getrennt waren die
 * Fäden ja nicht.
 *
 * Bei 0,23 hört der Faden mitsamt seiner Kappe kurz vor der Ecke auf. Die
 * kleine Lücke dort ist das Loch im Stoff, und sie macht aus der Schnur
 * wieder einzelne Stiche.
 */
const EINZUG = 0.23;

/** Der Radius des Stofflochs, im Verhältnis zum Kästchen. */
const LOCH = 0.11;

/**
 * Der Querschnitt des Fadens: je Eintrag eine Breite (im Verhältnis zur
 * Fadendicke) und wie viel heller oder dunkler dort gezeichnet wird –
 * negativ zu Schwarz, positiv zu Weiß, von außen nach innen.
 *
 * Stickgarn ist rund: am Rand dunkel, in der Mitte hell, und dieser helle
 * Streifen läuft der Länge nach. Zwei Fäden über Kreuz haben deshalb zwei
 * Glanzstreifen in verschiedene Richtungen – daran sieht das Auge, dass es
 * zwei sind, obwohl beide dieselbe Garnfarbe haben.
 *
 * Mit drei Stufen – Rand, Farbe, Glanz – sah der Faden aus wie ein flaches
 * Band mit aufgemalten Streifen, und das Muster wirkte wie ein Schottenkaro.
 * Fünf reichen für eine Rundung.
 */
const QUERSCHNITT: ReadonlyArray<readonly [number, number]> = [
  [1, -0.45],
  [0.86, -0.26],
  [0.7, -0.1],
  [0.5, 0.06],
  [0.3, 0.24],
];

/**
 * Wie viel dunkler der untere Faden ist.
 *
 * Er liegt im Schatten des oberen. Ohne diesen Unterschied deckte der obere
 * Faden den unteren fast ganz zu – sichtbar blieben nur zwei Stummel in
 * derselben Farbe, die wie Beulen an der Schnur aussahen.
 */
const UNTENDUNKEL = 0.72;

/** Eine Farbe zu Schwarz (`ziel` 0) oder Weiß (`ziel` 255) hin mischen. */
function mischen(farbe: [number, number, number], ziel: number, anteil: number): string {
  const misch = (v: number) => Math.round(v + (ziel - v) * anteil);
  return `rgb(${misch(farbe[0])},${misch(farbe[1])},${misch(farbe[2])})`;
}

/** Alles, was das Zeichnen der Stiche braucht – ohne den Rest des Auftrags. */
type Stichfeld = {
  breite: number;
  hoehe: number;
  raster: Uint16Array;
  tabelle: Farbtabelle;
  /** Bildpunkte je Stich. */
  zoom: number;
  vorschau?: Einfuegevorschau | null;
};

/** Was in einem Feld liegt – die verschiebbare Vorschau geht vor. */
function feldLesen(f: Stichfeld, x: number, y: number): number {
  const v = f.vorschau;
  if (v) {
    const vx = x - v.x;
    const vy = y - v.y;
    if (vx >= 0 && vy >= 0 && vx < v.w && vy < v.h) {
      const q = vy * v.w + vx;
      if (v.maske[q]) return v.daten[q];
    }
  }
  return f.raster[y * f.breite + x];
}

/** Der Stoff unter den Stichen, mit den Rillen des Gewebes. */
function stoffZeichnen(
  stift: CanvasRenderingContext2D,
  f: Stichfeld,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const { zoom } = f;
  const [r, g, b] = f.tabelle.stoff;
  stift.fillStyle = `rgb(${r},${g},${b})`;
  stift.fillRect(x0 * zoom, y0 * zoom, (x1 - x0) * zoom, (y1 - y0) * zoom);

  // Die Rillen zwischen den gewebten Blöcken. Unter drei Punkten je Stich
  // lägen sie dichter als das Raster und würden zu einem Grauschleier.
  if (zoom < 3) return;
  stift.strokeStyle = "rgba(0,0,0,0.10)";
  stift.lineWidth = Math.max(1, zoom * 0.07);
  stift.beginPath();
  for (let x = Math.max(0, x0); x <= x1 && x <= f.breite; x++) {
    const px = x * zoom;
    stift.moveTo(px, y0 * zoom);
    stift.lineTo(px, y1 * zoom);
  }
  for (let y = Math.max(0, y0); y <= y1 && y <= f.hoehe; y++) {
    const py = y * zoom;
    stift.moveTo(x0 * zoom, py);
    stift.lineTo(x1 * zoom, py);
  }
  stift.stroke();
}

/**
 * Die Kreuze legen.
 *
 * Gesammelt wird erst, gezeichnet danach: je Farbe ein Pfad für den unteren
 * und einen für den oberen Faden. Bei einem großen Muster liegen im Fenster
 * schnell zwanzigtausend Stiche – einzeln gezeichnet wäre das je Bild eine
 * halbe Sekunde, gebündelt sind es ein paar Striche je Farbe.
 *
 * Und die Reihenfolge stimmt dabei von selbst: erst alle unteren Fäden, dann
 * alle oberen. Sonst deckte der untere Faden des nächsten Kästchens den
 * oberen des vorigen zu.
 */
function sticheZeichnen(
  stift: CanvasRenderingContext2D,
  f: Stichfeld,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const { zoom, tabelle } = f;
  const unten = new Map<number, Path2D>();
  const oben = new Map<number, Path2D>();
  const nah = EINZUG * zoom;
  const fern = (1 - EINZUG) * zoom;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const index = feldLesen(f, x, y);
      // Ein freies Feld bleibt Stoff. `farben[LEER]` trägt zwar die
      // Stofffarbe, aber einen Eintrag hat nur, was wirklich gestickt wird.
      if (index === LEER || !tabelle.eintraege[index]) continue;

      let u = unten.get(index);
      if (!u) {
        u = new Path2D();
        unten.set(index, u);
        oben.set(index, new Path2D());
      }
      const ob = oben.get(index) as Path2D;

      const px = x * zoom;
      const py = y * zoom;
      // Unten: von links unten nach rechts oben.
      u.moveTo(px + nah, py + fern);
      u.lineTo(px + fern, py + nah);
      // Oben: von links oben nach rechts unten.
      ob.moveTo(px + nah, py + nah);
      ob.lineTo(px + fern, py + fern);
    }
  }
  if (unten.size === 0) return;

  const dicke = Math.max(1, zoom * FADENDICKE);
  const versatz = Math.max(0.5, zoom * 0.045);
  stift.lineCap = "round";
  stift.lineJoin = "round";

  /**
   * Eine Lage Fäden legen: von außen dunkel nach innen hell.
   *
   * Der obere Faden bekommt vorweg noch einen Schatten – er liegt ja auf dem
   * unteren und nicht neben ihm.
   */
  const lageZeichnen = (pfade: Map<number, Path2D>, obenauf: boolean) => {
    if (obenauf) {
      stift.save();
      stift.translate(versatz, versatz);
      stift.lineWidth = dicke;
      stift.strokeStyle = "rgba(0,0,0,0.20)";
      for (const pfad of pfade.values()) stift.stroke(pfad);
      stift.restore();
    }

    /** Die Garnfarbe dieser Lage, heller oder dunkler gemischt. */
    const ton = (index: number, ziel: number, anteil: number) => {
      const farbe = tabelle.farben[index] ?? tabelle.stoff;
      // Der untere Faden liegt im Schatten des oberen.
      const gedaempft: [number, number, number] = obenauf
        ? farbe
        : [farbe[0] * UNTENDUNKEL, farbe[1] * UNTENDUNKEL, farbe[2] * UNTENDUNKEL];
      return mischen(gedaempft, ziel, anteil);
    };

    /**
     * Wie viele Stufen der Rundung gezeichnet werden, hängt davon ab, wie
     * dick der Faden auf dem Bildschirm ist.
     *
     * Zwei Stufen, die sich um weniger als einen Bildpunkt unterscheiden,
     * ergeben dasselbe Bild – die zweite kostet nur Zeit. Und Zeit ist hier
     * kein Nebenschauplatz: bei 400 Stichen Breite sind es über
     * zweihunderttausend Kästchen, und jede zusätzliche Stufe schlägt mit
     * einer halben Million Strichen zu Buche. Ungebremst blockierte das
     * Umschalten den Browser sieben Sekunden lang.
     */
    let vorige = Infinity;
    for (const [breite, helligkeit] of QUERSCHNITT) {
      const strich = dicke * breite;
      if (vorige - strich < 1 && breite < 1) continue;
      vorige = strich;
      stift.lineWidth = Math.max(1, strich);
      for (const index of pfade.keys()) {
        stift.strokeStyle =
          helligkeit < 0 ? ton(index, 0, -helligkeit) : ton(index, 255, helligkeit);
        stift.stroke(pfade.get(index) as Path2D);
      }
    }
  };

  lageZeichnen(unten, false);
  lageZeichnen(oben, true);

  /**
   * Zuletzt die Löcher.
   *
   * Sie sind das, was einen Stich vom nächsten trennt. Die oberen Fäden zweier
   * schräg benachbarter Kästchen liegen nämlich auf **einer** Geraden; ohne
   * die Lücke an der Ecke wurden daraus durchlaufende Schnüre quer über das
   * ganze Bild. Der dunkle Punkt füllt diese Lücke, damit sie nicht als Stoff
   * gelesen wird.
   *
   * Ein Pfad für alle, einmal gefüllt – bei zwanzigtausend sichtbaren
   * Kästchen wären zwanzigtausend einzelne Füllbefehle zu langsam.
   */
  if (zoom < 5) return;
  const loecher = new Path2D();
  const r = Math.max(0.6, zoom * LOCH);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      loecher.moveTo(x * zoom + r, y * zoom);
      loecher.arc(x * zoom, y * zoom, r, 0, Math.PI * 2);
    }
  }
  stift.fillStyle = "rgba(40,30,20,0.42)";
  stift.fill(loecher);
}

/**
 * Wie fein das gespeicherte Stickbild ist.
 *
 * Es wird einmal gezeichnet und danach nur noch verkleinert angezeigt. Je
 * Stich braucht es also so viele Bildpunkte, dass beim Verkleinern noch
 * Struktur übrig bleibt – aber nicht so viele, dass ein großes Muster den
 * Speicher sprengt. Bei 250 000 Feldern und acht Punkten je Stich wären das
 * 16 Millionen Bildpunkte; deshalb je größer das Muster, desto gröber.
 */
function stichfeinheit(felder: number): number {
  if (felder <= 60_000) return 8;
  if (felder <= 150_000) return 6;
  return 4;
}

/**
 * Das ganze Muster einmal als Stickerei zeichnen.
 * ---------------------------------------------------------------------------
 *
 * Der Grund für dieses zweite Bild: die Stickansicht soll man **von weitem**
 * sehen, nicht erst beim Hineinzoomen. Bei einem Muster, das ganz auf den
 * Bildschirm passt, fallen auf einen Stich aber oft nur zwei oder drei
 * Bildpunkte – zu wenig, um zwei Fäden und ein Loch hineinzuzeichnen. Der
 * erste Anlauf zeigte deshalb unterhalb von sechs Punkten je Stich wieder den
 * Kästchenplan, und genau das war der Fehler: die Ansicht tat nur beim
 * Hineinzoomen etwas.
 *
 * Jetzt wird das Muster einmal mit acht Punkten je Stich gezeichnet und
 * danach **verkleinert** angezeigt. Das Verkleinern besorgt der Browser, und
 * es mittelt dabei – genau das, was auch das Auge tut, wenn es aus zwei
 * Metern auf eine Stickerei schaut. Die Struktur bleibt als Körnung erhalten,
 * statt zu einer Fläche zu werden.
 *
 * Gebaut wird es nur, wenn die Stickansicht an ist, und nur neu, wenn sich am
 * Muster etwas geändert hat.
 */
/**
 * Ein einzelner Stich als kleines Bild – für jede Garnfarbe einer.
 *
 * Gezeichnet wird dafür ein Muster aus genau einem Kästchen; herauskommt ein
 * Block von `zoom` mal `zoom` Bildpunkten, den das Stickbild danach nur noch
 * an die richtigen Stellen kopiert.
 */
function stempelBauen(tabelle: Farbtabelle, zoom: number): Map<number, ImageData> {
  const stempel = new Map<number, ImageData>();
  const hilfe = document.createElement("canvas");
  hilfe.width = zoom;
  hilfe.height = zoom;
  const stift = hilfe.getContext("2d", { willReadFrequently: true });
  if (!stift) return stempel;

  const einer = new Uint16Array(1);
  for (let index = 0; index < FARBINDIZES; index++) {
    // Nur, was wirklich gestickt wird – und einmal der leere Stoff.
    if (index !== LEER && !tabelle.eintraege[index]) continue;
    einer[0] = index;
    const feld: Stichfeld = { breite: 1, hoehe: 1, raster: einer, tabelle, zoom };
    stift.setTransform(1, 0, 0, 1, 0, 0);
    stift.clearRect(0, 0, zoom, zoom);
    stoffZeichnen(stift, feld, 0, 0, 1, 1);
    sticheZeichnen(stift, feld, 0, 0, 1, 1);
    stempel.set(index, stift.getImageData(0, 0, zoom, zoom));
  }
  return stempel;
}

/**
 * Das ganze Muster einmal als Stickerei zeichnen.
 * ---------------------------------------------------------------------------
 *
 * Der Grund für dieses zweite Bild: die Stickansicht soll man **von weitem**
 * sehen, nicht erst beim Hineinzoomen. Bei einem Muster, das ganz auf den
 * Bildschirm passt, fallen auf einen Stich aber oft nur zwei oder drei
 * Bildpunkte – zu wenig, um zwei Fäden und ein Loch hineinzuzeichnen. Der
 * erste Anlauf zeigte deshalb unterhalb von sechs Punkten je Stich wieder den
 * Kästchenplan, und genau das war der Fehler: die Ansicht tat nur beim
 * Hineinzoomen etwas.
 *
 * Jetzt wird das Muster einmal mit wenigen Punkten je Stich gezeichnet und
 * danach **verkleinert** angezeigt. Das Verkleinern besorgt der Browser, und
 * es mittelt dabei – genau das, was auch das Auge tut, wenn es aus zwei
 * Metern auf eine Stickerei schaut. Die Struktur bleibt als Körnung erhalten,
 * statt zu einer Fläche zu werden.
 *
 * Gebaut wird nicht Stich für Stich, sondern aus **Stempeln**: je Garnfarbe
 * einmal ein Kästchen zeichnen und den Block danach nur noch kopieren. Der
 * Unterschied ist nicht kosmetisch. Bei 400 Stichen Breite sind über
 * zweihunderttausend Kästchen zu füllen; einzeln gezeichnet blockierte das
 * den Browser mehrere Sekunden lang, kopiert sind es ein paar Dutzend
 * Millisekunden. Verloren geht dabei nur, dass die Fäden benachbarter Stiche
 * einander leicht überlappen – bei acht Bildpunkten je Stich sieht das
 * niemand, und beim Hineinzoomen wird ohnehin frisch gezeichnet.
 */
export function stichbildZeichnen(
  ziel: HTMLCanvasElement,
  breite: number,
  hoehe: number,
  raster: Uint16Array,
  tabelle: Farbtabelle,
  vorschau?: Einfuegevorschau | null,
): void {
  const zoom = stichfeinheit(breite * hoehe);
  const punkteBreit = Math.max(1, breite * zoom);
  const punkteHoch = Math.max(1, hoehe * zoom);
  if (ziel.width !== punkteBreit || ziel.height !== punkteHoch) {
    ziel.width = punkteBreit;
    ziel.height = punkteHoch;
  }
  const stift = ziel.getContext("2d");
  if (!stift) return;

  const stempel = stempelBauen(tabelle, zoom);
  const leer = stempel.get(LEER);
  if (!leer) return;

  const feld: Stichfeld = { breite, hoehe, raster, tabelle, zoom, vorschau };
  const bild = stift.createImageData(punkteBreit, punkteHoch);
  const ziel8 = bild.data;
  const zeile = punkteBreit * 4;
  const block = zoom * 4;

  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const quelle = (stempel.get(feldLesen(feld, x, y)) ?? leer).data;
      const links = x * block;
      for (let z = 0; z < zoom; z++) {
        ziel8.set(quelle.subarray(z * block, (z + 1) * block), (y * zoom + z) * zeile + links);
      }
    }
  }

  stift.setTransform(1, 0, 0, 1, 0, 0);
  stift.putImageData(bild, 0, 0);
}

/**
 * Das Muster auf die sichtbare Leinwand zeichnen.
 *
 * `klein` ist das Bild aus `kleinbildZeichnen`. Es wird als Ganzes vergrößert
 * hineingezeichnet; was über den Rand hinausragt, schneidet der Browser
 * selbst ab. Alles, was danach kommt, läuft nur über die Felder, die im
 * Sichtfenster liegen.
 */
export function musterZeichnen(
  canvas: HTMLCanvasElement,
  klein: HTMLCanvasElement,
  o: Zeichenauftrag,
): void {
  const stift = canvas.getContext("2d");
  if (!stift) return;

  // Auf einem feinen Bildschirm wird die Leinwand doppelt so fein angelegt,
  // sonst wären Rasterlinien und Symbole ausgefranst.
  const dichte =
    o.dichte ?? Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  const punkteBreit = Math.max(1, Math.round(o.sichtBreite * dichte));
  const punkteHoch = Math.max(1, Math.round(o.sichtHoehe * dichte));
  if (canvas.width !== punkteBreit || canvas.height !== punkteHoch) {
    canvas.width = punkteBreit;
    canvas.height = punkteHoch;
  }

  stift.setTransform(dichte, 0, 0, dichte, 0, 0);
  stift.clearRect(0, 0, o.sichtBreite, o.sichtHoehe);

  const { zoom, breite, hoehe } = o;
  const musterBreite = breite * zoom;
  const musterHoehe = hoehe * zoom;

  stift.save();
  stift.translate(o.versatzX, o.versatzY);

  // --- Das Blatt ----------------------------------------------------------
  if (o.mitBlatt) {
    stift.save();
    stift.shadowColor = "rgba(0,0,0,0.18)";
    stift.shadowBlur = 14;
    stift.shadowOffsetY = 3;
    stift.fillStyle = "#ffffff";
    stift.fillRect(0, 0, musterBreite, musterHoehe);
    stift.restore();
  }

  // --- Nur der sichtbare Ausschnitt ---------------------------------------
  const x0 = Math.max(0, Math.floor(-o.versatzX / zoom));
  const y0 = Math.max(0, Math.floor(-o.versatzY / zoom));
  const x1 = Math.min(breite, Math.ceil((o.sichtBreite - o.versatzX) / zoom));
  const y1 = Math.min(hoehe, Math.ceil((o.sichtHoehe - o.versatzY) / zoom));

  /**
   * In der Stickansicht liegt kein Kästchenbild darunter, sondern Stoff.
   *
   * Zwei Wege führen dorthin, und beide zeigen dieselbe Stickerei:
   *
   *  - **Nah** wird sie frisch gezeichnet, nur für die sichtbaren Felder. So
   *    sind die Fäden gestochen scharf, egal wie weit hineingezoomt wird.
   *  - **Fern** wird das einmal gebaute Stickbild verkleinert hingelegt. Dort
   *    fielen auf einen Stich zu wenige Bildpunkte, um zwei Fäden und ein
   *    Loch hineinzuzeichnen; das Verkleinern mittelt sie stattdessen – genau
   *    das, was auch das Auge tut, wenn es aus zwei Metern hinschaut.
   *
   * Fehlt das Stickbild (der erste Durchlauf, bevor es gebaut ist), bleibt es
   * beim Kästchenplan – lieber der als ein leeres Feld.
   */
  const stickerei = o.mitStichen ?? false;
  // Umgeschaltet wird genau bei der Feinheit des Stickbildes. So wird es nur
  // je verkleinert und nie vergrößert – vergrößert wäre es unscharf, und
  // gerade beim Hineinsehen soll jeder Faden zu erkennen sein.
  const nahGezeichnet = stickerei && zoom >= stichfeinheit(breite * hoehe);
  const fernGelegt = stickerei && !nahGezeichnet && !!o.stichbild;

  stift.imageSmoothingEnabled = fernGelegt;
  if (nahGezeichnet) {
    const feld = {
      breite,
      hoehe,
      raster: o.raster,
      tabelle: o.tabelle,
      zoom,
      vorschau: o.vorschau,
    };
    stoffZeichnen(stift, feld, x0, y0, x1, y1);
    sticheZeichnen(stift, feld, x0, y0, x1, y1);
  } else if (fernGelegt) {
    stift.drawImage(o.stichbild as HTMLCanvasElement, 0, 0, musterBreite, musterHoehe);
  } else {
    stift.drawImage(klein, 0, 0, musterBreite, musterHoehe);
  }
  stift.imageSmoothingEnabled = false;
  const alsStickerei = nahGezeichnet || fernGelegt;

  // --- Rasterlinien -------------------------------------------------------
  // Erst ab 5 Bildpunkten je Stich; darunter würde das Raster das Bild
  // zudecken. Jede zehnte Linie ist dicker – so kann die Nutzerin auf dem
  // Bildschirm genauso zählen wie später auf dem Papier.
  if ((o.mitLinien ?? true) && !alsStickerei && zoom >= 5) {
    stift.lineWidth = 1;
    stift.strokeStyle = "rgba(0,0,0,0.16)";
    stift.beginPath();
    for (let x = Math.max(1, x0); x <= x1 && x < breite; x++) {
      if (x % 10 === 0) continue;
      const px = Math.round(x * zoom) + 0.5;
      stift.moveTo(px, y0 * zoom);
      stift.lineTo(px, y1 * zoom);
    }
    for (let y = Math.max(1, y0); y <= y1 && y < hoehe; y++) {
      if (y % 10 === 0) continue;
      const py = Math.round(y * zoom) + 0.5;
      stift.moveTo(x0 * zoom, py);
      stift.lineTo(x1 * zoom, py);
    }
    stift.stroke();

    stift.lineWidth = 2;
    stift.strokeStyle = "rgba(0,0,0,0.6)";
    stift.beginPath();
    for (let x = Math.ceil(x0 / 10) * 10; x <= x1 && x < breite; x += 10) {
      if (x === 0) continue;
      const px = Math.round(x * zoom);
      stift.moveTo(px, y0 * zoom);
      stift.lineTo(px, y1 * zoom);
    }
    for (let y = Math.ceil(y0 / 10) * 10; y <= y1 && y < hoehe; y += 10) {
      if (y === 0) continue;
      const py = Math.round(y * zoom);
      stift.moveTo(x0 * zoom, py);
      stift.lineTo(x1 * zoom, py);
    }
    stift.stroke();
  }

  // --- Symbole ------------------------------------------------------------
  if (o.mitSymbolen && !alsStickerei && zoom >= 14) {
    stift.textAlign = "center";
    stift.textBaseline = "middle";
    stift.font = `bold ${Math.floor(zoom * 0.62)}px system-ui, sans-serif`;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        // Ein freies Feld bekommt kein Symbol – dort ist nichts zu sticken.
        const eintrag = o.tabelle.eintraege[o.raster[y * breite + x]];
        if (!eintrag) continue;
        const rgb = o.tabelle.farben[eintrag.index] ?? o.tabelle.stoff;
        stift.fillStyle = istDunkel(rgb[0], rgb[1], rgb[2]) ? "#ffffff" : "#000000";
        stift.fillText(eintrag.symbol, (x + 0.5) * zoom, (y + 0.55) * zoom);
      }
    }
  }

  // --- Auswahl ------------------------------------------------------------
  if (o.auswahl) {
    const auswahl = o.auswahl;
    stift.fillStyle = "rgba(29,78,216,0.28)";
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (!auswahl[y * breite + x]) continue;
        stift.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }
    // Umrandung: nur die Kanten zeichnen, an denen die Auswahl endet.
    stift.strokeStyle = "#1d4ed8";
    stift.lineWidth = Math.max(2, zoom * 0.14);
    stift.beginPath();
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (!auswahl[y * breite + x]) continue;
        const px = x * zoom;
        const py = y * zoom;
        if (y === 0 || !auswahl[(y - 1) * breite + x]) {
          stift.moveTo(px, py);
          stift.lineTo(px + zoom, py);
        }
        if (y === hoehe - 1 || !auswahl[(y + 1) * breite + x]) {
          stift.moveTo(px, py + zoom);
          stift.lineTo(px + zoom, py + zoom);
        }
        if (x === 0 || !auswahl[y * breite + x - 1]) {
          stift.moveTo(px, py);
          stift.lineTo(px, py + zoom);
        }
        if (x === breite - 1 || !auswahl[y * breite + x + 1]) {
          stift.moveTo(px + zoom, py);
          stift.lineTo(px + zoom, py + zoom);
        }
      }
    }
    stift.stroke();
  }

  // --- Rahmen der Einfügevorschau ----------------------------------------
  if (o.vorschau) {
    stift.strokeStyle = "#8a1c1c";
    stift.lineWidth = Math.max(3, zoom * 0.2);
    stift.setLineDash([zoom, zoom]);
    stift.strokeRect(
      o.vorschau.x * zoom,
      o.vorschau.y * zoom,
      o.vorschau.w * zoom,
      o.vorschau.h * zoom,
    );
    stift.setLineDash([]);
  }

  // --- Kante des Blattes --------------------------------------------------
  if (o.mitBlatt) {
    stift.strokeStyle = "rgba(0,0,0,0.35)";
    stift.lineWidth = 1;
    stift.strokeRect(-0.5, -0.5, musterBreite + 1, musterHoehe + 1);
  }

  stift.restore();
}
