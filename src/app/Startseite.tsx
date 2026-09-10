"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Kopfzeile } from "@/components/Kopfzeile";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Dialog } from "@/components/Dialog";
import { Vergleich } from "@/components/Vergleich";
import { Sicherungszeichen } from "@/components/Sicherungszeichen";
import { projektLoeschen, projektOeffnen, projekteLaden, type Projektuebersicht } from "@/lib/speicher/projekte";
import { zeitpunktText } from "@/lib/speicher/staende";
import { useAbgleich } from "@/lib/ferne/AbgleichProvider";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Die Startseite: woran zuletzt gearbeitet wurde.
 * ---------------------------------------------------------------------------
 *
 * Vorher fing die App immer mit „Bild aussuchen" an. Für den ersten Besuch
 * ist das richtig, für jeden weiteren nicht: die Nutzerin kommt zurück, um
 * an dem Muster von gestern weiterzumachen, und musste dafür das Foto noch
 * einmal auf der Festplatte suchen.
 *
 * Jetzt steht hier, was da ist: das hochgeladene Bild, wann zuletzt daran
 * gearbeitet wurde und die letzten Stände als Bildchen. Ein Tipp auf eines
 * davon öffnet genau diesen Stand.
 *
 * Wer noch nichts hat, sieht nur den grünen Knopf – und für den ist der Weg
 * derselbe wie vorher.
 */
