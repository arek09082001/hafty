"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Dialog } from "@/components/Dialog";
import { useMeldungen } from "@/components/Meldungen";
import {
  motivLoeschen,
  motivUmbenennen,
  motiveLaden,
  type Motiv,
} from "@/lib/speicher/motive";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Meine Motive – die Verwaltung.
 * ---------------------------------------------------------------------------
 *
 * Motive gab es bisher nur mitten in der Arbeit: im Reiter „Gemerkt", neben
 * dem Muster, an dem man gerade sitzt. Zum Einsetzen ist das die richtige
 * Stelle. Zum Aufräumen nicht – dafür musste man erst irgendein Muster
 * öffnen, und umbenennen ging überhaupt nicht.
 *
 * Deshalb hier eine eigene Seite, erreichbar aus der Kopfzeile wie der
 * Garnvorrat: alle Motive nebeneinander, jedes mit Bild, Namen und Größe,
 * und an jedem die beiden Handgriffe, die es braucht – umbenennen und
 * löschen. Eingesetzt wird weiterhin im Editor; dort liegt ja das Raster,
 * auf das es soll.
 */
export function MeineMotive() {
  const { t, zahl } = useSprache();
  const { melden } = useMeldungen();

  const [motive, setMotive] = useState<Motiv[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [gingSchief, setGingSchief] = useState(false);

  /** Das Motiv, das gerade umbenannt wird, samt dem getippten Namen. */
  const [umbenennen, setUmbenennen] = useState<Motiv | null>(null);
  const [neuerName, setNeuerName] = useState("");
  const [zumLoeschen, setZumLoeschen] = useState<Motiv | null>(null);

  useEffect(() => {
    let abgebrochen = false;
    motiveLaden()
      .then((liste) => {
        if (!abgebrochen) setMotive(liste);
      })
      .catch(() => {
        if (!abgebrochen) setGingSchief(true);
      })
      .finally(() => {
        if (!abgebrochen) setLaedt(false);
      });
    return () => {
      abgebrochen = true;
    };
  }, []);

  async function umbenennenFestschreiben() {
    const motiv = umbenennen;
    const name = neuerName.trim();
    if (!motiv || name === "") return;
    setUmbenennen(null);
    const geklappt = await motivUmbenennen(motiv.id, name);
    if (!geklappt) {
      melden(t("motive.fehlerUmbenennen"), "fehler");
      return;
    }
    setMotive((liste) => liste.map((m) => (m.id === motiv.id ? { ...m, name } : m)));
    melden(t("motive.umbenannt", { name }), "erfolg");
  }

  async function wirklichLoeschen() {
    const motiv = zumLoeschen;
    if (!motiv) return;
    setZumLoeschen(null);
    const weg = await motivLoeschen(motiv);
    if (!weg) {
      melden(t("motive.fehlerLoeschen"), "fehler");
      return;
    }
    if (motiv.vorschauUrl) URL.revokeObjectURL(motiv.vorschauUrl);
    setMotive((liste) => liste.filter((m) => m.id !== motiv.id));
  }

  return (
    <Seite
      weit
      titel={t("motive.seitenTitel")}
      erklaerung={t("motive.seitenText")}
      fuss={
        <KnopfLink art="haupt" gross href="/schritt/muster">
          {t("motive.zurueckMuster")}
        </KnopfLink>
      }
    >
      {gingSchief ? (
        <Hinweis art="fehler">{t("motive.fehlerLaden")}</Hinweis>
      ) : laedt ? (
        <p className="text-[1.05rem] text-gedaempft">{t("motive.wirdGeholt")}</p>
      ) : motive.length === 0 ? (
        <Hinweis>{t("motive.keineAufSeite")}</Hinweis>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-5">
          {motive.map((motiv) => (
            <li
              key={motiv.id}
              className="flex flex-col gap-3 rounded-xl border border-linie bg-white p-4"
            >
              {motiv.vorschauUrl ? (
                <Image
                  src={motiv.vorschauUrl}
                  alt=""
                  width={200}
                  height={200}
                  unoptimized
                  className="raster mx-auto h-[170px] w-full rounded-lg border border-linie bg-hinweis object-contain"
                />
              ) : (
                <span className="flex h-[170px] items-center justify-center rounded-lg border border-linie bg-hinweis text-[0.95rem]">
                  {t("motive.ohneBild")}
                </span>
              )}

              <div>
                <p className="text-[1.1rem] font-bold break-words">{motiv.name}</p>
                <p className="text-[0.95rem] text-gedaempft">
                  {t("motive.groesse", { w: zahl(motiv.w), h: zahl(motiv.h) })}
                  {" · "}
                  {t("motive.farbenZahl", { anzahl: zahl(motiv.palette.length) })}
                </p>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2">
                <Knopf
                  art="neben"
                  klein
                  onClick={() => {
                    setNeuerName(motiv.name);
                    setUmbenennen(motiv);
                  }}
                >
                  {t("motive.umbenennen")}
                </Knopf>
                <Knopf art="gefahr" klein onClick={() => setZumLoeschen(motiv)}>
                  {t("motive.loeschen")}
                </Knopf>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        offen={umbenennen !== null}
        titel={t("motive.umbenennenTitel")}
        text={t("motive.umbenennenText")}
        bestaetigenText={t("motive.umbenennen")}
        onBestaetigen={umbenennenFestschreiben}
        onAbbrechen={() => setUmbenennen(null)}
      >
        <label htmlFor="motivname-neu" className="mb-2 block text-[1.1rem] font-semibold">
          {t("editor.motivName")}
        </label>
        <input
          id="motivname-neu"
          value={neuerName}
          onChange={(e) => setNeuerName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void umbenennenFestschreiben();
            }
          }}
          placeholder={t("editor.motivNamePlatzhalter")}
          className="min-h-[60px] w-full rounded-xl border-2 border-tinte bg-white px-4 text-[1.15rem]"
        />
      </Dialog>

      <Dialog
        offen={zumLoeschen !== null}
        titel={t("editor.motivLoeschenTitel")}
        text={zumLoeschen ? t("editor.motivLoeschenText", { name: zumLoeschen.name }) : ""}
        bestaetigenText={t("allgemein.jaLoeschen")}
        bestaetigenArt="gefahr"
        abbrechenText={t("allgemein.behalten")}
        onBestaetigen={wirklichLoeschen}
        onAbbrechen={() => setZumLoeschen(null)}
      />
    </Seite>
  );
}
