/**
 * Die Bild-zu-Muster-Pipeline.
 * ---------------------------------------------------------------------------
 *
 * Alle Funktionen hier sind rein: sie bekommen Daten herein und geben Daten
 * heraus, ohne den DOM oder den Worker zu kennen. Der Worker
 * (`src/lib/worker/muster.worker.ts`) setzt sie in dieser Reihenfolge
 * zusammen:
 *
 *   1. Bild als ImageData laden                 (im Worker, OffscreenCanvas)
 *   2. herunterrechnen()   – Box-Averaging auf das Stichraster
 *   3. medianFilter()      – kantenerhaltendes Glätten des Rasters
 *   4. (Lab-Werte liegen ab Schritt 2 vor)
 *   5. kmeans()            – Farbreduktion auf k Farben im Lab-Raum
 *   6. aufGarneAbbilden()  – Clusterzentren auf reale Garne, CIEDE2000
 *   7. glaetten()          – Regularisierung gegen Einzelstiche (glaettung.ts)
 *   8. Ergebnis: Uint8Array mit Palettenindizes plus Legende
 */

import { byteNachLinear, labNachRgb, linearNachLab, rgbNachHex, type Lab } from "@/lib/farbe/lab";
import { ciede2000, labAbstandQuadrat } from "@/lib/farbe/ciede2000";
import type { Garn } from "./typen";

/**
 * Das heruntergerechnete Raster. Für jedes Feld stehen der Lab-Wert (für alle
 * Farbrechnungen) und die sRGB-Darstellung (für die Anzeige) bereit.
 */
export type Rasterbild = {
  breite: number;
  hoehe: number;
  /** 3 Werte je Feld: L, a, b. */
  lab: Float32Array;
};

// ---------------------------------------------------------------------------
// Schritt 2: Herunterrechnen auf das Stichraster
// ---------------------------------------------------------------------------

/**
 * Box-Averaging: jedes Rasterfeld bekommt den Mittelwert **aller** Pixel des
 * zugehörigen Blocks im Originalbild.
 *
 * Warum kein Nearest Neighbor? Beim Nearest Neighbor entscheidet ein einziger
 * willkürlich herausgegriffener Pixel über einen ganzen Stich. Bei einem Foto
 * mit Bildrauschen oder feiner Struktur (Haare, Rasen, Stoffmuster) entstehen
 * dadurch genau die einzelnen Fremdfarben mitten in einer Fläche, die die
 * Nutzerin später zwingen, für einen Stich neu einzufädeln. Das Mitteln über
 * den Block wirkt wie ein Tiefpassfilter und nimmt das Rauschen von
 * vornherein heraus.
 *
 * Zwei Feinheiten:
 *
 *  - Gemittelt wird im **linearen Licht**, nicht in gammakodiertem sRGB.
 *    Sonst käme aus einem Block aus Schwarz und Weiß ein zu dunkles Grau.
 *  - Die Blockgrenzen liegen nicht auf ganzen Pixeln. Ein Pixel, der nur zu
 *    einem Drittel in den Block ragt, geht auch nur zu einem Drittel ein
 *    (Flächengewichtung). Ohne das entstünden bei nicht ganzzahligen
 *    Verhältnissen sichtbare Streifen im Muster.
 */