export function Startseite() {
  const { t, sprache, zahl } = useSprache();
  const { zustand: abgleich, jetztSichern } = useAbgleich();
  const router = useRouter();
  const [projekte, setProjekte] = useState<Projektuebersicht[] | null>(null);
  const [oeffnetGerade, setOeffnetGerade] = useState<string | null>(null);
  const [vergleich, setVergleich] = useState<string | null>(null);
  const [zumLoeschen, setZumLoeschen] = useState<Projektuebersicht | null>(null);

  const zeit = (iso: string) => zeitpunktText(iso, sprache, t);

  const neuLaden = useCallback(() => {
    projekteLaden()
      .then(setProjekte)
      .catch(() => setProjekte([]));
  }, []);

  useEffect(() => {
    neuLaden();
    // Beim ersten Start auf einem neuen Gerät kommen die Muster erst nach und
    // nach aus der Sicherung an. `zuletzt` springt bei jedem Stück – dann
    // steht die Liste kurz darauf von selbst da, ohne dass jemand die Seite
    // neu laden muss.
  }, [neuLaden, abgleich.zuletzt]);

  async function oeffnen(projektId: string, standId?: string) {
    setOeffnetGerade(projektId);
    const geklappt = await projektOeffnen(projektId, standId);
    if (geklappt) {
      router.push("/schritt/muster");
      return;
    }
    setOeffnetGerade(null);
  }

  async function loeschen() {
    if (!zumLoeschen) return;
    await projektLoeschen(zumLoeschen.id);
    setZumLoeschen(null);
    neuLaden();
    // Gelöscht heißt gelöscht: das gehört sofort auch aus der Sicherung
    // heraus und nicht erst beim nächsten Durchgang.
    jetztSichern();
  }

  return (
    <>
      <Kopfzeile />
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">
        <Seite
          titel={t("start.titel")}
          erklaerung={t("start.erklaerung")}
          weit
          kopfEnde={<Sicherungszeichen />}
          fuss={
            <>
              <span className="text-[1.05rem] text-gedaempft">{t("start.fussHinweis")}</span>
              {/* „neu=1": Schritt 1 fängt leer an. Ohne die Marke stünde
                  dort das zuletzt bearbeitete Bild – der Arbeitsstand wird
                  beim Öffnen ja zurückgeholt –, und wer ein neues Foto
                  wollte, wäre wieder in seinem alten Projekt gelandet. */}
              <KnopfLink art="haupt" gross href="/schritt/bild?neu=1">
                {t("start.neuesBild")}
              </KnopfLink>
            </>
          }
        >
          {projekte === null ? (
            <p className="text-[1.05rem] text-gedaempft">{t("start.wirdGeholt")}</p>
          ) : projekte.length === 0 ? (
            <Hinweis>{t("start.nochNichts")}</Hinweis>
          ) : (
            <section className="flex flex-col gap-4">
              <h2 className="text-[1.3rem] font-bold">{t("start.zuletzt")}</h2>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {projekte.map((projekt) => (
                  <li
                    key={projekt.id}
                    className="flex flex-col gap-3 rounded-xl border border-linie bg-white p-4"
                  >
                    <button
                      type="button"
                      onClick={() => oeffnen(projekt.id)}
                      disabled={oeffnetGerade !== null}
                      className="flex min-h-[56px] items-start gap-4 rounded-lg text-left hover:bg-hinweis disabled:opacity-60"
                    >
                      {projekt.bildUrl ? (
                        <Image
                          src={projekt.bildUrl}
                          alt=""
                          width={120}
                          height={120}
                          unoptimized
                          className="h-[110px] w-[110px] shrink-0 rounded-lg border border-linie bg-hinweis object-cover"
                        />
                      ) : (
                        <span className="flex h-[110px] w-[110px] shrink-0 items-center justify-center rounded-lg border border-linie bg-hinweis text-[0.9rem] text-gedaempft">
                          {t("start.ohneBild")}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[1.1rem] font-bold">
                          {projekt.name || t("start.ohneNamen")}
                        </span>
                        <span className="mt-1 block text-[1rem] text-gedaempft">
                          {zeit(projekt.zuletztAm)}
                        </span>
                        <span className="mt-1 block text-[1rem] text-gedaempft">
                          {projekt.staendeAnzahl === 1
                            ? t("start.standEiner")
                            : t("start.staende", { anzahl: zahl(projekt.staendeAnzahl) })}
                        </span>
                      </span>
                    </button>

                    {projekt.staende.length > 0 ? (
                      <ul className="flex gap-2 overflow-x-auto pb-1">
                        {projekt.staende.map((stand) => (
                          <li key={stand.id} className="shrink-0">
                            <button
                              type="button"
                              onClick={() => oeffnen(projekt.id, stand.id)}
                              disabled={oeffnetGerade !== null}
                              title={zeit(stand.angelegtAm)}
                              className="flex min-h-[56px] w-[92px] flex-col items-center gap-1 rounded-lg border border-linie bg-white p-1 hover:bg-hinweis disabled:opacity-60"
                            >
                              {stand.vorschauUrl ? (
                                <Image
                                  src={stand.vorschauUrl}
                                  alt=""
                                  width={84}
                                  height={64}
                                  unoptimized
                                  className="raster h-[64px] w-[84px] rounded border border-linie bg-hinweis object-contain"
                                />
                              ) : (
                                <span className="h-[64px] w-[84px] rounded border border-linie bg-hinweis" />
                              )}
                              <span className="text-[0.8rem] leading-tight text-gedaempft">
                                {t("start.farben", { anzahl: zahl(stand.farben) })}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Knopf klein onClick={() => oeffnen(projekt.id)} disabled={oeffnetGerade !== null}>
                        {oeffnetGerade === projekt.id ? t("allgemein.wirdGeholt") : t("start.oeffnen")}
                      </Knopf>
                      <Knopf
                        klein
                        onClick={() => setVergleich(projekt.id)}
                        disabled={projekt.staendeAnzahl === 0}
                      >
                        {t("start.vergleichen")}
                      </Knopf>
                      <Knopf art="still" klein onClick={() => setZumLoeschen(projekt)}>
                        {t("start.loeschen")}
                      </Knopf>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </Seite>
      </main>

      <Vergleich
        musterId={vergleich}
        offen={vergleich !== null}
        onSchliessen={() => setVergleich(null)}
        onGeloescht={() => {
          neuLaden();
          jetztSichern();
        }}
      />

      <Dialog
        offen={zumLoeschen !== null}
        titel={t("start.loeschenTitel", { name: zumLoeschen?.name || t("start.ohneNamen") })}
        text={t("start.loeschenText")}
        bestaetigenText={t("allgemein.jaLoeschen")}
        bestaetigenArt="gefahr"
        abbrechenText={t("allgemein.behalten")}
        onBestaetigen={loeschen}
        onAbbrechen={() => setZumLoeschen(null)}
      />
    </>
  );
}
