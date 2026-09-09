import type { ReactNode } from "react";

/**
 * Meldungen stehen immer in ganzen Saetzen und sagen, was zu tun ist.
 * Statuscodes oder englische Fehlertexte erscheinen nie in der Oberflaeche.
 *
 * Gestalt: ein kraeftiger Balken links, ein leicht getoenter Grund, sonst
 * nichts. Vorher war jede Meldung eine Karte mit umlaufendem 2px-Rahmen und
 * runden Ecken – neben den Karten ringsum ging sie darin unter. Der Balken
 * faellt staerker auf und traegt weniger auf.
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
    <p
      role={art === "fehler" ? "alert" : "status"}
      className={`border-l-[6px] px-4 py-3 text-[1.05rem] ${stil}`}
    >
      {children}
    </p>
  );
}
