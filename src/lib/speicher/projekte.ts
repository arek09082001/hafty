"use client";

/**
 * Projekte – ein Foto und alles, was daraus geworden ist.
 * ---------------------------------------------------------------------------
 *
 * Bis hierher kannte die App nur *ein* Muster: den Arbeitsstand. Wer ein
 * zweites Foto aussuchte, verlor das erste aus den Augen – die Stände lagen
 * zwar noch in der Datenbank, aber es führte kein Weg mehr zu ihnen zurück.
 *
 * Ein Projekt ist deshalb genau das, was die Nutzerin ohnehin im Kopf hat:
 * **ein hochgeladenes Bild**. Dazu gehören alle Stände, die daraus entstanden
 * sind – die mit 12 Farben, die mit 30, die schmale und die große.
 *
 * Zugeordnet wird **über den Dateinamen**. Wer „blume.jpg" ein zweites Mal
 * aussucht, arbeitet weiter an demselben Projekt und kann die neue Fassung
 * mit der alten vergleichen. Das ist die Ordnung, die eine Nutzerin von
 * selbst herstellt, wenn sie ihre Fotos benennt; eine zweite, die die App
 * sich ausdenkt, bräuchte niemand.
 *
 * Alles liegt weiter im Browser. Ob zusätzlich in die Ferne gesichert wird,
 * entscheidet `lib/ferne` – hier wird nur vorgemerkt.
 */

import {
  arbeitsstandLaden,
  arbeitsstandLoeschen,
  arbeitsstandSichern,
  browserdatenbank,
  entpacken,
  LADEN_PROJEKTE,
  LADEN_STAENDE,
} from "./browserspeicher";
import { rasterEntpacken } from "./rle";
import { vormerken } from "./abgleichliste";
import { staendeKurz, staendeZaehlen, type Stand } from "./staende";
import { einstellungenLesen, type Einstellungen, type PalettenEintrag } from "@/lib/muster/typen";
import type { Ausschnitt } from "@/lib/muster/ausschnitt";

/** So liegt ein Projekt in der Datenbank. */
export type Projektsatz = {
  id: string;
  /** Der Dateiname des Bildes – daran hängt die Zuordnung. */
  name: string;
  angelegtAm: string;
  zuletztAm: string;
  /** Das Quellbild in voller Größe, damit das Projekt neu gerechnet werden kann. */
  bild: Blob | null;
  /** Ein kleines Bild fürs Wiedererkennen auf der Startseite. */
  bildVorschau: Blob | null;
  bildMasse: { breite: number; hoehe: number } | null;
  bildAusschnitt: Ausschnitt | null;
  bildKennung: string;
  einstellungen: Einstellungen;
  /**
   * Ob das Quellfoto schon in der Ferne liegt. Es ändert sich nie und kann
   * 25 Megabyte haben – zweimal hochgeladen wird es deshalb nicht.
   */
  bildGesichert?: boolean;
};

/** Ein Projekt, wie es die Startseite zeigt. */
export type Projektuebersicht = {
  id: string;
  name: string;
  zuletztAm: string;
  angelegtAm: string;
  /** Adresse des kleinen Fotos – gilt nur, solange die Seite offen ist. */
  bildUrl: string | null;
  masse: { breite: number; hoehe: number } | null;
  /** Wie viele Stände es insgesamt gibt. */
  staendeAnzahl: number;
  /** Die neuesten Stände für die Leiste unter dem Bild. */
  staende: Stand[];
};

/** Wie viele Stände auf der Startseite unter einem Projekt stehen. */
const STAENDE_IN_DER_UEBERSICHT = 4;

/** Kantenlänge des kleinen Fotos auf der Startseite. */
const VORSCHAU_KANTE = 480;

/**
 * Aus dem Quellbild ein kleines Vorschaubild machen.
 *
 * Das Original kann 25 Megabyte haben. Eine Startseite, die zwölf davon
 * gleichzeitig in den Speicher holt, steht auf einem Tablet still – deshalb
 * liegt neben dem Original ein Bild von höchstens 480 Bildpunkten Kante.
 */
