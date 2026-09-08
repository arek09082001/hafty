/**
 * Ariadna-Farben aus den Garnfotos des Ladens ableiten.
 * ---------------------------------------------------------------------------
 *
 * Aufruf aus dem Projektverzeichnis:
 *
 *   npm run garne-ableiten
 *
 * Das Ergebnis sind data/garne-ariadna.csv und data/garne-dmc.csv. Beide
 * liegen fertig im Projekt; dieses Skript ist dafür da, dass jeder
 * nachrechnen kann, wo die Zahlen herkommen.
 *
 *
 * Woher die Zahlen kommen
 * =======================
 *
 * Ariadna veröffentlicht keine Farbwerte. Es gibt nur zwei Dinge:
 *
 *   1. die Garnnummern selbst (1500 bis 1819, dazu einige mit Buchstaben),
 *   2. Fotos der einzelnen Garnstränge im Laden von Coricamo,
 *      unter https://www.coricamo.pl/muliny/img/956-<nummer>.png
 *
 * Aus dem Foto lässt sich eine Farbe lesen. Nur ist das Foto nicht die
 * Garnfarbe: die Bilder sind nachbearbeitet und deutlich übersättigt. Bei
 * roten Garnen liegt der Grünkanal auf 0 – so etwas gibt es bei echtem Garn
 * nicht. Wer die Fotowerte einfach übernimmt, bekommt eine zu bunte und zu
 * dunkle Palette, und die Mustererstellung greift dann systematisch daneben.
 *
 * Der Ausweg: für DMC gibt es im selben Laden dieselbe Art Foto **und**
 * zusätzlich eine veröffentlichte Farbtafel (data/dmc-farbtafel.csv). Das
 * sind 488 Paare aus "so sieht das Foto aus" und "so ist die Farbe wirklich".
 * Daraus lernen wir, wie die Bildbearbeitung des Ladens Farben verschiebt,
 * und rechnen diese Verschiebung bei den Ariadna-Fotos wieder heraus.
 *
 * Gerechnet wird durchgehend in Lab, nicht in RGB. In Lab wiegt ein Fehler
 * so schwer, wie das Auge ihn sieht. In RGB dagegen bestimmen die hellen
 * Farben die Rechnung, und die dunklen werden aufgehellt – dort kam
 * Ariadna 1819 (Schwarz) als Dunkelgrau heraus.
 *
 * Wie genau das ist, misst das Skript selbst und schreibt es hin: es hält
 * jeweils ein Fünftel der DMC-Farben zurück, eicht auf dem Rest und prüft an
 * den zurückgehaltenen. Zum Einordnen: zwei veröffentlichte DMC-Tafeln
 * unterscheiden sich untereinander um im Mittel ΔE 9.
 *
 * Alle Farbwerte bleiben Näherungen. Sie ersetzen keine Garnkarte, und
 * deshalb lässt sich in der App jede Farbe der Legende von Hand auf ein
 * anderes Garn ändern.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import path from "node:path";

const WURZEL = path.resolve(import.meta.dirname, "..");
const ZWISCHENLAGER = path.join(WURZEL, ".garnbilder");
const QUELLE = "https://www.coricamo.pl/muliny/img/";

// ---------------------------------------------------------------------------
// PNG lesen
// ---------------------------------------------------------------------------

/**
 * Ein kleiner PNG-Leser, nur so viel wie nötig: 8 Bit je Kanal, nicht
 * verschachtelt, Farbtyp 2 (RGB), 3 (Farbtabelle) oder 6 (RGB mit
 * Deckkraft). Genau das liefert der Laden. Eine Bibliothek dafür ins Projekt
 * zu holen wäre für dieses eine Skript zu viel.
 */
