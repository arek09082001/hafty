"use client";

import { useEffect, useState } from "react";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Garnwahl } from "@/components/Garnwahl";
import {
  garneLaden,
  vorratAufnehmen,
  vorratEntfernen,
  type GarnMitVorrat,
} from "@/lib/speicher/garne";
import { hexNachRgb, istDunkel } from "@/lib/farbe/lab";
import { garnname } from "@/lib/farbe/farbwort";
import { useSprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

/**
 * Der eigene Garnvorrat: welche Garne die Nutzerin zu Hause hat.
 *
 * Eingetragen wird auf zwei Wegen – über die Suche nach der Nummer auf der
 * Banderole und über die Farbtafel zum Antippen.
 */
export function MeineGarne() {
  const [garne, setGarne] = useState<GarnMitVorrat[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [gingSchief, setGingSchief] = useState(false);
  const { t, zahl } = useSprache();
  const [fehler, setFehler] = useState<Textschluessel | null>(null);

  // Einmal eingeblendet, bleibt der Einlese-Abschnitt stehen. Sonst
  // verschwaende er im selben Augenblick, in dem er Erfolg meldet – die
  // Liste ist dann ja nicht mehr leer – und niemand saehe, dass es
  // geklappt hat.

  useEffect(() => {
    let abgebrochen = false;
    garneLaden()
      .then((liste) => {
        if (!abgebrochen) {
          setGarne(liste);
          setGingSchief(false);
        }
      })
      .catch(() => {
        if (!abgebrochen) {
          setGingSchief(true);
          setFehler("garne.fehlerLaden");
        }
      })
      .finally(() => {
        if (!abgebrochen) setGeladen(true);
      });
    return () => {
      abgebrochen = true;
    };
  }, []);

  async function umschalten(garn: GarnMitVorrat) {
    const neu = !garn.imVorrat;
    // Sofort umschalten, damit sich das Antippen nicht zäh anfühlt.
    setGarne((liste) => liste.map((g) => (g.id === garn.id ? { ...g, imVorrat: neu } : g)));
    const geklappt = neu ? await vorratAufnehmen(garn.id) : await vorratEntfernen(garn.id);
    if (!geklappt) {
      setGarne((liste) => liste.map((g) => (g.id === garn.id ? { ...g, imVorrat: !neu } : g)));
      setFehler("garne.fehlerAendern");
    }
  }

  const meine = garne.filter((g) => g.imVorrat);

  return (
    <Seite
      titel={t("garne.titel")}
      erklaerung={t("garne.erklaerung")}
      fuss={
        <>
          <KnopfLink art="neben" href="/schritt/muster">
            {t("garne.zurueckMuster")}
          </KnopfLink>
          <span className="text-[1.1rem] font-semibold">
            {meine.length === 0
              ? t("garne.keinsEingetragen")
              : t("garne.eingetragen", { anzahl: zahl(meine.length) })}
          </span>
        </>
      }
    >
      <div className="flex flex-col gap-8">
        {fehler ? (
          <div className="flex flex-col gap-3">
            <Hinweis art="fehler">{t(fehler)}</Hinweis>
            <Knopf art="neben" onClick={() => setFehler(null)}>
              {t("allgemein.meldungSchliessen")}
            </Knopf>
          </div>
        ) : null}

        {meine.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-[1.4rem] font-bold">{t("garne.zuHause")}</h2>
            <ul className="flex flex-wrap gap-3">
              {meine.map((garn) => {
                const rgb = hexNachRgb(garn.hex);
                return (
                  <li key={garn.id}>
                    <button
                      type="button"
                      onClick={() => umschalten(garn)}
                      className="flex min-h-[56px] items-center gap-3 rounded-xl border-2 border-hauptaktion bg-white py-2 pr-4 pl-2 hover:bg-hinweis"
                    >
                      <span
                        aria-hidden
                        className="h-11 w-11 shrink-0 rounded-lg border-2 border-tinte"
                        style={{ backgroundColor: garn.hex }}
                      />
                      <span className="flex flex-col text-left leading-tight">
                        <span className="text-[1.05rem] font-bold">
                          {garn.marke} {garn.code}
                        </span>
                        <span className="text-[0.9rem] text-gedaempft">
                          {t("garne.zumEntfernen", { name: garnname(garn.name, garn.hex, t) })}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="sr-only"
                        style={{ color: istDunkel(rgb[0], rgb[1], rgb[2]) ? "#fff" : "#000" }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <h2 className="text-[1.4rem] font-bold">{t("garne.hinzufuegen")}</h2>
          {!geladen ? (
            <p className="text-[1.05rem] text-gedaempft">{t("garne.wirdGeholt")}</p>
          ) : gingSchief ? (
            <Hinweis art="fehler">{t("garne.fehlerLaden")}</Hinweis>
          ) : garne.length === 0 ? (
            <Hinweis>{t("garne.listeLeer")}</Hinweis>
          ) : (
            <>
              <p className="max-w-[70ch] text-[1.05rem]">{t("garne.antippenText")}</p>
              <Garnwahl
                garne={garne}
                markiert={(g) => g.imVorrat}
                markierungText={t("garne.habeIch")}
                onWaehlen={umschalten}
                hoehe="max-h-[46vh]"
              />
            </>
          )}
        </section>
      </div>
    </Seite>
  );
}
