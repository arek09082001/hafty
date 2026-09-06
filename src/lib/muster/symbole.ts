/**
 * Symbole für den Schwarzweißdruck.
 *
 * Ausgewählt nach zwei Regeln: Die Zeichen müssen in den Standardschriften
 * eines PDF (WinAnsi) vorhanden sein, und sie müssen sich auch dann noch
 * unterscheiden lassen, wenn sie klein gedruckt in einem Kästchen von vier
 * Millimetern stehen. Deshalb fehlen die üblichen Verwechslungspaare
 * (I/l/1, O/0, u/v, C/G) und alles, was nur aus dünnen Strichen besteht.
 */
export const SYMBOLE = [
  "A", "B", "D", "E", "F", "H", "K", "L", "M", "N",
  "P", "R", "S", "T", "W", "X", "Y", "Z", "2", "3",
  "4", "5", "6", "7", "8", "9", "a", "b", "d", "e",
  "f", "g", "h", "k", "m", "n", "p", "r", "s", "t",
  "w", "x", "y", "z", "+", "*", "#", "%", "&", "@",
  "?", "!", "$", "=", "<", ">", "§", "µ", "£", "¥",
  "©", "®", "±", "÷", "¶", "¢",
] as const;

/**
 * Verteilt Symbole auf die Palette. Die häufigste Farbe bekommt das erste,
 * gut erkennbare Symbol – sie steht am öftesten auf dem Blatt.
 */
export function symboleVerteilen(stichzahlen: number[]): string[] {
  const reihenfolge = stichzahlen
    .map((stiche, index) => ({ stiche, index }))
    .sort((a, b) => b.stiche - a.stiche);

  const symbole = new Array<string>(stichzahlen.length).fill("?");
  reihenfolge.forEach((eintrag, rang) => {
    symbole[eintrag.index] = SYMBOLE[rang % SYMBOLE.length];
  });

  return symbole;
}
