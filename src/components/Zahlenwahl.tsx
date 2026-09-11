"use client";

import { useState } from "react";
import { Knopf } from "./Knopf";
import { Zahlenfeld } from "./Zahlenfeld";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Eine Zahl einstellen – mit zwei großen Knöpfen und einem Feld dazwischen,
 * in das man die Zahl auch eintippen kann.
 *
 * Ein Drehfeld mit winzigen Pfeilen wäre auf einem Tablet nicht zu treffen;
 * „Weniger" und „Mehr" sind es immer, und sie bleiben deshalb der Hauptweg.
 * Wer aber schon weiß, dass es 180 Stiche werden sollen, tippt sie ein,
 * statt vierzehnmal auf „Mehr" zu drücken.
 *
 * `schritt` darf auch eine Funktion sein. Das wird bei einem weiten Bereich
 * gebraucht: bei der Farbanzahl reicht unten die feine Stufe, oben käme man
 * damit nie an. Beim Zurückgehen zählt die Stufe des **Zielbereichs** – sonst
 * landete „Weniger" nach „Mehr" nicht wieder auf demselben Wert.
 */
export function Zahlenwahl({
  id,
  beschriftung,
  wert,
  min,
  max,
  schritt = 1,
  einheit,
  onAendern,
  hinweis,
}: {
  /** Verbindet die Überschrift mit dem Eingabefeld. */
  id: string;
  beschriftung: string;
  wert: number;
  min: number;
  max: number;
  schritt?: number | ((wert: number) => number);
  einheit: string;
  onAendern: (neu: number) => void;
  hinweis?: string;
}) {
  const { t, zahl } = useSprache();
  /** Auf diesen Wert wurde zuletzt begrenzt – dann steht ein Satz darunter. */
  const [begrenzt, setBegrenzt] = useState<number | null>(null);
  const begrenzen = (v: number) => Math.max(min, Math.min(max, v));
  const stufe = (v: number) => (typeof schritt === "function" ? schritt(v) : schritt);

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="text-[1.2rem] font-semibold">
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
        <Zahlenfeld
          id={id}
          wert={wert}
          min={min}
          max={max}
          einheit={einheit}
          onAendern={onAendern}
          onBegrenzt={setBegrenzt}
        />
        <Knopf
          art="neben"
          onClick={() => onAendern(begrenzen(wert + stufe(wert)))}
          disabled={wert >= max}
          aria-label={t("einst.mehrVon", { was: beschriftung })}
        >
          {t("einst.mehr")}
        </Knopf>
      </div>
      {/* Eine zu große oder zu kleine Zahl wird nicht still zurechtgebogen,
          sondern in einem ganzen Satz erklärt. Er steht unter der ganzen
          Zeile und nicht neben dem Kästchen: dort zöge er es in die Breite
          und schöbe „Mehr" in die nächste Zeile. */}
      {begrenzt !== null ? (
        <p role="status" className="max-w-[60ch] text-[1rem] text-warnung">
          {t("zahlenfeld.begrenzt", { min: zahl(min), max: zahl(max), wert: zahl(begrenzt) })}
        </p>
      ) : null}

      {/* Dass man die Zahl auch eintippen kann, sieht man dem Kästchen zwar
          an – aber nicht jede Nutzerin rechnet damit, und ein Satz kostet
          hier weniger als ein vergeblicher Versuch. */}
      <p className="max-w-[60ch] text-[1rem] text-gedaempft">
        {hinweis ? `${hinweis} ` : ""}
        {t("zahlenfeld.tippen")}
      </p>
    </div>
  );
}
