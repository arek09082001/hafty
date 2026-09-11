/**
 * Arbeiten auf dem Raster.
 *
 * Das Muster besteht aus zwei Ebenen:
 *
 *   basis         das erzeugte Muster (zwei Byte je Feld, Palettenindex)
 *   bearbeitung   die Handbearbeitungen darüber (-1 = unberührt)
 *
 * Was die Nutzerin sieht und was gedruckt wird, ist immer die
 * Zusammenführung beider Ebenen. Der Vorteil: ändert sie die Farbanzahl und
 * lässt neu erzeugen, wird nur die untere Ebene ersetzt – ihre eigenen
 * Änderungen bleiben stehen.
 */

import { ciede2000 } from "@/lib/farbe/ciede2000";
import type { Lab } from "@/lib/farbe/lab";
import { FARBINDIZES, LEER, type PalettenEintrag } from "./typen";

/** Die beiden Ebenen zu einem Raster zusammenführen. */
export function zusammenfuehren(basis: Uint16Array, bearbeitung: Int16Array): Uint16Array {
  const ergebnis = new Uint16Array(basis.length);
  for (let i = 0; i < basis.length; i++) {
    ergebnis[i] = bearbeitung[i] >= 0 ? bearbeitung[i] : basis[i];
  }
  return ergebnis;
}

/** Der Farbindex eines Feldes über beide Ebenen hinweg. */
export function feldFarbe(basis: Uint16Array, bearbeitung: Int16Array, i: number): number {
  return bearbeitung[i] >= 0 ? bearbeitung[i] : basis[i];
}

/**
 * Nach einem neuen Durchlauf hat die Palette andere Indizes. Damit die
 * Handbearbeitungen erhalten bleiben, wird jeder benutzte Index auf die
 * farblich nächste Farbe der neuen Palette umgeschrieben.
 */
export function bearbeitungUmschreiben(
  bearbeitung: Int16Array,
  altePalette: PalettenEintrag[],
  neuePalette: PalettenEintrag[],
): Int16Array {
  if (neuePalette.length === 0) return bearbeitung;

  // Nur einmal je alter Farbe rechnen, nicht je Feld.
  const umschreibung = new Int16Array(Math.max(1, altePalette.length)).fill(0);
  for (let alt = 0; alt < altePalette.length; alt++) {
    const farbe: Lab = { L: altePalette[alt].L, a: altePalette[alt].a, b: altePalette[alt].b };
    let bester = 0;
    let besterAbstand = Infinity;
    for (let neu = 0; neu < neuePalette.length; neu++) {
      const d = ciede2000(farbe, {
        L: neuePalette[neu].L,
        a: neuePalette[neu].a,
        b: neuePalette[neu].b,
      });
      if (d < besterAbstand) {
        besterAbstand = d;
        bester = neu;
      }
    }
    umschreibung[alt] = bester;
  }

  const ergebnis = new Int16Array(bearbeitung.length);
  for (let i = 0; i < bearbeitung.length; i++) {
    const alt = bearbeitung[i];
    // Ein Feld, das nicht gestickt wird, bleibt ungestickt. Es hat keine
    // Farbe, für die es eine nächstliegende neue Farbe geben könnte –
    // ohne diese Zeile stünde nach jeder Änderung an der Farbanzahl
    // wieder der ganze Hintergrund im Muster.
    if (alt === LEER) {
      ergebnis[i] = LEER;
      continue;
    }
    ergebnis[i] = alt < 0 ? -1 : (umschreibung[alt] ?? 0);
  }
  return ergebnis;
}

// ---------------------------------------------------------------------------
// Nicht gestickte Felder
// ---------------------------------------------------------------------------

/**
 * Nur die Auswahl sticken: alles andere wird zu freiem Stoff.
 *
 * Geschrieben wird in die **Bearbeitungsebene** und nicht in die Basis. Damit
 * gehört das Freistellen zu den Handbearbeitungen: es lässt sich mit einem
 * Tipp auf „Rückgängig“ zurücknehmen, es bleibt erhalten, wenn das Muster
 * mit anderer Farbanzahl neu erzeugt wird, und es liegt in jedem
 * gespeicherten Stand mit drin.
 */
