"use client";

import type { ReactNode } from "react";
import { useSprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

export type Werkzeug =
  | "schieben"
  | "motiv"
  | "flaeche"
  | "rechteck"
  | "freihand"
  | "malen"
  | "fuellen";

export type Werkzeuggruppe = "ansehen" | "auswaehlen" | "malen";

/**
 * Die Werkzeuge stehen als Schiene direkt neben der Leinwand.
 * ---------------------------------------------------------------------------
 *
 * Vorher waren sie eine Liste ganzer Sätze im Reiter „Werkzeug": sieben Zeilen
 * Text, die den halben Bedienbereich füllten – und sobald man auf „Farbe"
 * wechselte, war nicht mehr zu sehen, womit man eigentlich gerade arbeitet.
 *
 * Jetzt gilt:
 *
 *  - **Immer sichtbar.** Die Schiene hängt an der Leinwand und wechselt nie
 *    weg. Ein Blick genügt, um zu sehen, was ein Tipp ins Muster tut.
 *  - **Sinnbild und kurzes Wort.** Beides zusammen, nie nur ein Bildchen:
 *    ein Symbol allein ist geraten, ein Wort allein liest sich langsamer.
 *  - **In drei Gruppen.** Ansehen, Auswählen, Malen. Die Überschriften sagen,
 *    wozu die Werkzeuge darunter gut sind – das ist die Frage, die man beim
 *    ersten Mal hat.
 *
 * Der ganze Satz zum gewählten Werkzeug steht in der Bedienspalte rechts, wo
 * auch die Knöpfe dazu stehen. Hier bleibt es kurz.
 */
export const WERKZEUGE = [
  {
    art: "schieben",
    gruppe: "ansehen",
    kurz: "werkzeug.schiebenKurz",
    titel: "werkzeug.schieben",
    erklaerung: "werkzeug.schiebenText",
  },
  {
    art: "motiv",
    gruppe: "auswaehlen",
    kurz: "werkzeug.motivKurz",
    titel: "werkzeug.motiv",
    erklaerung: "werkzeug.motivText",
  },
  {
    art: "flaeche",
    gruppe: "auswaehlen",
    kurz: "werkzeug.flaecheKurz",
    titel: "werkzeug.flaeche",
    erklaerung: "werkzeug.flaecheText",
  },
  {
    art: "rechteck",
    gruppe: "auswaehlen",
    kurz: "werkzeug.rechteckKurz",
    titel: "werkzeug.rechteck",
    erklaerung: "werkzeug.rechteckText",
  },
  {
    art: "freihand",
    gruppe: "auswaehlen",
    kurz: "werkzeug.freihandKurz",
    titel: "werkzeug.freihand",
    erklaerung: "werkzeug.freihandText",
  },
  {
    art: "malen",
    gruppe: "malen",
    kurz: "werkzeug.malenKurz",
    titel: "werkzeug.malen",
    erklaerung: "werkzeug.malenText",
  },
  {
    art: "fuellen",
    gruppe: "malen",
    kurz: "werkzeug.fuellenKurz",
    titel: "werkzeug.fuellen",
    erklaerung: "werkzeug.fuellenText",
  },
] as const satisfies ReadonlyArray<{
  art: Werkzeug;
  gruppe: Werkzeuggruppe;
  kurz: Textschluessel;
  titel: Textschluessel;
  erklaerung: Textschluessel;
}>;

const GRUPPEN = [
  { art: "ansehen", titel: "werkzeuggruppe.ansehen" },
  { art: "auswaehlen", titel: "werkzeuggruppe.auswaehlen" },
  { art: "malen", titel: "werkzeuggruppe.malen" },
] as const satisfies ReadonlyArray<{ art: Werkzeuggruppe; titel: Textschluessel }>;

/** Welche Werkzeuge wählen etwas aus? Danach richtet sich die Bedienspalte. */
export function waehltAus(werkzeug: Werkzeug): boolean {
  return (
    werkzeug === "motiv" ||
    werkzeug === "flaeche" ||
    werkzeug === "rechteck" ||
    werkzeug === "freihand"
  );
}

/** Welche Werkzeuge tragen Farbe auf? Dann gehört die Farbwahl daneben. */
export function maltMitFarbe(werkzeug: Werkzeug): boolean {
  return werkzeug === "malen" || werkzeug === "fuellen";
}

export function werkzeugFinden(art: Werkzeug) {
  return WERKZEUGE.find((w) => w.art === art) ?? WERKZEUGE[0];
}

export function Werkzeugleiste({
  gewaehlt,
  onWaehlen,
}: {
  gewaehlt: Werkzeug;
  onWaehlen: (w: Werkzeug) => void;
}) {
  const { t } = useSprache();

  return (
    <div
      role="toolbar"
      aria-label={t("werkzeug.frage")}
      aria-orientation="vertical"
      className="flex shrink-0 items-stretch gap-1 overflow-x-auto border-b border-linie bg-white px-2 py-1.5 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-1.5 lg:py-2"
    >
      {GRUPPEN.map((gruppe) => (
        <div key={gruppe.art} className="flex items-stretch gap-1 lg:flex-col">
          <p className="hidden px-1 pt-2 pb-1 text-[0.7rem] font-bold tracking-wide text-gedaempft uppercase lg:block">
            {t(gruppe.titel)}
          </p>
          {WERKZEUGE.filter((w) => w.gruppe === gruppe.art).map((werkzeug) => {
            const ist = werkzeug.art === gewaehlt;
            return (
              <button
                key={werkzeug.art}
                type="button"
                onClick={() => onWaehlen(werkzeug.art)}
                aria-pressed={ist}
                title={t(werkzeug.titel)}
                className={`flex w-[82px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-[0.75rem] font-semibold ${
                  ist
                    ? "border-hauptaktion bg-gewaehlt text-hauptaktion hover:bg-gewaehlt-tief"
                    : "border-linie bg-white text-tinte hover:bg-hinweis"
                }`}
              >
                <Sinnbild art={werkzeug.art} />
                <span className="text-center leading-tight break-words">{t(werkzeug.kurz)}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * Die Sinnbilder. Bewusst mit dünnem Strich und ohne Füllung: sie sollen die
 * Beschriftung stützen und nicht mit den Farben des Musters streiten.
 */
function Sinnbild({ art }: { art: Werkzeug }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {STRICHE[art]}
    </svg>
  );
}

const STRICHE: Record<Werkzeug, ReactNode> = {
  // Vier Pfeile: in jede Richtung schieben.
  schieben: (
    <>
      <path d="M12 3.5v17M3.5 12h17" />
      <path d="M9.6 5.9 12 3.5l2.4 2.4M9.6 18.1 12 20.5l2.4-2.4M5.9 9.6 3.5 12l2.4 2.4M18.1 9.6 20.5 12l-2.4 2.4" />
    </>
  ),
  // Zauberstab mit Funken: ein Tipp erfasst das ganze Motiv.
  motiv: (
    <>
      <path d="M3.5 20.5 13 11" />
      <path d="m16.5 3.5 1.1 2.6 2.9 1.1-2.9 1.1-1.1 2.7-1.1-2.7L12.5 7.2l2.9-1.1z" />
      <path d="M6 4v2.6M4.7 5.3h2.6" />
    </>
  ),
  // Eine zusammenhängende Fläche mit ihrer Grenze.
  flaeche: (
    <>
      <path d="M4.2 9.3c.4-3 3.2-5 6-4.4 2.4.5 3 2.6 5.6 2.9 2.3.2 4 1.6 3.9 3.7-.1 2.2-2.3 2.8-3.3 4.6-1.1 2-2.2 3.8-4.7 3.6-3-.2-8.2-5.4-7.5-10.4Z" />
      <path d="M9.5 9.6c1.6-.4 3 .4 3.4 1.9" />
    </>
  ),
  rechteck: <rect x="3.5" y="5.5" width="17" height="13" rx="1.2" strokeDasharray="3 2.6" />,
  // Lasso mit Schlaufe.
  freihand: (
    <>
      <ellipse cx="12" cy="9.6" rx="8.2" ry="5.6" />
      <path d="M8.6 14.7c-1.1 1.4-1.4 3.2-.6 4.5" />
      <circle cx="8.6" cy="20.4" r="1.4" />
    </>
  ),
  // Stift.
  malen: (
    <>
      <path d="m3.5 20.5 1.1-4.1L16.2 4.8a2.1 2.1 0 0 1 3 3L7.6 19.4z" />
      <path d="m14.4 6.6 3 3" />
    </>
  ),
  // Farbeimer mit Tropfen.
  fuellen: (
    <>
      <path d="M10.4 3.2 3.9 9.7a1.6 1.6 0 0 0 0 2.2l5.7 5.7a1.6 1.6 0 0 0 2.2 0l6.5-6.5z" />
      <path d="M7.4 6.2 12 10.8" />
      <path d="M20.4 15.4c0 1-.8 1.8-1.8 1.8s-1.8-.8-1.8-1.8 1.8-3.6 1.8-3.6 1.8 2.6 1.8 3.6Z" />
    </>
  ),
};
