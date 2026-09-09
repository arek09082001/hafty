/**
 * CIEDE2000 – der Farbabstand, mit dem in dieser App gerechnet wird.
 * ---------------------------------------------------------------------------
 *
 * Der einfache euklidische Abstand im Lab-Raum (CIE76) ist eine grobe
 * Naeherung. Er ueberschaetzt Unterschiede bei kraeftigen Farben und
 * unterschaetzt sie bei fast-grauen Toenen; ausserdem behandelt er Blau
 * schlecht. Fuer die Frage "welches Garn sieht dieser Farbe am
 * aehnlichsten?" faellt das auf: mit CIE76 landet man bei Hauttoenen und
 * Grautoenen regelmaessig auf dem falschen Garn.
 *
 * CIEDE2000 korrigiert das mit vier Zusaetzen:
 *   - einer Streckung der a*-Achse fuer schwach gesaettigte Farben (G),
 *   - Gewichtungsfunktionen S_L, S_C, S_H, die Helligkeit, Buntheit und
 *     Farbton je nach Ort im Farbraum unterschiedlich stark zaehlen,
 *   - einem Drehterm R_T, der die bekannte Blau-Schwaeche ausgleicht,
 *   - den Parametern k_L, k_C, k_H fuer Betrachtungsbedingungen; hier
 *     durchgaengig 1 (Referenzbedingungen).
 *
 * Rechenaufwand: gemappt wird auf Clusterebene, nicht pro Rasterfeld. Bei
 * 24 Farben und 500 Garntoenen sind das 12.000 Aufrufe – dafuer reicht
 * CIEDE2000 problemlos. Innerhalb der Glaettung, wo pro Feld und Farbe ein
 * Abstand gebraucht wird, wird stattdessen mit einer vorberechneten
 * Abstandstabelle gearbeitet (siehe glaettung.ts).
 */

import type { Lab } from "./lab";

const GRAD = 180 / Math.PI;
const BOGEN = Math.PI / 180;

/**
 * Farbabstand zweier Lab-Farben nach CIEDE2000.
 * Ergebnis 0 = identisch. Werte unter ~1 gelten als fuer das Auge nicht
 * unterscheidbar, ab ~5 sieht man deutlich zwei verschiedene Farben.
 */
export function ciede2000(f1: Lab, f2: Lab): number {
  const { L: L1, a: a1, b: b1 } = f1;
  const { L: L2, a: a2, b: b2 } = f2;

  // --- Buntheit im Ausgangszustand -----------------------------------------
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cmittel = (C1 + C2) / 2;

  // --- G: Streckung der a*-Achse -------------------------------------------
  // Bei kleinen Buntheiten (nahe Grau) wird a* um bis zu 50 % gestreckt.
  // Der Term 25^7 sorgt dafuer, dass der Effekt bei kraeftigen Farben
  // praktisch verschwindet.
  const C7 = Math.pow(Cmittel, 7);
  const G = 0.5 * (1 - Math.sqrt(C7 / (C7 + 6103515625))); // 25^7 = 6103515625

  const a1s = (1 + G) * a1;
  const a2s = (1 + G) * a2;

  const C1s = Math.sqrt(a1s * a1s + b1 * b1);
  const C2s = Math.sqrt(a2s * a2s + b2 * b2);

  // --- Farbtonwinkel in Grad, 0..360 ---------------------------------------
  const h1s = winkel(b1, a1s);
  const h2s = winkel(b2, a2s);

  // --- Die drei Differenzen ------------------------------------------------
  const dL = L2 - L1;
  const dC = C2s - C1s;

  // Der Farbtonunterschied wird immer auf dem kuerzeren Bogen gemessen.
  let dh: number;
  if (C1s * C2s === 0) {
    dh = 0; // mindestens eine Farbe ist unbunt, dann gibt es keinen Farbton
  } else {
    dh = h2s - h1s;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(C1s * C2s) * Math.sin((dh / 2) * BOGEN);

  // --- Mittelwerte fuer die Gewichtungen -----------------------------------
  const Lmittel = (L1 + L2) / 2;
  const Cmittels = (C1s + C2s) / 2;

  let hmittel: number;
  if (C1s * C2s === 0) {
    hmittel = h1s + h2s;
  } else {
    const summe = h1s + h2s;
    const abstand = Math.abs(h1s - h2s);
    if (abstand <= 180) hmittel = summe / 2;
    else if (summe < 360) hmittel = (summe + 360) / 2;
    else hmittel = (summe - 360) / 2;
  }

  // T beschreibt, wie empfindlich das Auge in diesem Farbtonbereich ist.
  const T =
    1 -
    0.17 * Math.cos((hmittel - 30) * BOGEN) +
    0.24 * Math.cos(2 * hmittel * BOGEN) +
    0.32 * Math.cos((3 * hmittel + 6) * BOGEN) -
    0.20 * Math.cos((4 * hmittel - 63) * BOGEN);

  // --- Gewichtungsfunktionen -----------------------------------------------
  // S_L: mittlere Helligkeiten werden feiner unterschieden als sehr helle
  // oder sehr dunkle.
  const dLm = Lmittel - 50;
  const S_L = 1 + (0.015 * dLm * dLm) / Math.sqrt(20 + dLm * dLm);
  // S_C und S_H: je bunter, desto groesser darf der Unterschied sein.
  const S_C = 1 + 0.045 * Cmittels;
  const S_H = 1 + 0.015 * Cmittels * T;

  // --- R_T: Drehterm im Blaubereich ----------------------------------------
  const dTheta = 30 * Math.exp(-Math.pow((hmittel - 275) / 25, 2));
  const Cm7 = Math.pow(Cmittels, 7);
  const R_C = 2 * Math.sqrt(Cm7 / (Cm7 + 6103515625));
  const R_T = -Math.sin(2 * dTheta * BOGEN) * R_C;

  // --- Zusammenbau ----------------------------------------------------------
  const termL = dL / S_L; // k_L = 1
  const termC = dC / S_C; // k_C = 1
  const termH = dH / S_H; // k_H = 1

  return Math.sqrt(termL * termL + termC * termC + termH * termH + R_T * termC * termH);
}

/** atan2 in Grad, auf 0..360 gebracht. */
function winkel(b: number, a: number): number {
  if (a === 0 && b === 0) return 0;
  const w = Math.atan2(b, a) * GRAD;
  return w >= 0 ? w : w + 360;
}
