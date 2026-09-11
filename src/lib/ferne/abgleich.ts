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
  vormerken,
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
import {
  motivKennungen,
  motivSatzHolen,
  motivSatzSchreiben,
  motivVorhanden,
  type Motivsatz,
} from "@/lib/speicher/motive";
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

/**
 * Was aus einer Vormerkung geworden ist.
 *
 * `spaeter` ist kein Fehler: die Sache ist noch nicht so weit und bleibt
 * einfach vorgemerkt. So geht es einem Stand, dessen Projekt gerade erst
 * angelegt wird – beim nächsten Lauf ist es da.
 */
type Ergebnis = "erledigt" | "spaeter";

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
  // Motive hängen an keinem Projekt und können dazwischen; die Löschungen
  // bleiben hinten.
  const rang = {
    projekt: 0,
    stand: 1,
    motiv: 2,
    motivLoeschung: 3,
    standLoeschung: 4,
    loeschung: 5,
  } as const;
  const sortiert = [...offen].sort((a, b) => rang[a.art] - rang[b.art]);

  /** Welche Projektzeilen in diesem Lauf schon hinaufgegangen sind. */
  const schonOben = new Set<string>();
  /** Der letzte Fehler, an dem der Lauf nicht hängenbleiben muss. */
  let gestolpert: string | null = null;

  for (const vormerkung of sortiert) {
    try {
      if ((await einesHochladen(vormerkung, schonOben)) === "erledigt") {
        await abhaken(vormerkung.id);
        melden({ zuletzt: Date.now(), offen: await offeneAnzahl() });
      }
    } catch (fehler) {
      // Ohne Verbindung und ohne Zugang klappt auch der Rest der Liste
      // nicht – da lohnt kein Weitermachen.
      if (
        fehler instanceof FerneFehler &&
        (fehler.art === "netz" || fehler.art === "anmeldung")
      ) {
        melden({
          art: fehler.art === "netz" ? "ohneNetz" : "fehler",
          offen: await offeneAnzahl(),
          meldung: fehler.message,
        });
        return;
      }
      // Eine einzelne Sache, die der Dienst ablehnt, darf nicht alles
      // andere aufhalten. Sie bleibt vorgemerkt und wird beim nächsten Lauf
      // noch einmal versucht; die übrigen gehen jetzt hinauf. Vorher stand
      // die ganze Warteschlange, sobald ein einziger Eintrag klemmte.
      gestolpert = fehler instanceof Error ? fehler.message : String(fehler);
    }
  }

  // Hat sich unterwegs herausgestellt, dass gar nichts eingerichtet ist, war
  // das kein Fehler: die App arbeitet dann allein auf dem Gerät, und das
  // Zeichen in der Kopfzeile soll dazu schweigen.
  if (!ferneEingerichtet()) {
    melden({ art: "aus", meldung: null });
    return;
  }

  const offenDanach = await offeneAnzahl();
  if (gestolpert) {
    melden({ art: "fehler", offen: offenDanach, meldung: gestolpert });
    return;
  }
  // Was auf später vertagt wurde, wartet auf den nächsten Takt – gesichert
  // ist erst, wenn die Liste leer ist.
  melden({
    art: offenDanach === 0 ? "gesichert" : "laeuft",
    offen: offenDanach,
    meldung: null,
  });
}

async function einesHochladen(
  vormerkung: Vormerkung,
  schonOben: Set<string>,
): Promise<Ergebnis> {
  if (vormerkung.art === "projekt") {
    // Ist das Projekt hier gelöscht, gibt es nichts hochzuladen; die
    // Löschung selbst steht als eigene Vormerkung in der Liste.
    await projektHochladen(vormerkung.kennung, schonOben);
    return "erledigt";
  }
  if (vormerkung.art === "loeschung") {
    await projektEntfernen(vormerkung.kennung);
    return "erledigt";
  }
  if (vormerkung.art === "standLoeschung") {
    await standEntfernen(vormerkung.kennung);
    return "erledigt";
  }
  if (vormerkung.art === "motiv") {
    await motivHochladen(vormerkung.kennung);
    return "erledigt";
  }
  if (vormerkung.art === "motivLoeschung") {
    await motivEntfernen(vormerkung.kennung);
    return "erledigt";
  }
  return standHochladen(vormerkung.kennung, schonOben);
}

