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
 *
 * Die Werkzeuge selbst stehen seit dem Umbau nicht mehr in einem der Reiter,
 * sondern als Schiene an der Leinwand: was man ständig braucht, darf nicht
 * hinter einem Reiter liegen. Die Reiter tragen, was zum Werkzeug gehört.
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
  const leiste = useRef<HTMLDivElement>(null);
  /** Der erste Durchlauf ist keine Wahl der Nutzerin – da wird nicht gescrollt. */
  const ersterLauf = useRef(true);

  // Beim Wechsel des Bereichs oben anfangen. Sonst zeigt der neue Bereich
  // dort, wo der vorige gerade stand – wer von einem langen Werkzeugbereich
  // auf „Farbe" tippt, landete mitten in der Garnliste und sah die
  // Überschrift nicht mehr.
  //
  // Auf einem schmalen Fenster kommt das Zweite dazu: dort liegt die
  // Bedienspalte unter der Leinwand, und der angetippte Reiter blieb weit
  // unterhalb des Sichtfelds. Wer auf „Muster" tippte, sah nichts von den
  // Reglern und musste erst an der halben Seite vorbeiwischen. Deshalb rückt
  // die Reiterzeile nach dem Tippen an den oberen Rand – auf breiten Fenstern
  // steht sie ohnehin schon dort und es passiert nichts.
  useEffect(() => {
    inhalt.current?.scrollTo({ top: 0 });
    if (ersterLauf.current) {
      ersterLauf.current = false;
      return;
    }
    leiste.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [gewaehlt]);

  return (
    <div className="flex flex-col lg:min-h-0 lg:flex-1">
      <div
        ref={leiste}
        role="tablist"
        className="flex shrink-0 items-stretch border-b border-linie"
      >
        {bereiche.map((bereich) => {
          const ist = bereich.schluessel === gewaehlt;
          return (
            <button
              key={bereich.schluessel}
              type="button"
              role="tab"
              aria-selected={ist}
              onClick={() => onWaehlen(bereich.schluessel)}
              className={`min-h-[56px] min-w-0 flex-1 border-b-[4px] px-1 text-[0.92rem] font-bold whitespace-nowrap ${
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

      {/* Breit rollt der Inhalt in sich; schmal wächst er einfach und die
          Seite darum rollt. Zwei ineinandergeschachtelte Rollbereiche wären
          auf dem Telefon ohnehin nicht zu bedienen. */}
      <div ref={inhalt} className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
