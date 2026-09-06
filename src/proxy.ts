import type { NextRequest } from "next/server";
import { sitzungAktualisieren } from "@/lib/supabase/middleware";

/**
 * Laeuft vor jeder Anfrage: erneuert die Supabase-Sitzung und schuetzt alle
 * Seiten ausser der Anmeldung.
 */
export async function proxy(request: NextRequest) {
  return sitzungAktualisieren(request);
}

export const config = {
  matcher: [
    // Alles ausser statischen Dateien und Bildern.
    "/((?!_next/static|_next/image|favicon.ico|beispiele/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
