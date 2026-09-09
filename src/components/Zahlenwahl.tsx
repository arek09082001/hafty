"use client";

import { Knopf } from "./Knopf";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Eine Zahl einstellen – mit zwei großen Knöpfen statt eines Drehfeldes.
 * Ein Zahleneingabefeld mit winzigen Pfeilen ist auf einem Tablet nicht zu
 * treffen; „Weniger" und „Mehr" sind es immer.
 *
 * `schritt` darf auch eine Funktion sein. Das wird bei einem weiten Bereich
 * gebraucht: bei der Farbanzahl reicht unten die feine Stufe, oben käme man
 * damit nie an. Beim Zurückgehen zählt die Stufe des **Zielbereichs** – sonst
 * landete „Weniger" nach „Mehr" nicht wieder auf demselben Wert.
 */
export function Zahlenwahl({
  beschriftung,
  wert,
  min,
  max,
  schritt = 1,
  einheit,
  onAendern,
  hinweis,
}: {
  beschriftung: string;
  wert: number;
  min: number;
  max: number;
  schritt?: number | ((wert: number) => number);
  einheit: string;
  onAendern: (neu: number) => void;
  hinweis?: string;
}) {
  const { t } = useSprache();
  const begrenzen = (v: number) => Math.max(min, Math.min(max, v));
  const stufe = (v: number) => (typeof schritt === "function" ? schritt(v) : schritt);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[1.2rem] font-semibold">{beschriftung}</span>
      <div className="flex flex-wrap items-center gap-4">
        <Knopf
          art="neben"
          onClick={() => onAendern(begrenzen(wert - stufe(wert - 1)))}
          disabled={wert <= min}
          aria-label={t("einst.wenigerVon", { was: beschriftung })}
        >
          {t("einst.weniger")}
        </Knopf>
        <output className="min-w-[190px] rounded-xl border-2 border-tinte bg-white px-5 py-3 text-center text-[1.5rem] font-bold">
          {wert} {einheit}
        </output>
        <Knopf
          art="neben"
          onClick={() => onAendern(begrenzen(wert + stufe(wert)))}
          disabled={wert >= max}
          aria-label={t("einst.mehrVon", { was: beschriftung })}
        >
          {t("einst.mehr")}
        </Knopf>
      </div>
      {hinweis ? <p className="max-w-[60ch] text-[1rem] text-gedaempft">{hinweis}</p> : null}
    </div>
  );
}
