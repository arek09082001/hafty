"use client";

import Link from "next/link";
import { Sprachwahl } from "./Sprachwahl";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Schmale Kopfzeile: Name der App und der Weg zum Garnvorrat. Bewusst
 * unauffällig – die Hauptaktion sitzt immer unten auf der Seite.
 *
 * Es gibt keine Anmeldung und damit auch nichts abzumelden.
 */
export function Kopfzeile() {
  const { t } = useSprache();

  return (
    <header className="shrink-0 border-b-2 border-linie bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2">
        <Link href="/schritt/bild" className="text-[1.05rem] font-bold">
          {t("kopf.appName")}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/garne"
            className="flex min-h-[56px] items-center rounded-xl px-4 text-[1rem] font-semibold underline hover:bg-hinweis"
          >
            {t("kopf.meineGarne")}
          </Link>
          <Sprachwahl />
        </div>
      </div>
    </header>
  );
}
