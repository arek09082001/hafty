"use client";

import { useEffect, useRef, useState } from "react";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Legende } from "@/components/Legende";
import { Rasteransicht, useZoom } from "@/components/Rasteransicht";
import { useMuster } from "@/lib/zustand/MusterProvider";
import { cmText, sticheInCm } from "@/lib/muster/typen";
import { blattanzahl, musterAlsPdf } from "@/lib/druck/pdf";
import { garnlaengeMeter, meterText } from "@/lib/druck/garnverbrauch";

export function MusterDrucken() {
  const { muster, raster, einstellungen, bild } = useMuster();
  const [laeuft, setLaeuft] = useState(false);
  const [fortschritt, setFortschritt] = useState<{ text: string; anteil: number } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
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
        titel="Muster drucken"
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
  const blaetter = blattanzahl(muster.breite, muster.hoehe);
  const gesamtStiche = muster.palette.reduce((s, e) => s + e.stiche, 0);
  const gesamtGarn = muster.palette.reduce(
    (s, e) => s + garnlaengeMeter(e.stiche, einstellungen.stoffzaehlung),
    0,
  );

  async function drucken() {
    if (!muster || !raster) return;
    setFehler(null);
    setLaeuft(true);
    setFortschritt({ text: "Das Muster wird vorbereitet.", anteil: 0.02 });

    try {
      const blob = await musterAlsPdf({
        name: bild?.name?.replace(/\.[a-z0-9]+$/i, "") || "Mein Muster",
        breite: muster.breite,
        hoehe: muster.hoehe,
        raster,
        palette: muster.palette,
        stoffzaehlung: einstellungen.stoffzaehlung,
        melden: (text, anteil) => setFortschritt({ text, anteil }),
      });

      const url = URL.createObjectURL(blob);
      const name = `${(bild?.name?.replace(/\.[a-z0-9]+$/i, "") || "Muster").replace(/[^\wäöüÄÖÜß -]/g, "")}.pdf`;
      setDatei({ url, name });

      // Das Fenster zum Drucken öffnet sich von selbst – so muss die
      // Nutzerin die Datei nicht erst suchen.
      window.open(url, "_blank", "noopener");
    } catch {
      setFehler(
        "Das Muster konnte nicht zum Drucken vorbereitet werden. Bitte versuchen Sie es noch einmal, und wenn es wieder nicht geht, mit weniger Stichen in der Breite.",
      );
    } finally {
      setLaeuft(false);
      setFortschritt(null);
    }
  }

  return (
    <Seite
      dicht
      titel="Muster drucken"
      erklaerung={`${muster.breite} × ${muster.hoehe} Stiche – ${cmText(breiteCm)} cm × ${cmText(hoeheCm)} cm auf Aida ${einstellungen.stoffzaehlung}`}
      fuss={
        <>
          <KnopfLink art="neben" href="/schritt/muster">
            Zurück zum Muster
          </KnopfLink>
          <Knopf art="haupt" gross onClick={drucken} disabled={laeuft}>
            {laeuft ? "Wird vorbereitet …" : "Muster drucken"}
          </Knopf>
        </>
      }
    >
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <div className="flex min-h-0 flex-col gap-3">
          <h2 className="text-[1.2rem] font-bold">So sieht die fertige Stickerei aus</h2>
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
              mitLinien={false}
              beschriftung="Vorschau der fertigen Stickerei"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          {fehler ? (
            <div className="flex flex-col gap-3">
              <Hinweis art="fehler">{fehler}</Hinweis>
              <Knopf art="neben" onClick={() => setFehler(null)}>
                Meldung schließen
              </Knopf>
            </div>
          ) : null}

          {laeuft && fortschritt ? (
            <div className="rounded-2xl border-2 border-hauptaktion bg-white p-5">
              <p className="text-[1.1rem] font-semibold">{fortschritt.text}</p>
              <div className="mt-3 h-5 w-full overflow-hidden rounded-full border-2 border-linie bg-hinweis">
                <div
                  className="h-full bg-hauptaktion transition-[width] duration-300"
                  style={{ width: `${Math.round(fortschritt.anteil * 100)}%` }}
                />
              </div>
            </div>
          ) : null}

          {datei ? (
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-hauptaktion bg-white p-5">
              <Hinweis art="erfolg">
                Das Muster ist fertig. Es hat sich ein neues Fenster geöffnet, aus dem Sie es
                ausdrucken können.
              </Hinweis>
              <a
                href={datei.url}
                download={datei.name}
                className="inline-flex min-h-[56px] items-center justify-center rounded-xl border-2 border-tinte bg-white px-6 py-3 text-[1.05rem] font-semibold hover:bg-hinweis"
              >
                Muster auf dem Gerät sichern
              </a>
              <p className="text-[1rem] text-gedaempft">
                Hat sich kein Fenster geöffnet, hat Ihr Browser es zurückgehalten. Tippen Sie dann
                auf den Knopf darüber.
              </p>
            </div>
          ) : null}

          <section className="flex flex-col gap-3 rounded-2xl border-2 border-tinte bg-white p-5">
            <h2 className="text-[1.3rem] font-bold">Das kommt aus dem Drucker</h2>
            <ul className="flex flex-col gap-2 text-[1.05rem]">
              <li>Eine Seite mit der Vorschau der fertigen Stickerei</li>
              <li>Die Garnliste mit Symbol, Nummer, Farbname, Stichzahl und Garnbedarf</li>
              <li>
                Das Muster auf {blaetter} {blaetter === 1 ? "Blatt" : "Blättern"} in Schwarzweiß
              </li>
              <li>
                Dasselbe noch einmal in Farbe, also {blaetter * 2 + 2}{" "}
                {blaetter * 2 + 2 === 1 ? "Blatt" : "Blätter"} zusammen
              </li>
            </ul>
            <p className="text-[1rem] text-gedaempft">
              Die Blätter überlappen sich um zwei Reihen. Jede zehnte Linie ist dicker, und an den
              Rändern stehen die Reihennummern.
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border-2 border-tinte bg-white p-5">
            <h2 className="text-[1.3rem] font-bold">Das brauchen Sie dafür</h2>
            <dl className="flex flex-col gap-2 text-[1.05rem]">
              <div className="flex justify-between gap-4">
                <dt>Stoff</dt>
                <dd className="text-right font-semibold">
                  Aida {einstellungen.stoffzaehlung}, mindestens{" "}
                  {cmText(breiteCm + 10)} cm × {cmText(hoeheCm + 10)} cm
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Farben</dt>
                <dd className="font-semibold">{muster.palette.length}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Stiche</dt>
                <dd className="font-semibold">{gesamtStiche.toLocaleString("de-DE")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Garn zusammen</dt>
                <dd className="font-semibold">ungefähr {meterText(gesamtGarn)}</dd>
              </div>
            </dl>
            <p className="text-[1rem] text-gedaempft">
              Der Stoff ist an jeder Seite 5 cm größer gerechnet, damit Sie die Arbeit einspannen
              können. Der Garnbedarf gilt für zwei Fäden eines Stranges.
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border-2 border-tinte bg-white p-5">
            <h2 className="text-[1.3rem] font-bold">Ihre Garne ({muster.palette.length})</h2>
            <Legende palette={muster.palette} />
          </section>
        </div>
      </div>
    </Seite>
  );
}
