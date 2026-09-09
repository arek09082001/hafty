"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type KnopfArt = "haupt" | "neben" | "still" | "gefahr";

/**
 * Alle Schaltflaechen der App. Mindesthoehe 56px, immer mit Text beschriftet.
 * Pro Bildschirm gibt es genau einen Knopf der Art "haupt".
 */
const ARTEN: Record<KnopfArt, string> = {
  haupt:
    "bg-hauptaktion text-white border-hauptaktion hover:bg-hauptaktion-hell " +
    "shadow-[0_2px_0_rgba(0,0,0,0.25)] active:shadow-none",
  neben: "bg-white text-tinte border-tinte hover:bg-hinweis",
  still: "bg-transparent text-gedaempft border-transparent underline hover:text-tinte",
  gefahr: "bg-white text-warnung border-warnung hover:bg-[#fbeaea]",
};

const GRUNDSTIL =
  "inline-flex min-h-[56px] items-center justify-center gap-3 rounded-xl border-2 " +
  "px-6 py-3 text-[1.05rem] font-semibold leading-tight text-center " +
  "disabled:opacity-40 disabled:cursor-not-allowed transition-colors " +
  // Der Knopf gibt beim Drücken um einen Punkt nach. Bei „haupt" sitzt darunter
  // ein 2px-Schatten, der dabei verschwindet – zusammen ist das ein echter
  // Druckpunkt und nicht nur ein Farbwechsel.
  "active:translate-y-[1px] disabled:active:translate-y-0";

type KnopfProps = ComponentProps<"button"> & {
  art?: KnopfArt;
  gross?: boolean;
  /**
   * Schmalere Fassung für Werkzeugleisten. Die Mindesthöhe von 56px bleibt,
   * nur die Innenabstände und die Schrift werden kleiner – daran wird nicht
   * gerüttelt, sonst trifft man die Knöpfe auf dem Tablet nicht mehr.
   */
  klein?: boolean;
  children: ReactNode;
};

export function Knopf({
  art = "neben",
  gross,
  klein,
  className = "",
  children,
  ...rest
}: KnopfProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`${GRUNDSTIL} ${ARTEN[art]} ${gross ? "min-h-[72px] px-10 text-[1.3rem]" : ""} ${
        klein ? "px-4 text-[0.95rem]" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

type KnopfLinkProps = ComponentProps<typeof Link> & {
  art?: KnopfArt;
  gross?: boolean;
  klein?: boolean;
  children: ReactNode;
};

export function KnopfLink({
  art = "neben",
  gross,
  klein,
  className = "",
  children,
  ...rest
}: KnopfLinkProps) {
  return (
    <Link
      {...rest}
      className={`${GRUNDSTIL} ${ARTEN[art]} ${gross ? "min-h-[72px] px-10 text-[1.3rem]" : ""} ${
        klein ? "px-4 text-[0.95rem]" : ""
      } ${className}`}
    >
      {children}
    </Link>
  );
}
