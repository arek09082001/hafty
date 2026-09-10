"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  abgleichAbonnieren,
  abgleichAnstossen,
  abgleichZustand,
  ausDerFerneHolen,
  offenesZaehlen,
  type Abgleichzustand,
} from "./abgleich";
import { ferneEingerichtet } from "./supabase";

/**
 * Hält den Abgleich mit der Ferne am Laufen.
 * ---------------------------------------------------------------------------
 *
 * Angestoßen wird bei jeder Gelegenheit, bei der sich etwas geändert haben
 * könnte: beim Start, sobald das Gerät wieder Netz meldet, sobald die App
 * wieder nach vorn geholt wird, und alle 20 Sekunden, solange noch etwas
 * wartet. Ein Lauf ohne Netz kostet nichts – er sieht in die Vormerkliste
 * und legt sich wieder hin.
 *
 * Ist nichts eingerichtet, tut dieser Anbieter gar nichts. Die App bleibt
 * dann genau die, die sie vorher war.
 */

/** Solange noch etwas wartet, wird alle 20 Sekunden nachgesehen. */
const TAKT_MS = 20_000;

const Kontext = createContext<{
  zustand: Abgleichzustand;
  jetztSichern: () => void;
} | null>(null);

export function useAbgleich() {
  const k = useContext(Kontext);
  // Ohne Anbieter (etwa in einem Test) ist die Sicherung schlicht aus.
  return (
    k ?? {
      zustand: { art: "aus", offen: 0, zuletzt: null, meldung: null } as Abgleichzustand,
      jetztSichern: () => {},
    }
  );
}

export function AbgleichProvider({ children }: { children: ReactNode }) {
  const [zustand, setZustand] = useState<Abgleichzustand>(abgleichZustand);

  const jetztSichern = useCallback(() => {
    void abgleichAnstossen();
  }, []);

  useEffect(() => {
    if (!ferneEingerichtet()) return;
    const abbestellen = abgleichAbonnieren(setZustand);

    (async () => {
      await offenesZaehlen();
      // Erst holen, dann schicken: so steht auf einem frisch aufgesetzten
      // Gerät sofort alles da, was schon einmal gesichert wurde.
      await ausDerFerneHolen();
      await abgleichAnstossen();
    })();

    const anstossen = () => void abgleichAnstossen();
    const sichtbar = () => {
      if (document.visibilityState === "visible") anstossen();
    };

    window.addEventListener("online", anstossen);
    document.addEventListener("visibilitychange", sichtbar);
    const takt = window.setInterval(anstossen, TAKT_MS);

    return () => {
      abbestellen();
      window.removeEventListener("online", anstossen);
      document.removeEventListener("visibilitychange", sichtbar);
      window.clearInterval(takt);
    };
  }, []);

  return <Kontext.Provider value={{ zustand, jetztSichern }}>{children}</Kontext.Provider>;
}
