import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keine automatisch erzeugten AGENTS.md/CLAUDE.md im Projekt.
  agentRules: false,
};

export default nextConfig;
