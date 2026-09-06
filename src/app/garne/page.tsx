import { Kopfzeile } from "@/components/Kopfzeile";
import { Seite } from "@/components/Seite";
import { KnopfLink } from "@/components/Knopf";

export const metadata = { title: "Meine Garne – Stickmuster" };

export default function GarneSeite() {
  return (
    <>
      <Kopfzeile />
      <main className="flex flex-1 flex-col">
        <Seite
          titel="Meine Garne"
          erklaerung="Tragen Sie hier ein, welche Garne Sie zu Hause haben."
          fuss={
            <KnopfLink art="neben" href="/schritt/bild">
              Zurück zum Muster
            </KnopfLink>
          }
        >
          <p className="text-[1.05rem]">Diese Seite wird gerade gebaut.</p>
        </Seite>
      </main>
    </>
  );
}
