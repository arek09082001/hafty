import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SprachProvider } from "@/lib/sprache/SprachProvider";

export const metadata: Metadata = {
  title: "Stickmuster · Wzory do haftu",
  description:
    "Aus einem Foto ein Kreuzstich-Zählmuster machen. – Z jednego zdjęcia wzór do haftu krzyżykowego.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Die Nutzerin darf jederzeit vergroessern.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // lang wird vom SprachProvider auf die gewählte Sprache gesetzt.
    <html lang="de" className="h-full">
      <body className="flex h-full flex-col overflow-hidden bg-papier text-tinte antialiased">
        <SprachProvider>{children}</SprachProvider>
      </body>
    </html>
  );
}
