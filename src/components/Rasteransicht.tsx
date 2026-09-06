"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hexNachRgb, istDunkel } from "@/lib/farbe/lab";
import type { PalettenEintrag } from "@/lib/muster/typen";

export type Zeigerereignis = {
  x: number;
  y: number;
  /** true, solange der Finger bzw. die Maustaste unten ist. */
  gedrueckt: boolean;
  /** true beim ersten Ereignis einer Bewegung. */
  beginn: boolean;
};

export type Einfuegevorschau = {
  x: number;
  y: number;
  w: number;
  h: number;
  daten: Uint8Array;
  maske: Uint8Array;
};

/**
 * Das Stichraster auf einer Leinwand.
 *
 * Gezeichnet wird in zwei Lagen: zuerst ein Bild mit genau einem Bildpunkt je
 * Stich, das ohne Weichzeichnen vergrößert wird – so bleiben die Kästchen
 * scharf. Darüber kommen erst ab einer gewissen Vergrößerung die Rasterlinien
 * und die Symbole, weil sie sonst nur ein graues Gewirr wären.
 */
export function Rasteransicht({
  breite,
  hoehe,
  raster,
  palette,
  zoom,
  mitLinien = true,
  mitSymbolen = false,
  auswahl,
  vorschau,
  onZeiger,
  beschriftung,
}: {
  breite: number;
  hoehe: number;
  raster: Uint8Array;
  palette: PalettenEintrag[];
  /** Bildpunkte je Stich. */
  zoom: number;
  mitLinien?: boolean;
  mitSymbolen?: boolean;
  auswahl?: Uint8Array | null;
  vorschau?: Einfuegevorschau | null;
  onZeiger?: (e: Zeigerereignis) => void;
  beschriftung: string;
}) {
  const leinwand = useRef<HTMLCanvasElement>(null);
  const zwischen = useRef<HTMLCanvasElement | null>(null);
  const gedrueckt = useRef(false);
  const letztesFeld = useRef<{ x: number; y: number } | null>(null);

  // --- Zeichnen -------------------------------------------------------------
  useEffect(() => {
    const canvas = leinwand.current;
    if (!canvas) return;
    const stift = canvas.getContext("2d");
    if (!stift) return;

    // Zwischenleinwand mit einem Bildpunkt je Stich.
    if (!zwischen.current) zwischen.current = document.createElement("canvas");
    const klein = zwischen.current;
    if (klein.width !== breite || klein.height !== hoehe) {
      klein.width = breite;
      klein.height = hoehe;
    }
    const kleinStift = klein.getContext("2d");
    if (!kleinStift) return;

    const bild = kleinStift.createImageData(breite, hoehe);
    const farben = palette.map((p) => hexNachRgb(p.hex));

    for (let i = 0; i < raster.length; i++) {
      const farbe = farben[raster[i]] ?? [255, 255, 255];
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
          const farbe = farben[vorschau.daten[q]] ?? [255, 255, 255];
          const z = (zy * breite + zx) * 4;
          bild.data[z] = farbe[0];
          bild.data[z + 1] = farbe[1];
          bild.data[z + 2] = farbe[2];
          bild.data[z + 3] = 255;
        }
      }
    }

    kleinStift.putImageData(bild, 0, 0);

    const breitePx = Math.round(breite * zoom);
    const hoehePx = Math.round(hoehe * zoom);
    if (canvas.width !== breitePx || canvas.height !== hoehePx) {
      canvas.width = breitePx;
      canvas.height = hoehePx;
    }

    stift.imageSmoothingEnabled = false;
    stift.clearRect(0, 0, breitePx, hoehePx);
    stift.drawImage(klein, 0, 0, breitePx, hoehePx);

    // --- Rasterlinien -------------------------------------------------------
    // Erst ab 5 Bildpunkten je Stich; darunter würde das Raster das Bild
    // zudecken. Jede zehnte Linie ist dicker – so kann die Nutzerin auf dem
    // Bildschirm genauso zählen wie später auf dem Papier.
    if (mitLinien && zoom >= 5) {
      stift.lineWidth = 1;
      stift.strokeStyle = "rgba(0,0,0,0.22)";
      stift.beginPath();
      for (let x = 1; x < breite; x++) {
        if (x % 10 === 0) continue;
        const px = Math.round(x * zoom) + 0.5;
        stift.moveTo(px, 0);
        stift.lineTo(px, hoehePx);
      }
      for (let y = 1; y < hoehe; y++) {
        if (y % 10 === 0) continue;
        const py = Math.round(y * zoom) + 0.5;
        stift.moveTo(0, py);
        stift.lineTo(breitePx, py);
      }
      stift.stroke();

      stift.lineWidth = 2;
      stift.strokeStyle = "rgba(0,0,0,0.6)";
      stift.beginPath();
      for (let x = 10; x < breite; x += 10) {
        const px = Math.round(x * zoom);
        stift.moveTo(px, 0);
        stift.lineTo(px, hoehePx);
      }
      for (let y = 10; y < hoehe; y += 10) {
        const py = Math.round(y * zoom);
        stift.moveTo(0, py);
        stift.lineTo(breitePx, py);
      }
      stift.stroke();
    }

    // --- Symbole ------------------------------------------------------------
    if (mitSymbolen && zoom >= 14) {
      stift.textAlign = "center";
      stift.textBaseline = "middle";
      stift.font = `bold ${Math.floor(zoom * 0.62)}px system-ui, sans-serif`;
      for (let y = 0; y < hoehe; y++) {
        for (let x = 0; x < breite; x++) {
          const eintrag = palette[raster[y * breite + x]];
          if (!eintrag) continue;
          const rgb = farben[raster[y * breite + x]];
          stift.fillStyle = istDunkel(rgb[0], rgb[1], rgb[2]) ? "#ffffff" : "#000000";
          stift.fillText(eintrag.symbol, (x + 0.5) * zoom, (y + 0.55) * zoom);
        }
      }
    }

    // --- Auswahl ------------------------------------------------------------
    if (auswahl) {
      stift.fillStyle = "rgba(29,78,216,0.28)";
      for (let y = 0; y < hoehe; y++) {
        for (let x = 0; x < breite; x++) {
          if (!auswahl[y * breite + x]) continue;
          stift.fillRect(x * zoom, y * zoom, zoom, zoom);
        }
      }
      // Umrandung: nur die Kanten zeichnen, an denen die Auswahl endet.
      stift.strokeStyle = "#1d4ed8";
      stift.lineWidth = Math.max(2, zoom * 0.14);
      stift.beginPath();
      for (let y = 0; y < hoehe; y++) {
        for (let x = 0; x < breite; x++) {
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
    if (vorschau) {
      stift.strokeStyle = "#8a1c1c";
      stift.lineWidth = Math.max(3, zoom * 0.2);
      stift.setLineDash([zoom, zoom]);
      stift.strokeRect(
        vorschau.x * zoom,
        vorschau.y * zoom,
        vorschau.w * zoom,
        vorschau.h * zoom,
      );
      stift.setLineDash([]);
    }
  }, [breite, hoehe, raster, palette, zoom, mitLinien, mitSymbolen, auswahl, vorschau]);

  // --- Zeigerbehandlung -----------------------------------------------------
  /**
   * Vom Bildschirmpunkt zum Rasterfeld.
   *
   * Rutscht der Finger während eines Zuges über den Rand des Musters hinaus,
   * wird auf das äußerste Feld begrenzt statt das Ereignis zu verwerfen.
   * Sonst risse eine Freihandauswahl ab, sobald jemand am Rand entlangfährt –
   * und genau dort fährt man beim Umranden eines Motivs.
   */
  const feldAus = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = leinwand.current;
      if (!canvas) return null;
      const rahmen = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rahmen.left) / rahmen.width) * breite);
      const y = Math.floor(((e.clientY - rahmen.top) / rahmen.height) * hoehe);
      return {
        x: Math.max(0, Math.min(breite - 1, x)),
        y: Math.max(0, Math.min(hoehe - 1, y)),
      };
    },
    [breite, hoehe],
  );

  return (
    <canvas
      ref={leinwand}
      role="img"
      aria-label={beschriftung}
      className="raster block h-auto max-w-none touch-none select-none"
      style={{ width: Math.round(breite * zoom), height: Math.round(hoehe * zoom) }}
      onPointerDown={(e) => {
        if (!onZeiger) return;
        const feld = feldAus(e);
        if (!feld) return;
        gedrueckt.current = true;
        letztesFeld.current = feld;
        e.currentTarget.setPointerCapture(e.pointerId);
        onZeiger({ ...feld, gedrueckt: true, beginn: true });
      }}
      onPointerMove={(e) => {
        if (!onZeiger || !gedrueckt.current) return;
        const feld = feldAus(e);
        if (!feld) return;
        if (letztesFeld.current?.x === feld.x && letztesFeld.current?.y === feld.y) return;
        letztesFeld.current = feld;
        onZeiger({ ...feld, gedrueckt: true, beginn: false });
      }}
      onPointerUp={(e) => {
        if (!onZeiger || !gedrueckt.current) return;
        gedrueckt.current = false;
        const feld = feldAus(e) ?? letztesFeld.current;
        if (feld) onZeiger({ ...feld, gedrueckt: false, beginn: false });
        letztesFeld.current = null;
      }}
      onPointerCancel={() => {
        gedrueckt.current = false;
        letztesFeld.current = null;
      }}
    />
  );
}

