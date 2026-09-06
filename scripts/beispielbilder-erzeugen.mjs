// Erzeugt die drei Beispielbilder in public/beispiele. Aufruf aus dem
// Projektverzeichnis: node scripts/beispielbilder-erzeugen.mjs

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const S = 640;
// 4x Supersampling fuer weiche Kanten
const SS = 2;

function render(fn, name) {
  const W = S * SS;
  const acc = new Float64Array(S * S * 3);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = fn(x / W, y / W);
      const i = ((y / SS) | 0) * S * 3 + (((x / SS) | 0) * 3);
      acc[i] += r; acc[i + 1] += g; acc[i + 2] += b;
    }
  }
  const n = SS * SS;
  const buf = Buffer.alloc(S * S * 3);
  for (let i = 0; i < acc.length; i++) buf[i] = Math.max(0, Math.min(255, Math.round(acc[i] / n)));
  writeFileSync(`public/beispiele/${name}.png`, png(S, S, buf));
  console.log("geschrieben:", name);
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// ---- Blume -----------------------------------------------------------------
render((x, y) => {
  const cx = x - 0.5, cy = y - 0.5;
  const r = Math.hypot(cx, cy), a = Math.atan2(cy, cx);
  // Hintergrund: sanfter Verlauf
  let col = mix([238, 236, 222], [206, 216, 200], y * 0.9 + x * 0.1);
  // Blaetter unten
  const blatt = (px, py, winkel, lang, breit) => {
    const dx = cx - px, dy = cy - py;
    const u = dx * Math.cos(winkel) + dy * Math.sin(winkel);
    const v = -dx * Math.sin(winkel) + dy * Math.cos(winkel);
    return Math.hypot(u / lang, v / breit);
  };
  const bl = blatt(-0.20, 0.30, -0.55, 0.20, 0.065);
  if (bl < 1) col = mix(col, mix([74, 122, 58], [116, 162, 82], 1 - bl), smooth(1.0, 0.85, bl));
  const br = blatt(0.21, 0.36, 0.6, 0.17, 0.058);
  if (br < 1) col = mix(col, mix([62, 106, 50], [104, 150, 72], 1 - br), smooth(1.0, 0.85, br));
  // Stiel
  const stem = Math.abs(cx - Math.sin(cy * 4) * 0.02);
  if (cy > 0.02 && stem < 0.022) col = mix(col, [66, 112, 52], smooth(0.022, 0.014, stem));
  // Blueten: 8 Blaetter
  const petal = 0.30 + 0.09 * Math.cos(a * 8);
  if (r < petal) {
    const t = r / petal;
    col = mix(col, mix([232, 96, 120], [196, 44, 74], t * 0.9), smooth(petal, petal - 0.02, r));
  }
  // Mitte
  if (r < 0.115) col = mix(col, mix([250, 214, 96], [214, 154, 44], r / 0.115), smooth(0.115, 0.10, r));
  return col;
}, "blume");

