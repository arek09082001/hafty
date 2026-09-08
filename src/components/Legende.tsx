"use client";

import { istDunkel, hexNachRgb } from "@/lib/farbe/lab";
import { garnname } from "@/lib/farbe/farbwort";
import type { PalettenEintrag } from "@/lib/muster/typen";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Die Legende: welches Symbol steht für welches Garn, und wie oft kommt es
 * vor. Sie ist gleichzeitig die Farbauswahl im Editor – deshalb kann jeder
 * Eintrag angetippt werden, wenn `onWaehlen` gesetzt ist.
 */
export function Legende({
  palette,
  gewaehlt,
  onWaehlen,
  onGarnAendern,
}: {
  palette: PalettenEintrag[];
  gewaehlt?: number | null;
  onWaehlen?: (index: number) => void;
  onGarnAendern?: (index: number) => void;
}) {
  const { t, zahl } = useSprache();

  return (
    <ul className="flex flex-col gap-2">
      {palette.map((eintrag) => {
        const rgb = hexNachRgb(eintrag.hex);
        const istGewaehlt = gewaehlt === eintrag.index;

        const inhalt = (
          <>
            <span
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-tinte text-[1.15rem] font-bold"
              style={{
                backgroundColor: eintrag.hex,
                color: istDunkel(rgb[0], rgb[1], rgb[2]) ? "#ffffff" : "#000000",
              }}
            >
              {eintrag.symbol}
            </span>
            <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
              <span className="text-[1.05rem] font-semibold">
                {eintrag.garn ? `${eintrag.garn.marke} ${eintrag.garn.code}` : t("legende.eigeneFarbe")}
              </span>
              <span className="truncate text-[0.95rem] text-gedaempft">
                {eintrag.garn ? garnname(eintrag.garn.name, eintrag.garn.hex, t) : eintrag.hex}
              </span>
            </span>
            <span className="shrink-0 text-right text-[1rem]">
              {zahl(eintrag.stiche)}
              <span className="block text-[0.85rem] text-gedaempft">{t("legende.stiche")}</span>
            </span>
          </>
        );

        return (
          <li key={eintrag.index} className="flex items-stretch gap-2">
            {onWaehlen ? (
              <button
                type="button"
                onClick={() => onWaehlen(eintrag.index)}
                aria-pressed={istGewaehlt}
                className={`flex min-h-[56px] flex-1 items-center gap-3 rounded-xl border-2 px-3 py-2 ${
                  istGewaehlt
                    ? "border-hauptaktion bg-[#e8f3ee]"
                    : "border-linie bg-white hover:bg-hinweis"
                }`}
              >
                {inhalt}
              </button>
            ) : (
              <div className="flex min-h-[56px] flex-1 items-center gap-3 rounded-xl border-2 border-linie bg-white px-3 py-2">
                {inhalt}
              </div>
            )}
            {onGarnAendern ? (
              <button
                type="button"
                onClick={() => onGarnAendern(eintrag.index)}
                className="min-h-[56px] shrink-0 rounded-xl border-2 border-linie bg-white px-3 text-[0.95rem] font-semibold underline hover:bg-hinweis"
              >
                {t("legende.anderesGarn")}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
