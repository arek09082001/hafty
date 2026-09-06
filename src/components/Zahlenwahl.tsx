"use client";

import { Knopf } from "./Knopf";

/**
 * Eine Zahl einstellen – mit zwei großen Knöpfen statt eines Drehfeldes.
 * Ein Zahleneingabefeld mit winzigen Pfeilen ist auf einem Tablet nicht zu
 * treffen; „Weniger" und „Mehr" sind es immer.
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
  schritt?: number;
  einheit: string;
  onAendern: (neu: number) => void;
  hinweis?: string;
}) {
  const begrenzen = (v: number) => Math.max(min, Math.min(max, v));

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[1.2rem] font-semibold">{beschriftung}</span>
      <div className="flex flex-wrap items-center gap-4">
        <Knopf
          art="neben"
          onClick={() => onAendern(begrenzen(wert - schritt))}
          disabled={wert <= min}
          aria-label={`${beschriftung}: weniger`}
        >
          Weniger
        </Knopf>
        <output className="min-w-[190px] rounded-xl border-2 border-tinte bg-white px-5 py-3 text-center text-[1.5rem] font-bold">
          {wert} {einheit}
        </output>
        <Knopf
          art="neben"
          onClick={() => onAendern(begrenzen(wert + schritt))}
          disabled={wert >= max}
          aria-label={`${beschriftung}: mehr`}
        >
          Mehr
        </Knopf>
      </div>
      {hinweis ? <p className="max-w-[60ch] text-[1rem] text-gedaempft">{hinweis}</p> : null}
    </div>
  );
}
