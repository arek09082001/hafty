"use client";

import { GLAETTUNGSSTUFEN, type Kennzahlen } from "@/lib/muster/typen";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Der Schieberegler für die Glättung.
 *
 * Fünf Rastpunkte, beschriftet von „sehr detailliert" bis „ruhig und einfach
 * zu sticken". Die Zahl dahinter (lambda) taucht in der Oberfläche nirgends
 * auf – sie sagt der Nutzerin nichts. Unter dem Regler stehen zwei Zahlen,
 * die sich bei jeder Änderung sofort mitbewegen und in ihrer Sprache sagen,
 * was der Regler bewirkt hat.
 */
export function Glaettungsregler({
  stufe,
  kennzahlen,
  laeuft,
  onAendern,
}: {
  stufe: number;
  kennzahlen: Kennzahlen;
  laeuft: boolean;
  onAendern: (stufe: number) => void;
}) {
  const { t, zahl } = useSprache();
  const aktuell = GLAETTUNGSSTUFEN[Math.min(GLAETTUNGSSTUFEN.length - 1, Math.max(0, stufe))];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[1rem] text-gedaempft">{t("glaettung.erklaerung")}</p>

      <label htmlFor="glaettung" className="text-[1.3rem] font-bold text-hauptaktion">
        {t(aktuell.titel)}
      </label>

      <input
        id="glaettung"
        type="range"
        min={0}
        max={GLAETTUNGSSTUFEN.length - 1}
        step={1}
        value={stufe}
        disabled={laeuft}
        onChange={(e) => onAendern(Number(e.target.value))}
        aria-valuetext={t(aktuell.titel)}
        list="glaettungsstufen"
      />
      <datalist id="glaettungsstufen">
        {GLAETTUNGSSTUFEN.map((s, i) => (
          <option key={s.titel} value={i} label={t(s.titel)} />
        ))}
      </datalist>

      <div className="flex justify-between gap-4 text-[0.95rem] text-gedaempft">
        <span>{t("glaettung.stufe0")}</span>
        <span className="text-right">{t("glaettung.stufe4")}</span>
      </div>

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
            {laeuft ? "…" : zahl(kennzahlen.einzelstiche)}
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
            {laeuft ? "…" : zahl(kennzahlen.farbwechselProReihe)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
