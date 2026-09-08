"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Dialog } from "@/components/Dialog";
import { Glaettungsregler } from "@/components/Glaettungsregler";
import { Legende } from "@/components/Legende";
import { Motivliste } from "@/components/Motivliste";
import { Staendeleiste } from "@/components/Staendeleiste";
import { Garnwahl } from "@/components/Garnwahl";
import { Rasteransicht, useZoom, type Zeigerereignis } from "@/components/Rasteransicht";
import { Werkzeugwahl, type Werkzeug } from "@/components/Werkzeugwahl";
import { Bereichswahl } from "@/components/Bereichswahl";
import { useSprache } from "@/lib/sprache/SprachProvider";
import { garnname } from "@/lib/farbe/farbwort";
import type { Textschluessel } from "@/lib/sprache/texte";
import { useMuster } from "@/lib/zustand/MusterProvider";
import { cmText, sticheInCm } from "@/lib/muster/typen";
import {
  ausschnittEinsetzen,
  ausschnittHerausloesen,
  auswahlFuellen,
  drehen90,
  freihandAuswahl,
  gleicheFlaecheAuswaehlen,
  linieFelder,
  rechteckAuswaehlen,
  spiegelnSenkrecht,
  spiegelnWaagerecht,
  type Ausschnitt,
  type Auswahl,
} from "@/lib/muster/raster";
import {
  motivHolen,
  motivLoeschen,
  motivSpeichern,
  motiveLaden,
  type Motiv,
} from "@/lib/speicher/motive";
import { standHolen, type Stand } from "@/lib/speicher/staende";
import type { GarnMitVorrat } from "@/lib/speicher/garne";
import { kennzahlenBerechnen } from "@/lib/muster/glaettung";
import { zusammenfuehren } from "@/lib/muster/raster";

