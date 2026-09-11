import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SprachProvider } from "@/lib/sprache/SprachProvider";
import { AbgleichProvider } from "@/lib/ferne/AbgleichProvider";
import { OhneNetz } from "@/components/OhneNetz";
import { MeldungenProvider } from "@/components/Meldungen";

export const metadata: Metadata = {
  title: "Wzory do haftu",
  description: "Z jednego zdjęcia wzór do haftu krzyżykowego.",
  // Damit sich die App installieren laesst wie ein Programm.
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Wzory do haftu", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Die Nutzerin darf jederzeit vergroessern.
  maximumScale: 5,
  themeColor: "#0b5d3b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Die App spricht nur Polnisch – siehe src/lib/sprache/SprachProvider.tsx.
    <html lang="pl" className="h-full">
      <body className="flex h-full flex-col overflow-hidden bg-papier text-tinte antialiased">
        <OhneNetz />
        <SprachProvider>
          <MeldungenProvider>
            <AbgleichProvider>{children}</AbgleichProvider>
          </MeldungenProvider>
        </SprachProvider>
      </body>
    </html>
  );
}
