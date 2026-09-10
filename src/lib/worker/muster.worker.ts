/// <reference lib="webworker" />
/**
 * Der Web Worker, in dem die gesamte Bildverarbeitung läuft.
 *
 * Nichts davon geht über einen Server: Das Bild wird als ImageBitmap
 * hereingereicht, auf einem OffscreenCanvas ausgelesen und hier gerechnet.
 * Der Hauptthread bleibt dabei frei, damit die Oberfläche auf einem Tablet
 * nicht einfriert, während 30 Millionen Abstände berechnet werden.
 *
 * Zwischen zwei Aufträgen behält der Worker seine Zwischenergebnisse. Das ist
 * der Grund, warum sich die beiden Regler live anfühlen: Herunterrechnen,
 * Filtern, k-Means und die Abstandsliste laufen einmal, danach kostet eine
 * Änderung des Detailreglers nur noch die Fehlerdiffusion, die vier
 * ICM-Durchläufe und den Aufräumdurchgang – zehn bis hundertfünfzig
 * Millisekunden auch beim größten Muster.
 */

import {
  herunterrechnen,
  kmeans,
  medianFilter,
  aufGarneAbbilden,
  labAlsHex,
  type Rasterbild,
} from "@/lib/muster/pipeline";
import {
  abstandslisteBauen,
  glaetten,
  verlaufZuordnen,
  ohneGlaettungZuordnen,
  paletteNeuZaehlen,
  type Abstandsliste,
} from "@/lib/muster/glaettung";
import { symboleVerteilen } from "@/lib/muster/symbole";
import type { Garn, PalettenEintrag } from "@/lib/muster/typen";
import type { Lab } from "@/lib/farbe/lab";
import type { AnWorker, VomWorker } from "./nachrichten";
import type { Textschluessel } from "@/lib/sprache/texte";

const eigen = self as unknown as DedicatedWorkerGlobalScope;

/** Alles, was zwischen zwei Aufträgen erhalten bleibt. */
type Zwischenstand = {
  breite: number;
  hoehe: number;
  /**
   * Das heruntergerechnete Raster in Lab – in beiden Fassungen.
   *
   * Die beiden haben verschiedene Aufgaben, und deshalb liegen beide hier:
   *
   *  - `labGefiltert` (Medianfilter) geht ins **k-Means**. Einzelne
   *    Ausreißer sollen keine eigene Garnfarbe bekommen; die Palette wird
   *    ruhiger, wenn sie aus dem gefilterten Raster kommt.
   *  - `labRoh` geht in die **Abstandsliste**, also in die Zuordnung Feld
   *    für Feld. Was das Foto an dieser Stelle wirklich hatte, steht nur
   *    hier – und ganz links am Regler will die Nutzerin genau das sehen.
   *
   * Nur `labRoh` wird bei einer neuen Farbzahl noch einmal gebraucht.
   * Beide zusammen sind selbst beim größten Muster keine 4 MB.
   */
  labRoh: Float32Array;
  labGefiltert: Float32Array;
  /** Palettenfarben im Lab-Raum (nach dem Garnmapping). */
  paletteLab: Lab[];
  /** Die zugehörigen Garne, oder lauter null ohne Katalog. */
  garne: (Garn | null)[];
  /** Je Feld die nächstliegenden Palettenfarben mit ihrem Abstand. */
  tabelle: Abstandsliste;
  /** Zuordnung ohne jede Glättung – Ausgangspunkt jedes ICM-Laufs. */
  startRaster: Uint16Array;
  /** Wie viele Farben das k-Means gefunden hat. */
  farbenVorher: number;
  garneZusammengelegt: number;
};

let stand: Zwischenstand | null = null;

function melden(nachricht: VomWorker, transfer: Transferable[] = []) {
  eigen.postMessage(nachricht, transfer);
}

function fortschritt(text: Textschluessel, anteil: number) {
  melden({ art: "fortschritt", text, anteil });
}

eigen.addEventListener("message", (e: MessageEvent<AnWorker>) => {
  try {
    if (e.data.art === "erzeugen") {
      erzeugen(e.data);
    } else if (e.data.art === "glaetten") {
      nurGlaetten(e.data.lambda, e.data.flaechenAnteil, e.data.verlaufStaerke);
    }
  } catch (fehler) {
    // Die Nutzerin bekommt nie den technischen Text zu sehen, aber für die
    // Fehlersuche in der Entwicklung ist er nützlich.
    console.error(fehler);
    melden({ art: "fehler", text: "arbeit.fehlerBerechnung" });
  }
});

// ---------------------------------------------------------------------------
// Der volle Lauf
// ---------------------------------------------------------------------------

/** Der Teil des Zwischenstands, der an der Palette hängt. */
type Palettenstand = Pick<
  Zwischenstand,
  "paletteLab" | "garne" | "tabelle" | "startRaster" | "farbenVorher" | "garneZusammengelegt"
>;

/**
 * Palette und Abstandsliste bestimmen – alles ab dem k-Means.
 *
 * Das braucht nur der volle Lauf. Der Detailregler kommt nicht hierher: er
 * ändert weder Palette noch Abstandsliste und damit auch nicht die Garnliste
 * unter der Hand der Nutzerin.
 *
 * Die beiden Raster gehen an verschiedene Stellen: das gefilterte ins
 * k-Means, das rohe in die Abstandsliste (siehe `Zwischenstand`).
 */
