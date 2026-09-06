/**
 * Farbraumumrechnung sRGB -> CIELAB.
 * ---------------------------------------------------------------------------
 *
 * Warum ueberhaupt Lab? In sRGB liegen Farben so, wie ein Bildschirm sie
 * ansteuert, nicht so, wie ein Mensch sie sieht. Der euklidische Abstand
 * zwischen zwei sRGB-Tripeln sagt deshalb wenig darueber aus, ob zwei Farben
 * fuer das Auge aehnlich sind: ein Schritt von (0,0,0) nach (10,10,10) ist
 * sichtbar, ein Schritt von (200,200,200) nach (210,210,210) kaum. CIELAB ist
 * dagegen ungefaehr wahrnehmungsgleichabstaendig. Genau das brauchen wir:
 * das k-Means gruppiert Farben nach dem, was die Nutzerin als "aehnlich"
 * empfindet, und das Garnmapping sucht den Ton, der wirklich am naechsten
 * aussieht.
 *
 * Der Weg fuehrt in drei Etappen:
 *
 *   1. sRGB (0..255)  ->  lineares RGB (0..1)
 *      sRGB-Werte sind gammakodiert. Ein Wert von 128 ist nicht "halbe
 *      Lichtmenge", sondern ungefaehr 21 % davon. Vor jeder physikalischen
 *      Rechnung – Mitteln, Umrechnen – muss diese Kodierung heraus.
 *
 *   2. lineares RGB   ->  XYZ (Normlichtart D65, 2-Grad-Beobachter)
 *      Eine feste 3x3-Matrix. XYZ ist ein geraetefreier Zwischenraum.
 *
 *   3. XYZ            ->  Lab
 *      Kubikwurzel-artige Kennlinie relativ zum Weisspunkt D65.
 *      L* = Helligkeit 0..100, a* = gruen/rot, b* = blau/gelb.
 */

/** Weisspunkt D65, 2-Grad-Beobachter, auf Y = 1 normiert. */
const WEISS_X = 0.95047;
const WEISS_Y = 1.0;
const WEISS_Z = 1.08883;

/**
 * Ein sRGB-Kanal (0..1) wird von der Gammakodierung befreit.
 * Die Kurve ist stueckweise: unterhalb von 0,04045 linear (damit sie im
 * Dunkeln nicht unendlich steil wird), darueber eine Potenz mit 2,4.
 */
export function gammaEntfernen(kanal01: number): number {
  return kanal01 <= 0.04045 ? kanal01 / 12.92 : Math.pow((kanal01 + 0.055) / 1.055, 2.4);
}

/** Die Umkehrung: lineares Licht zurueck in einen sRGB-Kanal (0..1). */
export function gammaAnwenden(linear: number): number {
  const v = linear <= 0.0031308 ? linear * 12.92 : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, v));
}

/**
 * Nachschlagetabelle fuer Schritt 1. Sie wird pro Worker einmal gebaut und
 * spart bei einer halben Million Pixeln sehr viele `Math.pow`-Aufrufe.
 */
const GAMMA_TABELLE = (() => {
  const t = new Float64Array(256);
  for (let i = 0; i < 256; i++) t[i] = gammaEntfernen(i / 255);
  return t;
})();

/** Die Kennlinie aus Schritt 3. */
function labKennlinie(t: number): number {
  // 6/29 hoch 3 – unterhalb davon wird linear fortgesetzt, damit die
  // Ableitung im Ursprung endlich bleibt.
  return t > 0.008856451679035631 ? Math.cbrt(t) : t * 7.787037037037035 + 16 / 116;
}

/** Umkehrung der Kennlinie. */
function labKennlinieUmkehr(t: number): number {
  const t3 = t * t * t;
  return t3 > 0.008856451679035631 ? t3 : (t - 16 / 116) / 7.787037037037035;
}

export type Lab = { L: number; a: number; b: number };

/**
 * sRGB (je 0..255) nach CIELAB. Das ist die Funktion, die in der Pipeline
 * einmal pro Rasterfeld und einmal pro Garnfarbe laeuft.
 */
export function rgbNachLab(r: number, g: number, b: number): Lab {
  // Schritt 1: Gamma heraus (per Tabelle).
  return linearNachLab(GAMMA_TABELLE[r | 0], GAMMA_TABELLE[g | 0], GAMMA_TABELLE[b | 0]);
}

/**
 * Schritt 2 und 3 fuer bereits linearisiertes Licht.
 *
 * Diese Variante braucht die Pipeline beim Herunterrechnen: dort werden die
 * Pixel eines Blocks gemittelt, und gemittelt werden darf nur im linearen
 * Licht. Wuerde man gammakodierte sRGB-Werte mitteln, kaeme aus einem Block
 * aus Schwarz und Weiss ein zu dunkles Grau heraus.
 */
export function linearNachLab(rl: number, gl: number, bl: number): Lab {
  // Schritt 2: lineares RGB -> XYZ (sRGB-Primaervalenzen, D65).
  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / WEISS_X;
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / WEISS_Y;
  const z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / WEISS_Z;

  // Schritt 3: XYZ -> Lab.
  const fx = labKennlinie(x);
  const fy = labKennlinie(y);
  const fz = labKennlinie(z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/** Ein sRGB-Byte (0..255) als lineares Licht (0..1) – ueber die Tabelle. */
export function byteNachLinear(v: number): number {
  return GAMMA_TABELLE[v | 0];
}

/** Lineares Licht (0..1) zurueck als sRGB-Byte. */
export function linearNachByte(v: number): number {
  return Math.round(gammaAnwenden(v) * 255);
}

/**
 * Rueckweg Lab -> sRGB. Wird gebraucht, um ein Clusterzentrum, das als
 * Mittelwert im Lab-Raum entstanden ist, wieder als Bildschirmfarbe zu zeigen.
 * Werte ausserhalb des sRGB-Gamuts werden abgeschnitten.
 */
export function labNachRgb(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  const x = labKennlinieUmkehr(fx) * WEISS_X;
  const y = labKennlinieUmkehr(fy) * WEISS_Y;
  const z = labKennlinieUmkehr(fz) * WEISS_Z;

  const rl = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  const gl = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
  const bl = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

  return [
    Math.round(gammaAnwenden(rl) * 255),
    Math.round(gammaAnwenden(gl) * 255),
    Math.round(gammaAnwenden(bl) * 255),
  ];
}

/** "#a1b2c3" -> [161, 178, 195]. Kurzform "#abc" wird ebenfalls verstanden. */
export function hexNachRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) {
    throw new Error(`Kein gueltiger Hexwert: ${hex}`);
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** [161, 178, 195] -> "#a1b2c3". */
export function rgbNachHex(r: number, g: number, b: number): string {
  const teil = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${teil(r)}${teil(g)}${teil(b)}`;
}

/** Bequemer Weg vom Hexwert direkt ins Lab – so werden Garnfarben importiert. */
export function hexNachLab(hex: string): Lab {
  const [r, g, b] = hexNachRgb(hex);
  return rgbNachLab(r, g, b);
}

/**
 * Wahrgenommene Helligkeit 0..1 – nur dafuer da, zu entscheiden, ob auf einem
 * Farbfeld schwarze oder weisse Schrift besser lesbar ist.
 */
export function istDunkel(r: number, g: number, b: number): boolean {
  const y = 0.2126 * GAMMA_TABELLE[r | 0] + 0.7152 * GAMMA_TABELLE[g | 0] + 0.0722 * GAMMA_TABELLE[b | 0];
  return y < 0.42;
}
