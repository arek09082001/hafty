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
  naechsterIndex,
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
  const { bild, breiteStiche, hoeheStiche, farbanzahl, lambda, mindestFlaeche, garne, dithering } =
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
  const startRaster = dithering
    ? mitDitheringZuordnen(raster, zuordnung.farben)
    : ohneGlaettungZuordnen(tabelle, zuordnung.farben.length);

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

// ---------------------------------------------------------------------------
// Dithering – standardmäßig aus
// ---------------------------------------------------------------------------

/**
 * Floyd-Steinberg-Fehlerdiffusion im Lab-Raum.
 *
 * Dithering täuscht Zwischentöne vor, indem es zwei Farben abwechselnd
 * nebeneinandersetzt. Auf einem Bildschirm sieht das gut aus, auf einem
 * Stickrahmen ist es das Gegenteil von dem, was diese App will: es erzeugt
 * genau die einzelnen Fremdstiche, gegen die die Glättung antritt. Deshalb
 * ist es voreingestellt **aus** und nur als abschaltbare Zusatzoption da.
 */
function mitDitheringZuordnen(bild: Rasterbild, palette: Lab[]): Uint8Array {
  const { breite, hoehe } = bild;
  // Auf einer Kopie arbeiten, in die der Fehler eingerechnet wird.
  const arbeit = Float32Array.from(bild.lab);
  const raster = new Uint8Array(breite * hoehe);

  const streuen = (x: number, y: number, dL: number, da: number, db: number, anteil: number) => {
    if (x < 0 || x >= breite || y < 0 || y >= hoehe) return;
    const j = (y * breite + x) * 3;
    arbeit[j] += dL * anteil;
    arbeit[j + 1] += da * anteil;
    arbeit[j + 2] += db * anteil;
  };

  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const i = y * breite + x;
      const j = i * 3;
      const farbe: Lab = { L: arbeit[j], a: arbeit[j + 1], b: arbeit[j + 2] };

      const gewaehlt = naechsterIndex(farbe, palette);
      raster[i] = gewaehlt;

      // Der Fehler, den die Wahl macht, wird auf die noch nicht bearbeiteten
      // Nachbarn verteilt: 7/16 rechts, 3/16 links unten, 5/16 unten,
      // 1/16 rechts unten.
      const dL = farbe.L - palette[gewaehlt].L;
      const da = farbe.a - palette[gewaehlt].a;
      const db = farbe.b - palette[gewaehlt].b;

      streuen(x + 1, y, dL, da, db, 7 / 16);
      streuen(x - 1, y + 1, dL, da, db, 3 / 16);
      streuen(x, y + 1, dL, da, db, 5 / 16);
      streuen(x + 1, y + 1, dL, da, db, 1 / 16);
    }
  }

  return raster;
}
