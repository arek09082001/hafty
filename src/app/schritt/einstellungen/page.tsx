import { Seite } from "@/components/Seite";
import { KnopfLink } from "@/components/Knopf";

export const metadata = { title: "Größe und Farben – Stickmuster" };

export default function EinstellungenSeite() {
  return (
    <Seite
      titel="Größe und Farben"
      erklaerung="Wie breit soll das Muster werden, welchen Stoff sticken Sie und wie viele Farben darf es haben?"
      fuss={
        <>
          <KnopfLink art="neben" href="/schritt/bild">
            Zurück zum Bild
          </KnopfLink>
          <KnopfLink art="haupt" gross href="/schritt/muster">
            Muster erstellen
          </KnopfLink>
        </>
      }
    >
      <p className="text-[1.05rem]">Dieser Schritt wird gerade gebaut.</p>
    </Seite>
  );
}
