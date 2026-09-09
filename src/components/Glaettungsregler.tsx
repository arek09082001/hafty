"use client";

import { useEffect, useRef, useState } from "react";
import {
  GLAETTUNGSMARKEN,
  GLAETTUNG_MAX,
  GLAETTUNG_MIN,
  glaettungTitel,
  glaettungsKante,
  type Kennzahlen,
} from "@/lib/muster/typen";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Der Schieberegler für die Glättung.
 *
 * Er hatte fünf Rastpunkte und sprang von einem zum nächsten. Das war zu
 * grob: zwischen „detailliert" und „ausgewogen" lag ein ganzes Muster
 * Unterschied, und dazwischen kam man nicht. Jetzt läuft er stufenlos von
 * ganz links – jedes Kästchen darf seine eigene Farbe haben – bis ganz
 * rechts, wo im Schnitt eine Farbe für 10 × 10 Kästchen steht.
 *
 * In der Oberfläche taucht die Zahl dahinter nirgends auf, sie sagt der
 * Nutzerin nichts. Stattdessen stehen dort drei Angaben, die sich beim
 * Schieben sofort mitbewegen: die Beschriftung in ganzen Worten, wie groß
 * die kleinste Fläche dann ungefähr ist, und die beiden Zahlen des fertig
 * gerechneten Musters.
 *
 * Während des Ziehens wird nicht bei jedem Bildpunkt neu gerechnet: der Wert
 * geht erst kurz nach dem letzten Zug hinaus. Der Regler selbst bleibt dabei
 * immer bedienbar – ihn währenddessen zu sperren risse die Nutzerin mitten
 * aus der Bewegung.
 */

/** So lange nach dem letzten Zug wird gewartet, bevor gerechnet wird. */
const VERZOEGERUNG = 120;

export function Glaettungsregler({
  staerke,
  kennzahlen,
  laeuft,
  onAendern,
}: {
  staerke: number;
  kennzahlen: Kennzahlen;
  laeuft: boolean;
  onAendern: (staerke: number) => void;
}) {
  const { t, zahl } = useSprache();
  const [gezeigt, setGezeigt] = useState(staerke);
  /** Der zuletzt hinausgegebene Wert – daran hängt, ob von außen kam, was kommt. */
  const gesendet = useRef(staerke);
  const uhr = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Von außen geändert (ein wiederhergestellter Stand zum Beispiel): dann
  // zieht der Regler nach. Die eigene Änderung erkennt er daran, dass sie
  // genau die ist, die er gerade selbst geschickt hat.
  useEffect(() => {
    if (staerke !== gesendet.current) {
      gesendet.current = staerke;
      setGezeigt(staerke);
    }
  }, [staerke]);

  useEffect(() => () => {
    if (uhr.current) clearTimeout(uhr.current);
  }, []);

  function schieben(wert: number) {
    setGezeigt(wert);
    if (uhr.current) clearTimeout(uhr.current);
    uhr.current = setTimeout(() => {
      uhr.current = null;
      gesendet.current = wert;
      onAendern(wert);
    }, VERZOEGERUNG);
  }

  const titel = glaettungTitel(gezeigt);
  const kante = glaettungsKante(gezeigt);
  // Solange der zuletzt geschobene Wert noch nicht gerechnet ist, gehören die
  // beiden Zahlen unten zu einem anderen Muster – dann steht dort nur „…".
  const wartet = laeuft || gezeigt !== staerke;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[1rem] text-gedaempft">{t("glaettung.erklaerung")}</p>

      <label htmlFor="glaettung" className="text-[1.3rem] font-bold text-hauptaktion">
        {t(titel)}
      </label>

      <input
        id="glaettung"
        type="range"
        min={GLAETTUNG_MIN}
        max={GLAETTUNG_MAX}
        step={1}
        value={gezeigt}
        onChange={(e) => schieben(Number(e.target.value))}
        aria-valuetext={t(titel)}
        aria-busy={wartet}
        list="glaettungsmarken"
      />
      <datalist id="glaettungsmarken">
        {GLAETTUNGSMARKEN.map((marke) => (
          <option key={marke} value={marke} label={t(glaettungTitel(marke))} />
        ))}
      </datalist>

      <div className="flex justify-between gap-4 text-[0.95rem] text-gedaempft">
        <span>{t("glaettung.stufe0")}</span>
        <span className="text-right">{t("glaettung.stufe4")}</span>
      </div>

      {/* Was die Reglerstellung für das Sticken heißt, in Kästchen gesagt. */}
      <p aria-live="polite" className="text-[1.05rem]">
        {kante <= 1
          ? t("glaettung.flaecheFrei")
          : t("glaettung.flaeche", { kante: String(kante) })}
      </p>

      {/* Die beiden Zahlen sagen, was der Regler bewirkt hat. Sie standen
          bisher in zwei gerahmten Kästen; als schlichte Zeilen mit einer
          Trennlinie lesen sie sich schneller und tragen nicht auf. */}
      <dl className="mt-2 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4 border-t border-linie pt-3">
          <dt className="text-[1.05rem]">
            {t("glaettung.einzelstiche")}
            <span className="block text-[0.95rem] text-gedaempft">
              {t("glaettung.einzelsticheText")}
            </span>
          </dt>
          <dd className="shrink-0 text-[1.6rem] font-bold leading-none">
            {wartet ? "…" : zahl(kennzahlen.einzelstiche)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-linie pt-3">
          <dt className="text-[1.05rem]">
            {t("glaettung.farbwechsel")}
            <span className="block text-[0.95rem] text-gedaempft">
              {t("glaettung.farbwechselText")}
            </span>
          </dt>
          <dd className="shrink-0 text-[1.6rem] font-bold leading-none">
            {wartet ? "…" : zahl(kennzahlen.farbwechselProReihe)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
