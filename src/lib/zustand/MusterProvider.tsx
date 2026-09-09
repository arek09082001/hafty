"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  MAX_FELDER,
  STANDARD_EINSTELLUNGEN,
  GLAETTUNGSSTUFEN,
  type Einstellungen,
  type Garn,
  type Kennzahlen,
  type PalettenEintrag,
} from "@/lib/muster/typen";
import { bearbeitungUmschreiben, zusammenfuehren } from "@/lib/muster/raster";
import { kennzahlenBerechnen } from "@/lib/muster/glaettung";
import { arbeitsstandLaden, arbeitsstandSichern } from "@/lib/speicher/browserspeicher";
import { standSichern, type Stand } from "@/lib/speicher/staende";
import { garneLaden, type GarnMitVorrat } from "@/lib/speicher/garne";
import { einpassen, type Ausschnitt } from "@/lib/muster/ausschnitt";
import type { AnWorker, AntwortVomWorker, VomWorker } from "@/lib/worker/nachrichten";
import type { Textschluessel } from "@/lib/sprache/texte";

/**
 * Ein Rückgängig-Schritt hält nur die geänderten Felder fest, nicht das ganze
 * Raster: je Feld der Index, der alte und der neue Wert. Ein Muster mit
 * 30.000 Feldern kostet damit pro Schritt ein paar Byte statt 30 Kilobyte,
 * und es passen mühelos über hundert Schritte in den Arbeitsspeicher.
 */
export type Schritt = {
  /** Der Name des Schrittes als Textschlüssel – übersetzt wird erst beim Anzeigen. */
  titel: Textschluessel;
  indizes: Int32Array;
  alt: Int16Array;
  neu: Int16Array;
};

/** Gefordert sind mindestens 50 Schritte; wir halten deutlich mehr vor. */
const MAX_SCHRITTE = 120;

export type Muster = {
  breite: number;
  hoehe: number;
  /** Untere Ebene: das erzeugte Muster. */
  basis: Uint8Array;
  /** Obere Ebene: die Handbearbeitungen (-1 = unberührt). */
  bearbeitung: Int16Array;
  palette: PalettenEintrag[];
  kennzahlen: Kennzahlen;
  farbenVorher: number;
  farbenNachher: number;
  garneZusammengelegt: number;
  /** Aus welchem Bild dieses Muster entstanden ist. */
  bildKennung: string;
};

export type Bildquelle = {
  /**
   * Eindeutig je ausgewähltem Bild **und** Ausschnitt – daran hängt, ob von
   * Hand gemalte Stiche übernommen werden. Ein anderer Ausschnitt ergibt ein
   * ganz anderes Raster, also muss er die Kennung mitbestimmen.
   *
   * Sie wird aus der Grundkennung und dem Rechteck gebildet und ist damit
   * wiederholbar: wer den Ausschnitt verschiebt und wieder zurückschiebt,
   * bekommt dieselbe Kennung und behält seine Bearbeitungen.
   */
  kennung: string;
  /** Zufällig, einmal je ausgewähltem Bild. */
  basisKennung: string;
  name: string;
  blob: Blob;
  vorschauUrl: string;
  /** Maße des Quellbildes in Bildpunkten – daraus folgt die Musterhöhe. */
  masse: { breite: number; hoehe: number };
  /**
   * Der gewählte Bildausschnitt in Bildpunkten des Quellbildes. Beim
   * Erzeugen liest `createImageBitmap` gleich nur diesen Teil; das Bild
   * selbst wird nie verändert.
   */
  ausschnitt: Ausschnitt;
};

/** Bildkennung aus Grundkennung und Ausschnitt – gleiches Rechteck, gleiche Kennung. */
function kennungBilden(basis: string, a: Ausschnitt): string {
  return `${basis}:${a.x},${a.y},${a.breite},${a.hoehe}`;
}

// ---------------------------------------------------------------------------
// Zustand und Übergänge
// ---------------------------------------------------------------------------

type Zustand = {
  muster: Muster | null;
  rueckgaengigStapel: Schritt[];
  wiederholenStapel: Schritt[];
};

