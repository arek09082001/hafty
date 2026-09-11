"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Knopf } from "./Knopf";
import { Hinweis } from "./Hinweis";
import { Dialog } from "./Dialog";
import { Rasteransicht } from "./Rasteransicht";
import {
  staendeLaden,
  standHolen,
  standLoeschen,
  zeitpunktText,
  type Stand,
} from "@/lib/speicher/staende";
import { zusammenfuehren } from "@/lib/muster/raster";
import { useSprache } from "@/lib/sprache/SprachProvider";
import type { PalettenEintrag } from "@/lib/muster/typen";

/**
 * Alle Versionen eines Musters auf einen Blick.
 * ---------------------------------------------------------------------------
 *
 * Zuerst waren das zwei Fassungen nebeneinander, jede mit eigenen
 * Blätterknöpfen. Das war nicht zu bedienen: wer wissen will, welche der acht
 * Fassungen ihm gefällt, müsste sie paarweise durchgehen und dabei im Kopf
 * behalten, welche er schon gesehen hat. Zwei Bilder nebeneinander helfen,
 * wenn man die beiden schon kennt – nicht beim Suchen.
 *
 * Deshalb: **erst die Übersicht, dann das Einzelne.** Alle Versionen liegen
 * als Kacheln da, so wie Fotos auf dem Tisch. Man sieht auf einen Schlag, wo
 * es dunkler wurde, wo mehr Farben dazukamen, welche die schmale war. Ein
 * Tipp auf eine Kachel macht genau die groß, und dort geht es mit zwei
 * Knöpfen weiter durch die Reihe.
 *
 * Die Kacheln zeigen das gespeicherte Vorschaubild – es liegt neben jedem
 * Stand und ist sofort da. Erst die große Ansicht rechnet das volle Raster
 * aus, denn dort will man die Kästchen zählen können.
 */

/**
 * Wie hoch das Bild einer Kachel ist. Drei Stufen, mehr braucht niemand.
 *
 * Vorgegeben ist die **Höhe** und nicht die Breite: ein hochkantes Muster
 * wäre sonst bei der größten Stufe siebenhundert Punkte hoch, und von der
 * zweiten Reihe wäre nichts mehr zu sehen.
 */
const KACHELHOEHEN = [170, 260, 380] as const;

