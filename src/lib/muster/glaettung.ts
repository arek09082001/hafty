/**
 * Glättung gegen Einzelstiche.
 * ---------------------------------------------------------------------------
 *
 * Das ist die wichtigste Funktion der ganzen App. Ein einzelner Stich einer
 * Farbe mitten in einer Fläche sieht auf dem Bildschirm nach nichts aus, für
 * die Nutzerin bedeutet er aber: Nadel ausfädeln, neues Garn holen,
 * einfädeln, einen Stich machen, wieder zurück. Ein Muster mit 300 solcher
 * Einzelstiche ist nicht zu sticken, auch wenn es hübsch aussieht.
 *
 * Nach der Quantisierung läuft deshalb eine Regularisierung über das Raster.
 * Zugrunde liegt ein Markov-Random-Field: jedes Feld hat eine eigene
 * Vorliebe (welche Palettenfarbe seiner Originalfarbe am nächsten kommt) und
 * einen Hang dazu, so auszusehen wie seine Nachbarn. Die Kostenfunktion
 * wiegt beides gegeneinander ab:
 *
 *     Kosten(Feld, Farbe) = ΔE(Originalfarbe, Garnfarbe)
 *                           + lambda * Anzahl abweichender Nachbarn (8er)
 *
 * Der erste Term zieht in Richtung Bildtreue, der zweite in Richtung großer
 * zusammenhängender Flächen. `lambda` ist das Gewicht dazwischen und in der
 * Oberfläche der Schieberegler von „sehr detailliert" bis „ruhig und einfach
 * zu sticken".
 *
 * Minimiert wird mit **Iterated Conditional Modes** (ICM): drei bis fünf
 * Durchläufe über das gesamte Raster, in jedem bekommt jedes Feld die Farbe
 * mit den geringsten Kosten – unter der Annahme, dass die Nachbarn gerade so
 * bleiben, wie sie sind. Das findet nicht garantiert das globale Optimum,
 * konvergiert aber schnell und stabil, und für unseren Zweck reicht das
 * völlig aus.
 *
 * Danach ein Aufräumdurchgang: Felder, die immer noch keinen einzigen
 * gleichfarbigen Nachbarn haben, werden hart auf die häufigste Nachbarfarbe
 * gesetzt. ICM lässt solche Felder stehen, wenn ihre Farbtreue die Strafe
 * gerade noch aufwiegt – gestickt werden will das trotzdem niemand.
 *
 * In der linken Hälfte des Reglers bleibt dieser Durchgang aus: dort ist
 * ausdrücklich das ungeglättete Bild gewollt, in dem jedes Kästchen seine
 * eigene Farbe haben darf. Wie viel davon übrig bleibt, entscheidet dort
 * allein `lambda` – fein und in Stufen, während der Aufräumdurchgang alle
 * Einzelstiche auf einmal nähme.
 */

import { ciede2000 } from "@/lib/farbe/ciede2000";
import type { Lab } from "@/lib/farbe/lab";
import type { Kennzahlen } from "./typen";

/**
 * Die Abstandsliste: je Feld die farblich nächstliegenden Palettenfarben.
 * ---------------------------------------------------------------------------
 *
 * Sie wird einmal berechnet und bei jeder Änderung des Schiebereglers
 * wiederverwendet. Das ist der Grund, warum sich der Regler live anfühlt: die
 * teuren CIEDE2000-Aufrufe stecken alle in dieser Liste, das eigentliche ICM
 * danach besteht nur noch aus Nachschlagen und Vergleichen.
 *
 * Warum nur die nächsten zwölf und nicht der Abstand zu **jeder** Farbe?
 * Weil eine volle Tabelle mit der Farbanzahl wächst: Felder × Farben × 4 Byte
 * sind bei 160.000 Feldern und 48 Farben 30 MB, bei 375 Farben aber 240 MB.
 * Das überlebt kein Tablet. Die kurze Liste kostet dagegen immer gleich viel
 * (rund 12 MB), egal wie viele Farben die Nutzerin einstellt.
 *
 * Und sie reicht auch aus. Die Kosten eines Feldes sind
 *
 *     Kosten(c) = ΔE(c) + lambda * (Nachbarn − Nachbarn mit Farbe c)
 *
 * Für jede Farbe, die in der Nachbarschaft **nicht** vorkommt, ist der zweite
 * Term derselbe. Unter diesen Farben gewinnt also immer die farbtreueste –
 * und die steht in der Liste. Zu prüfen bleiben damit nur noch die höchstens
 * acht Farben der Nachbarschaft selbst. Deswegen zwölf Plätze: acht mögliche
 * Nachbarfarben plus Luft, damit die beste Nicht-Nachbarfarbe immer noch
 * darunter ist. Das Ergebnis ist Feld für Feld dasselbe wie mit der vollen
 * Tabelle, nur ohne deren Speicher.
 */
export const KANDIDATEN = 12;

/**
 * Ab dieser Palettengröße wird vorgefiltert: statt CIEDE2000 gegen jede
 * Farbe zu rechnen, kommen erst die 32 im Lab-Raum nächstliegenden in die
 * engere Wahl und nur für die wird genau gerechnet.
 *
 * Der Grund ist die Zeit: CIEDE2000 ist teuer (Wurzeln, Winkel, e-Funktion),
 * und 160.000 Felder × 375 Farben wären 60 Millionen Aufrufe. Der euklidische
 * Lab-Abstand kostet einen Bruchteil davon und ordnet fast gleich; die 32
 * engsten enthalten die zwölf besten praktisch immer.
 *
 * „Praktisch immer" reicht für kleine Paletten nicht – da wird ohnehin nicht
 * gespart, deshalb die Grenze. Bis 64 Farben rechnet die App genau, und alles,
 * was diese App bisher konnte, liegt darunter.
 */
