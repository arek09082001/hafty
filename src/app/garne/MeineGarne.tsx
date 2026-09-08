"use client";

import { useEffect, useState } from "react";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Dialog } from "@/components/Dialog";
import { Garnwahl } from "@/components/Garnwahl";
import { Garneinlesen } from "@/components/Garneinlesen";
import {
  garneLaden,
  Ladefehler,
  vorratAufnehmen,
  vorratEntfernen,
  vorratAlleAufnehmen,
  vorratLeeren,
  type GarnMitVorrat,
} from "@/lib/speicher/garne";
import { useSprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

/**
 * Der eigene Garnvorrat: welche Garne die Nutzerin zu Hause hat.
 *
 * Die Liste steht **an einer Stelle**. Früher gab es oben noch einmal alles
 * Angekreuzte als eigene Liste; beim Antippen wuchs die obere Liste und schob
 * die untere weg, sodass unter dem Finger plötzlich eine andere Farbe lag.
 * Jetzt ändert ein Antippen nur die Karte selbst – nichts springt. Wer sehen
 * will, was schon eingetragen ist, schaltet auf „nur meine Garne zeigen“.
 */
export function MeineGarne() {
  const [garne, setGarne] = useState<GarnMitVorrat[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [gingSchief, setGingSchief] = useState(false);
  const { t, zahl } = useSprache();
  const [fehler, setFehler] = useState<Textschluessel | null>(null);
  const [ladefehler, setLadefehler] = useState<Textschluessel>("garne.fehlerLaden");
  const [nachladen, setNachladen] = useState(0);
  const [einlesenZeigen, setEinlesenZeigen] = useState(false);
  const [nurMeine, setNurMeine] = useState(false);
  const [leerenFragen, setLeerenFragen] = useState(false);
  const [arbeitet, setArbeitet] = useState(false);

  useEffect(() => {
    let abgebrochen = false;
    garneLaden()
      .then((liste) => {
        if (!abgebrochen) {
          setGarne(liste);
          setGingSchief(false);
          if (liste.length === 0) setEinlesenZeigen(true);
        }
      })
      .catch((fehler: unknown) => {
        if (!abgebrochen) {
          const rechte = fehler instanceof Ladefehler && fehler.grund === "rechte";
          setGingSchief(true);
          setEinlesenZeigen(true);
          setLadefehler(rechte ? "garne.fehlerRechte" : "garne.fehlerLaden");
          setFehler(rechte ? "garne.fehlerRechte" : "garne.fehlerLaden");
        }
      })
      .finally(() => {
        if (!abgebrochen) setGeladen(true);
      });
    return () => {
      abgebrochen = true;
    };
  }, [nachladen]);

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

  async function alleAufnehmen() {
    setArbeitet(true);
    const vorher = garne;
    setGarne((liste) => liste.map((g) => ({ ...g, imVorrat: true })));
    const geklappt = await vorratAlleAufnehmen(garne.map((g) => g.id));
    if (!geklappt) {
      setGarne(vorher);
      setFehler("garne.fehlerAendern");
    }
    setArbeitet(false);
  }

  async function alleEntfernen() {
    setLeerenFragen(false);
    setArbeitet(true);
    const vorher = garne;
    setGarne((liste) => liste.map((g) => ({ ...g, imVorrat: false })));
    const geklappt = await vorratLeeren();
    if (!geklappt) {
      setGarne(vorher);
      setFehler("garne.fehlerAendern");
    }
    setArbeitet(false);
  }

  const meine = garne.filter((g) => g.imVorrat);
  const gezeigt = nurMeine ? meine : garne;
  const alleDrin = garne.length > 0 && meine.length === garne.length;

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
      <div className="flex flex-col gap-6">
        {fehler ? (
          <div className="flex flex-col gap-3">
            <Hinweis art="fehler">{t(fehler)}</Hinweis>
            <Knopf art="neben" onClick={() => setFehler(null)}>
              {t("allgemein.meldungSchliessen")}
            </Knopf>
          </div>
        ) : null}

        {einlesenZeigen ? (
          <Garneinlesen onFertig={() => setNachladen((n) => n + 1)} />
        ) : null}

        <section className="flex flex-col gap-4">
          <h2 className="text-[1.4rem] font-bold">{t("garne.hinzufuegen")}</h2>

          {!geladen ? (
            <p className="text-[1.05rem] text-gedaempft">{t("garne.wirdGeholt")}</p>
          ) : gingSchief ? (
            <Hinweis art="fehler">{t(ladefehler)}</Hinweis>
          ) : garne.length === 0 ? (
            <Hinweis>{t("garne.listeLeer")}</Hinweis>
          ) : (
            <>
              <p className="max-w-[70ch] text-[1.05rem]">{t("garne.antippenText")}</p>

              {/* Alles auf einmal – für alle, die die ganze Garnkarte haben. */}
              <div className="flex flex-wrap items-center gap-3">
                <Knopf
                  art="neben"
                  disabled={arbeitet || alleDrin}
                  onClick={alleAufnehmen}
                >
                  {t("garne.alleEintragen", { anzahl: zahl(garne.length) })}
                </Knopf>
                {meine.length > 0 ? (
                  <Knopf art="neben" disabled={arbeitet} onClick={() => setLeerenFragen(true)}>
                    {t("garne.alleEntfernen")}
                  </Knopf>
                ) : null}
                {meine.length > 0 ? (
                  <Knopf
                    art="neben"
                    aria-pressed={nurMeine}
                    onClick={() => setNurMeine((n) => !n)}
                    className={nurMeine ? "border-hauptaktion bg-[#e8f3ee]" : ""}
                  >
                    {nurMeine
                      ? t("garne.alleZeigen", { anzahl: zahl(garne.length) })
                      : t("garne.nurMeineZeigen", { anzahl: zahl(meine.length) })}
                  </Knopf>
                ) : null}
              </div>

              {gezeigt.length === 0 ? (
                <Hinweis>{t("garne.keinsEingetragen")}</Hinweis>
              ) : (
                <Garnwahl
                  garne={gezeigt}
                  markiert={(g) => g.imVorrat}
                  markierungText={t("garne.habeIch")}
                  onWaehlen={umschalten}
                  hoehe="max-h-none"
                />
              )}
            </>
          )}
        </section>
      </div>

      <Dialog
        offen={leerenFragen}
        titel={t("garne.alleEntfernenFrage")}
        text={t("garne.alleEntfernenText", { anzahl: zahl(meine.length) })}
        bestaetigenText={t("garne.alleEntfernenJa")}
        bestaetigenArt="gefahr"
        abbrechenText={t("allgemein.abbrechen")}
        onBestaetigen={alleEntfernen}
        onAbbrechen={() => setLeerenFragen(false)}
      />
    </Seite>
  );
}
