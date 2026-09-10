/** Gemeinsame Typen fuer Pipeline, Editor und Ausdruck. */

import { GARNE } from "@/lib/garne/katalog-daten";

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
  /** Index im Raster (0..1022). */
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
  /** Zwei Byte je Feld: der Palettenindex. */
  raster: Uint16Array;
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
 * Der Regler läuft stufenlos von 0 bis 100, und aus seiner Stellung werden
 * die beiden Zahlen gerechnet, an denen die Glättung hängt. Wie er gekrümmt
 * ist, steht nicht nach Gefühl hier, sondern ist ausgemessen: an einem
 * Muster mit 180 × 240 Stichen und 20 Farben wurde geschaut, wie viele
 * Farbwechsel je Reihe übrig bleiben. Denn genau das ist es, was die
 * Nutzerin sieht – ein Muster mit 18 Wechseln je Reihe ist ein Foto, eines
 * mit 5 sind ruhige Flächen.
 *
 *  - `lambda` – das Gewicht der Nachbarschaftsstrafe im ICM (siehe
 *    glaettung.ts). Es trägt die **linke** Spanne: 0 → 18,0 Wechsel je
 *    Reihe, 0,1 → 12,5, 0,25 → 10,6, 0,5 → 10,1. Darüber ändert sich nichts
 *    mehr, auch bei 100 nicht: das ICM wählt je Feld nur unter den Farben,
 *    die in seiner Nachbarschaft schon vorkommen, und ist damit nach zwei
 *    Durchläufen fertig. Deshalb endet die Kurve bei `LAMBDA_MAX`.
 *  - `flaechenAnteil` – wie viel vom Muster die Flächenauflösung schlucken
 *    darf. Er trägt die **rechte** Spanne, und zwar als einziger.
 *
 * Der Anteil stand hier früher als feste Feldzahl („alles unter 200 Feldern
 * wird aufgelöst"). Das ist die anschaulichere Zahl und die unbrauchbarere:
 * je nach Foto und Farbzahl fand sie alles oder nichts, und zwischen den
 * Stellungen 25 und 70 änderte sich an einem Muster kein einziges Feld.
 * Woran die Grenze stattdessen abgelesen wird, steht bei
 * `mindestflaecheFinden` in glaettung.ts.
 *
 * Der Medianfilter kommt hier nicht mehr vor. Er sitzt vor der
 * Farbreduktion, hing also an der ganzen Palette – und war damit ein
 * Absturz mitten im Regler: 31 % des Musters änderten sich in einem
 * einzigen Schritt, während der ganze Rest des Weges 1 % brachte. Heute
 * bekommt das k-Means weiterhin das gefilterte Raster (ruhigere Farben),
 * die Zuordnung je Feld aber immer das rohe. Was der Filter früher grob
 * wegnahm, nimmt jetzt `lambda` fein weg – und der Regler kommt ohne einen
 * einzigen Sprung aus.
 */
export const GLAETTUNG_MIN = 0;
export const GLAETTUNG_MAX = 100;

/**
 * Bis hierher trägt `lambda` allein – danach beginnt die Flächenauflösung.
 *
 * Nicht willkürlich: bei 0,5 hat das ICM den letzten Einzelstich getilgt,
 * und der Aufräumdurchgang, der rechts davon dazukommt, findet nichts mehr
 * zu tun. Genau deshalb ist an dieser Stelle kein Übergang zu sehen.
 */
const LAMBDA_BIS = 20;

/** Das Gewicht, ab dem mehr Strafe nichts mehr ändert. */
const LAMBDA_MAX = 0.5;

/**
 * Wie viel vom Muster die Flächenauflösung ganz rechts schlucken darf.
 *
 * Ein Anteil und keine Feldzahl – warum, steht bei `mindestflaecheFinden`
 * in glaettung.ts. Kurz: „alles unter 200 Feldern" bedeutet in jedem Muster
 * etwas anderes und ließ den halben Regler still stehen, „drei Viertel des
 * Bildes dürfen zusammenfallen" bedeutet überall dasselbe.
 *
 * Warum nicht mehr: darüber gibt es nichts mehr zu holen. Gemessen kommt
 * die Auflösung bei rund 20 Flächen zum Stehen, egal wie weit man die
 * Grenze noch treibt – und dafür änderte der letzte Schritt am Regler dann
 * auf einmal ein Drittel des Musters, bei kleinen Mustern sogar mit einem
 * schlechteren Ergebnis als der Schritt davor.
 */
const ANTEIL_MAX = 0.75;

export type Glaettungswerte = {
  lambda: number;
  /** Anteil des Musters, den die Flächenauflösung schlucken darf (0..1). */
  flaechenAnteil: number;
};

/** Eine Reglerstellung auf 0..100 begrenzen und auf ganze Schritte runden. */
export function glaettungBegrenzen(staerke: number): number {
  if (!Number.isFinite(staerke)) return STANDARD_EINSTELLUNGEN.glaettungsstaerke;
  return Math.min(GLAETTUNG_MAX, Math.max(GLAETTUNG_MIN, Math.round(staerke)));
}

/** Aus der Reglerstellung die Rechenwerte der Glättung. */
export function glaettungswerte(staerke: number): Glaettungswerte {
  const wert = glaettungBegrenzen(staerke);

  // Linke Spanne: nur lambda.
  const lambda =
    wert >= LAMBDA_BIS
      ? LAMBDA_MAX
      : Math.round(LAMBDA_MAX * (wert / LAMBDA_BIS) ** 1.5 * 1000) / 1000;

  // Rechte Spanne: der Anteil wächst geradlinig. Er darf das, weil er in der
  // Größe gemessen ist, die man am Muster auch sieht – anders als eine feste
  // Feldzahl, die erst spät und dann auf einmal wirkte.
  const anteil = Math.max(0, wert - LAMBDA_BIS) / (GLAETTUNG_MAX - LAMBDA_BIS);

  return { lambda, flaechenAnteil: Math.round(ANTEIL_MAX * anteil * 1000) / 1000 };
}

/**
 * Die Beschriftung über dem Regler. Sie bleibt in ganzen Worten – eine Zahl
 * sagt der Nutzerin nichts – und wechselt an fünf Stellen der Skala.
 *
 * Die Stellen liegen gleichmäßig. Früher war die erste bei 8: dort saß der
 * Sprung des Medianfilters, und die Beschriftung sollte ihn wenigstens
 * ankündigen. Den Sprung gibt es nicht mehr, also gibt es auch keinen Grund
 * für eine krumme Skala.
 */
const STUFENNAMEN = [
  { ab: 0, titel: "glaettung.stufe0" },
  { ab: 20, titel: "glaettung.stufe1" },
  { ab: 40, titel: "glaettung.stufe2" },
  { ab: 60, titel: "glaettung.stufe3" },
  { ab: 80, titel: "glaettung.stufe4" },
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
    farbanzahl: farbanzahlBegrenzen(zahl(roh.farbanzahl, STANDARD_EINSTELLUNGEN.farbanzahl)),
    glaettungsstaerke: glaettungBegrenzen(staerke),
    nurEigeneGarne: roh.nurEigeneGarne === true,
  };
}