const GENAU_BIS = 64;
const VORAUSWAHL = 32;

/**
 * Quadrierter euklidischer Lab-Abstand – nur für die Vorauswahl.
 *
 * Grob, aber billig: es geht allein darum, welche 32 Farben überhaupt in die
 * genaue Rechnung kommen. Entschieden wird danach mit CIEDE2000.
 */
function grobAbstand(f: Lab, g: Lab): number {
  const dL = f.L - g.L;
  const da = f.a - g.a;
  const db = f.b - g.b;
  return dL * dL + da * da + db * db;
}

/** Je Feld die nächstliegenden Palettenfarben, nach Abstand aufsteigend. */
export type Abstandsliste = {
  /** `je` Palettenindizes für jedes Feld, hintereinander. */
  farben: Uint16Array;
  /** Die zugehörigen CIEDE2000-Abstände, in derselben Reihenfolge. */
  abstaende: Float32Array;
  /** Einträge je Feld: `min(k, KANDIDATEN)`. */
  je: number;
  /** Anzahl Palettenfarben. */
  k: number;
  /** Die Palette – für den seltenen Nachschlag einer Nachbarfarbe. */
  palette: Lab[];
  /** Die Originalfarben des Rasters – ebenfalls für den Nachschlag. */
  quellLab: Float32Array;
};

export function abstandslisteBauen(quellLab: Float32Array, palette: Lab[]): Abstandsliste {
  const felder = quellLab.length / 3;
  const k = palette.length;
  const je = Math.max(1, Math.min(k, KANDIDATEN));

  const farben = new Uint16Array(felder * je);
  const abstaende = new Float32Array(felder * je);

  // Die laufende Bestenliste eines Feldes, wiederverwendet statt allokiert.
  const besteD = new Float64Array(je);
  const besteC = new Int32Array(je);

  // Nur für die Vorauswahl bei großen Paletten.
  const engereD = new Float64Array(VORAUSWAHL);
  const engereC = new Int32Array(VORAUSWAHL);
  const vorfiltern = k > GENAU_BIS;

  for (let i = 0; i < felder; i++) {
    const farbe: Lab = {
      L: quellLab[i * 3],
      a: quellLab[i * 3 + 1],
      b: quellLab[i * 3 + 2],
    };

    let anzahl = 0;

    if (vorfiltern) {
      // Erst grob im Lab-Raum aussieben …
      let eng = 0;
      for (let c = 0; c < k; c++) {
        const d = grobAbstand(farbe, palette[c]);
        if (eng === VORAUSWAHL && d >= engereD[eng - 1]) continue;
        let pos = eng < VORAUSWAHL ? eng : VORAUSWAHL - 1;
        while (pos > 0 && engereD[pos - 1] > d) {
          engereD[pos] = engereD[pos - 1];
          engereC[pos] = engereC[pos - 1];
          pos--;
        }
        engereD[pos] = d;
        engereC[pos] = c;
        if (eng < VORAUSWAHL) eng++;
      }
      // … und nur für die engere Wahl genau rechnen.
      for (let e = 0; e < eng; e++) {
        anzahl = einsortieren(besteD, besteC, je, anzahl, engereC[e], farbe, palette);
      }
    } else {
      for (let c = 0; c < k; c++) {
        anzahl = einsortieren(besteD, besteC, je, anzahl, c, farbe, palette);
      }
    }

    const basis = i * je;
    for (let m = 0; m < je; m++) {
      // Bei einer Palette, die kürzer ist als die Liste, bleibt hinten die
      // letzte Farbe stehen – gelesen wird nur, was auch gefüllt wurde.
      const gueltig = m < anzahl ? m : Math.max(0, anzahl - 1);
      farben[basis + m] = besteC[gueltig];
      abstaende[basis + m] = besteD[gueltig];
    }
  }

  return { farben, abstaende, je, k, palette, quellLab };
}

/**
 * Eine Farbe in die Bestenliste eines Feldes einsortieren.
 *
 * Gerundet wird auf 32 Bit, weil die Liste in einem Float32Array landet:
 * so entscheidet beim Vergleichen später genau derselbe Wert, mit dem hier
 * sortiert wurde. Bei gleichem Abstand bleibt der kleinere Farbindex vorn –
 * zwei Garne mit demselben Farbwert gibt es im Katalog wirklich, und ohne
 * diese Regel hinge es vom Zufall ab, welches von beiden gewählt wird.
 */
function einsortieren(
  besteD: Float64Array,
  besteC: Int32Array,
  je: number,
  anzahl: number,
  c: number,
  farbe: Lab,
  palette: Lab[],
): number {
  const d = Math.fround(ciede2000(farbe, palette[c]));
  if (anzahl === je && d >= besteD[je - 1]) return anzahl;

  let pos = anzahl < je ? anzahl : je - 1;
  while (pos > 0 && besteD[pos - 1] > d) {
    besteD[pos] = besteD[pos - 1];
    besteC[pos] = besteC[pos - 1];
    pos--;
  }
  besteD[pos] = d;
  besteC[pos] = c;
  return anzahl < je ? anzahl + 1 : anzahl;
}

/**
 * Der Abstand eines Feldes zu einer bestimmten Farbe.
 *
 * Fast immer steht er in der Liste. Nur wenn eine Nachbarfarbe so weit weg
 * ist, dass sie es nicht unter die zwölf geschafft hat, wird sie hier
 * nachgerechnet – an einer Kante zwischen zwei sehr verschiedenen Flächen
 * kommt das vor, sonst kaum.
 */
