"use client";

import { useAbgleich } from "@/lib/ferne/AbgleichProvider";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Sagt in einem Satz, ob die Arbeit auch außerhalb dieses Geräts liegt.
 *
 * Kein Zahnrad, kein Wolkensymbol und keine Prozentzahl: „Gesichert im
 * Internet" oder „Wird gesichert, sobald Sie Internet haben". Wer eine
 * Sicherung hat, will genau das wissen – und wer keine hat, soll nicht
 * täglich daran erinnert werden: ohne Einrichtung steht hier nichts.
 */
export function Sicherungszeichen({ klein = false }: { klein?: boolean }) {
  const { zustand } = useAbgleich();
  const { t, zahl } = useSprache();

  if (zustand.art === "aus") return null;

  const [text, farbe] =
    zustand.art === "gesichert"
      ? [t("sicherung.gesichert"), "bg-hauptaktion"]
      : zustand.art === "laeuft"
        ? [t("sicherung.laeuft"), "bg-hauptaktion-hell"]
        : zustand.art === "ohneNetz"
          ? [t("sicherung.wartet", { anzahl: zahl(zustand.offen) }), "bg-linie"]
          : [t("sicherung.fehler"), "bg-warnung"];

  return (
    <p
      role="status"
      className={`flex items-center gap-2 ${klein ? "text-[0.9rem]" : "text-[1rem]"} text-gedaempft`}
    >
      <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${farbe}`} />
      {text}
    </p>
  );
}
