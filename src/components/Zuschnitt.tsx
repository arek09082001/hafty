"use client";

import { useCallback, useRef, useState } from "react";
import { Knopf } from "./Knopf";
import {
  VERHAELTNISSE,
  ausRechteck,
  einpassen,
  groesseAendern,
  groesstesRechteck,
  kanteZiehen,
  seiteAendern,
  verschieben,
  type Ausschnitt,
  type Kante,
} from "@/lib/muster/ausschnitt";
import { useSprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

/**
 * Den Bildausschnitt wählen.
 *
 * Es führen bewusst mehrere Wege zum selben Ziel:
 *
 *  - Ein Antippen auf „Quadrat“, „Hochkant“ … legt den größten Ausschnitt
 *    dieser Form mittig auf das Bild. Für viele Bilder ist das schon das
 *    Ergebnis, und man muss nichts weiter tun.
 *  - **Freihand** geht mit dem Finger: an einer Ecke oder Kante ziehen macht
 *    den Ausschnitt schmaler, breiter, höher oder flacher, ganz ohne festes
 *    Seitenverhältnis. Und wer neben dem Rahmen auf dem Bild aufsetzt und
 *    zieht, spannt einfach einen neuen Rahmen auf.
 *  - Verschoben wird mit dem Finger – **oder** mit den vier Pfeilknöpfen.
 *  - Auch die Freihandgröße geht über Knöpfe: „Breiter“, „Schmaler“,
 *    „Höher“, „Flacher“. Ziehen ist nie der einzige Weg; wer eine Maus hat
 *    oder unsicher greift, kommt genauso ans Ziel.
 *
 * Die Anfasser sind deshalb auch keine kleinen Punkte: sichtbar sind 24
 * Bildschirmpunkte, treffen kann man ein Feld von 48 – das ist auf einem
 * Tablet auch mit älteren Fingern zu schaffen.
 */

/**
 * Die acht Anfasser: Kürzel, Lage am Rahmen in Prozent und der passende
 * Mauszeiger.
 *
 * Die Prozentzahl ist zugleich die Verschiebung: bei 0 % liegt der Anfasser
 * mit seiner linken Kante am Rahmen, bei 100 % mit seiner rechten. Dadurch
 * liegt jeder Anfasser **innerhalb** des Rahmens statt zur Hälfte darüber
 * hinaus – am Bildrand würde er sonst abgeschnitten und wäre kaum zu treffen.
 */
const GRIFFE: { kante: Kante; links: number; oben: number; zeiger: string }[] = [
  { kante: "nw", links: 0, oben: 0, zeiger: "nwse-resize" },
  { kante: "n", links: 50, oben: 0, zeiger: "ns-resize" },
  { kante: "no", links: 100, oben: 0, zeiger: "nesw-resize" },
  { kante: "o", links: 100, oben: 50, zeiger: "ew-resize" },
  { kante: "so", links: 100, oben: 100, zeiger: "nwse-resize" },
  { kante: "s", links: 50, oben: 100, zeiger: "ns-resize" },
  { kante: "sw", links: 0, oben: 100, zeiger: "nesw-resize" },
  { kante: "w", links: 0, oben: 50, zeiger: "ew-resize" },
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
       was der Knopf gerade bewirkt. */
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
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
            zu sehen, was übrig bleibt. */}
        <div
          data-rahmen="ja"
          className={`absolute cursor-move rounded-sm border-[3px] border-white shadow-[0_0_0_3px_#0f4c35,0_0_0_9999px_rgba(0,0,0,0.45)] ${
            zieht ? "border-hauptaktion" : ""
          }`}
          style={{
            left: anteil(ausschnitt.x, bildBreite),
            top: anteil(ausschnitt.y, bildHoehe),
            width: anteil(ausschnitt.breite, bildBreite),
            height: anteil(ausschnitt.hoehe, bildHoehe),
          }}
        >
          {/* Die Anfasser für Freihand. Sie sind nur zum Ziehen da und für
              Vorlesegeräte unsichtbar – über die Knöpfe rechts kommt man
              ohne Ziehen zum selben Ergebnis. */}
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
              className="absolute p-3 after:block after:h-6 after:w-6 after:rounded-[3px] after:border-2 after:border-hauptaktion after:bg-white after:shadow-[0_0_0_1px_rgba(0,0,0,0.35)] after:content-['']"
            />
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

        <div className="flex flex-wrap items-start gap-8">
        <div className="flex flex-col gap-2">
          <h3 className="text-[1.1rem] font-semibold">{t("zuschnitt.schieben")}</h3>
          <div className="grid w-[330px] grid-cols-3 gap-2">
            <span />
            <Knopf art="neben" klein onClick={() => onAendern(verschieben(ausschnitt, 0, -0.2, bildBreite, bildHoehe))}>
              {t("editor.hoch")}
            </Knopf>
            <span />
            <Knopf art="neben" klein onClick={() => onAendern(verschieben(ausschnitt, -0.2, 0, bildBreite, bildHoehe))}>
              {t("editor.links")}
            </Knopf>
            <span />
            <Knopf art="neben" klein onClick={() => onAendern(verschieben(ausschnitt, 0.2, 0, bildBreite, bildHoehe))}>
              {t("editor.rechts")}
            </Knopf>
            <span />
            <Knopf art="neben" klein onClick={() => onAendern(verschieben(ausschnitt, 0, 0.2, bildBreite, bildHoehe))}>
              {t("editor.runter")}
            </Knopf>
            <span />
          </div>
        </div>

        <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h3 className="text-[1.1rem] font-semibold">{t("zuschnitt.groesse")}</h3>
          <div className="grid w-[260px] grid-cols-2 gap-2">
            <Knopf
              art="neben"
              klein
              onClick={() => onAendern(groesseAendern(ausschnitt, 0.85, bildBreite, bildHoehe))}
            >
              {t("zuschnitt.kleiner")}
            </Knopf>
            <Knopf
              art="neben"
              klein
              onClick={() => onAendern(groesseAendern(ausschnitt, 1 / 0.85, bildBreite, bildHoehe))}
            >
              {t("zuschnitt.groesser")}
            </Knopf>
          </div>
        </div>

        {/* Freihand ohne Ziehen: Breite und Höhe lassen sich einzeln ändern,
            das Seitenverhältnis darf dabei alles werden. */}
        <div className="flex flex-col gap-2">
          <h3 className="text-[1.1rem] font-semibold">{t("zuschnitt.freihand")}</h3>
          <div className="grid w-[260px] grid-cols-2 gap-2">
            <Knopf
              art="neben"
              klein
              onClick={() => onAendern(seiteAendern(ausschnitt, "breite", 0.85, bildBreite, bildHoehe))}
            >
              {t("zuschnitt.schmaler")}
            </Knopf>
            <Knopf
              art="neben"
              klein
              onClick={() =>
                onAendern(seiteAendern(ausschnitt, "breite", 1 / 0.85, bildBreite, bildHoehe))
              }
            >
              {t("zuschnitt.breiter")}
            </Knopf>
            <Knopf
              art="neben"
              klein
              onClick={() => onAendern(seiteAendern(ausschnitt, "hoehe", 0.85, bildBreite, bildHoehe))}
            >
              {t("zuschnitt.flacher")}
            </Knopf>
            <Knopf
              art="neben"
              klein
              onClick={() =>
                onAendern(seiteAendern(ausschnitt, "hoehe", 1 / 0.85, bildBreite, bildHoehe))
              }
            >
              {t("zuschnitt.hoeher")}
            </Knopf>
          </div>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}