export async function bildVorschauBauen(bild: Blob): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  try {
    const bitmap = await createImageBitmap(bild);
    const faktor = Math.min(1, VORSCHAU_KANTE / Math.max(bitmap.width, bitmap.height));
    const leinwand = document.createElement("canvas");
    leinwand.width = Math.max(1, Math.round(bitmap.width * faktor));
    leinwand.height = Math.max(1, Math.round(bitmap.height * faktor));
    const stift = leinwand.getContext("2d");
    if (!stift) {
      bitmap.close();
      return null;
    }
    stift.drawImage(bitmap, 0, 0, leinwand.width, leinwand.height);
    bitmap.close();
    return await new Promise((aufloesen) =>
      leinwand.toBlob((b) => aufloesen(b), "image/jpeg", 0.82),
    );
  } catch {
    return null;
  }
}

/** Das Projekt zu einer Kennung. */
export async function projektHolen(id: string): Promise<Projektsatz | null> {
  try {
    const db = await browserdatenbank();
    return ((await db.get(LADEN_PROJEKTE, id)) as Projektsatz | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * Das Projekt zu einem Dateinamen – die Zuordnung, um die es hier geht.
 * Groß- und Kleinschreibung spielen keine Rolle: „Blume.JPG" und „blume.jpg"
 * sind für einen Menschen dasselbe Bild.
 */
export async function projektNachName(name: string): Promise<Projektsatz | null> {
  try {
    const db = await browserdatenbank();
    const alle = (await db.getAll(LADEN_PROJEKTE)) as Projektsatz[];
    const gesucht = name.trim().toLocaleLowerCase();
    const treffer = alle
      .filter((p) => p.name.trim().toLocaleLowerCase() === gesucht)
      .sort((a, b) => b.zuletztAm.localeCompare(a.zuletztAm));
    return treffer[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Ein Projekt anlegen oder auf den neuesten Stand bringen.
 *
 * Das Quellbild wird nur beim ersten Mal geschrieben. Es später noch einmal
 * abzulegen kostet auf einem Tablet spürbar Zeit und ändert nichts: dasselbe
 * Projekt hat dasselbe Bild.
 */
export async function projektMerken(argumente: {
  id: string;
  name: string;
  bild: Blob | null;
  bildMasse: { breite: number; hoehe: number } | null;
  bildAusschnitt: Ausschnitt | null;
  bildKennung: string;
  einstellungen: Einstellungen;
}): Promise<void> {
  try {
    const db = await browserdatenbank();
    const vorher = (await db.get(LADEN_PROJEKTE, argumente.id)) as Projektsatz | undefined;
    const jetzt = new Date().toISOString();

    // Dasselbe Projekt hat dasselbe Bild – normalerweise. Ist unter dem
    // gleichen Dateinamen aber ein anderes Foto gewählt worden (andere
    // Größe in Byte), gilt das neue: sonst zeigte die Startseite ein Bild,
    // aus dem das Muster gar nicht mehr stammt.
    const anderesFoto =
      argumente.bild !== null &&
      vorher?.bild != null &&
      argumente.bild.size !== vorher.bild.size;
    const bild = anderesFoto ? argumente.bild : (vorher?.bild ?? argumente.bild);
    const bildVorschau =
      anderesFoto || !vorher?.bildVorschau
        ? bild
          ? await bildVorschauBauen(bild)
          : null
        : vorher.bildVorschau;

    const satz: Projektsatz = {
      id: argumente.id,
      name: argumente.name || vorher?.name || "",
      angelegtAm: vorher?.angelegtAm ?? jetzt,
      zuletztAm: jetzt,
      bild,
      bildVorschau,
      bildMasse: argumente.bildMasse ?? vorher?.bildMasse ?? null,
      bildAusschnitt: argumente.bildAusschnitt ?? vorher?.bildAusschnitt ?? null,
      bildKennung: argumente.bildKennung || vorher?.bildKennung || "",
      einstellungen: argumente.einstellungen,
      // Ein ausgetauschtes Foto muss noch einmal in die Sicherung.
      bildGesichert: !anderesFoto && vorher?.bildGesichert === true,
    };

    await db.put(LADEN_PROJEKTE, satz);
    await vormerken("projekt", satz.id);
  } catch {
    // Ohne Projekteintrag geht nichts verloren – die Stände liegen ohnehin
    // in ihrem eigenen Laden. Nur die Startseite kennt das Projekt dann nicht.
  }
}

/** Einen Projektsatz unverändert ablegen – dafür ist der Abgleich da. */
export async function projektSatzSchreiben(satz: Projektsatz): Promise<void> {
  const db = await browserdatenbank();
  await db.put(LADEN_PROJEKTE, satz);
}

/**
 * Die Startseite: die zuletzt angefassten Projekte mit ihren neuesten
 * Ständen. Geladen wird bewusst wenig – ein kleines Foto je Projekt und
 * vier Ständebildchen, nicht die Muster selbst.
 */
export async function projekteLaden(hoechstens = 12): Promise<Projektuebersicht[]> {
  try {
    await projekteAufholen();
    const db = await browserdatenbank();
    const alle = (await db.getAll(LADEN_PROJEKTE)) as Projektsatz[];
    const neueste = alle
      .sort((a, b) => b.zuletztAm.localeCompare(a.zuletztAm))
      .slice(0, hoechstens);

    return await Promise.all(
      neueste.map(async (p) => ({
        id: p.id,
        name: p.name,
        zuletztAm: p.zuletztAm,
        angelegtAm: p.angelegtAm,
        bildUrl: p.bildVorschau
          ? URL.createObjectURL(p.bildVorschau)
          : p.bild
            ? URL.createObjectURL(p.bild)
            : null,
        masse: p.bildMasse,
        staendeAnzahl: await staendeZaehlen(p.id),
        staende: await staendeKurz(p.id, STAENDE_IN_DER_UEBERSICHT),
      })),
    );
  } catch {
    return [];
  }
}

/**
 * Stände aus der Zeit vor den Projekten bekommen nachträglich eines.
 *
 * Im Browser der Nutzerin liegen Muster, die entstanden sind, als es noch
 * keine Projekte gab. Sie hätten sonst keinen Eintrag auf der Startseite und
 * wären damit unsichtbar – dabei sind es genau die Muster, an denen sie
 * zuletzt gearbeitet hat.
 */
export async function projekteAufholen(): Promise<void> {
  try {
    const db = await browserdatenbank();
    const vorhanden = new Set((await db.getAllKeys(LADEN_PROJEKTE)) as string[]);

    // Zu welchen Mustern gibt es Stände, aber kein Projekt?
    const staende = (await db.getAll(LADEN_STAENDE)) as Array<{
      musterId: string;
      angelegtAm: string;
      einstellungen?: Einstellungen;
    }>;
    const fehlend = new Map<string, { zuletztAm: string; einstellungen?: Einstellungen }>();
    for (const stand of staende) {
      if (!stand.musterId || vorhanden.has(stand.musterId)) continue;
      const bisher = fehlend.get(stand.musterId);
      if (!bisher || stand.angelegtAm > bisher.zuletztAm) {
        fehlend.set(stand.musterId, {
          zuletztAm: stand.angelegtAm,
          einstellungen: stand.einstellungen,
        });
      }
    }
    if (fehlend.size === 0) return;

    // Der Arbeitsstand weiß als einziger, wie die Bilddatei hieß.
    const arbeit = (await db.get("arbeit", "aktuell")) as
      | {
          musterId: string | null;
          bildName?: string;
          bild?: Blob | null;
          bildMasse?: { breite: number; hoehe: number } | null;
          bildAusschnitt?: Ausschnitt | null;
          bildKennung?: string;
        }
      | undefined;

    for (const [musterId, angaben] of fehlend) {
      const ausArbeit = arbeit && arbeit.musterId === musterId ? arbeit : null;
      const bild = ausArbeit?.bild ?? null;
      const satz: Projektsatz = {
        id: musterId,
        name: ausArbeit?.bildName ?? "",
        angelegtAm: angaben.zuletztAm,
        zuletztAm: angaben.zuletztAm,
        bild,
        bildVorschau: bild ? await bildVorschauBauen(bild) : null,
        bildMasse: ausArbeit?.bildMasse ?? null,
        bildAusschnitt: ausArbeit?.bildAusschnitt ?? null,
        bildKennung: ausArbeit?.bildKennung ?? "",
        einstellungen: einstellungenLesen(angaben.einstellungen),
      };
      await db.put(LADEN_PROJEKTE, satz);
      await vormerken("projekt", satz.id);
    }
  } catch {
    // Aufholen ist Kür: klappt es nicht, fehlt eben ein alter Eintrag.
  }
}

/**
 * Ein Projekt öffnen.
 *
 * Geöffnet wird, indem der gewünschte Stand zum **Arbeitsstand** gemacht
 * wird – genau der, den die App nach einem Absturz ohnehin zurückholt. So
 * gibt es nur einen Weg ins Muster hinein und keine zweite Mechanik, die mit
 * der ersten auseinanderlaufen könnte.
 *
 * Ohne `standId` wird der neueste Stand des Projekts genommen.
 */
export async function projektOeffnen(id: string, standId?: string): Promise<boolean> {
  try {
    const db = await browserdatenbank();
    const projekt = (await db.get(LADEN_PROJEKTE, id)) as Projektsatz | undefined;
    if (!projekt) return false;

    const stand = await neuesterOderGewaehlter(id, standId);
    if (!stand) return false;

    const entpackt = rasterEntpacken(await entpacken(stand.raster));
    await arbeitsstandSichern({
      musterId: id,
      versionId: stand.id,
      name: projekt.name,
      breite: entpackt.breite,
      hoehe: entpackt.hoehe,
      basis: entpackt.basis,
      bearbeitung: entpackt.bearbeitung,
      palette: stand.palette,
      einstellungen: einstellungenLesen(stand.einstellungen ?? projekt.einstellungen),
      bild: projekt.bild,
      bildName: projekt.name,
      bildMasse: projekt.bildMasse,
      bildAusschnitt: projekt.bildAusschnitt,
      bildKennung: projekt.bildKennung || crypto.randomUUID(),
      gespeichertAm: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

/** So viel eines Standes braucht das Öffnen eines Projekts. */
type Standauszug = {
  id: string;
  angelegtAm: string;
  raster: Uint8Array;
  palette: PalettenEintrag[];
  einstellungen?: Einstellungen;
};

/** Den gewünschten Stand holen – oder, ohne Wunsch, den neuesten. */
async function neuesterOderGewaehlter(
  musterId: string,
  standId?: string,
): Promise<Standauszug | null> {
  const db = await browserdatenbank();
  if (standId) {
    const satz = (await db.get(LADEN_STAENDE, standId)) as Standauszug | undefined;
    if (satz) return satz;
  }
  const alle = (await db.getAllFromIndex(LADEN_STAENDE, "musterId", musterId)) as Standauszug[];
  if (alle.length === 0) return null;
  return alle.sort((a, b) => b.angelegtAm.localeCompare(a.angelegtAm))[0];
}

/** Ein Projekt mit allen seinen Ständen löschen. */
export async function projektLoeschen(id: string): Promise<boolean> {
  try {
    const db = await browserdatenbank();
    const schluessel = (await db.getAllKeysFromIndex(
      LADEN_STAENDE,
      "musterId",
      id,
    )) as string[];
    for (const s of schluessel) await db.delete(LADEN_STAENDE, s);
    await db.delete(LADEN_PROJEKTE, id);

    // War genau das das Muster, an dem gerade gearbeitet wird, muss auch der
    // Arbeitsstand weg – sonst stünde das gelöschte Projekt beim nächsten
    // Öffnen von Schritt 3 wieder da und legte sich neu an.
    const arbeit = await arbeitsstandLaden();
    if (arbeit?.musterId === id) await arbeitsstandLoeschen();
    // Auch in der Ferne weg – sonst stünde das Projekt beim nächsten Öffnen
    // der App wieder da, weil es von dort zurückgeholt würde.
    await vormerken("loeschung", id);
    return true;
  } catch {
    return false;
  }
}
