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
  /** Rastpunkt des Glättungsreglers, 0 = sehr detailliert. */
  glaettung: number;
  /** Standardmäßig aus. */
  dithering: boolean;
  /** Nur Garne aus dem eigenen Vorrat verwenden. */
  nurEigeneGarne: boolean;
};

export const STANDARD_EINSTELLUNGEN: Einstellungen = {
  breiteStiche: 100,
  stoffzaehlung: 14,
  farbanzahl: 20,
  glaettung: 2,
  dithering: false,
  nurEigeneGarne: false,
};

/**
 * Die Rastpunkte des Glättungsreglers.
 *
 * `lambda` ist das Gewicht der Nachbarschaftsstrafe in der Kostenfunktion,
 * `mindestFlaeche` die Größe, unterhalb derer ein zusammenhängender Fleck
 * anschließend ganz aufgelöst wird. Beides zusammen ergibt erst eine Skala,
 * die über ihre ganze Länge einen sichtbaren Unterschied macht – `lambda`
 * allein ist oberhalb von etwa 7 wirkungslos (siehe glaettung.ts).
 *
 * In der Oberfläche steht nie eine dieser Zahlen, sondern immer nur die
 * Beschriftung.
 */
export const GLAETTUNGSSTUFEN = [
  { lambda: 0, mindestFlaeche: 1, titel: "sehr detailliert" },
  { lambda: 1.2, mindestFlaeche: 2, titel: "detailliert" },
  { lambda: 2.6, mindestFlaeche: 4, titel: "ausgewogen" },
  { lambda: 4.5, mindestFlaeche: 9, titel: "ruhig" },
  { lambda: 7.5, mindestFlaeche: 18, titel: "ruhig und einfach zu sticken" },
] as const;

/** Übliche Stoffzählungen. */
export const STOFFZAEHLUNGEN = [
  { wert: 11, titel: "Aida 11 – große Kreuze" },
  { wert: 14, titel: "Aida 14 – am gebräuchlichsten" },
  { wert: 16, titel: "Aida 16 – feiner" },
  { wert: 18, titel: "Aida 18 – sehr fein" },
] as const;

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
export function cmText(cm: number): string {
  return cm.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
