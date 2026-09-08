/**
 * Farben in Worte fassen.
 * ---------------------------------------------------------------------------
 *
 * Die Hersteller vergeben Farbnamen, aber nicht alle. DMC nennt seine Garne
 * "Coral Red Very Dark"; Ariadna veroeffentlicht ueberhaupt keine Namen,
 * dort gibt es nur Nummern. In der Legende stuende dann eine leere Zeile.
 *
 * Statt Namen zu erfinden, beschreiben wir die Farbe: aus dem Hexwert wird
 * "dunkles Rot" beziehungsweise "ciemny czerwony". Das ist keine Angabe des
 * Herstellers, sondern eine Beschreibung dessen, was zu sehen ist – und sie
 * steht in der Sprache, die gerade eingestellt ist.
 *
 * Gerechnet wird in Lab: der Winkel in der a-b-Ebene ergibt den Farbton, der
 * Abstand vom Mittelpunkt (die Buntheit C) trennt Bunt von Grau, und L gibt
 * die Helligkeit. In RGB waere all das nicht sauber zu trennen.
 *
 * Achtung bei den Winkeln: sie liegen anders, als man vermutet. Reines Rot
 * steht in Lab nicht bei 0 Grad, sondern bei 40; reines Blau bei 306. Die
 * Grenzen unten sind an gemessenen Werten ausgerichtet, nicht geraten:
 *
 *   Rot 40 · Orange 60 · Gelb 103 · Grün 136 · Türkis 196 · Blau 306 ·
 *   Violett 319 · Magenta 328 · Pink 342
 */

import { hexNachLab } from "./lab";
import type { Textschluessel } from "../sprache/texte";

/** Ein Farbton und die dazu passende Stufe, beide als Textschluessel. */
export type Farbwort = { ton: Textschluessel; stufe: Textschluessel | null };

/** Grenzen der Farbtoene als Winkel in Grad. Der letzte laeuft ueber 360. */
const BEREICHE: { bis: number; ton: Textschluessel }[] = [
  { bis: 20, ton: "farbton.rosa" },
  { bis: 50, ton: "farbton.rot" },
  { bis: 75, ton: "farbton.orange" },
  { bis: 115, ton: "farbton.gelb" },
  { bis: 160, ton: "farbton.gruen" },
  { bis: 225, ton: "farbton.tuerkis" },
  { bis: 310, ton: "farbton.blau" },
  { bis: 335, ton: "farbton.violett" },
  { bis: 360, ton: "farbton.rosa" },
];

export function farbwort(hex: string): Farbwort {
  const { L, a, b } = hexNachLab(hex);
  const buntheit = Math.hypot(a, b);

  // --- Fast unbunt: Weiss, Grau, Schwarz -----------------------------------
  if (buntheit < 10) {
    if (L >= 92) return { ton: "farbton.weiss", stufe: null };
    if (L <= 14) return { ton: "farbton.schwarz", stufe: null };
    return { ton: "farbton.grau", stufe: stufe(L) };
  }
  // Ein Hauch Farbe in einem sehr hellen Garn ist immer noch Weiss.
  if (L >= 93 && buntheit < 16) return { ton: "farbton.weiss", stufe: null };

  const winkel = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  const grund = (BEREICHE.find((t) => winkel < t.bis) ?? BEREICHE[0]).ton;

  // --- Farben, die einen eigenen Namen haben -------------------------------
  // "helles Braun" wuerde niemand sagen, wenn Beige gemeint ist, und ein
  // dunkles Orange heisst Braun. Diese Faelle vor der Stufe abfangen.

  // Beige: der ganze warme Bereich, wenig Buntheit, hell.
  if (winkel >= 40 && winkel < 115 && buntheit < 25 && L >= 65) {
    return { ton: "farbton.beige", stufe: L >= 88 ? "farbstufe.hell" : null };
  }
  if (grund === "farbton.rot") {
    // Helles Rot ist Rosa. Dunkles Rot ist Weinrot, wenn es kraeftig bleibt,
    // sonst Braun – ein stumpfes Dunkelrot sieht braun aus.
    if (L >= 72) return { ton: "farbton.rosa", stufe: L >= 85 ? "farbstufe.hell" : null };
    if (L < 45) {
      return buntheit >= 40
        ? { ton: "farbton.weinrot", stufe: L < 28 ? "farbstufe.dunkel" : null }
        : { ton: "farbton.braun", stufe: L < 28 ? "farbstufe.dunkel" : null };
    }
  }
  if (grund === "farbton.rosa" && L < 45) {
    // Dunkles Rosa gibt es nicht – das ist Weinrot.
    return { ton: "farbton.weinrot", stufe: L < 28 ? "farbstufe.dunkel" : null };
  }
  if (grund === "farbton.orange" && L < 60) {
    return { ton: "farbton.braun", stufe: L < 32 ? "farbstufe.dunkel" : null };
  }
  if (grund === "farbton.gelb" && L < 70) {
    return { ton: "farbton.oliv", stufe: L < 35 ? "farbstufe.dunkel" : null };
  }

  return { ton: grund, stufe: stufe(L) };
}

function stufe(L: number): Textschluessel | null {
  if (L >= 85) return "farbstufe.sehrHell";
  if (L >= 70) return "farbstufe.hell";
  if (L >= 40) return null;
  if (L >= 22) return "farbstufe.dunkel";
  return "farbstufe.sehrDunkel";
}

/**
 * Den Namen zeigen, den der Hersteller vergeben hat – und wenn es keinen
 * gibt, die Farbe beschreiben.
 */
export function garnname(
  name: string,
  hex: string,
  t: (schluessel: Textschluessel, werte?: Record<string, string>) => string,
): string {
  if (name.trim() !== "") return name;
  const wort = farbwort(hex);
  return wort.stufe
    ? t("farbwort.zusammen", { stufe: t(wort.stufe), ton: t(wort.ton) })
    : t(wort.ton);
}
