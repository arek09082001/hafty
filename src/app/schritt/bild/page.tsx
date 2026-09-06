import { Seite } from "@/components/Seite";
import { KnopfLink } from "@/components/Knopf";

export const metadata = { title: "Bild aussuchen – Stickmuster" };

export default function BildSeite() {
  return (
    <Seite
      titel="Bild aussuchen"
      erklaerung="Wählen Sie ein Foto von Ihrem Gerät oder tippen Sie auf eines der Beispielbilder."
      fuss={
        <KnopfLink art="haupt" gross href="/schritt/einstellungen">
          Weiter zu Größe und Farben
        </KnopfLink>
      }
    >
      <p className="text-[1.05rem]">Dieser Schritt wird gerade gebaut.</p>
    </Seite>
  );
}
