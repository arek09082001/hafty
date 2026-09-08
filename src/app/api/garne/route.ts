/**
 * Die Garnfarben in die Datenbank einlesen – vom Knopf in der App aus.
 * ---------------------------------------------------------------------------
 *
 * Warum eine Server-Route und nicht einfach im Browser?
 *
 * Der Garnkatalog ist für die App absichtlich schreibgeschützt. Geschrieben
 * wird er allein mit dem Dienstschlüssel, und der darf nie in den Browser:
 * wer ihn hat, kommt an der ganzen Datenbank vorbei. Also läuft das Einlesen
 * hier auf dem Server, wo der Schlüssel bleibt.
 *
 * Diese Route nimmt **nichts** entgegen – keinen Dateinamen, keine Farben,
 * keine Parameter. Sie liest genau die Datei, die im Projekt liegt. Das ist
 * die wichtigste Eigenschaft: die App hat keine Anmeldung, jeder mit der
 * Adresse kann den Knopf drücken, und das Schlimmste, was dabei passieren
 * kann, ist, dass dieselben 375 Farben noch einmal geschrieben werden.
 * Über diese Route lässt sich nichts Eigenes in den Katalog bringen.
 *
 * GET  sagt, wie viele Farben in der Datei stehen und wie viele schon in der
 *      Datenbank sind.
 * POST liest ein.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { csvLesen, markenAnlegen, saetzeBauen, type Garnsatz } from "@/lib/garne/katalog";

// Node, nicht Edge: wir lesen eine Datei von der Platte.
export const runtime = "nodejs";
// Nie zwischenspeichern, die Antwort beschreibt einen Zustand.
export const dynamic = "force-dynamic";

const DATEI = "data/garne-ariadna.csv";

/**
 * Die Meldungen, die die Oberfläche kennt. Der Browser bekommt nur diesen
 * Schlüssel, nie den englischen Originaltext der Datenbank – der wird
 * ausschliesslich in das Serverprotokoll geschrieben.
 */
type Ergebnis =
  | { stand: "fertig"; anzahl: number }
  | { stand: "kein-schluessel" }
  | { stand: "keine-rechte" }
  | { stand: "schiefgegangen" };

function dienst() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const schluessel = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !schluessel) return null;
  return createClient(url, schluessel, { auth: { persistSession: false } });
}

/** "permission denied for table …" ist der eine Fehler, der eine eigene
 *  Anleitung verdient: dann fehlen der Rolle service_role die Rechte. */
function istRechtefehler(meldung: string): boolean {
  return /permission denied/i.test(meldung) || /\b42501\b/.test(meldung);
}

async function zeilenLesen() {
  return csvLesen(await readFile(path.join(process.cwd(), DATEI), "utf8"));
}

export async function GET() {
  const supabase = dienst();
  let inDerDatei = 0;
  try {
    inDerDatei = (await zeilenLesen()).length;
  } catch (fehler) {
    console.error("Garnkatalog: Datei nicht lesbar", fehler);
    return NextResponse.json<Ergebnis>({ stand: "schiefgegangen" }, { status: 500 });
  }
  if (!supabase) {
    return NextResponse.json({ stand: "kein-schluessel", inDerDatei }, { status: 200 });
  }
  // Bewusst ohne head: true. Bei einer HEAD-Anfrage gibt es keinen
  // Antwortkoerper, und genau darin steht der Grund – ohne ihn kaeme ein
  // fehlendes Recht als "irgendwas ging schief" an, statt zu sagen, was zu
  // tun ist. Die eine Zeile, die wir dabei mitlesen, kostet nichts.
  const { count, error } = await supabase
    .from("thread_colors")
    .select("id", { count: "exact" })
    .limit(1);
  if (error) {
    console.error("Garnkatalog: zählen ging schief", error);
    return NextResponse.json(
      { stand: istRechtefehler(error.message) ? "keine-rechte" : "schiefgegangen", inDerDatei },
      { status: 200 },
    );
  }
  return NextResponse.json({ stand: "bereit", inDerDatei, inDerDatenbank: count ?? 0 });
}

export async function POST() {
  const supabase = dienst();
  if (!supabase) {
    // Ohne Dienstschlüssel geht es nicht, und das ist kein Fehler der
    // Nutzerin: beim Hoster fehlt eine Einstellung.
    return NextResponse.json<Ergebnis>({ stand: "kein-schluessel" }, { status: 200 });
  }

  try {
    const zeilen = await zeilenLesen();
    const markeZuId = await markenAnlegen(supabase, zeilen);
    const saetze = saetzeBauen(zeilen, markeZuId);

    // In Häppchen, damit auch eine lange Liste in eine Anfrage passt.
    // Der Client kennt unser Schema nicht; ohne diesen Zwischenschritt
    // versucht TypeScript, den Satztyp aus der Tabelle zu erraten, und
    // verliert sich dabei.
    const tabelle = supabase.from("thread_colors") as unknown as {
      upsert: (
        saetze: Garnsatz[],
        einstellungen: { onConflict: string },
      ) => PromiseLike<{ error: { message: string } | null }>;
    };
    for (let i = 0; i < saetze.length; i += 200) {
      const { error } = await tabelle.upsert(saetze.slice(i, i + 200), {
        onConflict: "brand_id,code",
      });
      if (error) throw new Error(error.message);
    }

    return NextResponse.json<Ergebnis>({ stand: "fertig", anzahl: saetze.length });
  } catch (fehler) {
    const meldung = fehler instanceof Error ? fehler.message : String(fehler);
    console.error("Garnkatalog einlesen ging schief:", meldung);
    return NextResponse.json<Ergebnis>(
      { stand: istRechtefehler(meldung) ? "keine-rechte" : "schiefgegangen" },
      { status: 200 },
    );
  }
}