export function herunterrechnen(
  quelle: ImageData,
  zielBreite: number,
  zielHoehe: number,
): Rasterbild {
  const { width: qb, height: qh, data } = quelle;
  const lab = new Float32Array(zielBreite * zielHoehe * 3);

  // Wie viele Quellpixel entfallen auf ein Rasterfeld?
  const skalaX = qb / zielBreite;
  const skalaY = qh / zielHoehe;

  for (let zy = 0; zy < zielHoehe; zy++) {
    // Blockgrenzen in Quellkoordinaten, als Fließkommazahl.
    const y0 = zy * skalaY;
    const y1 = Math.min(qh, (zy + 1) * skalaY);
    const yStart = Math.floor(y0);
    const yEnde = Math.min(qh - 1, Math.ceil(y1) - 1);

    for (let zx = 0; zx < zielBreite; zx++) {
      const x0 = zx * skalaX;
      const x1 = Math.min(qb, (zx + 1) * skalaX);
      const xStart = Math.floor(x0);
      const xEnde = Math.min(qb - 1, Math.ceil(x1) - 1);

      let summeR = 0;
      let summeG = 0;
      let summeB = 0;
      let summeGewicht = 0;

      for (let y = yStart; y <= yEnde; y++) {
        // Anteil dieser Pixelzeile am Block: bei den Randzeilen < 1.
        const gy = Math.min(y + 1, y1) - Math.max(y, y0);
        if (gy <= 0) continue;

        for (let x = xStart; x <= xEnde; x++) {
          const gx = Math.min(x + 1, x1) - Math.max(x, x0);
          if (gx <= 0) continue;

          const gewicht = gx * gy;
          const p = (y * qb + x) * 4;

          // Halbdurchsichtige Pixel (z. B. aus einem PNG) werden gegen Weiß
          // gerechnet – gestickt wird auf hellem Stoff.
          const alpha = data[p + 3] / 255;
          const g = gewicht;

          summeR += (byteNachLinear(data[p]) * alpha + (1 - alpha)) * g;
          summeG += (byteNachLinear(data[p + 1]) * alpha + (1 - alpha)) * g;
          summeB += (byteNachLinear(data[p + 2]) * alpha + (1 - alpha)) * g;
          summeGewicht += g;
        }
      }

      const i = (zy * zielBreite + zx) * 3;
      if (summeGewicht === 0) {
        lab[i] = 100;
        lab[i + 1] = 0;
        lab[i + 2] = 0;
      } else {
        const f = linearNachLab(
          summeR / summeGewicht,
          summeG / summeGewicht,
          summeB / summeGewicht,
        );
        lab[i] = f.L;
        lab[i + 1] = f.a;
        lab[i + 2] = f.b;
      }
    }
  }

  return { breite: zielBreite, hoehe: zielHoehe, lab };
}

// ---------------------------------------------------------------------------
// Schritt 3: Kantenerhaltender Filter
// ---------------------------------------------------------------------------

/**
 * Vektor-Medianfilter über eine 3×3-Umgebung des heruntergerechneten Rasters.
 *
 * Ein gewöhnlicher Median je Kanal würde L, a und b unabhängig voneinander
 * sortieren und könnte dabei Farben erfinden, die im Fenster gar nicht
 * vorkommen. Der Vektor-Median nimmt stattdessen **eine** der neun
 * vorhandenen Farben, nämlich die, deren Abstandssumme zu allen anderen am
 * kleinsten ist. Das ist der Punkt, der am wenigsten „Ausreißer" ist.
 *
 * Der Effekt: einzelne abweichende Felder verschwinden, aber eine Kante
 * zwischen zwei Flächen bleibt scharf – im Fenster an einer Kante liegen
 * mehrheitlich Felder der einen Seite, und deren Median gehört ebenfalls zu
 * dieser Seite. Genau das ist auf einem Stichraster gewollt: weiche
 * Verläufe glätten, Konturen behalten.
 *
 * Für den Abstand reicht hier der quadrierte euklidische Lab-Abstand; es geht
 * nur um „welcher der neun Punkte liegt am zentralsten", nicht um einen
 * absoluten Farbunterschied.
 */
export function medianFilter(bild: Rasterbild): Rasterbild {
  const { breite, hoehe, lab } = bild;
  const ziel = new Float32Array(lab.length);

  // Bis zu neun Nachbarn, wiederverwendete Puffer statt Allokationen.
  const nL = new Float64Array(9);
  const nA = new Float64Array(9);
  const nB = new Float64Array(9);

  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      let n = 0;

      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= hoehe) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= breite) continue;
          const j = (yy * breite + xx) * 3;
          nL[n] = lab[j];
          nA[n] = lab[j + 1];
          nB[n] = lab[j + 2];
          n++;
        }
      }

      // Den Punkt mit der kleinsten Abstandssumme zu allen anderen suchen.
      let bester = 0;
      let besteSumme = Infinity;
      for (let i = 0; i < n; i++) {
        let summe = 0;
        for (let k = 0; k < n; k++) {
          if (k === i) continue;
          const dL = nL[i] - nL[k];
          const da = nA[i] - nA[k];
          const db = nB[i] - nB[k];
          summe += Math.sqrt(dL * dL + da * da + db * db);
        }
        if (summe < besteSumme) {
          besteSumme = summe;
          bester = i;
        }
      }

      const z = (y * breite + x) * 3;
      ziel[z] = nL[bester];
      ziel[z + 1] = nA[bester];
      ziel[z + 2] = nB[bester];
    }
  }

  return { breite, hoehe, lab: ziel };
}

