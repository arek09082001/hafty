/**
 * Die PNG-Symbole für die installierte App zeichnen.
 * ---------------------------------------------------------------------------
 *
 *   npm run symbole
 *
 * Betriebssysteme wollen für ein Programm im Startmenü oder im Dock ein PNG
 * in fester Größe; ein SVG genügt dort nicht überall.
 *
 * Gezeichnet wird dieselbe Zeichnung wie in src/app/icon.svg: ein Stück
 * Stoffraster mit drei Kreuzstichen. Bewusst mit harten Kanten und ohne
 * Weichzeichnen – bei einem Kreuzstichprogramm ist das kein Mangel, sondern
 * das Motiv.
 *
 * Vom großen Symbol gibt es zwei Fassungen: eine ganz ausgefüllte und eine
 * mit Rand. Android schneidet Symbole rund oder als abgerundetes Quadrat zu
 * ("maskable"); ohne Rand fielen dabei die äußeren Kreuze weg.
 *
 * Dazu kommt `src/app/apple-icon.png`. Auf dem iPad nimmt der Startbildschirm
 * weder das SVG noch die Symbole aus dem Manifest – ohne diese Datei malt iOS
 * sich selbst eines aus einem verkleinerten Abbild der Seite.
 */

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import path from "node:path";

const WURZEL = path.resolve(import.meta.dirname, "..");

// --- PNG schreiben ---------------------------------------------------------
function crc32(buf) {
  const tabelle = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabelle[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = tabelle[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function block(art, daten) {
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(daten.length);
  const mitArt = Buffer.concat([Buffer.from(art, "ascii"), daten]);
  const pruef = Buffer.alloc(4);
  pruef.writeUInt32BE(crc32(mitArt));
  return Buffer.concat([laenge, mitArt, pruef]);
}

function png(breite, hoehe, rgb) {
  const kopf = Buffer.alloc(13);
  kopf.writeUInt32BE(breite, 0);
  kopf.writeUInt32BE(hoehe, 4);
  kopf[8] = 8; kopf[9] = 2; // 8 Bit, Farbtyp 2 (RGB)
  const roh = Buffer.alloc(hoehe * (breite * 3 + 1));
  for (let y = 0; y < hoehe; y++) {
    roh[y * (breite * 3 + 1)] = 0; // Filter "keiner"
    rgb.copy(roh, y * (breite * 3 + 1) + 1, y * breite * 3, (y + 1) * breite * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    block("IHDR", kopf),
    block("IDAT", deflateSync(roh, { level: 9 })),
    block("IEND", Buffer.alloc(0)),
  ]);
}

// --- Die Zeichnung ---------------------------------------------------------
const PAPIER = [0xfd, 0xfc, 0xf9];
const LINIE = [0xc9, 0xc4, 0xb8];
const GRUEN = [0x0b, 0x5d, 0x3b];
const ROT = [0x8a, 0x1c, 0x1c];

/**
 * Zeichnet in einem Feld von 32 mal 32 Einheiten – denselben Maßen wie das
 * SVG. `rand` verkleinert die Zeichnung, damit beim runden Zuschneiden
 * nichts abgeschnitten wird.
 *
 * Das Raster: drei mal drei Kästchen zu je zehn Einheiten, von 1 bis 31, mit
 * den Linien bei 11 und 21. Daraus folgen die Kästchenmitten 6, 16 und 26 –
 * und genau dort sitzen die Kreuze.
 *
 * Vorher stimmte das nicht. Die Linien liefen über das ganze Feld (0 bis 32),
 * die Kästchen waren also 11, 10 und 11 Einheiten breit, und die Kreuze
 * standen bei 5,5, 13,5 und 21,5: das erste zufällig mittig, das zweite zwei
 * ein halb daneben und das dritte genau auf der Linie. Im SVG lag es wieder
 * anders herum. Sichtbar war das als ein Symbol, dessen Kreuze nicht in ihren
 * Kästchen sitzen.
 */
/** Die Rasterlinien und damit die Kästchengrenzen. */
const LINIEN = [11, 21];
/** Wo das Raster anfängt und aufhört. */
const RAND_INNEN = 1;
const RAND_AUSSEN = 31;
function zeichnen(groesse, rand) {
  const puffer = Buffer.alloc(groesse * groesse * 3);
  const innen = groesse * (1 - 2 * rand);
  const proEinheit = innen / 32;
  const versatz = groesse * rand;
  const setzen = (x, y, farbe) => {
    const i = (y * groesse + x) * 3;
    puffer[i] = farbe[0]; puffer[i + 1] = farbe[1]; puffer[i + 2] = farbe[2];
  };

  // Ein Kreuz aus zwei Diagonalen, wie ein Kreuzstich.
  const kreuze = [
    { x: 6, y: 6, farbe: GRUEN },
    { x: 16, y: 16, farbe: ROT },
    { x: 26, y: 26, farbe: GRUEN },
  ];

  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      setzen(x, y, PAPIER);
      const ex = (x - versatz) / proEinheit;
      const ey = (y - versatz) / proEinheit;
      if (ex < 0 || ey < 0 || ex > 32 || ey > 32) continue;

      // Stoffraster. Die Linien enden mit dem Raster, sie laufen nicht bis
      // zum Bildrand – sonst waeren die aeusseren Kaestchen breiter als das
      // mittlere und die Kreuze sassen nicht mehr mittig.
      const imRaster =
        ex >= RAND_INNEN && ex <= RAND_AUSSEN && ey >= RAND_INNEN && ey <= RAND_AUSSEN;
      const aufLinie =
        imRaster &&
        LINIEN.some((l) => Math.abs(ex - l) < 0.35 || Math.abs(ey - l) < 0.35);
      if (aufLinie) setzen(x, y, LINIE);

      for (const k of kreuze) {
        const dx = ex - k.x;
        const dy = ey - k.y;
        if (Math.abs(dx) > 2.6 || Math.abs(dy) > 2.6) continue;
        // Abstand zu den beiden Diagonalen des Kästchens
        if (Math.abs(dx - dy) < 1.1 || Math.abs(dx + dy) < 1.1) setzen(x, y, k.farbe);
      }
    }
  }
  return puffer;
}

for (const [ziel, groesse, rand] of [
  ["public/symbol-192.png", 192, 0.04],
  ["public/symbol-512.png", 512, 0.04],
  ["public/symbol-maskierbar-512.png", 512, 0.14],
  // iOS rundet die Ecken selbst und mag keine Durchsichtigkeit – deshalb
  // dieselbe Zeichnung, nur randvoll und in der Groesse, die Apple erwartet.
  ["src/app/apple-icon.png", 180, 0.04],
]) {
  writeFileSync(path.join(WURZEL, ziel), png(groesse, groesse, zeichnen(groesse, rand)));
  console.log(`${ziel} (${groesse}×${groesse}) geschrieben`);
}
