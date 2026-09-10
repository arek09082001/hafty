"use client";

/**
 * Der Abgleich: was auf dem Gerät liegt, liegt auch in der Ferne.
 * ---------------------------------------------------------------------------
 *
 * Die Reihenfolge ist immer dieselbe und sie ist der Kern der Sache:
 *
 *   1. Gespeichert wird auf dem Gerät. Sofort, auch ohne Empfang.
 *   2. Was gespeichert wurde, steht danach in der Vormerkliste.
 *   3. Sobald Verbindung besteht, wird diese Liste abgearbeitet.
 *
 * Damit ist „ich habe Internet, also sichere sofort" erfüllt, ohne dass die
 * Nutzerin je auf das Netz wartet. Bricht die Verbindung mitten im Hochladen
 * ab, bleibt die Vormerkung stehen und wird beim nächsten Mal noch einmal
 * versucht – hochgeladen wird immer unter derselben Kennung, zweimal
 * schadet also nicht.
 *
 * In die andere Richtung geht es einmal beim Start: was in der Ferne liegt
 * und auf dem Gerät fehlt, wird geholt. Das ist der Fall, für den das Ganze
 * gebaut ist – neues Gerät, geleerter Browserspeicher, verlorenes Tablet.
 */

import {
  abhaken,
  offeneAnzahl,
  offeneVormerkungen,
  type Vormerkung,
} from "@/lib/speicher/abgleichliste";
import {
  bildVorschauBauen,
  projektHolen,
  projektSatzSchreiben,
  type Projektsatz,
} from "@/lib/speicher/projekte";
import {
  standSatzHolen,
  standSatzSchreiben,
  type Standsatz,
} from "@/lib/speicher/staende";
import { einstellungenLesen, type Einstellungen, type PalettenEintrag } from "@/lib/muster/typen";
import { browserdatenbank, LADEN_PROJEKTE, LADEN_STAENDE } from "@/lib/speicher/browserspeicher";
import type { Textschluessel } from "@/lib/sprache/texte";
import type { Ausschnitt } from "@/lib/muster/ausschnitt";
import {
  dateiHochladen,
  dateiHolen,
  dateienListen,
  dateienLoeschen,
  ferneEingerichtet,
  FerneFehler,
  zeilenLesen,
  zeilenLoeschen,
  zeilenSchreiben,
  zugangHolen,
} from "./supabase";

/** Höchstens so viele Projekte werden beim Start aus der Ferne geholt. */
const HOLEN_HOECHSTENS = 50;

// ---------------------------------------------------------------------------
// Zustand – daran hängt das kleine Zeichen in der Kopfzeile
// ---------------------------------------------------------------------------

export type Abgleichzustand = {
  /**
   * `aus`      – nicht eingerichtet, die App arbeitet rein auf dem Gerät
   * `ohneNetz` – keine Verbindung, es wartet etwas
   * `laeuft`   – wird gerade hochgeladen oder geholt
   * `gesichert`– alles, was es gibt, liegt auch in der Ferne
   * `fehler`   – der Dienst hat abgelehnt; das muss die Nutzerin erfahren
   */
  art: "aus" | "ohneNetz" | "laeuft" | "gesichert" | "fehler";
  /** Wie viele Sachen noch auf eine Verbindung warten. */
  offen: number;
  /** Wann zuletzt etwas erfolgreich in der Ferne ankam. */
  zuletzt: number | null;
  /** Nur für die Fehlersuche – nichts, was der Nutzerin gezeigt wird. */
  meldung: string | null;
};

let zustand: Abgleichzustand = {
  art: ferneEingerichtet() ? "gesichert" : "aus",
  offen: 0,
  zuletzt: null,
  meldung: null,
};

const zuhoerer = new Set<(z: Abgleichzustand) => void>();

function melden(teil: Partial<Abgleichzustand>) {
  zustand = { ...zustand, ...teil };
  for (const hoerer of zuhoerer) hoerer(zustand);
}

export function abgleichZustand(): Abgleichzustand {
  return zustand;
}