/** Zoomstufen, zwischen denen die beiden Lupenknöpfe umschalten. */
export const ZOOMSTUFEN = [2, 3, 4, 6, 8, 11, 15, 20, 26, 34] as const;

function stufeZu(zoom: number): number {
  let beste = 0;
  for (let i = 0; i < ZOOMSTUFEN.length; i++) {
    if (Math.abs(ZOOMSTUFEN[i] - zoom) < Math.abs(ZOOMSTUFEN[beste] - zoom)) beste = i;
  }
  return beste;
}

/**
 * Merkt sich die Vergrößerung.
 *
 * `einpassen` rechnet aus, wie groß ein Stich sein darf, damit das ganze
 * Muster in den vorhandenen Platz passt – die Nutzerin soll ihre Arbeit als
 * Ganzes sehen können, ohne zu scrollen.
 */
export function useZoom(start = 6) {
  const [stufe, setStufe] = useState(() => stufeZu(start));

  const einpassen = useCallback(
    (flaecheBreite: number, flaecheHoehe: number, breite: number, hoehe: number) => {
      if (breite <= 0 || hoehe <= 0 || flaecheBreite <= 0 || flaecheHoehe <= 0) return;
      const passend = Math.min(flaecheBreite / breite, flaecheHoehe / hoehe);
      // Die größte Stufe wählen, die noch hineinpasst.
      let ziel = 0;
      for (let i = 0; i < ZOOMSTUFEN.length; i++) if (ZOOMSTUFEN[i] <= passend) ziel = i;
      setStufe(ziel);
    },
    [],
  );

  return {
    zoom: ZOOMSTUFEN[stufe],
    groesser: () => setStufe((s) => Math.min(ZOOMSTUFEN.length - 1, s + 1)),
    kleiner: () => setStufe((s) => Math.max(0, s - 1)),
    kannGroesser: stufe < ZOOMSTUFEN.length - 1,
    kannKleiner: stufe > 0,
    einpassen,
  };
}
