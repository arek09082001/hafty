"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Der Zugang zur Datenbank.
 *
 * Diese App hat bewusst **keine Anmeldung**: sie ist für eine einzige
 * Person gedacht, die ihre Muster wiederfinden will, ohne sich etwas
 * merken zu müssen. Es gibt deshalb auch keine Nutzerkennung, an der
 * Muster, Motive oder der Garnvorrat hängen – die Datenbank gehört
 * dieser einen Person.
 *
 * Was das bedeutet, steht so auch in der README: Wer die Adresse der App
 * und den öffentlichen Schlüssel hat (beides steht im Quelltext der
 * Seite), kann die Muster lesen und ändern. Solange die Adresse nicht
 * herumgereicht wird, ist das für diesen Zweck in Ordnung.
 */
let vorhanden: SupabaseClient | null = null;

/**
 * Höchste Wartezeit für eine einzelne Anfrage. Grosszügig bemessen, weil
 * darunter auch das Hochladen des Quellbildes fällt.
 */
const ANFRAGE_ZEITLIMIT_MS = 30_000;

export function browserClient(): SupabaseClient {
  if (!vorhanden) {
    vorhanden = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          // Ohne Zeitlimit bleibt eine Anfrage bei schlechter Verbindung
          // einfach hängen, und die Nutzerin schaut endlos auf "wird
          // geholt …" statt auf einen Satz, der ihr sagt, was los ist.
          fetch: (eingabe, optionen) => {
            const ablauf = AbortSignal.timeout(ANFRAGE_ZEITLIMIT_MS);
            const eigenes = optionen?.signal;
            const signal =
              eigenes && typeof AbortSignal.any === "function"
                ? AbortSignal.any([eigenes, ablauf])
                : (eigenes ?? ablauf);
            return fetch(eingabe, { ...optionen, signal });
          },
        },
      },
    );
  }
  return vorhanden;
}

/**
 * Wartet höchstens `ms` Millisekunden auf eine Anfrage; danach gilt sie als
 * fehlgeschlagen. Für alles, worauf die Oberfläche wartet und wofür sie
 * solange nur "wird geholt …" zeigen kann.
 */
export function hoechstens<T>(arbeit: PromiseLike<T>, ms = 10_000): Promise<T> {
  // Die Abfragen von Supabase sind "thenable", aber keine echten Promises;
  // Promise.resolve macht daraus eins.
  return Promise.race([
    Promise.resolve(arbeit),
    new Promise<T>((_, ablehnen) => {
      setTimeout(() => ablehnen(new Error("Die Datenbank hat nicht geantwortet.")), ms);
    }),
  ]);
}

/** Ist überhaupt eine Datenbank eingerichtet? */
export function datenbankEingerichtet(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
