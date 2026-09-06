"use client";

export type Werkzeug = "flaeche" | "rechteck" | "freihand" | "malen" | "fuellen";

/**
 * Die Werkzeuge stehen alle nebeneinander sichtbar da – keine Auswahlliste,
 * kein Menü. Jedes hat einen Namen in ganzen Worten und darunter einen Satz,
 * der sagt, was beim Antippen des Rasters passiert.
 *
 * „Gleiche Fläche auswählen" steht bewusst an erster Stelle und ist
 * voreingestellt: damit ist ein Blütenblatt mit einem einzigen Tipp erfasst.
 */
export const WERKZEUGE: Array<{ art: Werkzeug; titel: string; erklaerung: string }> = [
  {
    art: "flaeche",
    titel: "Gleiche Fläche auswählen",
    erklaerung: "Tippen Sie in eine Fläche. Alles, was daran hängt und dieselbe Farbe hat, wird ausgewählt.",
  },
  {
    art: "rechteck",
    titel: "Rechteck auswählen",
    erklaerung: "Ziehen Sie mit dem Finger ein Rechteck über den Bereich, den Sie auswählen möchten.",
  },
  {
    art: "freihand",
    titel: "Freihand auswählen",
    erklaerung: "Fahren Sie einmal um den Bereich herum. Beim Loslassen wird alles darin ausgewählt.",
  },
  {
    art: "malen",
    titel: "Einzelne Stiche malen",
    erklaerung: "Tippen oder fahren Sie über die Felder. Sie bekommen die gewählte Farbe.",
  },
  {
    art: "fuellen",
    titel: "Fläche färben",
    erklaerung: "Tippen Sie in eine Fläche. Die ganze Fläche bekommt die gewählte Farbe.",
  },
];

export function Werkzeugwahl({
  gewaehlt,
  onWaehlen,
}: {
  gewaehlt: Werkzeug;
  onWaehlen: (w: Werkzeug) => void;
}) {
  const aktuell = WERKZEUGE.find((w) => w.art === gewaehlt);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-tinte bg-white p-5">
      <h2 className="text-[1.3rem] font-bold">Womit möchten Sie arbeiten?</h2>
      <ul className="flex flex-col gap-2">
        {WERKZEUGE.map((werkzeug) => {
          const ist = werkzeug.art === gewaehlt;
          return (
            <li key={werkzeug.art}>
              <button
                type="button"
                onClick={() => onWaehlen(werkzeug.art)}
                aria-pressed={ist}
                className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-[1.05rem] font-semibold ${
                  ist ? "border-hauptaktion bg-[#e8f3ee]" : "border-linie bg-white hover:bg-hinweis"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                    ist ? "border-hauptaktion bg-hauptaktion" : "border-linie bg-white"
                  }`}
                >
                  {ist ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
                </span>
                {werkzeug.titel}
              </button>
            </li>
          );
        })}
      </ul>
      {aktuell ? (
        <p className="rounded-xl bg-hinweis p-4 text-[1rem]">{aktuell.erklaerung}</p>
      ) : null}
    </section>
  );
}
