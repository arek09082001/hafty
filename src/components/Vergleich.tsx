"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Knopf } from "./Knopf";
import { Hinweis } from "./Hinweis";
import { Rasteransicht } from "./Rasteransicht";
import { staendeLaden, standHolen, zeitpunktText, type Stand } from "@/lib/speicher/staende";
import { zusammenfuehren } from "@/lib/muster/raster";
import { useSprache } from "@/lib/sprache/SprachProvider";
import type { PalettenEintrag } from "@/lib/muster/typen";

/**
 * Zwei Stände nebeneinander.
 * ---------------------------------------------------------------------------
 *
 * Der Grund, warum es das gibt: „einmal habe ich mehr Farben genommen,
 * einmal die Größe geändert – welches war besser?" Diese Frage lässt sich an
 * zwei Bildchen von 140 Punkten Breite nicht beantworten. Hier bekommt jeder
 * der beiden Stände die halbe Bildschirmfläche, und beide zeigen denselben
 * Ausschnitt in derselben Vergrößerung: geschoben und vergrößert wird immer
 * für beide gleichzeitig, sonst vergleicht man zwei verschiedene Stellen.
 *
 * Geblättert wird links und rechts einzeln („Früherer Stand" / „Späterer
 * Stand"), damit man einen festhalten und am anderen entlanggehen kann. Die
 * beiden Knöpfe heißen nach der Zeit und nicht nach einer Richtung: eine
 * Nutzerin denkt in „vorher" und „nachher", nicht in „vorwärts".
 */

/** Wie weit sich beide Seiten gemeinsam vergrößern lassen. 1 = eingepasst. */
const LUPE_STUFEN = [1, 1.5, 2, 3, 4, 6, 8] as const;

type Geladen = {
  breite: number;
  hoehe: number;
  raster: Uint16Array;
  palette: PalettenEintrag[];
};

