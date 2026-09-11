"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { TEXTE, type Textschluessel } from "./texte";

/**
 * Die Sprache der Oberfläche: Polnisch.
 * ---------------------------------------------------------------------------
 *
 * Hier stand einmal eine Wahl zwischen Deutsch und Polnisch, samt zwei
 * Knöpfen in der Kopfzeile, einem Eintrag im Browserspeicher und einem
 * Blick auf die Spracheinstellung des Geräts. Gebraucht wurde davon nichts:
 * die App ist für eine Person gebaut, und die liest Polnisch. Eine Wahl, bei
 * der es nichts zu wählen gibt, ist für die Nutzerin eine Stolperstelle mehr
 * – ein Fehltipper, und die App spricht plötzlich eine fremde Sprache.
 *
 * Was bleibt, ist `t()`: alle sichtbaren Texte stehen weiterhin an **einer**
 * Stelle (texte.ts) statt verstreut im Programmtext. Das ist der eigentliche
 * Nutzen, und der hängt nicht an der Zahl der Sprachen.
 */

/** Für Zahlen, Datum und Uhrzeit. */
export const LANDESKENNUNG = "pl-PL";

type SprachKontext = {
  /** Einen Text holen, Platzhalter in geschweiften Klammern werden ersetzt. */
  t: (schluessel: Textschluessel, werte?: Record<string, string>) => string;
  /** Eine Zahl so schreiben, wie es üblich ist. */
  zahl: (n: number) => string;
  landeskennung: string;
};

const Kontext = createContext<SprachKontext | null>(null);

export function useSprache(): SprachKontext {
  const k = useContext(Kontext);
  if (!k) throw new Error("useSprache braucht den SprachProvider.");
  return k;
}

function einsetzen(vorlage: string, werte?: Record<string, string>): string {
  if (!werte) return vorlage;
  return vorlage.replace(/\{(\w+)\}/g, (ganz, name: string) => werte[name] ?? ganz);
}

export function SprachProvider({ children }: { children: ReactNode }) {
  // Nichts daran ändert sich zur Laufzeit, also wird es einmal gebaut und
  // bleibt: so rechnet kein Verbraucher wegen der Sprache noch einmal nach.
  const wert = useMemo<SprachKontext>(
    () => ({
      t: (schluessel, werte) => einsetzen(TEXTE[schluessel] ?? schluessel, werte),
      zahl: (n) => n.toLocaleString(LANDESKENNUNG),
      landeskennung: LANDESKENNUNG,
    }),
    [],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}