function abstandVon(liste: Abstandsliste, i: number, c: number): number {
  const basis = i * liste.je;
  for (let m = 0; m < liste.je; m++) {
    if (liste.farben[basis + m] === c) return liste.abstaende[basis + m];
  }
  const j = i * 3;
  return Math.fround(
    ciede2000(
      { L: liste.quellLab[j], a: liste.quellLab[j + 1], b: liste.quellLab[j + 2] },
      liste.palette[c],
    ),
  );
}

/**
 * Jedes Feld bekommt die Palettenfarbe mit dem kleinsten Farbabstand –
 * das Ergebnis ohne jede Glättung (lambda = 0), also der Ausgangspunkt.
 */
export function ohneGlaettungZuordnen(liste: Abstandsliste): Uint16Array {
  const felder = liste.farben.length / liste.je;
  const raster = new Uint16Array(felder);
  for (let i = 0; i < felder; i++) raster[i] = liste.farben[i * liste.je];
  return raster;
}

/**
 * Die Schwellenmatrix: blaues Rauschen, 32 × 32.
 * ---------------------------------------------------------------------------
 *
 * Sie sagt für jedes Kästchen, ab welchem Mischungsanteil das zweite Garn
 * genommen wird. Hier stand eine Bayer-Matrix, und die hat einen Fehler, den
 * man erst am Muster sieht: sie ist regelmäßig. In jeder Fläche, die zur
 * Hälfte gemischt wird, zeichnet sie ein sauberes Karo. Das ist Struktur,
 * die nicht aus dem Foto kommt – und sie überdeckt genau die, die man sucht.
 * Wer Blätter sehen will, sieht ein Gewebe.
 *
 * Blaues Rauschen hat dieselbe gleichmäßige Verteilung ohne die Ordnung:
 * benachbarte Kästchen haben möglichst verschiedene Schwellen, aber es gibt
 * kein wiederkehrendes Muster. Gebaut wird es mit **void-and-cluster**: ein
 * zufälliges Startmuster wird auseinandergezogen (der dichteste Punkt wandert
 * in die größte Lücke), danach werden die Punkte in beide Richtungen
 * durchnummeriert – rückwärts der jeweils dichteste, vorwärts die jeweils
 * größte Lücke.
 *
 * Das kostet einmal 6 ms beim Start des Workers, weil die Dichte
 * fortgeschrieben und nicht jedes Mal neu gerechnet wird. Naiv gerechnet
 * wären es 2,5 Sekunden.
 *
 * Zufall statt Matrix wäre der einfachere Ausweg und ist der schlechtere:
 * gemessen 114 statt 128 Farbwechsel je Reihe – weiße Flecken statt
 * gleichmäßiger Mischung.
 */
const SCHWELLEN_KANTE = 32;