type Aktion =
  /** Ergebnis eines vollen Durchlaufs: untere Ebene neu, Bearbeitungen bleiben. */
  | { art: "erzeugt"; muster: Muster }
  /** Einen kompletten Stand einsetzen (gespeicherter Stand, Wiederherstellung). */
  | { art: "ersetzen"; muster: Muster }
  | { art: "felderAendern"; titel: Textschluessel; indizes: number[]; werte: number[] }
  | { art: "bearbeitungErsetzen"; titel: Textschluessel; neue: Int16Array }
  | { art: "paletteErsetzen"; palette: PalettenEintrag[] }
  | { art: "rueckgaengig" }
  | { art: "wiederholen" };

/** Einen Schritt auf die Bearbeitungsebene anwenden und das Muster neu bauen. */
function schrittAnwenden(muster: Muster, indizes: Int32Array, werte: Int16Array): Muster {
  const bearbeitung = Int16Array.from(muster.bearbeitung);
  for (let i = 0; i < indizes.length; i++) bearbeitung[indizes[i]] = werte[i];
  return {
    ...muster,
    bearbeitung,
    kennzahlen: kennzahlenBerechnen(zusammenfuehren(muster.basis, bearbeitung), muster.breite),
  };
}

function aufStapel(stapel: Schritt[], schritt: Schritt): Schritt[] {
  const neu = [...stapel, schritt];
  return neu.length > MAX_SCHRITTE ? neu.slice(neu.length - MAX_SCHRITTE) : neu;
}

function reduzieren(zustand: Zustand, aktion: Aktion): Zustand {
  switch (aktion.art) {
    case "erzeugt":
      // Die Indizes der Palette sind andere als vorher, deshalb wäre ein alter
      // Rückgängig-Schritt nach dem Neuerzeugen sinnlos oder sogar falsch.
      return { muster: aktion.muster, rueckgaengigStapel: [], wiederholenStapel: [] };

    case "ersetzen":
      return { muster: aktion.muster, rueckgaengigStapel: [], wiederholenStapel: [] };

    case "paletteErsetzen": {
      if (!zustand.muster) return zustand;
      return { ...zustand, muster: { ...zustand.muster, palette: aktion.palette } };
    }

    case "felderAendern": {
      const muster = zustand.muster;
      if (!muster) return zustand;

      // Nur die Felder aufnehmen, die sich wirklich ändern.
      const indizes: number[] = [];
      const alt: number[] = [];
      const neu: number[] = [];
      for (let i = 0; i < aktion.indizes.length; i++) {
        const feld = aktion.indizes[i];
        const wert = aktion.werte[i];
        if (muster.bearbeitung[feld] === wert) continue;
        indizes.push(feld);
        alt.push(muster.bearbeitung[feld]);
        neu.push(wert);
      }
      if (indizes.length === 0) return zustand;

      const schritt: Schritt = {
        titel: aktion.titel,
        indizes: Int32Array.from(indizes),
        alt: Int16Array.from(alt),
        neu: Int16Array.from(neu),
      };

      return {
        muster: schrittAnwenden(muster, schritt.indizes, schritt.neu),
        rueckgaengigStapel: aufStapel(zustand.rueckgaengigStapel, schritt),
        wiederholenStapel: [],
      };
    }

    case "bearbeitungErsetzen": {
      const muster = zustand.muster;
      if (!muster) return zustand;

      const indizes: number[] = [];
      const alt: number[] = [];
      const neu: number[] = [];
      for (let i = 0; i < aktion.neue.length; i++) {
        if (muster.bearbeitung[i] === aktion.neue[i]) continue;
        indizes.push(i);
        alt.push(muster.bearbeitung[i]);
        neu.push(aktion.neue[i]);
      }
      if (indizes.length === 0) return zustand;

      const schritt: Schritt = {
        titel: aktion.titel,
        indizes: Int32Array.from(indizes),
        alt: Int16Array.from(alt),
        neu: Int16Array.from(neu),
      };

      return {
        muster: schrittAnwenden(muster, schritt.indizes, schritt.neu),
        rueckgaengigStapel: aufStapel(zustand.rueckgaengigStapel, schritt),
        wiederholenStapel: [],
      };
    }

    case "rueckgaengig": {
      const muster = zustand.muster;
      const schritt = zustand.rueckgaengigStapel[zustand.rueckgaengigStapel.length - 1];
      if (!muster || !schritt) return zustand;
      return {
        muster: schrittAnwenden(muster, schritt.indizes, schritt.alt),
        rueckgaengigStapel: zustand.rueckgaengigStapel.slice(0, -1),
        wiederholenStapel: aufStapel(zustand.wiederholenStapel, schritt),
      };
    }

    case "wiederholen": {
      const muster = zustand.muster;
      const schritt = zustand.wiederholenStapel[zustand.wiederholenStapel.length - 1];
      if (!muster || !schritt) return zustand;
      return {
        muster: schrittAnwenden(muster, schritt.indizes, schritt.neu),
        rueckgaengigStapel: aufStapel(zustand.rueckgaengigStapel, schritt),
        wiederholenStapel: zustand.wiederholenStapel.slice(0, -1),
      };
    }
  }
}

