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
 */

import { ciede2000, labAbstandQuadrat } from "@/lib/farbe/ciede2000";
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
        const d = labAbstandQuadrat(farbe, palette[c]);
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
 * @param mindestGroesse  Flächen darunter werden anschließend aufgelöst
 * @param durchlaeufe  3 bis 5 – mehr bringt praktisch nichts mehr
 */
export function glaetten(
  start: Uint16Array,
  liste: Abstandsliste,
  breite: number,
  lambda: number,
  mindestGroesse = 1,
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
  // Erst die harte Regel für Felder ohne jeden gleichfarbigen Nachbarn …
  aufraeumen(raster, breite, k);
  // … danach die gröberen Flecken, deren Größe am Schieberegler hängt.
  kleineFlaechenAufloesen(raster, breite, mindestGroesse);

  return { raster, kennzahlen: kennzahlenBerechnen(raster, breite) };
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
 * fotoartigen Vorlagen zeigen das deutlich: oberhalb von lambda ≈ 7 ändert
 * sich am Muster nichts mehr.
 *
 * Deshalb dieser zweite, gröbere Durchgang: eine zusammenhängende Fläche,
 * die kleiner als `mindestGroesse` Stiche ist, wird komplett auf die Farbe
 * gesetzt, mit der sie am längsten aneinandergrenzt. Erst damit macht die
 * obere Hälfte des Schiebereglers einen sichtbaren Unterschied und die
 * Beschriftung „ruhig und einfach zu sticken" hält, was sie verspricht.
 *
 * Der Durchgang wird wiederholt, weil aus zwei benachbarten kleinen Flächen
 * nach dem Auflösen eine größere werden kann, die dann stehen bleiben darf.
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
    const { flaeche, groessen } = flaechenFinden(raster, breite);

    // Für jede zu kleine Fläche zählen, an welche Farbe sie am längsten
    // grenzt. Gezählt wird in einer Zuordnung und nicht in einem Feld über
    // die ganze Palette: eine kleine Fläche grenzt an eine Handvoll Farben,
    // und bei vielen kleinen Flächen wäre je ein Feld über 375 Farben ein
    // Vielfaches an Speicher.
    const zuKlein = new Map<number, Map<number, number>>();
    for (let f = 0; f < groessen.length; f++) {
      if (groessen[f] < mindestGroesse) zuKlein.set(f, new Map());
    }
    if (zuKlein.size === 0) break;

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
    if (ersatz.size === 0) break;

    let geaendert = 0;
    for (let i = 0; i < raster.length; i++) {
      const neu = ersatz.get(flaeche[i]);
      if (neu === undefined || neu === raster[i]) continue;
      raster[i] = neu;
      geaendert++;
    }

    aufgeloest += geaendert;
    if (geaendert === 0) break;
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
