import type { ReactNode } from "react";

/**
 * Das Seitengerüst.
 * ---------------------------------------------------------------------------
 *
 * Zwei Fassungen, weil es zwei Arten von Seiten gibt:
 *
 *  - **Lesen und entscheiden** (Bild aussuchen, Größe und Farben): eine
 *    Überschrift, ein erklärender Satz, darunter der Inhalt in einer Spalte,
 *    die schmal genug zum Lesen bleibt. Die Seite darf blättern.
 *
 *  - **Arbeiten** (`dicht`: Muster ansehen, Drucken): das Muster muss sofort
 *    und so groß wie möglich zu sehen sein. Die Überschrift schrumpft auf
 *    eine Zeile – im Fortschritt oben steht ohnehin schon, wo man ist –, und
 *    der Inhalt bekommt den ganzen Rest des Bildschirms, ohne zu blättern.
 *
 * Unten steht in beiden Fassungen die Fußleiste mit genau einer Hauptaktion.
 * Sie ist durch eine Haarlinie abgesetzt und nicht durch einen Kasten: die
 * Seite soll eine Fläche sein und kein Stapel Karten.
 */
export function Seite({
  titel,
  erklaerung,
  children,
  fuss,
  kopfEnde,
  dicht = false,
  ohneKopf = false,
  weit = false,
}: {
  titel: string;
  erklaerung?: string;
  children: ReactNode;
  fuss?: ReactNode;
  /**
   * Steht rechts in der Kopfzeile, auf gleicher Höhe wie die Überschrift.
   * Auf den Arbeitsseiten stehen dort die Maße des Musters – eine Angabe,
   * die immer sichtbar sein soll, ohne einen eigenen Kasten zu brauchen.
   */
  kopfEnde?: ReactNode;
  dicht?: boolean;
  /**
   * Nur für `dicht`: gar keine sichtbare Kopfzeile.
   *
   * Beim Bearbeiten in Schritt 3 stand dort die Überschrift und daneben die
   * Maße des Musters. Beides ändert sich beim Arbeiten nie – wo man ist,
   * sagt schon der Fortschritt oben, und die Maße stehen im Reiter „Muster".
   * Die Zeile hat also nur Höhe gekostet, die dem Muster fehlte. Die
   * Überschrift bleibt für Vorleseprogramme erhalten.
   */
  ohneKopf?: boolean;
  /**
   * Für Seiten, deren Inhalt ein Raster ist und von Breite profitiert – die
   * Garnliste zum Beispiel. Fließtext bleibt sonst in einer Spalte, die
   * schmal genug zum Lesen ist.
   */
  weit?: boolean;
}) {
  if (dicht) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        {ohneKopf ? (
          <h1 className="sr-only">{titel}</h1>
        ) : (
          <header className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 pt-3 pb-2">
            <h1 className="text-[1.25rem] font-bold leading-tight">{titel}</h1>
            {kopfEnde}
          </header>
        )}

        <div className="min-h-0 flex-1">{children}</div>

        {fuss ? (
          <footer className="shrink-0 border-t border-linie bg-papier px-4 py-2">
            <div className="flex flex-wrap items-center justify-between gap-3">{fuss}</div>
          </footer>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`mx-auto flex w-full flex-1 flex-col gap-8 px-6 py-8 ${
        weit ? "max-w-[1600px]" : "max-w-[1100px]"
      }`}
    >
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <h1 className="text-[1.9rem] font-bold leading-tight">{titel}</h1>
          {erklaerung ? (
            <p className="mt-2 max-w-[62ch] text-[1.05rem] text-gedaempft">{erklaerung}</p>
          ) : null}
        </div>
        {kopfEnde}
      </header>

      <div className="flex-1">{children}</div>

      {fuss ? (
        <footer className="sticky bottom-0 -mx-6 border-t border-linie bg-papier px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">{fuss}</div>
        </footer>
      ) : null}
    </div>
  );
}
