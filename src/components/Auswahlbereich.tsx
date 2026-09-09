"use client";

import { Knopf } from "./Knopf";
import { Hinweis } from "./Hinweis";
import { Abschnitt } from "./Abschnitt";
import { werkzeugFinden, type Werkzeug } from "./Werkzeugleiste";
import { AEHNLICHKEITSSTUFEN } from "@/lib/muster/motivsuche";
import { useSprache } from "@/lib/sprache/SprachProvider";
import type { Auswahl } from "@/lib/muster/raster";

/**
 * Was man mit einer Auswahl tun kann – und vorher, wie man eine bekommt.
 * ---------------------------------------------------------------------------
 *
 * Vorher standen hier immer alle sechs Knöpfe, und solange nichts ausgewählt
 * war, waren alle sechs grau. Das war als Angebot gemeint („seht her, das
 * ginge") und kam als Rätsel an: sechs tote Knöpfe, und keiner sagt, warum
 * er nicht geht oder welchen man zuerst braucht.
 *
 * Jetzt zeigt der Bereich genau einen von zwei Zuständen:
 *
 *  - **Noch nichts ausgewählt.** Kein einziger Knopf. Stattdessen steht da,
 *    welcher Griff jetzt dran ist – der Satz zum gewählten Werkzeug, also
 *    „Tippen Sie die Blume an" oder „Ziehen Sie einen Rahmen auf" – und
 *    darunter in Worten, wozu das gut ist. Nichts zu drücken heißt: der
 *    nächste Schritt liegt im Muster, nicht in dieser Spalte.
 *
 *  - **Etwas ausgewählt.** Jetzt kommen die Knöpfe, und zwar sofort alle
 *    benutzbar. Obenauf der eine grüne: „Nur das sticken" – das ist der
 *    Grund, aus dem man überhaupt etwas auswählt. Darunter das Übrige, und
 *    ganz unten leise der Weg zurück.
 *
 * Beide Freistell-Knöpfe tragen einen Satz, was danach anders ist. Sie sind
 * die einzigen, die das Muster wirklich umkrempeln, und „nur das sticken"
 * gegen „das hier weglassen" hört sich beim schnellen Lesen fast gleich an.
 */
export function Auswahlbereich({
  werkzeug,
  auswahl,
  felderImMuster,
  aehnlichkeit,
  hatTipps,
  onAehnlichkeit,
  onNurDasSticken,
  onWeglassen,
  onFaerben,
  onKopieren,
  onAlsMotivMerken,
  onAufheben,
}: {
  werkzeug: Werkzeug;
  auswahl: Auswahl | null;
  /** Breite mal Höhe – daran hängt der Hinweis „fast alles ausgewählt". */
  felderImMuster: number;
  /** Nur fürs Motivwerkzeug: wie großzügig die Suche gerade ist. */
  aehnlichkeit: number;
  /** Ob schon irgendwo hingetippt wurde – sonst gibt es nichts zu erweitern. */
  hatTipps: boolean;
  onAehnlichkeit: (richtung: 1 | -1) => void;
  onNurDasSticken: () => void;
  onWeglassen: () => void;
  onFaerben: () => void;
  onKopieren: () => void;
  onAlsMotivMerken: () => void;
  onAufheben: () => void;
}) {
  const { t, zahl } = useSprache();
  const anzahl = auswahl?.anzahl ?? 0;

  // --- Noch nichts ausgewählt: kein Knopf, nur der nächste Griff ----------
  if (anzahl === 0) {
    return (
      <Abschnitt titel={t("auswahl.soGehts")}>
        <p className="text-[1.05rem]">{t(werkzeugFinden(werkzeug).erklaerung)}</p>
        <p className="mt-4 text-[1.05rem] text-gedaempft">{t("auswahl.danach")}</p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-6 text-[1.05rem] text-gedaempft">
          <li>{t("auswahl.danachSticken")}</li>
          <li>{t("auswahl.danachWeglassen")}</li>
          <li>{t("auswahl.danachFaerben")}</li>
          <li>{t("auswahl.danachKopieren")}</li>
          <li>{t("auswahl.danachMerken")}</li>
        </ul>
      </Abschnitt>
    );
  }

  // --- Etwas ausgewählt: jetzt geht alles ---------------------------------
  return (
    <Abschnitt titel={t("editor.ausgewaehlt", { anzahl: zahl(anzahl) })}>
      {/* Beim Motivwerkzeug wird die Auswahl noch nachgestellt, bevor man
          sich für eine Tat entscheidet. Deshalb stehen die beiden Knöpfe
          über den Taten und nicht dazwischen. */}
      {werkzeug === "motiv" ? (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Knopf
            art="neben"
            klein
            onClick={() => onAehnlichkeit(1)}
            disabled={!hatTipps || aehnlichkeit >= AEHNLICHKEITSSTUFEN.length - 1}
          >
            {t("motivsuche.mehr")}
          </Knopf>
          <Knopf
            art="neben"
            klein
            onClick={() => onAehnlichkeit(-1)}
            disabled={!hatTipps || aehnlichkeit <= 0}
          >
            {t("motivsuche.weniger")}
          </Knopf>
        </div>
      ) : null}

      {anzahl > 0.8 * felderImMuster ? (
        <div className="mb-4">
          <Hinweis>{t("motivsuche.fastAlles")}</Hinweis>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {/* Zuoberst und größer als der Rest: das Freistellen ist der Grund,
            aus dem überhaupt ausgewählt wird. Die Rangfolge läuft über die
            Größe und nicht über Grün – grün gefüllt bleibt genau ein Ding je
            Bildschirm, und das ist die Hauptaktion unten rechts. */}
        <Tat
          knopf={
            <Knopf art="neben" gross onClick={onNurDasSticken} className="w-full">
              {t("auswahl.nurDas")}
            </Knopf>
          }
          satz={t("auswahl.nurDasErklaerung")}
        />
        <Tat
          knopf={
            <Knopf art="neben" onClick={onWeglassen} className="w-full">
              {t("auswahl.weglassen")}
            </Knopf>
          }
          satz={t("auswahl.weglassenErklaerung")}
        />

        <div className="grid grid-cols-2 gap-2">
          <Knopf art="neben" klein onClick={onFaerben}>
            {t("editor.auswahlFaerben")}
          </Knopf>
          <Knopf art="neben" klein onClick={onKopieren}>
            {t("editor.auswahlKopieren")}
          </Knopf>
          <Knopf art="neben" klein onClick={onAlsMotivMerken} className="col-span-2">
            {t("editor.alsMotivMerken")}
          </Knopf>
        </div>

        {/* Leise und ganz unten: das ist kein Ziel, sondern der Rückweg. */}
        <Knopf art="still" onClick={onAufheben} className="self-start">
          {t("editor.auswahlAufheben")}
        </Knopf>
      </div>
    </Abschnitt>
  );
}

/** Ein Knopf mit dem Satz darunter, was danach anders ist. */
function Tat({ knopf, satz }: { knopf: React.ReactNode; satz: string }) {
  return (
    <div>
      {knopf}
      <p className="mt-1.5 text-[0.95rem] text-gedaempft">{satz}</p>
    </div>
  );
}
