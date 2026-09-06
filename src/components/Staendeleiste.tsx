"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Knopf } from "./Knopf";
import { Hinweis } from "./Hinweis";
import { Dialog } from "./Dialog";
import {
  staendeLaden,
  standMerken,
  zeitpunktText,
  type Stand,
} from "@/lib/speicher/staende";

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
}: {
  musterId: string | null;
  aktuelleVersion: string | null;
  /** Zählt hoch, sobald ein neuer Stand gesichert wurde. */
  neuLaden: number;
  onWiederherstellen: (stand: Stand) => Promise<void>;
  onMerken: () => Promise<void>;
}) {
  // Der Schlüssel sagt, welchen Datenstand die Liste zeigt. Solange er nicht
  // zum gewünschten passt, wird noch geladen – so braucht es kein eigenes
  // Ladekennzeichen, das im Effekt gesetzt werden müsste.
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
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-tinte bg-white p-5">
      <h2 className="text-[1.3rem] font-bold">Frühere Stände</h2>

      <Knopf art="neben" onClick={merken} disabled={merktGerade}>
        {merktGerade ? "Wird gemerkt …" : "Diesen Stand merken"}
      </Knopf>

      {!musterId ? (
        <p className="text-[1.05rem] text-gedaempft">
          Sobald Sie etwas am Muster ändern, wird der Stand von selbst gesichert. Hier sehen Sie
          dann alle früheren Stände und können jederzeit dorthin zurück.
        </p>
      ) : laedt ? (
        <p className="text-[1.05rem] text-gedaempft">Die Stände werden geholt …</p>
      ) : gingSchief ? (
        <Hinweis art="fehler">
          Die früheren Stände konnten nicht geholt werden. Bitte prüfen Sie Ihre
          Internetverbindung. Ihre Arbeit auf dem Bildschirm bleibt davon unberührt.
        </Hinweis>
      ) : staende.length === 0 ? (
        <p className="text-[1.05rem] text-gedaempft">Noch keine früheren Stände.</p>
      ) : (
        <ul className="flex gap-3 overflow-x-auto pb-2">
          {staende.map((stand) => {
            const ist = stand.id === aktuelleVersion;
            return (
              <li key={stand.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setVorschau(stand)}
                  className={`flex min-h-[56px] w-[160px] flex-col items-center gap-2 rounded-xl border-2 p-2 ${
                    ist ? "border-hauptaktion bg-[#e8f3ee]" : "border-linie bg-white hover:bg-hinweis"
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
                    {zeitpunktText(stand.angelegtAm)} – {stand.farben} Farben
                  </span>
                  <span className="text-center text-[0.85rem] text-gedaempft">
                    {stand.gemerkt ? "Gemerkt" : stand.beschriftung}
                    {ist ? " · Sie arbeiten hier" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        offen={vorschau !== null}
        titel={vorschau ? `Stand von ${zeitpunktText(vorschau.angelegtAm)}` : ""}
        bestaetigenText={stelltWiederHer ? "Wird geholt …" : "Diesen Stand wiederherstellen"}
        abbrechenText="Schließen"
        onBestaetigen={wiederherstellen}
        onAbbrechen={() => setVorschau(null)}
      >
        {vorschau ? (
          <div className="flex flex-col gap-4">
            {vorschau.vorschauUrl ? (
              <Image
                src={vorschau.vorschauUrl}
                alt={`Vorschau des Standes von ${zeitpunktText(vorschau.angelegtAm)}`}
                width={420}
                height={420}
                unoptimized
                className="raster mx-auto max-h-[45vh] w-auto rounded-xl border-2 border-linie bg-hinweis object-contain"
              />
            ) : null}
            <p className="text-[1.05rem]">
              {vorschau.farben} Farben. {vorschau.beschriftung}
            </p>
            <Hinweis>
              Wenn Sie diesen Stand wiederherstellen, geht Ihre neuere Arbeit nicht verloren – sie
              bleibt als eigener Stand in dieser Leiste stehen.
            </Hinweis>
            <Knopf art="neben" onClick={() => gemerktUmschalten(vorschau)}>
              {vorschau.gemerkt ? "Nicht mehr merken" : "Diesen Stand dauerhaft merken"}
            </Knopf>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}