// ---------------------------------------------------------------------------
// Schritt 5: Farbreduktion per k-Means im Lab-Raum
// ---------------------------------------------------------------------------

export type KmeansErgebnis = {
  /** k Zentren, je 3 Werte (L, a, b). */
  zentren: Float32Array;
  /** Für jedes Feld der Index seines Zentrums. */
  zuordnung: Uint8Array;
  /** Tatsächliche Anzahl Zentren (kann kleiner als k sein). */
  k: number;
};

/**
 * k-Means im Lab-Raum.
 *
 * Warum im Lab-Raum und nicht in RGB? Weil das Verfahren „Abstand" ernst
 * nimmt: es gruppiert die Felder um Schwerpunkte herum, und diese Abstände
 * sollen dem entsprechen, was ein Mensch als ähnlich empfindet. In RGB
 * würden dunkle Töne viel zu fein und helle viel zu grob aufgeteilt.
 *
 * Startpunkte werden mit k-Means++ gezogen: der erste Schwerpunkt zufällig,
 * jeder weitere mit einer Wahrscheinlichkeit proportional zum Quadrat seines
 * Abstands zum nächsten schon gewählten Schwerpunkt. Das verteilt die
 * Startpunkte über den ganzen Farbraum, statt sie alle in der größten Fläche
 * des Bildes zu versammeln – sonst geht bei einem Bild mit viel Himmel die
 * rote Blume in einer einzigen Farbe unter.
 *
 * Der Zufallsgenerator ist bewusst festgelegt (`saat`), damit derselbe Lauf
 * mit denselben Einstellungen immer dasselbe Muster ergibt. Die Nutzerin soll
 * nicht ein anderes Ergebnis bekommen, nur weil sie einmal zurück und wieder
 * vorwärts getippt hat.
 */
