"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { useMuster } from "@/lib/zustand/MusterProvider";

const BEISPIELE = [
  { datei: "/beispiele/blume.png", titel: "Blume" },
  { datei: "/beispiele/katze.png", titel: "Katze" },
  { datei: "/beispiele/haus-am-see.png", titel: "Haus am See" },
];

/** Höchstgröße einer Bilddatei: 25 MB. Darüber wird es auf dem Tablet zäh. */
const MAX_BYTES = 25 * 1024 * 1024;

export function BildAussuchen() {
  const { bild, bildWaehlen, bildEntfernen } = useMuster();
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState<string | null>(null);
  const dateiFeld = useRef<HTMLInputElement>(null);

  async function dateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    e.target.value = ""; // damit dieselbe Datei noch einmal gewählt werden kann
    if (!datei) return;

    if (!datei.type.startsWith("image/")) {
      setFehler(
        "Das war keine Bilddatei. Bitte wählen Sie ein Foto aus, zum Beispiel eine Datei, die auf .jpg oder .png endet.",
      );
      return;
    }
    if (datei.size > MAX_BYTES) {
      setFehler(
        "Dieses Bild ist sehr groß. Bitte wählen Sie ein kleineres Foto aus – bis etwa 25 Megabyte geht gut.",
      );
      return;
    }

    setFehler(null);
    try {
      await bildWaehlen({ name: datei.name, art: "datei", blob: datei });
    } catch {
      setFehler(
        "Dieses Bild konnte nicht geöffnet werden. Bitte wählen Sie ein anderes Foto aus, am besten im Format JPG oder PNG.",
      );
    }
  }

  async function beispielGewaehlt(datei: string, titel: string) {
    setFehler(null);
    setLaedt(datei);
    try {
      const antwort = await fetch(datei);
      const blob = await antwort.blob();
      await bildWaehlen({ name: titel, art: "beispiel", blob });
    } catch {
      setFehler(
        "Das Beispielbild konnte nicht geladen werden. Bitte prüfen Sie, ob Sie mit dem Internet verbunden sind, und tippen Sie noch einmal darauf.",
      );
    } finally {
      setLaedt(null);
    }
  }

  return (
    <Seite
      titel="Bild aussuchen"
      erklaerung="Wählen Sie ein Foto von Ihrem Gerät aus oder tippen Sie auf eines der drei Beispielbilder. Sie können später jederzeit ein anderes Bild nehmen."
      fuss={
        <>
          <span className="text-[1.05rem]">
            {bild ? (
              <>
                Ausgewählt: <strong>{bild.name}</strong>
              </>
            ) : (
              "Noch kein Bild ausgewählt."
            )}
          </span>
          {bild ? (
            <KnopfLink art="haupt" gross href="/schritt/einstellungen">
              Weiter zu Größe und Farben
            </KnopfLink>
          ) : (
            <Knopf art="haupt" gross disabled>
              Weiter zu Größe und Farben
            </Knopf>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-10">
        {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}

        {bild ? (
          <section className="flex flex-wrap items-center gap-6 rounded-2xl border-2 border-hauptaktion bg-white p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bild.vorschauUrl}
              alt={`Ausgewähltes Bild: ${bild.name}`}
              className="h-[180px] w-[180px] rounded-xl border-2 border-linie object-cover"
            />
            <div className="flex flex-col gap-3">
              <p className="text-[1.2rem] font-bold">Dieses Bild wird verwendet</p>
              <p className="text-[1.05rem] text-gedaempft">{bild.name}</p>
              <Knopf
                art="neben"
                onClick={() => {
                  bildEntfernen();
                  setFehler(null);
                }}
              >
                Anderes Bild aussuchen
              </Knopf>
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <h2 className="text-[1.4rem] font-bold">Ein eigenes Foto</h2>
          <p className="max-w-[60ch] text-[1.05rem]">
            Tippen Sie auf den Knopf. Es öffnet sich das Fenster Ihres Geräts, in dem Sie ein Bild
            auswählen können.
          </p>
          <input
            ref={dateiFeld}
            type="file"
            accept="image/*"
            onChange={dateiGewaehlt}
            className="sr-only"
            id="bilddatei"
          />
          <Knopf art={bild ? "neben" : "haupt"} gross onClick={() => dateiFeld.current?.click()}>
            Foto von meinem Gerät auswählen
          </Knopf>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[1.4rem] font-bold">Oder ein Beispielbild</h2>
          <p className="max-w-[60ch] text-[1.05rem]">
            Zum Ausprobieren. Tippen Sie einfach auf eines der Bilder.
          </p>
          <ul className="flex flex-wrap gap-5">
            {BEISPIELE.map((beispiel) => (
              <li key={beispiel.datei}>
                <button
                  type="button"
                  onClick={() => beispielGewaehlt(beispiel.datei, beispiel.titel)}
                  disabled={laedt !== null}
                  className="flex min-h-[56px] w-[240px] flex-col items-center gap-3 rounded-2xl border-2 border-tinte bg-white p-4 hover:bg-hinweis disabled:opacity-50"
                >
                  <Image
                    src={beispiel.datei}
                    alt=""
                    width={200}
                    height={200}
                    className="rounded-xl border-2 border-linie"
                  />
                  <span className="text-[1.15rem] font-semibold">
                    {laedt === beispiel.datei ? "Wird geladen …" : beispiel.titel}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Seite>
  );
}
