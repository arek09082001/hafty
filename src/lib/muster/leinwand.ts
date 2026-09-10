/**
 * Das Stichraster zeichnen.
 * ---------------------------------------------------------------------------
 *
 * Der Kern liegt hier und nicht in einer Komponente, weil es zwei Stellen
 * gibt, die dasselbe Bild brauchen: die Arbeitsfläche in Schritt 3, die einen
 * Ausschnitt in beliebiger Vergrößerung zeigt, und die Vorschau vor dem
 * Drucken, die das ganze Muster in einer festen Größe zeigt.
 *
 * Gezeichnet wird in zwei Lagen. Zuerst entsteht ein Bild mit genau einem
 * Bildpunkt je Stich (`kleinbildZeichnen`); dieses Bild wird beim Anzeigen
 * ohne Weichzeichnen vergrößert, damit die Kästchen scharf bleiben. Erst
 * darüber kommen Rasterlinien, Symbole und die Auswahl – und die nur für den
 * Teil des Musters, der gerade zu sehen ist. Sonst würde jedes Verschieben
 * bei einem großen Muster über hunderttausend Felder laufen.
 */

import { hexNachRgb, istDunkel } from "@/lib/farbe/lab";
import { FARBINDIZES, LEER, STOFFFARBE, type PalettenEintrag } from "@/lib/muster/typen";

/** Ein Stück, das gerade verschoben und noch nicht festgeschrieben ist. */
export type Einfuegevorschau = {
  x: number;
  y: number;
  w: number;
  h: number;
  daten: Uint16Array;
  maske: Uint8Array;
};

/**
 * Nachgeschlagen wird über den Index des Eintrags und nicht über seine Stelle
 * in der Liste: die Garnliste wird an anderer Stelle gefiltert (Farben ohne
 * Stiche fallen heraus), und dann stimmen beide nicht mehr überein. Ein Feld
 * mit einer falschen Farbe wäre der schlimmste denkbare Fehler in dieser App.
 */
export type Farbtabelle = {
  farben: Array<[number, number, number] | undefined>;
  eintraege: Array<PalettenEintrag | undefined>;
  stoff: [number, number, number];
};

export function farbtabelle(palette: PalettenEintrag[]): Farbtabelle {
  const farben = new Array<[number, number, number] | undefined>(FARBINDIZES);
  const eintraege = new Array<PalettenEintrag | undefined>(FARBINDIZES);
  for (const eintrag of palette) {
    farben[eintrag.index] = hexNachRgb(eintrag.hex);
    eintraege[eintrag.index] = eintrag;
  }
  // Was nicht gestickt wird, bekommt die Farbe des Stoffes.
  const stoff = hexNachRgb(STOFFFARBE);
  farben[LEER] = stoff;
  return { farben, eintraege, stoff };
}

/** Das Bild mit einem Bildpunkt je Stich – die Grundlage aller Anzeigen. */
export function kleinbildZeichnen(
  klein: HTMLCanvasElement,
  breite: number,
  hoehe: number,
  raster: Uint16Array,
  tabelle: Farbtabelle,
  vorschau?: Einfuegevorschau | null,
): void {
  if (klein.width !== breite || klein.height !== hoehe) {
    klein.width = breite;
    klein.height = hoehe;
  }
  const stift = klein.getContext("2d");
  if (!stift) return;

  const { farben, stoff } = tabelle;
  const bild = stift.createImageData(breite, hoehe);

  for (let i = 0; i < raster.length; i++) {
    const farbe = farben[raster[i]] ?? stoff;
    bild.data[i * 4] = farbe[0];
    bild.data[i * 4 + 1] = farbe[1];
    bild.data[i * 4 + 2] = farbe[2];
    bild.data[i * 4 + 3] = 255;
  }

  // Die verschiebbare Vorschau beim Einfügen liegt obenauf.
  if (vorschau) {
    for (let y = 0; y < vorschau.h; y++) {
      const zy = vorschau.y + y;
      if (zy < 0 || zy >= hoehe) continue;
      for (let x = 0; x < vorschau.w; x++) {
        const zx = vorschau.x + x;
        if (zx < 0 || zx >= breite) continue;
        const q = y * vorschau.w + x;
        if (!vorschau.maske[q]) continue;
        const farbe = farben[vorschau.daten[q]] ?? stoff;
        const z = (zy * breite + zx) * 4;
        bild.data[z] = farbe[0];
        bild.data[z + 1] = farbe[1];
        bild.data[z + 2] = farbe[2];
        bild.data[z + 3] = 255;
      }
    }
  }

  stift.putImageData(bild, 0, 0);
}

