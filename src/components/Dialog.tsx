"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Knopf } from "./Knopf";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Ein Fenster hat immer einen sichtbaren Abbrechen-Knopf. Die Escape-Taste
 * bricht ebenfalls ab, aber niemand muss sie kennen.
 */
export function Dialog({
  offen,
  titel,
  text,
  bestaetigenText,
  bestaetigenArt = "haupt",
  abbrechenText,
  onBestaetigen,
  onAbbrechen,
  children,
  nurSchliessen = false,
}: {
  offen: boolean;
  titel: string;
  text?: string;
  bestaetigenText: string;
  bestaetigenArt?: "haupt" | "gefahr";
  abbrechenText?: string;
  onBestaetigen: () => void;
  onAbbrechen: () => void;
  children?: ReactNode;
  /**
   * Für reine Auswahlfenster, in denen das Antippen selbst schon die
   * Entscheidung ist. Dann gibt es nur einen Knopf – zwei Knöpfe, die
   * dasselbe tun, verwirren mehr, als sie helfen. Ein sichtbarer Weg
   * heraus bleibt trotzdem.
   */
  nurSchliessen?: boolean;
}) {
  const { t } = useSprache();
  const fenster = useRef<HTMLDivElement>(null);
  const ersterKnopf = useRef<HTMLButtonElement>(null);

  /**
   * Der Fokus wird **nur beim Öffnen** gesetzt.
   *
   * Vorher hing er mit am Abbrechen-Rückruf, und den schreiben die
   * aufrufenden Stellen als `() => ...` hin – bei jedem Neuzeichnen ein
   * neuer. Wer also den Namen eines Motivs eintippte, löste mit jedem
   * Buchstaben ein Neuzeichnen aus, und der Fokus sprang aus dem Feld auf
   * den Knopf. Nach einem Buchstaben war Schluss.
   *
   * Steht ein Eingabefeld im Fenster, bekommt es den Fokus und nicht der
   * Knopf: wer nach einem Namen gefragt wird, soll gleich schreiben können.
   */
  useEffect(() => {
    if (!offen) return;
    const feld = fenster.current?.querySelector<HTMLElement>("input, textarea, select");
    (feld ?? ersterKnopf.current)?.focus();
  }, [offen]);

  useEffect(() => {
    if (!offen) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") onAbbrechen();
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [offen, onAbbrechen]);

  if (!offen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={fenster}
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        className="w-full max-w-[640px] rounded-2xl border-2 border-tinte bg-white p-7 shadow-2xl"
      >
        <h2 className="text-[1.5rem] font-bold leading-tight">{titel}</h2>
        {text ? <p className="mt-3 text-[1.05rem]">{text}</p> : null}
        {children ? <div className="mt-5">{children}</div> : null}

        <div className="mt-7 flex flex-wrap gap-4">
          <Knopf ref={ersterKnopf} art={bestaetigenArt} onClick={onBestaetigen}>
            {bestaetigenText}
          </Knopf>
          {nurSchliessen ? null : (
            <Knopf art="neben" onClick={onAbbrechen}>
              {abbrechenText ?? t("allgemein.abbrechen")}
            </Knopf>
          )}
        </div>
      </div>
    </div>
  );
}
