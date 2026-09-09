/** Gemeinsame Typen fuer Pipeline, Editor und Ausdruck. */

/** Eine reale Herstellerfarbe mit vorberechnetem Lab-Wert. */
export type Garn = {
  id: string;
  marke: string;
  code: string;
  name: string;
  hex: string;
  L: number;
  a: number;
  b: number;
};

/** Ein Eintrag der Legende: ein Palettenindex und was dahintersteckt. */
export type PalettenEintrag = {
  /** Index im Raster (0..254). */
  index: number;
  /** Bildschirmfarbe, mit der das Feld gemalt wird. */
  hex: string;
  /** Lab-Wert genau dieser Farbe – Grundlage aller Abstandsrechnungen. */
  L: number;
  a: number;
  b: number;
  /** Die zugeordnete Herstellerfarbe, falls es einen Garnkatalog gibt. */
  garn: Garn | null;
  /** Das Symbol im Schwarzweißdruck. */
  symbol: string;
  /** Wie oft diese Farbe im Raster vorkommt. */
  stiche: number;
};

/** Die beiden Zahlen unter dem Glättungsregler. */
export type Kennzahlen = {
  /** Felder, die keinen einzigen gleichfarbigen Nachbarn haben. */
  einzelstiche: number;
  /** Durchschnittliche Anzahl Farbwechsel je Rasterreihe. */
  farbwechselProReihe: number;
};

/** Das Ergebnis eines Pipeline-Laufs. */
export type MusterErgebnis = {
  breite: number;
  hoehe: number;
  /** Ein Byte je Feld: der Palettenindex. */
  raster: Uint8Array;
  palette: PalettenEintrag[];
  kennzahlen: Kennzahlen;
  /** Wie viele Farben das k-Means gefunden hat, bevor Garne zusammenfielen. */
  farbenVorZusammenlegen: number;
  /** Wie viele Farben nach Glättung und Zusammenlegen übrig sind. */
  farbenNachher: number;
};

/** Die Einstellungen aus Schritt 2. */
export type Einstellungen = {
  /** Breite des Musters in Stichen. */
  breiteStiche: number;
  /** Stoffzählung: Kreuze je Zoll (Aida 14 usw.). */
  stoffzaehlung: number;
  /** Gewünschte Anzahl Farben. */
  farbanzahl: number;
  /** Stellung des Glättungsreglers, stufenlos von 0 bis 100. */
  glaettungsstaerke: number;
  /** Nur Garne aus dem eigenen Vorrat verwenden. */
  nurEigeneGarne: boolean;
};

export const STANDARD_EINSTELLUNGEN: Einstellungen = {
  breiteStiche: 100,
  stoffzaehlung: 14,
  farbanzahl: 20,
  glaettungsstaerke: 30,
  nurEigeneGarne: false,
};

/**
 * Der Glättungsregler.
 * ---------------------------------------------------------------------------
 *
 * Früher waren das fünf Rastpunkte. Fünf Stellungen reichen aber nicht: die
 * Nutzerin möchte einmal jedes Kästchen einzeln haben und ein andermal
 * wirklich ruhige Flächen, und dazwischen jeden Zwischenschritt. Deshalb
 * läuft der Regler jetzt stufenlos von 0 bis 100, und aus seiner Stellung
 * werden die beiden Zahlen gerechnet, an denen die Glättung wirklich hängt:
 *
 *  - `lambda` – das Gewicht der Nachbarschaftsstrafe im ICM
 *    (siehe glaettung.ts). Es wächst mit einer leichten Kurve, damit die
 *    ersten Millimeter am Regler nicht gleich das halbe Bild glattbügeln.
 *  - `mindestFlaeche` – die Größe, unterhalb derer ein zusammenhängender
 *    Fleck anschließend ganz aufgelöst wird. Sie wächst geometrisch von
 *    einem einzelnen Kästchen bis auf 100, also 10 × 10 Kästchen: ganz
 *    rechts bekommt die Nutzerin im Schnitt eine Farbe je 10 × 10 Feldern,
 *    ganz links darf jedes einzelne Feld die Farbe wechseln.
 *
 * `lambda` allein ist oberhalb von etwa 7 wirkungslos (siehe glaettung.ts);
 * die obere Hälfte des Reglers lebt deshalb von `mindestFlaeche`.
 */
