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

  if (farben.error) throw new Error(farben.error.message);
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