/**
 * Eine gewünschte Farbzahl auf das Machbare begrenzen.
 *
 * Sie steht nicht mehr nur in Schritt 2, sondern lässt sich im Editor am
 * Regler ändern – und ein Regler liefert auch Zwischenwerte und Unsinn.
 */
export function farbanzahlBegrenzen(anzahl: number): number {
  if (!Number.isFinite(anzahl)) return STANDARD_EINSTELLUNGEN.farbanzahl;
  return Math.min(MAX_FARBEN, Math.max(MIN_FARBEN, Math.round(anzahl)));
}

/** Übliche Stoffzählungen. */
export const STOFFZAEHLUNGEN = [
  { wert: 11, titel: "einst.stoff11" },
  { wert: 14, titel: "einst.stoff14" },
  { wert: 16, titel: "einst.stoff16" },
  { wert: 18, titel: "einst.stoff18" },
] as const;

/**
 * So viele Farbindizes gibt es: 0 bis 1022, dazu die 1023 für LEER.
 *
 * Das Raster hält zwei Byte je Feld, es wären also 65.536 Werte möglich.
 * Gedeckelt wird trotzdem, und zwar hier: über den Farbindex laufen
 * Nachschlagetabellen – die Bildschirmfarben beim Zeichnen, die Zähler beim
 * Glätten, die Stichzahlen beim Nachzählen. Mit 1024 Plätzen bleiben die
 * winzig, und der Wert passt zugleich in die Int16-Bearbeitungsebene, in der
 * -1 „unberührt" heißt. Für einen Garnkatalog ist das reichlich: der
 * größte, den es hier gibt, hat 375 Farben.
 */