export const GLAETTUNG_MIN = 0;
export const GLAETTUNG_MAX = 100;

/** Ganz rechts: eine Farbe je 10 × 10 Kästchen. */
export const GROESSTE_FLAECHE = 100;

/** Ganz rechts erreichtes Gewicht der Nachbarschaftsstrafe. */
const LAMBDA_MAX = 8;

export type Glaettungswerte = {
  lambda: number;
  mindestFlaeche: number;
};

/** Eine Reglerstellung auf 0..100 begrenzen und auf ganze Schritte runden. */
export function glaettungBegrenzen(staerke: number): number {
  if (!Number.isFinite(staerke)) return STANDARD_EINSTELLUNGEN.glaettungsstaerke;
  return Math.min(GLAETTUNG_MAX, Math.max(GLAETTUNG_MIN, Math.round(staerke)));
}

/** Aus der Reglerstellung die beiden Rechenwerte der Glättung. */
export function glaettungswerte(staerke: number): Glaettungswerte {
  const anteil = glaettungBegrenzen(staerke) / GLAETTUNG_MAX;
  return {
    lambda: Math.round(LAMBDA_MAX * anteil ** 1.4 * 1000) / 1000,
    mindestFlaeche: Math.max(1, Math.round(GROESSTE_FLAECHE ** anteil)),
  };
}

/**
 * Wie groß die kleinste Fläche ungefähr ist, als Kantenlänge in Kästchen.
 * Das ist die Zahl, die unter dem Regler steht: „etwa 4 × 4 Kästchen" sagt
 * einer Stickerin mehr als „mindestFlaeche 18".
 */
export function glaettungsKante(staerke: number): number {
  return Math.max(1, Math.round(Math.sqrt(glaettungswerte(staerke).mindestFlaeche)));
}

/**
 * Die Beschriftung über dem Regler. Sie bleibt in ganzen Worten – eine Zahl
 * sagt der Nutzerin nichts – und wechselt an fünf Stellen der Skala.
 */
const STUFENNAMEN = [
  { ab: 0, titel: "glaettung.stufe0" },
  { ab: 8, titel: "glaettung.stufe1" },
  { ab: 28, titel: "glaettung.stufe2" },
  { ab: 52, titel: "glaettung.stufe3" },
  { ab: 78, titel: "glaettung.stufe4" },
] as const;

export function glaettungTitel(staerke: number): (typeof STUFENNAMEN)[number]["titel"] {
  const wert = glaettungBegrenzen(staerke);
  let titel: (typeof STUFENNAMEN)[number]["titel"] = STUFENNAMEN[0].titel;
  for (const stufe of STUFENNAMEN) {
    if (wert >= stufe.ab) titel = stufe.titel;
  }
  return titel;
}

/** Die Markierungen am Regler – nur Orientierungspunkte, keine Rastpunkte. */
export const GLAETTUNGSMARKEN = [0, 25, 50, 75, 100] as const;

/**
 * Gespeicherte Einstellungen auf den heutigen Stand bringen.
 *
 * Im Browser der Nutzerin liegt der Arbeitsstand von gestern. Er kennt noch
 * den alten Regler mit fünf Rastpunkten (`glaettung`, 0 bis 4) und den
 * Schalter fürs Dithering, den es nicht mehr gibt. Beides wird hier
 * übersetzt statt beim Laden auf gut Glück übernommen: eine 2 aus dem alten
 * Regler ist „ausgewogen" und muss auch danach so aussehen.
 */
