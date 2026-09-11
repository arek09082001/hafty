/**
 * Eingesetzte Motive bleiben als solche erkennbar.
 * ---------------------------------------------------------------------------
 *
 * Ein eingesetztes Stück war bisher nach dem „Wstaw tutaj" nur noch eine
 * Handvoll gefärbter Felder wie jede andere. Wer es einen Stich zu weit links
 * abgelegt hatte, musste rückgängig machen und von vorn anfangen – und wer es
 * eine Stunde später verrücken wollte, hatte gar keine Möglichkeit mehr.
 *
 * Deshalb merkt sich das Muster, **wo ein Stück eingesetzt wurde**: welche
 * Felder dazugehören, was dort vorher stand und was das Stück hingelegt hat.
 * Mit diesen drei Angaben lässt sich ein Motiv jederzeit wieder aufnehmen –
 * darunter kommt zum Vorschein, was vorher da war – und woanders ablegen.
 *
 * Zwei Regeln halten das Ganze ehrlich:
 *
 *  - **Nur die eigenen Felder.** Wer über ein Motiv malt oder ein zweites
 *    darüberlegt, hat dort das Sagen. Beim Aufnehmen wird deshalb nur
 *    zurückgegeben, was heute noch genau das ist, was das Stück hingelegt hat.
 *    So nimmt ein aufgenommenes Motiv die spätere Arbeit nicht mit.
 *  - **Der obenliegende gewinnt.** Ein Tipp trifft das zuletzt eingesetzte
 *    Stück, das an dieser Stelle noch seine eigenen Felder hat – so, wie man
 *    es von übereinanderliegenden Zetteln erwartet.
 */

import { LEER, type PalettenEintrag } from "./typen";
import type { Ausschnitt } from "./raster";

export type Platzierung = {
  id: string;
  /** Die Felder des Musters, die das Stück belegt hat. */
  indizes: Int32Array;
  /** Was auf der Bearbeitungsebene vorher dort stand (-1 = unberührt). */
  alt: Int16Array;
  /** Was das Stück dort hingelegt hat. */
  neu: Int16Array;
  /** Das umschließende Rechteck – für die Umrandung auf dem Bildschirm. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Kam das Stück aus der Motivliste (und nicht aus einer Kopie)? */
  ausMotiv: boolean;
  /** Der Name des Motivs, falls es einen hatte. */
  name: string | null;
  /**
   * Die Vorlage, aus der das Stück entstanden ist – unskaliert und ungedreht,
   * dazu Stufe und Winkel, mit denen es abgelegt wurde.
   *
   * Damit lässt sich ein unberührtes Motiv verlustfrei wieder aufnehmen: ein
   * zweimal vergrößertes und wieder verkleinertes Stück wäre sonst ein Klotz.
   * Wurde über das Motiv gemalt, gilt stattdessen das, was auf dem Muster
   * steht – siehe `platzierungAlsAusschnitt`.
   */
  quelle: Ausschnitt | null;
  stufe: number;
  winkel: number;
  angelegtAm: number;
};

/** Aus den Feldern eines Einsetzens eine Platzierung machen. */
export function platzierungAnlegen(
  indizes: number[],
  alt: number[],
  neu: number[],
  breite: number,
  angaben: {
    ausMotiv: boolean;
    name: string | null;
    quelle: Ausschnitt | null;
    stufe: number;
    winkel: number;
  },
): Platzierung {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (const feld of indizes) {
    const x = feld % breite;
    const y = (feld / breite) | 0;
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }

  return {
    id: crypto.randomUUID(),
    indizes: Int32Array.from(indizes),
    alt: Int16Array.from(alt),
    neu: Int16Array.from(neu),
    x0: x0 === Infinity ? 0 : x0,
    y0: y0 === Infinity ? 0 : y0,
    x1,
    y1,
    ausMotiv: angaben.ausMotiv,
    name: angaben.name,
    quelle: angaben.quelle,
    stufe: angaben.stufe,
    winkel: angaben.winkel,
    angelegtAm: Date.now(),
  };
}

/**
 * Gehört dieses Feld heute noch zu dieser Platzierung?
 *
 * Maßgeblich ist die Bearbeitungsebene: steht dort noch genau der Wert, den
 * das Stück hingelegt hat, ist das Feld seines. Wurde darübergemalt oder ein
 * anderes Stück daraufgelegt, nicht mehr.
 */
