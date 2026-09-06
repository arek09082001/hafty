import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";

/**
 * Ziel des Magic Links. Supabase haengt entweder einen `code` (PKCE) oder
 * ein `token_hash` an. Beides wird hier gegen eine dauerhafte Sitzung
 * eingetauscht.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const weiter = url.searchParams.get("next") ?? "/schritt/bild";

  const supabase = await serverClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(weiter, url.origin));
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(weiter, url.origin));
  }

  // Der Link war abgelaufen oder wurde schon benutzt.
  const zurueck = new URL("/anmelden", url.origin);
  zurueck.searchParams.set("linkAbgelaufen", "1");
  return NextResponse.redirect(zurueck);
}
