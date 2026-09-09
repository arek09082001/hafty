"use client";

/**
 * Das Muster als PDF – vollständig im Browser erzeugt.
 * ---------------------------------------------------------------------------
 *
 * Aufbau des Ausdrucks:
 *
 *   1. Vorschau der fertigen Stickerei, dazu ein kleiner Blattplan, wenn das
 *      Muster über mehrere Blätter geht
 *   2. Garnliste mit Symbol, Garnnummer, Farbname, Anzahl der Stiche und
 *      geschätztem Garnverbrauch in Metern
 *   3. Das Muster in Farbe mit Symbolen, Blatt für Blatt
 *
 * Die Blätter überlappen sich um zwei Reihen, damit beim Zusammenlegen
 * nichts verlorengeht. Jede zehnte Rasterlinie ist dicker, und an allen
 * vier Rändern stehen die Reihen- und Spaltennummern – so lässt sich auf
 * dem Papier genauso zählen wie auf dem Stoff.
 *
 * Zur Schrift: die eingebauten Schriften eines PDF können nur WinAnsi und
 * damit kein einziges polnisches Sonderzeichen – „Wzór" allein bringt sie
 * zum Absturz. Deshalb wird eine echte Schriftdatei mitgeliefert und
 * eingebettet. Sie ist auf die gebrauchten Zeichen zusammengestrichen und
 * dadurch nur rund 20 kB groß (siehe scripts/schrift-verkleinern.mjs).
 */

import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { hexNachRgb, istDunkel } from "@/lib/farbe/lab";
import { garnname } from "@/lib/farbe/farbwort";
import { cmText, sticheInCm, type PalettenEintrag } from "@/lib/muster/typen";
import { freieFelder } from "@/lib/muster/raster";
import { garnlaengeMeter, meterText } from "./garnverbrauch";
import type { Textschluessel } from "@/lib/sprache/texte";

/** A4 hochkant in Punkten. */
const SEITE_BREITE = 595.28;
const SEITE_HOEHE = 841.89;
const RAND = 34;
/** Platz für die Kopfzeile über dem Raster. */
const KOPF_HOEHE = 54;
/** Platz für die Zahlenleisten links und oben. */
const LEISTE = 20;
/** Überlappung zwischen zwei Blättern, in Stichen. */
const UEBERLAPPUNG = 2;
/** Kleinste und größte Kästchengröße in Punkten (1 pt = 0,353 mm). */
const MIN_KAESTCHEN = 11;
const MAX_KAESTCHEN = 22;

const SCHWARZ = rgb(0, 0, 0);
const GRAU = rgb(0.55, 0.55, 0.55);
const HELLGRAU = rgb(0.82, 0.82, 0.82);

/** Übersetzen und Zahlen schreiben – der Ausdruck folgt der Sprache der App. */
export type Uebersetzer = (schluessel: Textschluessel, werte?: Record<string, string>) => string;

export type Druckauftrag = {
  name: string;
  breite: number;
  hoehe: number;
  raster: Uint8Array;
  /**
   * Nur die Farben, die im Muster wirklich vorkommen. Angesprochen wird sie
   * über `index` und nie über die Stelle in der Liste – Felder, die nicht
   * gestickt werden, haben gar keinen Eintrag.
   */
  palette: PalettenEintrag[];
  stoffzaehlung: number;
  t: Uebersetzer;
  zahl: (n: number) => string;
  landeskennung: string;
  /** Wird bei jedem Abschnitt aufgerufen, damit die Seite etwas anzeigen kann. */
  melden?: (text: Textschluessel, anteil: number) => void;
};

type Blattplan = {
  kaestchen: number;
  spaltenJeBlatt: number;
  reihenJeBlatt: number;
  blaetterWaagerecht: number;
  blaetterSenkrecht: number;
  blaetter: Array<{ x0: number; y0: number; x1: number; y1: number; spalte: number; reihe: number }>;
};

/**
 * Aufteilung auf Blätter. Passt das ganze Muster auf ein Blatt, werden die
 * Kästchen so groß wie möglich gemacht – für müde Augen zählt jeder
 * Millimeter.
 */
