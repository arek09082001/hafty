"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ZeigerReact,
} from "react";
import {
  farbtabelle,
  kleinbildZeichnen,
  musterZeichnen,
  type Einfuegevorschau,
} from "@/lib/muster/leinwand";
import type { PalettenEintrag } from "@/lib/muster/typen";

export type { Einfuegevorschau };

export type Zeigerereignis = {
  x: number;
  y: number;
  /** true, solange der Finger bzw. die Maustaste unten ist. */
  gedrueckt: boolean;
  /** true beim ersten Ereignis einer Bewegung. */
  beginn: boolean;
  /**
   * Der Zug wurde abgebrochen und darf nichts festschreiben – zum Beispiel,
   * weil ein zweiter Finger dazugekommen ist und jetzt gezoomt wird.
   */
  abbruch?: boolean;
};

/** Grenzen der Vergrößerung, in Bildpunkten je Stich. */
const KLEINSTER = 0.5;
const GROESSTER = 40;

/** Rastpunkte für „Größer" und „Kleiner". Das Mausrad zoomt stufenlos. */
const STUFEN = [0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 8, 11, 15, 20, 26, 34, 40];

/** Luft ringsum, wenn das ganze Muster eingepasst wird. */
const RAND = 16;

/** So viel vom Muster bleibt beim Schieben mindestens im Bild. */
const MINDESTENS_SICHTBAR = 120;

type Stand = { zoom: number; x: number; y: number };

/**
 * Was gerade zu sehen ist: die Vergrößerung und die Stelle, an der die linke
 * obere Ecke des Musters im Sichtfenster liegt.
 *
 * Vorher lag das Muster in einem Kasten mit Rollbalken. Auf einem großen
 * Muster hieß das: mit der rechten Hand am Balken ziehen, mit der linken die
 * Lupenknöpfe suchen – und nach jedem Vergrößern war man an einer anderen
 * Stelle als gedacht, weil ein Rollbalken die Mitte nicht kennt. Jetzt gilt
 * das, was man von jeder Landkarte kennt: Mausrad vergrößert **zum Zeiger
 * hin**, Ziehen verschiebt, zwei Finger tun beides.
 */
export function useAnsicht(breite: number, hoehe: number) {
  const flaeche = useRef<HTMLDivElement>(null);
  const [stand, setStand] = useState<Stand>({ zoom: 6, x: 0, y: 0 });

  const rahmen = useCallback(() => {
    const feld = flaeche.current;
    return { w: feld?.clientWidth ?? 0, h: feld?.clientHeight ?? 0 };
  }, []);

  /**
   * Das Muster darf nicht aus dem Bild geschoben werden: ein Streifen bleibt
   * immer sichtbar. Sonst zieht man einmal zu weit und sieht nur noch leere
   * Fläche, ohne zu wissen, in welche Richtung das Muster liegt.
   */
  const begrenzen = useCallback(
    (s: Stand): Stand => {
      const { w, h } = rahmen();
      if (w === 0 || h === 0) return s;
      const musterBreite = breite * s.zoom;
      const musterHoehe = hoehe * s.zoom;
      const randX = Math.min(MINDESTENS_SICHTBAR, musterBreite, w);
      const randY = Math.min(MINDESTENS_SICHTBAR, musterHoehe, h);
      return {
        zoom: s.zoom,
        x: Math.min(w - randX, Math.max(randX - musterBreite, s.x)),
        y: Math.min(h - randY, Math.max(randY - musterHoehe, s.y)),
      };
    },
    [breite, hoehe, rahmen],
  );

  /** Neue Vergrößerung, wobei die Stelle unter dem Zeiger stehen bleibt. */
  const zoomRechnen = useCallback(
    (s: Stand, gewuenscht: number, ankerX?: number, ankerY?: number): Stand => {
      const { w, h } = rahmen();
      const zoom = Math.max(KLEINSTER, Math.min(GROESSTER, gewuenscht));
      if (zoom === s.zoom) return s;
      const ax = ankerX ?? w / 2;
      const ay = ankerY ?? h / 2;
      const faktor = zoom / s.zoom;
      return begrenzen({
        zoom,
        x: ax - (ax - s.x) * faktor,
        y: ay - (ay - s.y) * faktor,
      });
    },
    [begrenzen, rahmen],
  );

  const zoomUm = useCallback(
    (faktor: number, ankerX?: number, ankerY?: number) => {
      setStand((s) => zoomRechnen(s, s.zoom * faktor, ankerX, ankerY));
    },
    [zoomRechnen],
  );

  const groesser = useCallback(() => {
    setStand((s) => zoomRechnen(s, STUFEN.find((stufe) => stufe > s.zoom + 0.01) ?? GROESSTER));
  }, [zoomRechnen]);

  const kleiner = useCallback(() => {
    setStand((s) => {
      let ziel = KLEINSTER;
      for (let i = STUFEN.length - 1; i >= 0; i--) {
        if (STUFEN[i] < s.zoom - 0.01) {
          ziel = STUFEN[i];
          break;
        }
      }
      return zoomRechnen(s, ziel);
    });
  }, [zoomRechnen]);

  const verschieben = useCallback(
    (dx: number, dy: number) => {
      setStand((s) => begrenzen({ zoom: s.zoom, x: s.x + dx, y: s.y + dy }));
    },
    [begrenzen],
  );

  /**
   * Das ganze Muster einpassen. Genommen wird genau der Wert, der passt, und
   * nicht der nächstkleinere Rastpunkt – sonst bliebe je nach Bildschirm ein
   * Viertel der Fläche ungenutzt.
   */
  const ganzZeigen = useCallback(() => {
    const { w, h } = rahmen();
    if (w === 0 || h === 0 || breite <= 0 || hoehe <= 0) return;
    const passend = Math.min((w - 2 * RAND) / breite, (h - 2 * RAND) / hoehe);
    const zoom = Math.max(KLEINSTER, Math.min(GROESSTER, passend));
    setStand({
      zoom,
      x: Math.round((w - breite * zoom) / 2),
      y: Math.round((h - hoehe * zoom) / 2),
    });
  }, [breite, hoehe, rahmen]);

  /** Nach einer Größenänderung des Fensters wieder in die Grenzen holen. */
  const nachRahmen = useCallback(() => {
    setStand((s) => begrenzen(s));
  }, [begrenzen]);

  return {
    flaeche,
    zoom: stand.zoom,
    x: stand.x,
    y: stand.y,
    groesser,
    kleiner,
    ganzZeigen,
    zoomUm,
    verschieben,
    nachRahmen,
    kannGroesser: stand.zoom < GROESSTER - 0.01,
    kannKleiner: stand.zoom > KLEINSTER + 0.01,
  };
}

