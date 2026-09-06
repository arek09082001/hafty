import { Fortschritt } from "@/components/Fortschritt";
import { Kopfzeile } from "@/components/Kopfzeile";
import { MusterProvider } from "@/lib/zustand/MusterProvider";

export default function SchrittLayout({ children }: { children: React.ReactNode }) {
  return (
    <MusterProvider>
      <Kopfzeile />
      <Fortschritt />
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
    </MusterProvider>
  );
}
