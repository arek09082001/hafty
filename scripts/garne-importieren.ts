/**
 * Garnfarben aus einer CSV-Datei in die Datenbank laden.
 * ---------------------------------------------------------------------------
 *
 * Aufruf aus dem Projektverzeichnis:
 *
 *   npm run garne-importieren -- data/garne-ariadna.csv
 *
 * Erwartet werden die Umgebungsvariablen NEXT_PUBLIC_SUPABASE_URL und
 * SUPABASE_SERVICE_ROLE_KEY (der Dienstschlüssel, weil die Kataloge nur
 * darüber beschreibbar sind – siehe die Policies in 0001_schema.sql).
 *
 * Spaltenformat: brand,code,name,hex
 *
 * Die Lab-Werte werden hier **einmal** vorberechnet und mitgespeichert.
 * Zur Laufzeit müssen dann nur noch Abstände gerechnet werden und nie mehr
 * eine Farbraumumrechnung – bei 500 Garnen und 24 Clustern spart das pro
 * Musterlauf eine halbe Million Umrechnungen.
 *
 * Die Hexwerte der Hersteller sind Näherungen. Sie geben die Richtung an,
 * ersetzen aber keine Garnkarte; deshalb kann jede Farbe der Legende in der
 * App von Hand auf ein anderes Garn geändert werden.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { hexNachLab } from "../src/lib/farbe/lab.ts";

type Zeile = { brand: string; code: string; name: string; hex: string };

function csvLesen(pfad: string): Zeile[] {
  const text = readFileSync(pfad, "utf8").replace(/^﻿/, "");
  const zeilen = text.split(/\r?\n/).filter((z) => z.trim() !== "");
  if (zeilen.length < 2) throw new Error("Die CSV-Datei enthält keine Daten.");

  const kopf = zeilen[0].split(",").map((s) => s.trim().toLowerCase());
  const erwartet = ["brand", "code", "name", "hex"];
  for (const spalte of erwartet) {
    if (!kopf.includes(spalte)) {
      throw new Error(`In der Kopfzeile fehlt die Spalte "${spalte}". Erwartet: ${erwartet.join(",")}`);
    }
  }

  return zeilen.slice(1).map((zeile, nummer) => {
    const teile = zeile.split(",").map((s) => s.trim());
    if (teile.length < 4) {
      throw new Error(`Zeile ${nummer + 2} hat weniger als vier Spalten: ${zeile}`);
    }
    const wert = (spalte: string) => teile[kopf.indexOf(spalte)];
    return {
      brand: wert("brand"),
      code: wert("code"),
      name: wert("name"),
      hex: wert("hex"),
    };
  });
}

async function main() {
  const pfad = process.argv[2] ?? "data/garne-ariadna.csv";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const schluessel = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !schluessel) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.\n" +
        "Beides steht in der Supabase-Oberfläche unter Project Settings -> API.",
    );
    process.exit(1);
  }

  const zeilen = csvLesen(pfad);
  const supabase = createClient(url, schluessel, { auth: { persistSession: false } });

  // --- Hersteller anlegen, soweit nötig ------------------------------------
  const marken = [...new Set(zeilen.map((z) => z.brand))];
  const markeZuId = new Map<string, string>();

  for (const marke of marken) {
    const vorhanden = await supabase.from("thread_brands").select("id").eq("name", marke).maybeSingle();
    if (vorhanden.data?.id) {
      markeZuId.set(marke, vorhanden.data.id as string);
      continue;
    }
    const angelegt = await supabase.from("thread_brands").insert({ name: marke }).select("id").single();
    if (angelegt.error) throw new Error(`Hersteller ${marke}: ${angelegt.error.message}`);
    markeZuId.set(marke, angelegt.data.id as string);
  }

  // --- Farben mit vorberechnetem Lab-Wert ----------------------------------
  const saetze = zeilen.map((zeile) => {
    const lab = hexNachLab(zeile.hex);
    return {
      brand_id: markeZuId.get(zeile.brand)!,
      code: zeile.code,
      name: zeile.name,
      hex: zeile.hex.toUpperCase(),
      lab_l: lab.L,
      lab_a: lab.a,
      lab_b: lab.b,
      discontinued: false,
    };
  });

  const { error } = await supabase
    .from("thread_colors")
    .upsert(saetze, { onConflict: "brand_id,code" });

  if (error) throw new Error(`Farben schreiben: ${error.message}`);

  console.log(`${saetze.length} Garnfarben aus ${pfad} übernommen.`);
  for (const marke of marken) {
    const anzahl = zeilen.filter((z) => z.brand === marke).length;
    console.log(`  ${marke}: ${anzahl}`);
  }
}

main().catch((fehler) => {
  console.error(fehler instanceof Error ? fehler.message : fehler);
  process.exit(1);
});
