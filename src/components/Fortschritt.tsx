"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSprache } from "@/lib/sprache/SprachProvider";
import { Sprachwahl } from "./Sprachwahl";

/** Die vier Schritte des gefuehrten Weges. */
export const SCHRITTE = [
  { pfad: "/schritt/bild", titel: "schritt.bild" },
  { pfad: "/schritt/einstellungen", titel: "schritt.einstellungen" },
  { pfad: "/schritt/muster", titel: "schritt.muster" },
  { pfad: "/schritt/drucken", titel: "schritt.drucken" },
] as const;

/**
 * Der Fortschritt steht immer oben und ist gleichzeitig die Navigation:
 * ein bereits erledigter Schritt kann jederzeit wieder angetippt werden,
 * ohne dass dabei etwas verloren geht.
 *
 * Der Garnvorrat und die Sprachwahl sitzen in derselben Zeile. Vorher waren
 * das zwei Leisten übereinander, und die haben dem Muster fast achtzig
 * Bildpunkte Höhe weggenommen – auf einem Tablet im Querformat ist das viel.
 *
 * Flach ist sie aus demselben Grund: die Leiste steht auf jeder der vier
 * Seiten, jeder Punkt Höhe fehlt in Schritt 3 dem Muster. Die Ziffern sind
 * deshalb kleiner geworden, die Schrift bleibt lesbar, und die Ziele bleiben
 * mit 44 Punkten groß genug für einen Finger.
 */
export function Fortschritt() {
  const { t } = useSprache();
  const pfad = usePathname();
  const aktuell = Math.max(
    0,
    SCHRITTE.findIndex((s) => pfad.startsWith(s.pfad)),
  );

  return (
    <nav aria-label={t("schritt.fortschritt")} className="shrink-0 border-b border-linie bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-4 py-1">
        <ol className="flex min-w-0 flex-1 flex-wrap items-stretch gap-1">
        {SCHRITTE.map((schritt, i) => {
          const erledigt = i < aktuell;
          const jetzt = i === aktuell;
          const erreichbar = i <= aktuell;

          const inhalt = (
            <>
              <span
                aria-hidden
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[0.9rem] font-bold ${
                  jetzt
                    ? "border-hauptaktion bg-hauptaktion text-white"
                    : erledigt
                      ? "border-hauptaktion bg-white text-hauptaktion"
                      : "border-linie bg-white text-gedaempft"
                }`}
              >
                {i + 1}
              </span>
              <span className="text-left text-[0.85rem] font-semibold leading-tight">
                {t(schritt.titel)}
              </span>
            </>
          );

          const stil =
            "flex min-h-[44px] flex-1 items-center gap-2 rounded-xl px-2 py-0.5 " +
            (jetzt ? "bg-hinweis" : "");

          return (
            <li key={schritt.pfad} className="flex flex-1 basis-[180px]">
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

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/garne"
            className="flex min-h-[44px] items-center rounded-xl px-3 text-[0.9rem] font-semibold underline hover:bg-hinweis"
          >
            {t("kopf.meineGarne")}
          </Link>
          <Sprachwahl klein />
        </div>
      </div>
    </nav>
  );
}
