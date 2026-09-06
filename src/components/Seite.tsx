import type { ReactNode } from "react";

/**
 * Einheitliches Seitengeruest: grosse Ueberschrift, ein erklaerender Satz,
 * darunter der Inhalt. Ganz unten die Fusszeile mit genau einer Hauptaktion.
 */
export function Seite({
  titel,
  erklaerung,
  children,
  fuss,
}: {
  titel: string;
  erklaerung?: string;
  children: ReactNode;
  fuss?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6">
      <header>
        <h1 className="text-[1.9rem] font-bold leading-tight">{titel}</h1>
        {erklaerung ? (
          <p className="mt-2 max-w-[60ch] text-[1.05rem] text-gedaempft">{erklaerung}</p>
        ) : null}
      </header>

      <div className="flex-1">{children}</div>

      {fuss ? (
        <footer className="sticky bottom-0 -mx-4 border-t-2 border-linie bg-papier px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">{fuss}</div>
        </footer>
      ) : null}
    </div>
  );
}
