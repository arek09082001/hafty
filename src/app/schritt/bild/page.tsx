import { Suspense } from "react";
import { BildAussuchen } from "./BildAussuchen";

export const metadata = { title: "Wybierz zdjęcie" };

/**
 * Schritt 1 liest die Adresse (`?neu=1`, siehe `BildAussuchen`). Next.js
 * verlangt dafür eine Suspense-Grenze; zu warten gibt es nichts, deshalb
 * bleibt sie leer.
 */
export default function BildSeite() {
  return (
    <Suspense>
      <BildAussuchen />
    </Suspense>
  );
}
