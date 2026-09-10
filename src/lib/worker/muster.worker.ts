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
 * Änderung des Glättungsreglers nur noch die vier ICM-Durchläufe. Der
 * Farbregler setzt eine Stufe früher an – er rechnet ab dem k-Means neu, das
 * Bild wird auch dafür kein zweites Mal gelesen.
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
   * `roh` ist, was aus dem Bild herauskam; `gefiltert` dasselbe, nachdem der
   * Medianfilter einzelne Ausreißer herausgenommen hat. Beide bleiben
   * liegen, damit sowohl der Farbregler als auch das linke Ende des
   * Detailreglers ab dem k-Means neu rechnen können, ohne das Bild noch
   * einmal zu lesen. Selbst beim größten Muster sind das zusammen keine
   * 4 MB – gegen einen zweiten Durchlauf über das ganze Foto ist das nichts.
   */
  labRoh: Float32Array;
  labGefiltert: Float32Array;
  /** Mit welcher der beiden Fassungen die Palette gerade gerechnet ist. */
  medianAn: boolean;
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
    } else if (e.data.art === "farben") {
      farbenNeu(e.data);
    } else if (e.data.art === "glaetten") {
      nurGlaetten(e.data.lambda, e.data.mindestFlaeche);
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
  "medianAn" | "paletteLab" | "garne" | "tabelle" | "startRaster" | "farbenVorher" | "garneZusammengelegt"
>;

/**
 * Palette und Abstandsliste bestimmen – alles ab dem k-Means.
 *
 * Das ist der Schritt, den beide Regler an ihren Enden brauchen: der
 * Farbregler, weil sich die Zahl der Cluster ändert, und der Detailregler am
 * linken Anschlag, weil er auf das ungefilterte Raster umschaltet. Das Bild
 * wird dafür nie noch einmal angefasst.
 */
function paletteRechnen(
  breite: number,
  hoehe: number,
  lab: Float32Array,
  median: boolean,
  farbanzahl: number,
  garne: Garn[],
): Palettenstand {
  fortschritt("arbeit.farbenFassen", 0.4);
  const cluster = kmeans({ breite, hoehe, lab }, farbanzahl);

  fortschritt("arbeit.garneSuchen", 0.6);
  const zuordnung = aufGarneAbbilden(cluster.zentren, garne);

  fortschritt("arbeit.vorbereiten", 0.7);
  const tabelle = abstandslisteBauen(lab, zuordnung.farben);

  return {
    medianAn: median,
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
  const { bild, breiteStiche, hoeheStiche, farbanzahl, lambda, mindestFlaeche, median, garne } =
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
  // Beide Fassungen werden aufgehoben. Gerechnet wird gleich mit der, die der
  // Regler meint; die andere kostet einmal Rechenzeit und erspart später
  // einen vollen Durchlauf, wenn die Nutzerin ans linke Ende geht.
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
    ...paletteRechnen(
      roh.breite,
      roh.hoehe,
      median ? gefiltert.lab : roh.lab,
      median,
      farbanzahl,
      garne,
    ),
  };

  nurGlaetten(lambda, mindestFlaeche);
}

// ---------------------------------------------------------------------------
// Nur die Farbzahl – das läuft bei jedem Zug am Farbregler
// ---------------------------------------------------------------------------

/**
 * Ein neues k-Means auf demselben heruntergerechneten Raster.
 *
 * Alles, was vor der Farbreduktion liegt – Bild lesen, herunterrechnen,
 * Medianfilter – hängt nicht an der Farbzahl und wird deshalb nicht noch
 * einmal gerechnet. Übrig bleiben k-Means, die Garnzuordnung und die
 * Abstandsliste; dahinter läuft dieselbe Glättung wie sonst auch.
 */
function farbenNeu(auftrag: Extract<AnWorker, { art: "farben" }>) {
  if (!stand) {
    melden({ art: "fehler", text: "arbeit.fehlerKeinMuster" });
    return;
  }

  stand = {
    ...stand,
    ...paletteRechnen(
      stand.breite,
      stand.hoehe,
      auftrag.median ? stand.labGefiltert : stand.labRoh,
      auftrag.median,
      auftrag.farbanzahl,
      auftrag.garne,
    ),
  };

  nurGlaetten(auftrag.lambda, auftrag.mindestFlaeche);
}

// ---------------------------------------------------------------------------
// Nur die Glättung – das läuft bei jedem Zug am Schieberegler
// ---------------------------------------------------------------------------

function nurGlaetten(lambda: number, mindestFlaeche: number) {
  if (!stand) {
    melden({ art: "fehler", text: "arbeit.fehlerKeinMuster" });
    return;
  }

  fortschritt("arbeit.glaetten", 0.85);

  const k = stand.paletteLab.length;
  const { raster, kennzahlen } = glaetten(
    stand.startRaster,
    stand.tabelle,
    stand.breite,
    lambda,
    mindestFlaeche,
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