function blattplan(breite: number, hoehe: number): Blattplan {
  const nutzbarBreite = SEITE_BREITE - 2 * RAND - LEISTE;
  const nutzbarHoehe = SEITE_HOEHE - 2 * RAND - KOPF_HOEHE - LEISTE;

  const passtGanz = Math.min(nutzbarBreite / breite, nutzbarHoehe / hoehe);
  const kaestchen =
    passtGanz >= MIN_KAESTCHEN
      ? Math.min(MAX_KAESTCHEN, passtGanz)
      : MIN_KAESTCHEN;

  const spaltenJeBlatt = Math.max(1, Math.floor(nutzbarBreite / kaestchen));
  const reihenJeBlatt = Math.max(1, Math.floor(nutzbarHoehe / kaestchen));

  // Wegen der Überlappung rückt jedes Blatt nur um (Anzahl - Überlappung) weiter.
  const schrittX = Math.max(1, spaltenJeBlatt - UEBERLAPPUNG);
  const schrittY = Math.max(1, reihenJeBlatt - UEBERLAPPUNG);

  const blaetterWaagerecht = breite <= spaltenJeBlatt ? 1 : Math.ceil((breite - UEBERLAPPUNG) / schrittX);
  const blaetterSenkrecht = hoehe <= reihenJeBlatt ? 1 : Math.ceil((hoehe - UEBERLAPPUNG) / schrittY);

  const blaetter: Blattplan["blaetter"] = [];
  for (let reihe = 0; reihe < blaetterSenkrecht; reihe++) {
    for (let spalte = 0; spalte < blaetterWaagerecht; spalte++) {
      const x0 = Math.min(spalte * schrittX, Math.max(0, breite - spaltenJeBlatt));
      const y0 = Math.min(reihe * schrittY, Math.max(0, hoehe - reihenJeBlatt));
      blaetter.push({
        x0,
        y0,
        x1: Math.min(breite, x0 + spaltenJeBlatt),
        y1: Math.min(hoehe, y0 + reihenJeBlatt),
        spalte,
        reihe,
      });
    }
  }

  return { kaestchen, spaltenJeBlatt, reihenJeBlatt, blaetterWaagerecht, blaetterSenkrecht, blaetter };
}

/**
 * Die Palette nach ihrem Index sortiert ablegen.
 *
 * Das Raster hält Indizes, die Liste ist aber gefiltert – die Stelle in der
 * Liste sagt deshalb nichts über die Farbe. Ein Griff daneben würde ein
 * Muster mit falschen Farben ausdrucken, und das fiele erst am Stickrahmen
 * auf.
 */
function paletteNachIndex(palette: PalettenEintrag[]): Array<PalettenEintrag | undefined> {
  const nachIndex: Array<PalettenEintrag | undefined> = [];
  for (const eintrag of palette) nachIndex[eintrag.index] = eintrag;
  return nachIndex;
}

/** Kopfzeile eines Blattes. */
function kopfzeileZeichnen(
  seite: PDFPage,
  fett: PDFFont,
  normal: PDFFont,
  titel: string,
  zeile2: string,
  zeile3: string,
) {
  seite.drawText(titel, {
    x: RAND,
    y: SEITE_HOEHE - RAND - 14,
    size: 14,
    font: fett,
    color: SCHWARZ,
  });
  seite.drawText(zeile2, {
    x: RAND,
    y: SEITE_HOEHE - RAND - 30,
    size: 10,
    font: normal,
    color: SCHWARZ,
  });
  if (zeile3) {
    seite.drawText(zeile3, {
      x: RAND,
      y: SEITE_HOEHE - RAND - 44,
      size: 10,
      font: normal,
      color: SCHWARZ,
    });
  }
}

