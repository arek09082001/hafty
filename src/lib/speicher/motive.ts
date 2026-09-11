"use client";

/**
 * Motive: gespeicherte Ausschnitte, die über Muster hinweg erhalten bleiben.
 *
 * Sie liegen im Browser (IndexedDB) – wie alle Raster lauflängenkodiert und
 * danach zusammengedrückt, dazu ein kleines Vorschaubild, damit die Liste
 * nicht erst alle Daten laden muss, um etwas zeigen zu können.
 *
 * Kein Netz, kein Dienst: die App ist auch ohne Verbindung vollständig.
 */

import { browserdatenbank, entpacken, packen, LADEN_MOTIVE } from "./browserspeicher";
import type { Ausschnitt } from "@/lib/muster/raster";
import { LEER, type PalettenEintrag } from "@/lib/muster/typen";
import { hexNachRgb } from "@/lib/farbe/lab";

export type Motiv = {
  id: string;
  name: string;
  w: number;
  h: number;
  vorschauUrl: string | null;
  palette: PalettenEintrag[];
};

/** So liegt ein Motiv in der Datenbank. */
type Abgelegt = {
  id: string;
  name: string;
  w: number;
  h: number;
  palette: PalettenEintrag[];
  daten: Uint8Array;
  vorschau: Blob | null;
  angelegtAm: string;
  /** Fehlt bei Motiven, die vor der zweiten Fassung gespeichert wurden. */
  fassung?: number;
};

/**
 * Fassung des gepackten Ausschnitts.
 *
 * In Fassung 1 stand je Lauf ein Byte für den Farbwert – mehr brauchte es
 * nicht, solange ein Muster höchstens 255 Farben hatte. Seit die Farbanzahl
 * bis an den Garnkatalog heranreicht, sind es zwei Byte, und das freie Feld
 * heißt LEER statt 255. Ältere Motive werden beim Lesen umgeschrieben.
 */
const FASSUNG = 2;

/** So hieß das freie Feld in Fassung 1. */
const LEER_V1 = 255;

/**
 * Ein Motiv besteht aus zwei gleich langen Ebenen: den Farbindizes und der
 * Maske. Beide werden hintereinander lauflängenkodiert.
 *
 * Ein Lauf sind fünf Byte: uint16 Wert, uint24 Länge.
 */
function ausschnittPacken(a: Ausschnitt): Uint8Array {
  const kopf = new Uint8Array(8);
  new DataView(kopf.buffer).setUint32(0, a.w, true);
  new DataView(kopf.buffer).setUint32(4, a.h, true);

  const laeufe = (werte: Uint16Array | Uint8Array) => {
    const teile: number[] = [];
    let i = 0;
    while (i < werte.length) {
      const wert = werte[i];
      let laenge = 1;
      while (i + laenge < werte.length && werte[i + laenge] === wert) laenge++;
      teile.push(
        wert & 0xff,
        (wert >> 8) & 0xff,
        laenge & 0xff,
        (laenge >> 8) & 0xff,
        (laenge >> 16) & 0xff,
      );
      i += laenge;
    }
    return teile;
  };

  const daten = laeufe(a.daten);
  const maske = laeufe(a.maske);
  const puffer = new Uint8Array(8 + 8 + daten.length + maske.length);
  puffer.set(kopf, 0);
  new DataView(puffer.buffer).setUint32(8, daten.length, true);
  new DataView(puffer.buffer).setUint32(12, maske.length, true);
  puffer.set(daten, 16);
  puffer.set(maske, 16 + daten.length);
  return puffer;
}

function ausschnittEntpacken(
  roh: Uint8Array,
  palette: PalettenEintrag[],
  fassung: number,
): Ausschnitt {
  const sicht = new DataView(roh.buffer, roh.byteOffset, roh.byteLength);
  const w = sicht.getUint32(0, true);
  const h = sicht.getUint32(4, true);
  const datenLaenge = sicht.getUint32(8, true);

  // Fassung 1: ein Byte Wert, drei Byte Länge. Fassung 2: zwei und drei.
  const wertBytes = fassung >= 2 ? 2 : 1;

  const lesen = (start: number, laenge: number, ziel: Uint16Array | Uint8Array) => {
    let pos = start;
    let schreib = 0;
    const ende = start + laenge;
    while (pos < ende && schreib < ziel.length) {
      let wert = wertBytes === 2 ? roh[pos] | (roh[pos + 1] << 8) : roh[pos];
      if (fassung < 2 && wert === LEER_V1) wert = LEER;
      const p = pos + wertBytes;
      const anzahl = roh[p] | (roh[p + 1] << 8) | (roh[p + 2] << 16);
      pos = p + 3;
      ziel.fill(wert, schreib, Math.min(ziel.length, schreib + anzahl));
      schreib += anzahl;
    }
  };

  const daten = new Uint16Array(w * h);
  const maske = new Uint8Array(w * h);
  lesen(16, datenLaenge, daten);
  lesen(16 + datenLaenge, roh.length - 16 - datenLaenge, maske);

  return { w, h, daten, maske, palette };
}

