"use client";

/**
 * Garnfarben und der eigene Garnvorrat.
 *
 * Der Katalog ist für alle angemeldeten Nutzerinnen lesbar; geschrieben wird
 * er nur vom Importskript. Der Vorrat (`user_threads`) gehört jeder Nutzerin
 * für sich – dafür sorgt die Row Level Security.
 */

import { browserClient } from "@/lib/supabase/client";
import type { Garn } from "@/lib/muster/typen";

export type GarnMitVorrat = Garn & { imVorrat: boolean };

/** Den ganzen Katalog holen, dazu die Kennzeichnung „habe ich zu Hause". */
export async function garneLaden(): Promise<GarnMitVorrat[]> {
  const supabase = browserClient();

  const [farben, vorrat] = await Promise.all([
    supabase
      .from("thread_colors")
      .select("id, code, name, hex, lab_l, lab_a, lab_b, discontinued, thread_brands(name)")
      .eq("discontinued", false)
      .order("code", { ascending: true }),
    supabase.from("user_threads").select("thread_color_id"),
  ]);

  if (farben.error || !farben.data) return [];

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
  const supabase = browserClient();
  const { data: sitzung } = await supabase.auth.getUser();
  if (!sitzung.user) return false;
  const { error } = await supabase
    .from("user_threads")
    .upsert({ user_id: sitzung.user.id, thread_color_id: garnId });
  return !error;
}

/** Ein Garn wieder aus dem Vorrat nehmen. */
export async function vorratEntfernen(garnId: string): Promise<boolean> {
  const supabase = browserClient();
  const { error } = await supabase.from("user_threads").delete().eq("thread_color_id", garnId);
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
  const supabase = browserClient();
  const { error } = await supabase.from("pattern_colors").upsert(
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
