/**
 * Aus data/garne-ariadna.csv ein Modul machen, das fest im Programm liegt.
 * ---------------------------------------------------------------------------
 *
 *   npm run garnkatalog
 *
 * Warum überhaupt? Damit die App **ohne Internet** vollständig ist. Die
 * Garnfarben sind unveränderliche Daten – es gibt keinen Grund, sie bei
 * jedem Start über das Netz zu holen. Sie liegen jetzt im ausgelieferten
 * Programm und stehen sofort zur Verfügung, auch beim allerersten Start
 * ohne Verbindung.
 *
 * Die Lab-Werte stehen bewusst **nicht** in der Datei. Sie aus 375 Hexwerten
 * zu rechnen dauert weniger als eine Millisekunde; sie mitzuschreiben würde
 * die Datei verdreifachen und eine zweite Wahrheit schaffen, die zum Hexwert
 * nicht mehr passen könnte.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const WURZEL = path.resolve(import.meta.dirname, "..");
const QUELLE = path.join(WURZEL, "data/garne-ariadna.csv");
const ZIEL = path.join(WURZEL, "src/lib/garne/katalog-daten.ts");

const zeilen = readFileSync(QUELLE, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((z) => z.trim());
const kopf = zeilen[0].split(",").map((s) => s.trim());
const spalte = (teile, name) => teile[kopf.indexOf(name)]?.trim() ?? "";

const garne = zeilen.slice(1).map((zeile) => {
  const teile = zeile.split(",");
  const marke = spalte(teile, "brand");
  const code = spalte(teile, "code");
  const hex = spalte(teile, "hex").toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(hex)) throw new Error(`Ungültiger Farbwert in: ${zeile}`);
  if (!marke || !code) throw new Error(`Hersteller oder Nummer fehlt in: ${zeile}`);
  return { marke, code, hex };
});

const marken = [...new Set(garne.map((g) => g.marke))];
if (marken.length !== 1) throw new Error(`Erwartet wird genau ein Hersteller, gefunden: ${marken.join(", ")}`);

const inhalt = `// Erzeugt von scripts/garnkatalog-erzeugen.mjs aus data/garne-ariadna.csv.
// Nicht von Hand ändern – stattdessen die CSV ändern und "npm run garnkatalog"
// laufen lassen.
//
// Woher die Farbwerte kommen, steht in der README unter "Die Garnfarben".

/** Hersteller aller hier aufgeführten Garne. */
export const MARKE = ${JSON.stringify(marken[0])};

/** Nummer und Farbwert, in der Reihenfolge der Garnkarte. */
export const GARNE: readonly (readonly [code: string, hex: string])[] = [
${garne.map((g) => `  [${JSON.stringify(g.code)}, ${JSON.stringify(g.hex)}],`).join("\n")}
];
`;

writeFileSync(ZIEL, inhalt);
console.log(`${garne.length} Garne von ${marken[0]} nach ${path.relative(WURZEL, ZIEL)} geschrieben.`);
