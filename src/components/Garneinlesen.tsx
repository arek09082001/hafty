"use client";

import { useEffect, useState } from "react";
import { Knopf } from "./Knopf";
import { Hinweis } from "./Hinweis";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Der Knopf, mit dem die Garnfarben einmalig in die Datenbank kommen.
 *
 * Gedacht ist das für den Anfang: nach dem Einrichten ist die Garnliste
 * leer, und ohne diesen Knopf müsste man dafür an die Kommandozeile. Die
 * eigentliche Arbeit macht /api/garne auf dem Server – nur dort liegt der
 * Dienstschlüssel, mit dem der Katalog beschrieben werden darf.
 */

type Stand = { stand: string; inDerDatei?: number; inDerDatenbank?: number; anzahl?: number };

export function Garneinlesen({ onFertig }: { onFertig: () => void }) {
  const { t, zahl } = useSprache();
  const [stand, setStand] = useState<Stand | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState<Stand | null>(null);

  useEffect(() => {
    let abgebrochen = false;
    fetch("/api/garne")
      .then((a) => a.json())
      .then((d: Stand) => {
        if (!abgebrochen) setStand(d);
      })
      .catch(() => {
        if (!abgebrochen) setStand({ stand: "schiefgegangen" });
      });
    return () => {
      abgebrochen = true;
    };
  }, []);

  async function einlesen() {
    setLaeuft(true);
    setErgebnis(null);
    try {
      const antwort = await fetch("/api/garne", { method: "POST" });
      const d: Stand = await antwort.json();
      setErgebnis(d);
      if (d.stand === "fertig") onFertig();
    } catch {
      setErgebnis({ stand: "schiefgegangen" });
    } finally {
      setLaeuft(false);
    }
  }

  if (!stand) return null;

  // Wenn schon die Nachfrage scheitert, hilft kein Knopf: dann fehlt der
  // Dienstschlüssel oder der Datenbank die Rechte. Statt zu einem Antippen
  // einzuladen, das nicht klappen kann, steht hier gleich, was zu tun ist.
  if (stand.stand === "kein-schluessel") {
    return <Hinweis art="fehler">{t("einlesen.keinSchluessel")}</Hinweis>;
  }
  if (stand.stand === "keine-rechte") {
    return <Hinweis art="fehler">{t("einlesen.keineRechte")}</Hinweis>;
  }

  // Nach erfolgreichem Einlesen zaehlt das Ergebnis, nicht mehr der Stand
  // von vorhin – sonst bliebe der Knopf gross und riefe weiter zum Einlesen
  // auf, obwohl schon alles drin steht.
  const schonDa =
    ergebnis?.stand === "fertig" ? (ergebnis.anzahl ?? 0) : (stand.inDerDatenbank ?? 0);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[1.4rem] font-bold">{t("einlesen.titel")}</h2>

      {ergebnis?.stand === "fertig" ? (
        <Hinweis art="erfolg">
          {t("einlesen.fertig", { anzahl: zahl(ergebnis.anzahl ?? 0) })}
        </Hinweis>
      ) : ergebnis?.stand === "keine-rechte" ? (
        <Hinweis art="fehler">{t("einlesen.keineRechte")}</Hinweis>
      ) : ergebnis?.stand === "kein-schluessel" ? (
        <Hinweis art="fehler">{t("einlesen.keinSchluessel")}</Hinweis>
      ) : ergebnis ? (
        <Hinweis art="fehler">{t("einlesen.schiefgegangen")}</Hinweis>
      ) : schonDa > 0 ? (
        <Hinweis>{t("einlesen.schonDa", { anzahl: zahl(schonDa) })}</Hinweis>
      ) : (
        <p className="max-w-[70ch] text-[1.05rem]">
          {t("einlesen.erklaerung", { anzahl: zahl(stand.inDerDatei ?? 0) })}
        </p>
      )}

      <div>
        {/* Solange die Liste leer ist, ist das Einlesen die eine Handlung
            dieses Bildschirms. Steht schon etwas drin, tritt der Knopf
            zurueck: dann geht es hier ums Ankreuzen. */}
        <Knopf
          art={schonDa > 0 ? "neben" : "haupt"}
          gross={schonDa === 0}
          disabled={laeuft}
          onClick={einlesen}
        >
          {laeuft
            ? t("einlesen.laeuft")
            : schonDa > 0
              ? t("einlesen.nochmal")
              : t("einlesen.knopf")}
        </Knopf>
      </div>
    </section>
  );
}
