"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Vier Arbeitsbereiche als Reiter über der Bedienspalte.
 *
 * Der Editor hatte alles untereinander in einer langen Spalte: Werkzeuge,
 * Farben, Regler, Motive, frühere Stände. Wer etwas suchte, musste scrollen
 * und dabei den Überblick behalten – das ist genau das, was einer Nutzerin
 * ohne Computererfahrung schwerfällt.
 *
 * Es sind ausdrücklich **Reiter** und kein Menü: alle vier stehen jederzeit
 * beschriftet nebeneinander, ein Tipp genügt zum Wechseln, und der offene
 * Reiter ist durch einen kräftigen Strich darunter markiert.
 *
 * Vorher waren es vier große Blöcke in zwei Reihen, der offene davon grün
 * gefüllt. Das sah aus wie vier Hauptaktionen und stritt mit dem grünen Knopf
 * unten, der wirklich eine ist. Jetzt tragen die Reiter nur Schrift und einen
 * Strich – Farbe bleibt dem vorbehalten, was etwas auslöst.
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
  const inhalt = useRef<HTMLDivElement>(null);

  // Beim Wechsel des Bereichs oben anfangen. Sonst zeigt der neue Bereich
  // dort, wo der vorige gerade stand – wer von einem langen Werkzeugbereich
  // auf „Farbe" tippt, landete mitten in der Garnliste und sah die
  // Überschrift nicht mehr.
  useEffect(() => {
    inhalt.current?.scrollTo({ top: 0 });
  }, [gewaehlt]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" className="flex shrink-0 border-b border-linie">
        {bereiche.map((bereich) => {
          const ist = bereich.schluessel === gewaehlt;
          return (
            <button
              key={bereich.schluessel}
              type="button"
              role="tab"
              aria-selected={ist}
              onClick={() => onWaehlen(bereich.schluessel)}
              className={`min-h-[56px] flex-1 border-b-[4px] px-2 text-[1rem] font-bold leading-tight ${
                ist
                  ? "border-hauptaktion text-hauptaktion hover:bg-gewaehlt"
                  : "border-transparent text-gedaempft hover:bg-hinweis hover:text-tinte"
              }`}
            >
              {bereich.titel}
            </button>
          );
        })}
      </div>

      <div ref={inhalt} className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