export function Vergleich({
  musterId,
  offen,
  onSchliessen,
  onWiederherstellen,
  startStandId = null,
}: {
  musterId: string | null;
  offen: boolean;
  onSchliessen: () => void;
  /** Fehlt sie, wird nur verglichen und nichts verändert. */
  onWiederherstellen?: (stand: Stand) => Promise<void> | void;
  /** Womit rechts angefangen wird – sonst mit dem neuesten Stand. */
  startStandId?: string | null;
}) {
  const { t, sprache, zahl } = useSprache();
  /**
   * Der Schlüssel sagt, zu welchem Muster die geladene Liste gehört. Solange
   * er nicht zum gewünschten passt, wird noch geholt – so braucht es kein
   * eigenes Ladekennzeichen, das im Effekt gesetzt werden müsste.
   */
  const schluessel = musterId ?? "";
  const [geladen, setGeladen] = useState<{
    schluessel: string;
    staende: Stand[];
    ging: boolean;
  } | null>(null);
  const [links, setLinks] = useState(1);
  const [rechts, setRechts] = useState(0);
  /**
   * Die schon geholten Raster. Sie bleiben auch nach dem Schließen liegen:
   * ein gespeicherter Stand ändert sich nie, und beim Blättern hin und her
   * soll nichts warten.
   */
  const [inhalte, setInhalte] = useState<Record<string, Geladen>>({});
  const angefasst = useRef(new Set<string>());
  const [lupeStufe, setLupeStufe] = useState(0);
  const [mitte, setMitte] = useState({ x: 0.5, y: 0.5 });
  const [holtGerade, setHoltGerade] = useState(false);

  const passt = geladen?.schluessel === schluessel;
  const staende = passt ? geladen.staende : null;
  const gingSchief = passt && !geladen.ging;

  const zeit = (iso: string) => zeitpunktText(iso, sprache, t);

  // --- Die Stände des Projekts holen ---------------------------------------
  useEffect(() => {
    if (!offen || !musterId) return;
    let abgebrochen = false;
    staendeLaden(musterId)
      .then((liste) => {
        if (abgebrochen) return;
        setGeladen({ schluessel: musterId, staende: liste, ging: true });
        const gewaehlt = startStandId ? liste.findIndex((s) => s.id === startStandId) : 0;
        const rechteSeite = gewaehlt >= 0 ? gewaehlt : 0;
        setRechts(rechteSeite);
        // Links steht der Stand davor – das ist der Vergleich, den man
        // fast immer meint: was hat der letzte Schritt verändert?
        setLinks(Math.min(liste.length - 1, rechteSeite + 1));
        setLupeStufe(0);
        setMitte({ x: 0.5, y: 0.5 });
      })
      .catch(() => {
        if (!abgebrochen) setGeladen({ schluessel: musterId, staende: [], ging: false });
      });
    return () => {
      abgebrochen = true;
    };
  }, [offen, musterId, startStandId]);

  // --- Die beiden gezeigten Stände laden -----------------------------------
  const linkerStand = staende?.[links] ?? null;
  const rechterStand = staende?.[rechts] ?? null;

  useEffect(() => {
    if (!offen) return;
    let abgebrochen = false;

    // Ein Stand wird genau einmal geholt und bleibt dann liegen: beim
    // Blättern hin und her soll nichts warten.
    const fehlende = [linkerStand, rechterStand].filter(
      (s): s is Stand => s !== null && !angefasst.current.has(s.id),
    );
    if (fehlende.length === 0) return;
    for (const stand of fehlende) angefasst.current.add(stand.id);

    (async () => {
      for (const stand of fehlende) {
        const inhalt = await standHolen(stand);
        if (abgebrochen) return;
        if (!inhalt) {
          angefasst.current.delete(stand.id);
          continue;
        }
        setInhalte((bisher) => ({
          ...bisher,
          [stand.id]: {
            breite: inhalt.breite,
            hoehe: inhalt.hoehe,
            raster: zusammenfuehren(inhalt.basis, inhalt.bearbeitung),
            palette: inhalt.palette,
          },
        }));
      }
    })();

    return () => {
      abgebrochen = true;
    };
  }, [offen, linkerStand, rechterStand]);

  const lupe = LUPE_STUFEN[lupeStufe];

  const schieben = useCallback((dx: number, dy: number) => {
    setMitte((m) => ({
      x: Math.min(1, Math.max(0, m.x + dx)),
      y: Math.min(1, Math.max(0, m.y + dy)),
    }));
  }, []);

  const wiederherstellen = async (stand: Stand) => {
    if (!onWiederherstellen) return;
    setHoltGerade(true);
    await onWiederherstellen(stand);
    setHoltGerade(false);
    onSchliessen();
  };

  const unterschied = useMemo(() => {
    if (!linkerStand || !rechterStand) return null;
    const farben = rechterStand.farben - linkerStand.farben;
    const breiteLinks = linkerStand.breite ?? inhalte[linkerStand.id]?.breite ?? null;
    const breiteRechts = rechterStand.breite ?? inhalte[rechterStand.id]?.breite ?? null;
    const groesse =
      breiteLinks !== null && breiteRechts !== null ? breiteRechts - breiteLinks : null;
    return { farben, groesse };
  }, [linkerStand, rechterStand, inhalte]);

  if (!offen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-papier">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-linie px-4 py-3">
        <div>
          <h2 className="text-[1.3rem] font-bold leading-tight">{t("vergleich.titel")}</h2>
          <p className="text-[1rem] text-gedaempft">{t("vergleich.erklaerung")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Knopf klein onClick={() => setLupeStufe((s) => Math.max(0, s - 1))} disabled={lupeStufe === 0}>
            {t("vergleich.lupeKleiner")}
          </Knopf>
          <Knopf
            klein
            onClick={() => setLupeStufe((s) => Math.min(LUPE_STUFEN.length - 1, s + 1))}
            disabled={lupeStufe === LUPE_STUFEN.length - 1}
          >
            {t("vergleich.lupeGroesser")}
          </Knopf>
          <Knopf
            klein
            onClick={() => {
              setLupeStufe(0);
              setMitte({ x: 0.5, y: 0.5 });
            }}
          >
            {t("vergleich.einpassen")}
          </Knopf>
          <Knopf
            klein
            onClick={() => {
              setLinks(rechts);
              setRechts(links);
            }}
          >
            {t("vergleich.tauschen")}
          </Knopf>
          <Knopf art="haupt" onClick={onSchliessen}>
            {t("vergleich.fertig")}
          </Knopf>
        </div>
      </header>

      {gingSchief ? (
        <div className="p-5">
          <Hinweis art="fehler">{t("staende.fehlerLaden")}</Hinweis>
        </div>
      ) : !staende ? (
        <p className="p-5 text-[1.05rem] text-gedaempft">{t("staende.wirdGeholt")}</p>
      ) : staende.length < 2 ? (
        <div className="p-5">
          <Hinweis>{t("vergleich.zuWenige")}</Hinweis>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
            <Vergleichsseite
              stand={linkerStand}
              geladen={linkerStand ? (inhalte[linkerStand.id] ?? null) : null}
              lupe={lupe}
              mitte={mitte}
              onSchieben={schieben}
              zeit={zeit}
              zahl={zahl}
              kannFrueher={links < staende.length - 1}
              kannSpaeter={links > 0}
              onFrueher={() => setLinks((i) => Math.min(staende.length - 1, i + 1))}
              onSpaeter={() => setLinks((i) => Math.max(0, i - 1))}
              onWiederherstellen={onWiederherstellen ? wiederherstellen : undefined}
              holtGerade={holtGerade}
            />
            <Vergleichsseite
              stand={rechterStand}
              geladen={rechterStand ? (inhalte[rechterStand.id] ?? null) : null}
              lupe={lupe}
              mitte={mitte}
              onSchieben={schieben}
              zeit={zeit}
              zahl={zahl}
              kannFrueher={rechts < staende.length - 1}
              kannSpaeter={rechts > 0}
              onFrueher={() => setRechts((i) => Math.min(staende.length - 1, i + 1))}
              onSpaeter={() => setRechts((i) => Math.max(0, i - 1))}
              onWiederherstellen={onWiederherstellen ? wiederherstellen : undefined}
              holtGerade={holtGerade}
            />
          </div>

          {unterschied ? (
            <footer className="shrink-0 border-t border-linie px-4 py-3 text-[1.05rem]">
              {unterschied.farben === 0 && (unterschied.groesse ?? 0) === 0
                ? t("vergleich.gleich")
                : [
                    unterschied.farben !== 0
                      ? t(
                          unterschied.farben > 0
                            ? "vergleich.mehrFarben"
                            : "vergleich.wenigerFarben",
                          { anzahl: zahl(Math.abs(unterschied.farben)) },
                        )
                      : null,
                    unterschied.groesse
                      ? t(
                          unterschied.groesse > 0 ? "vergleich.breiter" : "vergleich.schmaler",
                          { anzahl: zahl(Math.abs(unterschied.groesse)) },
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </footer>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * Eine der beiden Hälften: oben das Muster, darunter, was es ist, und die
 * beiden Knöpfe zum Blättern.
 */
function Vergleichsseite({
  stand,
  geladen,
  lupe,
  mitte,
  onSchieben,
  zeit,
  zahl,
  kannFrueher,
  kannSpaeter,
  onFrueher,
  onSpaeter,
  onWiederherstellen,
  holtGerade,
}: {
  stand: Stand | null;
  geladen: Geladen | null;
  lupe: number;
  mitte: { x: number; y: number };
  onSchieben: (dx: number, dy: number) => void;
  zeit: (iso: string) => string;
  zahl: (n: number) => string;
  kannFrueher: boolean;
  kannSpaeter: boolean;
  onFrueher: () => void;
  onSpaeter: () => void;
  onWiederherstellen?: (stand: Stand) => Promise<void>;
  holtGerade: boolean;
}) {
  const { t } = useSprache();
  const flaeche = useRef<HTMLDivElement>(null);
  const [masse, setMasse] = useState({ breite: 0, hoehe: 0 });
  const letzterZeiger = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = flaeche.current;
    if (!el) return;
    const messen = () => setMasse({ breite: el.clientWidth, hoehe: el.clientHeight });
    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);

  // Eingepasst heißt: das ganze Muster ist zu sehen. Alles darüber ist die
  // Lupe, und die gilt für beide Seiten gleichermaßen.
  const grund =
    geladen && masse.breite > 0 && masse.hoehe > 0
      ? Math.min(masse.breite / geladen.breite, masse.hoehe / geladen.hoehe)
      : 0;
  const zoom = Math.max(0.5, grund * lupe);
  const bildBreite = geladen ? geladen.breite * zoom : 0;
  const bildHoehe = geladen ? geladen.hoehe * zoom : 0;

  // Der Punkt (mitte.x, mitte.y) des Musters soll in der Mitte der Fläche
  // liegen. Passt das Muster ganz hinein, wird es einfach zentriert.
  const versatzX =
    bildBreite <= masse.breite
      ? (masse.breite - bildBreite) / 2
      : Math.min(0, Math.max(masse.breite - bildBreite, masse.breite / 2 - mitte.x * bildBreite));
  const versatzY =
    bildHoehe <= masse.hoehe
      ? (masse.hoehe - bildHoehe) / 2
      : Math.min(0, Math.max(masse.hoehe - bildHoehe, masse.hoehe / 2 - mitte.y * bildHoehe));

  const kannSchieben = bildBreite > masse.breite || bildHoehe > masse.hoehe;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div
        ref={flaeche}
        className={`relative min-h-[220px] flex-1 overflow-hidden rounded-xl border border-linie bg-hinweis ${
          kannSchieben ? "cursor-grab touch-none" : ""
        }`}
        onPointerDown={(e) => {
          if (!kannSchieben) return;
          letzterZeiger.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const vorher = letzterZeiger.current;
          if (!vorher || !kannSchieben) return;
          onSchieben(
            (vorher.x - e.clientX) / Math.max(1, bildBreite),
            (vorher.y - e.clientY) / Math.max(1, bildHoehe),
          );
          letzterZeiger.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => {
          letzterZeiger.current = null;
        }}
        onPointerCancel={() => {
          letzterZeiger.current = null;
        }}
      >
        {geladen && stand ? (
          <div
            className="absolute left-0 top-0"
            style={{ transform: `translate(${versatzX}px, ${versatzY}px)` }}
          >
            <Rasteransicht
              breite={geladen.breite}
              hoehe={geladen.hoehe}
              raster={geladen.raster}
              palette={geladen.palette}
              zoom={zoom}
              mitLinien={zoom >= 8}
              beschriftung={t("staende.vorschauBeschriftung", { zeit: zeit(stand.angelegtAm) })}
            />
          </div>
        ) : (
          <p className="p-4 text-[1.05rem] text-gedaempft">{t("allgemein.wirdGeholt")}</p>
        )}
      </div>

      {stand ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[1.05rem] font-bold leading-tight">{zeit(stand.angelegtAm)}</p>
            <p className="text-[0.95rem] text-gedaempft">
              {t("vergleich.angaben", {
                farben: zahl(stand.farben),
                breite: zahl(stand.breite ?? geladen?.breite ?? 0),
                hoehe: zahl(stand.hoehe ?? geladen?.hoehe ?? 0),
              })}
              {" · "}
              {stand.gemerkt ? t("staende.gemerkt") : t(stand.beschriftung)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Knopf klein onClick={onFrueher} disabled={!kannFrueher}>
              {t("vergleich.frueher")}
            </Knopf>
            <Knopf klein onClick={onSpaeter} disabled={!kannSpaeter}>
              {t("vergleich.spaeter")}
            </Knopf>
            {onWiederherstellen ? (
              <Knopf klein onClick={() => onWiederherstellen(stand)} disabled={holtGerade}>
                {t("vergleich.nehmen")}
              </Knopf>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
