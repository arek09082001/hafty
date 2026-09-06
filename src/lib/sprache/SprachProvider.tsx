"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DE, PL, type Textschluessel } from "./texte";

export const SPRACHEN = ["de", "pl"] as const;
export type Sprache = (typeof SPRACHEN)[number];

/** Wie die Sprache heißt – jeweils in ihrer eigenen Sprache. */
export const SPRACHNAMEN: Record<Sprache, string> = {
  de: "Deutsch",
  pl: "Polski",
};

/** Für Zahlen, Datum und Uhrzeit. */
export const LANDESKENNUNG: Record<Sprache, string> = {
  de: "de-DE",
  pl: "pl-PL",
};

const WOERTERBUCH: Record<Sprache, Record<Textschluessel, string>> = { de: DE, pl: PL };
const SCHLUESSEL_IM_SPEICHER = "stickmuster-sprache";

type SprachKontext = {
  sprache: Sprache;
  spracheSetzen: (s: Sprache) => void;
  /** Einen Text holen, Platzhalter in geschweiften Klammern werden ersetzt. */
  t: (schluessel: Textschluessel, werte?: Record<string, string>) => string;
  /** Eine Zahl so schreiben, wie es in der gewählten Sprache üblich ist. */
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

/**
 * Die gewählte Sprache liegt im Browser, nicht in React – deshalb wird sie
 * hier als kleiner äußerer Speicher gehalten und mit `useSyncExternalStore`
 * gelesen. Das ist der Weg, den React dafür vorsieht, und er vermeidet einen
 * zusätzlichen Durchlauf nach dem ersten Zeichnen.
 */
let gemerkteSprache: Sprache | null = null;
const zuhoerer = new Set<() => void>();

function spracheLesen(): Sprache {
  if (gemerkteSprache) return gemerkteSprache;
  try {
    const gespeichert = window.localStorage.getItem(SCHLUESSEL_IM_SPEICHER);
    if (gespeichert === "de" || gespeichert === "pl") {
      gemerkteSprache = gespeichert;
      return gemerkteSprache;
    }
  } catch {
    // Privates Fenster: dann entscheidet das Gerät.
  }
  // Beim allerersten Besuch entscheidet die Spracheinstellung des Geräts.
  gemerkteSprache = window.navigator.language.toLowerCase().startsWith("pl") ? "pl" : "de";
  return gemerkteSprache;
}

/** Auf dem Server gibt es keinen Browser – dort gilt Deutsch. */
function spracheAufDemServer(): Sprache {
  return "de";
}

function abonnieren(rueckruf: () => void): () => void {
  zuhoerer.add(rueckruf);
  return () => {
    zuhoerer.delete(rueckruf);
  };
}

function spracheMerken(neu: Sprache) {
  gemerkteSprache = neu;
  try {
    window.localStorage.setItem(SCHLUESSEL_IM_SPEICHER, neu);
  } catch {
    // Privates Fenster: dann gilt die Wahl eben nur für diese Sitzung.
  }
  for (const rueckruf of zuhoerer) rueckruf();
}

/**
 * Die Sprache der Oberfläche.
 *
 * Beim allerersten Besuch entscheidet die Spracheinstellung des Geräts: steht
 * dort Polnisch, ist die App polnisch. Wer einmal von Hand umschaltet, bekommt
 * ab dann immer seine Sprache – die Wahl übersteht das Schließen des Reiters.
 */
export function SprachProvider({ children }: { children: ReactNode }) {
  const sprache = useSyncExternalStore(abonnieren, spracheLesen, spracheAufDemServer);

  useEffect(() => {
    document.documentElement.lang = sprache;
  }, [sprache]);

  const spracheSetzen = useCallback((neu: Sprache) => spracheMerken(neu), []);

  const wert = useMemo<SprachKontext>(() => {
    const buch = WOERTERBUCH[sprache];
    const kennung = LANDESKENNUNG[sprache];
    return {
      sprache,
      spracheSetzen,
      t: (schluessel, werte) => einsetzen(buch[schluessel] ?? schluessel, werte),
      zahl: (n) => n.toLocaleString(kennung),
      landeskennung: kennung,
    };
  }, [sprache, spracheSetzen]);

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}
