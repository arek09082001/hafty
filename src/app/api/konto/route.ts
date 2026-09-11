/**
 * Das gemeinsame Konto.
 * ---------------------------------------------------------------------------
 *
 * Die App hat keine Anmeldung und soll auch keine bekommen – sie ist für eine
 * Person gebaut, die sticken will und nicht Konten verwalten. Trotzdem sollen
 * Tablet, Telefon und Rechner dieselben Motive zeigen.
 *
 * Vorher meldete sich **jedes Gerät einzeln und anonym** an. Supabase legte
 * dafür jeweils einen neuen Benutzer an, und die Regeln in der Datenbank
 * lassen jeden nur an seine eigenen Zeilen. Damit war die Sicherung zwar da,
 * aber jedes Gerät sicherte in seine eigene Ecke – auf dem zweiten Gerät
 * stand nichts.
 *
 * Jetzt gibt es **ein** Konto, und alle Geräte sind dieses Konto.
 *
 * Das Passwort dazu steht bewusst **nicht** in einer `NEXT_PUBLIC_`-Variablen:
 * die stehen im Programmtext und lassen sich in jedem Browser nachlesen. Es
 * bleibt hier auf dem Server, und der Browser bekommt nur den fertigen Zugang.
 *
 * Was das nicht leistet: wer die Adresse der Seite kennt, kann diesen Zugang
 * ebenfalls anfordern und die Muster sehen. Das ist der bewusst gewählte
 * Tausch – kein Anmeldebildschirm gegen keine Geheimhaltung. Wer beides will,
 * braucht eine richtige Anmeldung.
 */

/** Die Antwort von Supabase auf das Anmelden. */
type AnmeldeAntwort = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string };
  error_description?: string;
  msg?: string;
  message?: string;
};

function ohneSchraegstrich(wert: string) {
  return wert.replace(/\/+$/, "");
}

export async function POST() {
  // Die Adresse darf aus der öffentlichen Variablen kommen – sie steht
  // ohnehin im Programmtext. Zugangsdaten nicht.
  const adresse = ohneSchraegstrich(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  );
  const schluessel = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const mail = process.env.SUPABASE_KONTO_MAIL ?? "";
  const passwort = process.env.SUPABASE_KONTO_PASSWORT ?? "";

  if (!adresse || !schluessel || !mail || !passwort) {
    // Nicht eingerichtet ist kein Fehler: dann arbeitet die App wie immer
    // allein auf dem Gerät. 501 sagt das, ohne nach einem Ausfall zu klingen.
    return Response.json({ fehler: "nicht eingerichtet" }, { status: 501 });
  }

  let antwort: Response;
  try {
    antwort = await fetch(`${adresse}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: schluessel, "Content-Type": "application/json" },
      body: JSON.stringify({ email: mail, password: passwort }),
      cache: "no-store",
    });
  } catch {
    return Response.json({ fehler: "Supabase nicht erreichbar" }, { status: 502 });
  }

  const daten = (await antwort.json().catch(() => ({}))) as AnmeldeAntwort;
  if (!antwort.ok || !daten.access_token || !daten.refresh_token) {
    // Die Meldung von Supabase geht mit zurück: ohne sie sucht man bei einem
    // Tippfehler im Passwort sehr lange an der falschen Stelle. Sie verrät
    // nichts, was nicht ohnehin jeder ausprobieren könnte.
    const text = daten.error_description ?? daten.msg ?? daten.message ?? `HTTP ${antwort.status}`;
    return Response.json({ fehler: text }, { status: 502 });
  }

  return Response.json(
    {
      access_token: daten.access_token,
      refresh_token: daten.refresh_token,
      expires_in: daten.expires_in ?? 3600,
      user: { id: daten.user?.id ?? "" },
    },
    // Dieser Zugang läuft ab und darf nirgends liegenbleiben.
    { headers: { "Cache-Control": "no-store" } },
  );
}