/** Vergrößerung in der großen Ansicht. 1 = ganzes Muster zu sehen. */
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
  onGeloescht,
}: {
  musterId: string | null;
  offen: boolean;
  onSchliessen: () => void;
  /** Fehlt sie, wird nur angesehen und nichts verändert. */
  onWiederherstellen?: (stand: Stand) => Promise<void> | void;
  /** Welche Version die gerade bearbeitete ist – sie wird gekennzeichnet. */
  startStandId?: string | null;
  /** Wird gerufen, wenn eine Version gelöscht wurde. */
  onGeloescht?: (standId: string) => void;
}) {
  const { t, zahl } = useSprache();

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

  /** Welche Version gerade groß zu sehen ist – sonst liegt die Übersicht da. */
  const [gross, setGross] = useState<number | null>(null);
  const [kachelStufe, setKachelStufe] = useState(1);
  const [lupeStufe, setLupeStufe] = useState(0);
  const [mitte, setMitte] = useState({ x: 0.5, y: 0.5 });
  const [holtGerade, setHoltGerade] = useState(false);
  /** Welche Version gerade zum Löschen angeboten wird – erst nach Rückfrage. */
  const [zumLoeschen, setZumLoeschen] = useState<Stand | null>(null);

  /**
   * Die schon geholten Raster der großen Ansicht. Sie bleiben liegen: ein
   * gespeicherter Stand ändert sich nie, und beim Durchblättern soll nichts
   * warten.
   */
  const [inhalte, setInhalte] = useState<Record<string, Geladen>>({});
  const angefasst = useRef(new Set<string>());

  const passt = geladen?.schluessel === schluessel;
  const staende = passt ? geladen.staende : null;
  const gingSchief = passt && !geladen.ging;

  /**
   * Das Seitenverhältnis der Kacheln kommt vom Muster selbst: alle Versionen
   * eines Bildes sind fast immer gleich geformt, und dann sitzt das
   * Vorschaubild randlos in seiner Kachel statt zwischen zwei leeren
   * Streifen. Kennt kein Stand seine Maße, bleibt es bei etwas hochkant –
   * Stickmuster sind meistens hochkant.
   */
  const mitMassen = staende?.find((s) => s.breite && s.hoehe);
  const kachelVerhaeltnis = mitMassen?.breite && mitMassen.hoehe
    ? Math.min(2, Math.max(0.5, mitMassen.breite / mitMassen.hoehe))
    : 1 / 1.15;

  const zeit = (iso: string) => zeitpunktText(iso, t);

  // --- Die Stände des Projekts holen ---------------------------------------
  useEffect(() => {
    if (!offen || !musterId) return;
    let abgebrochen = false;
    staendeLaden(musterId)
      .then((liste) => {
        if (abgebrochen) return;
        setGeladen({ schluessel: musterId, staende: liste, ging: true });
        setGross(null);
        setLupeStufe(0);
        setMitte({ x: 0.5, y: 0.5 });
      })
      .catch(() => {
        if (!abgebrochen) setGeladen({ schluessel: musterId, staende: [], ging: false });
      });
    return () => {
      abgebrochen = true;
    };
  }, [offen, musterId]);

  // --- Für die große Ansicht das volle Raster holen -------------------------
  const grosserStand = gross !== null ? (staende?.[gross] ?? null) : null;

  useEffect(() => {
    if (!offen || !grosserStand || angefasst.current.has(grosserStand.id)) return;
    const stand = grosserStand;
    angefasst.current.add(stand.id);
    let abgebrochen = false;

    standHolen(stand)
      .then((inhalt) => {
        if (abgebrochen) return;
        if (!inhalt) {
          angefasst.current.delete(stand.id);
          return;
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
      })
      .catch(() => {
        angefasst.current.delete(stand.id);
      });

    return () => {
      abgebrochen = true;
    };
  }, [offen, grosserStand]);

  async function loeschen() {
    const stand = zumLoeschen;
    setZumLoeschen(null);
    if (!stand || !musterId) return;
    const geklappt = await standLoeschen(stand.id);
    if (!geklappt) return;
    onGeloescht?.(stand.id);

    // Die Liste neu holen und zurück in die Übersicht: die große Ansicht
    // zeigte sonst eine Version, die es nicht mehr gibt.
    const liste = await staendeLaden(musterId);
    setGeladen({ schluessel: musterId, staende: liste, ging: true });
    setGross(null);
  }

  async function wiederherstellen(stand: Stand) {
    if (!onWiederherstellen) return;
    setHoltGerade(true);
    await onWiederherstellen(stand);
    setHoltGerade(false);
    onSchliessen();
  }

  if (!offen) return null;

  /**
   * Die Angaben unter jeder Kachel und in der großen Ansicht. Sind die Maße
   * ausnahmsweise nicht zu ermitteln, steht dort nur die Farbzahl – „0 × 0
   * Stiche" wäre schlicht gelogen.
   */
  const angaben = (stand: Stand, breiteErsatz?: number, hoeheErsatz?: number) => {
    const breite = stand.breite ?? breiteErsatz ?? 0;
    const hoehe = stand.hoehe ?? hoeheErsatz ?? 0;
    if (breite <= 0 || hoehe <= 0) return t("vergleich.nurFarben", { farben: zahl(stand.farben) });
    return t("vergleich.angaben", {
      farben: zahl(stand.farben),
      breite: zahl(breite),
      hoehe: zahl(hoehe),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-papier">
      {gingSchief ? (
        <>
          <Kopf titel={t("vergleich.titel")} onSchliessen={onSchliessen} t={t} />
          <div className="p-5">
            <Hinweis art="fehler">{t("staende.fehlerLaden")}</Hinweis>
          </div>
        </>
      ) : !staende ? (
        <>
          <Kopf titel={t("vergleich.titel")} onSchliessen={onSchliessen} t={t} />
          <p className="p-5 text-[1.05rem] text-gedaempft">{t("staende.wirdGeholt")}</p>
        </>
      ) : grosserStand ? (
        // ------------------------------------------------------------------
        // Eine Version groß
        // ------------------------------------------------------------------
        <GrosseAnsicht
          stand={grosserStand}
          geladen={inhalte[grosserStand.id] ?? null}
          nummer={staende.length - (gross ?? 0)}
          gesamt={staende.length}
          lupe={LUPE_STUFEN[lupeStufe]}
          mitte={mitte}
          onSchieben={(dx, dy) =>
            setMitte((m) => ({
              x: Math.min(1, Math.max(0, m.x + dx)),
              y: Math.min(1, Math.max(0, m.y + dy)),
            }))
          }
          kannKleiner={lupeStufe > 0}
          kannGroesser={lupeStufe < LUPE_STUFEN.length - 1}
          onKleiner={() => setLupeStufe((s) => Math.max(0, s - 1))}
          onGroesser={() => setLupeStufe((s) => Math.min(LUPE_STUFEN.length - 1, s + 1))}
          onEinpassen={() => {
            setLupeStufe(0);
            setMitte({ x: 0.5, y: 0.5 });
          }}
          kannFrueher={(gross ?? 0) < staende.length - 1}
          kannSpaeter={(gross ?? 0) > 0}
          onFrueher={() => {
            setGross((i) => Math.min(staende.length - 1, (i ?? 0) + 1));
            setMitte({ x: 0.5, y: 0.5 });
          }}
          onSpaeter={() => {
            setGross((i) => Math.max(0, (i ?? 0) - 1));
            setMitte({ x: 0.5, y: 0.5 });
          }}
          onZurueck={() => setGross(null)}
          onSchliessen={onSchliessen}
          onNehmen={onWiederherstellen ? wiederherstellen : undefined}
          onLoeschen={staende.length > 1 ? () => setZumLoeschen(grosserStand) : undefined}
          holtGerade={holtGerade}
          angaben={angaben}
          zeit={zeit}
          istAktuell={grosserStand.id === startStandId}
          t={t}
        />
      ) : (
        // ------------------------------------------------------------------
        // Die Übersicht: alle Versionen als Kacheln
        // ------------------------------------------------------------------
        <>
          <Kopf
            titel={t("vergleich.titel")}
            erklaerung={t("vergleich.erklaerung")}
            onSchliessen={onSchliessen}
            t={t}
          >
            <Knopf
              klein
              onClick={() => setKachelStufe((s) => Math.max(0, s - 1))}
              disabled={kachelStufe === 0}
            >
              {t("vergleich.lupeKleiner")}
            </Knopf>
            <Knopf
              klein
              onClick={() => setKachelStufe((s) => Math.min(KACHELHOEHEN.length - 1, s + 1))}
              disabled={kachelStufe === KACHELHOEHEN.length - 1}
            >
              {t("vergleich.lupeGroesser")}
            </Knopf>
          </Kopf>

          {staende.length === 0 ? (
            <div className="p-5">
              <Hinweis>{t("staende.nochKeine")}</Hinweis>
            </div>
          ) : (
            <ul
              className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto p-5"
              style={{
                // Die Spalte muss so breit sein, wie die Kachel in der Form
                // des Musters wird – sonst stutzt `max-w-full` ein
                // querformatiges Bild und die Form stimmt nicht mehr. Und nie
                // schmaler als 190 Punkte: darunter zerbricht die
                // Beschriftung darunter in Wortfetzen.
                gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(
                  190,
                  Math.round(KACHELHOEHEN[kachelStufe] * kachelVerhaeltnis + 32),
                )}px, 1fr))`,
              }}
            >
              {staende.map((stand, i) => {
                const ist = stand.id === startStandId;
                return (
                  <li
                    key={stand.id}
                    className={`flex flex-col gap-2 rounded-xl border p-3 ${
                      ist ? "border-hauptaktion bg-gewaehlt" : "border-linie bg-white"
                    }`}
                  >
                    {/* Das Bild und seine Angaben sind der Weg hinein, der
                        Löschknopf steht daneben – ein Knopf im Knopf ginge
                        weder im Aufbau der Seite noch im Kopf der Nutzerin. */}
                    <button
                      type="button"
                      onClick={() => {
                        setGross(i);
                        setLupeStufe(0);
                        setMitte({ x: 0.5, y: 0.5 });
                      }}
                      className="flex w-full flex-col gap-2 rounded-lg text-left hover:opacity-90"
                    >
                      {/* Ein Rahmen in der Form des Musters: alle Kacheln
                          sind damit gleich hoch – sonst verrutschten in einer
                          Reihe die Beschriftungen gegeneinander – und das
                          Bild sitzt trotzdem randlos darin. */}
                      <span
                        className="mx-auto flex w-auto max-w-full items-center justify-center overflow-hidden rounded-lg border border-linie bg-hinweis"
                        style={{ height: KACHELHOEHEN[kachelStufe], aspectRatio: kachelVerhaeltnis }}
                      >
                        {stand.vorschauUrl ? (
                          /* h-full w-full mit object-contain: das Bild wird so
                             groß gezeigt, wie der Rahmen es zulässt, und bleibt
                             dabei ganz zu sehen. Ohne das blieb es in seiner
                             gespeicherten Größe von ein paar hundert Punkten
                             mitten in einer leeren Fläche liegen. */
                          <Image
                            src={stand.vorschauUrl}
                            alt=""
                            width={480}
                            height={480}
                            unoptimized
                            className="raster h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-[0.95rem] text-gedaempft">
                            {t("start.ohneBild")}
                          </span>
                        )}
                      </span>
                      <span className="block text-[1.05rem] font-bold leading-tight">
                        {zeit(stand.angelegtAm)}
                      </span>
                      <span className="block text-[0.95rem] text-gedaempft">
                        {angaben(stand)}
                      </span>
                      <span className="block text-[0.95rem] text-gedaempft">
                        {stand.gemerkt ? t("staende.gemerkt") : t(stand.beschriftung)}
                        {ist ? t("staende.sieArbeitenHier") : ""}
                      </span>
                    </button>

                    <Knopf
                      art="still"
                      klein
                      onClick={() => setZumLoeschen(stand)}
                      disabled={staende.length <= 1}
                      className="self-start"
                    >
                      {t("vergleich.loeschenKurz")}
                    </Knopf>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Dialog
        offen={zumLoeschen !== null}
        titel={t("vergleich.loeschenTitel")}
        text={
          zumLoeschen
            ? t("vergleich.loeschenText", { zeit: zeit(zumLoeschen.angelegtAm) })
            : undefined
        }
        bestaetigenText={t("allgemein.jaLoeschen")}
        bestaetigenArt="gefahr"
        abbrechenText={t("allgemein.behalten")}
        onBestaetigen={loeschen}
        onAbbrechen={() => setZumLoeschen(null)}
      />
    </div>
  );
}

/** Die Kopfzeile des Fensters: Überschrift links, Knöpfe rechts. */
function Kopf({
  titel,
  erklaerung,
  onSchliessen,
  children,
  t,
}: {
  titel: string;
  erklaerung?: string;
  onSchliessen: () => void;
  children?: React.ReactNode;
  t: (schluessel: Parameters<ReturnType<typeof useSprache>["t"]>[0]) => string;
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-linie px-4 py-3">
      <div>
        <h2 className="text-[1.3rem] font-bold leading-tight">{titel}</h2>
        {erklaerung ? <p className="text-[1rem] text-gedaempft">{erklaerung}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Knopf art="haupt" onClick={onSchliessen}>
          {t("vergleich.fertig")}
        </Knopf>
      </div>
    </header>
  );
}

/**
 * Eine Version über den ganzen Bildschirm.
 *
 * Hier wird aus den vollen Rasterdaten gezeichnet und nicht aus dem
 * Vorschaubildchen: wer eine Fassung groß ansieht, will die Kästchen sehen.
 * Weiter geht es mit „Frühere Version" und „Spätere Version" – dieselbe
 * Reihe wie in der Übersicht, nur eines nach dem anderen.
 */
function GrosseAnsicht({
  stand,
  geladen,
  nummer,
  gesamt,
  lupe,
  mitte,
  onSchieben,
  kannKleiner,
  kannGroesser,
  onKleiner,
  onGroesser,
  onEinpassen,
  kannFrueher,
  kannSpaeter,
  onFrueher,
  onSpaeter,
  onZurueck,
  onSchliessen,
  onNehmen,
  onLoeschen,
  holtGerade,
  angaben,
  zeit,
  istAktuell,
  t,
}: {
  stand: Stand;
  geladen: Geladen | null;
  nummer: number;
  gesamt: number;
  lupe: number;
  mitte: { x: number; y: number };
  onSchieben: (dx: number, dy: number) => void;
  kannKleiner: boolean;
  kannGroesser: boolean;
  onKleiner: () => void;
  onGroesser: () => void;
  onEinpassen: () => void;
  kannFrueher: boolean;
  kannSpaeter: boolean;
  onFrueher: () => void;
  onSpaeter: () => void;
  onZurueck: () => void;
  onSchliessen: () => void;
  onNehmen?: (stand: Stand) => Promise<void>;
  /** Fehlt sie, ist es die letzte Version – die bleibt. */
  onLoeschen?: () => void;
  holtGerade: boolean;
  angaben: (stand: Stand, breiteErsatz?: number, hoeheErsatz?: number) => string;
  zeit: (iso: string) => string;
  istAktuell: boolean;
  t: (schluessel: Parameters<ReturnType<typeof useSprache>["t"]>[0], werte?: Record<string, string>) => string;
}) {
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

  // Eingepasst heißt: das ganze Muster ist zu sehen. Alles darüber ist Lupe.
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
    <>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-linie px-4 py-3">
        <div>
          <h2 className="text-[1.3rem] font-bold leading-tight">{zeit(stand.angelegtAm)}</h2>
          <p className="text-[1rem] text-gedaempft">
            {t("vergleich.wievielte", { nummer: String(nummer), gesamt: String(gesamt) })}
            {" · "}
            {angaben(stand, geladen?.breite, geladen?.hoehe)}
            {" · "}
            {stand.gemerkt ? t("staende.gemerkt") : t(stand.beschriftung)}
            {istAktuell ? t("staende.sieArbeitenHier") : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Knopf klein onClick={onKleiner} disabled={!kannKleiner}>
            {t("vergleich.lupeKleiner")}
          </Knopf>
          <Knopf klein onClick={onGroesser} disabled={!kannGroesser}>
            {t("vergleich.lupeGroesser")}
          </Knopf>
          <Knopf klein onClick={onEinpassen}>
            {t("vergleich.einpassen")}
          </Knopf>
          <Knopf onClick={onZurueck}>{t("vergleich.zurueck")}</Knopf>
          <Knopf art="haupt" onClick={onSchliessen}>
            {t("vergleich.fertig")}
          </Knopf>
        </div>
      </header>

      <div
        ref={flaeche}
        className={`relative min-h-0 flex-1 overflow-hidden bg-hinweis ${
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
        {geladen ? (
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

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-linie px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <Knopf onClick={onFrueher} disabled={!kannFrueher}>
            {t("vergleich.frueher")}
          </Knopf>
          <Knopf onClick={onSpaeter} disabled={!kannSpaeter}>
            {t("vergleich.spaeter")}
          </Knopf>
        </div>
        <div className="flex flex-wrap gap-2">
          {onNehmen ? (
            <Knopf onClick={() => onNehmen(stand)} disabled={holtGerade || istAktuell}>
              {istAktuell ? t("vergleich.schonHier") : t("vergleich.nehmen")}
            </Knopf>
          ) : null}
          {onLoeschen ? (
            <Knopf art="still" onClick={onLoeschen}>
              {t("vergleich.loeschen")}
            </Knopf>
          ) : null}
        </div>
      </footer>
    </>
  );
}
