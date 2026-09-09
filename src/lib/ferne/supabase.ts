"use client";

/**
 * Die Sicherung in der Ferne: Supabase.
 * ---------------------------------------------------------------------------
 *
 * Die App bleibt eine App, die auf dem Gerät arbeitet. Supabase ist nur das
 * **zweite Exemplar**: sobald Verbindung besteht, liegt jedes Muster auch
 * dort und übersteht damit ein verlorenes Tablet oder einen geleerten
 * Browserspeicher.
 *
 * Drei Dinge sind dabei wichtig:
 *
 *  - **Ohne Einrichtung ändert sich nichts.** Fehlen die beiden Angaben in
 *    der Umgebung, ist die Sicherung aus und die App verhält sich wie
 *    bisher. Keine Fehlermeldung, kein Hinweis, nichts.
 *  - **Es gibt weiter keine Anmeldung.** Beim ersten Mal meldet sich das
 *    Gerät im Hintergrund anonym an (Supabase legt dafür einen Benutzer ohne
 *    Namen und ohne Passwort an) und behält seinen Zugang. Die Nutzerin
 *    bekommt davon nichts zu sehen – und trotzdem kommt niemand sonst an
 *    ihre Bilder: die Zeilen gehören diesem Benutzer, und die Regeln in der
 *    Datenbank (siehe supabase/migrations) lassen nur ihn heran.
 *  - **Kein zusätzliches Programmpaket.** Gebraucht werden Anmelden,
 *    Schreiben, Lesen und zwei Dateibefehle; das sind die paar Zeilen hier.
 *    Ein Paket dafür wöge mehr als der ganze Rest der App und läge auf einem
 *    Gerät, das die App gerade ohne Verbindung geöffnet hat.
 */

/** Kommt aus der Umgebung, siehe .env.example. Fehlt sie, ist alles aus. */
const ADRESSE = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const SCHLUESSEL = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Der Eimer im Dateispeicher, in dem Bilder, Raster und Vorschauen liegen. */
export const EIMER = "muster";

/** Wo der Zugang dieses Geräts liegt. */
const SITZUNG_IM_SPEICHER = "stickmuster-ferne-sitzung";

/** So lange vor Ablauf wird der Zugang erneuert. */
const VORLAUF_MS = 60_000;

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

type Sitzung = {
  zugang: string;
  erneuerung: string;
  /** Zeitpunkt in Millisekunden, ab dem der Zugang nicht mehr gilt. */
  gueltigBis: number;
  benutzer: string;
};

let sitzung: Sitzung | null = null;
let laufendeAnmeldung: Promise<Sitzung> | null = null;

function sitzungLesen(): Sitzung | null {
  if (sitzung) return sitzung;
  try {
    const roh = window.localStorage.getItem(SITZUNG_IM_SPEICHER);
    if (!roh) return null;
    const gelesen = JSON.parse(roh) as Sitzung;
    if (!gelesen?.zugang || !gelesen?.erneuerung || !gelesen?.benutzer) return null;
    sitzung = gelesen;
    return sitzung;
  } catch {
    return null;
  }
}

function sitzungSchreiben(neu: Sitzung) {
  sitzung = neu;
  try {
    window.localStorage.setItem(SITZUNG_IM_SPEICHER, JSON.stringify(neu));
  } catch {
    // Privates Fenster: dann gilt der Zugang eben nur für diesen Besuch.
  }
}

/** Antwort von Supabase auf Anmelden und Erneuern. */
type AnmeldeAntwort = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string };
  error?: string;
  error_description?: string;
  msg?: string;
  message?: string;
};

async function anmeldenBei(pfad: string, koerper: unknown): Promise<Sitzung> {
  let antwort: Response;
  try {
    antwort = await fetch(`${ADRESSE}${pfad}`, {
      method: "POST",
      headers: { apikey: SCHLUESSEL, "Content-Type": "application/json" },
      body: JSON.stringify(koerper),
    });
  } catch {
    throw new FerneFehler("netz", "Keine Verbindung.");
  }

  const daten = (await antwort.json().catch(() => ({}))) as AnmeldeAntwort;
  if (!antwort.ok || !daten.access_token || !daten.refresh_token) {
    const text = daten.error_description ?? daten.msg ?? daten.message ?? `HTTP ${antwort.status}`;
    throw new FerneFehler("anmeldung", text);
  }

  return {
    zugang: daten.access_token,
    erneuerung: daten.refresh_token,
    gueltigBis: Date.now() + (daten.expires_in ?? 3600) * 1000,
    benutzer: daten.user?.id ?? "",
  };
}

/**
 * Den gültigen Zugang dieses Geräts holen – und ihn, falls nötig, erneuern
 * oder überhaupt erst anlegen.
 *
 * Läuft immer nur einmal gleichzeitig: sonst legte ein Gerät, das beim
 * Öffnen zwei Sachen gleichzeitig hochlädt, zwei anonyme Benutzer an und
 * fände seine eigenen Muster hinterher nicht wieder.
 */
export async function zugangHolen(): Promise<Sitzung> {
  if (!ferneEingerichtet()) throw new FerneFehler("dienst", "Nicht eingerichtet.");

  const vorhanden = sitzungLesen();
  if (vorhanden && vorhanden.gueltigBis - VORLAUF_MS > Date.now()) return vorhanden;
  if (laufendeAnmeldung) return laufendeAnmeldung;

  laufendeAnmeldung = (async () => {
    if (vorhanden) {
      try {
        const erneuert = await anmeldenBei("/auth/v1/token?grant_type=refresh_token", {
          refresh_token: vorhanden.erneuerung,
        });
        sitzungSchreiben(erneuert);
        return erneuert;
      } catch (fehler) {
        // Ein abgelaufener oder zurückgezogener Zugang lässt sich nicht
        // erneuern. Dann hilft nur eine neue anonyme Anmeldung – die alten
        // Muster in der Ferne gehören allerdings dem alten Benutzer.
        if (fehler instanceof FerneFehler && fehler.art === "netz") throw fehler;
      }
    }
    const neu = await anmeldenBei("/auth/v1/signup", { data: {} });
    sitzungSchreiben(neu);
    return neu;
  })();

  try {
    return await laufendeAnmeldung;
  } finally {
    laufendeAnmeldung = null;
  }
}

/** Die Kennung dieses Geräts in der Ferne, sofern es schon eine hat. */
export function benutzerKennung(): string | null {
  return sitzungLesen()?.benutzer ?? null;
}

async function anfrage(pfad: string, init: RequestInit): Promise<Response> {
  const zugang = await zugangHolen();
  const kopf = new Headers(init.headers);
  kopf.set("apikey", SCHLUESSEL);
  kopf.set("Authorization", `Bearer ${zugang.zugang}`);

  let antwort: Response;
  try {
    antwort = await fetch(`${ADRESSE}${pfad}`, { ...init, headers: kopf });
  } catch {
    throw new FerneFehler("netz", "Keine Verbindung.");
  }
  if (!antwort.ok) {
    const text = await antwort.text().catch(() => "");
    throw new FerneFehler(
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