function feldGehoert(p: Platzierung, bearbeitung: Int16Array, feld: number): boolean {
  for (let i = 0; i < p.indizes.length; i++) {
    if (p.indizes[i] !== feld) continue;
    return bearbeitung[feld] === p.neu[i];
  }
  return false;
}

/** Ist das Stück noch vollständig so da, wie es abgelegt wurde? */
export function unberuehrt(p: Platzierung, bearbeitung: Int16Array): boolean {
  return eigeneAnzahl(p, bearbeitung) === p.indizes.length;
}

/** Wie viele Felder einer Platzierung heute noch ihr gehören. */
export function eigeneAnzahl(p: Platzierung, bearbeitung: Int16Array): number {
  let anzahl = 0;
  for (let i = 0; i < p.indizes.length; i++) {
    if (bearbeitung[p.indizes[i]] === p.neu[i]) anzahl++;
  }
  return anzahl;
}

/**
 * Welche Platzierung liegt an dieser Stelle?
 *
 * Von hinten nach vorn gesucht: die zuletzt eingesetzte liegt obenauf.
 */
export function platzierungBeiFeld(
  liste: Platzierung[],
  feld: number,
  bearbeitung: Int16Array,
): Platzierung | null {
  for (let i = liste.length - 1; i >= 0; i--) {
    if (feldGehoert(liste[i], bearbeitung, feld)) return liste[i];
  }
  return null;
}

/**
 * Ein eingesetztes Stück wieder herauslösen – als Ausschnitt, der sich wie
 * ein frisch gewähltes Motiv weiterschieben lässt.
 *
 * Gelesen wird aus dem **heutigen** Muster: hat die Nutzerin einen Stich des
 * Motivs umgefärbt, nimmt sie ihn in dieser Farbe mit. Nur Felder, die noch
 * dem Stück gehören, kommen hinein; der Rest bleibt durchsichtig.
 */
export function platzierungAlsAusschnitt(
  p: Platzierung,
  raster: Uint16Array,
  bearbeitung: Int16Array,
  breite: number,
  palette: PalettenEintrag[],
): Ausschnitt | null {
  const w = p.x1 - p.x0 + 1;
  const h = p.y1 - p.y0 + 1;
  if (w <= 0 || h <= 0) return null;

  const daten = new Uint16Array(w * h).fill(LEER);
  const maske = new Uint8Array(w * h);
  let felder = 0;

  for (let i = 0; i < p.indizes.length; i++) {
    const feld = p.indizes[i];
    if (bearbeitung[feld] !== p.neu[i]) continue;
    const x = (feld % breite) - p.x0;
    const y = ((feld / breite) | 0) - p.y0;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const stelle = y * w + x;
    daten[stelle] = raster[feld];
    maske[stelle] = 1;
    felder++;
  }

  if (felder === 0) return null;
  return { w, h, daten, maske, palette };
}

/**
 * Das Stück wieder abheben: seine eigenen Felder bekommen zurück, was vorher
 * dort stand. Zurück kommen die Felder für einen Rückgängig-Schritt.
 */
export function platzierungAufheben(
  p: Platzierung,
  bearbeitung: Int16Array,
): { indizes: number[]; werte: number[] } {
  const indizes: number[] = [];
  const werte: number[] = [];
  for (let i = 0; i < p.indizes.length; i++) {
    const feld = p.indizes[i];
    if (bearbeitung[feld] !== p.neu[i]) continue;
    indizes.push(feld);
    werte.push(p.alt[i]);
  }
  return { indizes, werte };
}

/**
 * Eine Maske über das ganze Muster: 1 für die Felder, die dieser Platzierung
 * noch gehören. Damit zeichnet die Arbeitsfläche die Umrandung.
 */
export function platzierungMaske(
  p: Platzierung,
  bearbeitung: Int16Array,
  felder: number,
): Uint8Array {
  const maske = new Uint8Array(felder);
  for (let i = 0; i < p.indizes.length; i++) {
    const feld = p.indizes[i];
    if (bearbeitung[feld] === p.neu[i]) maske[feld] = 1;
  }
  return maske;
}