export function abgleichAbonnieren(hoerer: (z: Abgleichzustand) => void): () => void {
  zuhoerer.add(hoerer);
  return () => zuhoerer.delete(hoerer);
}

// ---------------------------------------------------------------------------
// Hinauf: die Vormerkliste abarbeiten
// ---------------------------------------------------------------------------

let laeuft = false;
let nochEinmal = false;

/**
 * Alles Vorgemerkte hochladen.
 *
 * Läuft immer nur einmal gleichzeitig. Kommt währenddessen etwas Neues dazu,
 * wird hinterher gleich noch einmal durchgegangen – so ist nach jedem
 * Speichern binnen Sekunden alles oben, ohne dass sich zehn Läufe
 * überschneiden.
 */
export async function abgleichAnstossen(): Promise<void> {
  if (!ferneEingerichtet()) return;
  if (laeuft) {
    nochEinmal = true;
    return;
  }
  laeuft = true;
  try {
    do {
      nochEinmal = false;
      await einmalHochladen();
    } while (nochEinmal);
  } finally {
    laeuft = false;
  }
}

async function einmalHochladen(): Promise<void> {
  const offen = await offeneVormerkungen();
  if (offen.length === 0) {
    melden({ art: "gesichert", offen: 0, meldung: null });
    return;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    melden({ art: "ohneNetz", offen: offen.length });
    return;
  }

  melden({ art: "laeuft", offen: offen.length });

  // Projekte zuerst: ein Stand ohne sein Projekt hätte in der Ferne keinen
  // Platz, an den er gehört. Löschungen zuletzt – sonst räumt eine von ihnen
  // auf, während für dasselbe Projekt noch etwas hochgeht.
  const rang = { projekt: 0, stand: 1, standLoeschung: 2, loeschung: 3 } as const;
  const sortiert = [...offen].sort((a, b) => rang[a.art] - rang[b.art]);

  for (const vormerkung of sortiert) {
    try {
      await einesHochladen(vormerkung);
      await abhaken(vormerkung.id);
      melden({ zuletzt: Date.now(), offen: await offeneAnzahl() });
    } catch (fehler) {
      const art =
        fehler instanceof FerneFehler && fehler.art === "netz" ? "ohneNetz" : "fehler";
      melden({
        art,
        offen: await offeneAnzahl(),
        meldung: fehler instanceof Error ? fehler.message : String(fehler),
      });
      return;
    }
  }

  melden({ art: "gesichert", offen: await offeneAnzahl(), meldung: null });
}

async function einesHochladen(vormerkung: Vormerkung): Promise<void> {
  if (vormerkung.art === "projekt") return projektHochladen(vormerkung.kennung);
  if (vormerkung.art === "loeschung") return projektEntfernen(vormerkung.kennung);
  if (vormerkung.art === "standLoeschung") return standEntfernen(vormerkung.kennung);
  return standHochladen(vormerkung.kennung);
}

/**
 * Eine gelöschte Version auch in der Ferne wegräumen. Die Kennung ist
 * `projektId/standId` – das Projekt steht dabei, weil die Dateien unter ihm
 * liegen und die Zeile allein den Weg dorthin nicht mehr verrät.
 */
async function standEntfernen(kennung: string): Promise<void> {
  const [projektId, standId] = kennung.split("/");
  if (!projektId || !standId) return;
  const zugang = await zugangHolen();

  try {
    await dateienLoeschen([
      rasterPfad(zugang.benutzer, projektId, standId),
      vorschauPfad(zugang.benutzer, projektId, standId),
    ]);
  } catch {
    // Bleiben die Dateien liegen, findet sie ohne ihre Zeile niemand mehr.
  }
  await zeilenLoeschen("staende", `id=eq.${standId}`);
}

/**
 * Ein gelöschtes Projekt auch in der Ferne wegräumen: erst die Dateien,
 * dann die Zeilen. Die Stände hängen mit einem Fremdschlüssel am Projekt
 * und verschwinden mit ihm – die Datei zu einem Stand weiß davon nichts
 * und muss einzeln weg.
 */
