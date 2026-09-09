"use client";

import { SPRACHEN, SPRACHNAMEN, useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Die Sprachwahl: zwei Knöpfe nebeneinander, jeder in seiner eigenen Sprache
 * beschriftet. Kein Menü und keine Flagge – „Deutsch" und „Polski" liest
 * jede der beiden Nutzerinnen sofort.
 *
 * In der flachen Fortschrittsleiste steht die kleine Fassung: dieselben zwei
 * Knöpfe, nur niedriger. Sie sind dort nichts, was man im Arbeiten braucht –
 * einmal gewählt, bleibt die Sprache.
 */
export function Sprachwahl({ klein = false }: { klein?: boolean }) {
  const { sprache, spracheSetzen } = useSprache();

  return (
    <div className="flex items-center gap-1 rounded-xl border-2 border-linie p-0.5">
      {SPRACHEN.map((s) => {
        const ist = s === sprache;
        return (
          <button
            key={s}
            type="button"
            lang={s}
            onClick={() => spracheSetzen(s)}
            aria-pressed={ist}
            className={`flex items-center rounded-lg px-3 font-bold ${
              klein ? "min-h-[38px] text-[0.85rem]" : "min-h-[46px] text-[0.95rem]"
            } ${
              ist
                ? "bg-hauptaktion text-white hover:bg-hauptaktion-hell"
                : "bg-white text-tinte hover:bg-hinweis"
            }`}
          >
            {SPRACHNAMEN[s]}
          </button>
        );
      })}
    </div>
  );
}
