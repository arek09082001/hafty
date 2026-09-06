import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Seiten, die ohne Anmeldung erreichbar sind. */
const OFFEN = ["/anmelden", "/auth"];

/**
 * Erneuert bei jeder Anfrage die Sitzung und schickt nicht angemeldete
 * Besucherinnen zur Anmeldeseite.
 */
export async function sitzungAktualisieren(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pfad = request.nextUrl.pathname;
  const istOffen = OFFEN.some((p) => pfad === p || pfad.startsWith(p + "/"));

  if (!user && !istOffen) {
    const ziel = request.nextUrl.clone();
    ziel.pathname = "/anmelden";
    ziel.search = "";
    return NextResponse.redirect(ziel);
  }

  if (user && pfad === "/anmelden") {
    const ziel = request.nextUrl.clone();
    ziel.pathname = "/schritt/bild";
    ziel.search = "";
    return NextResponse.redirect(ziel);
  }

  return response;
}