function paletteRechnen(
  breite: number,
  hoehe: number,
  labGefiltert: Float32Array,
  labRoh: Float32Array,
  farbanzahl: number,
  garne: Garn[],
): Palettenstand {
  fortschritt("arbeit.farbenFassen", 0.4);
  const cluster = kmeans({ breite, hoehe, lab: labGefiltert }, farbanzahl);

  fortschritt("arbeit.garneSuchen", 0.6);
  const zuordnung = aufGarneAbbilden(cluster.zentren, garne);

  fortschritt("arbeit.vorbereiten", 0.7);
  const tabelle = abstandslisteBauen(labRoh, zuordnung.farben);

  return {
    paletteLab: zuordnung.farben,
    garne: zuordnung.garne,
    tabelle,
    // Ausgangszuordnung: jedes Feld bekommt die farblich nächste Farbe.
    startRaster: ohneGlaettungZuordnen(tabelle),
    farbenVorher: cluster.k,
    garneZusammengelegt: zuordnung.zusammengelegt,
  };
}

function erzeugen(auftrag: Extract<AnWorker, { art: "erzeugen" }>) {
  const { bild, breiteStiche, hoeheStiche, farbanzahl, lambda, flaechenAnteil, verlaufStaerke, garne } =
    auftrag;

  // --- Schritt 1: Bild als ImageData ---------------------------------------
  fortschritt("arbeit.bildLesen", 0.05);
  const leinwand = new OffscreenCanvas(bild.width, bild.height);
  const stift = leinwand.getContext("2d", { willReadFrequently: true });
  if (!stift) throw new Error("Kein 2D-Kontext auf dem OffscreenCanvas.");
  stift.drawImage(bild, 0, 0);
  const quelle = stift.getImageData(0, 0, bild.width, bild.height);
  bild.close();

  // --- Schritt 2: auf das Stichraster herunterrechnen -----------------------
  fortschritt("arbeit.herunterrechnen", 0.15);
  const roh: Rasterbild = herunterrechnen(quelle, breiteStiche, hoeheStiche);

  // --- Schritt 3: kantenerhaltender Filter ---------------------------------
  // Beide Fassungen werden aufgehoben: die gefilterte für das k-Means, die
  // rohe für die Zuordnung Feld für Feld (siehe `Zwischenstand`).
  fortschritt("arbeit.rauschen", 0.3);
  const gefiltert = medianFilter(roh);

  // --- Schritt 5 und 6: Farbreduktion und Garne ----------------------------
  // (Schritt 4, die Umrechnung nach CIELAB, ist beim Herunterrechnen schon
  //  passiert: das Raster liegt von Anfang an in Lab vor.)
  stand = {
    breite: roh.breite,
    hoehe: roh.hoehe,
    labRoh: roh.lab,
    labGefiltert: gefiltert.lab,
    ...paletteRechnen(roh.breite, roh.hoehe, gefiltert.lab, roh.lab, farbanzahl, garne),
  };

  nurGlaetten(lambda, flaechenAnteil, verlaufStaerke);
}

// ---------------------------------------------------------------------------
// Nur die Glättung – das läuft bei jedem Zug am Schieberegler
// ---------------------------------------------------------------------------

function nurGlaetten(lambda: number, flaechenAnteil: number, verlaufStaerke: number) {
  if (!stand) {
    melden({ art: "fehler", text: "arbeit.fehlerKeinMuster" });
    return;
  }

  fortschritt("arbeit.glaetten", 0.85);

  const k = stand.paletteLab.length;

  // Ganz links am Regler wird der Farbverlauf nachgeahmt. Das ändert nicht
  // die Glättung, sondern schon den Ausgangspunkt: statt jedem Feld einfach
  // sein nächstes Garn zu geben, wird der Fehler dieser Wahl an die Nachbarn
  // weitergereicht (siehe `verlaufZuordnen`). Rund 15 ms beim größten
  // Muster – der Regler bleibt also flüssig.
  const start =
    verlaufStaerke > 0
      ? verlaufZuordnen(stand.tabelle, stand.breite, verlaufStaerke)
      : stand.startRaster;

  const { raster, kennzahlen } = glaetten(
    start,
    stand.tabelle,
    stand.breite,
    lambda,
    flaechenAnteil,
  );

  // Nach der Glättung neu zählen: welche Farben kommen überhaupt noch vor?
  const { abbildung, stiche, anzahl } = paletteNeuZaehlen(raster, k);

  // Raster auf die neuen, lückenlosen Indizes umschreiben.
  if (anzahl < k) {
    for (let i = 0; i < raster.length; i++) raster[i] = abbildung[raster[i]];
  }

  const symbole = symboleVerteilen(stiche);
  const palette: PalettenEintrag[] = [];

  for (let alt = 0; alt < k; alt++) {
    const neu = abbildung[alt];
    if (neu < 0) continue;
    const farbe = stand.paletteLab[alt];
    const garn = stand.garne[alt];
    palette[neu] = {
      index: neu,
      hex: garn ? garn.hex : labAlsHex(farbe),
      L: farbe.L,
      a: farbe.a,
      b: farbe.b,
      garn,
      symbol: symbole[neu],
      stiche: stiche[neu],
    };
  }

  melden(
    {
      art: "fertig",
      breite: stand.breite,
      hoehe: stand.hoehe,
      raster,
      palette,
      kennzahlen,
      farbenVorher: stand.farbenVorher,
      farbenNachher: anzahl,
      garneZusammengelegt: stand.garneZusammengelegt,
    },
    [raster.buffer],
  );
}

