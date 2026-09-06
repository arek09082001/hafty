"use client";

/**
 * Gespeicherte Stände.
 * ---------------------------------------------------------------------------
 *
 * Nicht zu verwechseln mit dem Rückgängig-Stapel: der lebt nur in der
 * Sitzung und im Arbeitsspeicher. Hier geht es um Stände, zu denen die
 * Nutzerin auch Wochen später zurückkann.
 *
 * Jeder Stand ist ein vollständiger, lauflängenkodierter und zusätzlich
 * gezippter Schnappschuss beider Ebenen als Datei im Bucket `raster`. In
 * Postgres steht nur der Verweis darauf, dazu die Palette und das
 * Vorschaubildchen.
 *
 * Die App hat keine Anmeldung; die Dateien liegen deshalb unter
 * `<muster-id>/<stand-id>.rle` und hängen an keiner Nutzerkennung.
 *
 * Über `parent_version_id` entsteht ein Baum: von einem alten Stand aus kann
 * die Nutzerin in eine andere Richtung weiterarbeiten, ohne den neueren zu
 * verlieren.
 */

import { browserClient, datenbankEingerichtet, hoechstens } from "@/lib/supabase/client";
import { entpacken, packen } from "./browserspeicher";
import { rasterEntpacken, rasterPacken } from "./rle";
import { hexNachRgb } from "@/lib/farbe/lab";
import type { Einstellungen, PalettenEintrag } from "@/lib/muster/typen";
import { LANDESKENNUNG, type Sprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

/** So viele automatische Stände bleiben erhalten. Gemerkte nie löschen. */
const AUTOMATISCH_BEHALTEN = 20;

const RASTER_BUCKET = "raster";
const VORSCHAU_BUCKET = "vorschau";
const BILD_BUCKET = "quellbilder";

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
  rasterPfad: string;
  palette: PalettenEintrag[];
};

export type StandInhalt = {
  breite: number;
  hoehe: number;
  basis: Uint8Array;
  bearbeitung: Int16Array;
  palette: PalettenEintrag[];
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

/**
 * Legt einen Stand an. Gibt es das Muster noch nicht, wird es dabei
 * mitangelegt und das Quellbild hochgeladen.
 */
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
  if (!datenbankEingerichtet()) return null;
  const supabase = browserClient();
  let musterId = argumente.musterId;

  // --- Muster anlegen, falls es noch keins gibt --------------------------
  if (!musterId) {
    musterId = crypto.randomUUID();

    let bildPfad: string | null = null;
    if (argumente.quellbild) {
      const endung = argumente.quellbild.type.includes("png") ? "png" : "jpg";
      const pfad = `${musterId}.${endung}`;
      const hoch = await supabase.storage
        .from(BILD_BUCKET)
        .upload(pfad, argumente.quellbild, { upsert: true });
      if (!hoch.error) bildPfad = pfad;
    }

    const { error } = await supabase.from("patterns").insert({
      id: musterId,
      name: argumente.name,
      width: argumente.breite,
      height: argumente.hoehe,
      fabric_count: argumente.einstellungen.stoffzaehlung,
      source_image_path: bildPfad,
    });
    if (error) return null;
  }

  // --- Raster und Vorschaubild hochladen ---------------------------------
  const standId = crypto.randomUUID();
  const rasterPfad = `${musterId}/${standId}.rle`;
  const vorschauPfad = `${musterId}/${standId}.png`;

  const gepackt = await packen(
    rasterPacken({
      breite: argumente.breite,
      hoehe: argumente.hoehe,
      basis: argumente.basis,
      bearbeitung: argumente.bearbeitung,
    }),
  );

  const hoch = await supabase.storage
    .from(RASTER_BUCKET)
    .upload(rasterPfad, new Blob([gepackt as BlobPart]), {
      contentType: "application/octet-stream",
    });
  if (hoch.error) return null;

  let vorschauGespeichert: string | null = null;
  const vorschau = await vorschauBauen(
    argumente.breite,
    argumente.hoehe,
    argumente.raster,
    argumente.palette,
  );
  if (vorschau) {
    const bildHoch = await supabase.storage
      .from(VORSCHAU_BUCKET)
      .upload(vorschauPfad, vorschau, { contentType: "image/png" });
    if (!bildHoch.error) vorschauGespeichert = vorschauPfad;
  }

  // --- Stand eintragen ----------------------------------------------------
  const { error } = await supabase.from("pattern_versions").insert({
    id: standId,
    pattern_id: musterId,
    parent_version_id: argumente.elternId,
    label: argumente.beschriftung,
    grid_path: rasterPfad,
    thumbnail_path: vorschauGespeichert,
    palette: argumente.palette,
    pinned: argumente.gemerkt,
  });
  if (error) return null;

  await supabase
    .from("patterns")
    .update({
      current_version_id: standId,
      width: argumente.breite,
      height: argumente.hoehe,
      fabric_count: argumente.einstellungen.stoffzaehlung,
      name: argumente.name,
    })
    .eq("id", musterId);

  // --- Legende mitschreiben ----------------------------------------------
  await supabase.from("pattern_colors").delete().eq("pattern_id", musterId);
  if (argumente.palette.length > 0) {
    await supabase.from("pattern_colors").insert(
      argumente.palette.map((eintrag) => ({
        pattern_id: musterId,
        palette_index: eintrag.index,
        thread_color_id: eintrag.garn?.id ?? null,
        symbol: eintrag.symbol,
        stitch_count: eintrag.stiche,
      })),
    );
  }

  await aufraeumen(musterId);

  return { musterId, standId };
}

