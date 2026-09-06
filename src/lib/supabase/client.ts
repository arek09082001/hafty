"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase-Client fuer den Browser. Die Sitzung liegt in Cookies, damit sie
 * auch serverseitig gelesen werden kann und die Nutzerin dauerhaft
 * angemeldet bleibt.
 */
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
