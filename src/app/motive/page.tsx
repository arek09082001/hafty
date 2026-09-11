import { Kopfzeile } from "@/components/Kopfzeile";
import { MeineMotive } from "./MeineMotive";

export const metadata = { title: "Meine Motive · Moje motywy" };

export default function MotiveSeite() {
  return (
    <>
      <Kopfzeile />
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">
        <MeineMotive />
      </main>
    </>
  );
}