export type Ansicht = ReturnType<typeof useAnsicht>;

/**
 * Die Arbeitsfläche: das Muster, so groß und an der Stelle, wie es gerade
 * angesehen wird.
 *
 * Gezeichnet wird nur der sichtbare Ausschnitt auf eine Leinwand in
 * Fenstergröße. Ein Muster mit 400 × 400 Stichen bei vierzigfacher
 * Vergrößerung wäre sonst eine Leinwand von 16 000 Punkten Kantenlänge –
 * die legt kein Browser mehr an.
 */
export function Arbeitsflaeche({
  ansicht,
  breite,
  hoehe,
  raster,
  palette,
  mitSymbolen = false,
  auswahl,
  vorschau,
  onZeiger,
  schieben = false,
  beschriftung,
  className = "",
  children,
}: {
  ansicht: Ansicht;
  breite: number;
  hoehe: number;
  raster: Uint16Array;
  palette: PalettenEintrag[];
  mitSymbolen?: boolean;
  auswahl?: Uint8Array | null;
  vorschau?: Einfuegevorschau | null;
  onZeiger?: (e: Zeigerereignis) => void;
  /** Im Schiebemodus verschiebt jeder Zug das Muster, statt zu bearbeiten. */
  schieben?: boolean;
  beschriftung: string;
  className?: string;
  /** Schwebt über der Fläche: die Knöpfe für Ansicht und Vergrößerung. */
  children?: ReactNode;
}) {
  const leinwand = useRef<HTMLCanvasElement>(null);
  const klein = useRef<HTMLCanvasElement | null>(null);
  const [sicht, setSicht] = useState({ w: 0, h: 0 });
  const [raumTaste, setRaumTaste] = useState(false);
  const [zieht, setZieht] = useState(false);

  const tabelle = useMemo(() => farbtabelle(palette), [palette]);
  const { flaeche, ganzZeigen, nachRahmen, zoomUm, verschieben, zoom, x, y } = ansicht;

  // --- Größe des Fensters verfolgen ----------------------------------------
  // Beim ersten Mal und nach jedem neuen Muster wird eingepasst; sonst wird
  // nur nachgeführt, damit das Muster nicht aus dem Bild rutscht.
  const gepasst = useRef("");
  useEffect(() => {
    const feld = flaeche.current;
    if (!feld) return;

    const messen = () => {
      const w = feld.clientWidth;
      const h = feld.clientHeight;
      setSicht((alt) => (alt.w === w && alt.h === h ? alt : { w, h }));
      if (w === 0 || h === 0) return;
      const schluessel = `${breite}x${hoehe}`;
      if (gepasst.current !== schluessel) {
        gepasst.current = schluessel;
        ganzZeigen();
      } else {
        nachRahmen();
      }
    };

    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(feld);
    return () => beobachter.disconnect();
  }, [flaeche, breite, hoehe, ganzZeigen, nachRahmen]);

  // --- Mausrad --------------------------------------------------------------
  // Der Zeiger muss von Hand angemeldet werden: React hängt `wheel` als
  // passiven Zuhörer ein, und ein passiver Zuhörer darf das Blättern der
  // Seite nicht verhindern.
  useEffect(() => {
    const feld = flaeche.current;
    if (!feld) return;
    const beiRad = (e: WheelEvent) => {
      e.preventDefault();
      const kasten = feld.getBoundingClientRect();
      // Zeilen und Seiten in Punkte umrechnen, sonst zoomt ein Mausrad je
      // nach Browser einmal winzig und einmal quer durch alle Stufen.
      const schritt =
        e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * kasten.height : e.deltaY;
      const faktor = Math.exp(-Math.max(-240, Math.min(240, schritt)) * 0.0022);
      zoomUm(faktor, e.clientX - kasten.left, e.clientY - kasten.top);
    };
    feld.addEventListener("wheel", beiRad, { passive: false });
    return () => feld.removeEventListener("wheel", beiRad);
  }, [flaeche, zoomUm]);

  // --- Leertaste schiebt vorübergehend --------------------------------------
  useEffect(() => {
    const runter = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const ziel = e.target as HTMLElement | null;
      // Auf einem Knopf oder in einem Feld hat die Leertaste ihre eigene
      // Bedeutung – die wird nicht angetastet.
      if (
        ziel &&
        (ziel.tagName === "INPUT" ||
          ziel.tagName === "TEXTAREA" ||
          ziel.tagName === "BUTTON" ||
          ziel.tagName === "A" ||
          ziel.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setRaumTaste(true);
    };
    const hoch = (e: KeyboardEvent) => {
      if (e.code === "Space") setRaumTaste(false);
    };
    window.addEventListener("keydown", runter);
    window.addEventListener("keyup", hoch);
    return () => {
      window.removeEventListener("keydown", runter);
      window.removeEventListener("keyup", hoch);
    };
  }, []);

  // --- Zeichnen -------------------------------------------------------------
  const letzteLage = useRef<unknown[]>([]);
  useEffect(() => {
    const canvas = leinwand.current;
    if (!canvas || sicht.w === 0 || sicht.h === 0) return;
    if (!klein.current) klein.current = document.createElement("canvas");

    // Das Bild mit einem Punkt je Stich wird nur neu gebaut, wenn sich am
    // Muster selbst etwas geändert hat – beim Schieben und Zoomen nicht.
    const lage = [breite, hoehe, raster, tabelle, vorschau ?? null];
    if (lage.some((wert, i) => letzteLage.current[i] !== wert)) {
      kleinbildZeichnen(klein.current, breite, hoehe, raster, tabelle, vorschau);
      letzteLage.current = lage;
    }

    musterZeichnen(canvas, klein.current, {
      breite,
      hoehe,
      raster,
      tabelle,
      zoom,
      versatzX: x,
      versatzY: y,
      sichtBreite: sicht.w,
      sichtHoehe: sicht.h,
      mitSymbolen,
      auswahl,
      vorschau,
      mitBlatt: true,
    });
  }, [breite, hoehe, raster, tabelle, zoom, x, y, sicht, mitSymbolen, auswahl, vorschau]);

  // --- Zeigerbehandlung -----------------------------------------------------
  const zeiger = useRef(new Map<number, { x: number; y: number }>());
  const schiebt = useRef<{ id: number; x: number; y: number } | null>(null);
  const malt = useRef<{ id: number; x: number; y: number } | null>(null);
  const kneift = useRef<{ abstand: number; x: number; y: number } | null>(null);

  /**
   * Vom Bildschirmpunkt zum Rasterfeld.
   *
   * Rutscht der Finger während eines Zuges über den Rand des Musters hinaus,
   * wird auf das äußerste Feld begrenzt statt das Ereignis zu verwerfen.
   * Sonst risse eine Freihandauswahl ab, sobald jemand am Rand entlangfährt –
   * und genau dort fährt man beim Umranden eines Motivs.
   */
  const feldAus = useCallback(
    (klientX: number, klientY: number) => {
      const feld = flaeche.current;
      if (!feld) return null;
      const kasten = feld.getBoundingClientRect();
      const px = Math.floor((klientX - kasten.left - x) / zoom);
      const py = Math.floor((klientY - kasten.top - y) / zoom);
      return {
        x: Math.max(0, Math.min(breite - 1, px)),
        y: Math.max(0, Math.min(hoehe - 1, py)),
      };
    },
    [flaeche, x, y, zoom, breite, hoehe],
  );

  const zugAbbrechen = () => {
    if (!malt.current) return;
    onZeiger?.({ x: malt.current.x, y: malt.current.y, gedrueckt: false, beginn: false, abbruch: true });
    malt.current = null;
  };

  const kneifenMessen = () => {
    const punkte = [...zeiger.current.values()];
    if (punkte.length < 2) return null;
    const [a, b] = punkte;
    return {
      abstand: Math.hypot(a.x - b.x, a.y - b.y),
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
  };

  const beiRunter = (e: ZeigerReact<HTMLDivElement>) => {
    const feld = flaeche.current;
    if (!feld) return;

    // Nur was auf der Leinwand selbst beginnt, malt oder schiebt. Über ihr
    // schweben die Knöpfe für die Ansicht; deren Zeigerereignisse steigen bis
    // hierher auf. Würden sie hier angenommen, fasste die Fläche den Zeiger –
    // und der Browser schickte den Klick dann an die Fläche statt an den
    // Knopf. „Alles zeigen" täte dann nichts, und stattdessen wäre ein Motiv
    // ausgewählt.
    if (e.target !== leinwand.current) return;

    zeiger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Zwei Finger heißt immer: ansehen. Ein angefangener Strich wird dabei
    // verworfen und nicht etwa festgeschrieben.
    if (zeiger.current.size === 2) {
      zugAbbrechen();
      schiebt.current = null;
      setZieht(true);
      kneift.current = kneifenMessen();
      return;
    }
    if (zeiger.current.size > 2) return;

    if (schieben || raumTaste || e.button === 1) {
      schiebt.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      setZieht(true);
      feld.setPointerCapture(e.pointerId);
      return;
    }

    if (!onZeiger || e.button !== 0) return;
    const ziel = feldAus(e.clientX, e.clientY);
    if (!ziel) return;
    malt.current = { id: e.pointerId, ...ziel };
    feld.setPointerCapture(e.pointerId);
    onZeiger({ ...ziel, gedrueckt: true, beginn: true });
  };

  const beiBewegung = (e: ZeigerReact<HTMLDivElement>) => {
    if (!zeiger.current.has(e.pointerId)) return;
    zeiger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (kneift.current && zeiger.current.size >= 2) {
      const jetzt = kneifenMessen();
      if (!jetzt) return;
      const feld = flaeche.current;
      const kasten = feld?.getBoundingClientRect();
      verschieben(jetzt.x - kneift.current.x, jetzt.y - kneift.current.y);
      if (kneift.current.abstand > 0 && kasten) {
        zoomUm(jetzt.abstand / kneift.current.abstand, jetzt.x - kasten.left, jetzt.y - kasten.top);
      }
      kneift.current = jetzt;
      return;
    }

    if (schiebt.current?.id === e.pointerId) {
      verschieben(e.clientX - schiebt.current.x, e.clientY - schiebt.current.y);
      schiebt.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      return;
    }

    if (malt.current?.id === e.pointerId && onZeiger) {
      const ziel = feldAus(e.clientX, e.clientY);
      if (!ziel) return;
      if (ziel.x === malt.current.x && ziel.y === malt.current.y) return;
      malt.current = { id: e.pointerId, ...ziel };
      onZeiger({ ...ziel, gedrueckt: true, beginn: false });
    }
  };

  const beiHoch = (e: ZeigerReact<HTMLDivElement>, abbruch: boolean) => {
    zeiger.current.delete(e.pointerId);

    if (kneift.current) {
      if (zeiger.current.size < 2) {
        kneift.current = null;
        setZieht(false);
      } else {
        kneift.current = kneifenMessen();
      }
      return;
    }

    if (schiebt.current?.id === e.pointerId) {
      schiebt.current = null;
      setZieht(false);
      return;
    }

    if (malt.current?.id === e.pointerId && onZeiger) {
      const ziel = (abbruch ? null : feldAus(e.clientX, e.clientY)) ?? {
        x: malt.current.x,
        y: malt.current.y,
      };
      malt.current = null;
      onZeiger({ ...ziel, gedrueckt: false, beginn: false, abbruch });
    }
  };

  const schiebeModus = schieben || raumTaste;

  return (
    <div
      ref={flaeche}
      className={`relative min-h-0 touch-none overflow-hidden bg-papier select-none ${className}`}
      style={{ cursor: schiebeModus ? (zieht ? "grabbing" : "grab") : "crosshair" }}
      onPointerDown={beiRunter}
      onPointerMove={beiBewegung}
      onPointerUp={(e) => beiHoch(e, false)}
      onPointerCancel={(e) => beiHoch(e, true)}
    >
      <canvas
        ref={leinwand}
        role="img"
        aria-label={beschriftung}
        className="raster block h-full w-full"
      />
      {children}
    </div>
  );
}
