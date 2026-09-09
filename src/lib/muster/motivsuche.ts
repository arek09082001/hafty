/**
 * Ein ganzes Motiv mit einem Tipp auswählen.
 * ---------------------------------------------------------------------------
 *
 * „Ich tippe auf die Blume, und die Blume ist ausgewählt.“ Das ist der
 * Anspruch. Das vorhandene Werkzeug „Gleiche Fläche auswählen“ nimmt nur
 * Felder **derselben** Farbe – bei einer Blüte sind das die hellen
 * Blütenblätter, aber nicht die etwas dunkleren daneben und schon gar nicht
 * die gelbe Mitte. Hier wird deshalb anders gesucht:
 *
 *   1. **Ähnliche Farben statt gleicher Farbe.** Vom angetippten Feld aus
 *      wächst die Auswahl über alle Nachbarfelder weiter, deren Farbe der
 *      angetippten ähnlich genug ist. Gemessen wird mit CIEDE2000, also so,
 *      wie ein Mensch Farbunterschiede empfindet – nicht als Abstand von
 *      Zahlen im RGB-Würfel. Die Schwelle ist der einzige Regler, und sie
 *      steht in der Oberfläche nie als Zahl, sondern hinter zwei Knöpfen
 *      („Mehr dazunehmen“ / „Weniger“).
 *
 *   2. **Nur, was zusammenhängt.** Eine zweite rote Blume am anderen Ende
 *      des Bildes gehört nicht dazu, auch wenn sie dieselbe Farbe hat. Wer
 *      sie will, tippt sie zusätzlich an.
 *
 *   3. **Löcher werden geschlossen.** Die gelbe Mitte der Blüte ist von den
 *      Blütenblättern ganz umschlossen. Sie liegt farblich weit weg und
 *      käme beim Wachsen nie dazu – trotzdem gehört sie zur Blume. Alles,
 *      was rundherum eingeschlossen ist, kommt deshalb mit hinein.
 *
 *      Zwei Bremsen gibt es dabei, und beide sind nötig, damit auch ein
 *      Tipp **in den Hintergrund** noch tut, was er soll – sonst hätte, wer
 *      den Himmel antippt, am Ende die Blume darin mit ausgewählt:
 *
 *        - Ist schon mehr als die Hälfte des Musters gewachsen, wird gar
 *          kein Loch mehr gefüllt. So viel Fläche ist kein Motiv mehr,
 *          sondern der Grund, auf dem die Motive liegen – und die Blume
 *          darin ist gerade das, was **nicht** dazugehört.
 *        - Ein einzelnes Loch wird nur gefüllt, wenn es kleiner ist als die
 *          Hälfte des Gewachsenen. Die Blütenmitte ist ein kleiner Fleck
 *          neben den Blütenblättern.
 *
 * Gerechnet wird auf dem fertigen Stichraster, nicht auf dem Foto. Das ist
 * kein Notbehelf, sondern der bessere Ort: das Raster ist bereits auf
 * wenige Garnfarben zusammengefasst und geglättet, die Kanten sind sauber,
 * und die Nutzerin wählt genau das aus, was sie später auch stickt.
 */

import { ciede2000 } from "@/lib/farbe/ciede2000";
import { auswahlAusMaske, leereAuswahl, type Auswahl } from "./raster";
import { FARBINDIZES, LEER, type PalettenEintrag } from "./typen";

/**
 * Die Stufen der Ähnlichkeit, als CIEDE2000-Schwelle.
 *
 * Zur Einordnung: unter 2 sieht ein geübtes Auge keinen Unterschied mehr,
 * um 10 liegen zwei benachbarte Töne derselben Farbfamilie, ab etwa 50 ist
 * es eine andere Farbe. Die Stufen sind deshalb bewusst grob gestaffelt –
 * feiner abgestuft würde ein Tipp auf „Mehr dazunehmen“ oft gar nichts
 * sichtbar verändern, und das wäre schlimmer als eine grobe Stufe.
 */
export const AEHNLICHKEITSSTUFEN = [8, 14, 22, 32, 46] as const;

