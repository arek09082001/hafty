"use client";

/**
 * Gespeicherte Stände – die Zeitreise durch ein Muster.
 * ---------------------------------------------------------------------------
 *
 * Jedes Mal, wenn ein Muster neu erzeugt wird, entsteht ein Schnappschuss:
 * Raster, Palette, ein kleines Vorschaubild und der Zeitpunkt. Die Nutzerin
 * kann Wochen später zu jedem davon zurück.
 *
 * Geschrieben wird immer zuerst in den Browser (IndexedDB): das geht ohne
 * Verbindung und dauert Millisekunden. Jeder neue Stand wird zusätzlich für
 * die Sicherung in der Ferne vorgemerkt (siehe abgleichliste.ts); ob es sie
 * gibt, entscheidet allein die Einrichtung – ohne sie bleibt alles wie
 * bisher auf dem Gerät.
 *
 * Aufgeräumt wird nach der Regel: die letzten 20 automatischen Stände
 * bleiben, gemerkte nie löschen, und ein Stand, an dem ein anderer als
 * Elternteil hängt, bleibt ebenfalls stehen – sonst risse der Baum
 * auseinander.
 */

import { hexNachRgb } from "@/lib/farbe/lab";
import { rasterPacken, rasterEntpacken } from "./rle";
import { browserdatenbank, entpacken, packen, LADEN_STAENDE } from "./browserspeicher";
import { vormerken } from "./abgleichliste";
import type { Einstellungen, PalettenEintrag } from "@/lib/muster/typen";
import { LANDESKENNUNG, type Sprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

/** So viele automatische Stände bleiben erhalten. Gemerkte nie löschen. */
const AUTOMATISCH_BEHALTEN = 20;

export type Stand = {
  id: string;
  musterId: string;
  elternId: string | null;
  /** Warum dieser Stand entstanden ist – als Textschlüssel. */
  beschriftung: Textschluessel;
  gemerkt: boolean;
  angelegtAm: string;
  farben: number;
  /**
   * Die Maße in Stichen. Stände aus der Zeit vor dem Vergleichen kennen sie
   * nicht – sie stecken dort nur im gepackten Raster. Dann bleibt hier
   * `null`, und die Maße stehen erst da, wenn der Stand geöffnet wird.
   */
  breite: number | null;
  hoehe: number | null;
  vorschauUrl: string | null;
  palette: PalettenEintrag[];
  einstellungen: Einstellungen | null;
};

export type StandInhalt = {
  breite: number;
  hoehe: number;
  basis: Uint8Array;
  bearbeitung: Int16Array;
  palette: PalettenEintrag[];
};

/** So liegt ein Stand in der Datenbank. */
export type Standsatz = {
  id: string;
  musterId: string;
  elternId: string | null;
  beschriftung: Textschluessel;
  gemerkt: boolean;
  angelegtAm: string;
  palette: PalettenEintrag[];
  /** Raster als RLE, danach zusammengedrückt. */
  raster: Uint8Array;
  vorschau: Blob | null;
  einstellungen: Einstellungen;
  /** Die Maße in Stichen, damit sie in der Liste stehen können. */
  breite?: number;
  hoehe?: number;
};

/** Ein kleines Vorschaubild des Musters (höchstens 240 Bildpunkte breit). */
async function vorschauBauen(
  breite: number,
  hoehe: number,
  raster: Uint8Array,
  palette: PalettenEintrag[],
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;

  const klein = document.createElement("canvas");
  klein.width = breite;
  klein.height = hoehe;
  const kleinStift = klein.getContext("2d");
  if (!kleinStift) return null;

  const bild = kleinStift.createImageData(breite, hoehe);
  const farben = palette.map((p) => hexNachRgb(p.hex));
  for (let i = 0; i < raster.length; i++) {
    const farbe = farben[raster[i]] ?? [255, 255, 255];
    bild.data[i * 4] = farbe[0];
    bild.data[i * 4 + 1] = farbe[1];
    bild.data[i * 4 + 2] = farbe[2];
    bild.data[i * 4 + 3] = 255;
  }
  kleinStift.putImageData(bild, 0, 0);

  const faktor = Math.min(1, 240 / Math.max(breite, hoehe));
  const gross = document.createElement("canvas");
  gross.width = Math.max(1, Math.round(breite * faktor));
  gross.height = Math.max(1, Math.round(hoehe * faktor));
  const grossStift = gross.getContext("2d");
  if (!grossStift) return null;
  grossStift.imageSmoothingEnabled = false;
  grossStift.drawImage(klein, 0, 0, gross.width, gross.height);

  return new Promise((aufloesen) => gross.toBlob((b) => aufloesen(b), "image/png"));
}

/** Legt einen Stand an. Gibt es das Muster noch nicht, bekommt es hier seine Kennung. */
export async function standSichern(argumente: {
  musterId: string | null;
  elternId: string | null;
  name: string;
  beschriftung: Textschluessel;
  gemerkt: boolean;
  breite: number;
  hoehe: number;
  basis: Uint8Array;
  bearbeitung: Int16Array;
  raster: Uint8Array;
  palette: PalettenEintrag[];
  einstellungen: Einstellungen;
  quellbild: Blob | null;
}): Promise<{ musterId: string; standId: string } | null> {
  try {
    const db = await browserdatenbank();
    const musterId = argumente.musterId ?? crypto.randomUUID();
    const standId = crypto.randomUUID();

    const satz: Standsatz = {
      id: standId,
      musterId,
      elternId: argumente.elternId,
      beschriftung: argumente.beschriftung,
      gemerkt: argumente.gemerkt,
      angelegtAm: new Date().toISOString(),
      palette: argumente.palette,
      raster: await packen(
        rasterPacken({
          breite: argumente.breite,
          hoehe: argumente.hoehe,
          basis: argumente.basis,
          bearbeitung: argumente.bearbeitung,
        }),
      ),
      vorschau: await vorschauBauen(
        argumente.breite,
        argumente.hoehe,
        argumente.raster,
        argumente.palette,
      ),
      einstellungen: argumente.einstellungen,
      breite: argumente.breite,
      hoehe: argumente.hoehe,
    };

    await db.put(LADEN_STAENDE, satz);
    // Für die Sicherung in der Ferne vormerken. Ob und wann sie stattfindet,
    // entscheidet lib/ferne – hier wird nur notiert, dass es sie noch nicht
    // gegeben hat.
    await vormerken("stand", standId);
    return { musterId, standId };
  } catch {
    return null;
  }
}

/** Alle Stände eines Musters, der neueste zuerst. */
export async function staendeLaden(musterId: string): Promise<Stand[]> {
  const db = await browserdatenbank();
  const saetze = (await db.getAllFromIndex(LADEN_STAENDE, "musterId", musterId)) as Standsatz[];
  return saetze.sort((a, b) => b.angelegtAm.localeCompare(a.angelegtAm)).map(alsStand);
}

/**
 * Aus einem abgelegten Satz das, was Listen und Leisten davon zeigen.
 *
 * Die Adresse des Vorschaubildes gilt nur, solange die Seite offen ist –
 * das genügt, sie wird ausschließlich fürs Anzeigen gebraucht.
 */
function alsStand(s: Standsatz): Stand {
  return {
    id: s.id,
    musterId: s.musterId,
    elternId: s.elternId,
    beschriftung: s.beschriftung,
    gemerkt: s.gemerkt,
    angelegtAm: s.angelegtAm,
    farben: s.palette.length,
    breite: s.breite ?? null,
    hoehe: s.hoehe ?? null,
    vorschauUrl: s.vorschau ? URL.createObjectURL(s.vorschau) : null,
    palette: s.palette,
    einstellungen: s.einstellungen ?? null,
  };
}

/** Nur die neuesten Stände eines Musters – für die Startseite. */
export async function staendeKurz(musterId: string, hoechstens: number): Promise<Stand[]> {
  try {
    const db = await browserdatenbank();
    const saetze = (await db.getAllFromIndex(LADEN_STAENDE, "musterId", musterId)) as Standsatz[];
    return saetze
      .sort((a, b) => b.angelegtAm.localeCompare(a.angelegtAm))
      .slice(0, hoechstens)
      .map(alsStand);
  } catch {
    return [];
  }
}

/** Wie viele Stände es zu einem Muster gibt. */
export async function staendeZaehlen(musterId: string): Promise<number> {
  try {
    const db = await browserdatenbank();
    return await db.countFromIndex(LADEN_STAENDE, "musterId", musterId);
  } catch {
    return 0;
  }
}

/** Einen abgelegten Satz unverändert holen bzw. schreiben – für den Abgleich. */
export async function standSatzHolen(id: string): Promise<Standsatz | null> {
  try {
    const db = await browserdatenbank();
    return ((await db.get(LADEN_STAENDE, id)) as Standsatz | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function standSatzSchreiben(satz: Standsatz): Promise<void> {
  const db = await browserdatenbank();
  await db.put(LADEN_STAENDE, satz);
}

/** Den Inhalt eines Standes holen. */
export async function standHolen(stand: Stand): Promise<StandInhalt | null> {
  try {
    const db = await browserdatenbank();
    const satz = (await db.get(LADEN_STAENDE, stand.id)) as Standsatz | undefined;
    if (!satz) return null;
    const entpackt = rasterEntpacken(await entpacken(satz.raster));
    return { ...entpackt, palette: satz.palette };
  } catch {
    return null;
  }
}

/** „Diesen Stand merken" – der Schnappschuss wird dauerhaft geschützt. */
export async function standMerken(standId: string, gemerkt: boolean): Promise<boolean> {
  try {
    const db = await browserdatenbank();
    const satz = (await db.get(LADEN_STAENDE, standId)) as Standsatz | undefined;
    if (!satz) return false;
    await db.put(LADEN_STAENDE, { ...satz, gemerkt });
    await vormerken("stand", standId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Aufräumen: die letzten 20 automatischen Stände bleiben, gemerkte Stände
 * werden nie gelöscht. Auch ein Stand, an dem ein anderer als Elternteil
 * hängt, bleibt stehen – sonst risse der Baum auseinander.
 */
export async function aufraeumen(musterId: string): Promise<void> {
  try {
    const db = await browserdatenbank();
    const saetze = (await db.getAllFromIndex(LADEN_STAENDE, "musterId", musterId)) as Standsatz[];
    const eltern = new Set(saetze.map((s) => s.elternId).filter(Boolean) as string[]);

    const wegwerfbar = saetze
      .filter((s) => !s.gemerkt && !eltern.has(s.id))
      .sort((a, b) => b.angelegtAm.localeCompare(a.angelegtAm));

    for (const s of wegwerfbar.slice(AUTOMATISCH_BEHALTEN)) {
      await db.delete(LADEN_STAENDE, s.id);
    }
  } catch {
    // Aufräumen ist Kür. Klappt es nicht, bleibt eben ein Stand mehr liegen.
  }
}

/** Zeitpunkt eines Standes in der eingestellten Sprache. */
export function zeitpunktText(
  iso: string,
  sprache: Sprache,
  t: (schluessel: Textschluessel, werte?: Record<string, string>) => string,
): string {
  const kennung = LANDESKENNUNG[sprache];
  const zeit = new Date(iso);
  const uhr = zeit.toLocaleTimeString(kennung, { hour: "2-digit", minute: "2-digit" });

  const heute = new Date();
  const gleicherTag = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (gleicherTag(zeit, heute)) return t("staende.heute", { uhr });

  const gestern = new Date(heute);
  gestern.setDate(heute.getDate() - 1);
  if (gleicherTag(zeit, gestern)) return t("staende.gestern", { uhr });

  return t("staende.datum", {
    datum: zeit.toLocaleDateString(kennung, { day: "numeric", month: "long" }),
    uhr,
  });
}
