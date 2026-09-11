import type { NextConfig } from "next";

/**
 * Die Kennung dieses Bauvorgangs.
 * ---------------------------------------------------------------------------
 *
 * Sie steht an zwei Stellen: in der Adresse, unter der der Service Worker
 * angemeldet wird (`/sw.js?v=…`, siehe `OhneNetz.tsx`), und im Namen des
 * Zwischenspeichers (siehe `public/sw.js`). Damit ist nach jeder
 * Veröffentlichung ein *anderer* Service Worker anzumelden – und genau daran
 * merkt ein Browser überhaupt erst, dass es eine neue Fassung gibt.
 *
 * Ohne das blieb eine installierte App auf dem Stand ihres Installationstages
 * sitzen: die Datei `sw.js` ändert sich ja nie, also sah der Browser nie einen
 * Grund, etwas Neues zu holen.
 *
 * Genommen wird, was die Veröffentlichung hergibt (bei Vercel der Commit),
 * sonst der Zeitpunkt des Bauens.
 */
const FASSUNG =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
  process.env.FASSUNG ??
  String(Date.now());

const nextConfig: NextConfig = {
  // Keine automatisch erzeugten AGENTS.md/CLAUDE.md im Projekt.
  agentRules: false,

  generateBuildId: async () => FASSUNG,
  env: { NEXT_PUBLIC_FASSUNG: FASSUNG },

  async headers() {
    return [
      {
        // Der Service Worker und das Manifest dürfen nie aus dem
        // Zwischenspeicher des Browsers kommen: sonst fände eine alte
        // Installation die neue Fassung erst Tage später.
        source: "/:datei(sw.js|manifest.webmanifest)",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
