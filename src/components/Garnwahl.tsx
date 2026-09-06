"use client";

import { useMemo, useState } from "react";
import { Knopf } from "./Knopf";
import { istDunkel, hexNachRgb } from "@/lib/farbe/lab";
import type { GarnMitVorrat } from "@/lib/speicher/garne";

/**
 * Garne finden – auf zwei Wegen, weil beide gebraucht werden:
 *
 *  - **Suche nach Nummer oder Namen**, wenn die Nutzerin die Garnrolle in der
 *    Hand hält und nur die Nummer abtippt.
 *  - **Farbtafel zum Antippen**, wenn sie einen Ton sucht und die Nummer
 *    nicht kennt.
 *
 * Beide Wege liegen offen nebeneinander, es gibt keinen Umschalter.
 */
export function Garnwahl({
  garne,
  markiert,
  markierungText,
  onWaehlen,
  hoehe = "max-h-[52vh]",
}: {
  garne: GarnMitVorrat[];
  /** Welche Garne besonders hervorgehoben werden (z. B. der eigene Vorrat). */
  markiert?: (garn: GarnMitVorrat) => boolean;
  markierungText?: string;
  onWaehlen: (garn: GarnMitVorrat) => void;
  hoehe?: string;
}) {
  const [suche, setSuche] = useState("");

  const gefunden = useMemo(() => {
    const text = suche.trim().toLowerCase();
    if (text === "") return garne;
    return garne.filter(
      (g) =>
        g.code.toLowerCase().includes(text) ||
        g.name.toLowerCase().includes(text) ||
        g.marke.toLowerCase().includes(text),
    );
  }, [garne, suche]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="garnsuche" className="text-[1.1rem] font-semibold">
          Nach Nummer oder Farbnamen suchen
        </label>
        <div className="flex flex-wrap gap-3">
          <input
            id="garnsuche"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            inputMode="search"
            placeholder="Zum Beispiel: 310 oder Rot"
            className="min-h-[60px] flex-1 rounded-xl border-2 border-tinte bg-white px-4 text-[1.15rem]"
          />
          {suche !== "" ? (
            <Knopf art="neben" onClick={() => setSuche("")}>
              Suche leeren
            </Knopf>
          ) : null}
        </div>
      </div>

      {gefunden.length === 0 ? (
        <p className="rounded-xl border-2 border-linie bg-hinweis p-5 text-[1.05rem]">
          Zu „{suche}“ gibt es kein Garn. Versuchen Sie es mit der Nummer von der Banderole, zum
          Beispiel 310, oder tippen Sie unten einfach eine Farbe an.
        </p>
      ) : (
        <ul className={`grid gap-3 overflow-y-auto ${hoehe} grid-cols-[repeat(auto-fill,minmax(150px,1fr))] pr-1`}>
          {gefunden.map((garn) => {
            const rgb = hexNachRgb(garn.hex);
            const ist = markiert?.(garn) ?? false;
            return (
              <li key={garn.id}>
                <button
                  type="button"
                  onClick={() => onWaehlen(garn)}
                  aria-pressed={markiert ? ist : undefined}
                  className={`flex min-h-[110px] w-full flex-col items-stretch gap-1 overflow-hidden rounded-xl border-2 text-left ${
                    ist ? "border-hauptaktion" : "border-linie hover:border-tinte"
                  }`}
                >
                  <span
                    className="flex h-[56px] items-center justify-center text-[1rem] font-bold"
                    style={{
                      backgroundColor: garn.hex,
                      color: istDunkel(rgb[0], rgb[1], rgb[2]) ? "#ffffff" : "#000000",
                    }}
                  >
                    {ist ? (markierungText ?? "Ausgewählt") : ""}
                  </span>
                  <span className="flex flex-col bg-white px-3 py-2 leading-tight">
                    <span className="text-[1.05rem] font-bold">
                      {garn.marke} {garn.code}
                    </span>
                    <span className="text-[0.9rem] text-gedaempft">{garn.name}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