// ---------------------------------------------------------------------------

type MusterKontext = {
  bild: Bildquelle | null;
  /** Wählt ein Bild aus und misst dabei gleich seine Maße. */
  bildWaehlen: (quelle: { name: string; blob: Blob }) => Promise<void>;
  ausschnittSetzen: (neu: Ausschnitt) => void;
  bildEntfernen: () => void;

  einstellungen: Einstellungen;
  einstellungenSetzen: (e: Partial<Einstellungen>) => void;

  /** Der ganze Garnkatalog, mit Kennzeichnung des eigenen Vorrats. */
  alleGarne: GarnMitVorrat[];
  /** Die Garne, mit denen tatsächlich gerechnet wird (siehe nurEigeneGarne). */
  garne: Garn[];
  /** Nach einer Änderung am Vorrat den Katalog neu holen. */
  garneNeuLaden: () => Promise<void>;

  muster: Muster | null;
  /** Beide Ebenen zusammengeführt – das, was gezeigt und gedruckt wird. */
  raster: Uint8Array | null;

  laeuft: boolean;
  fortschritt: { text: Textschluessel; anteil: number } | null;
  /** Fehlermeldung als Textschlüssel – übersetzt wird erst beim Anzeigen. */
  fehler: Textschluessel | null;
  fehlerSetzen: (schluessel: Textschluessel | null) => void;

  /** Der volle Durchlauf: Bild -> Muster. */
  erzeugen: () => Promise<boolean>;
  /** Nur die Glättung neu rechnen – für den Schieberegler. */
  glaettungSetzen: (stufe: number) => void;

  felderAendern: (titel: Textschluessel, indizes: number[], werte: number[]) => void;
  bearbeitungErsetzen: (titel: Textschluessel, neue: Int16Array) => void;
  paletteErsetzen: (palette: PalettenEintrag[]) => void;
  musterErsetzen: (m: Muster) => void;

  /** Das Muster in der Datenbank, sobald es einen gespeicherten Stand gibt. */
  musterId: string | null;
  /** Der Stand, auf dem gerade gearbeitet wird – der Elternteil des nächsten. */
  versionId: string | null;
  /** Wie oft gesichert wurde – die Ständeleiste lädt daraufhin neu. */
  standZaehler: number;
  /**
   * Einen Stand sichern. Läuft bei jedem großen Schritt automatisch und
   * zusätzlich von Hand über „Diesen Stand merken".
   */
  standAnlegen: (beschriftung: Textschluessel, gemerkt?: boolean) => Promise<boolean>;
  /** Nach dem Wiederherstellen: auf diesen Stand als Elternteil umschalten. */
  standUebernehmen: (stand: Stand, muster: Muster) => void;

  rueckgaengig: () => void;
  wiederholen: () => void;
  kannRueckgaengig: boolean;
  kannWiederholen: boolean;
  letzterSchrittTitel: Textschluessel | null;
  naechsterSchrittTitel: Textschluessel | null;
};

const Kontext = createContext<MusterKontext | null>(null);

export function useMuster(): MusterKontext {
  const k = useContext(Kontext);
  if (!k) throw new Error("useMuster braucht den MusterProvider.");
  return k;
}

