import { Kopfzeile } from "@/components/Kopfzeile";
import { MeineGarne } from "./MeineGarne";

export const metadata = { title: "Meine Garne – Stickmuster" };

export default function GarneSeite() {
  return (
    <>
      <Kopfzeile />
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">
        <MeineGarne />
      </main>
    </>
  );
}
