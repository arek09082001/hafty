/**
 * Der Bildausschnitt.
 * ---------------------------------------------------------------------------
 *
 * Vor dem Muster kann das Bild zugeschnitten werden. Gerechnet wird in
 * **Bildpunkten des Quellbildes**, nicht in Bildschirmpunkten – die Anzeige
 * darf beliebig skaliert sein, der Ausschnitt bleibt derselbe.
 *
 * Zugeschnitten wird nichts: der Ausschnitt ist nur ein Rechteck. Erst beim
 * Erzeugen des Musters bekommt `createImageBitmap` dieses Rechteck mit und
 * liest gleich nur diesen Teil. Das Bild wird also nie neu gespeichert und
 * verliert dabei auch nichts.
 */

export type Ausschnitt = { x: number; y: number; breite: number; hoehe: number };

/** Kleinster sinnvoller Ausschnitt in Bildpunkten. */
const MINDESTKANTE = 16;

/**
 * Die angebotenen Seitenverhältnisse.
 *
 * `verhaeltnis` ist Breite geteilt durch Höhe; `null` heißt "so lassen, wie
 * das Bild ist".
 */
export const VERHAELTNISSE: { schluessel: string; verhaeltnis: number | null; titel: string }[] = [
  { schluessel: "ganz", verhaeltnis: null, titel: "zuschnitt.ganzesBild" },
  { schluessel: "quadrat", verhaeltnis: 1, titel: "zuschnitt.quadrat" },
  { schluessel: "hochkant", verhaeltnis: 3 / 4, titel: "zuschnitt.hochkant" },
  { schluessel: "quer", verhaeltnis: 4 / 3, titel: "zuschnitt.quer" },
  { schluessel: "breit", verhaeltnis: 16 / 9, titel: "zuschnitt.breit" },
];

/** Auf ganze Bildpunkte runden und in das Bild zurückholen. */
export function einpassen(a: Ausschnitt, bildBreite: number, bildHoehe: number): Ausschnitt {
  const breite = Math.max(MINDESTKANTE, Math.min(Math.round(a.breite), bildBreite));
  const hoehe = Math.max(MINDESTKANTE, Math.min(Math.round(a.hoehe), bildHoehe));
  return {
    breite,
    hoehe,
    x: Math.max(0, Math.min(Math.round(a.x), bildBreite - breite)),
    y: Math.max(0, Math.min(Math.round(a.y), bildHoehe - hoehe)),
  };
}

/**
 * Der größte mittige Ausschnitt mit dem gewünschten Seitenverhältnis.
 *
 * Ist das Bild breiter als das Verhältnis, begrenzt die Höhe; ist es höher,
 * begrenzt die Breite.
 */
export function groesstesRechteck(
  bildBreite: number,
  bildHoehe: number,
  verhaeltnis: number | null,
): Ausschnitt {
  if (verhaeltnis === null) return { x: 0, y: 0, breite: bildBreite, hoehe: bildHoehe };
  const bildVerhaeltnis = bildBreite / bildHoehe;
  const breite = bildVerhaeltnis > verhaeltnis ? bildHoehe * verhaeltnis : bildBreite;
  const hoehe = bildVerhaeltnis > verhaeltnis ? bildHoehe : bildBreite / verhaeltnis;
  return einpassen(
    { x: (bildBreite - breite) / 2, y: (bildHoehe - hoehe) / 2, breite, hoehe },
    bildBreite,
    bildHoehe,
  );
}

/**
 * Den Ausschnitt verschieben. `dx`/`dy` sind Anteile der Ausschnittsbreite
 * beziehungsweise -höhe, damit ein Tastendruck bei jedem Bild gleich weit
 * schiebt – bei einem kleinen Ausschnitt feiner, bei einem großen gröber.
 */
export function verschieben(
  a: Ausschnitt,
  dx: number,
  dy: number,
  bildBreite: number,
  bildHoehe: number,
): Ausschnitt {
  return einpassen(
    { ...a, x: a.x + dx * a.breite, y: a.y + dy * a.hoehe },
    bildBreite,
    bildHoehe,
  );
}

/**
 * Den Ausschnitt um den Mittelpunkt vergrößern oder verkleinern. Das
 * Seitenverhältnis bleibt erhalten; wird der Rand erreicht, hört es auf.
 */