/** Ein Rasterblatt in Farbe zeichnen. */
function rasterBlattZeichnen(
  seite: PDFPage,
  fett: PDFFont,
  normal: PDFFont,
  auftrag: Druckauftrag,
  plan: Blattplan,
  blatt: Blattplan["blaetter"][number],
) {
  const { kaestchen } = plan;
  const spalten = blatt.x1 - blatt.x0;
  const reihen = blatt.y1 - blatt.y0;
  const nachIndex = paletteNachIndex(auftrag.palette);

  const links = RAND + LEISTE;
  const oben = SEITE_HOEHE - RAND - KOPF_HOEHE - LEISTE;
  const unten = oben - reihen * kaestchen;

  // --- Kästchen -----------------------------------------------------------
  const symbolGroesse = kaestchen * 0.62;
  for (let y = 0; y < reihen; y++) {
    for (let x = 0; x < spalten; x++) {
      const index = auftrag.raster[(blatt.y0 + y) * auftrag.breite + (blatt.x0 + x)];
      const eintrag = nachIndex[index];
      // Ohne Eintrag bleibt das Kästchen leer: dort wird nicht gestickt, und
      // genau so soll es auf dem Papier auch aussehen – nur die Rasterlinien
      // darum herum, damit sich weiterzählen lässt.
      if (!eintrag) continue;

      const px = links + x * kaestchen;
      const py = oben - (y + 1) * kaestchen;

      const [r, g, b] = hexNachRgb(eintrag.hex);
      seite.drawRectangle({
        x: px,
        y: py,
        width: kaestchen,
        height: kaestchen,
        color: rgb(r / 255, g / 255, b / 255),
      });
      const dunkel = istDunkel(r, g, b);

      // Das Symbol steht in jedem Kästchen: bei ähnlichen Farbtönen ist es
      // das Einzige, woran sich die Farben sicher unterscheiden lassen – und
      // es bleibt lesbar, wenn jemand das Muster doch am Graustufendrucker
      // ausdruckt.
      const breiteText = normal.widthOfTextAtSize(eintrag.symbol, symbolGroesse);
      seite.drawText(eintrag.symbol, {
        x: px + (kaestchen - breiteText) / 2,
        y: py + kaestchen * 0.26,
        size: symbolGroesse,
        font: normal,
        color: dunkel ? rgb(1, 1, 1) : SCHWARZ,
      });
    }
  }

  // --- Rasterlinien -------------------------------------------------------
  // Jede zehnte Linie ist dicker, gezählt ab dem Ursprung des Musters, nicht
  // ab dem Blattrand – sonst stimmten die Zehnerlinien beim Zusammenlegen
  // zweier Blätter nicht überein.
  for (let x = 0; x <= spalten; x++) {
    const absolut = blatt.x0 + x;
    const dick = absolut % 10 === 0;
    seite.drawLine({
      start: { x: links + x * kaestchen, y: oben },
      end: { x: links + x * kaestchen, y: unten },
      thickness: dick ? 1.4 : 0.4,
      color: dick ? SCHWARZ : HELLGRAU,
    });
  }
  for (let y = 0; y <= reihen; y++) {
    const absolut = blatt.y0 + y;
    const dick = absolut % 10 === 0;
    seite.drawLine({
      start: { x: links, y: oben - y * kaestchen },
      end: { x: links + spalten * kaestchen, y: oben - y * kaestchen },
      thickness: dick ? 1.4 : 0.4,
      color: dick ? SCHWARZ : HELLGRAU,
    });
  }

  // --- Zahlenleisten ------------------------------------------------------
  const zahlGroesse = Math.min(8, kaestchen * 0.55);
  for (let x = 0; x <= spalten; x += 10) {
    const absolut = blatt.x0 + x;
    if (absolut % 10 !== 0 || absolut === 0) continue;
    const text = String(absolut);
    seite.drawText(text, {
      x: links + x * kaestchen - normal.widthOfTextAtSize(text, zahlGroesse) / 2,
      y: oben + 6,
      size: zahlGroesse,
      font: normal,
      color: SCHWARZ,
    });
  }
  for (let y = 0; y <= reihen; y += 10) {
    const absolut = blatt.y0 + y;
    if (absolut % 10 !== 0 || absolut === 0) continue;
    const text = String(absolut);
    seite.drawText(text, {
      x: links - normal.widthOfTextAtSize(text, zahlGroesse) - 5,
      y: oben - y * kaestchen - zahlGroesse / 3,
      size: zahlGroesse,
      font: normal,
      color: SCHWARZ,
    });
  }

  // --- Fußzeile mit der Blattnummer ---------------------------------------
  const nummer = auftrag.t("pdf.blattFuss", {
    spalte: String(blatt.spalte + 1),
    reihe: String(blatt.reihe + 1),
  });
  seite.drawText(nummer, {
    x: RAND,
    y: RAND - 12,
    size: 9,
    font: fett,
    color: GRAU,
  });
}

