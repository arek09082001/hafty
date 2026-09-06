// Verkleinert die Schriften für den Ausdruck auf die Zeichen, die die App
// wirklich braucht. Aufruf aus dem Projektverzeichnis:
//
//   node scripts/schrift-verkleinern.mjs
//
// Voraussetzung: fonttools (pip install fonttools) und die Liberation-Fonts
// (Paket fonts-liberation2). Die fertigen Dateien liegen danach in
// public/schriften und sind im Repo eingecheckt – das Skript muss also nur
// laufen, wenn sich der Zeichenvorrat ändert.
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";

const QUELLE = "/usr/share/fonts/truetype/liberation";
const ZIEL = "public/schriften";

// Latin-1 und Latin Extended-A decken Deutsch und Polnisch ab, dazu die
// gängigen Nachbarsprachen – ein Dateiname aus einem tschechischen oder
// ungarischen Foto soll den Ausdruck nicht zerlegen. Dazu die Zeichen, die
// als Symbole im Zählmuster stehen.
const BEREICHE = [
  "U+0020-007E", // ASCII
  "U+00A0-00FF", // Latin-1 (ä ö ü ß é ç …)
  "U+0100-017F", // Latin Extended-A (ą ć ę ł ń ó ś ź ż …)
  "U+2013-2014", // Halbgeviert- und Geviertstrich
  "U+2018-201E", // Anführungszeichen
  "U+2022", // Aufzählungspunkt
  "U+00B7", // Mittelpunkt
  "U+2026", // Auslassungspunkte
  "U+00D7", // Malzeichen
].join(",");

mkdirSync(ZIEL, { recursive: true });

for (const [quelle, ziel] of [
  ["LiberationSans-Regular.ttf", "schrift-normal.ttf"],
  ["LiberationSans-Bold.ttf", "schrift-fett.ttf"],
]) {
  execFileSync("pyftsubset", [
    `${QUELLE}/${quelle}`,
    `--unicodes=${BEREICHE}`,
    `--output-file=${ZIEL}/${ziel}`,
    "--layout-features=",
    "--no-hinting",
    "--desubroutinize",
    "--drop-tables+=DSIG",
  ]);
  const vorher = statSync(`${QUELLE}/${quelle}`).size;
  const nachher = statSync(`${ZIEL}/${ziel}`).size;
  console.log(
    `${ziel}: ${(nachher / 1024).toFixed(0)} kB (aus ${(vorher / 1024).toFixed(0)} kB)`,
  );
}