function blauesRauschenBauen(N: number): Float64Array {
  const gesamt = N * N;
  const belegt = new Uint8Array(gesamt);
  const rang = new Int32Array(gesamt).fill(-1);
  const dichte = new Float64Array(gesamt);

  // Der Kern, mit dem ein gesetzter Punkt seine Umgebung „besetzt".
  const R = 4;
  const SIGMA = 1.5;
  const gewichte: number[] = [];
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      gewichte.push(Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA)));
    }
  }

  // Die Fläche ist ringsum geschlossen (modulo N), damit die Kachel nahtlos
  // aneinanderpasst – sonst sähe man die Nähte alle 32 Stiche.
  const anfassen = (i: number, zeichen: number) => {
    const y = (i / N) | 0;
    const x = i % N;
    let k = 0;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++, k++) {
        const yy = (y + dy + N) % N;
        const xx = (x + dx + N) % N;
        dichte[yy * N + xx] += zeichen * gewichte[k];
      }
    }
  };
  const setzen = (i: number) => {
    belegt[i] = 1;
    anfassen(i, 1);
  };
  const loeschen = (i: number) => {
    belegt[i] = 0;
    anfassen(i, -1);
  };
  const extrem = (suche: number, gross: boolean) => {
    let best = -1;
    let wert = gross ? -Infinity : Infinity;
    for (let i = 0; i < gesamt; i++) {
      if (belegt[i] !== suche) continue;
      if (gross ? dichte[i] > wert : dichte[i] < wert) {
        wert = dichte[i];
        best = i;
      }
    }
    return best;
  };

  // Fester Zufall: dasselbe Foto soll immer dasselbe Muster ergeben.
  let saat = 20260910;
  const zufall = () => ((saat = (saat * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  const anzahl = Math.max(1, Math.round(gesamt / 10));
  for (let n = 0; n < anzahl; ) {
    const i = Math.floor(zufall() * gesamt);
    if (!belegt[i]) {
      setzen(i);
      n++;
    }
  }

  // Das Startmuster auseinanderziehen, bis nichts mehr wandert.
  for (let runde = 0; runde < 200; runde++) {
    const dichtester = extrem(1, true);
    loeschen(dichtester);
    const luecke = extrem(0, false);
    if (luecke === dichtester) {
      setzen(dichtester);
      break;
    }
    setzen(luecke);
  }
  const anfang = Uint8Array.from(belegt);
  const anfangsDichte = Float64Array.from(dichte);

  // Rückwärts: immer den dichtesten wegnehmen.
  let n = anzahl - 1;
  while (n >= 0) {
    const i = extrem(1, true);
    loeschen(i);
    rang[i] = n--;
  }

  // Vorwärts: immer die größte Lücke füllen.
  belegt.set(anfang);
  dichte.set(anfangsDichte);
  n = anzahl;
  while (n < gesamt) {
    const i = extrem(0, false);
    setzen(i);
    rang[i] = n++;
  }

  const aus = new Float64Array(gesamt);
  for (let i = 0; i < gesamt; i++) aus[i] = (rang[i] + 0.5) / gesamt;
  return aus;
}

/** Einmal beim Laden gebaut und danach für jedes Muster dieselbe. */
const SCHWELLEN = blauesRauschenBauen(SCHWELLEN_KANTE);

/**
 * Wie weit sich die Arbeitsfarbe von der echten entfernen darf (in dE).
 *
 * Ohne diesen Riegel läuft der mitgeschleppte Fehler weg. Eine Garnpalette
 * füllt den Farbraum nicht gleichmäßig; zeigt der Fehler in eine Richtung,
 * in der kein Garn liegt, wächst er weiter, und irgendwann rastet ein ganzes
 * Gebiet auf einer Farbe ein, die mit der Vorlage nichts mehr zu tun hat.
 * Gemessen war das der Grund, warum volle Stärke früher schlechter aussah
 * als gedämpfte: die größte einfarbige Fläche wuchs von 401 auf 3174 Stiche.
 * Mit Riegel sind es 363 – kleiner als ganz ohne Farbverlauf.
 */
const RIEGEL = 4;

/**
 * Zuordnung mit nachgeahmtem Farbverlauf.
 * ---------------------------------------------------------------------------
 *
 * Mit 375 Garnen lässt sich ein Foto nicht treffen. Wo die Vorlage zwischen
 * zwei Grüntönen liegt, bekommt sie einen von beiden – und eine Fläche, die
 * im Foto um 8 dE schwankt, wird zu einem einzigen flachen Fleck. Genau das
 * war zu sehen und genau das soll hier weg.
 *
 * Drei Sachen zusammen:
 *
 *  1. **Zwei Garne mischen.** Zu jedem Feld werden die zwei nächsten Garne
 *     gesucht, die Zielfarbe auf die Strecke zwischen ihnen projiziert und
 *     daraus der Mischungsanteil gewonnen. Ob das Feld das eine oder das
 *     andere bekommt, entscheidet die Schwellenmatrix. Damit wird überall
 *     dort gemischt, wo die Vorlage zwischen zwei Garnen liegt – und nicht
 *     nur dort, wo zufällig ein Fehler übrig bleibt.
 *  2. **Den Rest weiterreichen** (Floyd-Steinberg). Das Mischen trifft nur
 *     die Strecke zwischen den beiden Garnen; was quer dazu fehlt, geht an
 *     die Nachbarn. Erst dadurch stimmt auch der Mittelwert.
 *  3. **In Schlangenlinien.** Jede zweite Reihe rückwärts. Läuft man immer
 *     in dieselbe Richtung, zieht der Fehler sichtbare Schlieren nach rechts.
 *
 * Gemessen an einer Waldvorlage, 100 × 105 Stiche, 20 Farben:
 *
 * | | Wechsel je Reihe | größte einfarbige Fläche |
 * | --- | ---: | ---: |
 * | ohne Farbverlauf | 59 | 471 |
 * | nur Fehlerdiffusion, gedämpft | 56 | **909** |
 * | mischen + Rest weiterreichen | **65** | **363** |
 *
 * Die mittlere Fehlerdiffusion allein machte die Flächen also **größer** als
 * gar keine – sie schiebt den Fehler so lange vor sich her, bis er auf
 * einmal umschlägt. Erst das gezielte Mischen bricht die Flächen wirklich
 * auf.
 *
 * Bezahlt wird das damit, dass das Muster Stich für Stich weiter von der
 * Vorlage weg ist. Von zwei Schritten Entfernung ist es näher dran, und
 * darum geht es beim Sticken.
 */
export function verlaufZuordnen(
  liste: Abstandsliste,
  breite: number,
  staerke: number,
): Uint16Array {
  const felder = liste.quellLab.length / 3;
  const hoehe = felder / breite;
  const palette = liste.palette;
  const quell = liste.quellLab;

  // Auf einer Kopie arbeiten, in die der Fehler eingerechnet wird.
  const arbeit = Float32Array.from(quell);
  const raster = new Uint16Array(felder);

  for (let y = 0; y < hoehe; y++) {
    const rueckwaerts = y % 2 === 1;

    for (let n = 0; n < breite; n++) {
      const x = rueckwaerts ? breite - 1 - n : n;
      const i = y * breite + x;
      const j = i * 3;

      // --- Riegel: so weit und nicht weiter ------------------------------
      const abL = arbeit[j] - quell[j];
      const aba = arbeit[j + 1] - quell[j + 1];
      const abb = arbeit[j + 2] - quell[j + 2];
      const weg = Math.sqrt(abL * abL + aba * aba + abb * abb);
      if (weg > RIEGEL) {
        const f = RIEGEL / weg;
        arbeit[j] = quell[j] + abL * f;
        arbeit[j + 1] = quell[j + 1] + aba * f;
        arbeit[j + 2] = quell[j + 2] + abb * f;
      }

      const zL = arbeit[j];
      const za = arbeit[j + 1];
      const zb = arbeit[j + 2];

      // --- Die zwei nächsten Garne ---------------------------------------
      // Geradliniger Lab-Abstand und nicht CIEDE2000: gesucht ist die Farbe,
      // die den Fehler am kleinsten macht, und der Fehler wird gleich als
      // Vektor weitergereicht. Beides muss dasselbe Maß haben, sonst zeigt
      // die Korrektur woanders hin als die Wahl.
      let erste = 0;
      let zweite = 0;
      let d1 = Infinity;
      let d2 = Infinity;
      for (let c = 0; c < palette.length; c++) {
        const dL = zL - palette[c].L;
        const da = za - palette[c].a;
        const db = zb - palette[c].b;
        const d = dL * dL + da * da + db * db;
        if (d < d1) {
          d2 = d1;
          zweite = erste;
          d1 = d;
          erste = c;
        } else if (d < d2) {
          d2 = d;
          zweite = c;
        }
      }

      // --- Mischungsanteil und Wahl --------------------------------------
      const A = palette[erste];
      const Z = palette[zweite];
      const vL = Z.L - A.L;
      const va = Z.a - A.a;
      const vb = Z.b - A.b;
      const laenge = vL * vL + va * va + vb * vb;
      let anteil =
        laenge > 0 ? ((zL - A.L) * vL + (za - A.a) * va + (zb - A.b) * vb) / laenge : 0;
      anteil = Math.max(0, Math.min(1, anteil)) * staerke;

      const gewaehlt =
        anteil > SCHWELLEN[(y % SCHWELLEN_KANTE) * SCHWELLEN_KANTE + (x % SCHWELLEN_KANTE)]
          ? zweite
          : erste;
      raster[i] = gewaehlt;

      // --- Was übrig bleibt, bekommen die Nachbarn ------------------------
      const g = palette[gewaehlt];
      const eL = (zL - g.L) * staerke;
      const ea = (za - g.a) * staerke;
      const eb = (zb - g.b) * staerke;
      const vor = rueckwaerts ? -1 : 1;

      const streuen = (sx: number, sy: number, teil: number) => {
        if (sx < 0 || sx >= breite || sy < 0 || sy >= hoehe) return;
        const p = (sy * breite + sx) * 3;
        arbeit[p] += eL * teil;
        arbeit[p + 1] += ea * teil;
        arbeit[p + 2] += eb * teil;
      };
      streuen(x + vor, y, 7 / 16);
      streuen(x - vor, y + 1, 3 / 16);
      streuen(x, y + 1, 5 / 16);
      streuen(x + vor, y + 1, 1 / 16);
    }
  }

  return raster;
}

export type GlaettungsErgebnis = {
  raster: Uint16Array;
  kennzahlen: Kennzahlen;
};

/**
 * Die eigentliche Glättung.
 *
 * @param start     Raster vor der Glättung (Palettenindizes)
 * @param liste     Abstandsliste aus `abstandslisteBauen`
 * @param breite    Rasterbreite
 * @param lambda    Gewicht der Nachbarschaftsstrafe
 * @param flaechenAnteil  Wie viel vom Muster die Flächenauflösung schlucken
 *                        darf, als Anteil aller Felder (0 = gar nichts).
 *                        Siehe `mindestflaecheFinden`.
 * @param durchlaeufe  3 bis 5 – mehr bringt praktisch nichts mehr
 */
export function glaetten(
  start: Uint16Array,
  liste: Abstandsliste,
  breite: number,
  lambda: number,
  flaechenAnteil = 0,
  durchlaeufe = 4,
): GlaettungsErgebnis {
  const raster = Uint16Array.from(start);
  const hoehe = raster.length / breite;
  const k = liste.k;
  const je = liste.je;

  // lambda = 0 heißt: keine Glättung. Dann bleibt alles, wie es ist, und
  // es werden nur noch die Kennzahlen gezählt.
  if (lambda > 0) {
    // Zähler für die 8er-Nachbarschaft. Genullt wird er nicht am Stück,
    // sondern gezielt an den höchstens acht Stellen, die ein Feld angefasst
    // hat: ein `fill(0)` über die ganze Palette wäre bei 375 Farben teurer
    // als die Rechnung selbst.
    const nachbarZaehler = new Int32Array(k);
    const nachbarFarben = new Int32Array(8);

    for (let durchlauf = 0; durchlauf < durchlaeufe; durchlauf++) {
      let veraendert = 0;

      for (let y = 0; y < hoehe; y++) {
        for (let x = 0; x < breite; x++) {
          const i = y * breite + x;

          // Wie oft kommt jede Farbe in der 8er-Nachbarschaft vor?
          let nachbarn = 0;
          let verschiedene = 0;

          for (let dy = -1; dy <= 1; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= hoehe) continue;
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const xx = x + dx;
              if (xx < 0 || xx >= breite) continue;
              const farbe = raster[yy * breite + xx];
              if (nachbarZaehler[farbe]++ === 0) nachbarFarben[verschiedene++] = farbe;
              nachbarn++;
            }
          }

          // Kosten je Farbe: Farbabstand plus Strafe für jeden Nachbarn,
          // der anders aussehen würde. Bei gleichen Kosten gewinnt der
          // kleinere Index – das hält das Ergebnis eindeutig.
          let besteFarbe = raster[i];
          let besteKosten = Infinity;

          // Erst die Farben, die in der Nachbarschaft schon vorkommen: nur
          // sie bekommen die Strafe ermäßigt.
          for (let n = 0; n < verschiedene; n++) {
            const c = nachbarFarben[n];
            const kosten = abstandVon(liste, i, c) + lambda * (nachbarn - nachbarZaehler[c]);
            if (kosten < besteKosten || (kosten === besteKosten && c < besteFarbe)) {
              besteKosten = kosten;
              besteFarbe = c;
            }
          }

          // Und dann die farbtreueste Farbe, die **nicht** vorkommt. Für alle
          // anderen wäre die Strafe genauso hoch, also kann keine von ihnen
          // billiger sein – die Liste ist nach Abstand sortiert, damit ist
          // die erste passende auch die beste.
          const basis = i * je;
          for (let m = 0; m < je; m++) {
            const c = liste.farben[basis + m];
            if (nachbarZaehler[c] > 0) continue;
            const kosten = liste.abstaende[basis + m] + lambda * nachbarn;
            if (kosten < besteKosten || (kosten === besteKosten && c < besteFarbe)) {
              besteKosten = kosten;
              besteFarbe = c;
            }
            break;
          }

          for (let n = 0; n < verschiedene; n++) nachbarZaehler[nachbarFarben[n]] = 0;

          if (raster[i] !== besteFarbe) {
            raster[i] = besteFarbe;
            veraendert++;
          }
        }
      }

      // Nichts mehr geändert – weitere Durchläufe wären reine Rechenzeit.
      if (veraendert === 0) break;
    }
  }

  // --- Aufräumdurchgang -----------------------------------------------------
  // Die linke Hälfte des Reglers lässt beide Durchgänge aus. Dort will die
  // Nutzerin das Bild sehen, wie die Farbwahl es ergibt: jedes einzelne
  // Kästchen darf seine eigene Farbe haben, und wie viel davon übrig bleibt,
  // entscheidet allein `lambda`.
  //
  // Früher hing das auch an `lambda`, und schon der erste Schritt nach
  // rechts riss deshalb alle Einzelstiche auf einmal heraus – ein Absturz
  // gleich am Anfang des Weges. `aufraeumen` ist eine harte Ja/Nein-Regel
  // und taugt nicht als Anfang einer Kurve. Es greift jetzt erst dort, wo
  // die Flächenauflösung beginnt, und findet dann nichts mehr zu tun: bei
  // dem `lambda`, das dort steht, hat das ICM den letzten Einzelstich
  // schon getilgt. Genau deshalb ist die Stelle unsichtbar.
  if (flaechenAnteil > 0) {
    // Erst die harte Regel für Felder ohne jeden gleichfarbigen Nachbarn …
    aufraeumen(raster, breite, k);
    // … danach die gröberen Flecken. Wie groß „klein" ist, steht nicht im
    // Regler, sondern wird am Muster selbst abgelesen.
    const mindestGroesse = mindestflaecheFinden(raster, breite, flaechenAnteil);
    if (mindestGroesse > 1) kleineFlaechenAufloesen(raster, breite, mindestGroesse);
  }

  return { raster, kennzahlen: kennzahlenBerechnen(raster, breite) };
}

