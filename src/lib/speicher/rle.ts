/**
 * Lauflängenkodierung für Raster.
 *
 * Ein Zählmuster besteht aus großen Flächen derselben Farbe – nach der
 * Glättung erst recht. Genau dafür ist die Lauflängenkodierung gemacht: statt
 * 20.000 einzelner Bytes stehen dann ein paar hundert Paare aus „Farbe" und
 * „so oft hintereinander" in der Datei. Bei einem geglätteten Muster sind das
 * typischerweise 20 bis 50 Mal weniger Daten.
 *
 * Format (alles little endian):
 *
 *   Byte 0..3    Kennung "STMR"
 *   Byte 4       Version (1)
 *   Byte 5       Anzahl Ebenen (2: Basis und Bearbeitung)
 *   Byte 6..9    Breite  (uint32)
 *   Byte 10..13  Höhe    (uint32)
 *   ab Byte 14   je Ebene: uint32 Anzahl Läufe, danach die Läufe
 *
 * Ein Lauf ist: int16 Wert (-1 = unberührt, sonst Palettenindex),
 * uint32 Länge. Sechs Byte je Lauf, dafür ohne jede Begrenzung der Lauflänge.
 */

const KENNUNG = 0x524d5453; // "STMR" als uint32 little endian
const VERSION = 1;

export type Rasterdatei = {
  breite: number;
  hoehe: number;
  basis: Uint8Array;
  bearbeitung: Int16Array;
};

/** Läufe einer Ebene zählen, um die Dateigröße vorab zu kennen. */
function laeufeZaehlen(werte: ArrayLike<number>): number {
  if (werte.length === 0) return 0;
  let laeufe = 1;
  for (let i = 1; i < werte.length; i++) {
    if (werte[i] !== werte[i - 1]) laeufe++;
  }
  return laeufe;
}

function ebeneSchreiben(sicht: DataView, offset: number, werte: ArrayLike<number>): number {
  const anzahl = laeufeZaehlen(werte);
  sicht.setUint32(offset, anzahl, true);
  let pos = offset + 4;

  if (werte.length > 0) {
    let wert = werte[0];
    let laenge = 1;
    for (let i = 1; i <= werte.length; i++) {
      if (i < werte.length && werte[i] === wert) {
        laenge++;
        continue;
      }
      sicht.setInt16(pos, wert, true);
      sicht.setUint32(pos + 2, laenge, true);
      pos += 6;
      if (i < werte.length) {
        wert = werte[i];
        laenge = 1;
      }
    }
  }

  return pos;
}

function ebeneLesen(sicht: DataView, offset: number, ziel: Int16Array | Uint8Array): number {
  const anzahl = sicht.getUint32(offset, true);
  let pos = offset + 4;
  let schreib = 0;

  for (let l = 0; l < anzahl; l++) {
    const wert = sicht.getInt16(pos, true);
    const laenge = sicht.getUint32(pos + 2, true);
    pos += 6;
    const ende = Math.min(ziel.length, schreib + laenge);
    ziel.fill(wert, schreib, ende);
    schreib = ende;
  }

  return pos;
}

export function rasterPacken(datei: Rasterdatei): Uint8Array {
  const laeufeBasis = laeufeZaehlen(datei.basis);
  const laeufeBearbeitung = laeufeZaehlen(datei.bearbeitung);
  const groesse = 14 + 4 + laeufeBasis * 6 + 4 + laeufeBearbeitung * 6;

  const puffer = new ArrayBuffer(groesse);
  const sicht = new DataView(puffer);

  sicht.setUint32(0, KENNUNG, true);
  sicht.setUint8(4, VERSION);
  sicht.setUint8(5, 2);
  sicht.setUint32(6, datei.breite, true);
  sicht.setUint32(10, datei.hoehe, true);

  const pos = ebeneSchreiben(sicht, 14, datei.basis);
  ebeneSchreiben(sicht, pos, datei.bearbeitung);

  return new Uint8Array(puffer);
}

export function rasterEntpacken(daten: Uint8Array): Rasterdatei {
  const sicht = new DataView(daten.buffer, daten.byteOffset, daten.byteLength);

  if (sicht.getUint32(0, true) !== KENNUNG) {
    throw new Error("Die Datei enthält kein Stickmuster.");
  }
  const version = sicht.getUint8(4);
  if (version !== VERSION) {
    throw new Error(`Diese Datei stammt aus einer neueren Fassung (Version ${version}).`);
  }

  const breite = sicht.getUint32(6, true);
  const hoehe = sicht.getUint32(10, true);
  const felder = breite * hoehe;

  const basis = new Uint8Array(felder);
  const bearbeitung = new Int16Array(felder);

  const nachBasis = ebeneLesen(sicht, 14, basis);
  ebeneLesen(sicht, nachBasis, bearbeitung);

  return { breite, hoehe, basis, bearbeitung };
}
