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
 * Beschriftung – `titel` ist deshalb ein Textschlüssel und kein fertiger Satz.
 */
export const GLAETTUNGSSTUFEN = [
  { lambda: 0, mindestFlaeche: 1, titel: "glaettung.stufe0" },
  { lambda: 1.2, mindestFlaeche: 2, titel: "glaettung.stufe1" },
  { lambda: 2.6, mindestFlaeche: 4, titel: "glaettung.stufe2" },
  { lambda: 4.5, mindestFlaeche: 9, titel: "glaettung.stufe3" },
  { lambda: 7.5, mindestFlaeche: 18, titel: "glaettung.stufe4" },
] as const;

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
