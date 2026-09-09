"use client";

import { useEffect, useRef, useState } from "react";
import {
  GLAETTUNGSMARKEN,
  GLAETTUNG_MAX,
  GLAETTUNG_MIN,
  glaettungTitel,
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
 * Nutzerin nichts. Stattdessen steht dort die Stellung in ganzen Worten.
 *
 * Sonst steht dort nichts mehr. Unter dem Regler standen einmal ein
 * Absatz Erklärung, die ungefähre Größe der kleinsten Fläche und zwei
 * Kennzahlen des gerechneten Musters – zusammen mehr Text als Bedienung,
 * und auf einem Telefon war der zweite Regler dahinter kaum noch zu
 * erreichen. Was der Regler tut, sieht man am Muster daneben; dafür ist es
 * schließlich da.
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
  laeuft,
  onAendern,
}: {
  staerke: number;
  laeuft: boolean;
  onAendern: (staerke: number) => void;
}) {
  const { t } = useSprache();
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
  /** Solange gerechnet wird, gehört das Muster daneben noch zur alten Stellung. */
  const wartet = laeuft || gezeigt !== staerke;

  return (
    <div className="flex flex-col gap-3">
      {/* Zwei Zeilen sind fest reserviert. Die Stufennamen sind verschieden
          lang – „ausgewogen" braucht eine Zeile, „ruhig und einfach zu
          sticken" auf einem schmalen Fenster zwei. Ohne festen Platz sprang
          der Regler beim Ziehen unter dem Finger weg. */}
      <label
        htmlFor="glaettung"
        className="flex min-h-[3.2rem] items-end text-[1.3rem] font-bold text-hauptaktion"
      >
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

      <div className="flex items-start justify-between gap-4 text-[0.95rem] text-gedaempft">
        <span className="basis-0 grow">{t("glaettung.stufe0")}</span>
        <span className="basis-0 grow text-right">{t("glaettung.stufe4")}</span>
      </div>
    </div>
  );
}
