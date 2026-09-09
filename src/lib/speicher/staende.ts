"use client";

/**
 * Gespeicherte Stände – die Zeitreise durch ein Muster.
 * ---------------------------------------------------------------------------
 *
 * Jedes Mal, wenn ein Muster neu erzeugt wird, entsteht ein Schnappschuss:
 * Raster, Palette, ein kleines Vorschaubild und der Zeitpunkt. Die Nutzerin
 * kann Wochen später zu jedem davon zurück.
 *
 * Alles liegt im Browser (IndexedDB), nichts im Netz. Das hat zwei Gründe:
 * die App soll ohne Verbindung vollständig sein, und sie hat keine
 * Anmeldung – ein Dienst dahinter brächte also niemandem etwas, was das
 * Gerät nicht schon leistet.
 *
 * Aufgeräumt wird nach der Regel: die letzten 20 automatischen Stände
 * bleiben, gemerkte nie löschen, und ein Stand, an dem ein anderer als
 * Elternteil hängt, bleibt ebenfalls stehen – sonst risse der Baum
 * auseinander.
 */

import { hexNachRgb } from "@/lib/farbe/lab";
import { rasterPacken, rasterEntpacken } from "./rle";
import { browserdatenbank, entpacken, packen, LADEN_STAENDE } from "./browserspeicher";
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
  vorschauUrl: string | null;
  palette: PalettenEintrag[];
};

export type StandInhalt = {
  breite: number;
  hoehe: number;
  basis: Uint16Array;
  bearbeitung: Int16Array;
  palette: PalettenEintrag[];
};

/** So liegt ein Stand in der Datenbank. */
type Abgelegt = {
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
};

/** Ein kleines Vorschaubild des Musters (höchstens 240 Bildpunkte breit). */
async function vorschauBauen(
  breite: number,
  hoehe: number,
  raster: Uint16Array,
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
  basis: Uint16Array;
  bearbeitung: Int16Array;
  raster: Uint16Array;
  palette: PalettenEintrag[];
  einstellungen: Einstellungen;
  quellbild: Blob | null;
}): Promise<{ musterId: string; standId: string } | null> {
  try {
    const db = await browserdatenbank();
    const musterId = argumente.musterId ?? crypto.randomUUID();
    const standId = crypto.randomUUID();

    const satz: Abgelegt = {
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
    };

    await db.put(LADEN_STAENDE, satz);
    return { musterId, standId };
  } catch {
    return null;
  }
}

/** Alle Stände eines Musters, der neueste zuerst. */
export async function staendeLaden(musterId: string): Promise<Stand[]> {
  const db = await browserdatenbank();
  const saetze = (await db.getAllFromIndex(LADEN_STAENDE, "musterId", musterId)) as Abgelegt[];
  return saetze
    .sort((a, b) => b.angelegtAm.localeCompare(a.angelegtAm))
    .map((s) => ({
      id: s.id,
      musterId: s.musterId,
      elternId: s.elternId,
      beschriftung: s.beschriftung,
      gemerkt: s.gemerkt,
      angelegtAm: s.angelegtAm,
      farben: s.palette.length,
      // Die Adresse gilt nur, solange die Seite offen ist – das genügt, sie
      // wird ausschliesslich für das Vorschaubild in der Leiste gebraucht.
      vorschauUrl: s.vorschau ? URL.createObjectURL(s.vorschau) : null,
      palette: s.palette,
    }));
}

/** Den Inhalt eines Standes holen. */
export async function standHolen(stand: Stand): Promise<StandInhalt | null> {
  try {
    const db = await browserdatenbank();
    const satz = (await db.get(LADEN_STAENDE, stand.id)) as Abgelegt | undefined;
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
    const satz = (await db.get(LADEN_STAENDE, standId)) as Abgelegt | undefined;
    if (!satz) return false;
    await db.put(LADEN_STAENDE, { ...satz, gemerkt });
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
    const saetze = (await db.getAllFromIndex(LADEN_STAENDE, "musterId", musterId)) as Abgelegt[];
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
