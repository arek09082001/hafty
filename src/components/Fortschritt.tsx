"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Die vier Schritte des gefuehrten Weges. */
export const SCHRITTE = [
  { pfad: "/schritt/bild", titel: "Bild aussuchen" },
  { pfad: "/schritt/einstellungen", titel: "Größe und Farben" },
  { pfad: "/schritt/muster", titel: "Muster ansehen und ändern" },
  { pfad: "/schritt/drucken", titel: "Drucken" },
] as const;

/**
 * Der Fortschritt steht immer oben und ist gleichzeitig die Navigation:
 * ein bereits erledigter Schritt kann jederzeit wieder angetippt werden,
 * ohne dass dabei etwas verloren geht.
 */
export function Fortschritt() {
  const pfad = usePathname();
  const aktuell = Math.max(
    0,
    SCHRITTE.findIndex((s) => pfad.startsWith(s.pfad)),
  );

  return (
    <nav aria-label="Fortschritt" className="shrink-0 border-b-2 border-linie bg-white">
      <ol className="mx-auto flex max-w-[1400px] flex-wrap items-stretch gap-2 px-4 py-3">
        {SCHRITTE.map((schritt, i) => {
          const erledigt = i < aktuell;
          const jetzt = i === aktuell;
          const erreichbar = i <= aktuell;

          const inhalt = (
            <>
              <span
                aria-hidden
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-[1.05rem] font-bold ${
                  jetzt
                    ? "border-hauptaktion bg-hauptaktion text-white"
                    : erledigt
                      ? "border-hauptaktion bg-white text-hauptaktion"
                      : "border-linie bg-white text-gedaempft"
                }`}
              >
                {i + 1}
              </span>
              <span className="text-left text-[0.95rem] font-semibold leading-tight">
                {schritt.titel}
              </span>
            </>
          );

          const stil =
            "flex min-h-[56px] flex-1 items-center gap-3 rounded-xl px-3 py-2 " +
            (jetzt ? "bg-hinweis" : "");

          return (
            <li key={schritt.pfad} className="flex flex-1 basis-[220px]">
              {erreichbar && !jetzt ? (
                <Link href={schritt.pfad} className={`${stil} hover:bg-hinweis`}>
                  {inhalt}
                </Link>
              ) : (
                <span
                  className={`${stil} ${jetzt ? "" : "text-gedaempft"}`}
                  aria-current={jetzt ? "step" : undefined}
                >
                  {inhalt}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