function pngLesen(daten) {
  if (daten.readUInt32BE(0) !== 0x89504e47) throw new Error("Das ist keine PNG-Datei.");
  let breite = 0, hoehe = 0, tiefe = 0, typ = 0;
  const teile = [];
  let tabelle = null;

  for (let i = 8; i < daten.length; ) {
    const laenge = daten.readUInt32BE(i);
    const name = daten.toString("ascii", i + 4, i + 8);
    const inhalt = daten.subarray(i + 8, i + 8 + laenge);
    if (name === "IHDR") {
      breite = inhalt.readUInt32BE(0);
      hoehe = inhalt.readUInt32BE(4);
      tiefe = inhalt[8];
      typ = inhalt[9];
      if (tiefe !== 8) throw new Error(`Nur 8 Bit je Kanal, hier sind es ${tiefe}.`);
      if (inhalt[12] !== 0) throw new Error("Verschachtelte PNG-Dateien kann dieser Leser nicht.");
    } else if (name === "PLTE") {
      tabelle = Buffer.from(inhalt);
    } else if (name === "IDAT") {
      teile.push(Buffer.from(inhalt));
    } else if (name === "IEND") break;
    i += 12 + laenge;
  }

  const kanaele = typ === 2 ? 3 : typ === 6 ? 4 : typ === 3 ? 1 : 0;
  if (!kanaele) throw new Error(`Farbtyp ${typ} kann dieser Leser nicht.`);

  const roh = inflateSync(Buffer.concat(teile));
  const zeilenlaenge = breite * kanaele;
  const bild = Buffer.alloc(hoehe * zeilenlaenge);

  // Jede Zeile trägt vorn ein Byte, das sagt, wie sie gefiltert wurde.
  // Das machen wir hier rückgängig (siehe PNG-Norm, Abschnitt 9.2).
  for (let y = 0; y < hoehe; y++) {
    const art = roh[y * (zeilenlaenge + 1)];
    const ein = roh.subarray(y * (zeilenlaenge + 1) + 1, (y + 1) * (zeilenlaenge + 1));
    const aus = bild.subarray(y * zeilenlaenge, (y + 1) * zeilenlaenge);
    const oben = y > 0 ? bild.subarray((y - 1) * zeilenlaenge, y * zeilenlaenge) : null;
    for (let x = 0; x < zeilenlaenge; x++) {
      const a = x >= kanaele ? aus[x - kanaele] : 0;     // links
      const b = oben ? oben[x] : 0;                       // oben
      const c = oben && x >= kanaele ? oben[x - kanaele] : 0; // links oben
      let wert = ein[x];
      if (art === 1) wert += a;
      else if (art === 2) wert += b;
      else if (art === 3) wert += (a + b) >> 1;
      else if (art === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        wert += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      aus[x] = wert & 0xff;
    }
  }

  // Auf reines RGB bringen
  const px = new Uint8Array(breite * hoehe * 3);
  for (let i = 0, n = breite * hoehe; i < n; i++) {
    if (typ === 3) {
      const k = bild[i] * 3;
      px[i * 3] = tabelle[k]; px[i * 3 + 1] = tabelle[k + 1]; px[i * 3 + 2] = tabelle[k + 2];
    } else {
      px[i * 3] = bild[i * kanaele];
      px[i * 3 + 1] = bild[i * kanaele + 1];
      px[i * 3 + 2] = bild[i * kanaele + 2];
    }
  }
  return { breite, hoehe, px };
}

// ---------------------------------------------------------------------------
// Farbraum (dieselben Formeln wie in src/lib/farbe/lab.ts)
// ---------------------------------------------------------------------------

const GAMMA_WEG = new Float64Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255;
  GAMMA_WEG[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function gammaDrauf(v) {
  const w = v <= 0 ? 0 : v >= 1 ? 1 : v;
  const s = w <= 0.0031308 ? w * 12.92 : 1.055 * Math.pow(w, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(s * 255)));
}

function linearNachLab(r, g, b) {
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labNachLinear(L, A, B) {
  const fy = (L + 16) / 116, fx = fy + A / 500, fz = fy - B / 200;
  const g = (t) => (t * t * t > 216 / 24389 ? t * t * t : (116 * t - 16) / (24389 / 27));
  const X = g(fx) * 0.95047, Y = g(fy), Z = g(fz) * 1.08883;
  return [
    3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z,
    -0.969266 * X + 1.8760108 * Y + 0.041556 * Z,
    0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z,
  ];
}

const hexNachLinear = (h) => [1, 3, 5].map((i) => GAMMA_WEG[parseInt(h.slice(i, i + 2), 16)]);
const linearNachHex = (r, g, b) =>
  "#" + [r, g, b].map((v) => gammaDrauf(v).toString(16).toUpperCase().padStart(2, "0")).join("");
const hexNachLab = (h) => linearNachLab(...hexNachLinear(h));

/** CIEDE2000 – nur zum Messen, wie gut die Eichung ist. */
function ciede2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)) || 0);
  const a1s = (1 + G) * a1, a2s = (1 + G) * a2;
  const C1s = Math.hypot(a1s, b1), C2s = Math.hypot(a2s, b2);
  const h1 = a1s === 0 && b1 === 0 ? 0 : ((Math.atan2(b1, a1s) / rad) + 360) % 360;
  const h2 = a2s === 0 && b2 === 0 ? 0 : ((Math.atan2(b2, a2s) / rad) + 360) % 360;
  const dL = L2 - L1, dC = C2s - C1s;
  let dh = 0;
  if (C1s * C2s !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(C1s * C2s) * Math.sin((dh * rad) / 2);
  const Lm = (L1 + L2) / 2, Cms = (C1s + C2s) / 2;
  let hm;
  if (C1s * C2s === 0) hm = h1 + h2;
  else if (Math.abs(h1 - h2) <= 180) hm = (h1 + h2) / 2;
  else hm = h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad)
    + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cms ** 7 / (Cms ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
  const Sc = 1 + 0.045 * Cms;
  const Sh = 1 + 0.015 * Cms * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

// ---------------------------------------------------------------------------
// Aus einem Garnfoto eine Farbe lesen
// ---------------------------------------------------------------------------

/**
 * Die Bilder zeigen einen aufgewickelten Strang: Glanzlichter oben auf den
 * Fäden, dunkle Furchen dazwischen. Beides ist Beleuchtung, nicht Farbe.
 * Deshalb sortieren wir alle Bildpunkte nach Helligkeit, werfen das hellste
 * und das dunkelste Viertel weg und mitteln den Rest in linearem Licht.
 * Nur dort ist Mitteln physikalisch richtig; in Gamma-Werten käme es zu
 * dunkel heraus.
 */
function kernfarbe(px) {
  const n = px.length / 3;
  const lin = new Float64Array(px.length);
  const hell = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const r = GAMMA_WEG[px[i * 3]], g = GAMMA_WEG[px[i * 3 + 1]], b = GAMMA_WEG[px[i * 3 + 2]];
    lin[i * 3] = r; lin[i * 3 + 1] = g; lin[i * 3 + 2] = b;
    hell[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const reihe = Array.from({ length: n }, (_, i) => i).sort((a, b) => hell[a] - hell[b]);
  const weg = Math.floor(n * 0.25);
  const kern = reihe.slice(weg, n - weg);
  let r = 0, g = 0, b = 0;
  for (const i of kern) { r += lin[i * 3]; g += lin[i * 3 + 1]; b += lin[i * 3 + 2]; }
  return linearNachHex(r / kern.length, g / kern.length, b / kern.length);
}

// ---------------------------------------------------------------------------
// Eichung: kubisches Polynom über Lab, kleinste Quadrate
// ---------------------------------------------------------------------------

/** Die zwanzig Glieder des Modells, über auf etwa 0..1 gebrachte Lab-Werte. */
function glieder([L, A, B]) {
  const a = L / 100, b = A / 128, c = B / 128;
  return [1, a, b, c, a * a, b * b, c * c, a * b, a * c, b * c,
    a ** 3, b ** 3, c ** 3, a * a * b, a * a * c, b * b * a, b * b * c, c * c * a, c * c * b, a * b * c];
}

/**
 * Kleinste Quadrate über die Normalengleichungen (AᵀA)k = AᵀY, gelöst mit
 * Gauß-Elimination und Spaltenpivotsuche. Bei 20 Unbekannten und 488
 * Messwerten ist das genau genug und kommt ohne Fremdbibliothek aus.
 */
function anpassen(eingang, ausgang) {
  const m = eingang[0].length, z = ausgang[0].length;
  const N = Array.from({ length: m }, () => new Float64Array(m + z));
  for (let p = 0; p < eingang.length; p++) {
    const x = eingang[p], y = ausgang[p];
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) N[i][j] += x[i] * x[j];
      for (let j = 0; j < z; j++) N[i][m + j] += x[i] * y[j];
    }
  }
  for (let i = 0; i < m; i++) {
    let beste = i;
    for (let r = i + 1; r < m; r++) if (Math.abs(N[r][i]) > Math.abs(N[beste][i])) beste = r;
    [N[i], N[beste]] = [N[beste], N[i]];
    const spitze = N[i][i];
    if (Math.abs(spitze) < 1e-12) throw new Error("Die Eichung lässt sich nicht lösen.");
    for (let j = i; j < m + z; j++) N[i][j] /= spitze;
    for (let r = 0; r < m; r++) {
      if (r === i) continue;
      const f = N[r][i];
      if (f === 0) continue;
      for (let j = i; j < m + z; j++) N[r][j] -= f * N[i][j];
    }
  }
  return N.map((zeile) => Array.from(zeile.subarray(m)));
}