export function nurAuswahlSticken(auswahl: Auswahl): { indizes: number[]; werte: number[] } {
  const indizes: number[] = [];
  const werte: number[] = [];
  for (let i = 0; i < auswahl.maske.length; i++) {
    if (auswahl.maske[i]) continue;
    indizes.push(i);
    werte.push(LEER);
  }
  return { indizes, werte };
}

/** Der umgekehrte Weg: genau das Ausgewählte wird nicht gestickt. */
export function auswahlNichtSticken(auswahl: Auswahl): { indizes: number[]; werte: number[] } {
  const indizes: number[] = [];
  const werte: number[] = [];
  for (let i = 0; i < auswahl.maske.length; i++) {
    if (!auswahl.maske[i]) continue;
    indizes.push(i);
    werte.push(LEER);
  }
  return { indizes, werte };
}

/**
 * Alles wieder sticken.
 *
 * Die freien Felder gehen auf -1 zurück, also auf „unberührt“. Damit
 * kommt darunter wieder das erzeugte Muster zum Vorschein – und nicht etwa
 * eine Farbe, die geraten werden müsste.
 */
export function allesWiederSticken(bearbeitung: Int16Array): { indizes: number[]; werte: number[] } {
  const indizes: number[] = [];
  const werte: number[] = [];
  for (let i = 0; i < bearbeitung.length; i++) {
    if (bearbeitung[i] !== LEER) continue;
    indizes.push(i);
    werte.push(-1);
  }
  return { indizes, werte };
}

/** Wie viele Felder bleiben frei? */
export function freieFelder(raster: Uint16Array): number {
  let anzahl = 0;
  for (let i = 0; i < raster.length; i++) if (raster[i] === LEER) anzahl++;
  return anzahl;
}

/**
 * Die Palette mit den Stichzahlen, die wirklich im Raster stehen.
 *
 * Die Zahlen aus dem Worker gelten für das erzeugte Muster. Sobald von Hand
 * gemalt oder etwas freigestellt wurde, stimmen sie nicht mehr – und die
 * Garnliste ist genau die Stelle, an der es darauf ankommt: sie sagt, was
 * gekauft werden muss. Deshalb wird sie vor dem Anzeigen und vor dem
 * Ausdrucken neu gezählt. Das kostet einen Durchlauf über das Raster.
 *
 * Farben, die nicht mehr vorkommen, bleiben mit der Zahl 0 in der Liste
 * stehen; wer sie aus der Anzeige haben will, filtert sie dort heraus. Die
 * Reihenfolge und die Indizes bleiben, denn Raster und Palette hängen
 * über genau diese Indizes zusammen.
 */
export function paletteNachzaehlen(
  palette: PalettenEintrag[],
  raster: Uint16Array,
): PalettenEintrag[] {
  const zaehler = new Int32Array(FARBINDIZES);
  for (let i = 0; i < raster.length; i++) zaehler[raster[i]]++;
  return palette.map((eintrag) => ({ ...eintrag, stiche: zaehler[eintrag.index] }));
}

// ---------------------------------------------------------------------------
// Auswahl
// ---------------------------------------------------------------------------