export function MusterProvider({ children }: { children: ReactNode }) {
  const [zustand, ausloesen] = useReducer(reduzieren, {
    muster: null,
    rueckgaengigStapel: [],
    wiederholenStapel: [],
  });
  const [bild, setBild] = useState<Bildquelle | null>(null);
  const [einstellungen, setEinstellungen] = useState<Einstellungen>(STANDARD_EINSTELLUNGEN);
  const [alleGarne, setAlleGarne] = useState<GarnMitVorrat[]>([]);
  const [laeuft, setLaeuft] = useState(false);
  const [fortschritt, setFortschritt] = useState<{ text: Textschluessel; anteil: number } | null>(
    null,
  );
  const [fehler, setFehler] = useState<Textschluessel | null>(null);
  const [wiederhergestellt, setWiederhergestellt] = useState(false);
  const [musterId, setMusterId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [standZaehler, setStandZaehler] = useState(0);

  const worker = useRef<Worker | null>(null);
  const wartend = useRef<((w: AntwortVomWorker) => void) | null>(null);
  // `erzeugen` sichert den neuen Stand mit, darf aber nicht von `sichern`
  // abhängen – sonst würde sich jede Sicherung selbst neu erzeugen lassen.
  const sichernRef = useRef<
    ((m: Muster, beschriftung: Textschluessel, gemerkt: boolean) => Promise<boolean>) | null
  >(null);

  const { muster } = zustand;

  // --- Worker ---------------------------------------------------------------
  const workerHolen = useCallback(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL("../worker/muster.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current.addEventListener("message", (e: MessageEvent<VomWorker>) => {
        const nachricht = e.data;
        if (nachricht.art === "fortschritt") {
          setFortschritt({ text: nachricht.text, anteil: nachricht.anteil });
          return;
        }
        wartend.current?.(nachricht);
      });
    }
    return worker.current;
  }, []);

  useEffect(() => {
    const eigen = worker;
    return () => {
      eigen.current?.terminate();
      eigen.current = null;
    };
  }, []);

  // --- Garnkatalog holen ----------------------------------------------------
  const garneNeuLaden = useCallback(async () => {
    const liste = await garneLaden();
    setAlleGarne(liste);
  }, []);

  useEffect(() => {
    let abgebrochen = false;
    garneLaden()
      .then((liste) => {
        if (!abgebrochen) setAlleGarne(liste);
      })
      .catch(() => {
        // Ohne Katalog rechnet die App mit den Farben aus dem Bild weiter.
      });
    return () => {
      abgebrochen = true;
    };
  }, []);

  /**
   * Womit gerechnet wird. Der Schalter „nur meine Garne verwenden" schränkt
   * die Palette auf den eigenen Vorrat ein – aber nur, wenn dort überhaupt
   * etwas drin ist. Sonst käme ein Muster ohne jede Farbe heraus.
   */
  const garne = useMemo<Garn[]>(() => {
    const eigene = alleGarne.filter((g) => g.imVorrat);
    const quelle = einstellungen.nurEigeneGarne && eigene.length > 0 ? eigene : alleGarne;
    return quelle.map(({ id, marke, code, name, hex, L, a, b }) => ({
      id,
      marke,
      code,
      name,
      hex,
      L,
      a,
      b,
    }));
  }, [alleGarne, einstellungen.nurEigeneGarne]);

  // --- Nach einem Absturz den letzten Arbeitsstand zurückholen --------------
  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      const stand = await arbeitsstandLaden();
      if (abgebrochen) return;
      if (stand) {
        ausloesen({
          art: "ersetzen",
          muster: {
            breite: stand.breite,
            hoehe: stand.hoehe,
            basis: stand.basis,
            bearbeitung: stand.bearbeitung,
            palette: stand.palette,
            kennzahlen: kennzahlenBerechnen(
              zusammenfuehren(stand.basis, stand.bearbeitung),
              stand.breite,
            ),
            farbenVorher: stand.palette.length,
            farbenNachher: stand.palette.length,
            garneZusammengelegt: 0,
            bildKennung: stand.bildKennung,
          },
        });
        setEinstellungen(stand.einstellungen);
        setMusterId(stand.musterId);
        if (stand.bild && stand.bildMasse) {
          setBild({
            kennung: stand.bildKennung,
            // Die Grundkennung steckt vor dem Doppelpunkt; ältere Stände
            // kennen sie noch nicht, dann gilt die ganze Kennung.
            basisKennung: stand.bildKennung.split(":")[0],
            name: stand.bildName,
            blob: stand.bild,
            vorschauUrl: URL.createObjectURL(stand.bild),
            masse: stand.bildMasse,
            // Aeltere Staende kennen den Ausschnitt noch nicht; dann gilt
            // wie frueher das ganze Bild.
            ausschnitt: stand.bildAusschnitt ?? {
              x: 0,
              y: 0,
              breite: stand.bildMasse.breite,
              hoehe: stand.bildMasse.hoehe,
            },
          });
        }
      }
      setWiederhergestellt(true);
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  // --- Arbeitsstand laufend mitschreiben ------------------------------------
  // Nicht bei jedem Pinselstrich, sondern gebündelt: 800 ms nach der letzten
  // Änderung. Das reicht gegen einen Absturz und belastet nichts.
  useEffect(() => {
    if (!wiederhergestellt || !muster) return;
    const zeitgeber = window.setTimeout(() => {
      void arbeitsstandSichern({
        musterId,
        name: bild?.name ?? "Muster",
        breite: muster.breite,
        hoehe: muster.hoehe,
        basis: muster.basis,
        bearbeitung: muster.bearbeitung,
        palette: muster.palette,
        einstellungen,
        bild: bild?.blob ?? null,
        bildName: bild?.name ?? "",
        bildMasse: bild?.masse ?? null,
        bildAusschnitt: bild?.ausschnitt ?? null,
        bildKennung: muster.bildKennung,
        gespeichertAm: Date.now(),
      });
    }, 800);
    return () => window.clearTimeout(zeitgeber);
  }, [muster, einstellungen, bild, wiederhergestellt, musterId]);

  // --- Bild auswählen -------------------------------------------------------
  const bildWaehlen = useCallback(
    async (quelle: { name: string; blob: Blob }) => {
      const bitmap = await createImageBitmap(quelle.blob);
      const masse = { breite: bitmap.width, hoehe: bitmap.height };
      bitmap.close();
      setBild((vorher) => {
        if (vorher) URL.revokeObjectURL(vorher.vorschauUrl);
        const basisKennung = crypto.randomUUID();
        const ausschnitt = { x: 0, y: 0, breite: masse.breite, hoehe: masse.hoehe };
        return {
          ...quelle,
          basisKennung,
          kennung: kennungBilden(basisKennung, ausschnitt),
          vorschauUrl: URL.createObjectURL(quelle.blob),
          masse,
          ausschnitt,
        };
      });
    },
    [],
  );

  /**
   * Einen anderen Ausschnitt wählen.
   *
   * Damit ändert sich das Muster von Grund auf, also bekommt das Bild eine
   * neue Kennung. Daran hängt, ob von Hand gemalte Stiche übernommen werden –
   * und die passen zu einem anderen Ausschnitt nicht mehr.
   */
  const ausschnittSetzen = useCallback((neu: Ausschnitt) => {
    setBild((vorher) => {
      if (!vorher) return vorher;
      const ausschnitt = einpassen(neu, vorher.masse.breite, vorher.masse.hoehe);
      return { ...vorher, ausschnitt, kennung: kennungBilden(vorher.basisKennung, ausschnitt) };
    });
  }, []);

  const bildEntfernen = useCallback(() => {
    setBild((vorher) => {
      if (vorher) URL.revokeObjectURL(vorher.vorschauUrl);
      return null;
    });
  }, []);

  // --- Der volle Durchlauf --------------------------------------------------
  const erzeugen = useCallback(async () => {
    if (!bild) {
      setFehler("arbeit.fehlerKeinBild");
      return false;
    }

    setFehler(null);
    setLaeuft(true);
    setFortschritt({ text: "arbeit.bildLesen", anteil: 0.02 });

    try {
      // createImageBitmap kann direkt einen Ausschnitt lesen – ohne das Bild
      // vorher über eine Leinwand neu zu zeichnen und dabei zu verlieren.
      const a = bild.ausschnitt;
      const bitmap = await createImageBitmap(bild.blob, a.x, a.y, a.breite, a.hoehe);

      const breiteStiche = Math.round(einstellungen.breiteStiche);
      let hoeheStiche = Math.max(1, Math.round((breiteStiche * bitmap.height) / bitmap.width));

      // Sicherheitsnetz gegen Muster, die den Speicher sprengen würden.
      if (breiteStiche * hoeheStiche > MAX_FELDER) {
        hoeheStiche = Math.max(1, Math.floor(MAX_FELDER / breiteStiche));
      }

      const stufe = GLAETTUNGSSTUFEN[begrenzen(einstellungen.glaettung)];

      const antwort = await anWorkerSenden(
        workerHolen(),
        wartend,
        {
          art: "erzeugen",
          bild: bitmap,
          breiteStiche,
          hoeheStiche,
          farbanzahl: einstellungen.farbanzahl,
          lambda: stufe.lambda,
          mindestFlaeche: stufe.mindestFlaeche,
          garne,
          dithering: einstellungen.dithering,
        },
        [bitmap],
      );

      if (antwort.art === "fehler") {
        setFehler(antwort.text);
        return false;
      }

      // Handbearbeitungen aus einem früheren Durchlauf übernehmen, indem
      // ihre Farben auf die neue Palette umgeschrieben werden.
      //
      // Nur, wenn dasselbe Bild zugrunde liegt und das Raster gleich groß
      // geblieben ist: bei einem anderen Bild lägen die alten Stiche an
      // willkürlichen Stellen und die Nutzerin müsste sie mühsam suchen.
      const passt =
        muster !== null &&
        muster.bildKennung === bild.kennung &&
        muster.breite === antwort.breite &&
        muster.hoehe === antwort.hoehe;
      const bearbeitung = passt
        ? bearbeitungUmschreiben(muster.bearbeitung, muster.palette, antwort.palette)
        : new Int16Array(antwort.raster.length).fill(-1);

      const neu: Muster = {
        breite: antwort.breite,
        hoehe: antwort.hoehe,
        basis: antwort.raster,
        bearbeitung,
        palette: antwort.palette,
        kennzahlen: antwort.kennzahlen,
        farbenVorher: antwort.farbenVorher,
        farbenNachher: antwort.farbenNachher,
        garneZusammengelegt: antwort.garneZusammengelegt,
        bildKennung: bild.kennung,
      };
      ausloesen({ art: "erzeugt", muster: neu });

      // Ein großer Schritt – der Stand wird von selbst gesichert.
      void sichernRef.current?.(
        neu,
        passt ? "staende.farbanzahlGeaendert" : "staende.neuErzeugt",
        false,
      );
      return true;
    } catch {
      setFehler("arbeit.fehlerBildLesen");
      return false;
    } finally {
      setLaeuft(false);
      setFortschritt(null);
    }
  }, [bild, einstellungen, garne, muster, workerHolen]);

  // --- Nur die Glättung -----------------------------------------------------
  const glaettungSetzen = useCallback(
    (stufeNummer: number) => {
      const nummer = begrenzen(stufeNummer);
      setEinstellungen((e) => ({ ...e, glaettung: nummer }));
      if (!muster) return;

      const stufe = GLAETTUNGSSTUFEN[nummer];
      setLaeuft(true);

      void anWorkerSenden(workerHolen(), wartend, {
        art: "glaetten",
        lambda: stufe.lambda,
        mindestFlaeche: stufe.mindestFlaeche,
      })
        .then((antwort) => {
          if (antwort.art === "fehler") {
            setFehler(antwort.text);
            return;
          }
          ausloesen({
            art: "erzeugt",
            muster: {
              breite: antwort.breite,
              hoehe: antwort.hoehe,
              basis: antwort.raster,
              bearbeitung: bearbeitungUmschreiben(
                muster.bearbeitung,
                muster.palette,
                antwort.palette,
              ),
              palette: antwort.palette,
              kennzahlen: antwort.kennzahlen,
              farbenVorher: antwort.farbenVorher,
              farbenNachher: antwort.farbenNachher,
              garneZusammengelegt: antwort.garneZusammengelegt,
              bildKennung: muster.bildKennung,
            },
          });
        })
        .finally(() => {
          setLaeuft(false);
          setFortschritt(null);
        });
    },
    [muster, workerHolen],
  );

  const raster = useMemo(
    () => (muster ? zusammenfuehren(muster.basis, muster.bearbeitung) : null),
    [muster],
  );

  /**
   * Einen Stand sichern. Nimmt das Muster ausdrücklich entgegen, damit auch
   * direkt nach dem Erzeugen gesichert werden kann – dort steht der neue
   * Stand noch nicht im Zustand des Hooks.
   */
  const sichern = useCallback(
    async (zuSichern: Muster, beschriftung: Textschluessel, gemerkt: boolean) => {
      const ergebnis = await standSichern({
        musterId,
        elternId: versionId,
        name: bild?.name ?? "Muster",
        beschriftung,
        gemerkt,
        breite: zuSichern.breite,
        hoehe: zuSichern.hoehe,
        basis: zuSichern.basis,
        bearbeitung: zuSichern.bearbeitung,
        raster: zusammenfuehren(zuSichern.basis, zuSichern.bearbeitung),
        palette: zuSichern.palette,
        einstellungen,
        quellbild: musterId ? null : (bild?.blob ?? null),
      });
      if (!ergebnis) return false;
      setMusterId(ergebnis.musterId);
      setVersionId(ergebnis.standId);
      setStandZaehler((z) => z + 1);
      return true;
    },
    [musterId, versionId, bild, einstellungen],
  );

  useEffect(() => {
    sichernRef.current = sichern;
  }, [sichern]);

  const standAnlegen = useCallback(
    async (beschriftung: Textschluessel, gemerkt = false) => {
      if (!muster) return false;
      return sichern(muster, beschriftung, gemerkt);
    },
    [muster, sichern],
  );

  /**
   * Ein alter Stand wird wieder eingesetzt. Er wird zum Elternteil des
   * nächsten Standes – so entsteht der Baum, statt dass die Nutzerin den
   * neueren Stand verliert.
   */
  const standUebernehmen = useCallback((stand: Stand, neuesMuster: Muster) => {
    setMusterId(stand.musterId);
    setVersionId(stand.id);
    ausloesen({ art: "ersetzen", muster: neuesMuster });
  }, []);

  const wert = useMemo<MusterKontext>(
    () => ({
      bild,
      bildWaehlen,
      ausschnittSetzen,
      bildEntfernen,
      einstellungen,
      einstellungenSetzen: (teil) => setEinstellungen((e) => ({ ...e, ...teil })),
      alleGarne,
      garne,
      garneNeuLaden,
      muster,
      raster,
      laeuft,
      fortschritt,
      fehler,
      fehlerSetzen: setFehler,
      erzeugen,
      glaettungSetzen,
      felderAendern: (titel, indizes, werte) =>
        ausloesen({ art: "felderAendern", titel, indizes, werte }),
      bearbeitungErsetzen: (titel, neue) =>
        ausloesen({ art: "bearbeitungErsetzen", titel, neue }),
      paletteErsetzen: (palette) => ausloesen({ art: "paletteErsetzen", palette }),
      musterErsetzen: (m) => ausloesen({ art: "ersetzen", muster: m }),
      musterId,
      versionId,
      standZaehler,
      standAnlegen,
      standUebernehmen,
      rueckgaengig: () => ausloesen({ art: "rueckgaengig" }),
      wiederholen: () => ausloesen({ art: "wiederholen" }),
      kannRueckgaengig: zustand.rueckgaengigStapel.length > 0,
      kannWiederholen: zustand.wiederholenStapel.length > 0,
      letzterSchrittTitel:
        zustand.rueckgaengigStapel[zustand.rueckgaengigStapel.length - 1]?.titel ?? null,
      naechsterSchrittTitel:
        zustand.wiederholenStapel[zustand.wiederholenStapel.length - 1]?.titel ?? null,
    }),
    [
      bild,
      bildWaehlen,
      ausschnittSetzen,
      bildEntfernen,
      einstellungen,
      alleGarne,
      garne,
      garneNeuLaden,
      muster,
      raster,
      laeuft,
      fortschritt,
      fehler,
      erzeugen,
      glaettungSetzen,
      musterId,
      versionId,
      standZaehler,
      standAnlegen,
      standUebernehmen,
      zustand.rueckgaengigStapel,
      zustand.wiederholenStapel,
    ],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

function begrenzen(stufe: number): number {
  return Math.min(GLAETTUNGSSTUFEN.length - 1, Math.max(0, Math.round(stufe)));
}

/** Einen Auftrag an den Worker schicken und auf genau eine Antwort warten. */
function anWorkerSenden(
  worker: Worker,
  wartend: React.RefObject<((w: AntwortVomWorker) => void) | null>,
  auftrag: AnWorker,
  transfer: Transferable[] = [],
): Promise<AntwortVomWorker> {
  return new Promise((aufloesen) => {
    wartend.current = (nachricht) => {
      wartend.current = null;
      aufloesen(nachricht);
    };
    worker.postMessage(auftrag, transfer);
  });
}