export function kmeans(
  bild: Rasterbild,
  k: number,
  optionen: { maxDurchlaeufe?: number; saat?: number } = {},
): KmeansErgebnis {
  const maxDurchlaeufe = optionen.maxDurchlaeufe ?? 40;
  const zufall = zufallsgenerator(optionen.saat ?? 20240917);

  const { lab } = bild;
  const felder = lab.length / 3;
  const kEcht = Math.max(1, Math.min(k, felder, 255));

  const zentren = new Float32Array(kEcht * 3);

  // --- k-Means++: Startpunkte ziehen ---------------------------------------
  const naechsterAbstand = new Float64Array(felder).fill(Infinity);

  const ersterIndex = Math.min(felder - 1, Math.floor(zufall() * felder));
  zentren[0] = lab[ersterIndex * 3];
  zentren[1] = lab[ersterIndex * 3 + 1];
  zentren[2] = lab[ersterIndex * 3 + 2];

  for (let c = 1; c < kEcht; c++) {
    // Abstände zum zuletzt gesetzten Zentrum einarbeiten.
    const cz = (c - 1) * 3;
    let summe = 0;
    for (let i = 0; i < felder; i++) {
      const dL = lab[i * 3] - zentren[cz];
      const da = lab[i * 3 + 1] - zentren[cz + 1];
      const db = lab[i * 3 + 2] - zentren[cz + 2];
      const d = dL * dL + da * da + db * db;
      if (d < naechsterAbstand[i]) naechsterAbstand[i] = d;
      summe += naechsterAbstand[i];
    }

    // Gewichtet ziehen. Ist alles identisch (summe = 0), reicht ein
    // beliebiger Punkt.
    let ziel = summe > 0 ? zufall() * summe : 0;
    let gewaehlt = felder - 1;
    if (summe > 0) {
      for (let i = 0; i < felder; i++) {
        ziel -= naechsterAbstand[i];
        if (ziel <= 0) {
          gewaehlt = i;
          break;
        }
      }
    } else {
      gewaehlt = Math.min(felder - 1, Math.floor(zufall() * felder));
    }

    zentren[c * 3] = lab[gewaehlt * 3];
    zentren[c * 3 + 1] = lab[gewaehlt * 3 + 1];
    zentren[c * 3 + 2] = lab[gewaehlt * 3 + 2];
  }

  // --- Lloyd-Iteration ------------------------------------------------------
  const zuordnung = new Uint8Array(felder);
  const summeL = new Float64Array(kEcht);
  const summeA = new Float64Array(kEcht);
  const summeB = new Float64Array(kEcht);
  const anzahl = new Int32Array(kEcht);

  for (let durchlauf = 0; durchlauf < maxDurchlaeufe; durchlauf++) {
    let veraendert = false;

    // Zuordnungsschritt
    for (let i = 0; i < felder; i++) {
      const L = lab[i * 3];
      const a = lab[i * 3 + 1];
      const b = lab[i * 3 + 2];

      let bester = 0;
      let besterAbstand = Infinity;
      for (let c = 0; c < kEcht; c++) {
        const dL = L - zentren[c * 3];
        const da = a - zentren[c * 3 + 1];
        const db = b - zentren[c * 3 + 2];
        const d = dL * dL + da * da + db * db;
        if (d < besterAbstand) {
          besterAbstand = d;
          bester = c;
        }
      }

      if (zuordnung[i] !== bester) {
        zuordnung[i] = bester;
        veraendert = true;
      }
    }

    // Aktualisierungsschritt
    summeL.fill(0);
    summeA.fill(0);
    summeB.fill(0);
    anzahl.fill(0);

    for (let i = 0; i < felder; i++) {
      const c = zuordnung[i];
      summeL[c] += lab[i * 3];
      summeA[c] += lab[i * 3 + 1];
      summeB[c] += lab[i * 3 + 2];
      anzahl[c]++;
    }

    for (let c = 0; c < kEcht; c++) {
      if (anzahl[c] === 0) continue; // leeres Cluster bleibt, wo es ist
      zentren[c * 3] = summeL[c] / anzahl[c];
      zentren[c * 3 + 1] = summeA[c] / anzahl[c];
      zentren[c * 3 + 2] = summeB[c] / anzahl[c];
    }

    // Nach dem ersten Durchlauf hat sich nichts mehr geändert -> fertig.
    if (!veraendert && durchlauf > 0) break;
  }

  // Leere Cluster entfernen und die Indizes lückenlos machen.
  return leereClusterEntfernen(zentren, zuordnung, kEcht);
}

/** Cluster ohne ein einziges Feld werden aus der Palette gestrichen. */
function leereClusterEntfernen(
  zentren: Float32Array,
  zuordnung: Uint8Array,
  k: number,
): KmeansErgebnis {
  const belegt = new Int32Array(k);
  for (let i = 0; i < zuordnung.length; i++) belegt[zuordnung[i]]++;

  const neuerIndex = new Int32Array(k).fill(-1);
  let n = 0;
  for (let c = 0; c < k; c++) if (belegt[c] > 0) neuerIndex[c] = n++;

  if (n === k) return { zentren, zuordnung, k };

  const neueZentren = new Float32Array(n * 3);
  for (let c = 0; c < k; c++) {
    const z = neuerIndex[c];
    if (z < 0) continue;
    neueZentren[z * 3] = zentren[c * 3];
    neueZentren[z * 3 + 1] = zentren[c * 3 + 1];
    neueZentren[z * 3 + 2] = zentren[c * 3 + 2];
  }
  for (let i = 0; i < zuordnung.length; i++) zuordnung[i] = neuerIndex[zuordnung[i]];

  return { zentren: neueZentren, zuordnung, k: n };
}

/**
 * Kleiner deterministischer Zufallsgenerator (mulberry32). Fest verdrahtet,
 * damit gleiche Einstellungen immer dasselbe Muster ergeben.
 */