export function groesseAendern(
  a: Ausschnitt,
  faktor: number,
  bildBreite: number,
  bildHoehe: number,
): Ausschnitt {
  const verhaeltnis = a.breite / a.hoehe;
  // Nicht größer, als bei diesem Verhältnis ins Bild passt.
  const grenze = groesstesRechteck(bildBreite, bildHoehe, verhaeltnis);
  const breite = Math.min(grenze.breite, Math.max(MINDESTKANTE, a.breite * faktor));
  const hoehe = breite / verhaeltnis;
  const mitteX = a.x + a.breite / 2;
  const mitteY = a.y + a.hoehe / 2;
  return einpassen(
    { x: mitteX - breite / 2, y: mitteY - hoehe / 2, breite, hoehe },
    bildBreite,
    bildHoehe,
  );
}

/** Deckt der Ausschnitt noch das ganze Bild ab? */
export function istGanzesBild(a: Ausschnitt, bildBreite: number, bildHoehe: number): boolean {
  return a.x === 0 && a.y === 0 && a.breite === bildBreite && a.hoehe === bildHoehe;
}

/**
 * Eine Ecke oder eine Kante des Ausschnitts.
 *
 * Die Buchstaben sind Himmelsrichtungen: `nw` ist die Ecke links oben, `o`
 * die rechte Kante. So steht in jedem Kürzel schon drin, welche Seiten es
 * bewegt – `so` fasst die untere und die rechte Kante an.
 */
export type Kante = "nw" | "n" | "no" | "o" | "so" | "s" | "sw" | "w";

/**
 * Freihand: eine Ecke oder Kante ziehen.
 *
 * Anders als `groesseAendern` hält das **kein** Seitenverhältnis fest. Die
 * gegenüberliegende Seite bleibt liegen, wie es beim Zuschneiden von Papier
 * auch wäre: man fasst eine Ecke an, die andere bleibt, wo sie war.
 *
 * `dx`/`dy` sind Bildpunkte des Quellbildes.
 */
export function kanteZiehen(
  start: Ausschnitt,
  kante: Kante,
  dx: number,
  dy: number,
  bildBreite: number,
  bildHoehe: number,
): Ausschnitt {
  let links = start.x;
  let oben = start.y;
  let rechts = start.x + start.breite;
  let unten = start.y + start.hoehe;

  // Jede Seite darf nur bis dicht an ihre Gegenseite und nie aus dem Bild.
  if (kante.includes("w")) links = Math.min(rechts - MINDESTKANTE, Math.max(0, links + dx));
  if (kante.includes("o")) rechts = Math.max(links + MINDESTKANTE, Math.min(bildBreite, rechts + dx));
  if (kante.startsWith("n")) oben = Math.min(unten - MINDESTKANTE, Math.max(0, oben + dy));
  if (kante.includes("s")) unten = Math.max(oben + MINDESTKANTE, Math.min(bildHoehe, unten + dy));

  return einpassen(
    { x: links, y: oben, breite: rechts - links, hoehe: unten - oben },
    bildBreite,
    bildHoehe,
  );
}

/**
 * Freihand: einen neuen Ausschnitt aus zwei Punkten aufziehen.
 *
 * Welcher der beiden Punkte zuerst kam, ist gleich – gezogen werden darf in
 * jede Richtung.
 */
export function ausRechteck(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bildBreite: number,
  bildHoehe: number,
): Ausschnitt {
  const links = Math.max(0, Math.min(x1, x2));
  const oben = Math.max(0, Math.min(y1, y2));
  const rechts = Math.min(bildBreite, Math.max(x1, x2));
  const unten = Math.min(bildHoehe, Math.max(y1, y2));
  return einpassen(
    { x: links, y: oben, breite: rechts - links, hoehe: unten - oben },
    bildBreite,
    bildHoehe,
  );
}

/**
 * Freihand mit Knöpfen: nur die Breite **oder** nur die Höhe ändern, um die
 * Mitte herum. Damit kommt auch ans Ziel, wer nicht ziehen mag oder mit der
 * Maus keine Ecke trifft – das Seitenverhältnis wird dabei bewusst frei.
 */
export function seiteAendern(
  a: Ausschnitt,
  seite: "breite" | "hoehe",
  faktor: number,
  bildBreite: number,
  bildHoehe: number,
): Ausschnitt {
  if (seite === "breite") {
    const breite = Math.min(bildBreite, Math.max(MINDESTKANTE, a.breite * faktor));
    return einpassen({ ...a, x: a.x + (a.breite - breite) / 2, breite }, bildBreite, bildHoehe);
  }
  const hoehe = Math.min(bildHoehe, Math.max(MINDESTKANTE, a.hoehe * faktor));
  return einpassen({ ...a, y: a.y + (a.hoehe - hoehe) / 2, hoehe }, bildBreite, bildHoehe);
}