// ---- Katze -----------------------------------------------------------------
render((x, y) => {
  let col = mix([246, 240, 226], [214, 206, 226], (x + y) * 0.5);
  const cx = x - 0.5;
  // Koerper
  const bodyX = cx / 0.30, bodyY = (y - 0.72) / 0.26;
  const body = Math.hypot(bodyX, bodyY);
  // Kopf
  const headX = cx / 0.20, headY = (y - 0.36) / 0.185;
  const head = Math.hypot(headX, headY);
  // Ohren
  // Ohr als Dreieck: von der Spitze (y = 0.17) nach unten breiter werdend
  const ohr = (ex) => {
    if (y < 0.17 || y > 0.34) return 2;
    return Math.abs(x - ex) / Math.max(1e-6, (y - 0.17) * 0.62);
  };
  const ohrL = ohr(0.375);
  const ohrR = ohr(0.625);
  // Schwanz
  const tail = Math.abs(Math.hypot(x - 0.80, y - 0.80) - 0.17);
  const fell = (u, v) => mix([92, 78, 70], [150, 132, 118], 0.5 + 0.5 * Math.sin(u * 26) * Math.cos(v * 20) * 0.6);
  if (tail < 0.035 && x > 0.68) col = mix(col, fell(x, y), smooth(0.035, 0.022, tail));
  if (body < 1) col = mix(col, fell(x, y), smooth(1.0, 0.94, body));
  if (ohrL < 1) col = mix(col, fell(x, y), smooth(1.0, 0.82, ohrL));
  if (ohrR < 1) col = mix(col, fell(x, y), smooth(1.0, 0.82, ohrR));
  if (head < 1) col = mix(col, fell(x, y), smooth(1.0, 0.94, head));
  // Augen
  for (const ex of [0.425, 0.575]) {
    const e = Math.hypot((x - ex) / 0.042, (y - 0.345) / 0.032);
    if (e < 1) col = mix(col, [86, 158, 96], smooth(1.0, 0.7, e));
    const p = Math.hypot((x - ex) / 0.014, (y - 0.345) / 0.026);
    if (p < 1) col = mix(col, [26, 26, 26], smooth(1.0, 0.6, p));
  }
  // Nase
  const nose = Math.hypot((x - 0.5) / 0.030, (y - 0.425) / 0.022);
  if (nose < 1) col = mix(col, [206, 132, 140], smooth(1.0, 0.7, nose));
  return col;
}, "katze");

// ---- Haus am See -----------------------------------------------------------
render((x, y) => {
  // Himmel
  let col = mix([126, 178, 222], [226, 232, 226], smooth(0.0, 0.55, y));
  // Sonne
  const s = Math.hypot(x - 0.76, y - 0.16);
  if (s < 0.085) col = mix(col, [252, 236, 176], smooth(0.085, 0.055, s));
  // Wolke
  const w1 = Math.hypot((x - 0.28) / 0.14, (y - 0.19) / 0.055);
  const w2 = Math.hypot((x - 0.38) / 0.10, (y - 0.21) / 0.045);
  if (w1 < 1 || w2 < 1) col = mix(col, [248, 248, 244], smooth(1.0, 0.6, Math.min(w1, w2)));
  // Huegel hinten
  const h1 = 0.52 - 0.10 * Math.sin(x * 3.1 + 0.4);
  if (y > h1) col = mix(col, [104, 132, 96], smooth(h1, h1 + 0.02, y));
  // Wiese
  const h2 = 0.60 - 0.04 * Math.sin(x * 5.0);
  if (y > h2) col = mix(col, mix([124, 162, 84], [90, 128, 62], smooth(h2, 1.0, y)), smooth(h2, h2 + 0.02, y));
  // See
  const seeTop = 0.74;
  if (y > seeTop) {
    const wobble = 0.5 + 0.5 * Math.sin(y * 90) * 0.35;
    col = mix(col, mix([58, 108, 152], [96, 148, 186], wobble), smooth(seeTop, seeTop + 0.015, y));
  }
  // Haus
  const inHaus = x > 0.40 && x < 0.60 && y > 0.50 && y < 0.66;
  if (inHaus) col = mix(col, [222, 206, 182], 1);
  // Dach
  if (y > 0.42 && y < 0.505 && Math.abs(x - 0.50) < (y - 0.42) * 1.45) col = mix(col, [150, 66, 54], 1);
  // Tuer und Fenster
  if (x > 0.475 && x < 0.525 && y > 0.575 && y < 0.66) col = mix(col, [96, 66, 46], 1);
  if (x > 0.425 && x < 0.465 && y > 0.535 && y < 0.575) col = mix(col, [120, 168, 190], 1);
  // Baum
  const t = Math.hypot((x - 0.235) / 0.075, (y - 0.545) / 0.085);
  if (x > 0.222 && x < 0.248 && y > 0.53 && y < 0.66) col = mix(col, [92, 68, 46], 1);
  if (t < 1) col = mix(col, mix([70, 118, 60], [112, 156, 82], 1 - t), smooth(1.0, 0.85, t));
  return col;
}, "haus-am-see");
