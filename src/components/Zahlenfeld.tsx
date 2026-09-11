"use client";

import { useState } from "react";

/**
 * Ein Kästchen mit einer Zahl, in das man auch hineinschreiben kann.
 * ---------------------------------------------------------------------------
 *
 * Bisher stand die Zahl in einem `<output>` und ließ sich nur mit „Weniger"
 * und „Mehr" bewegen. Von 60 auf 200 Stiche sind das vierzehn Tipps, und wer
 * schon weiß, dass es 180 werden sollen, tippt sie lieber einfach ein.
 *
 * Die Knöpfe bleiben trotzdem, und zwar als der Hauptweg: auf einem Tablet
 * mit unruhiger Hand ist ein Knopf sicherer zu treffen als eine Tastatur.
 * Hier kommt nur die zweite Möglichkeit dazu.
 *
 * Beim Tippen wird **nichts** sofort übernommen. Wer „180" schreibt, hat
 * zwischendurch „1" und „18" dastehen; würde jede Ziffer gleich gelten,
 * spränge das Muster auf die kleinste erlaubte Breite und das Feld schriebe
 * sich selbst um. Übernommen wird beim Verlassen des Feldes und bei der
 * Eingabetaste – rechtzeitig also auch dann, wenn jemand direkt danach auf
 * „Muster erstellen" tippt, denn das Verlassen kommt vor dem Knopfdruck.
 *
 * War die getippte Zahl zu groß oder zu klein, wird sie begrenzt und das
 * über `onBegrenzt` gemeldet. Den Satz dazu schreibt die aufrufende Stelle:
 * er ist länger als das Kästchen und würde es sonst in die Breite ziehen.
 */
export function Zahlenfeld({
  id,
  wert,
  min,
  max,
  einheit,
  beschriftung,
  stellen = 3,
  onAendern,
  onBegrenzt,
}: {
  id: string;
  wert: number;
  min: number;
  max: number;
  /** Steht rechts neben der Zahl im selben Kästchen – „Stiche", „Farben". */
  einheit?: string;
  /** Für Vorlesegeräte, wenn kein sichtbares Label danebensteht. */
  beschriftung?: string;
  /** Wie viele Ziffern Platz haben sollen. */
  stellen?: number;
  onAendern: (neu: number) => void;
  /** Auf welchen Wert begrenzt wurde, oder `null`, wenn alles passte. */
  onBegrenzt?: (begrenzt: number | null) => void;
}) {
  /** Was gerade im Feld steht, solange getippt wird. `null` heißt: der Wert. */
  const [entwurf, setEntwurf] = useState<string | null>(null);

  function uebernehmen() {
    const roh = entwurf;
    setEntwurf(null);
    if (roh === null) return;

    // Ein leeres Feld ist keine Zahl und darf keine erfinden: dann bleibt
    // einfach der alte Wert stehen.
    const getippt = Number.parseInt(roh, 10);
    if (!Number.isFinite(getippt)) {
      onBegrenzt?.(null);
      return;
    }

    const neu = Math.max(min, Math.min(max, getippt));
    onBegrenzt?.(neu === getippt ? null : neu);
    if (neu !== wert) onAendern(neu);
  }

  return (
    <div className="flex w-fit items-center rounded-xl border-2 border-tinte bg-white focus-within:outline focus-within:outline-4 focus-within:outline-offset-2 focus-within:outline-auswahl">
      <input
        id={id}
        // Kein `type="number"`: das brächte die winzigen Pfeilchen mit, die
        // auf einem Tablet niemand trifft – und dafür gibt es die Knöpfe.
        // `inputMode` holt trotzdem die Zifferntastatur nach oben.
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={beschriftung}
        value={entwurf ?? String(wert)}
        onChange={(e) => {
          // Nur Ziffern: ein Minus oder ein Komma hätte hier keine Bedeutung.
          setEntwurf(e.target.value.replace(/\D/g, "").slice(0, stellen));
          onBegrenzt?.(null);
        }}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={uebernehmen}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        style={{ width: `${stellen + 2}ch` }}
        className="min-h-[56px] bg-transparent px-3 text-center text-[1.5rem] font-bold tabular-nums outline-none"
      />
      {einheit ? <span className="pr-4 text-[1.1rem]">{einheit}</span> : null}
    </div>
  );
}