/** Ein kleines PNG-Vorschaubild des Motivs erzeugen. */
async function vorschauBauen(a: Ausschnitt): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const leinwand = document.createElement("canvas");
  leinwand.width = a.w;
  leinwand.height = a.h;
  const stift = leinwand.getContext("2d");
  if (!stift) return null;

  const bild = stift.createImageData(a.w, a.h);
  const nachIndex = new Map(a.palette.map((p) => [p.index, hexNachRgb(p.hex)]));

  for (let i = 0; i < a.daten.length; i++) {
    const p = i * 4;
    // Außerhalb der Maske und auf freien Feldern bleibt das Bild
    // durchsichtig: beides wird nicht gestickt.
    if (!a.maske[i] || a.daten[i] === LEER) {
      bild.data[p + 3] = 0;
      continue;
    }
    const farbe = nachIndex.get(a.daten[i]) ?? [200, 200, 200];
    bild.data[p] = farbe[0];
    bild.data[p + 1] = farbe[1];
    bild.data[p + 2] = farbe[2];
    bild.data[p + 3] = 255;
  }
  stift.putImageData(bild, 0, 0);

  return new Promise((aufloesen) => leinwand.toBlob((b) => aufloesen(b), "image/png"));
}

/** Alle Motive holen, das neueste zuerst. */
export async function motiveLaden(): Promise<Motiv[]> {
  const db = await browserdatenbank();
  const saetze = (await db.getAll(LADEN_MOTIVE)) as Abgelegt[];
  return saetze
    .sort((a, b) => b.angelegtAm.localeCompare(a.angelegtAm))
    .map((m) => ({
      id: m.id,
      name: m.name,
      w: m.w,
      h: m.h,
      palette: m.palette,
      // Die Adresse gilt nur, solange die Seite offen ist – mehr braucht die
      // Liste nicht.
      vorschauUrl: m.vorschau ? URL.createObjectURL(m.vorschau) : null,
    }));
}

/** Ein Motiv speichern. */
export async function motivSpeichern(name: string, a: Ausschnitt): Promise<Motiv | null> {
  try {
    const db = await browserdatenbank();
    const id = crypto.randomUUID();
    const vorschau = await vorschauBauen(a);
    const satz: Abgelegt = {
      id,
      name,
      w: a.w,
      h: a.h,
      palette: a.palette,
      daten: await packen(ausschnittPacken(a)),
      vorschau,
      angelegtAm: new Date().toISOString(),
      fassung: FASSUNG,
    };
    await db.put(LADEN_MOTIVE, satz);
    return {
      id,
      name,
      w: a.w,
      h: a.h,
      palette: a.palette,
      vorschauUrl: vorschau ? URL.createObjectURL(vorschau) : null,
    };
  } catch {
    return null;
  }
}

/** Den Inhalt eines Motivs holen. */
export async function motivHolen(motiv: Motiv): Promise<Ausschnitt | null> {
  try {
    const db = await browserdatenbank();
    const satz = (await db.get(LADEN_MOTIVE, motiv.id)) as Abgelegt | undefined;
    if (!satz) return null;
    return ausschnittEntpacken(await entpacken(satz.daten), satz.palette, satz.fassung ?? 1);
  } catch {
    return null;
  }
}

/** Ein Motiv umbenennen. */
export async function motivUmbenennen(motiv: Motiv, name: string): Promise<boolean> {
  try {
    const db = await browserdatenbank();
    const satz = (await db.get(LADEN_MOTIVE, motiv.id)) as Abgelegt | undefined;
    if (!satz) return false;
    await db.put(LADEN_MOTIVE, { ...satz, name: name.trim() || satz.name });
    return true;
  } catch {
    return false;
  }
}

/** Ein Motiv löschen. */
export async function motivLoeschen(motiv: Motiv): Promise<boolean> {
  try {
    const db = await browserdatenbank();
    await db.delete(LADEN_MOTIVE, motiv.id);
    return true;
  } catch {
    return false;
  }
}
