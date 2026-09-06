"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Knopf } from "./Knopf";

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
  abbrechenText = "Abbrechen",
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
  const ersterKnopf = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!offen) return;
    ersterKnopf.current?.focus();
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
              {abbrechenText}
            </Knopf>
          )}
        </div>
      </div>
    </div>
  );
}
