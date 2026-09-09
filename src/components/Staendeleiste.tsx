"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Knopf } from "./Knopf";
import { Hinweis } from "./Hinweis";
import { Dialog } from "./Dialog";
import { staendeLaden, standMerken, zeitpunktText, type Stand } from "@/lib/speicher/staende";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Die gespeicherten Stände als waagerechte Leiste aus Vorschaubildern.
 *
 * Bewusst keine Liste aus Zeitstempeln und keine Versionsnummern: unter
 * jedem Bildchen steht ein Satz, wie ein Mensch ihn sagen würde
 * („Heute, 14:30 – 21 Farben"). Antippen zeigt eine große Vorschau, erst ein
 * zweiter Knopf stellt den Stand wieder her.
 */
export function Staendeleiste({
  musterId,
  aktuelleVersion,
  neuLaden,
  onWiederherstellen,
  onMerken,
  onVergleichen,
}: {
  musterId: string | null;
  aktuelleVersion: string | null;
  /** Zählt hoch, sobald ein neuer Stand gesichert wurde. */
  neuLaden: number;
  onWiederherstellen: (stand: Stand) => Promise<void>;
  onMerken: () => Promise<void>;
  /** Fehlt sie, gibt es hier nichts zu vergleichen (noch kein Muster). */
  onVergleichen?: () => void;
}) {
  // Der Schlüssel sagt, welchen Datenstand die Liste zeigt. Solange er nicht
  // zum gewünschten passt, wird noch geladen – so braucht es kein eigenes
  // Ladekennzeichen, das im Effekt gesetzt werden müsste.
  const { t, sprache } = useSprache();
  const zeit = (iso: string) => zeitpunktText(iso, sprache, t);
  const schluessel = `${musterId ?? ""}#${neuLaden}`;
  const [geladen, setGeladen] = useState<{
    schluessel: string;
    staende: Stand[];
    ging: boolean;
  } | null>(null);
  const [vorschau, setVorschau] = useState<Stand | null>(null);
  const [stelltWiederHer, setStelltWiederHer] = useState(false);
  const [merktGerade, setMerktGerade] = useState(false);

  const staende = geladen?.staende ?? [];
  const laedt = geladen?.schluessel !== schluessel;
  const gingSchief = geladen?.schluessel === schluessel && !geladen.ging;

  useEffect(() => {
    let abgebrochen = false;
    const holen = musterId ? staendeLaden(musterId) : Promise.resolve<Stand[]>([]);
    holen
      .then((liste) => {
        if (!abgebrochen) setGeladen({ schluessel, staende: liste, ging: true });
      })
      .catch(() => {
        if (!abgebrochen) setGeladen({ schluessel, staende: [], ging: false });
      });
    return () => {
      abgebrochen = true;
    };
  }, [musterId, schluessel]);

  const staendeAendern = (aendern: (liste: Stand[]) => Stand[]) =>
    setGeladen((vorher) => (vorher ? { ...vorher, staende: aendern(vorher.staende) } : vorher));

  async function merken() {
    setMerktGerade(true);
    await onMerken();
    setMerktGerade(false);
  }

  async function gemerktUmschalten(stand: Stand) {
    const neu = !stand.gemerkt;
    const geklappt = await standMerken(stand.id, neu);
    if (geklappt) {
      staendeAendern((liste) => liste.map((s) => (s.id === stand.id ? { ...s, gemerkt: neu } : s)));
      setVorschau((v) => (v && v.id === stand.id ? { ...v, gemerkt: neu } : v));
    }
  }

  async function wiederherstellen() {
    if (!vorschau) return;
    setStelltWiederHer(true);
    await onWiederherstellen(vorschau);
    setStelltWiederHer(false);
    setVorschau(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <Knopf art="neben" onClick={merken} disabled={merktGerade} className="w-full">
        {merktGerade ? t("staende.wirdGemerkt") : t("staende.merken")}
      </Knopf>

      {/* Alle Versionen als Kacheln – dafür ist die Leiste hier zu schmal,
          das braucht den ganzen Bildschirm. */}
      {onVergleichen ? (
        <Knopf art="neben" onClick={onVergleichen} disabled={staende.length === 0} className="w-full">
          {t("staende.vergleichen")}
        </Knopf>
      ) : null}

      {!musterId ? (
        <p className="text-[1.05rem] text-gedaempft">{t("staende.erklaerung")}</p>
      ) : laedt ? (
        <p className="text-[1.05rem] text-gedaempft">{t("staende.wirdGeholt")}</p>
      ) : gingSchief ? (
        <Hinweis art="fehler">{t("staende.fehlerLaden")}</Hinweis>
      ) : staende.length === 0 ? (
        <p className="text-[1.05rem] text-gedaempft">{t("staende.nochKeine")}</p>
      ) : (
        <ul className="flex gap-3 overflow-x-auto pb-2">
          {staende.map((stand) => {
            const ist = stand.id === aktuelleVersion;
            return (
              <li key={stand.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setVorschau(stand)}
                  className={`flex min-h-[56px] w-[150px] flex-col items-center gap-2 rounded-xl border p-2 ${
                    ist
                      ? "border-hauptaktion bg-gewaehlt hover:bg-gewaehlt-tief"
                      : "border-linie bg-white hover:bg-hinweis"
                  }`}
                >
                  {stand.vorschauUrl ? (
                    <Image
                      src={stand.vorschauUrl}
                      alt=""
                      width={140}
                      height={140}
                      unoptimized
                      className="raster h-[120px] w-[140px] rounded-lg border border-linie bg-hinweis object-contain"
                    />
                  ) : (
                    <span className="flex h-[120px] w-[140px] items-center justify-center rounded-lg border border-linie bg-hinweis text-[0.9rem]">
                      ohne Bild
                    </span>
                  )}
                  <span className="text-center text-[0.95rem] font-semibold leading-tight">
                    {t("staende.eintrag", {
                      zeit: zeit(stand.angelegtAm),
                      farben: String(stand.farben),
                    })}
                  </span>
                  <span className="text-center text-[0.85rem] text-gedaempft">
                    {stand.gemerkt ? t("staende.gemerkt") : t(stand.beschriftung)}
                    {ist ? t("staende.sieArbeitenHier") : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        offen={vorschau !== null}
        titel={vorschau ? t("staende.standVon", { zeit: zeit(vorschau.angelegtAm) }) : ""}
        bestaetigenText={
          stelltWiederHer ? t("allgemein.wirdGeholt") : t("staende.wiederherstellen")
        }
        abbrechenText={t("staende.schliessen")}
        onBestaetigen={wiederherstellen}
        onAbbrechen={() => setVorschau(null)}
      >
        {vorschau ? (
          <div className="flex flex-col gap-4">
            {vorschau.vorschauUrl ? (
              <Image
                src={vorschau.vorschauUrl}
                alt={t("staende.vorschauBeschriftung", { zeit: zeit(vorschau.angelegtAm) })}
                width={420}
                height={420}
                unoptimized
                className="raster mx-auto max-h-[45vh] w-auto rounded-xl border-2 border-linie bg-hinweis object-contain"
              />
            ) : null}
            <p className="text-[1.05rem]">
              {t("staende.vorschauText", {
                farben: String(vorschau.farben),
                beschriftung: t(vorschau.beschriftung),
              })}
            </p>
            <Hinweis>{t("staende.nichtsVerloren")}</Hinweis>
            <Knopf art="neben" onClick={() => gemerktUmschalten(vorschau)}>
              {vorschau.gemerkt ? t("staende.nichtMehrMerken") : t("staende.dauerhaftMerken")}
            </Knopf>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
