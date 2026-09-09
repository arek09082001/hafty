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
 * Nur ganz links am Regler bleibt auch dieser Durchgang aus: dort ist
 * ausdrücklich das ungeglättete Bild gewollt, in dem jedes Kästchen seine
 * eigene Farbe haben darf.
 */

import { ciede2000 } from "@/lib/farbe/ciede2000";
import type { Lab } from "@/lib/farbe/lab";
import type { Kennzahlen } from "./typen";

/**
 * Die Abstandstabelle: für jedes Feld der Farbabstand zu jeder Palettenfarbe.
 *
 * Sie wird einmal berechnet und bei jeder Änderung des Schiebereglers
 * wiederverwendet. Das ist der Grund, warum sich der Regler live anfühlt: die
 * teuren CIEDE2000-Aufrufe stecken alle in dieser Tabelle, das eigentliche
 * ICM danach besteht nur noch aus Nachschlagen und Vergleichen.
 *
 * Speicher: Felder × Farben × 4 Byte. Bei 160.000 Feldern und 48 Farben sind
 * das 30 MB – vertretbar, und die Mustergröße ist genau deshalb begrenzt.
 */
export function abstandstabelleBauen(
  quellLab: Float32Array,
  palette: Lab[],
): Float32Array {
  const felder = quellLab.length / 3;
  const k = palette.length;
  const tabelle = new Float32Array(felder * k);

  for (let i = 0; i < felder; i++) {
    const farbe: Lab = {
      L: quellLab[i * 3],
      a: quellLab[i * 3 + 1],
      b: quellLab[i * 3 + 2],
    };
    for (let c = 0; c < k; c++) {
      tabelle[i * k + c] = ciede2000(farbe, palette[c]);
    }
  }

  return tabelle;
}

/**
 * Jedes Feld bekommt die Palettenfarbe mit dem kleinsten Farbabstand –
 * das Ergebnis ohne jede Glättung (lambda = 0), also der Ausgangspunkt.
 */
export function ohneGlaettungZuordnen(tabelle: Float32Array, k: number): Uint8Array {
  const felder = tabelle.length / k;
  const raster = new Uint8Array(felder);

  for (let i = 0; i < felder; i++) {
    let bester = 0;
    let besterAbstand = Infinity;
    for (let c = 0; c < k; c++) {
      const d = tabelle[i * k + c];
      if (d < besterAbstand) {
        besterAbstand = d;
        bester = c;
      }
    }
    raster[i] = bester;
  }

  return raster;
}

export type GlaettungsErgebnis = {
  raster: Uint8Array;
  kennzahlen: Kennzahlen;
};

/**
 * Die eigentliche Glättung.
 *
 * @param start     Raster vor der Glättung (Palettenindizes)
 * @param tabelle   Abstandstabelle aus `abstandstabelleBauen`
 * @param k         Anzahl Palettenfarben
 * @param breite    Rasterbreite
 * @param lambda    Gewicht der Nachbarschaftsstrafe
 * @param mindestGroesse  Flächen darunter werden anschließend aufgelöst
 * @param durchlaeufe  3 bis 5 – mehr bringt praktisch nichts mehr
 */