/** Die Garnliste. Läuft bei vielen Farben über mehrere Seiten weiter. */
function legendeZeichnen(
  pdf: PDFDocument,
  fett: PDFFont,
  normal: PDFFont,
  auftrag: Druckauftrag,
) {
  const zeilenHoehe = 22;
  // Die Kopfzeile hat drei Zeilen, deshalb beginnt die Tabelle ein Stück
  // darunter – sonst schöbe sich die dritte Zeile in die Spaltentitel.
  const TABELLE_OBEN = SEITE_HOEHE - RAND - KOPF_HOEHE - 18;
  let seite = pdf.addPage([SEITE_BREITE, SEITE_HOEHE]);
  let y = TABELLE_OBEN;

  const t = auftrag.t;

  const kopf = () => {
    kopfzeileZeichnen(
      seite,
      fett,
      normal,
      t("pdf.garnliste"),
      t("pdf.garnlisteKopf", { anzahl: String(auftrag.palette.length), name: auftrag.name }),
      t("pdf.garnlisteHinweis"),
    );
    // Spaltenüberschriften
    seite.drawText(t("pdf.spalteSymbol"), { x: RAND, y, size: 9, font: fett, color: GRAU });
    seite.drawText(t("pdf.spalteGarn"), { x: RAND + 78, y, size: 9, font: fett, color: GRAU });
    seite.drawText(t("pdf.spalteFarbe"), { x: RAND + 190, y, size: 9, font: fett, color: GRAU });
    seite.drawText(t("pdf.spalteStiche"), { x: RAND + 372, y, size: 9, font: fett, color: GRAU });
    seite.drawText(t("pdf.spalteGarnNoetig"), { x: RAND + 442, y, size: 9, font: fett, color: GRAU });
    y -= 14;
    seite.drawLine({
      start: { x: RAND, y },
      end: { x: SEITE_BREITE - RAND, y },
      thickness: 1,
      color: SCHWARZ,
    });
    y -= zeilenHoehe;
  };

  kopf();

  for (const eintrag of auftrag.palette) {
    if (y < RAND + 30) {
      seite = pdf.addPage([SEITE_BREITE, SEITE_HOEHE]);
      y = TABELLE_OBEN;
      kopf();
    }

    const [r, g, b] = hexNachRgb(eintrag.hex);

    // Farbkästchen mit dem Symbol darin
    seite.drawRectangle({
      x: RAND,
      y: y - 4,
      width: 20,
      height: 20,
      color: rgb(r / 255, g / 255, b / 255),
      borderColor: SCHWARZ,
      borderWidth: 0.8,
    });
    seite.drawText(eintrag.symbol, {
      x: RAND + 10 - normal.widthOfTextAtSize(eintrag.symbol, 11) / 2,
      y: y + 2,
      size: 11,
      font: fett,
      color: istDunkel(r, g, b) ? rgb(1, 1, 1) : SCHWARZ,
    });

    // Nochmal groß daneben, damit das Symbol auch ohne Farbdruck lesbar ist
    seite.drawText(eintrag.symbol, {
      x: RAND + 30,
      y: y + 2,
      size: 12,
      font: fett,
      color: SCHWARZ,
    });

    const garnText = eintrag.garn
      ? `${eintrag.garn.marke} ${eintrag.garn.code}`
      : t("pdf.eigeneFarbe");
    const farbName = eintrag.garn
      ? garnname(eintrag.garn.name, eintrag.garn.hex, t)
      : eintrag.hex;

    seite.drawText(garnText, { x: RAND + 78, y: y + 2, size: 11, font: fett, color: SCHWARZ });
    seite.drawText(kuerzen(farbName, normal, 10, 175), {
      x: RAND + 190,
      y: y + 2,
      size: 10,
      font: normal,
      color: SCHWARZ,
    });
    seite.drawText(auftrag.zahl(eintrag.stiche), {
      x: RAND + 372,
      y: y + 2,
      size: 11,
      font: normal,
      color: SCHWARZ,
    });
    seite.drawText(
      meterText(garnlaengeMeter(eintrag.stiche, auftrag.stoffzaehlung), auftrag.landeskennung),
      {
        x: RAND + 442,
        y: y + 2,
        size: 11,
        font: normal,
        color: SCHWARZ,
      },
    );

    y -= zeilenHoehe;
    seite.drawLine({
      start: { x: RAND, y: y + zeilenHoehe - 6 },
      end: { x: SEITE_BREITE - RAND, y: y + zeilenHoehe - 6 },
      thickness: 0.3,
      color: HELLGRAU,
    });
  }

  // Summe
  const gesamtStiche = auftrag.palette.reduce((s, e) => s + e.stiche, 0);
  const gesamtMeter = auftrag.palette.reduce(
    (s, e) => s + garnlaengeMeter(e.stiche, auftrag.stoffzaehlung),
    0,
  );
  if (y < RAND + 30) {
    seite = pdf.addPage([SEITE_BREITE, SEITE_HOEHE]);
    y = TABELLE_OBEN;
  }
  seite.drawText(
    t("pdf.summe", {
      stiche: auftrag.zahl(gesamtStiche),
      garn: meterText(gesamtMeter, auftrag.landeskennung),
    }),
    { x: RAND, y: y - 6, size: 11, font: fett, color: SCHWARZ },
  );
}

