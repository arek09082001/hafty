"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Zahlenwahl } from "@/components/Zahlenwahl";
import { useMuster } from "@/lib/zustand/MusterProvider";
import {
  MAX_BREITE,
  MAX_FARBEN,
  MAX_FELDER,
  MIN_BREITE,
  MIN_FARBEN,
  STOFFZAEHLUNGEN,
  cmText,
  sticheInCm,
} from "@/lib/muster/typen";

export function GroesseUndFarben() {
  const { bild, einstellungen, einstellungenSetzen, erzeugen, laeuft, fortschritt, fehler, alleGarne } =
    useMuster();
  const [eigenerFehler, setEigenerFehler] = useState<string | null>(null);
  const router = useRouter();

  if (!bild) {
    return (
      <Seite
        titel="Größe und Farben"
        erklaerung="Für diesen Schritt fehlt noch das Bild."
        fuss={
          <KnopfLink art="haupt" gross href="/schritt/bild">
            Zurück zum Bild aussuchen
          </KnopfLink>
        }
      >
        <Hinweis>
          Sie haben noch kein Bild ausgesucht. Gehen Sie einen Schritt zurück und wählen Sie ein Foto
          oder ein Beispielbild aus.
        </Hinweis>
      </Seite>
    );
  }

  const seitenverhaeltnis = bild.masse.hoehe / bild.masse.breite;
  const breite = einstellungen.breiteStiche;
  const hoehe = Math.max(1, Math.round(breite * seitenverhaeltnis));
  const zuGross = breite * hoehe > MAX_FELDER;

  const eigeneGarne = alleGarne.filter((g) => g.imVorrat).length;
  const breiteCm = sticheInCm(breite, einstellungen.stoffzaehlung);
  const hoeheCm = sticheInCm(hoehe, einstellungen.stoffzaehlung);

  async function musterErstellen() {
    setEigenerFehler(null);
    if (zuGross) {
      setEigenerFehler(
        `So groß kann das Muster nicht werden. Bitte stellen Sie die Breite auf höchstens ${Math.floor(
          Math.sqrt(MAX_FELDER / seitenverhaeltnis),
        )} Stiche ein.`,
      );
      return;
    }
    const geklappt = await erzeugen();
    if (geklappt) router.push("/schritt/muster");
  }

  return (
    <Seite
      titel="Größe und Farben"
      erklaerung="Wie breit soll das Muster werden, auf welchem Stoff sticken Sie und wie viele Farben darf es haben? Die fertige Größe sehen Sie unten sofort in Zentimetern."
      fuss={
        <>
          <KnopfLink art="neben" href="/schritt/bild">
            Zurück zum Bild
          </KnopfLink>
          <Knopf art="haupt" gross onClick={musterErstellen} disabled={laeuft}>
            {laeuft ? "Das Muster wird berechnet …" : "Muster erstellen"}
          </Knopf>
        </>
      }
    >
      <div className="flex flex-col gap-9">
        {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}
        {eigenerFehler ? <Hinweis art="fehler">{eigenerFehler}</Hinweis> : null}

        {laeuft && fortschritt ? (
          <div className="rounded-2xl border-2 border-hauptaktion bg-white p-5">
            <p className="text-[1.15rem] font-semibold">{fortschritt.text}</p>
            <div className="mt-3 h-5 w-full overflow-hidden rounded-full border-2 border-linie bg-hinweis">
              <div
                className="h-full bg-hauptaktion transition-[width] duration-300"
                style={{ width: `${Math.round(fortschritt.anteil * 100)}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="flex flex-col gap-9">
            <Zahlenwahl
              beschriftung="Breite des Musters"
              wert={breite}
              min={MIN_BREITE}
              max={MAX_BREITE}
              schritt={10}
              einheit="Stiche"
              onAendern={(v) => einstellungenSetzen({ breiteStiche: v })}
              hinweis="Wie viele Kreuze soll das Muster in der Breite haben? Die Höhe ergibt sich aus dem Bild von selbst."
            />

            <div className="flex flex-col gap-3">
              <span className="text-[1.2rem] font-semibold">Ihr Stoff</span>
              <ul className="flex flex-col gap-3">
                {STOFFZAEHLUNGEN.map((stoff) => {
                  const gewaehlt = einstellungen.stoffzaehlung === stoff.wert;
                  return (
                    <li key={stoff.wert}>
                      <button
                        type="button"
                        onClick={() => einstellungenSetzen({ stoffzaehlung: stoff.wert })}
                        aria-pressed={gewaehlt}
                        className={`flex min-h-[56px] w-full items-center gap-4 rounded-xl border-2 px-5 py-3 text-left text-[1.1rem] font-semibold ${
                          gewaehlt
                            ? "border-hauptaktion bg-[#e8f3ee]"
                            : "border-linie bg-white hover:bg-hinweis"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                            gewaehlt ? "border-hauptaktion bg-hauptaktion" : "border-linie bg-white"
                          }`}
                        >
                          {gewaehlt ? <span className="h-3 w-3 rounded-full bg-white" /> : null}
                        </span>
                        {stoff.titel}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="max-w-[60ch] text-[1rem] text-gedaempft">
                Die Zahl steht auf der Stoffbanderole. Sie sagt, wie viele Kreuze auf einen Zoll
                passen – je höher die Zahl, desto feiner das Bild und desto kleiner das Ergebnis.
              </p>
            </div>

            <Zahlenwahl
              beschriftung="Anzahl der Farben"
              wert={einstellungen.farbanzahl}
              min={MIN_FARBEN}
              max={MAX_FARBEN}
              schritt={2}
              einheit="Farben"
              onAendern={(v) => einstellungenSetzen({ farbanzahl: v })}
              hinweis="Weniger Farben bedeuten weniger Garne zu kaufen und weniger Wechsel beim Sticken. Mehr Farben geben das Foto genauer wieder."
            />
          </div>

          <aside className="flex flex-col gap-5 self-start rounded-2xl border-2 border-tinte bg-white p-6">
            <h2 className="text-[1.4rem] font-bold">So groß wird Ihre Stickerei</h2>
            <p className="text-[2rem] font-bold leading-tight text-hauptaktion">
              {cmText(breiteCm)} cm × {cmText(hoeheCm)} cm
            </p>
            <dl className="flex flex-col gap-2 text-[1.05rem]">
              <div className="flex justify-between gap-4">
                <dt>Stiche in der Breite</dt>
                <dd className="font-semibold">{breite}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Stiche in der Höhe</dt>
                <dd className="font-semibold">{hoehe}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Stiche gesamt</dt>
                <dd className="font-semibold">{(breite * hoehe).toLocaleString("de-DE")}</dd>
              </div>
            </dl>
            <p className="text-[1rem] text-gedaempft">
              Rechnen Sie an jeder Seite noch etwa 5 cm Stoff dazu, damit Sie die Arbeit einspannen
              können.
            </p>
            {zuGross ? (
              <Hinweis art="fehler">
                So groß kann das Muster nicht werden. Bitte stellen Sie die Breite kleiner ein.
              </Hinweis>
            ) : null}
          </aside>
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border-2 border-linie bg-white p-5">
          <h2 className="text-[1.3rem] font-bold">Welche Garne sollen verwendet werden?</h2>
          {eigeneGarne === 0 ? (
            <p className="max-w-[70ch] text-[1.05rem]">
              Sie haben noch nicht eingetragen, welche Garne Sie zu Hause haben. Das Muster wird
              deshalb aus allen Farben zusammengestellt.{" "}
              <Link href="/garne" className="font-semibold underline">
                Jetzt meine Garne eintragen
              </Link>
            </p>
          ) : (
            <>
              <p className="max-w-[70ch] text-[1.05rem]">
                Sie haben {eigeneGarne} {eigeneGarne === 1 ? "Garn" : "Garne"} zu Hause. Wenn Sie
                das einschalten, wird das Muster nur aus diesen Garnen zusammengestellt – dann
                müssen Sie nichts nachkaufen.
              </p>
              <button
                type="button"
                onClick={() => einstellungenSetzen({ nurEigeneGarne: !einstellungen.nurEigeneGarne })}
                aria-pressed={einstellungen.nurEigeneGarne}
                className={`flex min-h-[56px] items-center gap-4 self-start rounded-xl border-2 px-5 py-3 text-[1.1rem] font-semibold ${
                  einstellungen.nurEigeneGarne
                    ? "border-hauptaktion bg-[#e8f3ee]"
                    : "border-linie bg-white hover:bg-hinweis"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-8 w-14 shrink-0 items-center rounded-full border-2 p-1 ${
                    einstellungen.nurEigeneGarne
                      ? "border-hauptaktion bg-hauptaktion"
                      : "border-linie bg-white"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full ${
                      einstellungen.nurEigeneGarne ? "ml-auto bg-white" : "bg-linie"
                    }`}
                  />
                </span>
                Nur meine Garne verwenden: {einstellungen.nurEigeneGarne ? "ein" : "aus"}
              </button>
            </>
          )}
        </section>

        <details className="rounded-2xl border-2 border-linie bg-white p-5">
          <summary className="min-h-[56px] cursor-pointer list-none text-[1.15rem] font-semibold">
            Selten gebraucht: Farbverlauf nachahmen
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <p className="max-w-[60ch] text-[1.05rem]">
              Wenn Sie das einschalten, werden zwei Farben abwechselnd nebeneinandergesetzt, damit
              ein Verlauf weicher aussieht. Auf dem Bildschirm wirkt das gut, beim Sticken bedeutet
              es aber viele einzelne Stiche. Deshalb ist es normalerweise ausgeschaltet.
            </p>
            <button
              type="button"
              onClick={() => einstellungenSetzen({ dithering: !einstellungen.dithering })}
              aria-pressed={einstellungen.dithering}
              className={`flex min-h-[56px] items-center gap-4 self-start rounded-xl border-2 px-5 py-3 text-[1.1rem] font-semibold ${
                einstellungen.dithering
                  ? "border-hauptaktion bg-[#e8f3ee]"
                  : "border-linie bg-white hover:bg-hinweis"
              }`}
            >
              <span
                aria-hidden
                className={`flex h-8 w-14 shrink-0 items-center rounded-full border-2 p-1 ${
                  einstellungen.dithering ? "border-hauptaktion bg-hauptaktion" : "border-linie bg-white"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full ${
                    einstellungen.dithering ? "ml-auto bg-white" : "bg-linie"
                  }`}
                />
              </span>
              Farbverlauf nachahmen: {einstellungen.dithering ? "ein" : "aus"}
            </button>
          </div>
        </details>
      </div>
    </Seite>
  );
}