export function zufallsgenerator(saat: number): () => number {
  let a = saat >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Schritt 6: Clusterzentren auf reale Garne abbilden
// ---------------------------------------------------------------------------

export type GarnZuordnung = {
  /** Für jedes Cluster das gewählte Garn (oder null ohne Katalog). */
  garne: (Garn | null)[];
  /** Die Farbe, mit der gemalt wird – das Garn, sonst das Clusterzentrum. */
  farben: Lab[];
  /** Alt-Index -> Neu-Index, nachdem doppelte Garne zusammengelegt wurden. */
  abbildung: Int32Array;
  /** Wie viele Cluster zusammengefallen sind. */
  zusammengelegt: number;
};

/**
 * Jedes Clusterzentrum bekommt die nächstliegende Garnfarbe, gemessen mit
 * CIEDE2000.
 *
 * Gemappt wird auf **Clusterebene**, nicht pro Rasterfeld: bei 24 Farben und
 * 500 Garntönen sind das 12.000 Abstandsberechnungen. Pro Feld wären es bei
 * einem 200 × 260 großen Muster 26 Millionen – unnötig, denn alle Felder
 * eines Clusters bekommen ohnehin dieselbe Farbe.
 *
 * Zwei Cluster können auf demselben Garn landen. Dann werden sie
 * zusammengelegt: aus 24 Farben werden 22 Garne. Die Rückgabe sagt über
 * `abbildung`, welcher alte Index auf welchen neuen zeigt, und über
 * `zusammengelegt`, wie viele Farben dabei verschwunden sind – die Nutzerin
 * bekommt das als ganzen Satz zu lesen.
 */
export function aufGarneAbbilden(zentren: Float32Array, garne: Garn[]): GarnZuordnung {
  const k = zentren.length / 3;

  if (garne.length === 0) {
    // Ohne Garnkatalog bleiben die Clusterzentren selbst die Palette.
    const farben: Lab[] = [];
    const abbildung = new Int32Array(k);
    for (let c = 0; c < k; c++) {
      farben.push({ L: zentren[c * 3], a: zentren[c * 3 + 1], b: zentren[c * 3 + 2] });
      abbildung[c] = c;
    }
    return { garne: new Array(k).fill(null), farben, abbildung, zusammengelegt: 0 };
  }

  // Für jedes Cluster das nächste Garn suchen.
  const gewaehlt: Garn[] = [];
  for (let c = 0; c < k; c++) {
    const ziel: Lab = { L: zentren[c * 3], a: zentren[c * 3 + 1], b: zentren[c * 3 + 2] };
    let bestes = garne[0];
    let besterAbstand = Infinity;
    for (const garn of garne) {
      const d = ciede2000(ziel, garn);
      if (d < besterAbstand) {
        besterAbstand = d;
        bestes = garn;
      }
    }
    gewaehlt.push(bestes);
  }

  // Doppelte Garne zusammenlegen.
  const gesehen = new Map<string, number>();
  const abbildung = new Int32Array(k);
  const neueGarne: Garn[] = [];

  for (let c = 0; c < k; c++) {
    const schluessel = gewaehlt[c].id;
    const vorhanden = gesehen.get(schluessel);
    if (vorhanden === undefined) {
      const neu = neueGarne.length;
      gesehen.set(schluessel, neu);
      neueGarne.push(gewaehlt[c]);
      abbildung[c] = neu;
    } else {
      abbildung[c] = vorhanden;
    }
  }

  return {
    garne: neueGarne,
    farben: neueGarne.map((g) => ({ L: g.L, a: g.a, b: g.b })),
    abbildung,
    zusammengelegt: k - neueGarne.length,
  };
}

/** Eine Lab-Farbe als Hexwert für die Anzeige. */
export function labAlsHex(farbe: Lab): string {
  const [r, g, b] = labNachRgb(farbe.L, farbe.a, farbe.b);
  return rgbNachHex(r, g, b);
}

/** Wird nur vom Dithering gebraucht: nächster Palettenindex zu einer Farbe. */
export function naechsterIndex(farbe: Lab, palette: Lab[]): number {
  let bester = 0;
  let besterAbstand = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = labAbstandQuadrat(farbe, palette[i]);
    if (d < besterAbstand) {
      besterAbstand = d;
      bester = i;
    }
  }
  return bester;
}
