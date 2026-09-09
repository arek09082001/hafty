"use client";

import { useEffect, useRef, useState } from "react";
import { Seite } from "@/components/Seite";
import { Abschnitt } from "@/components/Abschnitt";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Legende } from "@/components/Legende";
import { Rasteransicht, useZoom } from "@/components/Rasteransicht";
import { useMuster } from "@/lib/zustand/MusterProvider";
import { cmText, sticheInCm } from "@/lib/muster/typen";
import { freieFelder, paletteNachzaehlen } from "@/lib/muster/raster";
import { blattanzahl, musterAlsPdf } from "@/lib/druck/pdf";
import { garnlaengeMeter, meterText } from "@/lib/druck/garnverbrauch";
import { useSprache } from "@/lib/sprache/SprachProvider";
import type { Textschluessel } from "@/lib/sprache/texte";

export function MusterDrucken() {
  const { muster, raster, einstellungen, bild } = useMuster();
  const [laeuft, setLaeuft] = useState(false);
  const [fortschritt, setFortschritt] = useState<{ text: Textschluessel; anteil: number } | null>(
    null,
  );
  const { t, zahl, landeskennung } = useSprache();
  const [fehler, setFehler] = useState<Textschluessel | null>(null);
  const [datei, setDatei] = useState<{ url: string; name: string } | null>(null);
  const zoom = useZoom(4);
  const flaeche = useRef<HTMLDivElement>(null);
  const eingepasst = useRef(false);

  const { einpassen } = zoom;
  useEffect(() => {
    if (eingepasst.current || !muster || !flaeche.current) return;
    eingepasst.current = true;
    einpassen(
      flaeche.current.clientWidth - 24,
      flaeche.current.clientHeight - 24,
      muster.breite,
      muster.hoehe,
    );
  }, [muster, einpassen]);

  // Die erzeugte Datei wieder freigeben, wenn die Seite verlassen wird.
  useEffect(() => {
    const aktuell = datei;
    return () => {
      if (aktuell) URL.revokeObjectURL(aktuell.url);
    };
  }, [datei]);

  if (!muster || !raster) {
    return (
      <Seite
        titel={t("druck.titel")}
        erklaerung={t("editor.keinMuster")}
        fuss={
          <KnopfLink art="haupt" gross href="/schritt/bild">
            {t("einst.zurueckBildAussuchen")}
          </KnopfLink>
        }
      >
        <Hinweis>{t("editor.keinMusterText")}</Hinweis>
      </Seite>
    );
  }

  const breiteCm = sticheInCm(muster.breite, einstellungen.stoffzaehlung);
  const hoeheCm = sticheInCm(muster.hoehe, einstellungen.stoffzaehlung);
  const blaetter = blattanzahl(muster.breite, muster.hoehe);

  // Gezählt wird das, was jetzt im Muster steht, und nicht das, was beim
  // Erzeugen herauskam: von Hand gemalte Stiche und freigestellte Motive
  // ändern beides. Auf dieser Seite steht die Einkaufsliste – hier darf
  // keine Zahl von gestern stehen.
  const paletteJetzt = paletteNachzaehlen(muster.palette, raster);
  const paletteGebraucht = paletteJetzt.filter((e) => e.stiche > 0);
  const freieStellen = freieFelder(raster);
  const gesamtStiche = paletteJetzt.reduce((s, e) => s + e.stiche, 0);
  const gesamtGarn = paletteJetzt.reduce(
    (s, e) => s + garnlaengeMeter(e.stiche, einstellungen.stoffzaehlung),
    0,
  );

  async function drucken() {
    if (!muster || !raster) return;
    setFehler(null);
    setLaeuft(true);
    setFortschritt({ text: "arbeit.vorbereiten", anteil: 0.02 });

    try {
      const blob = await musterAlsPdf({
        name: bild?.name?.replace(/\.[a-z0-9]+$/i, "") || t("druck.meinMuster"),
        breite: muster.breite,
        hoehe: muster.hoehe,
        raster,
        palette: paletteGebraucht,
        stoffzaehlung: einstellungen.stoffzaehlung,
        t,
        zahl,
        landeskennung,
        melden: (text, anteil) => setFortschritt({ text, anteil }),
      });

      const url = URL.createObjectURL(blob);
      const name = `${(bild?.name?.replace(/\.[a-z0-9]+$/i, "") || t("druck.meinMuster")).replace(
        /[^\wäöüÄÖÜßąćęłńóśźżĄĆĘŁŃÓŚŹŻ -]/g,
        "",
      )}.pdf`;
      setDatei({ url, name });

      // Das Fenster zum Drucken öffnet sich von selbst – so muss die
      // Nutzerin die Datei nicht erst suchen.
      window.open(url, "_blank", "noopener");
    } catch {
      setFehler("druck.fehler");
    } finally {
      setLaeuft(false);
      setFortschritt(null);
    }
  }

  return (
    <Seite
      dicht
      titel={t("druck.titel")}
      kopfEnde={
        <p className="text-[1.05rem] text-gedaempft">
          {t("editor.masse", {
            breite: String(muster.breite),
            hoehe: String(muster.hoehe),
            cmBreite: cmText(breiteCm, landeskennung),
            cmHoehe: cmText(hoeheCm, landeskennung),
            zaehlung: String(einstellungen.stoffzaehlung),
          })}
        </p>
      }
      fuss={
        <>
          <KnopfLink art="neben" href="/schritt/muster">
            {t("druck.zurueckMuster")}
          </KnopfLink>
          <Knopf art="haupt" gross onClick={drucken} disabled={laeuft}>
            {laeuft ? t("druck.wirdVorbereitet") : t("druck.knopf")}
          </Knopf>
        </>
      }
    >
      {/* Derselbe Aufbau wie beim Bearbeiten: links die Arbeitsfläche mit dem
          Muster, rechts eine Spalte mit Abschnitten, getrennt durch eine
          Haarlinie. Wer von Schritt 3 herkommt, findet sich sofort zurecht. */}
      <div className="flex h-full min-h-0 flex-col overflow-y-auto border-t border-linie lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:overflow-hidden">
        <section className="flex min-h-0 shrink-0 flex-col lg:shrink">
          <p className="shrink-0 px-6 py-3 text-[1.05rem] font-semibold">{t("druck.soSiehtAus")}</p>
          <div
            ref={flaeche}
            className="grid h-[46vh] min-h-0 shrink-0 place-items-center overflow-auto px-6 pb-6 lg:h-auto lg:flex-1 lg:shrink"
          >
            <div className="w-fit border border-linie bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
              <Rasteransicht
                breite={muster.breite}
                hoehe={muster.hoehe}
                raster={raster}
                palette={paletteJetzt}
                zoom={zoom.zoom}
                mitLinien={false}
                beschriftung={t("druck.vorschauBeschriftung")}
              />
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-y-auto border-t border-linie bg-white lg:border-t-0 lg:border-l">
          {fehler ? (
            <div className="border-b border-linie p-4">
              <Hinweis art="fehler">{t(fehler)}</Hinweis>
              <Knopf art="still" klein className="mt-1" onClick={() => setFehler(null)}>
                {t("allgemein.meldungSchliessen")}
              </Knopf>
            </div>
          ) : null}

          {laeuft && fortschritt ? (
            <Abschnitt titel={t(fortschritt.text)}>
              <div className="h-4 w-full overflow-hidden rounded-full bg-hinweis">
                <div
                  className="h-full bg-hauptaktion transition-[width] duration-300"
                  style={{ width: `${Math.round(fortschritt.anteil * 100)}%` }}
                />
              </div>
            </Abschnitt>
          ) : null}

          {datei ? (
            <Abschnitt hinweis={t("druck.keinFenster")}>
              <Hinweis art="erfolg">{t("druck.fertig")}</Hinweis>
              <a
                href={datei.url}
                download={datei.name}
                className="mt-3 inline-flex min-h-[56px] w-full items-center justify-center rounded-xl border-2 border-tinte bg-white px-6 py-3 text-[1.05rem] font-semibold hover:bg-hinweis"
              >
                {t("druck.sichern")}
              </a>
            </Abschnitt>
          ) : null}

          <Abschnitt titel={t("druck.ausDrucker")} hinweis={t("druck.blaetterHinweis")}>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-[1.05rem]">
              <li>{t("druck.seiteVorschau")}</li>
              <li>{t("druck.seiteGarnliste")}</li>
              <li>{t("druck.seitenSchwarzweiss", { anzahl: zahl(blaetter) })}</li>
              <li>{t("druck.seitenFarbe", { anzahl: zahl(blaetter * 2 + 2) })}</li>
            </ul>
          </Abschnitt>

          <Abschnitt titel={t("druck.brauchenSie")} hinweis={t("druck.stoffHinweis")}>
            <dl className="flex flex-col text-[1.05rem]">
              <div className="flex justify-between gap-4 border-b border-linie py-2">
                <dt>{t("druck.stoff")}</dt>
                <dd className="text-right font-semibold">
                  {t("druck.stoffMasse", {
                    zaehlung: String(einstellungen.stoffzaehlung),
                    breite: cmText(breiteCm + 10, landeskennung),
                    hoehe: cmText(hoeheCm + 10, landeskennung),
                  })}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-linie py-2">
                <dt>{t("druck.farben")}</dt>
                <dd className="font-semibold">{paletteGebraucht.length}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-linie py-2">
                <dt>{t("druck.stiche")}</dt>
                <dd className="font-semibold">{zahl(gesamtStiche)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt>{t("druck.garnZusammen")}</dt>
                <dd className="font-semibold">
                  {t("druck.ungefaehr", { menge: meterText(gesamtGarn, landeskennung) })}
                </dd>
              </div>
            </dl>
          </Abschnitt>

          <Abschnitt titel={t("editor.ihreGarne", { anzahl: String(paletteGebraucht.length) })}>
            {/* Nur Garne, die auch gebraucht werden: wer ein Motiv
                freigestellt hat, soll keine Farbe kaufen, die im Muster gar
                nicht mehr vorkommt. */}
            <Legende palette={paletteGebraucht} stoffzaehlung={einstellungen.stoffzaehlung} />
            {freieStellen > 0 ? (
              <p className="mt-3 text-[1rem] text-gedaempft">
                {t("editor.freieFelder", { anzahl: zahl(freieStellen) })}
              </p>
            ) : null}
          </Abschnitt>
        </aside>
      </div>
    </Seite>
  );
}
