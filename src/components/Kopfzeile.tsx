import Link from "next/link";

/**
 * Schmale Kopfzeile: Name der App und der Weg zum Garnvorrat. Bewusst
 * unauffällig – die Hauptaktion sitzt immer unten auf der Seite.
 *
 * Es gibt keine Anmeldung und damit auch nichts abzumelden.
 */
export function Kopfzeile() {
  return (
    <header className="shrink-0 border-b-2 border-linie bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2">
        <Link href="/schritt/bild" className="text-[1.05rem] font-bold">
          Stickmuster
        </Link>
        <Link
          href="/garne"
          className="flex min-h-[56px] items-center rounded-xl px-4 text-[1rem] font-semibold underline hover:bg-hinweis"
        >
          Meine Garne
        </Link>
      </div>
    </header>
  );
}
