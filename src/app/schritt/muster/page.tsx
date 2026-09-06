import { Seite } from "@/components/Seite";
import { KnopfLink } from "@/components/Knopf";

export const metadata = { title: "Muster ansehen und ändern – Stickmuster" };

export default function MusterSeite() {
  return (
    <Seite
      titel="Muster ansehen und ändern"
      erklaerung="Hier sehen Sie Ihr Zählmuster und können einzelne Stiche ändern."
      fuss={
        <>
          <KnopfLink art="neben" href="/schritt/einstellungen">
            Zurück zu Größe und Farben
          </KnopfLink>
          <KnopfLink art="haupt" gross href="/schritt/drucken">
            Weiter zum Drucken
          </KnopfLink>
        </>
      }
    >
      <p className="text-[1.05rem]">Dieser Schritt wird gerade gebaut.</p>
    </Seite>
  );
}
