"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Zahlenwahl } from "@/components/Zahlenwahl";
import { useMuster } from "@/lib/zustand/MusterProvider";
import { useSprache } from "@/lib/sprache/SprachProvider";
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
  const { t, zahl, landeskennung } = useSprache();
  const [eigenerFehler, setEigenerFehler] = useState<string | null>(null);
  const router = useRouter();

  if (!bild) {
    return (
      <Seite
        titel={t("einst.titel")}
        erklaerung={t("einst.fehltBild")}
        fuss={
          <KnopfLink art="haupt" gross href="/schritt/bild">
            {t("einst.zurueckBildAussuchen")}
          </KnopfLink>
        }
      >
        <Hinweis>{t("einst.fehltBildText")}</Hinweis>
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
        t("einst.zuGrossGenau", {
          max: String(Math.floor(Math.sqrt(MAX_FELDER / seitenverhaeltnis))),
        }),
      );
      return;
    }
    const geklappt = await erzeugen();
    if (geklappt) router.push("/schritt/muster");
  }

  return (
    <Seite
      titel={t("einst.titel")}
      erklaerung={t("einst.erklaerung")}
      fuss={
        <>
          <KnopfLink art="neben" href="/schritt/bild">
            {t("einst.zurueckBild")}
          </KnopfLink>
          <Knopf art="haupt" gross onClick={musterErstellen} disabled={laeuft}>
            {laeuft ? t("einst.wirdBerechnet") : t("einst.musterErstellen")}
          </Knopf>
        </>
      }
    >
      <div className="flex flex-col gap-9">
        {fehler ? <Hinweis art="fehler">{t(fehler)}</Hinweis> : null}
        {eigenerFehler ? <Hinweis art="fehler">{eigenerFehler}</Hinweis> : null}

        {laeuft && fortschritt ? (
          <div className="rounded-2xl border-2 border-hauptaktion bg-white p-5">
            <p className="text-[1.15rem] font-semibold">{t(fortschritt.text)}</p>
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
              beschriftung={t("einst.breite")}
              wert={breite}
              min={MIN_BREITE}
              max={MAX_BREITE}
              schritt={10}
              einheit={t("allgemein.stiche")}
              onAendern={(v) => einstellungenSetzen({ breiteStiche: v })}
              hinweis={t("einst.breiteHinweis")}
            />

            <div className="flex flex-col gap-3">
              <span className="text-[1.2rem] font-semibold">{t("einst.stoff")}</span>
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
                        {t(stoff.titel)}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="max-w-[60ch] text-[1rem] text-gedaempft">{t("einst.stoffHinweis")}</p>
            </div>

            <Zahlenwahl
              beschriftung={t("einst.farbanzahl")}
              wert={einstellungen.farbanzahl}
              min={MIN_FARBEN}
              max={MAX_FARBEN}
              schritt={2}
              einheit={t("einst.farbenEinheit")}
              onAendern={(v) => einstellungenSetzen({ farbanzahl: v })}
              hinweis={t("einst.farbanzahlHinweis")}
            />
          </div>

          <aside className="flex flex-col gap-5 self-start rounded-2xl border-2 border-tinte bg-white p-6">
            <h2 className="text-[1.4rem] font-bold">{t("einst.soGross")}</h2>
            <p className="text-[2rem] font-bold leading-tight text-hauptaktion">
              {cmText(breiteCm, landeskennung)} cm × {cmText(hoeheCm, landeskennung)} cm
            </p>
            <dl className="flex flex-col gap-2 text-[1.05rem]">
              <div className="flex justify-between gap-4">
                <dt>{t("einst.sticheBreite")}</dt>
                <dd className="font-semibold">{breite}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>{t("einst.sticheHoehe")}</dt>
                <dd className="font-semibold">{hoehe}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>{t("einst.sticheGesamt")}</dt>
                <dd className="font-semibold">{zahl(breite * hoehe)}</dd>
              </div>
            </dl>
            <p className="text-[1rem] text-gedaempft">{t("einst.stoffZugabe")}</p>
            {zuGross ? (
              <Hinweis art="fehler">{t("einst.zuGross")}</Hinweis>
            ) : null}
          </aside>
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border-2 border-linie bg-white p-5">
          <h2 className="text-[1.3rem] font-bold">{t("einst.welcheGarne")}</h2>
          {eigeneGarne === 0 ? (
            <p className="max-w-[70ch] text-[1.05rem]">
              {t("einst.keineEigenen")}{" "}
              <Link href="/garne" className="font-semibold underline">
                {t("einst.jetztEintragen")}
              </Link>
            </p>
          ) : (
            <>
              <p className="max-w-[70ch] text-[1.05rem]">
                {t("einst.eigeneGarneText", { anzahl: zahl(eigeneGarne) })}
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
                {t("einst.nurEigene", {
                  zustand: einstellungen.nurEigeneGarne ? t("einst.ein") : t("einst.aus"),
                })}
              </button>
            </>
          )}
        </section>

        <details className="rounded-2xl border-2 border-linie bg-white p-5">
          <summary className="min-h-[56px] cursor-pointer list-none text-[1.15rem] font-semibold">
            {t("einst.verlauf")}
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            <p className="max-w-[60ch] text-[1.05rem]">{t("einst.verlaufText")}</p>
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
              {t("einst.verlaufSchalter", {
                zustand: einstellungen.dithering ? t("einst.ein") : t("einst.aus"),
              })}
            </button>
          </div>
        </details>
      </div>
    </Seite>
  );
}
