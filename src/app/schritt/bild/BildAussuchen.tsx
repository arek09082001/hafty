"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Zuschnitt } from "@/components/Zuschnitt";
import { Zahlenwahl } from "@/components/Zahlenwahl";
import { istGanzesBild } from "@/lib/muster/ausschnitt";
import { MAX_BREITE, MAX_FELDER, MIN_BREITE } from "@/lib/muster/typen";
import { useMuster } from "@/lib/zustand/MusterProvider";
import { useSprache } from "@/lib/sprache/SprachProvider";
import { useMeldungen } from "@/components/Meldungen";

/** Höchstgröße einer Bilddatei: 25 MB. Darüber wird es auf dem Tablet zäh. */
const MAX_BYTES = 25 * 1024 * 1024;

export function BildAussuchen() {
  const { bild, bildWaehlen, ausschnittSetzen, zugeordnetesProjekt, leereFlaecheAnlegen } =
    useMuster();
  const { t, zahl } = useSprache();
  const { melden } = useMeldungen();
  const router = useRouter();
  const dateiFeld = useRef<HTMLInputElement>(null);

  /** Maße der leeren Fläche, bis sie angelegt wird. */
  const [flaecheBreite, setFlaecheBreite] = useState(100);
  const [flaecheHoehe, setFlaecheHoehe] = useState(100);
  const zuGross = flaecheBreite * flaecheHoehe > MAX_FELDER;

  function flaecheAnfangen() {
    if (zuGross) return;
    leereFlaecheAnlegen(flaecheBreite, flaecheHoehe);
    // Schritt 2 hat hier nichts zu tun – es gibt kein Bild zu rechnen.
    router.push("/schritt/muster");
  }

  /**
   * Den Dateiauswahl-Dialog des Geräts aufmachen – und zwar sofort, mit
   * diesem einen Tipp und ohne Zwischenseite.
   *
   * Die Reihenfolge ist mit Bedacht so herum: Erst der Dialog, dann das
   * Vollbild. Das Vollbild verbraucht die „frische“ Nutzeraktion des
   * Browsers; stünde es vorn, bliebe der Dateidialog in manchen Browsern
   * einfach zu. Wie groß das Fenster des Geräts dann wird, entscheidet das
   * Betriebssystem – die App kann nur dafür sorgen, dass es sich über eine
   * bildschirmfüllende Seite legt und nicht über ein halbes Fenster.
   */
  function explorerOeffnen() {
    dateiFeld.current?.click();
    void vollbild();
  }

  async function dateiGewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    e.target.value = ""; // damit dieselbe Datei noch einmal gewählt werden kann
    if (!datei) return;

    if (!datei.type.startsWith("image/")) {
      melden(t("bild.fehlerKeinBild"), "fehler");
      return;
    }
    if (datei.size > MAX_BYTES) {
      melden(t("bild.fehlerZuGross"), "fehler");
      return;
    }

    try {
      await bildWaehlen({ name: datei.name, blob: datei });
    } catch {
      melden(t("bild.fehlerNichtLesbar"), "fehler");
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
      <div className="flex flex-col gap-8">

        {/* Dasselbe Foto wie neulich: die neue Fassung kommt zu den alten
            Ständen dazu, statt ein zweites Projekt aufzumachen. */}
        {bild && zugeordnetesProjekt ? (
          <Hinweis>{t("bild.schonBekannt", { name: zugeordnetesProjekt })}</Hinweis>
        ) : null}

        {/* Das Feld ist immer da, auch wenn noch kein Bild gewählt wurde:
            beide Knöpfe tippen darauf. */}
        <input
          ref={dateiFeld}
          type="file"
          accept="image/*"
          onChange={dateiGewaehlt}
          className="sr-only"
          id="bilddatei"
        />

        {bild ? (
          /* Das gewählte Bild und gleich darunter der Ausschnitt. Er steht
             offen da und nicht hinter einem Knopf: versteckte Einstellungen
             findet hier niemand. Wer nichts anrührt, bekommt das ganze Bild.

             Kein Rahmen mehr um das Ganze: die Überschrift und die Linie
             darunter sagen schon, dass hier ein Abschnitt anfängt. */
          <section className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-linie pb-4">
              <div>
                <p className="text-[1.2rem] font-bold">{t("bild.wirdVerwendet")}</p>
                <p className="text-[1.05rem] text-gedaempft">{bild.name}</p>
              </div>
              {/* Ein Tipp, ein Dialog. Das alte Bild bleibt so lange stehen,
                  bis wirklich ein neues gewählt ist – wer den Dialog wieder
                  zumacht, steht nicht plötzlich ohne Bild da. */}
              <Knopf art="neben" onClick={explorerOeffnen}>
                {t("bild.anderesWaehlen")}
              </Knopf>
            </div>

            <div>
              <h2 className="text-[1.3rem] font-bold">{t("zuschnitt.titel")}</h2>
              <p className="mt-1 max-w-[70ch] text-[1.05rem] text-gedaempft">
                {t("zuschnitt.erklaerung")}
              </p>
            </div>

            <Zuschnitt
              bildUrl={bild.vorschauUrl}
              bildBreite={bild.masse.breite}
              bildHoehe={bild.masse.hoehe}
              ausschnitt={bild.ausschnitt}
              onAendern={ausschnittSetzen}
            />

            {!istGanzesBild(bild.ausschnitt, bild.masse.breite, bild.masse.hoehe) ? (
              <Hinweis>{t("zuschnitt.hinweisGewaehlt")}</Hinweis>
            ) : null}
          </section>
        ) : null}

        <section className="flex flex-col gap-4 border-t border-linie pt-7">
          <h2 className="text-[1.3rem] font-bold">{t("bild.eigenesFoto")}</h2>
          <p className="max-w-[60ch] text-[1.05rem] text-gedaempft">{t("bild.eigenesFotoText")}</p>
          <Knopf art={bild ? "neben" : "haupt"} gross onClick={explorerOeffnen}>
            {t("bild.fotoWaehlen")}
          </Knopf>
        </section>

        {/* Der zweite Weg: ohne Foto anfangen und die Fläche mit gemerkten
            Motiven bestücken. Er steht offen daneben und nicht hinter einem
            Knopf – wer ihn nicht sucht, liest über ihn hinweg, und wer ihn
            braucht, findet ihn ohne Umweg. */}
        <section className="flex flex-col gap-4 border-t border-linie pt-7">
          <h2 className="text-[1.3rem] font-bold">{t("leer.titel")}</h2>
          <p className="max-w-[60ch] text-[1.05rem] text-gedaempft">{t("leer.text")}</p>

          <div className="flex flex-wrap gap-8">
            <Zahlenwahl
              id="leer-breite"
              beschriftung={t("leer.breite")}
              wert={flaecheBreite}
              min={MIN_BREITE}
              max={MAX_BREITE}
              schritt={10}
              einheit={t("allgemein.stiche")}
              onAendern={setFlaecheBreite}
            />
            <Zahlenwahl
              id="leer-hoehe"
              beschriftung={t("leer.hoehe")}
              wert={flaecheHoehe}
              min={MIN_BREITE}
              max={MAX_BREITE}
              schritt={10}
              einheit={t("allgemein.stiche")}
              onAendern={setFlaecheHoehe}
            />
          </div>

          {zuGross ? (
            <Hinweis art="fehler">
              {t("leer.zuGross", { felder: zahl(MAX_FELDER) })}
            </Hinweis>
          ) : null}

          <Knopf art="neben" gross onClick={flaecheAnfangen} disabled={zuGross}>
            {t("leer.anfangen")}
          </Knopf>
        </section>
      </div>
    </Seite>
  );

}

/**
 * Die Seite auf Vollbild stellen, damit der Dateidialog des Geräts vor einer
 * ganzen Seite steht und nicht vor einem kleinen Fensterausschnitt.
 *
 * Best effort: Browser dürfen das ablehnen (etwa wenn schon Vollbild ist oder
 * die Einstellung es verbietet). Dann wird eben nichts größer – das Bild
 * aussuchen geht trotzdem, deshalb gibt es hier auch keine Fehlermeldung.
 */
async function vollbild() {
  if (typeof document === "undefined") return;
  const seite = document.documentElement;
  if (document.fullscreenElement || typeof seite.requestFullscreen !== "function") return;
  try {
    await seite.requestFullscreen();
  } catch {
    // Kein Vollbild – kein Problem.
  }
}