/**
 * Aus „so viel darf verschwinden" die Fläche machen, unter der aufgelöst wird.
 * ---------------------------------------------------------------------------
 *
 * Der Regler gab früher direkt eine Zahl vor: „alles unter 200 Feldern wird
 * aufgelöst". Das klingt greifbar und ist trotzdem unbrauchbar, weil 200
 * Felder in jedem Muster etwas anderes bedeuten. Bei einem Foto mit vielen
 * kleinen Flecken ist es ein großer Eingriff, bei einem mit wenigen großen
 * Flächen findet es überhaupt nichts – und dann steht der halbe Regler still,
 * ohne dass man ihm ansieht, warum. Genau das war zu sehen: zwischen den
 * Stellungen 25 und 70 änderte sich buchstäblich kein einziges Feld.
 *
 * Also andersherum gefragt: **wie viel vom Muster** darf die Glättung
 * schlucken? Dazu werden die vorhandenen Flächen der Größe nach aufgereiht
 * und von unten aufsummiert, bis der erlaubte Anteil erreicht ist. Die
 * Fläche, bei der Schluss ist, ist die Grenze.
 *
 * Damit heißt eine Reglerstellung in jedem Muster dasselbe – nicht „unter
 * 200 Feldern", sondern „ungefähr ein Fünftel des Bildes darf zusammenfallen".
 * Und weil das die Größe ist, die die Nutzerin am Muster auch sieht, sind die
 * Schritte am Regler von links nach rechts ungefähr gleich groß.
 */