function kuerzen(text: string, font: PDFFont, groesse: number, maxBreite: number): string {
  if (font.widthOfTextAtSize(text, groesse) <= maxBreite) return text;
  let gekuerzt = text;
  while (gekuerzt.length > 1 && font.widthOfTextAtSize(`${gekuerzt}…`, groesse) > maxBreite) {
    gekuerzt = gekuerzt.slice(0, -1);
  }
  return `${gekuerzt}…`;
}

/** Das fertige Muster als PNG, für die Vorschauseite. */
async function vorschauPng(auftrag: Druckauftrag): Promise<Uint8Array | null> {
  if (typeof document === "undefined") return null;

  const leinwand = document.createElement("canvas");
  leinwand.width = auftrag.breite;
  leinwand.height = auftrag.hoehe;
  const stift = leinwand.getContext("2d");
  if (!stift) return null;

  const bild = stift.createImageData(auftrag.breite, auftrag.hoehe);
  const farben: Array<[number, number, number] | undefined> = [];
  for (const eintrag of auftrag.palette) farben[eintrag.index] = hexNachRgb(eintrag.hex);
  // Freie Felder werden weiß gezeigt: auf dem Papier ist das der Stoff.
  for (let i = 0; i < auftrag.raster.length; i++) {
    const farbe = farben[auftrag.raster[i]] ?? [255, 255, 255];
    bild.data[i * 4] = farbe[0];
    bild.data[i * 4 + 1] = farbe[1];
    bild.data[i * 4 + 2] = farbe[2];
    bild.data[i * 4 + 3] = 255;
  }
  stift.putImageData(bild, 0, 0);

  const blob = await new Promise<Blob | null>((auf) => leinwand.toBlob((b) => auf(b), "image/png"));
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

/** Die erste Seite: so sieht die fertige Stickerei aus. */
async function vorschauSeite(
  pdf: PDFDocument,
  fett: PDFFont,
  normal: PDFFont,
  auftrag: Druckauftrag,
  plan: Blattplan,
) {
  const seite = pdf.addPage([SEITE_BREITE, SEITE_HOEHE]);
  const breiteCm = sticheInCm(auftrag.breite, auftrag.stoffzaehlung);
  const hoeheCm = sticheInCm(auftrag.hoehe, auftrag.stoffzaehlung);
  const frei = freieFelder(auftrag.raster);

  kopfzeileZeichnen(
    seite,
    fett,
    normal,
    auftrag.name,
    auftrag.t("pdf.fertigeGroesse", {
      breite: cmText(breiteCm, auftrag.landeskennung),
      hoehe: cmText(hoeheCm, auftrag.landeskennung),
      zaehlung: String(auftrag.stoffzaehlung),
    }),
    // Freie Felder gehören in dieselbe Zeile wie Stiche und Farben: das ist
    // die Zeile, die sagt, worauf man sich einstellen muss.
    auftrag.t("pdf.sticheFarben", {
      breite: String(auftrag.breite),
      hoehe: String(auftrag.hoehe),
      farben: String(auftrag.palette.length),
    }) +
      (frei > 0
        ? ` · ${auftrag.t("pdf.freieFelder", { anzahl: auftrag.zahl(frei) })}`
        : ""),
  );

  const png = await vorschauPng(auftrag);
  const platzBreite = SEITE_BREITE - 2 * RAND;
  const platzHoehe = SEITE_HOEHE - 2 * RAND - KOPF_HOEHE - 150;

  if (png) {
    const bild = await pdf.embedPng(png);
    const faktor = Math.min(platzBreite / auftrag.breite, platzHoehe / auftrag.hoehe);
    const w = auftrag.breite * faktor;
    const h = auftrag.hoehe * faktor;
    seite.drawImage(bild, {
      x: (SEITE_BREITE - w) / 2,
      y: SEITE_HOEHE - RAND - KOPF_HOEHE - h,
      width: w,
      height: h,
    });
  }

  // --- Blattplan, wenn es mehr als ein Blatt gibt -------------------------
  let y = RAND + 130;
  if (plan.blaetter.length > 1) {
    seite.drawText(auftrag.t("pdf.blaetterZusammen"), {
      x: RAND,
      y,
      size: 12,
      font: fett,
      color: SCHWARZ,
    });
    y -= 12;

    const feldBreite = 34;
    const feldHoehe = 24;
    for (let reihe = 0; reihe < plan.blaetterSenkrecht; reihe++) {
      for (let spalte = 0; spalte < plan.blaetterWaagerecht; spalte++) {
        const x = RAND + spalte * (feldBreite + 4);
        const py = y - (reihe + 1) * (feldHoehe + 4);
        seite.drawRectangle({
          x,
          y: py,
          width: feldBreite,
          height: feldHoehe,
          borderColor: SCHWARZ,
          borderWidth: 0.8,
        });
        const text = `${spalte + 1}/${reihe + 1}`;
        seite.drawText(text, {
          x: x + (feldBreite - normal.widthOfTextAtSize(text, 9)) / 2,
          y: py + feldHoehe / 2 - 3,
          size: 9,
          font: normal,
          color: SCHWARZ,
        });
      }
    }

    seite.drawText(
      auftrag.t("pdf.blaetterHinweis", {
        anzahl: String(plan.blaetter.length),
        ueberlappung: String(UEBERLAPPUNG),
      }),
      { x: RAND, y: RAND + 6, size: 9, font: normal, color: GRAU },
    );
  } else {
    seite.drawText(auftrag.t("pdf.einBlatt"), {
      x: RAND,
      y: RAND + 6,
      size: 10,
      font: normal,
      color: GRAU,
    });
  }
}

/**
 * Erzeugt das fertige PDF und gibt es als Blob zurück.
 */
export async function musterAlsPdf(auftrag: Druckauftrag): Promise<Blob> {
  const melden = auftrag.melden ?? (() => {});
  melden("arbeit.druckVorbereiten", 0.05);

  const pdf = await PDFDocument.create();
  pdf.setTitle(auftrag.name);
  pdf.setCreator("Stickmuster");

  pdf.registerFontkit(fontkit);
  const [normalBytes, fettBytes] = await Promise.all([
    schriftHolen("/schriften/schrift-normal.ttf"),
    schriftHolen("/schriften/schrift-fett.ttf"),
  ]);
  const normal = await pdf.embedFont(normalBytes, { subset: true });
  const fett = await pdf.embedFont(fettBytes, { subset: true });

  const plan = blattplan(auftrag.breite, auftrag.hoehe);
  const breiteCm = sticheInCm(auftrag.breite, auftrag.stoffzaehlung);
  const hoeheCm = sticheInCm(auftrag.hoehe, auftrag.stoffzaehlung);

  melden("arbeit.vorschauZeichnen", 0.15);
  await vorschauSeite(pdf, fett, normal, auftrag, plan);

  melden("arbeit.garnlisteSchreiben", 0.25);
  legendeZeichnen(pdf, fett, normal, auftrag);

  const gesamt = plan.blaetter.length;
  let fertig = 0;

  for (const blatt of plan.blaetter) {
    const seite = pdf.addPage([SEITE_BREITE, SEITE_HOEHE]);
    kopfzeileZeichnen(
      seite,
      fett,
      normal,
      auftrag.name,
      auftrag.t("pdf.masseKurz", {
        breite: cmText(breiteCm, auftrag.landeskennung),
        hoehe: cmText(hoeheCm, auftrag.landeskennung),
        zaehlung: String(auftrag.stoffzaehlung),
      }),
      auftrag.t("pdf.reihenSpalten", {
        vonReihe: String(blatt.y0 + 1),
        bisReihe: String(blatt.y1),
        vonSpalte: String(blatt.x0 + 1),
        bisSpalte: String(blatt.x1),
      }),
    );
    rasterBlattZeichnen(seite, fett, normal, auftrag, plan, blatt);

    fertig++;
    melden(
      "arbeit.blattZeichnen",
      0.3 + (fertig / gesamt) * 0.6,
    );
    // Dem Browser kurz Luft lassen, damit die Anzeige nachkommt.
    await new Promise((auf) => setTimeout(auf, 0));
  }

  melden("arbeit.dateiBauen", 0.95);
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

/**
 * Die Schriftdatei holen. Sie liegt neben der App und wird erst beim Drucken
 * geladen – wer nie druckt, lädt sie auch nie.
 */
async function schriftHolen(pfad: string): Promise<ArrayBuffer> {
  const antwort = await fetch(pfad);
  if (!antwort.ok) throw new Error(`Schrift ${pfad} nicht gefunden.`);
  return antwort.arrayBuffer();
}

/** Wie viele Blätter der Ausdruck bekommt – für die Anzeige vor dem Drucken. */
export function blattanzahl(breite: number, hoehe: number): number {
  return blattplan(breite, hoehe).blaetter.length;
}