/** Eine Auswahl ist eine Maske über das ganze Raster: 1 = ausgewählt. */
export type Auswahl = {
  maske: Uint8Array;
  /** Umschließendes Rechteck, damit nicht immer alles durchlaufen werden muss. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  anzahl: number;
};

export function leereAuswahl(breite: number, hoehe: number): Auswahl {
  return { maske: new Uint8Array(breite * hoehe), x0: 0, y0: 0, x1: -1, y1: -1, anzahl: 0 };
}

/** Aus einer fertigen Maske die Kennzahlen nachziehen. */
export function auswahlAusMaske(maske: Uint8Array, breite: number): Auswahl {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  let anzahl = 0;

  for (let i = 0; i < maske.length; i++) {
    if (!maske[i]) continue;
    anzahl++;
    const x = i % breite;
    const y = (i / breite) | 0;
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }

  if (anzahl === 0) return { maske, x0: 0, y0: 0, x1: -1, y1: -1, anzahl: 0 };
  return { maske, x0, y0, x1, y1, anzahl };
}

/** Rechteckige Auswahl. */
export function rechteckAuswaehlen(
  breite: number,
  hoehe: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Auswahl {
  const x0 = Math.max(0, Math.min(ax, bx));
  const x1 = Math.min(breite - 1, Math.max(ax, bx));
  const y0 = Math.max(0, Math.min(ay, by));
  const y1 = Math.min(hoehe - 1, Math.max(ay, by));

  const maske = new Uint8Array(breite * hoehe);
  let anzahl = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      maske[y * breite + x] = 1;
      anzahl++;
    }
  }
  return { maske, x0, y0, x1, y1, anzahl };
}

/**
 * „Gleiche Fläche auswählen" – der wichtigste Auswahlmodus.
 *
 * Ausgehend vom angetippten Feld wird die zusammenhängende Fläche derselben
 * Farbe eingesammelt (8er-Nachbarschaft, weil ein Faden auch über die Ecke
 * weitergeführt wird). Damit ist ein Blütenblatt oder ein Blatt mit einem
 * einzigen Tipp erfasst, ohne dass die Nutzerin eine Kontur nachfahren muss.
 */
export function gleicheFlaecheAuswaehlen(
  raster: Uint16Array,
  breite: number,
  startX: number,
  startY: number,
): Auswahl {
  const hoehe = raster.length / breite;
  const maske = new Uint8Array(raster.length);

  if (startX < 0 || startY < 0 || startX >= breite || startY >= hoehe) {
    return leereAuswahl(breite, hoehe);
  }

  const farbe = raster[startY * breite + startX];
  const stapel = new Int32Array(raster.length);
  let spitze = 0;
  stapel[spitze++] = startY * breite + startX;
  maske[startY * breite + startX] = 1;

  while (spitze > 0) {
    const i = stapel[--spitze];
    const x = i % breite;
    const y = (i / breite) | 0;

    for (let dy = -1; dy <= 1; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= hoehe) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const xx = x + dx;
        if (xx < 0 || xx >= breite) continue;
        const j = yy * breite + xx;
        if (maske[j] || raster[j] !== farbe) continue;
        maske[j] = 1;
        stapel[spitze++] = j;
      }
    }
  }

  return auswahlAusMaske(maske, breite);
}

// ---------------------------------------------------------------------------
// Zwischenablage und Motive
// ---------------------------------------------------------------------------

/** Ein herausgelöster Ausschnitt. */
export type Ausschnitt = {
  w: number;
  h: number;
  daten: Uint16Array;
  /** 1 = gehört zum Ausschnitt, 0 = durchsichtig. */
  maske: Uint8Array;
  /** Die Farben des Ausschnitts – nötig, wenn er in ein anderes Muster kommt. */
  palette: PalettenEintrag[];
};

/** Aus einer Auswahl einen Ausschnitt herauslösen. */
export function ausschnittHerausloesen(
  raster: Uint16Array,
  breite: number,
  auswahl: Auswahl,
  palette: PalettenEintrag[],
): Ausschnitt | null {
  if (auswahl.anzahl === 0) return null;

  const w = auswahl.x1 - auswahl.x0 + 1;
  const h = auswahl.y1 - auswahl.y0 + 1;
  const daten = new Uint16Array(w * h);
  const maske = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const q = (auswahl.y0 + y) * breite + (auswahl.x0 + x);
      const z = y * w + x;
      if (!auswahl.maske[q]) continue;
      maske[z] = 1;
      daten[z] = raster[q];
    }
  }

  // Nur die tatsächlich vorkommenden Farben mitnehmen.
  const benutzt = new Set<number>();
  for (let i = 0; i < daten.length; i++) if (maske[i]) benutzt.add(daten[i]);

  return {
    w,
    h,
    daten,
    maske,
    palette: palette.filter((p) => benutzt.has(p.index)),
  };
}

