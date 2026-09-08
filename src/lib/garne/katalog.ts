/**
 * Den Garnkatalog aus einer CSV-Datei lesen und für die Datenbank
 * vorbereiten.
 *
 * Diese Datei liegt bewusst in src und nicht in scripts, weil beide Wege
 * sie brauchen und beide dasselbe tun müssen:
 *
 *   * `npm run garne-importieren` auf dem eigenen Rechner
 *   * der Knopf „Garnfarben einlesen" in der App (src/app/api/garne)
 *
 * Kein "use client": das hier läuft nur auf dem Server. Der Katalog wird
 * mit dem Dienstschlüssel geschrieben, und der darf nie in den Browser.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
// Relativ, nicht ueber "@/": das Kommandozeilenskript laeuft ohne
// Pfad-Aliasse und muss diese Datei genauso aufloesen koennen.
import { hexNachLab } from "../farbe/lab.ts";

export type Garnzeile = { brand: string; code: string; name: string; hex: string };

/** Ein Satz, wie er in thread_colors steht. */
export type Garnsatz = {
  brand_id: string;
  code: string;
  name: string;
  hex: string;
  lab_l: number;
  lab_a: number;
  lab_b: number;
  discontinued: boolean;
};

const SPALTEN = ["brand", "code", "name", "hex"] as const;

/**
 * CSV lesen. Bewusst schlicht: die Dateien im Projekt haben keine
 * Anführungszeichen und keine Kommas in den Feldern, und das prüfen wir
 * unten auch nach.
 */
export function csvLesen(text: string): Garnzeile[] {
  const zeilen = text.replace(/^﻿/, "").split(/\r?\n/).filter((z) => z.trim() !== "");
  if (zeilen.length < 2) throw new Error("Die Datei enthält keine Garnfarben.");

  const kopf = zeilen[0].split(",").map((s) => s.trim().toLowerCase());
  for (const spalte of SPALTEN) {
    if (!kopf.includes(spalte)) {
      throw new Error(`In der Kopfzeile fehlt die Spalte "${spalte}". Erwartet: ${SPALTEN.join(",")}`);
    }
  }

  return zeilen.slice(1).map((zeile, nummer) => {
    const teile = zeile.split(",").map((s) => s.trim());
    if (teile.length !== kopf.length) {
      throw new Error(`Zeile ${nummer + 2} hat ${teile.length} statt ${kopf.length} Spalten: ${zeile}`);
    }
    const wert = (spalte: string) => teile[kopf.indexOf(spalte)];
    const hex = wert("hex");
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
      throw new Error(`Zeile ${nummer + 2} hat keinen gültigen Farbwert: ${hex}`);
    }
    if (wert("brand") === "" || wert("code") === "") {
      throw new Error(`Zeile ${nummer + 2} hat keinen Hersteller oder keine Nummer: ${zeile}`);
    }
    return { brand: wert("brand"), code: wert("code"), name: wert("name"), hex };
  });
}

/**
 * Die Lab-Werte **einmal** ausrechnen und mitspeichern. Zur Laufzeit müssen
 * dann nur noch Abstände gerechnet werden und nie mehr eine
 * Farbraumumrechnung – bei 375 Garnen und 24 Clustern spart das pro
 * Musterlauf neuntausend Umrechnungen.
 */
export function saetzeBauen(zeilen: Garnzeile[], markeZuId: Map<string, string>): Garnsatz[] {
  return zeilen.map((zeile) => {
    const lab = hexNachLab(zeile.hex);
    const id = markeZuId.get(zeile.brand);
    if (!id) throw new Error(`Für den Hersteller ${zeile.brand} fehlt die Kennung.`);
    return {
      brand_id: id,
      code: zeile.code,
      name: zeile.name,
      hex: zeile.hex.toUpperCase(),
      lab_l: lab.L,
      lab_a: lab.a,
      lab_b: lab.b,
      discontinued: false,
    };
  });
}

/** Die Hersteller aus den Zeilen anlegen, soweit sie noch fehlen. */
export async function markenAnlegen(
  supabase: SupabaseClient,
  zeilen: Garnzeile[],
): Promise<Map<string, string>> {
  // Der Client kennt unser Schema nicht. Ohne diesen engen Zwischentyp
  // versucht TypeScript, die Satztypen aus der Tabelle zu erraten, und
  // verliert sich in der Ableitung ("type instantiation is excessively deep").
  const marken = supabase.from("thread_brands") as unknown as {
    select: (spalten: string) => {
      eq: (spalte: string, wert: string) => {
        maybeSingle: () => PromiseLike<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
    insert: (satz: { name: string }) => {
      select: (spalten: string) => {
        single: () => PromiseLike<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
  };

  const markeZuId = new Map<string, string>();
  for (const marke of [...new Set(zeilen.map((z) => z.brand))]) {
    const vorhanden = await marken.select("id").eq("name", marke).maybeSingle();
    if (vorhanden.error) throw new Error(vorhanden.error.message);
    if (vorhanden.data?.id) {
      markeZuId.set(marke, vorhanden.data.id);
      continue;
    }
    const angelegt = await marken.insert({ name: marke }).select("id").single();
    if (angelegt.error || !angelegt.data) {
      throw new Error(angelegt.error?.message ?? `Der Hersteller ${marke} liess sich nicht anlegen.`);
    }
    markeZuId.set(marke, angelegt.data.id);
  }
  return markeZuId;
}
