"use client";

/**
 * Die Sicherung in der Ferne: Supabase.
 * ---------------------------------------------------------------------------
 *
 * Die App bleibt eine App, die auf dem Gerät arbeitet. Supabase ist nur das
 * **zweite Exemplar**: sobald Verbindung besteht, liegt jedes Muster auch
 * dort und übersteht damit ein verlorenes Tablet oder einen geleerten
 * Browserspeicher. Und weil alle Geräte denselben Bestand sehen, steht auf
 * dem Telefon dasselbe wie auf dem Tablet.
 *
 * Drei Dinge sind dabei wichtig:
 *
 *  - **Ohne Einrichtung ändert sich nichts.** Fehlen die beiden Angaben in
 *    der Umgebung, ist die Sicherung aus und die App verhält sich wie
 *    bisher. Keine Fehlermeldung, kein Hinweis, nichts.
 *  - **Es gibt keine Anmeldung – auch nicht im Hintergrund.** Geschickt wird
 *    nur der öffentliche Schlüssel, sonst nichts. Kein Zugang, der abläuft,
 *    keine Kennung, die ein Gerät vom anderen trennt, nichts, was beim
 *    Leeren des Browserspeichers verloren ginge.
 *
 *    Vorher meldete sich jedes Gerät im Hintergrund **anonym** an. Supabase
 *    legte dafür jedes Mal einen neuen Benutzer an, und die Regeln in der
 *    Datenbank liessen jeden nur an seine eigenen Zeilen. Die Sicherung lief
 *    also – aber jedes Gerät sicherte in seine eigene Ecke, und auf dem
 *    zweiten Gerät stand nichts.
 *
 *    Der Preis dafür steht in der Migration: **wer den öffentlichen
 *    Schlüssel hat, kommt an die Muster.** Er steht im Programmtext jeder
 *    ausgelieferten Seite. Für eine Handvoll Stickmuster ist das der bewusst
 *    gewählte Tausch.
 *  - **Kein zusätzliches Programmpaket.** Gebraucht werden Schreiben, Lesen
 *    und zwei Dateibefehle; das sind die paar Zeilen hier. Ein Paket dafür
 *    wöge mehr als der ganze Rest der App und läge auf einem Gerät, das die
 *    App gerade ohne Verbindung geöffnet hat.
 */

/** Kommt aus der Umgebung, siehe .env.example. Fehlt sie, ist alles aus. */
const ADRESSE = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const SCHLUESSEL = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Der Eimer im Dateispeicher, in dem Bilder, Raster und Vorschauen liegen. */
export const EIMER = "muster";

export function ferneEingerichtet(): boolean {
  return ADRESSE.length > 0 && SCHLUESSEL.length > 0;
}

/**
 * Warum etwas nicht geklappt hat. Die Unterscheidung ist keine Spielerei:
 * „kein Netz" ist der Normalfall und wird einfach später noch einmal
 * versucht, „abgelehnt" muss die Nutzerin erfahren, sonst wartet sie auf
 * eine Sicherung, die nie kommt.
 */
export type Fehlerart = "netz" | "anmeldung" | "dienst";

export class FerneFehler extends Error {
  art: Fehlerart;
  constructor(art: Fehlerart, nachricht: string) {
    super(nachricht);
    this.art = art;
    this.name = "FerneFehler";
  }
}

/**
 * Eine Anfrage an Supabase.
 *
 * Mitgeschickt wird nur der öffentliche Schlüssel – einmal als `apikey` und
 * einmal als `Authorization`. Beides will Supabase sehen: das erste wählt das
 * Projekt aus, das zweite bestimmt die Rolle, unter der die Regeln in der
 * Datenbank greifen (hier: `anon`).
 */
async function anfrage(pfad: string, init: RequestInit): Promise<Response> {
  if (!ferneEingerichtet()) throw new FerneFehler("dienst", "Nicht eingerichtet.");

  const kopf = new Headers(init.headers);
  kopf.set("apikey", SCHLUESSEL);
  kopf.set("Authorization", `Bearer ${SCHLUESSEL}`);

  let antwort: Response;
  try {
    antwort = await fetch(`${ADRESSE}${pfad}`, { ...init, headers: kopf });
  } catch {
    throw new FerneFehler("netz", "Keine Verbindung.");
  }
  if (!antwort.ok) {
    const text = await antwort.text().catch(() => "");
    throw new FerneFehler(
      // 401 und 403 heißen hier nicht „falsch angemeldet" – angemeldet wird
      // ja niemand mehr. Sie heißen: die Regeln aus der Migration sind nicht
      // gelaufen. Das muss die Nutzerin erfahren, deshalb nicht „netz".
      antwort.status === 401 || antwort.status === 403 ? "anmeldung" : "dienst",
      `HTTP ${antwort.status} ${text.slice(0, 200)}`,
    );
  }
  return antwort;
}

/**
 * Zeilen schreiben – vorhandene werden überschrieben.
 *
 * Hochgeladen wird immer mit derselben Kennung wie auf dem Gerät. Deshalb
 * darf dieselbe Sache ohne Schaden zweimal hochgeladen werden, und deshalb
 * braucht der Abgleich keine Buchführung darüber, was er schon geschickt hat.
 */
export async function zeilenSchreiben(tabelle: string, zeilen: unknown[]): Promise<void> {
  if (zeilen.length === 0) return;
  await anfrage(`/rest/v1/${tabelle}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(zeilen),
  });
}

/** Zeilen lesen. `frage` ist alles, was hinter dem Fragezeichen steht. */
export async function zeilenLesen<T>(tabelle: string, frage: string): Promise<T[]> {
  const antwort = await anfrage(`/rest/v1/${tabelle}?${frage}`, { method: "GET" });
  return (await antwort.json()) as T[];
}

/** Zeilen löschen. `frage` ist der Filter, etwa `id=eq.123`. */
export async function zeilenLoeschen(tabelle: string, frage: string): Promise<void> {
  await anfrage(`/rest/v1/${tabelle}?${frage}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

/** Eine Datei ablegen. Gleicher Pfad heißt: ersetzen. */
export async function dateiHochladen(pfad: string, inhalt: Blob): Promise<void> {
  await anfrage(`/storage/v1/object/${EIMER}/${pfad}`, {
    method: "POST",
    headers: {
      "x-upsert": "true",
      "Content-Type": inhalt.type || "application/octet-stream",
      "Cache-Control": "3600",
    },
    body: inhalt,
  });
}

/** Was unter einem Pfad liegt. Ordner kommen mit, Dateien darunter nicht. */
export async function dateienListen(pfad: string): Promise<string[]> {
  const antwort = await anfrage(`/storage/v1/object/list/${EIMER}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: pfad, limit: 1000 }),
  });
  const liste = (await antwort.json()) as Array<{ name?: string; id?: string | null }>;
  return liste.map((e) => e.name ?? "").filter(Boolean);
}

/** Dateien löschen. Die Pfade sind vollständig, nicht relativ. */
export async function dateienLoeschen(pfade: string[]): Promise<void> {
  if (pfade.length === 0) return;
  await anfrage(`/storage/v1/object/${EIMER}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: pfade }),
  });
}

/** Eine Datei holen. Fehlt sie, kommt `null` zurück statt eines Fehlers. */
export async function dateiHolen(pfad: string): Promise<Blob | null> {
  try {
    const antwort = await anfrage(`/storage/v1/object/${EIMER}/${pfad}`, { method: "GET" });
    return await antwort.blob();
  } catch (fehler) {
    if (fehler instanceof FerneFehler && fehler.art === "dienst") return null;
    throw fehler;
  }
}
