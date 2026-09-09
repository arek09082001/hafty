"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Meldungen als Einblendungen am unteren Rand.
 * ---------------------------------------------------------------------------
 *
 * Vorher stand jede Meldung als Absatz oben in der Bedienspalte. Damit schob
 * sie alles darunter nach unten: wer gerade den Regler im Blick hatte, fand
 * ihn nach einem Tipp fünfzig Punkte tiefer wieder. Genau das soll nirgends
 * mehr passieren – eine Meldung darf die Arbeit nicht verrücken.
 *
 * Deshalb liegen sie jetzt über der Seite statt in ihr – und zwar **oben**,
 * unter der Schrittleiste. Unten wären sie der naheliegende Platz gewesen,
 * aber dort stehen die Knöpfe: der Zettel „Tippen Sie jetzt auf ‚Kopie
 * einfügen'" lag genau auf diesem Knopf und ließ ihn nicht mehr antippen.
 * Oben verdecken sie den oberen Rand der Leinwand, und die kann man ansehen,
 * ohne sie zu treffen.
 *
 * Sie verschwinden **nicht** von selbst. Eine Meldung, die nach vier Sekunden
 * weg ist, hat die Nutzerin, um die es hier geht, nie gelesen – sie schaut
 * gerade auf das Muster und nicht in die Ecke. Jede bleibt stehen, bis das
 * Kreuz daneben angetippt wird.
 *
 * Mehrere stapeln sich untereinander, die neueste unten. Das ist keine
 * Geschmacksfrage: der Stapel hängt am oberen Rand, also wächst er nach
 * unten – die schon stehenden bleiben dabei, wo sie sind. Käme die neueste
 * oben dazu, rückten alle anderen im selben Augenblick tiefer, und genau
 * dieses Rutschen soll es nirgends geben.
 *
 * Dieselbe Meldung zweimal hintereinander gibt es nicht: wer zweimal
 * dasselbe tut, bekommt keine zwei gleichen Zettel, sondern denselben noch
 * einmal ganz unten.
 */

type Art = "info" | "fehler" | "erfolg";
type Meldung = { id: number; text: string; art: Art };

type Kontext = {
  /** Eine Meldung einblenden. Sie bleibt, bis die Nutzerin sie wegtippt. */
  melden: (text: string, art?: Art) => void;
  /** Alle Meldungen wegnehmen – etwa beim Verlassen eines Arbeitsschrittes. */
  alleWeg: () => void;
};

const MeldungenKontext = createContext<Kontext | null>(null);

export function useMeldungen(): Kontext {
  const k = useContext(MeldungenKontext);
  if (!k) throw new Error("useMeldungen braucht den MeldungenProvider.");
  return k;
}

export function MeldungenProvider({ children }: { children: ReactNode }) {
  const [meldungen, setMeldungen] = useState<Meldung[]>([]);
  const naechsteId = useRef(1);

  const melden = useCallback((text: string, art: Art = "info") => {
    if (!text) return;
    setMeldungen((bisher) => {
      // Dieselbe Meldung nicht doppelt stapeln: die alte weicht der neuen.
      const ohneGleiche = bisher.filter((m) => m.text !== text);
      return [...ohneGleiche, { id: naechsteId.current++, text, art }];
    });
  }, []);

  const alleWeg = useCallback(() => setMeldungen([]), []);

  const wegnehmen = useCallback((id: number) => {
    setMeldungen((bisher) => bisher.filter((m) => m.id !== id));
  }, []);

  const wert = useMemo<Kontext>(() => ({ melden, alleWeg }), [melden, alleWeg]);

  return (
    <MeldungenKontext.Provider value={wert}>
      {children}
      <Meldungsstapel meldungen={meldungen} onWegnehmen={wegnehmen} />
    </MeldungenKontext.Provider>
  );
}

function Meldungsstapel({
  meldungen,
  onWegnehmen,
}: {
  meldungen: Meldung[];
  onWegnehmen: (id: number) => void;
}) {
  const { t } = useSprache();
  if (meldungen.length === 0) return null;

  return (
    // Der Rahmen liegt über der ganzen Seite und ändert seine Größe nie –
    // die Zettel werden darin oben angesetzt. Wäre er nur so hoch wie sein
    // Inhalt, wanderte mit jedem Zettel eine seiner Kanten, und schon das
    // zählt als Verschieben.
    //
    // `pointer-events-none` darauf, damit die Leinwand darunter bedienbar
    // bleibt; die Zettel selbst nehmen ihre Tipps wieder an.
    <div
      aria-live="polite"
      // `--kopfleiste` schiebt die Zettel unter die Schrittleiste. Als
      // Innenabstand und nicht als Position, damit der Rahmen selbst seine
      // Größe behält.
      style={{ paddingTop: "calc(var(--kopfleiste, 0px) + 0.75rem)" }}
      className="pointer-events-none fixed inset-0 z-50 flex flex-col items-start justify-start gap-2 p-3 sm:max-w-[520px]"
    >
      {meldungen.map((m) => (
        <Zettel key={m.id} meldung={m} onWeg={() => onWegnehmen(m.id)} schliessen={t("allgemein.meldungSchliessen")} />
      ))}
    </div>
  );
}

const ARTEN: Record<Art, string> = {
  fehler: "border-warnung bg-[#fbeaea] text-warnung",
  erfolg: "border-hauptaktion bg-gewaehlt text-hauptaktion",
  info: "border-tinte bg-white text-tinte",
};

function Zettel({
  meldung,
  onWeg,
  schliessen,
}: {
  meldung: Meldung;
  onWeg: () => void;
  schliessen: string;
}) {
  return (
    <div
      role={meldung.art === "fehler" ? "alert" : "status"}
      className={`pointer-events-auto flex w-full items-start gap-2 border-l-[6px] py-2 pr-2 pl-4 shadow-[0_2px_12px_rgba(0,0,0,0.18)] ${
        ARTEN[meldung.art]
      }`}
    >
      <p className="min-w-0 flex-1 py-2 text-[1.05rem]">{meldung.text}</p>
      {/* Das Kreuz ist ein volles Tippziel und kein Zeichen am Rand: mit dem
          Finger muss man es beim ersten Versuch treffen. */}
      <button
        type="button"
        onClick={onWeg}
        aria-label={schliessen}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-black/10"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
