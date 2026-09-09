import { Fortschritt } from "@/components/Fortschritt";
import { FehlerAlsMeldung } from "@/components/FehlerAlsMeldung";
import { MusterProvider } from "@/lib/zustand/MusterProvider";

/**
 * Auf den vier Schritten gibt es nur eine Leiste oben: die Fortschrittsleiste
 * trägt auch den Weg zum Garnvorrat und die Sprachwahl. Jede eingesparte
 * Zeile kommt dem Muster zugute.
 */
export default function SchrittLayout({ children }: { children: React.ReactNode }) {
  return (
    <MusterProvider>
      <FehlerAlsMeldung />
      <Fortschritt />
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
    </MusterProvider>
  );
}