/**
 * Eine gelöschte Version auch in der Ferne wegräumen. Die Kennung ist
 * `projektId/standId` – das Projekt steht dabei, weil die Dateien unter ihm
 * liegen und die Zeile allein den Weg dorthin nicht mehr verrät.
 */
async function standEntfernen(kennung: string): Promise<void> {
  const [projektId, standId] = kennung.split("/");
  if (!projektId || !standId) return;

  try {
    await dateienLoeschen([rasterPfad(projektId, standId), vorschauPfad(projektId, standId)]);
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
  const basis = id;

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

/**
 * Wo die Dateien eines Motivs liegen.
 *
 * Motive gehören keinem Projekt – sie gehören der Nutzerin und lassen sich in
 * jedes Muster einsetzen. Sie stehen deshalb in einem eigenen Ordner und
 * nicht unter einem Projekt, aus dessen Löschung sie sonst verschwänden.
 */
function motivRasterPfad(id: string) {
  return `motive/${id}.rle.gz`;
}
function motivVorschauPfad(id: string) {
  return `motive/${id}.png`;
}

/** Ein Motiv in die Ferne bringen: Zeile, gepackter Ausschnitt, Vorschau. */
async function motivHochladen(id: string): Promise<void> {
  const satz = await motivSatzHolen(id);
  // Gelöscht, während die Vormerkung wartete: dann gibt es nichts zu tun.
  if (!satz) return;

  await zeilenSchreiben("motive", [
    {
      id: satz.id,
      name: satz.name,
      breite: satz.w,
      hoehe: satz.h,
      palette: satz.palette,
      fassung: satz.fassung ?? 1,
      hat_vorschau: satz.vorschau !== null,
      angelegt_am: satz.angelegtAm,
    },
  ]);

  await dateiHochladen(
    motivRasterPfad(satz.id),
    new Blob([satz.daten as BlobPart], { type: "application/gzip" }),
  );
  if (satz.vorschau) await dateiHochladen(motivVorschauPfad(satz.id), satz.vorschau);
}

/** Ein gelöschtes Motiv auch in der Ferne wegräumen. */
async function motivEntfernen(id: string): Promise<void> {
  try {
    await dateienLoeschen([motivRasterPfad(id), motivVorschauPfad(id)]);
  } catch {
    // Bleiben die Dateien liegen, findet sie ohne ihre Zeile niemand mehr.
  }
  await zeilenLoeschen("motive", `id=eq.${id}`);
}

/** Wo die Dateien eines Projekts in der Ferne liegen. */
function bildPfad(projektId: string) {
  return `${projektId}/bild`;
}
function rasterPfad(projektId: string, standId: string) {
  return `${projektId}/staende/${standId}.rle.gz`;
}
function vorschauPfad(projektId: string, standId: string) {
  return `${projektId}/staende/${standId}.png`;
}

/**
 * Die Projektzeile in die Ferne bringen. Gibt zurück, ob sie danach dort
 * steht – daran hängt, ob ein Stand dieses Projekts hinaufgehen darf.
 *
 * `schonOben` verhindert, dass dieselbe Zeile in einem Lauf mehrfach
 * geschrieben wird: die Stände eines Projekts fragen sie alle nach.
 */
async function projektHochladen(id: string, schonOben: Set<string>): Promise<boolean> {
  if (schonOben.has(id)) return true;
  const projekt = await projektHolen(id);
  // Gelöscht, während die Vormerkung wartete: dann gibt es nichts zu tun.
  if (!projekt) return false;

  await zeilenSchreiben("projekte", [
    {
      id: projekt.id,
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

  schonOben.add(id);

  // Das Quellfoto kann 25 Megabyte haben und ändert sich nie. Es geht genau
  // einmal hinauf; danach steht das im Projekt und wird nicht wiederholt.
  if (projekt.bild && !projekt.bildGesichert) {
    await dateiHochladen(bildPfad(projekt.id), projekt.bild);
    await projektSatzSchreiben({ ...projekt, bildGesichert: true });
  }
  return true;
}

async function standHochladen(id: string, schonOben: Set<string>): Promise<Ergebnis> {
  const stand = await standSatzHolen(id);
  if (!stand) return "erledigt";

  /**
   * Erst das Projekt, dann der Stand.
   *
   * In der Ferne hängt jeder Stand mit einem Fremdschlüssel an seinem
   * Projekt (`staende.projekt_id`). Fehlt dessen Zeile, lehnt der Dienst den
   * Stand mit **409 Conflict** ab – und das ist kein Sonderfall: beim
   * Sichern wird zuerst der Stand vorgemerkt und erst danach das Projekt
   * (das baut vorher noch sein kleines Foto, was bei einem großen Bild
   * spürbar dauert). Ein Lauf, der genau dazwischen fällt, sah bisher einen
   * Stand ohne sein Projekt, bekam den 409 – und blieb daran hängen.
   *
   * Zweimal hochgeladen schadet nichts: es ist dieselbe Kennung, und
   * geschrieben wird überschreibend.
   */
  if (!(await projektHochladen(stand.musterId, schonOben))) {
    // Das Projekt ist hier (noch) nicht da. Der Stand bleibt vorgemerkt und
    // kommt beim nächsten Lauf wieder dran.
    return "spaeter";
  }

  await zeilenSchreiben("staende", [
    {
      id: stand.id,
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
    rasterPfad(stand.musterId, stand.id),
    new Blob([stand.raster as BlobPart], { type: "application/gzip" }),
  );
  if (stand.vorschau) {
    await dateiHochladen(vorschauPfad(stand.musterId, stand.id), stand.vorschau);
  }
  return "erledigt";
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

type FerneMotivzeile = {
  id: string;
  name: string | null;
  breite: number | null;
  hoehe: number | null;
  palette: PalettenEintrag[] | null;
  fassung: number | null;
  hat_vorschau: boolean | null;
  angelegt_am: string;
};

/**
 * Der Nachtrag für die Motive von früher.
 * ---------------------------------------------------------------------------
 *
 * Motive gingen bis zu dieser Fassung gar nicht in die Ferne; für alles, was
 * vorher entstanden ist, gibt es deshalb keine Vormerkung. Ohne diesen
 * Nachtrag bliebe eine über Monate gewachsene Sammlung für immer auf einem
 * einzigen Gerät – und wäre mit ihm weg.
 *
 * Er läuft **einmal je Gerät**. Danach gilt wieder die gewöhnliche Ordnung:
 * vorgemerkt wird beim Speichern, gelöscht wird auch in der Ferne. Liefe er
 * bei jedem Start, brächte er ein Motiv wieder hoch, das auf einem anderen
 * Gerät gerade gelöscht wurde.
 */
const NACHTRAG_MERKER = "hafty.motive-nachgetragen";

async function motiveNachtragen(): Promise<void> {
  try {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(NACHTRAG_MERKER) === "1") return;
    for (const id of await motivKennungen()) await vormerken("motiv", id);
    localStorage.setItem(NACHTRAG_MERKER, "1");
  } catch {
    // Ohne den Nachtrag gehen nur die Motive hinauf, die ab jetzt entstehen.
    // Das ist kein Grund, den ganzen Abgleich anzuhalten.
  }
}

/**
 * Die Motive holen, die hier fehlen.
 *
 * Anders als bei den Ständen wird hier nichts aussortiert: Motive werden nie
 * von selbst aufgeräumt, es gibt wenige davon, und sie sind klein. Fehlt hier
 * eines, wurde es auf einem anderen Gerät angelegt – und genau dafür ist die
 * Sicherung da. Ein von Hand gelöschtes Motiv kommt nicht zurück: seine Zeile
 * in der Ferne verschwindet mit ihm.
 */
async function motiveHolen(): Promise<number> {
  const zeilen = await zeilenLesen<FerneMotivzeile>(
    "motive",
    "select=*&order=angelegt_am.desc&limit=500",
  );
  let geholt = 0;

  await motiveNachtragen();

  for (const zeile of zeilen) {
    if (await motivVorhanden(zeile.id)) continue;
    const daten = await dateiHolen(motivRasterPfad(zeile.id));
    // Ohne den Ausschnitt selbst wäre das Motiv nur ein Name.
    if (!daten) continue;
    const vorschau = zeile.hat_vorschau ? await dateiHolen(motivVorschauPfad(zeile.id)) : null;
    const satz: Motivsatz = {
      id: zeile.id,
      name: zeile.name ?? "",
      w: zeile.breite ?? 0,
      h: zeile.hoehe ?? 0,
      palette: zeile.palette ?? [],
      daten: new Uint8Array(await daten.arrayBuffer()),
      vorschau,
      angelegtAm: zeile.angelegt_am,
      fassung: zeile.fassung ?? 1,
    };
    await motivSatzSchreiben(satz);
    geholt++;
  }
  return geholt;
}

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
    const db = await browserdatenbank();

    const projekte = await zeilenLesen<FerneProjektzeile>(
      "projekte",
      `select=*&order=zuletzt_am.desc&limit=${HOLEN_HOECHSTENS}`,
    );
    let geholt = 0;

    for (const zeile of projekte) {
      const hier = (await db.get(LADEN_PROJEKTE, zeile.id)) as Projektsatz | undefined;

      if (!hier) {
        const bild = zeile.hat_bild ? await dateiHolen(bildPfad(zeile.id)) : null;
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
      }

      /**
       * Welche Stände geholt werden.
       *
       * Ist das Projekt hier **neu**, kommt alles mit – das Gerät kennt es ja
       * noch gar nicht.
       *
       * Ist es hier **schon da**, nur die **gemerkten**. Grund: das Aufräumen
       * behält von den automatischen Ständen nur die letzten 20 (siehe
       * staende.ts). Holte man alle, kämen die weggeräumten bei jedem Start
       * wieder zurück und die Sicherung schriebe dem Gerät vor, was es zu
       * haben hat. Gemerkte Stände werden dagegen **nie** von selbst gelöscht;
       * fehlt hier einer, dann wurde er auf einem anderen Gerät angelegt – und
       * genau der soll herüberkommen. Wird ein gemerkter Stand von Hand
       * gelöscht, verschwindet auch seine Zeile in der Ferne; er kommt also
       * nicht zurück.
       */
      const filter = hier ? "&gemerkt=is.true" : "";
      const staende = await zeilenLesen<FerneStandzeile>(
        "staende",
        `select=*&projekt_id=eq.${zeile.id}${filter}&order=angelegt_am.desc`,
      );
      for (const s of staende) {
        const vorhanden = await db.get(LADEN_STAENDE, s.id);
        if (vorhanden) continue;
        const raster = await dateiHolen(rasterPfad(s.projekt_id, s.id));
        if (!raster) continue;
        const vorschau = await dateiHolen(vorschauPfad(s.projekt_id, s.id));
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

    // Die Motive zum Schluss: sie hängen an keinem Projekt und sollen auch
    // dann ankommen, wenn es hier noch gar kein Muster gibt.
    geholt += await motiveHolen();

    melden({ art: "gesichert", offen: await offeneAnzahl(), meldung: null, zuletzt: Date.now() });
    return geholt;
  } catch (fehler) {
    if (!ferneEingerichtet()) {
      melden({ art: "aus", meldung: null });
      return 0;
    }
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
