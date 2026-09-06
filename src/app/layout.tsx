import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stickmuster",
  description: "Aus einem Foto ein Kreuzstich-Zählmuster machen.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Die Nutzerin darf jederzeit vergroessern.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <body className="flex min-h-full flex-col bg-papier text-tinte antialiased">{children}</body>
    </html>
  );
}
