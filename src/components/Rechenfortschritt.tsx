"use client";

import { useSprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

/**
 * Was gerade gerechnet wird: ein Satz und ein Balken.
 *
 * Steht in Schritt 2 („Muster erstellen") und in Schritt 3, wenn dort ein
 * Foto ankommt, zu dem es noch kein Muster gibt. Beide zeigen dasselbe, also
 * steht es an einer Stelle – sonst liefen die beiden Anzeigen mit der Zeit
 * auseinander.
 *
 * Solange der Worker noch nichts gemeldet hat, steht hier trotzdem schon der
 * Satz „Das Muster wird berechnet …": ein leerer Kasten, der eine halbe
 * Sekunde später Text bekommt, lässt alles darunter springen.
 */
export function Rechenfortschritt({
  fortschritt,
}: {
  fortschritt: { text: Textschluessel; anteil: number } | null;
}) {
  const { t } = useSprache();

  return (
    <div className="border-l-[6px] border-hauptaktion bg-gewaehlt px-4 py-3">
      {/* Zwei Zeilen fest: die Meldungen sind verschieden lang, und während
          des Rechnens wechseln sie im Sekundentakt. Ohne festen Platz hüpfte
          alles darunter bei jeder Meldung. */}
      <p className="flex min-h-[3rem] items-center text-[1.15rem] font-semibold">
        {fortschritt ? t(fortschritt.text) : t("einst.wirdBerechnet")}
      </p>
      <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-white">
        <div
          className="h-full bg-hauptaktion transition-[width] duration-300"
          style={{ width: `${Math.round((fortschritt?.anteil ?? 0) * 100)}%` }}
        />
      </div>
    </div>
  );
}
