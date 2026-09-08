"use client";

/**
 * Garnfarben und der eigene Garnvorrat – beides ohne Netz.
 *
 * Der Katalog liegt fest im Programm (src/lib/garne/katalog-daten.ts). Er
 * ändert sich nur, wenn eine neue Fassung der App ausgeliefert wird, also
 * gibt es keinen Grund, ihn über das Netz zu holen. Damit steht er sofort
 * bereit, auch beim allerersten Start ohne Verbindung.
 *
 * Welche Garne zu Hause liegen, merkt sich der Browser (IndexedDB). Die App
 * hat keine Anmeldung und ist für ein Gerät gedacht; damit ist das der
 * richtige Ort.
 */

import { hexNachLab } from "@/lib/farbe/lab";
import { GARNE, MARKE } from "@/lib/garne/katalog-daten";
import { browserdatenbank, LADEN_VORRAT } from "./browserspeicher";
import type { Garn } from "@/lib/muster/typen";

export type GarnMitVorrat = Garn & { imVorrat: boolean };

/**
 * Der Katalog, einmal je Sitzung aufgebaut.
 *
 * Die Lab-Werte werden hier aus den Hexwerten gerechnet – 375 Umrechnungen,
 * unter einer Millisekunde. Zur Laufzeit sind dann nur noch Abstände zu
 * rechnen und nie mehr eine Farbraumumrechnung.
 */
let katalog: Garn[] | null = null;

function katalogHolen(): Garn[] {
  if (!katalog) {
    katalog = GARNE.map(([code, hex]) => {
      const lab = hexNachLab(hex);
      // Die Kennung ist die Nummer selbst. Sie ist eindeutig, bleibt über
      // Fassungen hinweg dieselbe und ist beim Nachsehen lesbar.
      return { id: `${MARKE}-${code}`, marke: MARKE, code, name: "", hex, L: lab.L, a: lab.a, b: lab.b };
    });
  }
  return katalog;
}

async function vorratLesen(): Promise<Set<string>> {
  try {
    const db = await browserdatenbank();
    const liste = (await db.get(LADEN_VORRAT, "meine")) as string[] | undefined;
    return new Set(liste ?? []);
  } catch {
    // Ein Browser im privaten Modus kann IndexedDB verweigern. Dann gibt es
    // eben keinen gemerkten Vorrat – die Farbtafel steht trotzdem.
    return new Set();
  }
}

async function vorratSchreiben(meine: Set<string>): Promise<boolean> {
  try {
    const db = await browserdatenbank();
    await db.put(LADEN_VORRAT, [...meine], "meine");
    return true;
  } catch {
    return false;
  }
}

/** Den ganzen Katalog holen, dazu die Kennzeichnung „habe ich zu Hause“. */
export async function garneLaden(): Promise<GarnMitVorrat[]> {
  const meine = await vorratLesen();
  return katalogHolen().map((g) => ({ ...g, imVorrat: meine.has(g.id) }));
}

/** Ein Garn in den eigenen Vorrat aufnehmen. */
export async function vorratAufnehmen(garnId: string): Promise<boolean> {
  const meine = await vorratLesen();
  meine.add(garnId);
  return vorratSchreiben(meine);
}

/** Ein Garn wieder aus dem Vorrat nehmen. */
export async function vorratEntfernen(garnId: string): Promise<boolean> {
  const meine = await vorratLesen();
  meine.delete(garnId);
  return vorratSchreiben(meine);
}

/** Viele Garne auf einmal aufnehmen – für „alle Farben eintragen“. */
export async function vorratAlleAufnehmen(garnIds: string[]): Promise<boolean> {
  const meine = await vorratLesen();
  for (const id of garnIds) meine.add(id);
  return vorratSchreiben(meine);
}

/** Den ganzen Vorrat leeren. */
export async function vorratLeeren(): Promise<boolean> {
  return vorratSchreiben(new Set());
}
