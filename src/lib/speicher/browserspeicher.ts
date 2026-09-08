"use client";

/**
 * Sicherung im Browser.
 *
 * Zwei getrennte Dinge, die nicht verwechselt werden dürfen:
 *
 *  - Hier liegt das **Arbeitsraster**, laufend mitgeschrieben, damit ein
 *    Browserabsturz oder ein versehentlich geschlossener Reiter nichts
 *    kostet. Das ist kein Archiv: es gibt immer nur den aktuellen Stand.
 *  - Die **gespeicherten Stände**, zu denen die Nutzerin auch Wochen später
 *    zurückkann, liegen im Supabase Storage (siehe lib/speicher/staende.ts).
 */

import { openDB, type IDBPDatabase } from "idb";
import { rasterPacken, rasterEntpacken } from "./rle";
import type { Einstellungen, PalettenEintrag } from "@/lib/muster/typen";

const DATENBANK = "stickmuster";
const AUSGABE = 1;
const LADEN = "arbeit";
const SCHLUESSEL = "aktuell";

export type Arbeitsstand = {
  musterId: string | null;
  name: string;
  breite: number;
  hoehe: number;
  basis: Uint8Array;
  bearbeitung: Int16Array;
  palette: PalettenEintrag[];
  einstellungen: Einstellungen;
  /** Das Quellbild, damit nach einem Absturz nicht neu ausgesucht werden muss. */
  bild: Blob | null;
  bildName: string;
  /** Maße des Quellbildes, damit sie nach dem Laden nicht neu ermittelt werden müssen. */
  bildMasse: { breite: number; hoehe: number } | null;
  /** Der gewaehlte Bildausschnitt, damit er beim Wiederkommen erhalten bleibt. */
  bildAusschnitt: { x: number; y: number; breite: number; hoehe: number } | null;
  /** Kennung des Bildes – daran hängt, ob Handbearbeitungen weitergelten. */
  bildKennung: string;
  gespeichertAm: number;
};

/** Wie der Stand tatsächlich in der Datenbank liegt: Raster gepackt. */
type Abgelegt = Omit<Arbeitsstand, "basis" | "bearbeitung"> & { raster: Uint8Array };

let verbindung: Promise<IDBPDatabase> | null = null;

function datenbank() {
  if (!verbindung) {
    verbindung = openDB(DATENBANK, AUSGABE, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(LADEN)) db.createObjectStore(LADEN);
      },
    });
  }
  return verbindung;
}

export async function arbeitsstandSichern(stand: Arbeitsstand): Promise<void> {
  try {
    const db = await datenbank();
    const abgelegt: Abgelegt = {
      musterId: stand.musterId,
      name: stand.name,
      breite: stand.breite,
      hoehe: stand.hoehe,
      palette: stand.palette,
      einstellungen: stand.einstellungen,
      bild: stand.bild,
      bildName: stand.bildName,
      bildMasse: stand.bildMasse,
      bildAusschnitt: stand.bildAusschnitt,
      bildKennung: stand.bildKennung,
      gespeichertAm: Date.now(),
      raster: rasterPacken({
        breite: stand.breite,
        hoehe: stand.hoehe,
        basis: stand.basis,
        bearbeitung: stand.bearbeitung,
      }),
    };
    await db.put(LADEN, abgelegt, SCHLUESSEL);
  } catch {
    // Ist der Speicher voll oder gesperrt (privates Fenster), darf das die
    // Arbeit nicht unterbrechen. Die Nutzerin merkt davon nichts.
  }
}

export async function arbeitsstandLaden(): Promise<Arbeitsstand | null> {
  try {
    const db = await datenbank();
    const abgelegt = (await db.get(LADEN, SCHLUESSEL)) as Abgelegt | undefined;
    if (!abgelegt) return null;

    const entpackt = rasterEntpacken(abgelegt.raster);
    return {
      musterId: abgelegt.musterId,
      name: abgelegt.name,
      breite: entpackt.breite,
      hoehe: entpackt.hoehe,
      basis: entpackt.basis,
      bearbeitung: entpackt.bearbeitung,
      palette: abgelegt.palette,
      einstellungen: abgelegt.einstellungen,
      bild: abgelegt.bild,
      bildName: abgelegt.bildName,
      bildMasse: abgelegt.bildMasse ?? null,
      bildAusschnitt: abgelegt.bildAusschnitt ?? null,
      bildKennung: abgelegt.bildKennung ?? crypto.randomUUID(),
      gespeichertAm: abgelegt.gespeichertAm,
    };
  } catch {
    return null;
  }
}

export async function arbeitsstandLoeschen(): Promise<void> {
  try {
    const db = await datenbank();
    await db.delete(LADEN, SCHLUESSEL);
  } catch {
    // siehe oben
  }
}

// ---------------------------------------------------------------------------
// gzip – für die Dateien, die in den Supabase Storage gehen
// ---------------------------------------------------------------------------

/**
 * Die Lauflängenkodierung allein reicht für ein geglättetes Muster völlig
 * aus. Ein zusätzliches gzip kostet nichts und deckt den einen ungünstigen
 * Fall ab, in dem die Nutzerin ohne Glättung und mit sehr vielen Farben
 * arbeitet.
 */
export async function packen(daten: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") return daten;
  const strom = new Blob([daten as BlobPart]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

export async function entpacken(daten: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") return daten;
  const strom = new Blob([daten as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}
