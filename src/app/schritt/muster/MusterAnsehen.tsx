"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Glaettungsregler } from "@/components/Glaettungsregler";
import { Legende } from "@/components/Legende";
import { Rasteransicht, useZoom } from "@/components/Rasteransicht";
import { useMuster } from "@/lib/zustand/MusterProvider";
import { cmText, sticheInCm } from "@/lib/muster/typen";

export function MusterAnsehen() {
  const { muster, raster, einstellungen, glaettungSetzen, laeuft, fehler, fehlerSetzen } =
    useMuster();
  const [mitSymbolen, setMitSymbolen] = useState(false);
  const zoom = useZoom(6);
  const flaeche = useRef<HTMLDivElement>(null);
  const eingepasst = useRef(false);

  // Beim ersten Anzeigen so einstellen, dass das ganze Muster zu sehen ist.
  const { einpassen } = zoom;
  const ganzZeigen = useCallback(() => {
    const feld = flaeche.current;
    if (!feld || !muster) return;
    einpassen(feld.clientWidth - 24, feld.clientHeight - 24, muster.breite, muster.hoehe);
  }, [einpassen, muster]);

  useEffect(() => {
    if (eingepasst.current || !muster) return;
    eingepasst.current = true;
    ganzZeigen();
  }, [muster, ganzZeigen]);

  if (!muster || !raster) {
    return (
      <Seite
        titel="Muster ansehen und ändern"
        erklaerung="Hier ist noch kein Muster."
        fuss={
          <KnopfLink art="haupt" gross href="/schritt/bild">
            Zurück zum Bild aussuchen
          </KnopfLink>
        }
      >
        <Hinweis>
          Es wurde noch kein Muster erstellt. Gehen Sie zurück zum ersten Schritt, suchen Sie ein
          Bild aus und tippen Sie dann auf „Muster erstellen“.
        </Hinweis>
      </Seite>
    );
  }

  const breiteCm = sticheInCm(muster.breite, einstellungen.stoffzaehlung);
  const hoeheCm = sticheInCm(muster.hoehe, einstellungen.stoffzaehlung);

  return (
    <Seite
      dicht
      titel="Muster ansehen und ändern"
      erklaerung={`${muster.breite} × ${muster.hoehe} Stiche – ${cmText(breiteCm)} cm × ${cmText(hoeheCm)} cm auf Aida ${einstellungen.stoffzaehlung}`}
      fuss={
        <>
          <KnopfLink art="neben" href="/schritt/einstellungen">
            Zurück zu Größe und Farben
          </KnopfLink>
          <KnopfLink art="haupt" gross href="/schritt/drucken">
            Weiter zum Drucken
          </KnopfLink>
        </>
      }
    >
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(330px,400px)]">
        {/* Links: die Leinwand, so groß wie möglich */}
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Knopf art="neben" onClick={zoom.kleiner} disabled={!zoom.kannKleiner}>
              Kleiner
            </Knopf>
            <Knopf art="neben" onClick={zoom.groesser} disabled={!zoom.kannGroesser}>
              Größer
            </Knopf>
            <Knopf art="neben" onClick={ganzZeigen}>
              Alles zeigen
            </Knopf>
            <Knopf art="neben" onClick={() => setMitSymbolen((s) => !s)} aria-pressed={mitSymbolen}>
              Symbole {mitSymbolen ? "aus" : "an"}
            </Knopf>
          </div>

          <div
            ref={flaeche}
            className="grid min-h-0 flex-1 place-items-center overflow-auto rounded-2xl border-2 border-tinte bg-white p-3"
          >
            <Rasteransicht
              breite={muster.breite}
              hoehe={muster.hoehe}
              raster={raster}
              palette={muster.palette}
              zoom={zoom.zoom}
              mitSymbolen={mitSymbolen}
              beschriftung={`Ihr Zählmuster, ${muster.breite} mal ${muster.hoehe} Stiche`}
            />
          </div>

          {mitSymbolen && zoom.zoom < 14 ? (
            <p className="text-[1rem] text-gedaempft">
              Die Symbole erscheinen, sobald Sie das Muster größer zeigen.
            </p>
          ) : null}
        </div>

        {/* Rechts: Regler und Garnliste, für sich scrollbar */}
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          {fehler ? (
            <div className="flex flex-col gap-3">
              <Hinweis art="fehler">{fehler}</Hinweis>
              <Knopf art="neben" onClick={() => fehlerSetzen(null)}>
                Meldung schließen
              </Knopf>
            </div>
          ) : null}

          <Farbmeldung
            vorher={muster.farbenVorher}
            nachher={muster.farbenNachher}
            zusammengelegt={muster.garneZusammengelegt}
          />

          <Glaettungsregler
            stufe={einstellungen.glaettung}
            kennzahlen={muster.kennzahlen}
            laeuft={laeuft}
            onAendern={glaettungSetzen}
          />

          <section className="flex flex-col gap-3 rounded-2xl border-2 border-tinte bg-white p-5">
            <h2 className="text-[1.3rem] font-bold">Ihre Garne ({muster.palette.length})</h2>
            <Legende palette={muster.palette} />
          </section>
        </div>
      </div>
    </Seite>
  );
}

/**
 * Wenn Farben verschwunden sind, wird das in einem ganzen Satz gesagt – die
 * Nutzerin soll nicht selbst nachzählen müssen.
 */
function Farbmeldung({
  vorher,
  nachher,
  zusammengelegt,
}: {
  vorher: number;
  nachher: number;
  zusammengelegt: number;
}) {
  if (nachher >= vorher) return null;

  return (
    <Hinweis>
      Aus {vorher} Farben sind {nachher} geworden –{" "}
      {zusammengelegt > 0
        ? "einige lagen so dicht beieinander, dass es dafür dasselbe Garn gibt."
        : "beim Glätten sind einzelne ganz verschwunden."}
    </Hinweis>
  );
}