function anwenden(k, lab) {
  const g = glieder(lab);
  return [0, 1, 2].map((j) => g.reduce((s, v, i) => s + v * k[i][j], 0));
}

// ---------------------------------------------------------------------------
// Bilder holen
// ---------------------------------------------------------------------------

// Der Laden benennt das Bild von DMC "White" nach der alten Bezeichnung
// "BLANC", und fuer "Ecru" gibt es ueberhaupt keines.
const BILDNAME_ANDERS = { White: "BLANC" };

function bildname(marke, code) {
  if (marke === "ariadna") return `956-${code}`;
  const c = BILDNAME_ANDERS[code] ?? code;
  return `952-${c.length > 1 ? "" : "0"}${c}`;
}

async function bildHolen(name) {
  const ziel = path.join(ZWISCHENLAGER, `${name}.png`);
  if (existsSync(ziel)) return readFileSync(ziel);
  for (let versuch = 0; versuch < 3; versuch++) {
    try {
      const a = await fetch(QUELLE + name + ".png", {
        headers: { "User-Agent": "hafty/1.0 (Garnfarben)", Referer: "https://www.coricamo.pl/zamiennik_mulin" },
        signal: AbortSignal.timeout(30_000),
      });
      // Was es nicht gibt, gibt es auch beim dritten Versuch nicht.
      if (a.status === 404) return null;
      if (!a.ok) throw new Error(`${a.status}`);
      const daten = Buffer.from(await a.arrayBuffer());
      writeFileSync(ziel, daten);
      return daten;
    } catch (fehler) {
      if (versuch === 2) return null;
      await new Promise((f) => setTimeout(f, 1500 * (versuch + 1)));
    }
  }
  return null;
}