export function glaetten(
  start: Uint8Array,
  tabelle: Float32Array,
  k: number,
  breite: number,
  lambda: number,
  mindestGroesse = 1,
  durchlaeufe = 4,
): GlaettungsErgebnis {
  const raster = Uint8Array.from(start);
  const hoehe = raster.length / breite;

  // lambda = 0 heißt: keine Glättung. Dann bleibt alles, wie es ist, und
  // es werden nur noch die Kennzahlen gezählt.
  if (lambda > 0) {
    // Zähler für die 8er-Nachbarschaft, bei jedem Feld neu gefüllt.
    const nachbarZaehler = new Int32Array(k);

    for (let durchlauf = 0; durchlauf < durchlaeufe; durchlauf++) {
      let veraendert = 0;

      for (let y = 0; y < hoehe; y++) {
        for (let x = 0; x < breite; x++) {
          const i = y * breite + x;

          // Wie oft kommt jede Farbe in der 8er-Nachbarschaft vor?
          nachbarZaehler.fill(0);
          let nachbarn = 0;

          for (let dy = -1; dy <= 1; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= hoehe) continue;
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const xx = x + dx;
              if (xx < 0 || xx >= breite) continue;
              nachbarZaehler[raster[yy * breite + xx]]++;
              nachbarn++;
            }
          }

          // Kosten je Farbe: Farbabstand plus Strafe für jeden Nachbarn,
          // der anders aussehen würde.
          let besteFarbe = raster[i];
          let besteKosten = Infinity;
          const basis = i * k;

          for (let c = 0; c < k; c++) {
            const abweichendeNachbarn = nachbarn - nachbarZaehler[c];
            const kosten = tabelle[basis + c] + lambda * abweichendeNachbarn;
            if (kosten < besteKosten) {
              besteKosten = kosten;
              besteFarbe = c;
            }
          }

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
  // Ganz links am Regler (lambda = 0, mindestFlaeche = 1) wird gar nichts
  // aufgeräumt. Dort will die Nutzerin das Bild sehen, wie die Farbwahl es
  // ergibt: jedes einzelne Kästchen darf seine eigene Farbe haben. Erst mit
  // dem ersten Schritt nach rechts greifen die beiden Durchgänge.
  if (lambda > 0 || mindestGroesse > 1) {
    // Erst die harte Regel für Felder ohne jeden gleichfarbigen Nachbarn …
    aufraeumen(raster, breite, k);
    // … danach die gröberen Flecken, deren Größe am Schieberegler hängt.
    kleineFlaechenAufloesen(raster, breite, k, mindestGroesse);
  }

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
export function aufraeumen(raster: Uint8Array, breite: number, k: number): number {
  const hoehe = raster.length / breite;
  const vorlage = Uint8Array.from(raster);
  const zaehler = new Int32Array(k);
  let bereinigt = 0;

  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const i = y * breite + x;
      const eigene = vorlage[i];

      zaehler.fill(0);
      let gleicheNachbarn = 0;

      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= hoehe) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const xx = x + dx;
          if (xx < 0 || xx >= breite) continue;
          const nachbar = vorlage[yy * breite + xx];
          zaehler[nachbar]++;
          if (nachbar === eigene) gleicheNachbarn++;
        }
      }

      if (gleicheNachbarn > 0) continue; // kein Einzelstich

      // Häufigste Nachbarfarbe suchen.
      let haeufigste = eigene;
      let hoechste = 0;
      for (let c = 0; c < k; c++) {
        if (zaehler[c] > hoechste) {
          hoechste = zaehler[c];
          haeufigste = c;
        }
      }

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
  raster: Uint8Array,
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
  raster: Uint8Array,
  breite: number,
  k: number,
  mindestGroesse: number,
  maxDurchlaeufe = 6,
): number {
  if (mindestGroesse <= 1) return 0;
  const hoehe = raster.length / breite;
  let aufgeloest = 0;

  for (let durchlauf = 0; durchlauf < maxDurchlaeufe; durchlauf++) {
    const { flaeche, groessen } = flaechenFinden(raster, breite);

    // Für jede zu kleine Fläche zählen, an welche Farbe sie am längsten grenzt.
    const zuKlein = new Map<number, Int32Array>();
    for (let f = 0; f < groessen.length; f++) {
      if (groessen[f] < mindestGroesse) zuKlein.set(f, new Int32Array(k));
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
            zaehler[raster[j]]++;
          }
        }
      }
    }

    // Die Ersatzfarbe je Fläche bestimmen.
    const ersatz = new Map<number, number>();
    for (const [f, zaehler] of zuKlein) {
      let beste = -1;
      let hoechste = 0;
      for (let c = 0; c < k; c++) {
        if (zaehler[c] > hoechste) {
          hoechste = zaehler[c];
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
export function kennzahlenBerechnen(raster: Uint8Array, breite: number): Kennzahlen {
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
  raster: Uint8Array,
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