export function mindestflaecheFinden(
  raster: Uint16Array,
  breite: number,
  anteil: number,
): number {
  if (anteil <= 0) return 1;
  const { groessen } = flaechenFinden(raster, breite);
  if (groessen.length === 0) return 1;

  const sortiert = Int32Array.from(groessen).sort();
  const ziel = raster.length * anteil;

  let summe = 0;
  for (let i = 0; i < sortiert.length; i++) {
    // Die erste Fläche, die das Maß sprengt, ist die Grenze: alles echt
    // darunter fällt weg, sie selbst bleibt stehen.
    if (summe + sortiert[i] > ziel) return sortiert[i];
    summe += sortiert[i];
  }

  // Selbst alle Flächen zusammen bleiben unter dem Maß – dann darf auch die
  // größte fallen. Das ist die Stellung ganz rechts.
  return sortiert[sortiert.length - 1] + 1;
}

/**
 * Felder ohne einen einzigen gleichfarbigen Nachbarn werden hart auf die
 * häufigste Nachbarfarbe gesetzt.
 *
 * Das läuft auf einer Kopie des Rasters: sonst würde eine gerade geänderte
 * Farbe sofort die Entscheidung des nächsten Feldes beeinflussen, und aus
 * einem Einzelstich könnte sich eine Kette durch das halbe Bild fressen.
 */