/** Bilder in kleinen Bündeln holen, damit wir den Laden nicht überrennen. */
async function fotofarben(marke, codes) {
  const aus = new Map();
  for (let i = 0; i < codes.length; i += 6) {
    const buendel = codes.slice(i, i + 6);
    const daten = await Promise.all(buendel.map((c) => bildHolen(bildname(marke, c))));
    buendel.forEach((c, j) => { if (daten[j]) aus.set(c, kernfarbe(pngLesen(daten[j]).px)); });
    process.stdout.write(`\r  ${marke}: ${Math.min(i + 6, codes.length)}/${codes.length}`);
  }
  process.stdout.write("\n");
  return aus;
}

// ---------------------------------------------------------------------------
// Hilfsmittel
// ---------------------------------------------------------------------------

function csvLesen(pfad) {
  const zeilen = readFileSync(pfad, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((z) => z.trim());
  const kopf = zeilen[0].split(",").map((s) => s.trim());
  return zeilen.slice(1).map((z) => {
    const teile = z.split(",");
    return Object.fromEntries(kopf.map((s, i) => [s, (teile[i] ?? "").trim()]));
  });
}

/** Führende Nullen weg, damit "01" und "1" dieselbe Farbe treffen. */
const schluessel = (code) => code.replace(/^0+(?=\d)/, "").toUpperCase();

function streuung(name, werte) {
  const v = [...werte].sort((a, b) => a - b);
  const mittel = v.reduce((s, x) => s + x, 0) / v.length;
  console.log(`  ${name.padEnd(32)} Mittel ${mittel.toFixed(2).padStart(5)}` +
    `  Median ${v[v.length >> 1].toFixed(2).padStart(5)}` +
    `  p90 ${v[Math.floor(v.length * 0.9)].toFixed(2).padStart(5)}`);
}

/** Immer dieselbe Reihenfolge, damit zwei Läufe dasselbe ergeben. */
function mischen(liste, saat) {
  let z = saat >>> 0;
  const wuerfel = () => {
    z = (z + 0x6d2b79f5) >>> 0;
    let t = Math.imul(z ^ (z >>> 15), 1 | z);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(wuerfel() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------

async function main() {
  mkdirSync(ZWISCHENLAGER, { recursive: true });

  const tafel = new Map(csvLesen(path.join(WURZEL, "data/dmc-farbtafel.csv"))
    .map((z) => [schluessel(z.code), z]));
  const zuordnung = csvLesen(path.join(WURZEL, "data/coricamo-zuordnung.csv"));

  console.log("Garnfotos holen (beim ersten Mal dauert das ein paar Minuten):");
  const dmcFotos = await fotofarben("dmc", [...tafel.values()].map((z) => z.code));
  const ariadnaFotos = await fotofarben("ariadna", zuordnung.map((z) => z.ariadna));

  // --- Eichpaare: Foto gegen veröffentlichten Wert -------------------------
  const paare = [];
  for (const [code, hex] of dmcFotos) {
    const z = tafel.get(schluessel(code));
    if (z) paare.push([hexNachLab(hex), hexNachLab(z.hex)]);
  }
  console.log(`\nEichpaare aus DMC: ${paare.length}`);

  // --- Kreuzprobe: ein Fünftel jeweils zurückhalten ------------------------
  const misch = mischen(paare, 20240917);
  const teile = [0, 1, 2, 3, 4].map((i) => misch.filter((_, j) => j % 5 === i));
  const ohne = [], mit = [];
  for (let i = 0; i < 5; i++) {
    const lern = teile.filter((_, j) => j !== i).flat();
    const k = anpassen(lern.map(([f]) => glieder(f)), lern.map(([, s]) => s));
    for (const [foto, soll] of teile[i]) {
      ohne.push(ciede2000(foto, soll));
      const hex = linearNachHex(...labNachLinear(...anwenden(k, foto)));
      mit.push(ciede2000(hexNachLab(hex), soll));
    }
  }
  console.log("DMC-Fotos gegen die veröffentlichte Tafel, an zurückgehaltenen Farben:");
  streuung("ohne Eichung", ohne);
  streuung("mit Eichung", mit);

  // --- Endgültige Eichung und Ariadna-Palette -----------------------------
  const k = anpassen(paare.map(([f]) => glieder(f)), paare.map(([, s]) => s));
  const ariadna = new Map();
  for (const [code, hex] of ariadnaFotos) {
    ariadna.set(code, linearNachHex(...labNachLinear(...anwenden(k, hexNachLab(hex)))));
  }

  // --- Gegenprobe, in die nichts von der Rechnung eingeflossen ist ---------
  // Coricamo nennt selbst zu jeder Ariadna-Farbe die passende DMC-Farbe.
  // Wenn unsere Werte da in der Nähe landen, stimmt die Richtung.
  const abstand = [];
  for (const z of zuordnung) {
    const d = tafel.get(schluessel(z.dmc));
    if (d && ariadna.has(z.ariadna)) {
      abstand.push(ciede2000(hexNachLab(ariadna.get(z.ariadna)), hexNachLab(d.hex)));
    }
  }
  console.log("Ariadna-Farbe gegen die vom Laden genannte DMC-Entsprechung:");
  streuung("unsere Werte", abstand);

  // --- Schreiben ----------------------------------------------------------
  const ariadnaZeilen = ["brand,code,name,hex"];
  for (const z of zuordnung) {
    if (ariadna.has(z.ariadna)) ariadnaZeilen.push(`Ariadna,${z.ariadna},,${ariadna.get(z.ariadna)}`);
  }
  writeFileSync(path.join(WURZEL, "data/garne-ariadna.csv"), ariadnaZeilen.join("\n") + "\n");

  // DMC braucht keine Eichung: dort gibt es die veröffentlichten Werte.
  const dmcZeilen = ["brand,code,name,hex"];
  for (const z of tafel.values()) dmcZeilen.push(`DMC,${z.code},${z.name},${z.hex}`);
  writeFileSync(path.join(WURZEL, "data/garne-dmc.csv"), dmcZeilen.join("\n") + "\n");

  console.log(`\nGeschrieben: data/garne-ariadna.csv (${ariadnaZeilen.length - 1} Farben), ` +
    `data/garne-dmc.csv (${dmcZeilen.length - 1} Farben)`);
}

main().catch((fehler) => { console.error(fehler); process.exit(1); });