// ---------------------------------------------------------------------------
// Drehen und Spiegeln
// ---------------------------------------------------------------------------

/**
 * Drehen ausschließlich in 90-Grad-Schritten, dazu Spiegeln waagerecht und
 * senkrecht. Alles davon ist reines Umsortieren der Indizes und damit
 * verlustfrei.
 *
 * Freie Winkel gibt es bewusst nicht: auf einem Stichraster müsste dabei
 * jedes Feld neu interpoliert werden, und aus sauberen Kanten würden
 * ausgefranste Treppen mit lauter Einzelstichen – genau das, was diese App
 * verhindern soll.
 */
export function drehen90(a: Ausschnitt): Ausschnitt {
  const { w, h } = a;
  const daten = new Uint16Array(w * h);
  const maske = new Uint8Array(w * h);

  // Neues Feld (x', y') mit x' = h-1-y, y' = x; neue Breite ist h.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const q = y * w + x;
      const nx = h - 1 - y;
      const ny = x;
      const z = ny * h + nx;
      daten[z] = a.daten[q];
      maske[z] = a.maske[q];
    }
  }

  return { w: h, h: w, daten, maske, palette: a.palette };
}

export function spiegelnWaagerecht(a: Ausschnitt): Ausschnitt {
  const { w, h } = a;
  const daten = new Uint16Array(w * h);
  const maske = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const q = y * w + x;
      const z = y * w + (w - 1 - x);
      daten[z] = a.daten[q];
      maske[z] = a.maske[q];
    }
  }
  return { w, h, daten, maske, palette: a.palette };
}

export function spiegelnSenkrecht(a: Ausschnitt): Ausschnitt {
  const { w, h } = a;
  const daten = new Uint16Array(w * h);
  const maske = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const q = y * w + x;
      const z = (h - 1 - y) * w + x;
      daten[z] = a.daten[q];
      maske[z] = a.maske[q];
    }
  }
  return { w, h, daten, maske, palette: a.palette };
}

// ---------------------------------------------------------------------------
// Größe eines Ausschnitts
// ---------------------------------------------------------------------------

/**
 * Die Stufen, in denen ein eingesetztes Stück wächst und schrumpft, in
 * Prozent.
 *
 * Keine stufenlose Eingabe: auf einem Stichraster ist der Unterschied
 * zwischen 100 % und 104 % gar nicht zu sehen, und wer eine Zahl eintippen
 * müsste, hätte schon verloren. Zwei Knöpfe und eine Handvoll Stufen
 * genügen – dazwischen liegt jeweils ein sichtbarer Sprung.
 */
export const STUECK_STUFEN = [25, 33, 50, 75, 100, 150, 200, 300, 400] as const;

/** Die Stufe, auf der ein Stück eingesetzt wird: seine eigene Größe. */
export const STUECK_STUFE_NORMAL = STUECK_STUFEN.indexOf(100);

/**
 * Wie groß ein Stück auf einer Stufe wird.
 *
 * Steht als eigene Funktion da, weil die Oberfläche die Maße braucht, ohne
 * das Stück wirklich umzurechnen: sie zeigt sie an und entscheidet daran,
 * ob die Knöpfe noch etwas bewirken.
 */
export function skalierteMasse(a: Ausschnitt, prozent: number): { w: number; h: number } {
  return {
    w: Math.max(1, Math.round((a.w * prozent) / 100)),
    h: Math.max(1, Math.round((a.h * prozent) / 100)),
  };
}

