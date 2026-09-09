"use client";

/**
 * Was noch in die Ferne muss.
 * ---------------------------------------------------------------------------
 *
 * Gespeichert wird immer zuerst auf dem Gerät – das geht auch im Zug ohne
 * Empfang und dauert Millisekunden. Was danach in die Sicherung bei Supabase
 * gehört, wird hier nur **vorgemerkt**: eine kurze Liste aus Art und Kennung,
 * mehr nicht.
 *
 * Diese Datei kennt Supabase ausdrücklich nicht. Sie liegt bei den anderen
 * Speichern, damit `staende.ts` und `projekte.ts` etwas vormerken können,
 * ohne den ganzen Abgleich (und damit das Netz) mitzuziehen. Wer die Liste
 * abarbeitet, steht in `lib/ferne/abgleich.ts`.
 */

import { browserdatenbank, LADEN_ABGLEICH } from "./browserspeicher";

/**
 * `loeschung` trägt die Kennung eines Projekts, das hier weg ist und
 * deshalb auch in der Ferne weg gehört. Ohne sie käme es beim nächsten
 * Holen wieder zurück.
 */
export type Art = "projekt" | "stand" | "loeschung";

export type Vormerkung = {
  /** `art:kennung` – damit dieselbe Sache nie zweimal in der Liste steht. */
  id: string;
  art: Art;
  kennung: string;
  seit: number;
};

/** Etwas zum Hochladen vormerken. Fehlschläge sind hier folgenlos. */
export async function vormerken(art: Art, kennung: string): Promise<void> {
  try {
    const db = await browserdatenbank();
    const eintrag: Vormerkung = { id: `${art}:${kennung}`, art, kennung, seit: Date.now() };
    await db.put(LADEN_ABGLEICH, eintrag);
  } catch {
    // Klappt das Vormerken nicht, bleibt die Arbeit trotzdem auf dem Gerät.
  }
}

/** Alles, was noch offen ist – die ältesten Vormerkungen zuerst. */
export async function offeneVormerkungen(): Promise<Vormerkung[]> {
  try {
    const db = await browserdatenbank();
    const alle = (await db.getAll(LADEN_ABGLEICH)) as Vormerkung[];
    return alle.sort((a, b) => a.seit - b.seit);
  } catch {
    return [];
  }
}

/** Wie viele Sachen noch auf eine Verbindung warten. */
export async function offeneAnzahl(): Promise<number> {
  try {
    const db = await browserdatenbank();
    return await db.count(LADEN_ABGLEICH);
  } catch {
    return 0;
  }
}

/** Erledigt – die Vormerkung kann weg. */
export async function abhaken(id: string): Promise<void> {
  try {
    const db = await browserdatenbank();
    await db.delete(LADEN_ABGLEICH, id);
  } catch {
    // Bleibt sie liegen, wird sie beim nächsten Mal noch einmal hochgeladen.
    // Hochgeladen wird immer mit derselben Kennung, das schadet also nicht.
  }
}