export const FARBINDIZES = 1024;

/**
 * Ein Feld, das **nicht gestickt** wird – dort bleibt der Stoff frei.
 *
 * Die Palette reicht von 0 bis 1022, der letzte Wert ist deshalb frei und
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
export const LEER = FARBINDIZES - 1;

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
/**
 * Höchstzahl an Farben: so viele Garne hat der Katalog.
 *
 * Eine kleinere Zahl wäre eine willkürliche Grenze. Wer jede Nuance eines
 * Fotos will, soll sie bekommen – dass ein Muster mit 300 Farben kaum zu
 * sticken ist, entscheidet die Nutzerin und nicht das Programm. Nach oben
 * hin ist der Katalog selbst die Grenze: mehr Farben als Garne zu verlangen
 * ergibt keinen Sinn, zwei Cluster fielen ohnehin auf dasselbe Garn
 * zusammen (siehe `aufGarneAbbilden`).
 *
 * Was viele Farben kosten, steht in `glaettung.ts`: Rechenzeit ja, Speicher
 * nein – die Abstandsliste je Feld ist deshalb der Länge nach begrenzt.
 */
export const MAX_FARBEN = GARNE.length;
export const MIN_FARBEN = 2;

/**
 * Wie viele Farben ein Tipp auf „Mehr" dazugibt.
 *
 * Unten in Zweierschritten: da entscheidet jede einzelne Farbe darüber, wie
 * das Bild aussieht. Weiter oben in größeren – von 20 bis an den ganzen
 * Katalog wären es sonst fast zweihundert Tipps, und zwischen 300 und 302
 * Farben liegt ohnehin kein sichtbarer Unterschied.
 *
 * Steht hier und nicht in einer der beiden Seiten, weil die Farbzahl an zwei
 * Stellen eingestellt wird – in Schritt 2 und am Regler im Editor. Zwei
 * verschiedene Schrittweiten für dieselbe Zahl wären nicht zu erklären.
 */
export function farbenSchritt(wert: number): number {
  if (wert < 24) return 2;
  if (wert < 60) return 4;
  if (wert < 150) return 10;
  return 25;
}

/**
 * Der Farbregler im Editor.
 * ---------------------------------------------------------------------------
 *
 * Der Regler läuft in gleichen Schritten von links nach rechts, die Farbzahl
 * dahinter aber nicht. Zwischen 8 und 12 Farben liegt ein ganz anderes
 * Muster; zwischen 300 und 320 sieht niemand einen Unterschied. Auf einer
 * geraden Skala von 2 bis 375 läge der ganze interessante Bereich in den
 * ersten Millimetern, und mit dem Finger auf dem Tablet wäre er nicht zu
 * treffen.
 *
 * Deshalb wächst die Farbzahl geometrisch: gleich große Wege am Regler
 * bedeuten überall dieselbe **anteilige** Änderung. Die Mitte liegt damit bei
 * rund 27 Farben, ein Viertel bei etwa 7, drei Viertel bei etwa 100 – die
 * untere Hälfte des Reglers deckt genau den Bereich ab, in dem jede einzelne
 * Farbe zählt.
 */
export const FARBREGLER_MAX = 100;

/** Reglerstellung (0..100) -> Farbzahl. */
export function farbanzahlAusRegler(stellung: number): number {
  const anteil = Math.min(1, Math.max(0, stellung / FARBREGLER_MAX));
  return farbanzahlBegrenzen(MIN_FARBEN * (MAX_FARBEN / MIN_FARBEN) ** anteil);
}

/** Farbzahl -> Reglerstellung (0..100), die Umkehrung von `farbanzahlAusRegler`. */
export function reglerAusFarbanzahl(anzahl: number): number {
  const wert = farbanzahlBegrenzen(anzahl);
  const anteil = Math.log(wert / MIN_FARBEN) / Math.log(MAX_FARBEN / MIN_FARBEN);
  return Math.round(anteil * FARBREGLER_MAX);
}

/** Orientierungspunkte am Farbregler – keine Rastpunkte. */
export const FARBMARKEN = [MIN_FARBEN, 10, 25, 60, 150, MAX_FARBEN] as const;

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
