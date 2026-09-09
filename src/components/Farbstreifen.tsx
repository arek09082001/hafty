"use client";

import { garnname } from "@/lib/farbe/farbwort";
import { hexNachRgb, istDunkel } from "@/lib/farbe/lab";
import { useSprache } from "@/lib/sprache/SprachProvider";
import type { PalettenEintrag } from "@/lib/muster/typen";

/**
 * Die Farbwahl zum Malen: alle Garne als Kacheln nebeneinander.
 *
 * Die ausführliche Liste steht im Reiter „Garne" – mit Marke, Nummer und
 * Verbrauch. Beim Malen ist das im Weg: dort will man die Farbe sehen und
 * antippen, und zwar ohne den Reiter zu wechseln. Deshalb steht die Wahl
 * beim Pinsel und beim Farbeimer direkt daneben.
 *
 * Auf jeder Kachel steht das Symbol der Farbe. Das ist dasselbe Zeichen wie
 * im Ausdruck und in der Legende, und es unterscheidet zwei Kacheln auch
 * dann, wenn ihre Farben nah beieinanderliegen.
 */
export function Farbstreifen({
  palette,
  gewaehlt,
  onWaehlen,
}: {
  palette: PalettenEintrag[];
  gewaehlt: number;
  onWaehlen: (index: number) => void;
}) {
  const { t } = useSprache();

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-2">
      {palette.map((eintrag) => {
        const rgb = hexNachRgb(eintrag.hex);
        const ist = eintrag.index === gewaehlt;
        const name = eintrag.garn
          ? `${eintrag.garn.marke} ${eintrag.garn.code} – ${garnname(eintrag.garn.name, eintrag.garn.hex, t)}`
          : t("legende.eigeneFarbe");

        return (
          <li key={eintrag.index}>
            <button
              type="button"
              onClick={() => onWaehlen(eintrag.index)}
              aria-pressed={ist}
              aria-label={name}
              title={name}
              className={`flex h-[56px] w-full items-center justify-center rounded-lg text-[1.05rem] font-bold ${
                ist ? "ring-4 ring-hauptaktion" : "hover:ring-2 hover:ring-tinte"
              }`}
              style={{
                backgroundColor: eintrag.hex,
                color: istDunkel(rgb[0], rgb[1], rgb[2]) ? "#ffffff" : "#000000",
                border: "1px solid rgba(0,0,0,0.45)",
              }}
            >
              {eintrag.symbol}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