export function aufraeumen(raster: Uint16Array, breite: number, k: number): number {
  const hoehe = raster.length / breite;
  const vorlage = Uint16Array.from(raster);
  const zaehler = new Int32Array(k);
  const nachbarFarben = new Int32Array(8);
  let bereinigt = 0;

  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const i = y * breite + x;
      const eigene = vorlage[i];

      let gleicheNachbarn = 0;
      let verschiedene = 0;

      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= hoehe) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const xx = x + dx;
          if (xx < 0 || xx >= breite) continue;
          const nachbar = vorlage[yy * breite + xx];
          if (zaehler[nachbar]++ === 0) nachbarFarben[verschiedene++] = nachbar;
          if (nachbar === eigene) gleicheNachbarn++;
        }
      }

      // Häufigste Nachbarfarbe suchen; bei Gleichstand die mit dem kleineren
      // Index. Kein Einzelstich – dann bleibt alles, wie es ist.
      let haeufigste = eigene;
      let hoechste = 0;
      if (gleicheNachbarn === 0) {
        for (let n = 0; n < verschiedene; n++) {
          const c = nachbarFarben[n];
          if (zaehler[c] > hoechste || (zaehler[c] === hoechste && c < haeufigste)) {
            hoechste = zaehler[c];
            haeufigste = c;
          }
        }
      }

      for (let n = 0; n < verschiedene; n++) zaehler[nachbarFarben[n]] = 0;

      if (gleicheNachbarn > 0) continue;
      if (hoechste > 0 && haeufigste !== eigene) {
        raster[i] = haeufigste;
        bereinigt++;
      }
    }
  }

  return bereinigt;
}

/**
 * Zusammenhängende Flächen einer Farbe finden (8er-Zusammenhang).
 *
 * Beim Sticken darf ein Faden diagonal weitergeführt werden, deshalb zählt
 * die 8er- und nicht die 4er-Nachbarschaft: zwei Felder, die sich nur über
 * die Ecke berühren, sind für die Nutzerin eine Fläche und ein Faden.
 *
 * Rückgabe: für jedes Feld die Nummer seiner Fläche, dazu die Größe jeder
 * Fläche. Das ist die Grundlage sowohl für die Kennzahlen als auch für das
 * Auflösen kleiner Flecken.
 */
export function flaechenFinden(
  raster: Uint16Array,
  breite: number,
): { flaeche: Int32Array; groessen: Int32Array } {
  const hoehe = raster.length / breite;
  const flaeche = new Int32Array(raster.length).fill(-1);
  const groessen: number[] = [];
  // Ein eigener Stapel statt Rekursion – bei 160.000 Feldern würde der
  // Aufrufstapel des Browsers sonst überlaufen.
  const stapel = new Int32Array(raster.length);

  for (let start = 0; start < raster.length; start++) {
    if (flaeche[start] >= 0) continue;

    const farbe = raster[start];
    const nummer = groessen.length;
    let groesse = 0;
    let spitze = 0;

    stapel[spitze++] = start;
    flaeche[start] = nummer;

    while (spitze > 0) {
      const i = stapel[--spitze];
      groesse++;
      const x = i % breite;
      const y = (i / breite) | 0;

      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= hoehe) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const xx = x + dx;
          if (xx < 0 || xx >= breite) continue;
          const j = yy * breite + xx;
          if (flaeche[j] >= 0 || raster[j] !== farbe) continue;
          flaeche[j] = nummer;
          stapel[spitze++] = j;
        }
      }
    }

    groessen.push(groesse);
  }

  return { flaeche, groessen: Int32Array.from(groessen) };
}

/**
 * Kleine Flecken auflösen.
 * ---------------------------------------------------------------------------
 *
 * Das ICM aus `glaetten()` arbeitet feldweise: es ändert immer nur ein Feld
 * und nimmt dabei alle Nachbarn als gegeben hin. Damit bekommt es einzelne
 * Stiche zuverlässig weg, aber es kommt gegen einen zwei Felder breiten
 * Streifen nicht an – für jedes einzelne Feld dieses Streifens ist Bleiben
 * billiger als Wechseln, egal wie groß `lambda` wird. Messungen an
 * fotoartigen Vorlagen zeigen das deutlich: oberhalb von lambda ≈ 0,5 ändert
 * sich am Muster nichts mehr, auch bei 100 nicht.
 *
 * Deshalb dieser zweite, gröbere Durchgang: eine zusammenhängende Fläche,
 * die kleiner als `mindestGroesse` Stiche ist, wird komplett auf die Farbe
 * gesetzt, mit der sie am längsten aneinandergrenzt. Erst damit macht die
 * obere Hälfte des Schiebereglers einen sichtbaren Unterschied und die
 * Beschriftung „ruhig und einfach zu sticken" hält, was sie verspricht.
 *
 * Der Durchgang wird wiederholt, und die Grenze wächst dabei von Durchlauf
 * zu Durchlauf bis zu `mindestGroesse` heran. Das ist wichtiger, als es
 * aussieht: alle zu kleinen Flächen auf einmal aufzulösen geht schief,
 * sobald die Grenze groß wird. Dann ist auf einmal fast alles „zu klein",
 * jede Fläche sucht sich gleichzeitig einen Nachbarn, und zwei benachbarte
 * Flächen wandern in verschiedene Richtungen. Gemessen kippte das Ergebnis
 * genau dort: ab etwa der Hälfte des Musters stieg die Zahl der Flächen
 * wieder an, statt weiter zu fallen – der Regler lief rückwärts.
 *
 * Von unten nach oben stimmt die Reihenfolge dagegen: erst gehen die
 * kleinsten Flecken in ihren Nachbarn auf, und wenn die Grenze dann steigt,
 * sind die Nachbarn wirklich größer geworden.
 */
