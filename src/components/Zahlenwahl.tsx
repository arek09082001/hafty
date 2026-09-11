"use client";

import { useId, useState } from "react";
import { Knopf } from "./Knopf";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Eine Zahl einstellen – mit zwei großen Knöpfen **und** einem Eingabefeld.
 *
 * Die Knöpfe sind für das Tablet: ein Drehfeld mit winzigen Pfeilen ist dort
 * nicht zu treffen, „Weniger“ und „Mehr“ immer. Nur führten die Knöpfe allein
 * in die Irre, sobald der Weg weit ist: von 120 auf 400 Stiche sind es
 * achtundzwanzig Tipps, und wer die Zahl schon kennt, will sie hinschreiben.
 *
 * Deshalb steht die Zahl jetzt in einem Feld, in das man sie auch tippen kann.
 * Übernommen wird sie beim Verlassen des Feldes und bei der Eingabetaste;
 * während des Tippens bleibt stehen, was geschrieben wurde – sonst würde aus
 * einer gerade erst halb getippten „12“ sofort die 20 der Untergrenze, und
 * die zweite Ziffer liefe ins Leere.
 *
 * `schritt` darf auch eine Funktion sein. Das wird bei einem weiten Bereich
 * gebraucht: bei der Farbanzahl reicht unten die feine Stufe, oben käme man
 * damit nie an. Beim Zurückgehen zählt die Stufe des **Zielbereichs** – sonst
 * landete „Weniger“ nach „Mehr“ nicht wieder auf demselben Wert.
 */
export function Zahlenwahl({
  beschriftung,
  wert,
  min,
  max,
  schritt = 1,
  einheit,
  onAendern,
  hinweis,
}: {
  beschriftung: string;
  wert: number;
  min: number;
  max: number;
  schritt?: number | ((wert: number) => number);
  einheit: string;
  onAendern: (neu: number) => void;
  hinweis?: string;
}) {
  const { t } = useSprache();
  const feldId = useId();
  const begrenzen = (v: number) => Math.max(min, Math.min(max, v));
  const stufe = (v: number) => (typeof schritt === "function" ? schritt(v) : schritt);

  /** Was im Feld steht, solange getippt wird. */
  const [getippt, setGetippt] = useState(String(wert));
  /** Der Wert, auf den das Feld zuletzt eingestellt wurde. */
  const [zuletzt, setZuletzt] = useState(wert);

  // Kommt der Wert von außen – ein Tipp auf „Mehr“, ein geladener Stand –,
  // dann steht er auch im Feld. Beim Zeichnen und nicht in einem Effekt:
  // so gibt es kein Bild, in dem kurz noch die alte Zahl steht.
  if (zuletzt !== wert) {
    setZuletzt(wert);
    setGetippt(String(wert));
  }

  /** Das Getippte übernehmen. Unsinn fällt auf den bisherigen Wert zurück. */
  const uebernehmen = () => {
    const gelesen = Number.parseInt(getippt.replace(/[^\d-]/g, ""), 10);
    if (!Number.isFinite(gelesen)) {
      setGetippt(String(wert));
      return;
    }
    const neu = begrenzen(gelesen);
    setGetippt(String(neu));
    if (neu !== wert) onAendern(neu);
  };

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={feldId} className="text-[1.2rem] font-semibold">
        {beschriftung}
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <Knopf
          art="neben"
          onClick={() => onAendern(begrenzen(wert - stufe(wert - 1)))}
          disabled={wert <= min}
          aria-label={t("einst.wenigerVon", { was: beschriftung })}
        >
          {t("einst.weniger")}
        </Knopf>
        <div className="flex min-h-[64px] items-center gap-2 rounded-xl border-2 border-tinte bg-white px-4">
          <input
            id={feldId}
            value={getippt}
            onChange={(e) => setGetippt(e.target.value)}
            onBlur={uebernehmen}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                uebernehmen();
                (e.target as HTMLInputElement).blur();
              }
            }}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            enterKeyHint="done"
            autoComplete="off"
            aria-describedby={`${feldId}-einheit`}
            className="w-[5ch] bg-transparent py-2 text-center text-[1.5rem] font-bold outline-none"
          />
          <span id={`${feldId}-einheit`} className="text-[1.2rem] font-semibold">
            {einheit}
          </span>
        </div>
        <Knopf
          art="neben"
          onClick={() => onAendern(begrenzen(wert + stufe(wert)))}
          disabled={wert >= max}
          aria-label={t("einst.mehrVon", { was: beschriftung })}
        >
          {t("einst.mehr")}
        </Knopf>
      </div>
      <p className="text-[0.95rem] text-gedaempft">
        {t("einst.zahlBereich", { min: String(min), max: String(max) })}
      </p>
      {hinweis ? <p className="max-w-[60ch] text-[1rem] text-gedaempft">{hinweis}</p> : null}
    </div>
  );
}
