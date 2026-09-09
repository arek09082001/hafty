"use client";

import { useSprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

export type Werkzeug = "motiv" | "flaeche" | "rechteck" | "freihand" | "malen" | "fuellen";

/**
 * Die Werkzeuge stehen alle nebeneinander sichtbar da – keine Auswahlliste,
 * kein Menü. Jedes hat einen Namen in ganzen Worten und darunter einen Satz,
 * der sagt, was beim Antippen des Rasters passiert.
 *
 * „Ganzes Motiv auswählen" steht bewusst an erster Stelle und ist
 * voreingestellt: ein Tipp auf die Blume, und die ganze Blume ist erfasst.
 * Darunter folgt „Gleiche Fläche", das nur Felder derselben Farbe nimmt –
 * genauer, aber eben nur ein Blütenblatt auf einmal.
 */
export const WERKZEUGE = [
  { art: "motiv", titel: "werkzeug.motiv", erklaerung: "werkzeug.motivText" },
  { art: "flaeche", titel: "werkzeug.flaeche", erklaerung: "werkzeug.flaecheText" },
  { art: "rechteck", titel: "werkzeug.rechteck", erklaerung: "werkzeug.rechteckText" },
  { art: "freihand", titel: "werkzeug.freihand", erklaerung: "werkzeug.freihandText" },
  { art: "malen", titel: "werkzeug.malen", erklaerung: "werkzeug.malenText" },
  { art: "fuellen", titel: "werkzeug.fuellen", erklaerung: "werkzeug.fuellenText" },
] as const satisfies ReadonlyArray<{
  art: Werkzeug;
  titel: Textschluessel;
  erklaerung: Textschluessel;
}>;

export function Werkzeugwahl({
  gewaehlt,
  onWaehlen,
}: {
  gewaehlt: Werkzeug;
  onWaehlen: (w: Werkzeug) => void;
}) {
  const { t } = useSprache();
  const aktuell = WERKZEUGE.find((w) => w.art === gewaehlt);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-tinte bg-white p-5">
      <h2 className="text-[1.2rem] font-bold">{t("werkzeug.frage")}</h2>
      <ul className="flex flex-col gap-2">
        {WERKZEUGE.map((werkzeug) => {
          const ist = werkzeug.art === gewaehlt;
          return (
            <li key={werkzeug.art}>
              <button
                type="button"
                onClick={() => onWaehlen(werkzeug.art)}
                aria-pressed={ist}
                className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-[1.05rem] font-semibold ${
                  ist ? "border-hauptaktion bg-[#e8f3ee]" : "border-linie bg-white hover:bg-hinweis"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                    ist ? "border-hauptaktion bg-hauptaktion" : "border-linie bg-white"
                  }`}
                >
                  {ist ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
                </span>
                {t(werkzeug.titel)}
              </button>
            </li>
          );
        })}
      </ul>
      {aktuell ? (
        <p className="rounded-xl bg-hinweis p-4 text-[1rem]">{t(aktuell.erklaerung)}</p>
      ) : null}
    </section>
  );
}
