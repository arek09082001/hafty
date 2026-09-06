import type { ReactNode } from "react";

/**
 * Einheitliches Seitengerüst: große Überschrift, ein erklärender Satz,
 * darunter der Inhalt. Ganz unten die Fußzeile mit genau einer Hauptaktion.
 *
 * `dicht` ist für die Arbeitsseiten gedacht (Muster ansehen, Drucken): dort
 * muss das Raster sofort zu sehen sein, ohne dass die Nutzerin erst scrollen
 * muss. Überschrift und Erklärung rücken dann in eine Zeile zusammen, und
 * der Inhalt bekommt die ganze restliche Höhe des Bildschirms.
 */
export function Seite({
  titel,
  erklaerung,
  children,
  fuss,
  dicht = false,
}: {
  titel: string;
  erklaerung?: string;
  children: ReactNode;
  fuss?: ReactNode;
  dicht?: boolean;
}) {
  return (
    <div
      className={`mx-auto flex w-full max-w-[1600px] min-h-0 flex-col px-4 ${
        dicht ? "h-full gap-3 py-3" : "flex-1 gap-6 py-6"
      }`}
    >
      <header className={dicht ? "flex flex-wrap items-baseline gap-x-5 gap-y-1" : ""}>
        <h1 className={`font-bold leading-tight ${dicht ? "text-[1.5rem]" : "text-[1.9rem]"}`}>
          {titel}
        </h1>
        {erklaerung ? (
          <p
            className={`text-[1.05rem] text-gedaempft ${dicht ? "" : "mt-2 max-w-[60ch]"}`}
          >
            {erklaerung}
          </p>
        ) : null}
      </header>

      <div className={`flex-1 ${dicht ? "min-h-0" : ""}`}>{children}</div>

      {fuss ? (
        <footer
          className={`-mx-4 shrink-0 border-t-2 border-linie bg-papier px-4 py-3 ${
            dicht ? "" : "sticky bottom-0 py-4"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">{fuss}</div>
        </footer>
      ) : null}
    </div>
  );
}
