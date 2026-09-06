"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { useMuster } from "@/lib/zustand/MusterProvider";
import { useSprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

const BEISPIELE = [
  { datei: "/beispiele/blume.png", titel: "bild.beispielBlume" },
  { datei: "/beispiele/katze.png", titel: "bild.beispielKatze" },
  { datei: "/beispiele/haus-am-see.png", titel: "bild.beispielHaus" },
] as const satisfies ReadonlyArray<{ datei: string; titel: Textschluessel }>;

/** Höchstgröße einer Bilddatei: 25 MB. Darüber wird es auf dem Tablet zäh. */
const MAX_BYTES = 25 * 1024 * 1024;

export function BildAussuchen() {
  const { bild, bildWaehlen, bildEntfernen } = useMuster();
  const { t } = useSprache();
  const [fehler, setFehler] = useState<Textschluessel | null>(null);
  const [laedt, setLaedt] = useState<string | null>(null);
  const dateiFeld = useRef<HTMLInputElement>(null);

  async function dateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    e.target.value = ""; // damit dieselbe Datei noch einmal gewählt werden kann
    if (!datei) return;

    if (!datei.type.startsWith("image/")) {
      setFehler("bild.fehlerKeinBild");
      return;
    }
    if (datei.size > MAX_BYTES) {
      setFehler("bild.fehlerZuGross");
      return;
    }

    setFehler(null);
    try {
      await bildWaehlen({ name: datei.name, art: "datei", blob: datei });
    } catch {
      setFehler("bild.fehlerNichtLesbar");
    }
  }

  async function beispielGewaehlt(datei: string, titel: Textschluessel) {
    setFehler(null);
    setLaedt(datei);
    try {
      const antwort = await fetch(datei);
      const blob = await antwort.blob();
      await bildWaehlen({ name: t(titel), art: "beispiel", blob });
    } catch {
      setFehler("bild.fehlerBeispiel");
    } finally {
      setLaedt(null);
    }
  }

  return (
    <Seite
      titel={t("bild.titel")}
      erklaerung={t("bild.erklaerung")}
      fuss={
        <>
          <span className="text-[1.05rem]">
            {bild ? t("bild.ausgewaehlt", { name: bild.name }) : t("bild.nochKeins")}
          </span>
          {bild ? (
            <KnopfLink art="haupt" gross href="/schritt/einstellungen">
              {t("bild.weiter")}
            </KnopfLink>
          ) : (
            <Knopf art="haupt" gross disabled>
              {t("bild.weiter")}
            </Knopf>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-10">
        {fehler ? <Hinweis art="fehler">{t(fehler)}</Hinweis> : null}

        {bild ? (
          <section className="flex flex-wrap items-center gap-6 rounded-2xl border-2 border-hauptaktion bg-white p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bild.vorschauUrl}
              alt={t("bild.ausgewaehlt", { name: bild.name })}
              className="h-[180px] w-[180px] rounded-xl border-2 border-linie object-cover"
            />
            <div className="flex flex-col gap-3">
              <p className="text-[1.2rem] font-bold">{t("bild.wirdVerwendet")}</p>
              <p className="text-[1.05rem] text-gedaempft">{bild.name}</p>
              <Knopf
                art="neben"
                onClick={() => {
                  bildEntfernen();
                  setFehler(null);
                }}
              >
                {t("bild.anderesWaehlen")}
              </Knopf>
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <h2 className="text-[1.4rem] font-bold">{t("bild.eigenesFoto")}</h2>
          <p className="max-w-[60ch] text-[1.05rem]">{t("bild.eigenesFotoText")}</p>
          <input
            ref={dateiFeld}
            type="file"
            accept="image/*"
            onChange={dateiGewaehlt}
            className="sr-only"
            id="bilddatei"
          />
          <Knopf art={bild ? "neben" : "haupt"} gross onClick={() => dateiFeld.current?.click()}>
            {t("bild.fotoWaehlen")}
          </Knopf>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[1.4rem] font-bold">{t("bild.beispiele")}</h2>
          <p className="max-w-[60ch] text-[1.05rem]">{t("bild.beispieleText")}</p>
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
                    {laedt === beispiel.datei ? t("bild.wirdGeladen") : t(beispiel.titel)}
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