/** Voreinstellung: die mittlere Stufe. */
export const STANDARD_AEHNLICHKEIT = 2;

export function stufeBegrenzen(stufe: number): number {
  return Math.max(0, Math.min(AEHNLICHKEITSSTUFEN.length - 1, Math.round(stufe)));
}

/**
 * Das Motiv am angetippten Feld auswählen.
 *
 * `palette` wird über den **Index** angesprochen und nicht über die Position
 * im Feld: eine gefilterte Palette (etwa ohne die Farben, die nicht mehr
 * vorkommen) darf hier nicht zu falschen Farben führen.
 */
export function motivAuswaehlen(
  raster: Uint16Array,
  breite: number,
  hoehe: number,
  palette: PalettenEintrag[],
  startX: number,
  startY: number,
  stufe: number,
): Auswahl {
  if (startX < 0 || startY < 0 || startX >= breite || startY >= hoehe) {
    return leereAuswahl(breite, hoehe);
  }

  const schwelle = AEHNLICHKEITSSTUFEN[stufeBegrenzen(stufe)];
  const start = raster[startY * breite + startX];

  // --- Welche Farben zählen als „ähnlich genug“? --------------------------
  // Das hängt nur von der Palette ab, nicht vom einzelnen Feld: bei 20 Farben
  // sind das 20 Abstandsrechnungen für das ganze Muster statt einer je Feld.
  const passt = new Uint8Array(FARBINDIZES);
  const nachIndex: (PalettenEintrag | undefined)[] = [];
  for (const eintrag of palette) nachIndex[eintrag.index] = eintrag;

  const startFarbe = nachIndex[start];
  if (!startFarbe) {
    // Ein Feld ohne Farbe – das sind die Felder, die nicht gestickt werden.
    // Dann wird nur die freie Fläche selbst ausgewählt. Das ist der Weg
    // zurück: freie Stellen antippen und wieder sticken lassen.
    passt[start] = 1;
  } else {
    for (const eintrag of palette) {
      passt[eintrag.index] = ciede2000(startFarbe, eintrag) <= schwelle ? 1 : 0;
    }
    // Nicht gestickte Felder gehören nie zu einem farbigen Motiv.
    passt[LEER] = 0;
  }

  // --- Wachsen ------------------------------------------------------------
  const maske = new Uint8Array(raster.length);
  const stapel = new Int32Array(raster.length);
  let spitze = 0;

  const anfang = startY * breite + startX;
  maske[anfang] = 1;
  stapel[spitze++] = anfang;
  let gewachsen = 1;

  while (spitze > 0) {
    const i = stapel[--spitze];
    const x = i % breite;
    const y = (i / breite) | 0;

    const links = x > 0;
    const rechts = x < breite - 1;
    const oben = y > 0;
    const unten = y < hoehe - 1;

    /** Ein Feld aufnehmen, wenn seine Farbe passt und es noch nicht drin ist. */
    const aufnehmen = (j: number) => {
      if (maske[j] || !passt[raster[j]]) return;
      maske[j] = 1;
      stapel[spitze++] = j;
      gewachsen++;
    };

    if (links) aufnehmen(i - 1);
    if (rechts) aufnehmen(i + 1);
    if (oben) aufnehmen(i - breite);
    if (unten) aufnehmen(i + breite);

    // Über Eck wird nur weitergegangen, wenn auch eines der beiden Felder
    // daneben passt. Sonst liefe die Auswahl durch ein einziges Feld
    // hindurch, an dem sich zwei Flächen nur mit den Ecken berühren – und
    // aus der Blume würde die halbe Wiese.
    const passtLinks = links && passt[raster[i - 1]];
    const passtRechts = rechts && passt[raster[i + 1]];
    const passtOben = oben && passt[raster[i - breite]];
    const passtUnten = unten && passt[raster[i + breite]];

    if (oben && links && (passtOben || passtLinks)) aufnehmen(i - breite - 1);
    if (oben && rechts && (passtOben || passtRechts)) aufnehmen(i - breite + 1);
    if (unten && links && (passtUnten || passtLinks)) aufnehmen(i + breite - 1);
    if (unten && rechts && (passtUnten || passtRechts)) aufnehmen(i + breite + 1);
  }

  // Bei mehr als der halben Musterfläche ist das Gewachsene der Hintergrund;
  // dann bleiben die Löcher offen (siehe Kopf der Datei).
  if (gewachsen * 2 <= raster.length) {
    loecherSchliessen(maske, breite, hoehe, gewachsen);
  }

  return auswahlAusMaske(maske, breite);
}

