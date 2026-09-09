"use client";

import { istDunkel, hexNachRgb } from "@/lib/farbe/lab";
import { garnname } from "@/lib/farbe/farbwort";
import type { PalettenEintrag } from "@/lib/muster/typen";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Die Farbleiste – der Farbkasten neben dem Blatt.
 * ---------------------------------------------------------------------------
 *
 * Vorher lagen die Farben allein hinter dem Reiter „Farbe". Wer eine Fläche
 * einfärben wollte, musste dorthin wechseln, eine Farbe antippen, zurück zum
 * Reiter „Werkzeug", dort etwas auswählen und zuletzt noch „Auswahl färben"
 * drücken. Vier Wege für einen Handgriff, und dazwischen sah man das Muster
 * nicht einmal.
 *
 * Jetzt liegen die Farben da, wo gearbeitet wird: unmittelbar über der
 * Arbeitsfläche, immer sichtbar, in jedem Reiter. Ein Tipp wechselt die
 * Farbe, der nächste Tipp ins Muster färbt damit – so wie man einen Pinsel
 * in einen Farbtopf tunkt und weitermalt.
 *
 * Welche Farbe gewählt ist, steht zusätzlich in Worten darüber. Ein dicker
 * Rahmen allein wäre zu wenig: wer Farben schlecht unterscheidet, soll den
 * Namen lesen können.
 */
export function Farbleiste({
  palette,
  gewaehlt,
  onWaehlen,
}: {
  palette: PalettenEintrag[];
  gewaehlt: number;
  onWaehlen: (index: number) => void;
}) {
  const { t } = useSprache();
  if (palette.length === 0) return null;

  const aktuell = palette.find((e) => e.index === gewaehlt) ?? palette[0];
  const name = (eintrag: PalettenEintrag) =>
    eintrag.garn
      ? `${eintrag.garn.marke} ${eintrag.garn.code} · ${garnname(eintrag.garn.name, eintrag.garn.hex, t)}`
      : eintrag.hex;

  return (
    <div className="shrink-0 px-6 pb-3">
      <p className="text-[1rem] text-gedaempft">
        {t("farbleiste.titel")} <span className="font-bold text-tinte">{name(aktuell)}</span>
      </p>
      {/* Waagerecht rollbar: bei zwanzig Garnen passt nicht alles nebeneinander,
          und die Leiste darf der Arbeitsfläche keine zweite Zeile wegnehmen. */}
      <ul className="mt-2 flex gap-2 overflow-x-auto pt-1 pb-2">
        {palette.map((eintrag) => {
          const rgb = hexNachRgb(eintrag.hex);
          const ist = eintrag.index === aktuell.index;
          return (
            <li key={eintrag.index} className="shrink-0">
              <button
                type="button"
                onClick={() => onWaehlen(eintrag.index)}
                aria-pressed={ist}
                aria-label={name(eintrag)}
                title={name(eintrag)}
                className={`flex h-[56px] w-[56px] items-center justify-center rounded-lg text-[1.2rem] font-bold ${
                  ist
                    ? "border-[4px] border-hauptaktion shadow-[0_0_0_3px_var(--color-gewaehlt)]"
                    : "border-2 border-linie hover:border-tinte hover:shadow-[0_0_0_3px_var(--color-gewaehlt)]"
                }`}
                style={{
                  backgroundColor: eintrag.hex,
                  color: istDunkel(rgb[0], rgb[1], rgb[2]) ? "#ffffff" : "#000000",
                }}
              >
                <span aria-hidden>{eintrag.symbol}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