async function projektEntfernen(id: string): Promise<void> {
  const zugang = await zugangHolen();
  const basis = `${zugang.benutzer}/${id}`;

  try {
    const oben = await dateienListen(basis);
    const inStaenden = await dateienListen(`${basis}/staende`);
    await dateienLoeschen([
      ...oben.filter((name) => name !== "staende").map((name) => `${basis}/${name}`),
      ...inStaenden.map((name) => `${basis}/staende/${name}`),
    ]);
  } catch {
    // Bleiben ein paar Dateien liegen, ist das Platzverschwendung und sonst
    // nichts: ohne ihre Zeilen findet sie niemand mehr. Daran darf die
    // Warteschlange nicht hängenbleiben.
  }

  await zeilenLoeschen("staende", `projekt_id=eq.${id}`);
  await zeilenLoeschen("projekte", `id=eq.${id}`);
}

/** Wo die Dateien eines Projekts in der Ferne liegen. */
function bildPfad(benutzer: string, projektId: string) {
  return `${benutzer}/${projektId}/bild`;
}
function rasterPfad(benutzer: string, projektId: string, standId: string) {
  return `${benutzer}/${projektId}/staende/${standId}.rle.gz`;
}
function vorschauPfad(benutzer: string, projektId: string, standId: string) {
  return `${benutzer}/${projektId}/staende/${standId}.png`;
}

async function projektHochladen(id: string): Promise<void> {
  const projekt = await projektHolen(id);
  // Gelöscht, während die Vormerkung wartete: dann gibt es nichts zu tun.
  if (!projekt) return;
  const zugang = await zugangHolen();

  await zeilenSchreiben("projekte", [
    {
      id: projekt.id,
      besitzer: zugang.benutzer,
      name: projekt.name,
      angelegt_am: projekt.angelegtAm,
      zuletzt_am: projekt.zuletztAm,
      bild_masse: projekt.bildMasse,
      bild_ausschnitt: projekt.bildAusschnitt,
      bild_kennung: projekt.bildKennung,
      einstellungen: projekt.einstellungen,
      hat_bild: projekt.bild !== null,
    },
  ]);

  // Das Quellfoto kann 25 Megabyte haben und ändert sich nie. Es geht genau
  // einmal hinauf; danach steht das im Projekt und wird nicht wiederholt.
  if (projekt.bild && !projekt.bildGesichert) {
    await dateiHochladen(bildPfad(zugang.benutzer, projekt.id), projekt.bild);
    await projektSatzSchreiben({ ...projekt, bildGesichert: true });
  }
}

async function standHochladen(id: string): Promise<void> {
  const stand = await standSatzHolen(id);
  if (!stand) return;
  const zugang = await zugangHolen();

  await zeilenSchreiben("staende", [
    {
      id: stand.id,
      besitzer: zugang.benutzer,
      projekt_id: stand.musterId,
      eltern_id: stand.elternId,
      beschriftung: stand.beschriftung,
      gemerkt: stand.gemerkt,
      angelegt_am: stand.angelegtAm,
      palette: stand.palette,
      einstellungen: stand.einstellungen,
      breite: stand.breite ?? null,
      hoehe: stand.hoehe ?? null,
    },
  ]);

  await dateiHochladen(
    rasterPfad(zugang.benutzer, stand.musterId, stand.id),
    new Blob([stand.raster as BlobPart], { type: "application/gzip" }),
  );
  if (stand.vorschau) {
    await dateiHochladen(vorschauPfad(zugang.benutzer, stand.musterId, stand.id), stand.vorschau);
  }
}

// ---------------------------------------------------------------------------
// Herunter: was in der Ferne liegt und hier fehlt
// ---------------------------------------------------------------------------

type FerneProjektzeile = {
  id: string;
  name: string | null;
  angelegt_am: string;
  zuletzt_am: string;
  bild_masse: { breite: number; hoehe: number } | null;
  bild_ausschnitt: Ausschnitt | null;
  bild_kennung: string | null;
  einstellungen: Einstellungen | null;
  hat_bild: boolean | null;
};

