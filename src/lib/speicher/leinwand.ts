"use client";

/**
 * Eine leere Kanwa anlegen.
 * ---------------------------------------------------------------------------
 *
 * Bis hierher fing jedes Muster mit einem Foto an. Wer aber ein Alphabet, eine
 * Bordüre oder eine Sammlung eigener Motive sticken will, hat kein Foto – er
 * hat ein leeres Stück Stoff im Kopf und legt darauf los.
 *
 * Angelegt wird die leere Kanwa auf demselben Weg, auf dem auch ein
 * gespeichertes Projekt geöffnet wird: sie wird zum **Arbeitsstand**
 * geschrieben, und Schritt 3 holt ihn von dort ab (siehe `projektOeffnen`).
 * So gibt es weiterhin nur einen Weg in ein Muster hinein und keine zweite
 * Mechanik, die mit der ersten auseinanderlaufen könnte.
 *
 * Alle Felder stehen auf LEER: unbestickter Stoff. Die Palette ist leer;
 * Farben kommen im Editor dazu, eine nach der anderen.
 */

import { arbeitsstandSichern } from "./browserspeicher";
import { LEER, STANDARD_EINSTELLUNGEN } from "@/lib/muster/typen";

export async function leereKanwaAnlegen(angaben: {
  name: string;
  breite: number;
  hoehe: number;
  stoffzaehlung: number;
}): Promise<boolean> {
  try {
    const felder = angaben.breite * angaben.hoehe;
    const basis = new Uint16Array(felder).fill(LEER);
    const bearbeitung = new Int16Array(felder).fill(-1);

    await arbeitsstandSichern({
      // Kein Projekt und kein Stand: beides entsteht, sobald zum ersten Mal
      // gesichert wird – genauso wie bei einem Muster aus einem Foto.
      musterId: null,
      versionId: null,
      name: angaben.name,
      breite: angaben.breite,
      hoehe: angaben.hoehe,
      basis,
      bearbeitung,
      palette: [],
      einstellungen: {
        ...STANDARD_EINSTELLUNGEN,
        breiteStiche: angaben.breite,
        stoffzaehlung: angaben.stoffzaehlung,
      },
      bild: null,
      bildName: angaben.name,
      bildMasse: null,
      bildAusschnitt: null,
      // „leer:“ sagt dem Editor, dass hinter diesem Muster kein Foto steht.
      bildKennung: `leer:${crypto.randomUUID()}`,
      gespeichertAm: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}
