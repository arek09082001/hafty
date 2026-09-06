import type { ReactNode } from "react";

/**
 * Meldungen stehen immer in ganzen Saetzen und sagen, was zu tun ist.
 * Statuscodes oder englische Fehlertexte erscheinen nie in der Oberflaeche.
 */
export function Hinweis({
  art = "info",
  children,
}: {
  art?: "info" | "fehler" | "erfolg";
  children: ReactNode;
}) {
  const stil =
    art === "fehler"
      ? "border-warnung bg-[#fbeaea] text-warnung"
      : art === "erfolg"
        ? "border-hauptaktion bg-[#e8f3ee] text-hauptaktion"
        : "border-linie bg-hinweis text-tinte";

  return (
    <p role={art === "fehler" ? "alert" : "status"} className={`rounded-xl border-2 p-5 text-[1.05rem] ${stil}`}>
      {children}
    </p>
  );
}