/**
 * Alle Stände eines Musters, neueste zuerst. Wirft, wenn die Datenbank nicht
 * erreichbar ist – eine leere Liste heisst dann wirklich "noch keine Stände".
 */
export async function staendeLaden(musterId: string): Promise<Stand[]> {
  if (!datenbankEingerichtet()) return [];
  const supabase = browserClient();

  const { data, error } = await hoechstens(
    supabase
      .from("pattern_versions")
      .select(
        "id, pattern_id, parent_version_id, label, grid_path, thumbnail_path, palette, pinned, created_at",
      )
      .eq("pattern_id", musterId)
      .order("created_at", { ascending: false }),
  );

  if (error) throw new Error(error.message);
  if (!data) return [];

  return Promise.all(
    data.map(async (zeile) => {
      let vorschauUrl: string | null = null;
      if (zeile.thumbnail_path) {
        const { data: link } = await supabase.storage
          .from(VORSCHAU_BUCKET)
          .createSignedUrl(zeile.thumbnail_path as string, 60 * 60);
        vorschauUrl = link?.signedUrl ?? null;
      }
      const palette = (zeile.palette ?? []) as PalettenEintrag[];
      return {
        id: zeile.id as string,
        musterId: zeile.pattern_id as string,
        elternId: (zeile.parent_version_id as string | null) ?? null,
        beschriftung: ((zeile.label as string) || "staende.neuErzeugt") as Textschluessel,
        gemerkt: Boolean(zeile.pinned),
        angelegtAm: zeile.created_at as string,
        farben: palette.length,
        vorschauUrl,
        rasterPfad: zeile.grid_path as string,
        palette,
      };
    }),
  );
}

/** Den Inhalt eines Standes holen. */
export async function standHolen(stand: Stand): Promise<StandInhalt | null> {
  if (!datenbankEingerichtet()) return null;
  const supabase = browserClient();
  const { data, error } = await supabase.storage.from(RASTER_BUCKET).download(stand.rasterPfad);
  if (error || !data) return null;

  const roh = await entpacken(new Uint8Array(await data.arrayBuffer()));
  const entpackt = rasterEntpacken(roh);
  return { ...entpackt, palette: stand.palette };
}

/** „Diesen Stand merken" – der Schnappschuss wird dauerhaft geschützt. */
export async function standMerken(standId: string, gemerkt: boolean): Promise<boolean> {
  if (!datenbankEingerichtet()) return false;
  const supabase = browserClient();
  const { error } = await supabase
    .from("pattern_versions")
    .update({ pinned: gemerkt })
    .eq("id", standId);
  return !error;
}

/**
 * Aufräumen: die letzten 20 automatischen Stände bleiben, gemerkte Stände
 * werden nie gelöscht. Auch ein Stand, an dem ein anderer als Elternteil
 * hängt, bleibt stehen – sonst risse der Baum auseinander.
 */
export async function aufraeumen(musterId: string): Promise<void> {
  if (!datenbankEingerichtet()) return;
  const supabase = browserClient();

  const { data } = await supabase
    .from("pattern_versions")
    .select("id, parent_version_id, pinned, grid_path, thumbnail_path, created_at")
    .eq("pattern_id", musterId)
    .order("created_at", { ascending: false });

  if (!data) return;

  const istElternteil = new Set(
    data.map((z) => z.parent_version_id as string | null).filter(Boolean) as string[],
  );

  const wegwerfbar = data.filter((z) => !z.pinned && !istElternteil.has(z.id as string));
  const zuViel = wegwerfbar.slice(AUTOMATISCH_BEHALTEN);
  if (zuViel.length === 0) return;

  const ids = zuViel.map((z) => z.id as string);
  await supabase.from("pattern_versions").delete().in("id", ids);

  const rasterPfade = zuViel.map((z) => z.grid_path as string).filter(Boolean);
  const vorschauPfade = zuViel
    .map((z) => z.thumbnail_path as string | null)
    .filter((p): p is string => Boolean(p));

  if (rasterPfade.length > 0) await supabase.storage.from(RASTER_BUCKET).remove(rasterPfade);
  if (vorschauPfade.length > 0) await supabase.storage.from(VORSCHAU_BUCKET).remove(vorschauPfade);
}

/**
 * Ein Zeitpunkt, wie ihn ein Mensch sagt: „Heute, 14:30". Keine
 * Zeitstempel, keine Versionsnummern.
 */
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
