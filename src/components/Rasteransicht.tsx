"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { hexNachRgb, istDunkel } from "@/lib/farbe/lab";
import { LEER, STOFFFARBE, type PalettenEintrag } from "@/lib/muster/typen";

/**
 * Die nächste rollbare Fläche über einem Element.
 *
 * Sie wird gesucht statt hereingereicht: welcher Kasten rollt, weiß die
 * Seite, aber es wäre eine Angabe, die man beim nächsten Umbau der Seite
 * vergisst – und dann schiebt die Geste stumm ins Leere.
 */
function rollflaeche(von: HTMLElement | null): HTMLElement | null {
  let el = von?.parentElement ?? null;
  while (el) {
    const stil = getComputedStyle(el);
    if (/(auto|scroll)/.test(stil.overflowY) || /(auto|scroll)/.test(stil.overflowX)) return el;
    el = el.parentElement;
  }
  return null;
}

export type Zeigerereignis = {
  x: number;
  y: number;
  /** true, solange der Finger bzw. die Maustaste unten ist. */
  gedrueckt: boolean;
  /** true beim ersten Ereignis einer Bewegung. */
  beginn: boolean;
  /**
   * Der Zug ist abgebrochen und darf nichts festschreiben.
   *
   * Passiert, wenn ein zweiter Finger aufsetzt: dann will die Nutzerin
   * offensichtlich zoomen oder schieben und nicht malen. Was bis dahin
   * gezogen wurde, wird verworfen – sonst bliebe bei jedem Zoomen ein
   * versehentlicher Strich stehen. `x` und `y` sind dabei bedeutungslos.
   */
  abbruch?: boolean;
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
  onZoom,
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
  /**
   * Zwei Finger auseinanderziehen: die neue Vergrößerung in Bildpunkten je
   * Stich. Ohne diese Rückmeldung gibt es keine Zwei-Finger-Geste.
   */
  onZoom?: (neu: number) => void;
  beschriftung: string;
}) {
  const leinwand = useRef<HTMLCanvasElement>(null);
  const zwischen = useRef<HTMLCanvasElement | null>(null);
  const gedrueckt = useRef(false);
  const letztesFeld = useRef<{ x: number; y: number } | null>(null);

  /**
   * Alle Finger, die gerade auf dem Raster liegen.
   *
   * Einer malt, zwei zoomen und schieben. Das ist die Geste, die jeder von
   * Fotos auf dem Tablet kennt – und ohne sie kommt man an ein Muster, das
   * größer als der Bildschirm ist, gar nicht heran: die Leinwand nimmt jede
   * Berührung an (`touch-none`), also rollt der Finger die Fläche nicht.
   */
  const finger = useRef(new Map<number, { x: number; y: number }>());
  /**
   * Die laufende Zwei-Finger-Geste. `anker` ist die Stelle im Muster, die
   * beim Aufsetzen unter der Mitte zwischen den Fingern lag – sie soll dort
   * bleiben, egal wie weit gezoomt und geschoben wird.
   */
  const geste = useRef<{
    abstand: number;
    zoomStart: number;
    anker: { x: number; y: number };
    mitte: { x: number; y: number };
    /** Die rollbare Fläche darüber – einmal beim Aufsetzen gesucht. */
    flaeche: HTMLElement | null;
  } | null>(null);

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

    // Nachgeschlagen wird über den Index des Eintrags und nicht über seine
    // Stelle in der Liste: die Garnliste wird an anderer Stelle gefiltert
    // (Farben ohne Stiche fallen heraus), und dann stimmen beide nicht mehr
    // überein. Ein Feld mit einer falschen Farbe wäre der schlimmste
    // denkbare Fehler in dieser App.
    const farben: Array<[number, number, number] | undefined> = [];
    const eintraege: Array<PalettenEintrag | undefined> = [];
    for (const eintrag of palette) {
      farben[eintrag.index] = hexNachRgb(eintrag.hex);
      eintraege[eintrag.index] = eintrag;
    }
    // Was nicht gestickt wird, bekommt die Farbe des Stoffes.
    const stoff = hexNachRgb(STOFFFARBE);
    farben[LEER] = stoff;

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
          // Ein freies Feld bekommt kein Symbol – dort ist nichts zu sticken.
          const eintrag = eintraege[raster[y * breite + x]];
          if (!eintrag) continue;
          const rgb = farben[eintrag.index] ?? stoff;
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

  // --- Zwei Finger: zoomen und schieben ------------------------------------
  /** Abstand und Mitte zwischen den ersten beiden Fingern, in Bildschirmpunkten. */
  const fingerlage = useCallback(() => {
    const [a, b] = [...finger.current.values()];
    if (!a || !b) return null;
    return {
      abstand: Math.hypot(a.x - b.x, a.y - b.y),
      mitte: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }, []);

  /**
   * Die Stelle, die beim Aufsetzen unter den Fingern lag, wieder unter die
   * Finger holen.
   *
   * Alles wird aus der gerade sichtbaren Geometrie gerechnet und nicht
   * fortgeschrieben. Dadurch ist der Aufruf beliebig oft wiederholbar und
   * zieht sich selbst gerade – auch dann, wenn das Neuzeichnen nach einer
   * Zoomänderung erst einen Wimpernschlag später kommt.
   */
  const nachfuehren = useCallback(() => {
    const g = geste.current;
    const k = g?.flaeche;
    const c = leinwand.current;
    if (!g || !k || !c) return;
    const r = c.getBoundingClientRect();
    const jeStich = r.width / breite;
    k.scrollLeft += r.left + g.anker.x * jeStich - g.mitte.x;
    k.scrollTop += r.top + g.anker.y * jeStich - g.mitte.y;
  }, [breite]);

  // Nach jeder Zoomänderung steht das Raster neu – dann muss der Anker
  // zurück unter die Finger, bevor das Bild zu sehen ist.
  useLayoutEffect(() => {
    if (geste.current) nachfuehren();
  }, [zoom, nachfuehren]);

  /** Einen begonnenen Strich verwerfen, weil daraus eine Geste geworden ist. */
  const zugAbbrechen = useCallback(() => {
    if (!gedrueckt.current) return;
    gedrueckt.current = false;
    letztesFeld.current = null;
    onZeiger?.({ x: 0, y: 0, gedrueckt: false, beginn: false, abbruch: true });
  }, [onZeiger]);

  const fingerWeg = useCallback((zeigerId: number) => {
    finger.current.delete(zeigerId);
    if (finger.current.size < 2) geste.current = null;
  }, []);

  // Mit `onZeiger` wird auf dem Raster gearbeitet – dann steht dort das
  // Fadenkreuz, mit dem sich ein einzelnes Kästchen treffen lässt. Ohne
  // Zeigerbehandlung ist das Raster nur ein Bild und bleibt es auch.
  return (
    <canvas
      ref={leinwand}
      role="img"
      aria-label={beschriftung}
      className={`raster block h-auto max-w-none touch-none select-none ${
        onZeiger ? "cursor-crosshair" : ""
      }`}
      style={{ width: Math.round(breite * zoom), height: Math.round(hoehe * zoom) }}
      onPointerDown={(e) => {
        finger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Der zweite Finger macht aus dem Malen eine Geste.
        if (onZoom && finger.current.size === 2) {
          zugAbbrechen();
          const lage = fingerlage();
          const c = leinwand.current;
          if (lage && c) {
            const r = c.getBoundingClientRect();
            const jeStich = r.width / breite;
            geste.current = {
              abstand: lage.abstand,
              zoomStart: zoom,
              anker: {
                x: (lage.mitte.x - r.left) / jeStich,
                y: (lage.mitte.y - r.top) / jeStich,
              },
              mitte: lage.mitte,
              flaeche: rollflaeche(c),
            };
          }
          return;
        }
        // Ab dem dritten Finger passiert nichts mehr – sonst zappelt das Bild.
        if (finger.current.size > 1) return;

        if (!onZeiger) return;
        const feld = feldAus(e);
        if (!feld) return;
        gedrueckt.current = true;
        letztesFeld.current = feld;
        // Der Zeigerfang gilt je Finger und steht der Geste nicht im Weg:
        // der zweite Finger meldet sich weiterhin hier. Er hält aber den
        // ersten Zug am Leben, wenn der Finger über den Rand hinausrutscht –
        // sonst risse eine Freihandauswahl genau am Rand ab.
        e.currentTarget.setPointerCapture(e.pointerId);
        onZeiger({ ...feld, gedrueckt: true, beginn: true });
      }}
      onPointerMove={(e) => {
        const gemerkt = finger.current.get(e.pointerId);
        if (gemerkt) {
          gemerkt.x = e.clientX;
          gemerkt.y = e.clientY;
        }

        const g = geste.current;
        if (g && onZoom) {
          const lage = fingerlage();
          if (!lage || lage.abstand <= 0) return;
          g.mitte = lage.mitte;
          // Erst schieben (die Mitte ist gewandert), dann die neue Größe –
          // um den Rest kümmert sich der Layout-Effekt nach dem Zeichnen.
          nachfuehren();
          onZoom((g.zoomStart * lage.abstand) / g.abstand);
          return;
        }

        if (!onZeiger || !gedrueckt.current) return;
        const feld = feldAus(e);
        if (!feld) return;
        if (letztesFeld.current?.x === feld.x && letztesFeld.current?.y === feld.y) return;
        letztesFeld.current = feld;
        onZeiger({ ...feld, gedrueckt: true, beginn: false });
      }}
      onPointerUp={(e) => {
        fingerWeg(e.pointerId);
        if (!onZeiger || !gedrueckt.current) return;
        gedrueckt.current = false;
        const feld = feldAus(e) ?? letztesFeld.current;
        if (feld) onZeiger({ ...feld, gedrueckt: false, beginn: false });
        letztesFeld.current = null;
      }}
      onPointerCancel={(e) => {
        fingerWeg(e.pointerId);
        gedrueckt.current = false;
        letztesFeld.current = null;
      }}
    />
  );
}

/** Rastpunkte für die beiden Lupenknöpfe, in Bildpunkten je Stich. */
export const ZOOMSTUFEN = [2, 3, 4, 5, 6, 8, 11, 15, 20, 26, 34] as const;

const KLEINSTER = ZOOMSTUFEN[0];
const GROESSTER = ZOOMSTUFEN[ZOOMSTUFEN.length - 1];

/**
 * Merkt sich die Vergrößerung.
 *
 * `einpassen` rechnet aus, wie groß ein Stich sein darf, damit das ganze
 * Muster in den vorhandenen Platz passt – und nimmt genau diesen Wert, nicht
 * den nächstkleineren Rastpunkt. Sonst bliebe je nach Bildschirm ein
 * Viertel der Fläche ungenutzt, und die Nutzerin soll ihre Arbeit so groß
 * wie möglich sehen.
 *
 * Die Rastpunkte gelten nur für „Größer" und „Kleiner": von jeder Stelle aus
 * geht es zum nächsten Punkt darüber oder darunter.
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

  /**
   * Stufenlos setzen – für die Zwei-Finger-Geste. Die Rastpunkte sind für die
   * Knöpfe gedacht; beim Ziehen mit den Fingern soll das Muster dem Abstand
   * folgen und nicht in Sprüngen einrasten.
   */
  const setzen = useCallback((wert: number) => {
    setZoom(Math.max(1, Math.min(GROESSTER, wert)));
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
    setzen,
    einpassen,
  };
}