/**
 * Eingeschlossene Löcher der Maske auffüllen.
 *
 * Zuerst wird von allen vier Rändern aus geflutet: was von außen erreichbar
 * ist, liegt außerhalb des Motivs. Alles andere, was nicht schon zur Maske
 * gehört, ist ein eingeschlossenes Loch – die gelbe Blütenmitte, das Auge
 * der Katze, das Fenster im Haus.
 *
 * Jedes Loch wird für sich betrachtet und nur aufgefüllt, wenn es kleiner
 * ist als die Hälfte der gewachsenen Fläche (siehe Kopf der Datei).
 */
function loecherSchliessen(
  maske: Uint8Array,
  breite: number,
  hoehe: number,
  gewachsen: number,
) {
  const gesamt = breite * hoehe;
  const aussen = new Uint8Array(gesamt);
  const stapel = new Int32Array(gesamt);
  let spitze = 0;

  const anstossen = (i: number) => {
    if (aussen[i] || maske[i]) return;
    aussen[i] = 1;
    stapel[spitze++] = i;
  };

  for (let x = 0; x < breite; x++) {
    anstossen(x);
    anstossen((hoehe - 1) * breite + x);
  }
  for (let y = 0; y < hoehe; y++) {
    anstossen(y * breite);
    anstossen(y * breite + breite - 1);
  }

  while (spitze > 0) {
    const i = stapel[--spitze];
    const x = i % breite;
    const y = (i / breite) | 0;
    if (x > 0) anstossen(i - 1);
    if (x < breite - 1) anstossen(i + 1);
    if (y > 0) anstossen(i - breite);
    if (y < hoehe - 1) anstossen(i + breite);
  }

  // Die Löcher einzeln einsammeln und je nach Größe auffüllen.
  const grenze = gewachsen / 2;
  const gesehen = new Uint8Array(gesamt);
  const loch = new Int32Array(gesamt);

  for (let anfang = 0; anfang < gesamt; anfang++) {
    if (maske[anfang] || aussen[anfang] || gesehen[anfang]) continue;

    let anzahl = 0;
    spitze = 0;
    gesehen[anfang] = 1;
    stapel[spitze++] = anfang;

    while (spitze > 0) {
      const i = stapel[--spitze];
      loch[anzahl++] = i;
      const x = i % breite;
      const y = (i / breite) | 0;

      const dazu = (j: number) => {
        if (gesehen[j] || maske[j] || aussen[j]) return;
        gesehen[j] = 1;
        stapel[spitze++] = j;
      };

      if (x > 0) dazu(i - 1);
      if (x < breite - 1) dazu(i + 1);
      if (y > 0) dazu(i - breite);
      if (y < hoehe - 1) dazu(i + breite);
    }

    if (anzahl <= grenze) {
      for (let n = 0; n < anzahl; n++) maske[loch[n]] = 1;
    }
  }
}

/**
 * Zwei Auswahlen zusammenlegen.
 *
 * So kommt man zu mehreren Motiven auf einmal: erst die eine Blume antippen,
 * dann die zweite. Ohne das müsste die Nutzerin beide gleichzeitig erwischen
 * oder sich mit einer einzigen begnügen.
 */
export function auswahlVereinen(a: Auswahl, b: Auswahl, breite: number): Auswahl {
  const maske = new Uint8Array(a.maske.length);
  for (let i = 0; i < maske.length; i++) maske[i] = a.maske[i] || b.maske[i] ? 1 : 0;
  return auswahlAusMaske(maske, breite);
}
