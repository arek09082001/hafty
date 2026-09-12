/**
 * Farben zu einer Palette dazunehmen.
 * ---------------------------------------------------------------------------
 *
 * Zwei Fälle brauchen das, und beide gab es bisher nicht:
 *
 *  - **Die leere Kanwa.** Ein Muster, das nicht aus einem Foto entsteht, fängt
 *    ohne jede Farbe an. Ohne einen Weg, eine Farbe dazuzunehmen, ließe sich
 *    darauf kein einziger Stich malen.
 *  - **Ein Motiv aus einem anderen Muster.** Im Raster steht je Feld nur die
 *    *Nummer* einer Farbe, und dieselbe Nummer bedeutet in einem anderen
 *    Muster einen anderen Ton. Ein Motiv einzusetzen, ohne seine Farben
 *    mitzunehmen, ergab deshalb bunten Unsinn: die Rose kam grün heraus, und
 *    Nummern ohne Eintrag in der Legende blieben ganz ohne Farbe.
 *
 * Deshalb wird ein Motiv beim Einsetzen **umgeschrieben**: seine Farben werden
 * in der Zielpalette gesucht (dasselbe Garn oder derselbe Farbwert), fehlende
 * kommen hinten dazu, und die Feldnummern werden auf die neuen umgestellt.
 */

import { FARBINDIZES, LEER, type Garn, type PalettenEintrag } from "./typen";
import { SYMBOLE } from "./symbole";
import type { Ausschnitt } from "./raster";

/** Ein Symbol, das in dieser Palette noch nicht vergeben ist. */
export function freiesSymbol(palette: PalettenEintrag[]): string {
  const vergeben = new Set(palette.map((e) => e.symbol));
  return SYMBOLE.find((s) => !vergeben.has(s)) ?? SYMBOLE[palette.length % SYMBOLE.length];
}

/** Die kleinste Nummer, die in dieser Palette noch frei ist. */
function freieNummer(palette: PalettenEintrag[]): number | null {
  const vergeben = new Set(palette.map((e) => e.index));
  for (let i = 0; i < FARBINDIZES; i++) {
    if (i === LEER) continue;
    if (!vergeben.has(i)) return i;
  }
  return null;
}

/** Was eine neue Palettenfarbe an Angaben braucht. */
export type NeueFarbe = {
  hex: string;
  L: number;
  a: number;
  b: number;
  garn: Garn | null;
};

/**
 * Eine Farbe an die Palette anhängen.
 *
 * Gibt es sie schon – dasselbe Garn oder derselbe Farbwert –, wird nichts
 * angehängt und nur ihre Nummer zurückgegeben. Zweimal dieselbe Farbe in der
 * Legende wäre beim Sticken eine Fehlerquelle.
 */
export function farbeAnhaengen(
  palette: PalettenEintrag[],
  farbe: NeueFarbe,
): { palette: PalettenEintrag[]; index: number } | null {
  const schon = farbeFinden(palette, farbe);
  if (schon !== null) return { palette, index: schon };

  const nummer = freieNummer(palette);
  if (nummer === null) return null;

  const eintrag: PalettenEintrag = {
    index: nummer,
    hex: farbe.hex,
    L: farbe.L,
    a: farbe.a,
    b: farbe.b,
    garn: farbe.garn,
    symbol: freiesSymbol(palette),
    stiche: 0,
  };
  return { palette: [...palette, eintrag], index: nummer };
}

/** Dieselbe Farbe in der Palette suchen: erst das Garn, dann der Farbwert. */
function farbeFinden(palette: PalettenEintrag[], farbe: NeueFarbe): number | null {
  if (farbe.garn) {
    const ueberGarn = palette.find((e) => e.garn?.id === farbe.garn?.id);
    if (ueberGarn) return ueberGarn.index;
  }
  const ueberHex = palette.find(
    (e) => e.garn === null && e.hex.toLowerCase() === farbe.hex.toLowerCase(),
  );
  return ueberHex ? ueberHex.index : null;
}

/**
 * Die Farben eines Ausschnitts in eine Zielpalette übernehmen.
 *
 * Zurück kommt die – gegebenenfalls gewachsene – Palette und der Ausschnitt
 * mit umgeschriebenen Feldnummern. Passt eine Farbe nicht mehr hinein (die
 * Palette ist voll), bleiben ihre Felder frei; lieber unbestickter Stoff als
 * eine willkürliche andere Farbe.
 */
export function ausschnittUebernehmen(
  ziel: PalettenEintrag[],
  stueck: Ausschnitt,
): { palette: PalettenEintrag[]; stueck: Ausschnitt } {
  let palette = ziel;
  const abbildung = new Map<number, number>();

  /**
   * Nur die Farben, die im Stück auch wirklich vorkommen.
   *
   * Ein Motiv bringt seine ganze Palette mit – auch Töne, die nur außerhalb
   * der Maske liegen oder beim Verkleinern weggefallen sind. Die landeten
   * bisher alle in der Liste, und am Ende standen dort sechsundsechzig
   * Garne, von denen dreizehn keinen einzigen Stich hatten.
   */
  const benutzt = new Set<number>();
  for (let i = 0; i < stueck.daten.length; i++) {
    if (!stueck.maske[i]) continue;
    const wert = stueck.daten[i];
    if (wert !== LEER) benutzt.add(wert);
  }

  for (const eintrag of stueck.palette) {
    if (!benutzt.has(eintrag.index)) continue;
    const ergebnis = farbeAnhaengen(palette, {
      hex: eintrag.hex,
      L: eintrag.L,
      a: eintrag.a,
      b: eintrag.b,
      garn: eintrag.garn,
    });
    if (!ergebnis) {
      abbildung.set(eintrag.index, LEER);
      continue;
    }
    palette = ergebnis.palette;
    abbildung.set(eintrag.index, ergebnis.index);
  }

  const daten = new Uint16Array(stueck.daten.length);
  for (let i = 0; i < stueck.daten.length; i++) {
    const alt = stueck.daten[i];
    // LEER bleibt LEER, und eine Nummer ohne Eintrag in der Mitgebrachten
    // Palette (alte Motive kannten sie noch nicht) bleibt, wie sie ist.
    daten[i] = alt === LEER ? LEER : (abbildung.get(alt) ?? alt);
  }

  return {
    palette,
    stueck: { ...stueck, daten, palette },
  };
}
