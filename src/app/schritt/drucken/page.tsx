import { Seite } from "@/components/Seite";
import { KnopfLink } from "@/components/Knopf";

export const metadata = { title: "Drucken – Stickmuster" };

export default function DruckenSeite() {
  return (
    <Seite
      titel="Muster drucken"
      erklaerung="Sie bekommen Ihr Muster auf mehreren Blättern mit einer Liste aller Garne."
      fuss={
        <KnopfLink art="neben" href="/schritt/muster">
          Zurück zum Muster
        </KnopfLink>
      }
    >
      <p className="text-[1.05rem]">Dieser Schritt wird gerade gebaut.</p>
    </Seite>
  );
}
