import { Fortschritt } from "@/components/Fortschritt";
import { Kopfzeile } from "@/components/Kopfzeile";

export default function SchrittLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Kopfzeile />
      <Fortschritt />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
