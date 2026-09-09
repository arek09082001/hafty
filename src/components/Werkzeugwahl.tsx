"use client";

import { useSprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

export type Werkzeug = "motiv" | "flaeche" | "rechteck" | "freihand" | "malen";

/**
 * Was ein Tipp ins Muster bewirkt.
 *
 * Das ist die eine Frage, die vorher niemand beantwortet hat. Ein Tipp konnte
 * nur auswählen; gefärbt wurde erst über einen Knopf in der Seitenspalte,
 * nachdem man in einem anderen Reiter eine Farbe geholt hatte. Jetzt steht
 * beides offen nebeneinander: **Färben** ist voreingestellt und macht aus
 * jedem Tipp sofort Farbe, **Auswählen** ist der zweite Weg für alles, was
 * mit einer Auswahl geschieht – freistellen, kopieren, als Motiv merken.
 */
export type Tippmodus = "faerben" | "auswaehlen";

/**
 * Die Werkzeuge stehen alle nebeneinander sichtbar da – keine Auswahlliste,
 * kein Menü. Jedes hat einen Namen in ganzen Worten und darunter einen Satz,
 * der sagt, was beim Antippen des Rasters passiert.
 *
 * Der Name nennt nur noch die **Form** („Ganzes Motiv", „Rechteck"). Ob damit
 * gefärbt oder ausgewählt wird, sagt der Modus darüber – sonst stünde in
 * jedem Namen zweimal dasselbe. Der erklärende Satz wechselt dagegen mit dem
 * Modus, denn was beim Tippen wirklich geschieht, muss dastehen.
 *
 * „Ganzes Motiv" steht bewusst an erster Stelle und ist voreingestellt: ein
 * Tipp auf die Blume, und die ganze Blume ist gefärbt. Darunter folgt
 * „Gleiche Fläche", das nur Felder derselben Farbe nimmt – genauer, aber eben
 * nur ein Blütenblatt auf einmal.
 */
export const WERKZEUGE = [
  {
    art: "motiv",
    titel: "werkzeug.motiv",
    faerben: "werkzeug.motivFaerben",
    auswaehlen: "werkzeug.motivText",
  },
  {
    art: "flaeche",
    titel: "werkzeug.flaeche",
    faerben: "werkzeug.flaecheFaerben",
    auswaehlen: "werkzeug.flaecheText",
  },
  {
    art: "rechteck",
    titel: "werkzeug.rechteck",
    faerben: "werkzeug.rechteckFaerben",
    auswaehlen: "werkzeug.rechteckText",
  },
  {
    art: "freihand",
    titel: "werkzeug.freihand",
    faerben: "werkzeug.freihandFaerben",
    auswaehlen: "werkzeug.freihandText",
  },
  {
    /** Der Pinsel färbt von Natur aus – zum Auswählen gibt es „Freihand". */
    art: "malen",
    titel: "werkzeug.malen",
    faerben: "werkzeug.malenText",
    auswaehlen: null,
  },
] as const satisfies ReadonlyArray<{
  art: Werkzeug;
  titel: Textschluessel;
  faerben: Textschluessel;
  auswaehlen: Textschluessel | null;
}>;

/** Die Werkzeuge, die in diesem Modus überhaupt etwas tun können. */
export function werkzeugeFuer(modus: Tippmodus) {
  return WERKZEUGE.filter((w) => (modus === "faerben" ? w.faerben : w.auswaehlen) !== null);
}

/**
 * Die Frage über allem: Was passiert, wenn ich ins Muster tippe?
 *
 * Zwei Knöpfe nebeneinander, beide beschriftet, der aktive kräftig markiert.
 * Kein Schalter und kein Menü – man soll die beiden Möglichkeiten gleichzeitig
 * sehen und nicht erst aufklappen müssen.
 */
export function Tippmoduswahl({
  modus,
  onWaehlen,
}: {
  modus: Tippmodus;
  onWaehlen: (m: Tippmodus) => void;
}) {
  const { t } = useSprache();
  const moeglichkeiten: Array<{ art: Tippmodus; titel: Textschluessel }> = [
    { art: "faerben", titel: "tippmodus.faerben" },
    { art: "auswaehlen", titel: "tippmodus.auswaehlen" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {moeglichkeiten.map((m) => {
        const ist = m.art === modus;
        return (
          <button
            key={m.art}
            type="button"
            onClick={() => onWaehlen(m.art)}
            aria-pressed={ist}
            className={`min-h-[56px] rounded-xl border-2 px-3 py-2 text-[1.05rem] font-bold ${
              ist
                ? "border-hauptaktion bg-hauptaktion text-white"
                : "border-tinte bg-white text-tinte hover:bg-hinweis"
            }`}
          >
            {t(m.titel)}
          </button>
        );
      })}
    </div>
  );
}

export function Werkzeugwahl({
  modus,
  gewaehlt,
  onWaehlen,
}: {
  modus: Tippmodus;
  gewaehlt: Werkzeug;
  onWaehlen: (w: Werkzeug) => void;
}) {
  const { t } = useSprache();
  const liste = werkzeugeFuer(modus);
  const aktuell = liste.find((w) => w.art === gewaehlt);
  const erklaerung = aktuell ? (modus === "faerben" ? aktuell.faerben : aktuell.auswaehlen) : null;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {liste.map((werkzeug) => {
          const ist = werkzeug.art === gewaehlt;
          return (
            <li key={werkzeug.art}>
              <button
                type="button"
                onClick={() => onWaehlen(werkzeug.art)}
                aria-pressed={ist}
                className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[1.05rem] font-semibold ${
                  ist
                    ? "border-hauptaktion bg-gewaehlt hover:bg-gewaehlt-tief"
                    : "border-linie bg-white hover:bg-hinweis"
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
      {erklaerung ? <p className="text-[1rem] text-gedaempft">{t(erklaerung)}</p> : null}
    </div>
  );
}