type FerneStandzeile = {
  id: string;
  projekt_id: string;
  eltern_id: string | null;
  beschriftung: string | null;
  gemerkt: boolean | null;
  angelegt_am: string;
  palette: PalettenEintrag[] | null;
  einstellungen: Einstellungen | null;
  breite: number | null;
  hoehe: number | null;
};

/**
 * Alles holen, was in der Ferne liegt und auf diesem Gerät fehlt.
 *
 * Läuft beim Start einmal. Was schon hier ist, wird nicht angerührt: das
 * Gerät ist beim Arbeiten immer die Wahrheit, die Ferne ist die Sicherung.
 */
export async function ausDerFerneHolen(): Promise<number> {
  if (!ferneEingerichtet()) return 0;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;

  try {
    melden({ art: "laeuft" });
    const zugang = await zugangHolen();
    const db = await browserdatenbank();

    const projekte = await zeilenLesen<FerneProjektzeile>(
      "projekte",
      `select=*&order=zuletzt_am.desc&limit=${HOLEN_HOECHSTENS}`,
    );
    let geholt = 0;

    for (const zeile of projekte) {
      const hier = (await db.get(LADEN_PROJEKTE, zeile.id)) as Projektsatz | undefined;
      // Ist das Projekt hier schon, wird nichts angerührt – auch seine
      // Stände nicht. Sonst holte das Aufräumen (die letzten 20 automatischen
      // Stände bleiben) sie bei jedem Start wieder zurück, und die Sicherung
      // schriebe dem Gerät vor, was es zu haben hat.
      if (hier) continue;

      const bild = zeile.hat_bild ? await dateiHolen(bildPfad(zugang.benutzer, zeile.id)) : null;
      await projektSatzSchreiben({
        id: zeile.id,
        name: zeile.name ?? "",
        angelegtAm: zeile.angelegt_am,
        zuletztAm: zeile.zuletzt_am,
        bild,
        bildVorschau: bild ? await bildVorschauBauen(bild) : null,
        bildMasse: zeile.bild_masse,
        bildAusschnitt: zeile.bild_ausschnitt,
        bildKennung: zeile.bild_kennung ?? "",
        einstellungen: einstellungenLesen(zeile.einstellungen),
        // Es kam gerade von dort – noch einmal hinaufschicken wäre unnötig.
        bildGesichert: true,
      });
      geholt++;

      const staende = await zeilenLesen<FerneStandzeile>(
        "staende",
        `select=*&projekt_id=eq.${zeile.id}&order=angelegt_am.desc`,
      );
      for (const s of staende) {
        const vorhanden = await db.get(LADEN_STAENDE, s.id);
        if (vorhanden) continue;
        const raster = await dateiHolen(rasterPfad(zugang.benutzer, s.projekt_id, s.id));
        if (!raster) continue;
        const vorschau = await dateiHolen(vorschauPfad(zugang.benutzer, s.projekt_id, s.id));
        const satz: Standsatz = {
          id: s.id,
          musterId: s.projekt_id,
          elternId: s.eltern_id,
          beschriftung: (s.beschriftung ?? "staende.neuErzeugt") as Textschluessel,
          gemerkt: s.gemerkt === true,
          angelegtAm: s.angelegt_am,
          palette: s.palette ?? [],
          raster: new Uint8Array(await raster.arrayBuffer()),
          vorschau,
          einstellungen: einstellungenLesen(s.einstellungen),
          breite: s.breite ?? undefined,
          hoehe: s.hoehe ?? undefined,
        };
        await standSatzSchreiben(satz);
        geholt++;
      }
    }

    melden({ art: "gesichert", offen: await offeneAnzahl(), meldung: null, zuletzt: Date.now() });
    return geholt;
  } catch (fehler) {
    melden({
      art: fehler instanceof FerneFehler && fehler.art === "netz" ? "ohneNetz" : "fehler",
      meldung: fehler instanceof Error ? fehler.message : String(fehler),
    });
    return 0;
  }
}

/** Beim Start einmal nachsehen, wie viel noch wartet. */
export async function offenesZaehlen(): Promise<void> {
  if (!ferneEingerichtet()) return;
  const offen = await offeneAnzahl();
  melden({ offen, art: offen === 0 ? "gesichert" : zustand.art });
}
