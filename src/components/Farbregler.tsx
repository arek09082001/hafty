"use client";

import { useEffect, useRef, useState } from "react";
import { Knopf } from "./Knopf";
import {
  FARBMARKEN,
  FARBREGLER_MAX,
  MAX_FARBEN,
  MIN_FARBEN,
  farbanzahlAusRegler,
  farbanzahlBegrenzen,
  farbenSchritt,
  reglerAusFarbanzahl,
} from "@/lib/muster/typen";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Der Regler für die Anzahl der Farben.
 *
 * Die Farbzahl stand bisher nur in Schritt 2. Das war die falsche Stelle:
 * ob zwanzig Farben zu viel oder zu wenig sind, sieht man erst am fertigen
 * Muster – und dann müsste man zurückgehen, neu rechnen lassen und die
 * eigenen Stiche verlieren. Hier steht sie neben dem Glättungsregler, wo
 * auch sonst über das Muster als Ganzes entschieden wird.
 *
 * Bedient wird sie auf beide Arten, weil beide gebraucht werden: der Regler,
 * um schnell durch den ganzen Bereich zu fahren und zu sehen, wo das Muster
 * kippt, und die beiden Knöpfe, um sich am Ende an die richtige Zahl
 * heranzutasten. Auf einem Tablet mit unruhiger Hand sind die Knöpfe oft der
 * einzige Weg, überhaupt eine bestimmte Zahl zu erwischen.
 *
 * Der Regler hat eine gekrümmte Skala (siehe `farbanzahlAusRegler`), sonst
 * läge der ganze Bereich unter 40 Farben in den ersten Millimetern. Die
 * Knöpfe gehen in denselben Stufen wie die Zahlenwahl in Schritt 2.
 *
 * Wie beim Glättungsregler geht der Wert erst kurz nach dem letzten Zug
 * hinaus – ein neues k-Means bei jedem Bildpunkt wäre sinnlos. Der Regler
 * selbst bleibt dabei immer bedienbar.
 */

/** So lange nach dem letzten Zug wird gewartet, bevor gerechnet wird. */
const VERZOEGERUNG = 200;

export function Farbregler({
  farbanzahl,
  imMuster,
  laeuft,
  onAendern,
}: {
  /** Die gewünschte Zahl – die Reglerstellung. */
  farbanzahl: number;
  /** Wie viele Farben im gerechneten Muster wirklich vorkommen. */
  imMuster: number;
  laeuft: boolean;
  onAendern: (anzahl: number) => void;
}) {
  const { t, zahl } = useSprache();
  const [gezeigt, setGezeigt] = useState(farbanzahl);
  /** Der zuletzt hinausgegebene Wert – daran hängt, ob von außen kam, was kommt. */
  const gesendet = useRef(farbanzahl);
  const uhr = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Von außen geändert (ein wiederhergestellter Stand zum Beispiel): dann
  // zieht der Regler nach.
  useEffect(() => {
    if (farbanzahl !== gesendet.current) {
      gesendet.current = farbanzahl;
      setGezeigt(farbanzahl);
    }
  }, [farbanzahl]);

  useEffect(() => () => {
    if (uhr.current) clearTimeout(uhr.current);
  }, []);

  function schieben(wert: number) {
    const neu = farbanzahlBegrenzen(wert);
    if (neu === gezeigt) return;
    setGezeigt(neu);
    if (uhr.current) clearTimeout(uhr.current);
    uhr.current = setTimeout(() => {
      uhr.current = null;
      gesendet.current = neu;
      onAendern(neu);
    }, VERZOEGERUNG);
  }

  // Solange der zuletzt geschobene Wert noch nicht gerechnet ist, gehört die
  // Zahl unten zu einem anderen Muster – dann steht dort nur „…".
  const wartet = laeuft || gezeigt !== farbanzahl;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[1rem] text-gedaempft">{t("farben.erklaerung")}</p>

      <label htmlFor="farbanzahl" className="text-[1.3rem] font-bold text-hauptaktion">
        {t("farben.gewuenscht", { anzahl: zahl(gezeigt) })}
      </label>

      {/* Der Regler steht auf 0..100 und nicht auf der Farbzahl selbst –
          dazwischen liegt die gekrümmte Skala. `aria-valuetext` sagt der
          Vorlesesoftware trotzdem die Farbzahl an und nicht die Stellung. */}
      <input
        id="farbanzahl"
        type="range"
        min={0}
        max={FARBREGLER_MAX}
        step={1}
        value={reglerAusFarbanzahl(gezeigt)}
        onChange={(e) => schieben(farbanzahlAusRegler(Number(e.target.value)))}
        aria-valuetext={t("farben.gewuenscht", { anzahl: zahl(gezeigt) })}
        aria-busy={wartet}
        list="farbmarken"
      />
      <datalist id="farbmarken">
        {FARBMARKEN.map((marke) => (
          <option key={marke} value={reglerAusFarbanzahl(marke)} label={String(marke)} />
        ))}
      </datalist>

      {/* Der Zähler für die letzte Feineinstellung. Dieselben Knöpfe wie in
          Schritt 2, damit niemand zweierlei lernen muss – aber in einem
          Raster statt nebeneinander: die Spalte im Editor ist schmal, und
          umbrechende Knöpfe hätten „Mehr" allein in die nächste Zeile
          gesetzt. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Knopf
          art="neben"
          className="px-3"
          onClick={() => schieben(gezeigt - farbenSchritt(gezeigt - 1))}
          disabled={gezeigt <= MIN_FARBEN}
          aria-label={t("einst.wenigerVon", { was: t("einst.farbanzahl") })}
        >
          {t("einst.weniger")}
        </Knopf>
        <output className="min-w-[96px] rounded-xl border-2 border-tinte bg-white px-3 py-3 text-center text-[1.5rem] font-bold tabular-nums">
          {gezeigt}
        </output>
        <Knopf
          art="neben"
          className="px-3"
          onClick={() => schieben(gezeigt + farbenSchritt(gezeigt))}
          disabled={gezeigt >= MAX_FARBEN}
          aria-label={t("einst.mehrVon", { was: t("einst.farbanzahl") })}
        >
          {t("einst.mehr")}
        </Knopf>
      </div>

      {/* Gewünscht und tatsächlich sind zweierlei: Flächen können bei der
          Glättung ganz verschwinden, und ohne passendes Garn fallen zwei
          Töne doch zusammen. */}
      <dl className="mt-2 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4 border-t border-linie pt-3">
          <dt className="text-[1.05rem]">
            {t("farben.imMuster")}
            <span className="block text-[0.95rem] text-gedaempft">{t("farben.imMusterText")}</span>
          </dt>
          <dd className="shrink-0 text-[1.6rem] font-bold leading-none">
            {wartet ? "…" : zahl(imMuster)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
