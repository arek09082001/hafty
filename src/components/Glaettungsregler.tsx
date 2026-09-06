"use client";

import { GLAETTUNGSSTUFEN, type Kennzahlen } from "@/lib/muster/typen";

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
  const aktuell = GLAETTUNGSSTUFEN[Math.min(GLAETTUNGSSTUFEN.length - 1, Math.max(0, stufe))];

  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-tinte bg-white p-6">
      <h2 className="text-[1.4rem] font-bold">Wie ruhig soll das Muster sein?</h2>
      <p className="max-w-[60ch] text-[1.05rem]">
        Schieben Sie den Regler nach rechts, wenn Sie große zusammenhängende Flächen möchten. Nach
        links wird das Bild genauer, aber es entstehen mehr einzelne Stiche.
      </p>

      <label htmlFor="glaettung" className="text-[1.3rem] font-bold text-hauptaktion">
        {aktuell.titel}
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
        aria-valuetext={aktuell.titel}
        list="glaettungsstufen"
      />
      <datalist id="glaettungsstufen">
        {GLAETTUNGSSTUFEN.map((s, i) => (
          <option key={s.titel} value={i} label={s.titel} />
        ))}
      </datalist>

      <div className="flex justify-between gap-4 text-[0.95rem] text-gedaempft">
        <span>sehr detailliert</span>
        <span className="text-right">ruhig und einfach zu sticken</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-4">
        <p className="min-w-[220px] flex-1 rounded-xl border-2 border-linie bg-hinweis p-4">
          <span className="block text-[1.05rem]">Einzelne Stiche</span>
          <span className="block text-[1.9rem] font-bold leading-tight">
            {laeuft ? "…" : kennzahlen.einzelstiche.toLocaleString("de-DE")}
          </span>
          <span className="block text-[0.95rem] text-gedaempft">
            So oft müssen Sie für nur ein oder zwei Kreuze neu einfädeln.
          </span>
        </p>
        <p className="min-w-[220px] flex-1 rounded-xl border-2 border-linie bg-hinweis p-4">
          <span className="block text-[1.05rem]">Farbwechsel pro Reihe</span>
          <span className="block text-[1.9rem] font-bold leading-tight">
            {laeuft ? "…" : kennzahlen.farbwechselProReihe.toLocaleString("de-DE")}
          </span>
          <span className="block text-[0.95rem] text-gedaempft">
            So oft wechselt in einer Reihe im Schnitt die Farbe.
          </span>
        </p>
      </div>
    </section>
  );
}
