"use client";

import { useEffect } from "react";
import { useMeldungen } from "./Meldungen";
import { useMuster } from "@/lib/zustand/MusterProvider";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Die Brücke vom Musterzustand zu den Einblendungen.
 *
 * Der Zustand kennt genau einen Fehler, und jede der vier Schrittseiten hat
 * ihn früher selbst als Absatz gezeichnet – vier Stellen, vier Gelegenheiten,
 * das Layout zu verschieben. Jetzt nimmt ihn diese eine Stelle entgegen und
 * gibt ihn an den Stapel unten weiter; der Zustand ist danach wieder leer,
 * damit derselbe Fehler ein zweites Mal auch wieder ankommt.
 */
export function FehlerAlsMeldung() {
  const { fehler, fehlerSetzen } = useMuster();
  const { melden } = useMeldungen();
  const { t } = useSprache();

  useEffect(() => {
    if (!fehler) return;
    melden(t(fehler), "fehler");
    fehlerSetzen(null);
  }, [fehler, fehlerSetzen, melden, t]);

  return null;
}