export type Zeichenauftrag = {
  breite: number;
  hoehe: number;
  raster: Uint16Array;
  tabelle: Farbtabelle;
  /** Bildpunkte je Stich. */
  zoom: number;
  /** Wo die linke obere Ecke des Musters auf der Leinwand liegt. */
  versatzX: number;
  versatzY: number;
  /** Größe der Leinwand in Bildschirmpunkten. */
  sichtBreite: number;
  sichtHoehe: number;
  mitLinien?: boolean;
  mitSymbolen?: boolean;
  auswahl?: Uint8Array | null;
  vorschau?: Einfuegevorschau | null;
  /** Kante und Schatten ringsum – das Muster als Blatt auf dem Tisch. */
  mitBlatt?: boolean;
  /**
   * Bildpunkte je Bildschirmpunkt. Ohne Angabe die Feinheit des Bildschirms.
   * Die Vorschau vor dem Drucken legt ihre Leinwand so groß an wie das ganze
   * Muster und setzt deshalb 1 – doppelt so viele Punkte kosteten dort nur
   * Speicher und brächten nichts.
   */
  dichte?: number;
};

/**
 * Das Muster auf die sichtbare Leinwand zeichnen.
 *
 * `klein` ist das Bild aus `kleinbildZeichnen`. Es wird als Ganzes vergrößert
 * hineingezeichnet; was über den Rand hinausragt, schneidet der Browser
 * selbst ab. Alles, was danach kommt, läuft nur über die Felder, die im
 * Sichtfenster liegen.
 */
