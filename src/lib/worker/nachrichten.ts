/** Die Nachrichten zwischen Seite und Web Worker. */

import type { Garn, Kennzahlen, PalettenEintrag } from "@/lib/muster/typen";

export type AnWorker =
  | {
      art: "erzeugen";
      bild: ImageBitmap;
      breiteStiche: number;
      hoeheStiche: number;
      farbanzahl: number;
      lambda: number;
      mindestFlaeche: number;
      garne: Garn[];
      dithering: boolean;
    }
  /** Nur die Glättung neu rechnen – die teure Vorarbeit bleibt im Worker. */
  | { art: "glaetten"; lambda: number; mindestFlaeche: number };

export type VomWorker =
  | { art: "fortschritt"; text: string; anteil: number }
  | {
      art: "fertig";
      breite: number;
      hoehe: number;
      raster: Uint8Array;
      palette: PalettenEintrag[];
      kennzahlen: Kennzahlen;
      farbenVorher: number;
      farbenNachher: number;
      /** Wie viele Cluster auf dasselbe Garn gefallen sind. */
      garneZusammengelegt: number;
    }
  | { art: "fehler"; text: string };

/** Die abschließende Antwort auf einen Auftrag – ohne Fortschrittsmeldungen. */
export type AntwortVomWorker = Exclude<VomWorker, { art: "fortschritt" }>;
