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
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    let abgebrochen = false;
    garneLaden()
      .then((liste) => {
        if (!abgebrochen) setGarne(liste);
      })
      .catch(() => {
        if (!abgebrochen) {
          setGingSchief(true);
          setFehler(
            "Die Garnliste konnte nicht geholt werden. Bitte prüfen Sie Ihre Internetverbindung und laden Sie die Seite noch einmal.",
          );
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
      setFehler(
        "Diese Änderung konnte nicht gespeichert werden. Bitte prüfen Sie, ob Sie mit dem Internet verbunden sind, und tippen Sie noch einmal darauf.",
      );
    }
  }

  const meine = garne.filter((g) => g.imVorrat);

  return (
    <Seite
      titel="Meine Garne"
      erklaerung="Tragen Sie hier ein, welche Garne Sie zu Hause haben. Beim Erstellen eines Musters können Sie dann einstellen, dass nur diese Garne verwendet werden."
      fuss={
        <>
          <KnopfLink art="neben" href="/schritt/muster">
            Zurück zum Muster
          </KnopfLink>
          <span className="text-[1.1rem] font-semibold">
            {meine.length === 0
              ? "Noch kein Garn eingetragen."
              : `${meine.length} ${meine.length === 1 ? "Garn" : "Garne"} eingetragen.`}
          </span>
        </>
      }
    >
      <div className="flex flex-col gap-8">
        {fehler ? (
          <div className="flex flex-col gap-3">
            <Hinweis art="fehler">{fehler}</Hinweis>
            <Knopf art="neben" onClick={() => setFehler(null)}>
              Meldung schließen
            </Knopf>
          </div>
        ) : null}

        {meine.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-[1.4rem] font-bold">Das haben Sie zu Hause</h2>
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
                          {garn.name} · antippen zum Entfernen
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
          <h2 className="text-[1.4rem] font-bold">Garn hinzufügen</h2>
          {!geladen ? (
            <p className="text-[1.05rem] text-gedaempft">Die Garnliste wird geholt …</p>
          ) : gingSchief ? (
            <Hinweis art="fehler">
              Die Garnliste konnte nicht geholt werden. Bitte prüfen Sie Ihre
              Internetverbindung und laden Sie die Seite noch einmal.
            </Hinweis>
          ) : garne.length === 0 ? (
            <Hinweis>
              In der Garnliste steht noch nichts. Die Garnfarben werden einmalig mit dem
              Importskript eingelesen; solange das nicht geschehen ist, rechnet die App mit den
              Farben aus Ihrem Bild statt mit Herstellergarnen.
            </Hinweis>
          ) : (
            <>
              <p className="max-w-[70ch] text-[1.05rem]">
                Tippen Sie ein Garn an, dann steht es oben in Ihrer Liste. Ein zweites Antippen
                nimmt es wieder heraus.
              </p>
              <Garnwahl
                garne={garne}
                markiert={(g) => g.imVorrat}
                markierungText="Habe ich"
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