export function musterZeichnen(
  canvas: HTMLCanvasElement,
  klein: HTMLCanvasElement,
  o: Zeichenauftrag,
): void {
  const stift = canvas.getContext("2d");
  if (!stift) return;

  // Auf einem feinen Bildschirm wird die Leinwand doppelt so fein angelegt,
  // sonst wären Rasterlinien und Symbole ausgefranst.
  const dichte =
    o.dichte ?? Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  const punkteBreit = Math.max(1, Math.round(o.sichtBreite * dichte));
  const punkteHoch = Math.max(1, Math.round(o.sichtHoehe * dichte));
  if (canvas.width !== punkteBreit || canvas.height !== punkteHoch) {
    canvas.width = punkteBreit;
    canvas.height = punkteHoch;
  }

  stift.setTransform(dichte, 0, 0, dichte, 0, 0);
  stift.clearRect(0, 0, o.sichtBreite, o.sichtHoehe);

  const { zoom, breite, hoehe } = o;
  const musterBreite = breite * zoom;
  const musterHoehe = hoehe * zoom;

  stift.save();
  stift.translate(o.versatzX, o.versatzY);

  // --- Das Blatt ----------------------------------------------------------
  if (o.mitBlatt) {
    stift.save();
    stift.shadowColor = "rgba(0,0,0,0.18)";
    stift.shadowBlur = 14;
    stift.shadowOffsetY = 3;
    stift.fillStyle = "#ffffff";
    stift.fillRect(0, 0, musterBreite, musterHoehe);
    stift.restore();
  }

  stift.imageSmoothingEnabled = false;
  stift.drawImage(klein, 0, 0, musterBreite, musterHoehe);

  // --- Nur der sichtbare Ausschnitt ---------------------------------------
  const x0 = Math.max(0, Math.floor(-o.versatzX / zoom));
  const y0 = Math.max(0, Math.floor(-o.versatzY / zoom));
  const x1 = Math.min(breite, Math.ceil((o.sichtBreite - o.versatzX) / zoom));
  const y1 = Math.min(hoehe, Math.ceil((o.sichtHoehe - o.versatzY) / zoom));

  // --- Rasterlinien -------------------------------------------------------
  // Erst ab 5 Bildpunkten je Stich; darunter würde das Raster das Bild
  // zudecken. Jede zehnte Linie ist dicker – so kann die Nutzerin auf dem
  // Bildschirm genauso zählen wie später auf dem Papier.
  if ((o.mitLinien ?? true) && zoom >= 5) {
    stift.lineWidth = 1;
    stift.strokeStyle = "rgba(0,0,0,0.22)";
    stift.beginPath();
    for (let x = Math.max(1, x0); x <= x1 && x < breite; x++) {
      if (x % 10 === 0) continue;
      const px = Math.round(x * zoom) + 0.5;
      stift.moveTo(px, y0 * zoom);
      stift.lineTo(px, y1 * zoom);
    }
    for (let y = Math.max(1, y0); y <= y1 && y < hoehe; y++) {
      if (y % 10 === 0) continue;
      const py = Math.round(y * zoom) + 0.5;
      stift.moveTo(x0 * zoom, py);
      stift.lineTo(x1 * zoom, py);
    }
    stift.stroke();

    stift.lineWidth = 2;
    stift.strokeStyle = "rgba(0,0,0,0.6)";
    stift.beginPath();
    for (let x = Math.ceil(x0 / 10) * 10; x <= x1 && x < breite; x += 10) {
      if (x === 0) continue;
      const px = Math.round(x * zoom);
      stift.moveTo(px, y0 * zoom);
      stift.lineTo(px, y1 * zoom);
    }
    for (let y = Math.ceil(y0 / 10) * 10; y <= y1 && y < hoehe; y += 10) {
      if (y === 0) continue;
      const py = Math.round(y * zoom);
      stift.moveTo(x0 * zoom, py);
      stift.lineTo(x1 * zoom, py);
    }
    stift.stroke();
  }

  // --- Symbole ------------------------------------------------------------
  if (o.mitSymbolen && zoom >= 14) {
    stift.textAlign = "center";
    stift.textBaseline = "middle";
    stift.font = `bold ${Math.floor(zoom * 0.62)}px system-ui, sans-serif`;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        // Ein freies Feld bekommt kein Symbol – dort ist nichts zu sticken.
        const eintrag = o.tabelle.eintraege[o.raster[y * breite + x]];
        if (!eintrag) continue;
        const rgb = o.tabelle.farben[eintrag.index] ?? o.tabelle.stoff;
        stift.fillStyle = istDunkel(rgb[0], rgb[1], rgb[2]) ? "#ffffff" : "#000000";
        stift.fillText(eintrag.symbol, (x + 0.5) * zoom, (y + 0.55) * zoom);
      }
    }
  }

  // --- Auswahl ------------------------------------------------------------
  if (o.auswahl) {
    const auswahl = o.auswahl;
    stift.fillStyle = "rgba(29,78,216,0.28)";
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (!auswahl[y * breite + x]) continue;
        stift.fillRect(x * zoom, y * zoom, zoom, zoom);
      }
    }
    // Umrandung: nur die Kanten zeichnen, an denen die Auswahl endet.
    stift.strokeStyle = "#1d4ed8";
    stift.lineWidth = Math.max(2, zoom * 0.14);
    stift.beginPath();
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (!auswahl[y * breite + x]) continue;
        const px = x * zoom;
        const py = y * zoom;
        if (y === 0 || !auswahl[(y - 1) * breite + x]) {
          stift.moveTo(px, py);
          stift.lineTo(px + zoom, py);
        }
        if (y === hoehe - 1 || !auswahl[(y + 1) * breite + x]) {
          stift.moveTo(px, py + zoom);
          stift.lineTo(px + zoom, py + zoom);
        }
        if (x === 0 || !auswahl[y * breite + x - 1]) {
          stift.moveTo(px, py);
          stift.lineTo(px, py + zoom);
        }
        if (x === breite - 1 || !auswahl[y * breite + x + 1]) {
          stift.moveTo(px + zoom, py);
          stift.lineTo(px + zoom, py + zoom);
        }
      }
    }
    stift.stroke();
  }

  // --- Rahmen der Einfügevorschau ----------------------------------------
  if (o.vorschau) {
    stift.strokeStyle = "#8a1c1c";
    stift.lineWidth = Math.max(3, zoom * 0.2);
    stift.setLineDash([zoom, zoom]);
    stift.strokeRect(
      o.vorschau.x * zoom,
      o.vorschau.y * zoom,
      o.vorschau.w * zoom,
      o.vorschau.h * zoom,
    );
    stift.setLineDash([]);
  }

  // --- Kante des Blattes --------------------------------------------------
  if (o.mitBlatt) {
    stift.strokeStyle = "rgba(0,0,0,0.35)";
    stift.lineWidth = 1;
    stift.strokeRect(-0.5, -0.5, musterBreite + 1, musterHoehe + 1);
  }

  stift.restore();
}
