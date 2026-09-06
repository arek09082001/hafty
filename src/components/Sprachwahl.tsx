"use client";

import { SPRACHEN, SPRACHNAMEN, useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Die Sprachwahl: zwei Knöpfe nebeneinander, jeder in seiner eigenen Sprache
 * beschriftet. Kein Menü und keine Flagge – „Deutsch" und „Polski" liest
 * jede der beiden Nutzerinnen sofort.
 */
export function Sprachwahl() {
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
            className={`flex min-h-[46px] items-center rounded-lg px-3 text-[0.95rem] font-bold ${
              ist ? "bg-hauptaktion text-white" : "bg-white text-tinte hover:bg-hinweis"
            }`}
          >
            {SPRACHNAMEN[s]}
          </button>
        );
      })}
    </div>
  );
}
