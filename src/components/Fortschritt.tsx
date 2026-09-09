"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useSprache } from "@/lib/sprache/SprachProvider";
import { Sprachwahl } from "./Sprachwahl";
import { Sicherungszeichen } from "./Sicherungszeichen";

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
 *
 * Auf einem schmalen Fenster stand jeder Schritt mit vollem Namen da und die
 * vier brachen auf vier Zeilen um – zweihundertsiebzig Bildpunkte, bevor die
 * Arbeit überhaupt anfing. Bis 1024 Punkte Breite bleibt deshalb nur die
 * Ziffer stehen; ausgeschrieben wird allein der Schritt, auf dem man gerade
 * ist. Das ist genau die Breite, ab der der Editor seine drei Spalten
 * nebeneinander legt – darunter liegt alles untereinander, und dort ist jeder
 * Punkt Höhe einer zu viel. Für Vorleseprogramme ändert sich nichts: die Namen der anderen stehen
 * weiter da, nur nicht mehr sichtbar.
 */
export function Fortschritt() {
  const { t } = useSprache();
  const pfad = usePathname();
  const leiste = useRef<HTMLElement>(null);

  // Die Einblendungen (siehe `Meldungen.tsx`) hängen oben und müssen unter
  // dieser Leiste anfangen. Wie hoch sie ist, hängt von der Fensterbreite ab
  // – auf einem schmalen Fenster rutschen „Meine Muster" und die Sprachwahl
  // in eigene Zeilen. Deshalb misst sie sich selbst.
  useEffect(() => {
    const el = leiste.current;
    if (!el) return;
    const setzen = () =>
      document.documentElement.style.setProperty("--kopfleiste", `${el.offsetHeight}px`);
    setzen();
    const beobachter = new ResizeObserver(setzen);
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);
  const aktuell = Math.max(
    0,
    SCHRITTE.findIndex((s) => pfad.startsWith(s.pfad)),
  );

  return (
    <nav
      ref={leiste}
      aria-label={t("schritt.fortschritt")}
      className="shrink-0 border-b border-linie bg-white"
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-4 py-1">
        {/* Schmal nimmt die Schrittzeile die volle Breite, damit „Meine
            Garne" und die Sprachwahl darunter rutschen. Vorher teilten sie
            sich die Zeile: für die vier Schritte blieben zweihundert Punkte,
            sie brachen untereinander um und die Beschriftung lag unter dem
            Garn-Link. */}
        <ol className="flex w-full min-w-0 flex-wrap items-stretch gap-1 lg:w-auto lg:flex-1">
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
              <span
                className={`text-left text-[0.85rem] font-semibold leading-tight ${
                  jetzt ? "" : "sr-only lg:not-sr-only"
                }`}
              >
                {t(schritt.titel)}
              </span>
            </>
          );

          // Zwei Zeilen sind fest vorgesehen: „Bild aussuchen" braucht eine,
          // „Muster ansehen und ändern" zwei. Ohne festen Platz wäre die
          // Leiste auf jeder der vier Seiten anders hoch, und der Inhalt
          // darunter spränge beim Weiterblättern.
          const stil =
            "flex min-h-[52px] flex-1 items-center gap-2 rounded-xl px-2 py-0.5 " +
            (jetzt ? "bg-hinweis" : "");

          return (
            // Schmal: nur so breit wie die Ziffer, damit alle vier in eine
            // Zeile passen. Ab 1024 Punkten wie bisher gleichmäßig verteilt.
            <li
              key={schritt.pfad}
              className={`flex ${jetzt ? "min-w-0 flex-1" : "flex-none"} lg:flex-1 lg:basis-[180px]`}
            >
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

        {/* Schmal darf auch dieser Block umbrechen. Mit `shrink-0` behielt er
            seine volle Breite und die Sprachwahl stand halb außerhalb des
            Fensters – anzutippen war sie dann nicht mehr. */}
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <Sicherungszeichen klein />
          <Link
            href="/"
            className="flex min-h-[48px] items-center rounded-xl px-3 text-[0.95rem] font-semibold underline hover:bg-hinweis"
          >
            {t("kopf.meineMuster")}
          </Link>
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
