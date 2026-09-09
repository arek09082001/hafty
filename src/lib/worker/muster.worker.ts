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
 * der Grund, warum sich der Glättungsregler live anfühlt: Herunterrechnen,
 * Filtern, k-Means und die Abstandstabelle laufen einmal, danach kostet eine
 * Änderung des Reglers nur noch die vier ICM-Durchläufe.
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
  abstandstabelleBauen,
  glaetten,
  ohneGlaettungZuordnen,
  paletteNeuZaehlen,
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
  /** Palettenfarben im Lab-Raum (nach dem Garnmapping). */
  paletteLab: Lab[];
  /** Die zugehörigen Garne, oder lauter null ohne Katalog. */
  garne: (Garn | null)[];
  /** Abstand jedes Feldes zu jeder Palettenfarbe. */
  tabelle: Float32Array;
  /** Zuordnung ohne jede Glättung – Ausgangspunkt jedes ICM-Laufs. */
  startRaster: Uint8Array;
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

function erzeugen(auftrag: Extract<AnWorker, { art: "erzeugen" }>) {
  const { bild, breiteStiche, hoeheStiche, farbanzahl, lambda, mindestFlaeche, garne } = auftrag;

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
  let raster: Rasterbild = herunterrechnen(quelle, breiteStiche, hoeheStiche);

  // --- Schritt 3: kantenerhaltender Filter ---------------------------------
  fortschritt("arbeit.rauschen", 0.3);
  raster = medianFilter(raster);

  // --- Schritt 5: Farbreduktion --------------------------------------------
  // (Schritt 4, die Umrechnung nach CIELAB, ist beim Herunterrechnen schon
  //  passiert: das Raster liegt von Anfang an in Lab vor.)
  fortschritt("arbeit.farbenFassen", 0.4);
  const cluster = kmeans(raster, farbanzahl);

  // --- Schritt 6: auf reale Garne abbilden ---------------------------------
  fortschritt("arbeit.garneSuchen", 0.6);
  const zuordnung = aufGarneAbbilden(cluster.zentren, garne);

  // --- Abstandstabelle: die Grundlage für alles Weitere ---------------------
  fortschritt("arbeit.vorbereiten", 0.7);
  const tabelle = abstandstabelleBauen(raster.lab, zuordnung.farben);

  // Ausgangszuordnung: jedes Feld bekommt die farblich nächste Palettenfarbe.
  const startRaster = ohneGlaettungZuordnen(tabelle, zuordnung.farben.length);

  stand = {
    breite: raster.breite,
    hoehe: raster.hoehe,
    paletteLab: zuordnung.farben,
    garne: zuordnung.garne,
    tabelle,
    startRaster,
    farbenVorher: cluster.k,
    garneZusammengelegt: zuordnung.zusammengelegt,
  };

  nurGlaetten(lambda, mindestFlaeche);
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
    k,
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

