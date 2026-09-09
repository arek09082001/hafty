import type { ReactNode } from "react";

/**
 * Ein Abschnitt in der Bedienspalte.
 * ---------------------------------------------------------------------------
 *
 * Die Oberfläche bestand aus lauter Karten: weißer Grund, 2px-Rahmen,
 * abgerundete Ecken, 20px Innenabstand – und darin oft noch eine Karte. Bei
 * fünf Karten untereinander sieht man nur noch Rahmen und keinen
 * Zusammenhang mehr.
 *
 * Stattdessen jetzt: **eine** Fläche, und die Abschnitte darauf werden durch
 * eine Haarlinie getrennt. Der erste Abschnitt bekommt keine Linie – oben
 * schließt die Fläche selbst ab. Das ist dieselbe Ordnung, die ein
 * gedrucktes Formular benutzt, und sie kommt ohne einen einzigen Rahmen aus.
 *
 * Ränder gibt es in dieser App ab jetzt nur noch um Dinge, die man anfassen
 * kann: Knöpfe, Felder, Listeneinträge.
 */
export function Abschnitt({
  titel,
  hinweis,
  children,
  className = "",
}: {
  /** Überschrift des Abschnitts. Ohne Titel bleibt der Abschnitt still. */
  titel?: ReactNode;
  /** Ein Satz unter der Überschrift, der sagt, was hier passiert. */
  hinweis?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-t border-linie px-5 py-4 first:border-t-0 ${className}`}>
      {titel ? <h2 className="text-[1.15rem] font-bold leading-tight">{titel}</h2> : null}
      {hinweis ? <p className="mt-1 text-[1rem] text-gedaempft">{hinweis}</p> : null}
      {children ? <div className={titel || hinweis ? "mt-3" : ""}>{children}</div> : null}
    </section>
  );
}
