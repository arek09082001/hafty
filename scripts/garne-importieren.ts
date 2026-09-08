/**
 * Garnfarben aus einer CSV-Datei in die Datenbank laden.
 * ---------------------------------------------------------------------------
 *
 * Dasselbe geht auch ohne Kommandozeile: in der App unter "Meine Garne"
 * steht der Knopf "Ariadna-Farben jetzt einlesen". Beide Wege benutzen
 * dieselbe Logik aus src/lib/garne/katalog.ts.
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
 * Die Lab-Werte werden **einmal** vorberechnet und mitgespeichert. Zur
 * Laufzeit müssen dann nur noch Abstände gerechnet werden und nie mehr eine
 * Farbraumumrechnung.
 *
 * Die Hexwerte der Hersteller sind Näherungen. Sie geben die Richtung an,
 * ersetzen aber keine Garnkarte; deshalb kann jede Farbe der Legende in der
 * App von Hand auf ein anderes Garn geändert werden.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { csvLesen, markenAnlegen, saetzeBauen } from "../src/lib/garne/katalog.ts";

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

  const zeilen = csvLesen(readFileSync(pfad, "utf8"));
  const supabase = createClient(url, schluessel, { auth: { persistSession: false } });

  const markeZuId = await markenAnlegen(supabase, zeilen);
  const saetze = saetzeBauen(zeilen, markeZuId);

  for (let i = 0; i < saetze.length; i += 200) {
    const { error } = await supabase
      .from("thread_colors")
      .upsert(saetze.slice(i, i + 200), { onConflict: "brand_id,code" });
    if (error) throw new Error(`Farben schreiben: ${error.message}`);
  }

  console.log(`${saetze.length} Garnfarben aus ${pfad} übernommen.`);
  for (const marke of markeZuId.keys()) {
    console.log(`  ${marke}: ${zeilen.filter((z) => z.brand === marke).length}`);
  }
}

main().catch((fehler) => {
  console.error(fehler instanceof Error ? fehler.message : fehler);
  process.exit(1);
});
