import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { Abmelden } from "./Abmelden";

/**
 * Schmale Kopfzeile: Name der App, der Garnvorrat und das Abmelden.
 * Bewusst unauffaellig – die Hauptaktion sitzt immer unten auf der Seite.
 */
export async function Kopfzeile() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b-2 border-linie bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-2">
        <Link href="/schritt/bild" className="text-[1.05rem] font-bold">
          Stickmuster
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/garne"
            className="flex min-h-[56px] items-center rounded-xl px-4 text-[1rem] font-semibold underline hover:bg-hinweis"
          >
            Meine Garne
          </Link>
          {user ? <Abmelden email={user.email ?? ""} /> : null}
        </div>
      </div>
    </header>
  );
}
