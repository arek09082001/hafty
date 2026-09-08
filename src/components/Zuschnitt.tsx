"use client";

import { useCallback, useRef, useState } from "react";
import { Knopf } from "./Knopf";
import {
  VERHAELTNISSE,
  einpassen,
  groesseAendern,
  groesstesRechteck,
  verschieben,
  type Ausschnitt,
} from "@/lib/muster/ausschnitt";
import { useSprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

/**
 * Den Bildausschnitt wählen.
 *
 * So einfach wie möglich gehalten:
 *
 *  - Ein Antippen auf „Quadrat“, „Hochkant“ … legt den größten Ausschnitt
 *    dieser Form mittig auf das Bild. Für die meisten Bilder ist das schon
 *    das Ergebnis, und man muss nichts weiter tun.
 *  - Verschoben wird mit dem Finger – **oder** mit den vier Pfeilknöpfen.
 *    Ziehen ist nie der einzige Weg; wer eine Maus hat oder unsicher greift,
 *    kommt genauso ans Ziel.
 *  - Größer und kleiner geht nur über Knöpfe. Kleine Anfasser an den Ecken
 *    wären auf einem Tablet mit älteren Fingern nicht zu treffen.
 */
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
  const ziehtRef = useRef<{ zeigerId: number; startX: number; startY: number; start: Ausschnitt } | null>(null);
  const [zieht, setZieht] = useState(false);

  /** Wie viele Bildpunkte entspricht ein Bildschirmpunkt gerade? */
  const massstab = useCallback(() => {
    const b = bildRef.current?.getBoundingClientRect();
    return b && b.width > 0 ? bildBreite / b.width : 1;
  }, [bildBreite]);

  function zeigerRunter(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    ziehtRef.current = {
      zeigerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      start: ausschnitt,
    };
    setZieht(true);
  }

  function zeigerBewegt(e: React.PointerEvent<HTMLDivElement>) {
    const z = ziehtRef.current;
    if (!z || z.zeigerId !== e.pointerId) return;
    const m = massstab();
    onAendern(
      einpassen(
        {
          ...z.start,
          x: z.start.x + (e.clientX - z.startX) * m,
          y: z.start.y + (e.clientY - z.startY) * m,
        },
        bildBreite,
        bildHoehe,
      ),
    );
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
    <div className="flex flex-col gap-4">
      {/* --- Die Formen ---------------------------------------------------- */}
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
      </div>

      {/* --- Das Bild mit dem Rahmen --------------------------------------- */}
      {/* overflow-hidden ist wichtig: der Schleier um den Rahmen entsteht aus
          einem sehr weiten Schlagschatten. Ohne diese Klammer legt er sich
          über die ganze Seite statt nur über das Bild. */}
      <div className="relative mx-auto w-full max-w-[520px] touch-none overflow-hidden rounded-xl select-none">
        {/* Kein next/image: die Adresse ist eine Objekt-URL aus dem Browser
            der Nutzerin. Da gibt es nichts zu optimieren, der Hoster sieht
            dieses Bild nie. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={bildRef}
          src={bildUrl}
          alt={t("zuschnitt.bildBeschriftung")}
          className="block w-full rounded-xl border-2 border-tinte"
          draggable={false}
        />
        {/* Was wegfällt, liegt unter einem Schleier – so ist auf einen Blick
            zu sehen, was übrig bleibt. */}
        <div
          className={`absolute cursor-move rounded-sm border-[3px] border-white shadow-[0_0_0_3px_#0f4c35,0_0_0_9999px_rgba(0,0,0,0.45)] ${
            zieht ? "border-hauptaktion" : ""
          }`}
          style={{
            left: anteil(ausschnitt.x, bildBreite),
            top: anteil(ausschnitt.y, bildHoehe),
            width: anteil(ausschnitt.breite, bildBreite),
            height: anteil(ausschnitt.hoehe, bildHoehe),
          }}
          onPointerDown={zeigerRunter}
          onPointerMove={zeigerBewegt}
          onPointerUp={zeigerHoch}
          onPointerCancel={zeigerHoch}
        />
      </div>

      <p className="text-center text-[1rem] text-gedaempft">
        {t("zuschnitt.masse", {
          breite: zahl(ausschnitt.breite),
          hoehe: zahl(ausschnitt.hoehe),
        })}
      </p>

      {/* --- Verschieben und Größe ----------------------------------------- */}
      <div className="flex flex-wrap items-start justify-center gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-center text-[1.1rem] font-semibold">{t("zuschnitt.schieben")}</h3>
          <div className="grid w-[220px] grid-cols-3 gap-2">
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

        <div className="flex flex-col gap-2">
          <h3 className="text-center text-[1.1rem] font-semibold">{t("zuschnitt.groesse")}</h3>
          <div className="flex gap-2">
            <Knopf art="neben" klein onClick={() => onAendern(groesseAendern(ausschnitt, 0.85, bildBreite, bildHoehe))}>
              {t("zuschnitt.kleiner")}
            </Knopf>
            <Knopf art="neben" klein onClick={() => onAendern(groesseAendern(ausschnitt, 1 / 0.85, bildBreite, bildHoehe))}>
              {t("zuschnitt.groesser")}
            </Knopf>
          </div>
        </div>
      </div>
    </div>
  );
}
