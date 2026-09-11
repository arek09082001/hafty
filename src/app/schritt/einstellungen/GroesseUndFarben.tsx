"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Zahlenwahl } from "@/components/Zahlenwahl";
import { istLeereFlaeche, useMuster } from "@/lib/zustand/MusterProvider";
import { useSprache } from "@/lib/sprache/SprachProvider";
import { useMeldungen } from "@/components/Meldungen";
import {
  MAX_BREITE,
  MAX_FARBEN,
  MAX_FELDER,
  MIN_BREITE,
  MIN_FARBEN,
  STOFFZAEHLUNGEN,
  cmText,
  farbenSchritt,
  sticheInCm,
} from "@/lib/muster/typen";

export function GroesseUndFarben() {
  const {
    bild,
    muster,
    einstellungen,
    einstellungenSetzen,
    erzeugen,
    laeuft,
    fortschritt,
    alleGarne,
  } = useMuster();
  const aufLeererFlaeche = istLeereFlaeche(muster);
  const { t, zahl, landeskennung } = useSprache();
  const { melden } = useMeldungen();
  const router = useRouter();

  if (!bild) {
    // Zwei verschiedene Lagen, und beide dürfen nicht als Fehler dastehen:
    // wer noch gar nicht angefangen hat, braucht den Weg zum Bild – wer auf
    // einer leeren Fläche arbeitet, hat hier schlicht nichts zu tun und will
    // zurück an seine Arbeit.
    return (
      <Seite
        titel={t("einst.titel")}
        erklaerung={aufLeererFlaeche ? t("einst.leereFlaeche") : t("einst.fehltBild")}
        fuss={
          <KnopfLink
            art="haupt"
            gross
            href={aufLeererFlaeche ? "/schritt/muster" : "/schritt/bild"}
          >
            {aufLeererFlaeche ? t("einst.zurueckFlaeche") : t("einst.zurueckBildAussuchen")}
          </KnopfLink>
        }
      >
        <Hinweis>
          {aufLeererFlaeche ? t("einst.leereFlaecheText") : t("einst.fehltBildText")}
        </Hinweis>
      </Seite>
    );
  }

  // Aus dem **Ausschnitt**, nicht aus dem ganzen Bild: gestickt wird nur der
  // gewählte Teil, also richtet sich die Höhe des Musters auch danach.
  const seitenverhaeltnis = bild.ausschnitt.hoehe / bild.ausschnitt.breite;
  const breite = einstellungen.breiteStiche;
  const hoehe = Math.max(1, Math.round(breite * seitenverhaeltnis));
  const zuGross = breite * hoehe > MAX_FELDER;

  const eigeneGarne = alleGarne.filter((g) => g.imVorrat).length;
  const breiteCm = sticheInCm(breite, einstellungen.stoffzaehlung);
  const hoeheCm = sticheInCm(hoehe, einstellungen.stoffzaehlung);

  async function musterErstellen() {
    if (zuGross) {
      melden(
        t("einst.zuGrossGenau", {
          max: String(Math.floor(Math.sqrt(MAX_FELDER / seitenverhaeltnis))),
        }),
        "fehler",
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
        {laeuft && fortschritt ? (
          <div className="border-l-[6px] border-hauptaktion bg-gewaehlt px-4 py-3">
            {/* Zwei Zeilen fest: die Meldungen sind verschieden lang, und
                während des Rechnens wechseln sie im Sekundentakt. Ohne
                festen Platz hüpfte alles darunter bei jeder Meldung. */}
            <p className="flex min-h-[3rem] items-center text-[1.15rem] font-semibold">
              {t(fortschritt.text)}
            </p>
            <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-white">
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
              id="breite-stiche"
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
                        className={`flex min-h-[56px] w-full items-center gap-4 rounded-xl border px-5 py-3 text-left text-[1.1rem] font-semibold ${
                          gewaehlt
                            ? "border-hauptaktion bg-gewaehlt hover:bg-gewaehlt-tief"
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
              id="anzahl-farben"
              beschriftung={t("einst.farbanzahl")}
              wert={einstellungen.farbanzahl}
              min={MIN_FARBEN}
              max={MAX_FARBEN}
              schritt={farbenSchritt}
              einheit={t("einst.farbenEinheit")}
              onAendern={(v) => einstellungenSetzen({ farbanzahl: v })}
              hinweis={t("einst.farbanzahlHinweis")}
            />
          </div>

          {/* Die Zusammenfassung ist der einzige getönte Block auf dieser
              Seite. Sie war eine Karte mit 2px-Rahmen wie alles andere und
              ging darin unter; jetzt hebt der Ton sie heraus, ohne dass ein
              weiterer Rahmen dazukommt. */}
          <aside className="flex flex-col gap-4 self-start bg-hinweis p-6">
            <h2 className="text-[1.3rem] font-bold">{t("einst.soGross")}</h2>
            <p className="text-[1.8rem] font-bold whitespace-nowrap text-hauptaktion">
              {cmText(breiteCm, landeskennung)} cm × {cmText(hoeheCm, landeskennung)} cm
            </p>
            <dl className="flex flex-col text-[1.05rem]">
              <div className="flex justify-between gap-4 border-t border-linie py-2">
                <dt>{t("einst.sticheBreite")}</dt>
                <dd className="font-semibold">{breite}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-linie py-2">
                <dt>{t("einst.sticheHoehe")}</dt>
                <dd className="font-semibold">{hoehe}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-linie py-2">
                <dt>{t("einst.sticheGesamt")}</dt>
                <dd className="font-semibold">{zahl(breite * hoehe)}</dd>
              </div>
            </dl>
            <p className="text-[1rem] text-gedaempft">{t("einst.stoffZugabe")}</p>
            {zuGross ? <Hinweis art="fehler">{t("einst.zuGross")}</Hinweis> : null}
          </aside>
        </div>

        <section className="flex flex-col gap-4 border-t border-linie pt-7">
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
                    ? "border-hauptaktion bg-gewaehlt hover:bg-gewaehlt-tief"
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
      </div>
    </Seite>
  );
}