const ALTE_RASTPUNKTE = [0, 15, 30, 48, 63];

export function einstellungenLesen(gespeichert: unknown): Einstellungen {
  const roh = (gespeichert ?? {}) as Partial<Einstellungen> & { glaettung?: unknown };

  const zahl = (wert: unknown, ersatz: number) =>
    typeof wert === "number" && Number.isFinite(wert) ? wert : ersatz;

  const alt = roh.glaettung;
  const staerke =
    typeof roh.glaettungsstaerke === "number"
      ? roh.glaettungsstaerke
      : typeof alt === "number"
        ? (ALTE_RASTPUNKTE[Math.round(alt)] ?? STANDARD_EINSTELLUNGEN.glaettungsstaerke)
        : STANDARD_EINSTELLUNGEN.glaettungsstaerke;

  return {
    breiteStiche: zahl(roh.breiteStiche, STANDARD_EINSTELLUNGEN.breiteStiche),
    stoffzaehlung: zahl(roh.stoffzaehlung, STANDARD_EINSTELLUNGEN.stoffzaehlung),
    farbanzahl: zahl(roh.farbanzahl, STANDARD_EINSTELLUNGEN.farbanzahl),
    glaettungsstaerke: glaettungBegrenzen(staerke),
    nurEigeneGarne: roh.nurEigeneGarne === true,
  };
}

/** Übliche Stoffzählungen. */
export const STOFFZAEHLUNGEN = [
  { wert: 11, titel: "einst.stoff11" },
  { wert: 14, titel: "einst.stoff14" },
  { wert: 16, titel: "einst.stoff16" },
  { wert: 18, titel: "einst.stoff18" },
] as const;

/**
 * Ein Feld, das **nicht gestickt** wird – dort bleibt der Stoff frei.
 *
 * Das Raster hält je Feld ein Byte. Die Palette reicht von 0 bis 254 (das
 * k-Means begrenzt sich selbst auf 255 Farben), 255 ist deshalb frei und
 * bekommt hier seine Bedeutung: kein Garn, kein Stich, nichts.
 *
 * Gebraucht wird das, sobald jemand nur ein Motiv aus dem Bild sticken
 * möchte – die Blume ja, die Wiese dahinter nicht. Der freie Grund ist beim
 * Kreuzstich kein Sonderfall, sondern der Normalfall: gestickt wird auf
 * hellem Stoff, und was nicht gestickt ist, bleibt eben Stoff.
 *
 * Wo überall darauf geachtet werden muss:
 *   - Anzeige und Ausdruck lassen das Kästchen leer (Rasteransicht, pdf.ts)
 *   - die Garnliste zählt es nicht mit (paletteNachzaehlen)
 *   - beim Neuerzeugen bleibt es stehen (bearbeitungUmschreiben)
 */
export const LEER = 255;

/**
 * Die Farbe des unbestickten Stoffes auf dem Bildschirm.
 *
 * Bewusst ein Leinenton und kein Weiß: sonst wäre ein Feld ohne Stich nicht
 * von einem Feld mit weißem Garn zu unterscheiden.
 */
export const STOFFFARBE = "#f1e8d6";

/** Höchstzahl an Feldern, die berechnet wird. 400 × 400 Stiche. */
export const MAX_FELDER = 160_000;
export const MAX_BREITE = 400;
export const MIN_BREITE = 20;
export const MAX_FARBEN = 48;
export const MIN_FARBEN = 2;

/** Stiche in Zentimeter umrechnen. */
export function sticheInCm(stiche: number, stoffzaehlung: number): number {
  // Stoffzählung = Kreuze je Zoll, ein Zoll = 2,54 cm.
  return (stiche / stoffzaehlung) * 2.54;
}

/** Eine Zentimeterangabe für die Anzeige aufbereiten. */
export function cmText(cm: number, landeskennung = "de-DE"): string {
  return cm.toLocaleString(landeskennung, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
