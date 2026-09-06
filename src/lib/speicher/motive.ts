"use client";

/**
 * Motive: gespeicherte Ausschnitte, die über Muster hinweg erhalten bleiben.
 *
 * Sie liegen in der Tabelle `motifs` und – wie alle Raster – als
 * lauflängenkodierte Datei im privaten Storage-Bucket `motive`. Zusätzlich
 * wird ein kleines Vorschaubild abgelegt, damit die Liste nicht erst alle
 * Daten laden muss, um etwas zeigen zu können.
 */

import { browserClient } from "@/lib/supabase/client";
import { entpacken, packen } from "./browserspeicher";
import type { Ausschnitt } from "@/lib/muster/raster";
import type { PalettenEintrag } from "@/lib/muster/typen";
import { hexNachRgb } from "@/lib/farbe/lab";

export type Motiv = {
  id: string;
  name: string;
  w: number;
  h: number;
  vorschauUrl: string | null;
  palette: PalettenEintrag[];
  dataPath: string;
};

const BUCKET = "motive";

/**
 * Ein Motiv besteht aus zwei gleich langen Ebenen: den Farbindizes und der
 * Maske. Beide werden hintereinander lauflängenkodiert.
 */
function ausschnittPacken(a: Ausschnitt): Uint8Array {
  const kopf = new Uint8Array(8);
  new DataView(kopf.buffer).setUint32(0, a.w, true);
  new DataView(kopf.buffer).setUint32(4, a.h, true);

  const laeufe = (werte: Uint8Array) => {
    const teile: number[] = [];
    let i = 0;
    while (i < werte.length) {
      const wert = werte[i];
      let laenge = 1;
      while (i + laenge < werte.length && werte[i + laenge] === wert) laenge++;
      teile.push(wert, laenge & 0xff, (laenge >> 8) & 0xff, (laenge >> 16) & 0xff);
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

function ausschnittEntpacken(roh: Uint8Array, palette: PalettenEintrag[]): Ausschnitt {
  const sicht = new DataView(roh.buffer, roh.byteOffset, roh.byteLength);
  const w = sicht.getUint32(0, true);
  const h = sicht.getUint32(4, true);
  const datenLaenge = sicht.getUint32(8, true);

  const lesen = (start: number, laenge: number, ziel: Uint8Array) => {
    let pos = start;
    let schreib = 0;
    const ende = start + laenge;
    while (pos < ende && schreib < ziel.length) {
      const wert = roh[pos];
      const anzahl = roh[pos + 1] | (roh[pos + 2] << 8) | (roh[pos + 3] << 16);
      pos += 4;
      ziel.fill(wert, schreib, Math.min(ziel.length, schreib + anzahl));
      schreib += anzahl;
    }
  };

  const daten = new Uint8Array(w * h);
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
    if (!a.maske[i]) {
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

/** Alle Motive der angemeldeten Nutzerin holen. */
export async function motiveLaden(): Promise<Motiv[]> {
  const supabase = browserClient();
  const { data: sitzung } = await supabase.auth.getUser();
  if (!sitzung.user) return [];

  const { data, error } = await supabase
    .from("motifs")
    .select("id, name, w, h, data_path, thumbnail_path, palette")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return Promise.all(
    data.map(async (zeile) => {
      let vorschauUrl: string | null = null;
      if (zeile.thumbnail_path) {
        const { data: link } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(zeile.thumbnail_path, 60 * 60);
        vorschauUrl = link?.signedUrl ?? null;
      }
      return {
        id: zeile.id as string,
        name: zeile.name as string,
        w: zeile.w as number,
        h: zeile.h as number,
        vorschauUrl,
        palette: (zeile.palette ?? []) as PalettenEintrag[],
        dataPath: zeile.data_path as string,
      };
    }),
  );
}

/** Ein Motiv anlegen. Gibt null zurück, wenn es nicht gespeichert werden konnte. */
export async function motivSpeichern(name: string, a: Ausschnitt): Promise<Motiv | null> {
  const supabase = browserClient();
  const { data: sitzung } = await supabase.auth.getUser();
  if (!sitzung.user) return null;

  const id = crypto.randomUUID();
  const ordner = `${sitzung.user.id}`;
  const dataPath = `${ordner}/${id}.rle`;
  const bildPath = `${ordner}/${id}.png`;

  const gepackt = await packen(ausschnittPacken(a));
  const hoch = await supabase.storage
    .from(BUCKET)
    .upload(dataPath, new Blob([gepackt as BlobPart]), { contentType: "application/octet-stream" });
  if (hoch.error) return null;

  const vorschau = await vorschauBauen(a);
  let thumbnailPath: string | null = null;
  if (vorschau) {
    const bildHoch = await supabase.storage
      .from(BUCKET)
      .upload(bildPath, vorschau, { contentType: "image/png" });
    if (!bildHoch.error) thumbnailPath = bildPath;
  }

  const { error } = await supabase.from("motifs").insert({
    id,
    user_id: sitzung.user.id,
    name,
    w: a.w,
    h: a.h,
    data_path: dataPath,
    thumbnail_path: thumbnailPath,
    palette: a.palette,
  });
  if (error) return null;

  let vorschauUrl: string | null = null;
  if (thumbnailPath) {
    const { data: link } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(thumbnailPath, 60 * 60);
    vorschauUrl = link?.signedUrl ?? null;
  }

  return { id, name, w: a.w, h: a.h, vorschauUrl, palette: a.palette, dataPath };
}

/** Die Daten eines Motivs nachladen, um es einzusetzen. */
export async function motivHolen(motiv: Motiv): Promise<Ausschnitt | null> {
  const supabase = browserClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(motiv.dataPath);
  if (error || !data) return null;
  const roh = await entpacken(new Uint8Array(await data.arrayBuffer()));
  return ausschnittEntpacken(roh, motiv.palette);
}

/** Ein Motiv endgültig löschen. */
export async function motivLoeschen(motiv: Motiv): Promise<boolean> {
  const supabase = browserClient();
  const { error } = await supabase.from("motifs").delete().eq("id", motiv.id);
  if (error) return false;
  await supabase.storage.from(BUCKET).remove([motiv.dataPath]);
  return true;
}