export function kleineFlaechenAufloesen(
  raster: Uint16Array,
  breite: number,
  mindestGroesse: number,
  maxDurchlaeufe = 6,
): number {
  if (mindestGroesse <= 1) return 0;
  const hoehe = raster.length / breite;
  let aufgeloest = 0;

  for (let durchlauf = 0; durchlauf < maxDurchlaeufe; durchlauf++) {
    // Die Grenze dieses Durchlaufs: geometrisch bis zur eigentlichen hoch,
    // im letzten Durchlauf ist sie es genau.
    const grenze =
      durchlauf === maxDurchlaeufe - 1
        ? mindestGroesse
        : Math.max(2, Math.round(mindestGroesse ** ((durchlauf + 1) / maxDurchlaeufe)));

    const { flaeche, groessen } = flaechenFinden(raster, breite);

    // Für jede zu kleine Fläche zählen, an welche Farbe sie am längsten
    // grenzt. Gezählt wird in einer Zuordnung und nicht in einem Feld über
    // die ganze Palette: eine kleine Fläche grenzt an eine Handvoll Farben,
    // und bei vielen kleinen Flächen wäre je ein Feld über 375 Farben ein
    // Vielfaches an Speicher.
    const zuKlein = new Map<number, Map<number, number>>();
    for (let f = 0; f < groessen.length; f++) {
      if (groessen[f] < grenze) zuKlein.set(f, new Map());
    }
    if (zuKlein.size === 0) continue;

    for (let y = 0; y < hoehe; y++) {
      for (let x = 0; x < breite; x++) {
        const i = y * breite + x;
        const zaehler = zuKlein.get(flaeche[i]);
        if (!zaehler) continue;

        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= hoehe) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const xx = x + dx;
            if (xx < 0 || xx >= breite) continue;
            const j = yy * breite + xx;
            if (flaeche[j] === flaeche[i]) continue; // gehört zur Fläche selbst
            const farbe = raster[j];
            zaehler.set(farbe, (zaehler.get(farbe) ?? 0) + 1);
          }
        }
      }
    }

    // Die Ersatzfarbe je Fläche bestimmen; bei Gleichstand die mit dem
    // kleineren Index.
    const ersatz = new Map<number, number>();
    for (const [f, zaehler] of zuKlein) {
      let beste = -1;
      let hoechste = 0;
      for (const [c, anzahl] of zaehler) {
        if (anzahl > hoechste || (anzahl === hoechste && c < beste)) {
          hoechste = anzahl;
          beste = c;
        }
      }
      if (beste >= 0) ersatz.set(f, beste);
    }
    // Nichts zu tun heißt hier nur „bei dieser Grenze nicht" – der nächste
    // Durchlauf hat eine größere und findet vielleicht doch etwas.
    if (ersatz.size === 0) continue;

    let geaendert = 0;
    for (let i = 0; i < raster.length; i++) {
      const neu = ersatz.get(flaeche[i]);
      if (neu === undefined || neu === raster[i]) continue;
      raster[i] = neu;
      geaendert++;
    }

    aufgeloest += geaendert;
  }

  return aufgeloest;
}

/**
 * Die beiden Zahlen, die live unter dem Schieberegler stehen.
 *
 * - **Einzelne Stiche**: Stiche, die für sich allein oder zu zweit stehen –
 *   ihre Farbe kommt in ihrer zusammenhängenden Fläche höchstens zweimal
 *   vor. Genau diese Stellen kosten die Nutzerin je einen Einfädelvorgang
 *   für ein oder zwei Kreuze, und genau die soll die Glättung wegnehmen.
 *   (Die Felder ohne *jeden* gleichfarbigen Nachbarn sind darin enthalten;
 *   sie allein zu zählen würde nichts bringen, weil der Aufräumdurchgang
 *   sie ohnehin restlos entfernt und die Zahl dann immer null wäre.)
 * - **Farbwechsel pro Reihe**: durchschnittlich über alle Reihen, wie oft
 *   sich beim Sticken einer Reihe von links nach rechts die Farbe ändert.
 *   Das ist das Maß dafür, wie anstrengend eine Reihe zu sticken ist.
 */
export function kennzahlenBerechnen(raster: Uint16Array, breite: number): Kennzahlen {
  const hoehe = raster.length / breite;

  const { flaeche, groessen } = flaechenFinden(raster, breite);
  let einzelstiche = 0;
  for (let i = 0; i < raster.length; i++) {
    if (groessen[flaeche[i]] <= 2) einzelstiche++;
  }

  let wechselSumme = 0;
  for (let y = 0; y < hoehe; y++) {
    for (let x = 1; x < breite; x++) {
      const i = y * breite + x;
      if (raster[i - 1] !== raster[i]) wechselSumme++;
    }
  }

  return {
    einzelstiche,
    farbwechselProReihe: hoehe > 0 ? Math.round((wechselSumme / hoehe) * 10) / 10 : 0,
  };
}

/**
 * Nach der Glättung wird die Palette neu gezählt: welche Farben kommen
 * überhaupt noch vor? Fallen welche weg, sagt die Oberfläche das
 * („Aus 24 Farben sind 21 geworden.").
 *
 * Gibt die Zuordnung alter -> neuer Index zurück (-1 = fällt weg) sowie die
 * Stichzahl je verbleibender Farbe.
 */
export function paletteNeuZaehlen(
  raster: Uint16Array,
  k: number,
): { abbildung: Int32Array; stiche: number[]; anzahl: number } {
  const zaehler = new Int32Array(k);
  for (let i = 0; i < raster.length; i++) zaehler[raster[i]]++;

  const abbildung = new Int32Array(k).fill(-1);
  const stiche: number[] = [];
  let n = 0;
  for (let c = 0; c < k; c++) {
    if (zaehler[c] === 0) continue;
    abbildung[c] = n++;
    stiche.push(zaehler[c]);
  }

  return { abbildung, stiche, anzahl: n };
}