export function MusterAnsehen() {
  const {
    muster,
    raster,
    einstellungen,
    glaettungSetzen,
    laeuft,
    fehler,
    fehlerSetzen,
    felderAendern,
    rueckgaengig,
    wiederholen,
    kannRueckgaengig,
    kannWiederholen,
    letzterSchrittTitel,
    naechsterSchrittTitel,
    musterId,
    versionId,
    standZaehler,
    standAnlegen,
    standUebernehmen,
    alleGarne,
    paletteErsetzen,
  } = useMuster();

  const { t, zahl, landeskennung } = useSprache();
  /** Welcher der vier Bereiche rechts gerade offen ist. */
  const [bereich, setBereich] = useState("werkzeug");
  const [werkzeug, setWerkzeug] = useState<Werkzeug>("flaeche");
  const [farbe, setFarbe] = useState(0);
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null);
  const [zwischenablage, setZwischenablage] = useState<Ausschnitt | null>(null);
  const [vorschau, setVorschau] = useState<{
    stueck: Ausschnitt;
    x: number;
    y: number;
    /** Motive lösen beim Einsetzen eine Sicherung aus, Kopien nicht. */
    ausMotiv: boolean;
  } | null>(null);
  const [mitSymbolen, setMitSymbolen] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);

  const [motive, setMotive] = useState<Motiv[]>([]);
  const [motiveLaufen, setMotiveLaufen] = useState(true);
  const [motivNameOffen, setMotivNameOffen] = useState(false);
  const [motivName, setMotivName] = useState("");
  const [motivZumLoeschen, setMotivZumLoeschen] = useState<Motiv | null>(null);
  /** Eigene Meldung dieser Seite, unabhängig vom Fehler aus dem Provider. */
  const [eigenerFehler, setFehler] = useState<Textschluessel | null>(null);
  /** Für welchen Palettenindex gerade ein anderes Garn gesucht wird. */
  const [garnwechsel, setGarnwechsel] = useState<number | null>(null);

  const zoom = useZoom(6);
  const flaeche = useRef<HTMLDivElement>(null);
  const rechteSpalte = useRef<HTMLDivElement>(null);
  const eingepasst = useRef(false);

  // Während eines Fingerzugs gesammelte Daten – nichts davon gehört in den
  // React-Zustand, weil es bei jedem Ereignis anfällt.
  const spur = useRef<Array<{ x: number; y: number }>>([]);
  const rechteckStart = useRef<{ x: number; y: number } | null>(null);
  const schiebeGriff = useRef<{ dx: number; dy: number } | null>(null);

  /**
   * Der gerade gezogene Pinselstrich, bevor er festgeschrieben wird. Er
   * gehört in den Zustand und nicht in ein Ref, weil er sofort zu sehen sein
   * muss – sonst malt die Nutzerin ins Blaue und sieht erst beim Loslassen,
   * was passiert ist. Festgeschrieben wird er beim Loslassen als **ein**
   * Rückgängig-Schritt.
   */
  const [malSpur, setMalSpur] = useState<Map<number, number> | null>(null);

  const { einpassen } = zoom;
  const ganzZeigen = useCallback(() => {
    const feld = flaeche.current;
    if (!feld || !muster) return;
    einpassen(feld.clientWidth - 24, feld.clientHeight - 24, muster.breite, muster.hoehe);
  }, [einpassen, muster]);

  useEffect(() => {
    if (eingepasst.current || !muster) return;
    eingepasst.current = true;
    ganzZeigen();
  }, [muster, ganzZeigen]);

  // Motive einmal holen.
  useEffect(() => {
    let abgebrochen = false;
    motiveLaden()
      .then((liste) => {
        if (!abgebrochen) setMotive(liste);
      })
      .catch(() => {
        if (!abgebrochen) {
          setFehler("motive.fehlerLaden");
        }
      })
      .finally(() => {
        if (!abgebrochen) setMotiveLaufen(false);
      });
    return () => {
      abgebrochen = true;
    };
  }, []);

  // Die gewählte Farbe muss es in der Palette geben – nach einem neuen
  // Durchlauf kann die Palette kleiner geworden sein. Deshalb wird sie beim
  // Lesen begrenzt und nicht in einem Effekt nachgeführt.
  const paletteLaenge = muster?.palette.length ?? 0;
  const farbeSicher = paletteLaenge > 0 ? Math.min(farbe, paletteLaenge - 1) : 0;

  // ---------------------------------------------------------------------
  // Zeigerbehandlung
  // ---------------------------------------------------------------------
  const zeiger = useCallback(
    (e: Zeigerereignis) => {
      if (!muster || !raster) return;
      const { breite, hoehe } = muster;

      // Liegt eine Einfügevorschau, verschiebt jeder Zug nur sie.
      if (vorschau) {
        if (e.beginn) {
          schiebeGriff.current = { dx: e.x - vorschau.x, dy: e.y - vorschau.y };
        }
        const griff = schiebeGriff.current ?? { dx: 0, dy: 0 };
        setVorschau((v) => (v ? { ...v, x: e.x - griff.dx, y: e.y - griff.dy } : v));
        return;
      }

      switch (werkzeug) {
        case "flaeche": {
          if (!e.beginn) return;
          setAuswahl(gleicheFlaecheAuswaehlen(raster, breite, e.x, e.y));
          return;
        }

        case "rechteck": {
          if (e.beginn) rechteckStart.current = { x: e.x, y: e.y };
          const start = rechteckStart.current;
          if (!start) return;
          setAuswahl(rechteckAuswaehlen(breite, hoehe, start.x, start.y, e.x, e.y));
          if (!e.gedrueckt) rechteckStart.current = null;
          return;
        }

        case "freihand": {
          if (e.beginn) spur.current = [];
          spur.current.push({ x: e.x, y: e.y });
          if (e.gedrueckt) {
            // Während des Ziehens nur die Spur zeigen, damit man sieht,
            // wo man schon war. Erst beim Loslassen wird das Innere gefüllt.
            const maske = new Uint8Array(breite * hoehe);
            let anzahl = 0;
            for (let i = 1; i < spur.current.length; i++) {
              for (const f of linieFelder(
                spur.current[i - 1].x,
                spur.current[i - 1].y,
                spur.current[i].x,
                spur.current[i].y,
              )) {
                if (f.x < 0 || f.y < 0 || f.x >= breite || f.y >= hoehe) continue;
                const feld = f.y * breite + f.x;
                if (!maske[feld]) anzahl++;
                maske[feld] = 1;
              }
            }
            setAuswahl({ maske, x0: 0, y0: 0, x1: breite - 1, y1: hoehe - 1, anzahl });
          } else {
            setAuswahl(freihandAuswahl(breite, hoehe, spur.current));
            spur.current = [];
          }
          return;
        }

        case "malen": {
          const bisher = e.beginn ? new Map<number, number>() : new Map(malSpur ?? []);
          const vorheriges = spur.current[spur.current.length - 1];
          const felder =
            vorheriges && !e.beginn
              ? linieFelder(vorheriges.x, vorheriges.y, e.x, e.y)
              : [{ x: e.x, y: e.y }];
          for (const f of felder) {
            if (f.x < 0 || f.y < 0 || f.x >= breite || f.y >= hoehe) continue;
            bisher.set(f.y * breite + f.x, farbeSicher);
          }
          spur.current = e.gedrueckt ? [{ x: e.x, y: e.y }] : [];

          if (e.gedrueckt) {
            setMalSpur(bisher);
          } else {
            const indizes = [...bisher.keys()];
            felderAendern(
              indizes.length > 1 ? "schrittname.gemalt" : "schrittname.einStichGemalt",
              indizes,
              indizes.map((i) => bisher.get(i) as number),
            );
            setMalSpur(null);
          }
          return;
        }

        case "fuellen": {
          if (!e.beginn) return;
          const flaecheAuswahl = gleicheFlaecheAuswaehlen(raster, breite, e.x, e.y);
          if (flaecheAuswahl.anzahl === 0) return;
          const { indizes, werte } = auswahlFuellen(flaecheAuswahl, farbeSicher);
          felderAendern("schrittname.flaecheGefaerbt", indizes, werte);
          return;
        }
      }
    },
    [muster, raster, vorschau, werkzeug, farbeSicher, malSpur, felderAendern],
  );

  // Was auf der Leinwand steht: das zusammengeführte Raster, überlagert von
  // dem Pinselstrich, der gerade noch gezogen wird.
  const anzeigeRaster = useMemo(() => {
    if (!raster || !malSpur || malSpur.size === 0) return raster;
    const kopie = Uint8Array.from(raster);
    for (const [feld, wert] of malSpur) kopie[feld] = wert;
    return kopie;
  }, [raster, malSpur]);

  // ---------------------------------------------------------------------
  // Aktionen
  // ---------------------------------------------------------------------
  const auswahlKopieren = () => {
    if (!muster || !raster || !auswahl || auswahl.anzahl === 0) return;
    const stueck = ausschnittHerausloesen(raster, muster.breite, auswahl, muster.palette);
    if (!stueck) return;
    setZwischenablage(stueck);
    setMeldung(t("editor.kopiertMeldung", { anzahl: zahl(auswahl.anzahl) }));
  };

  const einfuegenStarten = (stueck: Ausschnitt, ausMotiv = false) => {
    if (!muster) return;
    setVorschau({
      stueck,
      ausMotiv,
      x: Math.max(0, Math.floor((muster.breite - stueck.w) / 2)),
      y: Math.max(0, Math.floor((muster.hoehe - stueck.h) / 2)),
    });
    setAuswahl(null);
    setMeldung(t("editor.einsetzenMeldung"));
    // Die Knöpfe zum Einsetzen müssen sofort zu sehen sein.
    rechteSpalte.current?.scrollTo({ top: 0 });
  };

  const vorschauFestschreiben = () => {
    if (!muster || !vorschau) return;
    const { indizes, werte } = ausschnittEinsetzen(
      vorschau.stueck,
      muster.breite,
      muster.hoehe,
      vorschau.x,
      vorschau.y,
    );
    if (indizes.length > 0) felderAendern("schrittname.stueckEingesetzt", indizes, werte);
    // Ein eingesetztes Motiv ist ein großer Schritt und wird gesichert.
    const warMotiv = vorschau.ausMotiv;
    setVorschau(null);
    setMeldung(null);
    if (warMotiv && indizes.length > 0) {
      window.setTimeout(() => void standAnlegen("staende.motivEingesetzt"), 0);
    }
  };

  const vorschauVerschieben = (dx: number, dy: number) => {
    setVorschau((v) => (v ? { ...v, x: v.x + dx, y: v.y + dy } : v));
  };

  const vorschauDrehen = () => {
    setVorschau((v) => (v ? { ...v, stueck: drehen90(v.stueck) } : v));
  };

  const auswahlFaerben = () => {
    if (!auswahl || auswahl.anzahl === 0) return;
    const { indizes, werte } = auswahlFuellen(auswahl, farbeSicher);
    felderAendern("schrittname.auswahlGefaerbt", indizes, werte);
  };

  const motivMerken = async () => {
    if (!muster || !raster || !auswahl || auswahl.anzahl === 0) return;
    const stueck = ausschnittHerausloesen(raster, muster.breite, auswahl, muster.palette);
    if (!stueck) return;
    const gespeichert = await motivSpeichern(motivName.trim() || "Motiv", stueck);
    setMotivNameOffen(false);
    setMotivName("");
    if (gespeichert) {
      setMotive((liste) => [gespeichert, ...liste]);
      setMeldung(t("editor.motivGemerkt", { name: gespeichert.name }));
    } else {
      fehlerSetzen("motive.fehlerMerken");
    }
  };

  const motivEinsetzen = async (motiv: Motiv) => {
    const stueck = await motivHolen(motiv);
    if (!stueck) {
      fehlerSetzen("motive.fehlerHolen");
      return;
    }
    einfuegenStarten(stueck, true);
  };

  /**
   * Einen früheren Stand wiederherstellen. Der alte Stand wird zum Elternteil
   * des nächsten – die neuere Arbeit bleibt als eigener Zweig erhalten.
   */
  const standWiederherstellen = async (stand: Stand) => {
    if (!muster) return;
    const inhalt = await standHolen(stand);
    if (!inhalt) {
      fehlerSetzen("staende.fehlerHolen");
      return;
    }
    standUebernehmen(stand, {
      breite: inhalt.breite,
      hoehe: inhalt.hoehe,
      basis: inhalt.basis,
      bearbeitung: inhalt.bearbeitung,
      palette: inhalt.palette,
      kennzahlen: kennzahlenBerechnen(
        zusammenfuehren(inhalt.basis, inhalt.bearbeitung),
        inhalt.breite,
      ),
      farbenVorher: inhalt.palette.length,
      farbenNachher: inhalt.palette.length,
      garneZusammengelegt: 0,
      // Ein wiederhergestellter Stand gehört weiter zum selben Bild.
      bildKennung: muster.bildKennung,
    });
    setAuswahl(null);
    setMeldung(t("editor.standWiederher"));
  };

  const standGemerkt = async () => {
    const geklappt = await standAnlegen("staende.vonHandGemerkt", true);
    setMeldung(geklappt ? t("editor.standGemerkt") : null);
    if (!geklappt) fehlerSetzen("staende.fehlerMerken");
  };

  /**
   * Eine Farbe der Legende von Hand auf ein anderes Garn setzen.
   *
   * Die Hexwerte der Hersteller sind Näherungen. Wer die Garnkarte vor sich
   * hat, sieht manchmal, dass ein anderer Ton besser passt – deshalb muss
   * jede Farbe von Hand änderbar sein, und die Änderung bleibt erhalten.
   */
  const garnSetzen = async (garn: GarnMitVorrat) => {
    if (!muster || garnwechsel === null) return;
    const alt = muster.palette[garnwechsel];
    if (!alt) return;

    const neuePalette = muster.palette.map((eintrag) =>
      eintrag.index === garnwechsel
        ? {
            ...eintrag,
            hex: garn.hex,
            L: garn.L,
            a: garn.a,
            b: garn.b,
            garn: {
              id: garn.id,
              marke: garn.marke,
              code: garn.code,
              name: garn.name,
              hex: garn.hex,
              L: garn.L,
              a: garn.a,
              b: garn.b,
            },
          }
        : eintrag,
    );
    paletteErsetzen(neuePalette);
    setGarnwechsel(null);
    setMeldung(
      t("editor.garnGewechselt", {
        marke: garn.marke,
        code: garn.code,
        name: garnname(garn.name, garn.hex, t),
      }),
    );

    // Früher ging das gewechselte Garn zusätzlich in eine eigene Tabelle.
    // Das ist nicht mehr nötig: die Palette gehört zum Muster, wird laufend
    // mitgeschrieben und liegt in jedem gespeicherten Stand mit drin.
  };

  const motivWirklichLoeschen = async () => {
    if (!motivZumLoeschen) return;
    const weg = await motivLoeschen(motivZumLoeschen);
    if (weg) setMotive((liste) => liste.filter((m) => m.id !== motivZumLoeschen.id));
    else fehlerSetzen("motive.fehlerLoeschen");
    setMotivZumLoeschen(null);
  };

  // ---------------------------------------------------------------------

  if (!muster || !anzeigeRaster) {
    return (
      <Seite
        titel={t("editor.titel")}
        erklaerung={t("editor.keinMuster")}
        fuss={
          <KnopfLink art="haupt" gross href="/schritt/bild">
            {t("einst.zurueckBildAussuchen")}
          </KnopfLink>
        }
      >
        <Hinweis>{t("editor.keinMusterText")}</Hinweis>
      </Seite>
    );
  }

  const breiteCm = sticheInCm(muster.breite, einstellungen.stoffzaehlung);
  const hoeheCm = sticheInCm(muster.hoehe, einstellungen.stoffzaehlung);
  const hatAuswahl = (auswahl?.anzahl ?? 0) > 0;

  return (
    <Seite
      dicht
      titel={t("editor.titel")}
      kopfEnde={
        <div className="flex flex-wrap items-center gap-2">
          <Knopf art="neben" onClick={zoom.kleiner} disabled={!zoom.kannKleiner} klein>
            {t("editor.kleiner")}
          </Knopf>
          <Knopf art="neben" onClick={zoom.groesser} disabled={!zoom.kannGroesser} klein>
            {t("editor.groesser")}
          </Knopf>
          <Knopf art="neben" onClick={ganzZeigen} klein>
            {t("editor.allesZeigen")}
          </Knopf>
          <Knopf
            art="neben"
            onClick={() => setMitSymbolen((a) => !a)}
            aria-pressed={mitSymbolen}
            klein
          >
            {mitSymbolen ? t("editor.symboleAus") : t("editor.symboleAn")}
          </Knopf>
        </div>
      }
      fuss={
        <>
          <div className="flex flex-wrap items-center gap-3">
            <KnopfLink art="neben" href="/schritt/einstellungen">
              {t("editor.einSchrittZurueck")}
            </KnopfLink>
            <Knopf
              art="neben"
              onClick={rueckgaengig}
              disabled={!kannRueckgaengig}
              className="flex-col gap-0"
            >
              {t("editor.rueckgaengig")}
              {letzterSchrittTitel ? (
                <span className="block text-[0.85rem] font-normal">{t(letzterSchrittTitel)}</span>
              ) : null}
            </Knopf>
            <Knopf
              art="neben"
              onClick={wiederholen}
              disabled={!kannWiederholen}
              className="flex-col gap-0"
            >
              {t("editor.wiederholen")}
              {naechsterSchrittTitel ? (
                <span className="block text-[0.85rem] font-normal">{t(naechsterSchrittTitel)}</span>
              ) : null}
            </Knopf>
          </div>
          <KnopfLink art="haupt" gross href="/schritt/drucken">
            {t("editor.weiterDrucken")}
          </KnopfLink>
        </>
      }
    >
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        {/* Die Leinwand bekommt so viel Platz wie irgend möglich. */}
        <div
          ref={flaeche}
          className="grid min-h-0 place-items-center overflow-auto rounded-2xl border-2 border-tinte bg-white p-2"
        >
          <Rasteransicht
            breite={muster.breite}
            hoehe={muster.hoehe}
            raster={anzeigeRaster}
            palette={muster.palette}
            zoom={zoom.zoom}
            mitSymbolen={mitSymbolen}
            auswahl={auswahl?.maske ?? null}
            vorschau={
              vorschau
                ? {
                    x: vorschau.x,
                    y: vorschau.y,
                    w: vorschau.stueck.w,
                    h: vorschau.stueck.h,
                    daten: vorschau.stueck.daten,
                    maske: vorschau.stueck.maske,
                  }
                : null
            }
            onZeiger={zeiger}
            beschriftung={t("editor.leinwandBeschriftung", {
              breite: String(muster.breite),
              hoehe: String(muster.hoehe),
            })}
          />
        </div>

        {/* Rechts die Bedienung, in vier immer sichtbare Bereiche geteilt. */}
        <div ref={rechteSpalte} className="flex min-h-0 flex-col gap-3">
          {fehler || eigenerFehler ? (
            <div className="flex shrink-0 flex-col gap-2">
              <Hinweis art="fehler">{t((fehler ?? eigenerFehler) as Textschluessel)}</Hinweis>
              <Knopf
                art="neben"
                onClick={() => {
                  fehlerSetzen(null);
                  setFehler(null);
                }}
              >
                {t("allgemein.meldungSchliessen")}
              </Knopf>
            </div>
          ) : null}

          {meldung ? (
            <div className="shrink-0">
              <Hinweis art="erfolg">{meldung}</Hinweis>
            </div>
          ) : null}

          {vorschau ? (
            /* Solange ein Stück eingesetzt wird, verdrängt es alles andere –
               es gibt dann genau eine Sache zu tun. */
            <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-2xl border-2 border-warnung bg-white p-5">
              <h2 className="text-[1.3rem] font-bold">{t("editor.stueckEinsetzen")}</h2>
              <p className="text-[1.05rem]">{t("editor.stueckSchieben")}</p>

              <div className="grid w-[220px] grid-cols-3 gap-2 self-center">
                <span />
                <Knopf art="neben" onClick={() => vorschauVerschieben(0, -1)}>
                  {t("editor.hoch")}
                </Knopf>
                <span />
                <Knopf art="neben" onClick={() => vorschauVerschieben(-1, 0)}>
                  {t("editor.links")}
                </Knopf>
                <span />
                <Knopf art="neben" onClick={() => vorschauVerschieben(1, 0)}>
                  {t("editor.rechts")}
                </Knopf>
                <span />
                <Knopf art="neben" onClick={() => vorschauVerschieben(0, 1)}>
                  {t("editor.runter")}
                </Knopf>
                <span />
              </div>

              <div className="flex flex-wrap gap-2">
                <Knopf art="neben" onClick={vorschauDrehen}>
                  {t("editor.vierteldrehung")}
                </Knopf>
                <Knopf
                  art="neben"
                  onClick={() =>
                    setVorschau((v) => (v ? { ...v, stueck: spiegelnWaagerecht(v.stueck) } : v))
                  }
                >
                  {t("editor.spiegelnWaagerecht")}
                </Knopf>
                <Knopf
                  art="neben"
                  onClick={() =>
                    setVorschau((v) => (v ? { ...v, stueck: spiegelnSenkrecht(v.stueck) } : v))
                  }
                >
                  {t("editor.spiegelnSenkrecht")}
                </Knopf>
              </div>

              <div className="mt-auto flex flex-wrap gap-3">
                <Knopf art="haupt" onClick={vorschauFestschreiben}>
                  {t("editor.hierEinsetzen")}
                </Knopf>
                <Knopf
                  art="neben"
                  onClick={() => {
                    setVorschau(null);
                    setMeldung(null);
                  }}
                >
                  {t("allgemein.abbrechen")}
                </Knopf>
              </div>
            </section>
          ) : (
            <Bereichswahl
              bereiche={[
                { schluessel: "werkzeug", titel: t("bereich.werkzeug") },
                { schluessel: "farbe", titel: t("bereich.farbe") },
                { schluessel: "muster", titel: t("bereich.muster") },
                { schluessel: "merken", titel: t("bereich.merken") },
              ]}
              gewaehlt={bereich}
              onWaehlen={setBereich}
            >
              {bereich === "werkzeug" ? (
                <>
                  <Werkzeugwahl gewaehlt={werkzeug} onWaehlen={setWerkzeug} />

                  <section className="flex flex-col gap-3 rounded-2xl border-2 border-tinte bg-white p-5">
                    <h2 className="text-[1.2rem] font-bold">
                      {auswahl && hatAuswahl
                        ? t("editor.ausgewaehlt", { anzahl: zahl(auswahl.anzahl) })
                        : t("editor.nichtsAusgewaehlt")}
                    </h2>
                    {hatAuswahl ? (
                      <div className="flex flex-wrap gap-2">
                        <Knopf art="neben" onClick={auswahlFaerben}>
                          {t("editor.auswahlFaerben")}
                        </Knopf>
                        <Knopf art="neben" onClick={auswahlKopieren}>
                          {t("editor.auswahlKopieren")}
                        </Knopf>
                        <Knopf
                          art="neben"
                          onClick={() => {
                            setMotivName("");
                            setMotivNameOffen(true);
                          }}
                        >
                          {t("editor.alsMotivMerken")}
                        </Knopf>
                        <Knopf art="neben" onClick={() => setAuswahl(null)}>
                          {t("editor.auswahlAufheben")}
                        </Knopf>
                      </div>
                    ) : (
                      <p className="text-[1.05rem] text-gedaempft">{t("editor.tippenHinweis")}</p>
                    )}

                    {zwischenablage ? (
                      <div className="mt-2 flex flex-col gap-2 rounded-xl bg-hinweis p-4">
                        <p className="text-[1.05rem]">
                          {t("editor.kopiertHinweis", {
                            w: String(zwischenablage.w),
                            h: String(zwischenablage.h),
                          })}
                        </p>
                        <Knopf art="neben" onClick={() => einfuegenStarten(zwischenablage)}>
                          {t("editor.kopieEinfuegen")}
                        </Knopf>
                      </div>
                    ) : null}
                  </section>
                </>
              ) : null}

              {bereich === "farbe" ? (
                <section className="flex flex-col gap-3 rounded-2xl border-2 border-tinte bg-white p-5">
                  <h2 className="text-[1.2rem] font-bold">
                    {t("editor.ihreGarne", { anzahl: String(muster.palette.length) })}
                  </h2>
                  <p className="text-[1rem] text-gedaempft">{t("editor.farbeHinweis")}</p>
                  <Legende
                    palette={muster.palette}
                    gewaehlt={farbeSicher}
                    onWaehlen={setFarbe}
                    onGarnAendern={alleGarne.length > 0 ? setGarnwechsel : undefined}
                  />
                </section>
              ) : null}

              {bereich === "muster" ? (
                <>
                  {/* Die Maße stehen hier und nicht mehr in der Titelzeile –
                      so passen die Lupenknöpfe neben die Überschrift und das
                      Muster bekommt eine ganze Zeile Höhe mehr. */}
                  <section className="flex flex-col gap-1 rounded-2xl border-2 border-tinte bg-white p-5">
                    <p className="text-[1.5rem] font-bold leading-tight text-hauptaktion">
                      {cmText(breiteCm, landeskennung)} cm × {cmText(hoeheCm, landeskennung)} cm
                    </p>
                    <p className="text-[1.05rem] text-gedaempft">
                      {muster.breite} × {muster.hoehe} {t("allgemein.stiche")}, Aida{" "}
                      {einstellungen.stoffzaehlung}
                    </p>
                  </section>
                  <Farbmeldung
                    vorher={muster.farbenVorher}
                    nachher={muster.farbenNachher}
                    zusammengelegt={muster.garneZusammengelegt}
                  />
                  <Glaettungsregler
                    stufe={einstellungen.glaettung}
                    kennzahlen={muster.kennzahlen}
                    laeuft={laeuft}
                    onAendern={glaettungSetzen}
                  />
                </>
              ) : null}

              {bereich === "merken" ? (
                <>
                  <Staendeleiste
                    musterId={musterId}
                    aktuelleVersion={versionId}
                    neuLaden={standZaehler}
                    onWiederherstellen={standWiederherstellen}
                    onMerken={standGemerkt}
                  />
                  <Motivliste
                    motive={motive}
                    laedt={motiveLaufen}
                    onEinsetzen={motivEinsetzen}
                    onLoeschen={setMotivZumLoeschen}
                  />
                </>
              ) : null}
            </Bereichswahl>
          )}
        </div>
      </div>

      <Dialog
        offen={garnwechsel !== null}
        titel={t("editor.anderesGarnTitel")}
        text={t("editor.anderesGarnText")}
        bestaetigenText={t("allgemein.fensterSchliessen")}
        nurSchliessen
        onBestaetigen={() => setGarnwechsel(null)}
        onAbbrechen={() => setGarnwechsel(null)}
      >
        <Garnwahl
          garne={alleGarne}
          markiert={(g) => garnwechsel !== null && muster.palette[garnwechsel]?.garn?.id === g.id}
          markierungText={t("garne.jetztGewaehlt")}
          onWaehlen={garnSetzen}
          hoehe="max-h-[40vh]"
        />
      </Dialog>

      <Dialog
        offen={motivNameOffen}
        titel={t("editor.motivMerkenTitel")}
        text={t("editor.motivMerkenText")}
        bestaetigenText={t("editor.motivMerken")}
        onBestaetigen={motivMerken}
        onAbbrechen={() => setMotivNameOffen(false)}
      >
        <label htmlFor="motivname" className="mb-2 block text-[1.1rem] font-semibold">
          {t("editor.motivName")}
        </label>
        <input
          id="motivname"
          value={motivName}
          onChange={(e) => setMotivName(e.target.value)}
          placeholder={t("editor.motivNamePlatzhalter")}
          className="min-h-[60px] w-full rounded-xl border-2 border-tinte bg-white px-4 text-[1.15rem]"
        />
      </Dialog>

      <Dialog
        offen={motivZumLoeschen !== null}
        titel={t("editor.motivLoeschenTitel")}
        text={motivZumLoeschen ? t("editor.motivLoeschenText", { name: motivZumLoeschen.name }) : ""}
        bestaetigenText={t("allgemein.jaLoeschen")}
        bestaetigenArt="gefahr"
        abbrechenText={t("allgemein.behalten")}
        onBestaetigen={motivWirklichLoeschen}
        onAbbrechen={() => setMotivZumLoeschen(null)}
      />
    </Seite>
  );
}

/**
 * Wenn Farben verschwunden sind, wird das in einem ganzen Satz gesagt – die
 * Nutzerin soll nicht selbst nachzählen müssen.
 */
function Farbmeldung({
  vorher,
  nachher,
  zusammengelegt,
}: {
  vorher: number;
  nachher: number;
  zusammengelegt: number;
}) {
  const { t } = useSprache();
  if (nachher >= vorher) return null;

  return (
    <Hinweis>
      {t(zusammengelegt > 0 ? "editor.farbenZusammengelegt" : "editor.farbenWeggefallen", {
        vorher: String(vorher),
        nachher: String(nachher),
      })}
    </Hinweis>
  );
}