/**
 * Ein Stück größer oder kleiner machen.
 *
 * Gerechnet wird mit dem nächsten Nachbarn und ausdrücklich nicht gemittelt.
 * Ein Mittelwert zwischen zwei Garnfarben ist eine dritte Farbe, die es im
 * Katalog nicht gibt – aus einem Motiv mit vier Farben würde eines mit
 * dreißig, und jede davon wäre ein Strang mehr zu kaufen. So bleibt die
 * Palette genau die, die vorher da war.
 *
 * Beim Vergrößern wird jedes Kästchen zu einem Block, beim Verkleinern
 * fallen Kästchen weg. Das ist auf einem Stichraster nicht zu vermeiden und
 * der Grund für die Stufen: wer von 100 % auf 50 % und zurück geht, bekommt
 * sein Motiv unverändert wieder, weil immer vom Original gerechnet wird und
 * nie vom schon Gerechneten.
 */
export function skalieren(a: Ausschnitt, prozent: number): Ausschnitt {
  const { w, h } = skalierteMasse(a, prozent);
  if (w === a.w && h === a.h) return a;

  const daten = new Uint16Array(w * h);
  const maske = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    const qy = Math.min(a.h - 1, Math.floor((y * a.h) / h));
    for (let x = 0; x < w; x++) {
      const qx = Math.min(a.w - 1, Math.floor((x * a.w) / w));
      const q = qy * a.w + qx;
      const z = y * w + x;
      daten[z] = a.daten[q];
      maske[z] = a.maske[q];
    }
  }

  return { w, h, daten, maske, palette: a.palette };
}

// ---------------------------------------------------------------------------
// Hilfen für die Werkzeuge
// ---------------------------------------------------------------------------

/**
 * Alle Felder auf der Verbindungslinie zweier Punkte (Bresenham).
 *
 * Ein Finger auf dem Tablet erzeugt nur alle paar Millisekunden ein
 * Ereignis. Ohne diese Linie hätte ein zügiger Strich Lücken, und die
 * Nutzerin müsste nachbessern.
 */
export function linieFelder(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Array<{ x: number; y: number }> {
  const felder: Array<{ x: number; y: number }> = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let fehler = dx + dy;

  for (;;) {
    felder.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * fehler;
    if (e2 >= dy) {
      fehler += dy;
      x += sx;
    }
    if (e2 <= dx) {
      fehler += dx;
      y += sy;
    }
  }

  return felder;
}

/**
 * Freihandauswahl.
 *
 * Die Nutzerin fährt mit dem Finger eine Umrandung. Beim Loslassen wird die
 * Linie geschlossen und alles, was innerhalb liegt, mit ausgewählt – sonst
 * müsste sie jede einzelne Reihe der Fläche einzeln abfahren.
 *
 * Das Innere wird bestimmt, indem vom Rand des Rasters aus geflutet wird:
 * was von außen nicht erreichbar ist und nicht selbst auf der Linie liegt,
 * liegt innen. Umschließt die Linie nichts (ein offener Strich), bleibt
 * einfach die gezogene Spur als Auswahl stehen.
 */
export function freihandAuswahl(
  breite: number,
  hoehe: number,
  spur: Array<{ x: number; y: number }>,
): Auswahl {
  const maske = new Uint8Array(breite * hoehe);
  if (spur.length === 0) return leereAuswahl(breite, hoehe);

  const setzen = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= breite || y >= hoehe) return;
    maske[y * breite + x] = 1;
  };

  for (let i = 0; i < spur.length; i++) {
    const a = spur[i];
    const b = spur[(i + 1) % spur.length]; // schließt die Linie zum Anfang
    for (const feld of linieFelder(a.x, a.y, b.x, b.y)) setzen(feld.x, feld.y);
  }

  // Vom Rand aus fluten: alles Erreichbare liegt außen.
  const aussen = new Uint8Array(breite * hoehe);
  const stapel = new Int32Array(breite * hoehe);
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

  for (let i = 0; i < maske.length; i++) if (!aussen[i]) maske[i] = 1;

  return auswahlAusMaske(maske, breite);
}

