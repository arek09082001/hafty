"use client";

/**
 * Garnfarben und der eigene Garnvorrat.
 *
 * Der Katalog wird nur vom Importskript geschrieben (dafür braucht es den
 * Dienstschlüssel), aus der App heraus nur gelesen. Der Garnvorrat in
 * `user_threads` ist die Liste der Garne, die zu Hause liegen – die App hat
 * keine Anmeldung, es gibt also genau eine solche Liste.
 */

import { browserClient, datenbankEingerichtet, hoechstens } from "@/lib/supabase/client";
import type { Garn } from "@/lib/muster/typen";

export type GarnMitVorrat = Garn & { imVorrat: boolean };

/**
 * Warum das Laden schiefging.
 *
 * Der Unterschied ist wichtig für die Meldung auf dem Bildschirm: bei
 * "rechte" hilft kein Neuladen und kein besseres WLAN, da fehlt in der
 * Datenbank eine Einstellung. Genau diese Verwechslung hat einmal viel Zeit
 * gekostet – auf dem Bildschirm stand "Internetverbindung prüfen", während
 * die Datenbank in Wahrheit "permission denied" antwortete.
 */
export type Ladegrund = "rechte" | "verbindung";

export class Ladefehler extends Error {
  grund: Ladegrund;
  constructor(grund: Ladegrund, meldung: string) {
    super(meldung);
    this.name = "Ladefehler";
    this.grund = grund;
  }
}

/** "permission denied for table …" beziehungsweise SQLSTATE 42501. */
function fehlendeRechte(meldung: string, code?: string): boolean {
  return code === "42501" || /permission denied/i.test(meldung);
}

/**
 * Den ganzen Katalog holen, dazu die Kennzeichnung „habe ich zu Hause".
 *
 * Wirft, wenn die Datenbank nicht erreichbar ist. Eine leere Liste heisst
 * dann wirklich "es sind keine Garne eingelesen" und nicht "wir wissen es
 * nicht" – sonst stünde auf dem Bildschirm eine Behauptung, die nicht
 * stimmt.
 */
export async function garneLaden(): Promise<GarnMitVorrat[]> {
  if (!datenbankEingerichtet()) return [];
  const supabase = browserClient();

  const [farben, vorrat] = await hoechstens(
    Promise.all([
    supabase
      .from("thread_colors")
      .select("id, code, name, hex, lab_l, lab_a, lab_b, discontinued, thread_brands(name)")
      .eq("discontinued", false)
      .order("code", { ascending: true }),
    supabase.from("user_threads").select("thread_color_id"),
    ]),
  );

  if (farben.error) {
    throw new Ladefehler(
      fehlendeRechte(farben.error.message, farben.error.code) ? "rechte" : "verbindung",
      farben.error.message,
    );
  }
  if (!farben.data) return [];

  const meine = new Set(
    (vorrat.data ?? []).map((z) => z.thread_color_id as string),
  );

  return farben.data.map((zeile) => {
    const marke = zeile.thread_brands as unknown as { name: string } | { name: string }[] | null;
    const markenname = Array.isArray(marke) ? (marke[0]?.name ?? "") : (marke?.name ?? "");
    return {
      id: zeile.id as string,
      marke: markenname,
      code: zeile.code as string,
      name: zeile.name as string,
      hex: zeile.hex as string,
      L: zeile.lab_l as number,
      a: zeile.lab_a as number,
      b: zeile.lab_b as number,
      imVorrat: meine.has(zeile.id as string),
    };
  });
}

/** Ein Garn in den eigenen Vorrat aufnehmen. */
export async function vorratAufnehmen(garnId: string): Promise<boolean> {
  if (!datenbankEingerichtet()) return false;
  const { error } = await browserClient()
    .from("user_threads")
    .upsert({ thread_color_id: garnId });
  return !error;
}

/** Ein Garn wieder aus dem Vorrat nehmen. */
export async function vorratEntfernen(garnId: string): Promise<boolean> {
  if (!datenbankEingerichtet()) return false;
  const { error } = await browserClient()
    .from("user_threads")
    .delete()
    .eq("thread_color_id", garnId);
  return !error;
}

/**
 * Viele Garne auf einmal in den Vorrat aufnehmen.
 *
 * Wer die ganze Garnkarte besitzt, soll nicht 375-mal tippen muessen. In
 * Haeppchen, damit auch die volle Liste in eine Anfrage passt.
 */
export async function vorratAlleAufnehmen(garnIds: string[]): Promise<boolean> {
  if (!datenbankEingerichtet() || garnIds.length === 0) return false;
  const client = browserClient();
  for (let i = 0; i < garnIds.length; i += 200) {
    const { error } = await client
      .from("user_threads")
      .upsert(garnIds.slice(i, i + 200).map((id) => ({ thread_color_id: id })));
    if (error) return false;
  }
  return true;
}

/** Den ganzen Vorrat leeren. */
export async function vorratLeeren(): Promise<boolean> {
  if (!datenbankEingerichtet()) return false;
  // Ohne Bedingung loescht PostgREST nichts; "ist nicht null" trifft alles.
  const { error } = await browserClient()
    .from("user_threads")
    .delete()
    .not("thread_color_id", "is", null);
  return !error;
}

/**
 * Eine Farbe der Legende von Hand auf ein anderes Garn setzen.
 *
 * Die Hexwerte der Hersteller sind Näherungen; wer die Garnkarte vor sich
 * hat, sieht manchmal, dass ein anderer Ton besser passt. Die Änderung wird
 * sofort in `pattern_colors` festgehalten und außerdem im nächsten
 * gespeicherten Stand mitgeschrieben.
 */
export async function legendeGarnSetzen(
  musterId: string,
  palettenIndex: number,
  garnId: string,
  symbol: string,
  stiche: number,
): Promise<boolean> {
  if (!datenbankEingerichtet()) return false;
  const { error } = await browserClient().from("pattern_colors").upsert(
    {
      pattern_id: musterId,
      palette_index: palettenIndex,
      thread_color_id: garnId,
      symbol,
      stitch_count: stiche,
    },
    { onConflict: "pattern_id,palette_index" },
  );
  return !error;
}
