"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { Dialog } from "./Dialog";

/**
 * Abmelden ist zerstoererisch genug, um nachzufragen: danach muss die
 * Nutzerin wieder in ihr E-Mail-Programm.
 */
export function Abmelden({ email }: { email: string }) {
  const [frageOffen, setFrageOffen] = useState(false);
  const router = useRouter();

  async function abmelden() {
    await browserClient().auth.signOut();
    router.replace("/anmelden");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setFrageOffen(true)}
        className="flex min-h-[56px] items-center rounded-xl px-4 text-[1rem] text-gedaempft underline hover:bg-hinweis hover:text-tinte"
      >
        Abmelden
      </button>

      <Dialog
        offen={frageOffen}
        titel="Wirklich abmelden?"
        text={`Sie sind als ${email} angemeldet. Wenn Sie sich abmelden, müssen Sie beim nächsten Mal wieder eine Anmelde-E-Mail anfordern. Ihre Muster bleiben erhalten.`}
        bestaetigenText="Ja, abmelden"
        bestaetigenArt="gefahr"
        abbrechenText="Angemeldet bleiben"
        onBestaetigen={abmelden}
        onAbbrechen={() => setFrageOffen(false)}
      />
    </>
  );
}