/**
 * Einen Ausschnitt an einer Stelle einsetzen. Gibt die Felder zurück, die
 * sich dabei ändern – daraus wird ein einzelner Rückgängig-Schritt.
 */
export function ausschnittEinsetzen(
  ausschnitt: Ausschnitt,
  breite: number,
  hoehe: number,
  zielX: number,
  zielY: number,
): { indizes: number[]; werte: number[] } {
  const indizes: number[] = [];
  const werte: number[] = [];

  for (let y = 0; y < ausschnitt.h; y++) {
    const zy = zielY + y;
    if (zy < 0 || zy >= hoehe) continue;
    for (let x = 0; x < ausschnitt.w; x++) {
      const zx = zielX + x;
      if (zx < 0 || zx >= breite) continue;
      const q = y * ausschnitt.w + x;
      if (!ausschnitt.maske[q]) continue;
      indizes.push(zy * breite + zx);
      werte.push(ausschnitt.daten[q]);
    }
  }

  return { indizes, werte };
}

/** Aus einer Auswahl die Feldliste für eine Farbänderung machen. */
export function auswahlFuellen(auswahl: Auswahl, farbe: number): { indizes: number[]; werte: number[] } {
  const indizes: number[] = [];
  const werte: number[] = [];
  for (let i = 0; i < auswahl.maske.length; i++) {
    if (!auswahl.maske[i]) continue;
    indizes.push(i);
    werte.push(farbe);
  }
  return { indizes, werte };
}

/**
 * Einen Ausschnitt auf die Palette eines anderen Musters umschreiben.
 * ---------------------------------------------------------------------------
 *
 * Ein Motiv trägt seine eigenen Farben mit sich. Eingesetzt wurde bisher
 * aber nur das nackte Raster: die Zahlen darin sind Plätze in der Palette
 * **des Musters, aus dem es stammt**. In einem anderen Muster steht an
 * Platz 3 eine andere Farbe – das Motiv kam bunt durcheinander heraus. Auf
 * einer leeren Fläche, die noch gar keine Palette hat, käme überhaupt nichts.
 *
 * Deshalb wird hier zusammengelegt: jede Farbe des Motivs bekommt den Platz
 * der gleichen Farbe im Ziel, oder einen neuen Platz am Ende. „Gleich" heißt
 * dasselbe Garn – und ohne Garnkatalog derselbe Farbwert. Zwei Töne, die nur
 * beinahe gleich sind, werden **nicht** zusammengelegt: beim Sticken sind das
 * zwei Rollen, und die Nutzerin hat sie bewusst so gewählt.
 */
export function ausschnittAufPalette(
  ausschnitt: Ausschnitt,
  zielPalette: PalettenEintrag[],
): { ausschnitt: Ausschnitt; palette: PalettenEintrag[] } {
  const palette = [...zielPalette];
  /** Alter Platz im Motiv -> neuer Platz im Ziel. */
  const umschreiben = new Map<number, number>();

  const gleich = (a: PalettenEintrag, b: PalettenEintrag) =>
    a.garn && b.garn ? a.garn.id === b.garn.id : !a.garn && !b.garn && a.hex === b.hex;

  for (const eintrag of ausschnitt.palette) {
    const schon = palette.find((z) => gleich(z, eintrag));
    if (schon) {
      umschreiben.set(eintrag.index, schon.index);
      continue;
    }
    // Ein neuer Platz am Ende. Die Symbole werden danach ohnehin neu
    // verteilt, hier steht erst einmal das mitgebrachte.
    const neuerIndex = palette.length === 0 ? 0 : Math.max(...palette.map((z) => z.index)) + 1;
    palette.push({ ...eintrag, index: neuerIndex, stiche: 0 });
    umschreiben.set(eintrag.index, neuerIndex);
  }

  const daten = Uint16Array.from(ausschnitt.daten, (wert) => umschreiben.get(wert) ?? wert);

  return {
    ausschnitt: { ...ausschnitt, daten, palette: ausschnitt.palette },
    palette,
  };
}
