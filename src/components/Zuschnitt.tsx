"use client";

import { useCallback, useRef, useState } from "react";
import { Knopf } from "./Knopf";
import {
  VERHAELTNISSE,
  ausRechteck,
  einpassen,
  groesstesRechteck,
  kanteZiehen,
  type Ausschnitt,
  type Kante,
} from "@/lib/muster/ausschnitt";
import { useSprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

/**
 * Den Bildausschnitt wählen.
 *
 * Zugeschnitten wird so, wie man es von jedem Fotoprogramm kennt: im Rahmen
 * aufsetzen und schieben, an einer Ecke oder Kante ziehen, um ihn in jede
 * Form zu bringen, oder neben dem Rahmen aufsetzen und einen ganz neuen
 * aufziehen. Dazu die Formknöpfe („Quadrat", „Hochkant" …), die den größten
 * Ausschnitt dieser Form mittig auflegen – für viele Bilder ist das schon
 * das Ergebnis.
 *
 * Vorher stand daneben für jede dieser Bewegungen noch eine Reihe Knöpfe:
 * vier zum Verschieben, zwei für kleiner und größer, vier fürs Freihand.
 * Zusammen war das mehr Bedienfeld als Bild, und es erklärte umständlich,
 * was der Rahmen von selbst zeigt. Wer zuschneiden kann, kann auch ziehen.
 *
 * Die Anfasser sehen deshalb aus wie überall: dünne weiße Winkel an den
 * Ecken, kurze Striche an den Kanten, dazu die Drittellinien im Rahmen. Zu
 * treffen ist trotzdem ein Feld von 48 Bildschirmpunkten – das Sichtbare ist
 * schmal, das Anfassbare bleibt groß.
 */

const GRIFFE: {
  kante: Kante;
  links: number;
  oben: number;
  zeiger: string;
  /** Wie der Anfasser aussieht – Winkel an den Ecken, Strich an den Kanten. */
  stil: string;
}[] = [
  { kante: "nw", links: 0, oben: 0, zeiger: "nwse-resize", stil: "h-6 w-6 border-t-4 border-l-4" },
  { kante: "n", links: 50, oben: 0, zeiger: "ns-resize", stil: "h-1 w-8 bg-white" },
  { kante: "no", links: 100, oben: 0, zeiger: "nesw-resize", stil: "h-6 w-6 border-t-4 border-r-4" },
  { kante: "o", links: 100, oben: 50, zeiger: "ew-resize", stil: "h-8 w-1 bg-white" },
  { kante: "so", links: 100, oben: 100, zeiger: "nwse-resize", stil: "h-6 w-6 border-r-4 border-b-4" },
  { kante: "s", links: 50, oben: 100, zeiger: "ns-resize", stil: "h-1 w-8 bg-white" },
  { kante: "sw", links: 0, oben: 100, zeiger: "nesw-resize", stil: "h-6 w-6 border-b-4 border-l-4" },
  { kante: "w", links: 0, oben: 50, zeiger: "ew-resize", stil: "h-8 w-1 bg-white" },
];

/**
 * So weit muss der Finger wandern, bevor aus einem Aufsetzen neben dem
 * Rahmen ein neuer Rahmen wird. Ohne diese Schwelle würde jedes versehentliche
 * Antippen des Bildes den Ausschnitt auf einen Punkt zusammenziehen.
 */
const SCHWELLE = 10;

/** Was gerade am Zeiger hängt. */
type Ziehen =
  | { art: "verschieben"; zeigerId: number; startX: number; startY: number; start: Ausschnitt }
  | {
      art: "kante";
      kante: Kante;
      zeigerId: number;
      startX: number;
      startY: number;
      start: Ausschnitt;
    }
  | {
      art: "neu";
      zeigerId: number;
      startX: number;
      startY: number;
      /** Der Aufsetzpunkt in Bildpunkten – die eine Ecke des neuen Rahmens. */
      ecke: { x: number; y: number };
      begonnen: boolean;
    };

export function Zuschnitt({
  bildUrl,
  bildBreite,
  bildHoehe,
  ausschnitt,
  onAendern,
}: {
  bildUrl: string;
  bildBreite: number;
  bildHoehe: number;
  ausschnitt: Ausschnitt;
  onAendern: (neu: Ausschnitt) => void;
}) {
  const { t, zahl } = useSprache();
  const bildRef = useRef<HTMLImageElement | null>(null);
  const ziehtRef = useRef<Ziehen | null>(null);
  const [zieht, setZieht] = useState(false);

  /** Wie viele Bildpunkte entspricht ein Bildschirmpunkt gerade? */
  const massstab = useCallback(() => {
    const b = bildRef.current?.getBoundingClientRect();
    if (!b || b.width <= 0 || b.height <= 0) return { x: 1, y: 1 };
    return { x: bildBreite / b.width, y: bildHoehe / b.height };
  }, [bildBreite, bildHoehe]);

  /** Einen Punkt auf dem Schirm in Bildpunkte des Quellbildes umrechnen. */
  const punktImBild = useCallback(
    (clientX: number, clientY: number) => {
      const b = bildRef.current?.getBoundingClientRect();
      if (!b) return { x: 0, y: 0 };
      const m = massstab();
      return { x: (clientX - b.left) * m.x, y: (clientY - b.top) * m.y };
    },
    [massstab],
  );

  function zeigerRunter(e: React.PointerEvent<HTMLDivElement>) {
    const ziel = e.target as HTMLElement;
    const kante = ziel.dataset.griff as Kante | undefined;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (kante) {
      // Freihand an einer Ecke oder Kante.
      ziehtRef.current = {
        art: "kante",
        kante,
        zeigerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        start: ausschnitt,
      };
    } else if (ziel.dataset.rahmen) {
      ziehtRef.current = {
        art: "verschieben",
        zeigerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        start: ausschnitt,
      };
    } else {
      // Neben dem Rahmen aufgesetzt: von hier aus wird ein neuer aufgezogen.
      ziehtRef.current = {
        art: "neu",
        zeigerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        ecke: punktImBild(e.clientX, e.clientY),
        begonnen: false,
      };
    }
    setZieht(true);
  }

  function zeigerBewegt(e: React.PointerEvent<HTMLDivElement>) {
    const z = ziehtRef.current;
    if (!z || z.zeigerId !== e.pointerId) return;
    const m = massstab();
    const dx = e.clientX - z.startX;
    const dy = e.clientY - z.startY;

    if (z.art === "verschieben") {
      onAendern(
        einpassen(
          { ...z.start, x: z.start.x + dx * m.x, y: z.start.y + dy * m.y },
          bildBreite,
          bildHoehe,
        ),
      );
      return;
    }

    if (z.art === "kante") {
      onAendern(kanteZiehen(z.start, z.kante, dx * m.x, dy * m.y, bildBreite, bildHoehe));
      return;
    }

    // Ein neuer Rahmen entsteht erst, wenn wirklich gezogen wird.
    if (!z.begonnen && Math.abs(dx) < SCHWELLE && Math.abs(dy) < SCHWELLE) return;
    z.begonnen = true;
    const jetzt = punktImBild(e.clientX, e.clientY);
    onAendern(ausRechteck(z.ecke.x, z.ecke.y, jetzt.x, jetzt.y, bildBreite, bildHoehe));
  }

  function zeigerHoch(e: React.PointerEvent<HTMLDivElement>) {
    if (ziehtRef.current?.zeigerId === e.pointerId) {
      ziehtRef.current = null;
      setZieht(false);
    }
  }

  // Anteile für die Anzeige – das Rechteck liegt als Prozentwert über dem Bild.
  const anteil = (wert: number, ganz: number) => `${(wert / ganz) * 100}%`;

  return (
    /* Auf breiten Schirmen steht das Bild links und alles zum Einstellen
       rechts daneben. Untereinander wurde die Seite so hoch, dass man vom
       Bild zu den Knöpfen blättern musste – und dabei sieht man nicht mehr,
       was der Knopf gerade bewirkt.

       Das Bild bekommt jetzt die breitere Spalte: rechts stehen nur noch die
       fünf Formknöpfe, und je größer das Bild ist, desto leichter trifft man
       den Rahmen und desto besser sieht man, was man zuschneidet. */
    <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-start">
      {/* --- Das Bild mit dem Rahmen --------------------------------------- */}
      {/* overflow-hidden ist wichtig: der Schleier um den Rahmen entsteht aus
          einem sehr weiten Schlagschatten. Ohne diese Klammer legt er sich
          über die ganze Seite statt nur über das Bild.

          Alle Zeigerereignisse hängen an dieser einen Klammer und nicht an
          Rahmen und Anfassern einzeln: so bleibt der Finger auch dann am
          Rahmen, wenn er beim Ziehen über den Bildrand hinausrutscht. */}
      <div
        className="relative w-full touch-none overflow-hidden rounded-xl select-none"
        onPointerDown={zeigerRunter}
        onPointerMove={zeigerBewegt}
        onPointerUp={zeigerHoch}
        onPointerCancel={zeigerHoch}
      >
        {/* Kein next/image: die Adresse ist eine Objekt-URL aus dem Browser
            der Nutzerin. Da gibt es nichts zu optimieren, der Hoster sieht
            dieses Bild nie. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={bildRef}
          src={bildUrl}
          alt={t("zuschnitt.bildBeschriftung")}
          className="block w-full cursor-crosshair rounded-xl border border-linie"
          draggable={false}
        />
        {/* Was wegfällt, liegt unter einem Schleier – so ist auf einen Blick
            zu sehen, was übrig bleibt. Der Rahmen selbst ist nur ein feiner
            weißer Strich: sichtbar auf jedem Bild, aber er verdeckt nichts
            von dem, worauf es ankommt. */}
        <div
          data-rahmen="ja"
          className={`absolute cursor-move border shadow-[0_0_0_1px_rgba(0,0,0,0.45),0_0_0_9999px_rgba(0,0,0,0.45)] ${
            zieht ? "border-white" : "border-white/85"
          }`}
          style={{
            left: anteil(ausschnitt.x, bildBreite),
            top: anteil(ausschnitt.y, bildHoehe),
            width: anteil(ausschnitt.breite, bildBreite),
            height: anteil(ausschnitt.hoehe, bildHoehe),
          }}
        >
          {/* Die Drittellinien. Sie gehören zu jedem Zuschneiden dazu und
              helfen beim Ausrichten; für den Zeiger sind sie nicht da. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3"
          >
            <span className="border-r border-b border-white/30" />
            <span className="border-r border-b border-white/30" />
            <span className="border-b border-white/30" />
            <span className="border-r border-b border-white/30" />
            <span className="border-r border-b border-white/30" />
            <span className="border-b border-white/30" />
            <span className="border-r border-white/30" />
            <span className="border-r border-white/30" />
            <span />
          </div>

          {/* Die Anfasser. Das Feld zum Anfassen ist mit 48 Bildschirmpunkten
              deutlich größer als der weiße Winkel darin; das Sichtbare selbst
              nimmt keine Ereignisse an, sonst käme es dem Zeiger in die
              Quere. Für Vorlesegeräte sind sie unsichtbar – dort führt der
              Weg über die Formknöpfe. */}
          {GRIFFE.map((griff) => (
            <span
              key={griff.kante}
              data-griff={griff.kante}
              aria-hidden="true"
              style={{
                left: `${griff.links}%`,
                top: `${griff.oben}%`,
                transform: `translate(-${griff.links}%, -${griff.oben}%)`,
                cursor: griff.zeiger,
              }}
              className="absolute p-3"
            >
              <span
                className={`pointer-events-none block border-white drop-shadow-[0_0_1px_rgba(0,0,0,0.7)] ${griff.stil}`}
              />
            </span>
          ))}
        </div>
      </div>

      {/* --- Alles zum Einstellen ------------------------------------------ */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h3 className="text-[1.1rem] font-semibold">{t("zuschnitt.formWaehlen")}</h3>
          <div className="flex flex-wrap gap-2">
            {VERHAELTNISSE.map((v) => (
              <Knopf
                key={v.schluessel}
                art="neben"
                klein
                onClick={() => onAendern(groesstesRechteck(bildBreite, bildHoehe, v.verhaeltnis))}
              >
                {t(v.titel as Textschluessel)}
              </Knopf>
            ))}
          </div>
          <p className="max-w-[52ch] text-[1rem] text-gedaempft">{t("zuschnitt.freihandText")}</p>
        </div>

        <p className="text-[1rem] text-gedaempft">
          {t("zuschnitt.masse", {
            breite: zahl(ausschnitt.breite),
            hoehe: zahl(ausschnitt.hoehe),
          })}
        </p>
      </div>
    </div>
  );
}
