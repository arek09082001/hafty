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
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-tinte bg-white p-6">
      <h2 className="text-[1.2rem] font-bold">{t("glaettung.frage")}</h2>
      <p className="max-w-[60ch] text-[1.05rem]">{t("glaettung.erklaerung")}</p>

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

      <div className="mt-2 flex flex-wrap gap-4">
        <p className="min-w-[220px] flex-1 rounded-xl border-2 border-linie bg-hinweis p-4">
          <span className="block text-[1.05rem]">{t("glaettung.einzelstiche")}</span>
          <span className="block text-[1.9rem] font-bold leading-tight">
            {laeuft ? "…" : zahl(kennzahlen.einzelstiche)}
          </span>
          <span className="block text-[0.95rem] text-gedaempft">
            {t("glaettung.einzelsticheText")}
          </span>
        </p>
        <p className="min-w-[220px] flex-1 rounded-xl border-2 border-linie bg-hinweis p-4">
          <span className="block text-[1.05rem]">{t("glaettung.farbwechsel")}</span>
          <span className="block text-[1.9rem] font-bold leading-tight">
            {laeuft ? "…" : zahl(kennzahlen.farbwechselProReihe)}
          </span>
          <span className="block text-[0.95rem] text-gedaempft">
            {t("glaettung.farbwechselText")}
          </span>
        </p>
      </div>
    </section>
  );
}
