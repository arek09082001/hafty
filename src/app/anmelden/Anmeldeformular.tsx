"use client";

import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { Knopf } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";

/**
 * Anmeldung ausschliesslich per Magic Link. Kein Passwort, keine Bestaetigung
 * von Bedingungen, kein zweiter Schritt.
 */
export function Anmeldeformular() {
  const [email, setEmail] = useState("");
  const [zustand, setZustand] = useState<"ruhe" | "sendet" | "gesendet">("ruhe");
  const [fehler, setFehler] = useState<string | null>(null);

  async function absenden(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);

    const adresse = email.trim();
    if (!adresse.includes("@") || adresse.length < 5) {
      setFehler(
        "Diese E-Mail-Adresse sieht noch nicht vollständig aus. Bitte schreiben Sie sie so, wie sie in Ihrem E-Mail-Programm steht, zum Beispiel maria.muster@web.de.",
      );
      return;
    }

    setZustand("sendet");
    const supabase = browserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: adresse,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/bestaetigen`,
      },
    });

    if (error) {
      setZustand("ruhe");
      setFehler(
        "Die E-Mail konnte gerade nicht verschickt werden. Bitte prüfen Sie, ob Sie mit dem Internet verbunden sind, und tippen Sie dann noch einmal auf „Anmelde-E-Mail schicken“.",
      );
      return;
    }

    setZustand("gesendet");
  }

  if (zustand === "gesendet") {
    return (
      <div className="flex flex-col gap-6">
        <Hinweis art="erfolg">
          Wir haben Ihnen eine E-Mail an {email.trim()} geschickt. Öffnen Sie Ihr
          E-Mail-Programm und tippen Sie in dieser E-Mail auf den Link. Danach sind Sie
          angemeldet und bleiben es auch.
        </Hinweis>
        <p className="text-[1.05rem] text-gedaempft">
          Die E-Mail ist nicht da? Manchmal dauert es ein bis zwei Minuten. Schauen Sie auch im
          Ordner für Werbung oder Spam nach.
        </p>
        <Knopf art="neben" onClick={() => setZustand("ruhe")}>
          E-Mail noch einmal schicken
        </Knopf>
      </div>
    );
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <label htmlFor="email" className="text-[1.15rem] font-semibold">
          Ihre E-Mail-Adresse
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="maria.muster@web.de"
          className="min-h-[64px] rounded-xl border-2 border-tinte bg-white px-5 text-[1.2rem]"
        />
      </div>

      {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}

      <Knopf art="haupt" gross type="submit" disabled={zustand === "sendet"}>
        {zustand === "sendet" ? "Wird geschickt …" : "Anmelde-E-Mail schicken"}
      </Knopf>

      <p className="text-[1rem] text-gedaempft">
        Sie bekommen eine E-Mail mit einem Link. Ein Tipp auf den Link meldet Sie an. Sie
        müssen sich nichts merken.
      </p>
    </form>
  );
}
