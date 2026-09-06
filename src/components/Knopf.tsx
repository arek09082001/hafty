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
    "shadow-[0_2px_0_rgba(0,0,0,0.25)]",
  neben: "bg-white text-tinte border-tinte hover:bg-hinweis",
  still: "bg-transparent text-gedaempft border-transparent underline hover:text-tinte",
  gefahr: "bg-white text-warnung border-warnung hover:bg-[#fbeaea]",
};

const GRUNDSTIL =
  "inline-flex min-h-[56px] items-center justify-center gap-3 rounded-xl border-2 " +
  "px-6 py-3 text-[1.05rem] font-semibold leading-tight text-center " +
  "disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

type KnopfProps = ComponentProps<"button"> & {
  art?: KnopfArt;
  gross?: boolean;
  children: ReactNode;
};

export function Knopf({ art = "neben", gross, className = "", children, ...rest }: KnopfProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`${GRUNDSTIL} ${ARTEN[art]} ${gross ? "min-h-[72px] px-10 text-[1.3rem]" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

type KnopfLinkProps = ComponentProps<typeof Link> & {
  art?: KnopfArt;
  gross?: boolean;
  children: ReactNode;
};

export function KnopfLink({
  art = "neben",
  gross,
  className = "",
  children,
  ...rest
}: KnopfLinkProps) {
  return (
    <Link
      {...rest}
      className={`${GRUNDSTIL} ${ARTEN[art]} ${gross ? "min-h-[72px] px-10 text-[1.3rem]" : ""} ${className}`}
    >
      {children}
    </Link>
  );
}
