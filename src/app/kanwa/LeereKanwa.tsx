"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Kopfzeile } from "@/components/Kopfzeile";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Zahlenwahl } from "@/components/Zahlenwahl";
import { useMeldungen } from "@/components/Meldungen";
import { leereKanwaAnlegen } from "@/lib/speicher/leinwand";
import { useSprache } from "@/lib/sprache/SprachProvider";
import {
  MAX_BREITE,
  MAX_FELDER,
  MIN_BREITE,
  STOFFZAEHLUNGEN,
  cmText,
  sticheInCm,
} from "@/lib/muster/typen";

/**
 * Die leere Kanwa: ein Muster ohne Foto.
 *
 * Gefragt wird nur nach dem, was sich später nicht mehr nebenbei ändern
 * lässt: wie viele Kästchen in die Breite, wie viele in die Höhe, auf
 * welchem Stoff. Alles andere – Farben, Motive, Stiche – entsteht im Editor.
 */
export function LeereKanwa() {
  const { t, zahl, landeskennung } = useSprache();
  const { melden } = useMeldungen();
  const router = useRouter();

  const [name, setName] = useState("");
  const [breite, setBreite] = useState(100);
  const [hoehe, setHoehe] = useState(100);
  const [stoffzaehlung, setStoffzaehlung] = useState(14);
  const [laeuft, setLaeuft] = useState(false);

  const zuGross = breite * hoehe > MAX_FELDER;
  const breiteCm = sticheInCm(breite, stoffzaehlung);
  const hoeheCm = sticheInCm(hoehe, stoffzaehlung);

  async function anlegen() {
    if (zuGross || laeuft) return;
    setLaeuft(true);
    const geklappt = await leereKanwaAnlegen({
      name: name.trim() || t("kanwa.ohneNamen"),
      breite,
      hoehe,
      stoffzaehlung,
    });
    if (geklappt) {
      router.push("/schritt/muster");
      return;
    }
    setLaeuft(false);
    melden(t("kanwa.fehler"), "fehler");
  }

  return (
    <>
      <Kopfzeile />
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">
        <Seite
          titel={t("kanwa.titel")}
          erklaerung={t("kanwa.erklaerung")}
          fuss={
            <>
              <KnopfLink art="neben" href="/">
                {t("kanwa.zurueck")}
              </KnopfLink>
              <Knopf art="haupt" gross onClick={anlegen} disabled={laeuft || zuGross}>
                {laeuft ? t("kanwa.wirdAngelegt") : t("kanwa.anlegen")}
              </Knopf>
            </>
          }
        >
          <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div className="flex flex-col gap-9">
              <div className="flex flex-col gap-3">
                <label htmlFor="kanwaname" className="text-[1.2rem] font-semibold">
                  {t("kanwa.name")}
                </label>
                <input
                  id="kanwaname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("kanwa.namePlatzhalter")}
                  className="min-h-[60px] max-w-[32rem] rounded-xl border-2 border-tinte bg-white px-4 text-[1.15rem]"
                />
                <p className="max-w-[60ch] text-[1rem] text-gedaempft">{t("kanwa.nameHinweis")}</p>
              </div>

              <Zahlenwahl
                beschriftung={t("kanwa.breite")}
                wert={breite}
                min={MIN_BREITE}
                max={MAX_BREITE}
                schritt={10}
                einheit={t("allgemein.stiche")}
                onAendern={setBreite}
              />

              <Zahlenwahl
                beschriftung={t("kanwa.hoehe")}
                wert={hoehe}
                min={MIN_BREITE}
                max={MAX_BREITE}
                schritt={10}
                einheit={t("allgemein.stiche")}
                onAendern={setHoehe}
              />

              <div className="flex flex-col gap-3">
                <span className="text-[1.2rem] font-semibold">{t("einst.stoff")}</span>
                <ul className="flex flex-col gap-3">
                  {STOFFZAEHLUNGEN.map((stoff) => {
                    const gewaehlt = stoffzaehlung === stoff.wert;
                    return (
                      <li key={stoff.wert}>
                        <button
                          type="button"
                          onClick={() => setStoffzaehlung(stoff.wert)}
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
                              gewaehlt
                                ? "border-hauptaktion bg-hauptaktion"
                                : "border-linie bg-white"
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
              </div>
            </div>

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

          <div className="mt-9">
            <Hinweis>{t("kanwa.hinweis")}</Hinweis>
          </div>
        </Seite>
      </main>
    </>
  );
}
