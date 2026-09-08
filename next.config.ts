import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keine automatisch erzeugten AGENTS.md/CLAUDE.md im Projekt.
  agentRules: false,

  // Die Garnliste liegt als CSV im Projekt und wird von der Route
  // /api/garne zur Laufzeit gelesen. Ohne diese Zeile packt der Hoster
  // die Datei nicht mit ein, und der Knopf "Garnfarben einlesen" findet
  // sie dort nicht.
  outputFileTracingIncludes: {
    "/api/garne": ["./data/garne-ariadna.csv"],
  },
};

export default nextConfig;
