"use client";

import type { ReactNode } from "react";

/**
 * Vier Arbeitsbereiche nebeneinander, alle immer sichtbar.
 *
 * Der Editor hatte alles untereinander in einer langen Spalte: Werkzeuge,
 * Farben, Regler, Motive, frühere Stände. Wer etwas suchte, musste scrollen
 * und dabei den Überblick behalten – das ist genau das, was einer Nutzerin
 * ohne Computererfahrung schwerfällt.
 *
 * Jetzt steht oben eine Reihe aus vier beschrifteten Knöpfen, und darunter
 * erscheint nur das, was zum angetippten Knopf gehört. Das ist kein
 * verstecktes Menü: alle vier Möglichkeiten stehen jederzeit lesbar da, ein
 * Tipp genügt zum Wechseln, und der aktive Bereich ist deutlich markiert.
 */
export type Bereich = { schluessel: string; titel: string };

export function Bereichswahl({
  bereiche,
  gewaehlt,
  onWaehlen,
  children,
}: {
  bereiche: Bereich[];
  gewaehlt: string;
  onWaehlen: (schluessel: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Zwei Spalten, nicht vier: „Zapamiętane" passt sonst nicht in den
          Knopf, und abgeschnittene Wörter sind schlimmer als eine Zeile mehr. */}
      <div role="tablist" className="grid shrink-0 grid-cols-2 gap-2">
        {bereiche.map((bereich) => {
          const ist = bereich.schluessel === gewaehlt;
          return (
            <button
              key={bereich.schluessel}
              type="button"
              role="tab"
              aria-selected={ist}
              onClick={() => onWaehlen(bereich.schluessel)}
              className={`flex min-h-[56px] items-center justify-center rounded-xl border-2 px-2 text-center text-[1rem] font-bold leading-tight ${
                ist
                  ? "border-hauptaktion bg-hauptaktion text-white"
                  : "border-linie bg-white text-tinte hover:bg-hinweis"
              }`}
            >
              {bereich.titel}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">{children}</div>
    </div>
  );
}
