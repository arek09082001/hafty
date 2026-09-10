/** Die Nachrichten zwischen Seite und Web Worker. */

import type { Garn, Kennzahlen, PalettenEintrag } from "@/lib/muster/typen";
import type { Textschluessel } from "@/lib/sprache/texte";

export type AnWorker =
  | {
      art: "erzeugen";
      bild: ImageBitmap;
      breiteStiche: number;
      hoeheStiche: number;
      farbanzahl: number;
      lambda: number;
      flaechenAnteil: number;
      verlaufStaerke: number;
      garne: Garn[];
    }
  /** Nur die Glättung neu rechnen – die teure Vorarbeit bleibt im Worker. */
  | { art: "glaetten"; lambda: number; flaechenAnteil: number; verlaufStaerke: number };

export type VomWorker =
  /** `text` ist ein Textschlüssel; übersetzt wird erst in der Oberfläche. */
  | { art: "fortschritt"; text: Textschluessel; anteil: number }
  | {
      art: "fertig";
      breite: number;
      hoehe: number;
      raster: Uint16Array;
      palette: PalettenEintrag[];
      kennzahlen: Kennzahlen;
      farbenVorher: number;
      farbenNachher: number;
      /** Wie viele Cluster auf dasselbe Garn gefallen sind. */
      garneZusammengelegt: number;
    }
  | { art: "fehler"; text: Textschluessel };

/** Die abschließende Antwort auf einen Auftrag – ohne Fortschrittsmeldungen. */
export type AntwortVomWorker = Exclude<VomWorker, { art: "fortschritt" }>;
