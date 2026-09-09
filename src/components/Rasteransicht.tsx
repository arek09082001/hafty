"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  farbtabelle,
  kleinbildZeichnen,
  musterZeichnen,
  type Einfuegevorschau,
} from "@/lib/muster/leinwand";
import type { PalettenEintrag } from "@/lib/muster/typen";

export type { Einfuegevorschau };

/**
 * Das ganze Stichraster in einer festen Vergrößerung.
 *
 * Diese Fassung zeichnet das Muster vollständig und wird von der Vorschau vor
 * dem Drucken benutzt: dort gibt es nichts zu tippen und nichts zu schieben,
 * das Bild steht einfach da. Zum Bearbeiten in Schritt 3 gibt es die
 * `Arbeitsfläche`, die nur den sichtbaren Ausschnitt zeichnet und dafür
 * beliebig verschoben und vergrößert werden kann.
 *
 * Gezeichnet wird in beiden Fällen mit demselben Kern
 * (`src/lib/muster/leinwand.ts`).
 */
export function Rasteransicht({
  breite,
  hoehe,
  raster,
  palette,
  zoom,
  mitLinien = true,
  mitSymbolen = false,
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
  beschriftung: string;
}) {
  const leinwand = useRef<HTMLCanvasElement>(null);
  const klein = useRef<HTMLCanvasElement | null>(null);
  const tabelle = useMemo(() => farbtabelle(palette), [palette]);

  useEffect(() => {
    const canvas = leinwand.current;
    if (!canvas) return;
    if (!klein.current) klein.current = document.createElement("canvas");
    kleinbildZeichnen(klein.current, breite, hoehe, raster, tabelle);
    musterZeichnen(canvas, klein.current, {
      breite,
      hoehe,
      raster,
      tabelle,
      zoom,
      versatzX: 0,
      versatzY: 0,
      sichtBreite: Math.round(breite * zoom),
      sichtHoehe: Math.round(hoehe * zoom),
      mitLinien,
      mitSymbolen,
      dichte: 1,
    });
  }, [breite, hoehe, raster, tabelle, zoom, mitLinien, mitSymbolen]);

  return (
    <canvas
      ref={leinwand}
      role="img"
      aria-label={beschriftung}
      className="raster block h-auto max-w-none select-none"
      style={{ width: Math.round(breite * zoom), height: Math.round(hoehe * zoom) }}
    />
  );
}

/** Rastpunkte für die beiden Lupenknöpfe, in Bildpunkten je Stich. */
export const ZOOMSTUFEN = [2, 3, 4, 5, 6, 8, 11, 15, 20, 26, 34] as const;

const KLEINSTER = ZOOMSTUFEN[0];
const GROESSTER = ZOOMSTUFEN[ZOOMSTUFEN.length - 1];

/**
 * Merkt sich die Vergrößerung der Druckvorschau.
 *
 * `einpassen` rechnet aus, wie groß ein Stich sein darf, damit das ganze
 * Muster in den vorhandenen Platz passt – und nimmt genau diesen Wert, nicht
 * den nächstkleineren Rastpunkt. Sonst bliebe je nach Bildschirm ein Viertel
 * der Fläche ungenutzt, und die Nutzerin soll ihre Arbeit so groß wie möglich
 * sehen.
 *
 * Die Rastpunkte gelten nur für „Größer" und „Kleiner": von jeder Stelle aus
 * geht es zum nächsten Punkt darüber oder darunter.
 *
 * Beim Bearbeiten in Schritt 3 gilt das nicht mehr – dort zoomt das Mausrad
 * stufenlos, siehe `useAnsicht` in `Arbeitsflaeche.tsx`.
 */
export function useZoom(start = 6) {
  const [zoom, setZoom] = useState(start);

  const groesser = useCallback(() => {
    setZoom((z) => ZOOMSTUFEN.find((stufe) => stufe > z + 0.01) ?? GROESSTER);
  }, []);

  const kleiner = useCallback(() => {
    setZoom((z) => {
      for (let i = ZOOMSTUFEN.length - 1; i >= 0; i--) {
        if (ZOOMSTUFEN[i] < z - 0.01) return ZOOMSTUFEN[i];
      }
      return KLEINSTER;
    });
  }, []);

  const einpassen = useCallback(
    (flaecheBreite: number, flaecheHoehe: number, breite: number, hoehe: number) => {
      if (breite <= 0 || hoehe <= 0 || flaecheBreite <= 0 || flaecheHoehe <= 0) return;
      const passend = Math.min(flaecheBreite / breite, flaecheHoehe / hoehe);
      setZoom(Math.max(1, Math.min(GROESSTER, passend)));
    },
    [],
  );

  return {
    zoom,
    groesser,
    kleiner,
    kannGroesser: zoom < GROESSTER - 0.01,
    kannKleiner: zoom > KLEINSTER + 0.01,
    einpassen,
  };
}
