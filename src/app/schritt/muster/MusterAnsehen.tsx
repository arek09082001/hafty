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
import { legendeGarnSetzen, type GarnMitVorrat } from "@/lib/speicher/garne";
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
  const [eigenerFehler, setFehler] = useState<string | null>(null);
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
          setFehler(
            "Die Motive konnten nicht geholt werden. Bitte prüfen Sie Ihre Internetverbindung und laden Sie die Seite noch einmal.",
          );
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
              indizes.length > 1 ? "Stiche gemalt" : "Einen Stich gemalt",
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
          felderAendern("Fläche gefärbt", indizes, werte);
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
    setMeldung(
      `${auswahl.anzahl.toLocaleString("de-DE")} Stiche wurden kopiert. Tippen Sie jetzt auf „Kopie einfügen“.`,
    );
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
    setMeldung(
      "Schieben Sie das Stück mit dem Finger an die richtige Stelle. Erst „Hier einsetzen“ schreibt es fest.",
    );
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
    if (indizes.length > 0) felderAendern("Stück eingesetzt", indizes, werte);
    // Ein eingesetztes Motiv ist ein großer Schritt und wird gesichert.
    const warMotiv = vorschau.ausMotiv;
    setVorschau(null);
    setMeldung(null);
    if (warMotiv && indizes.length > 0) {
      window.setTimeout(() => void standAnlegen("Motiv eingesetzt"), 0);
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
    felderAendern("Auswahl gefärbt", indizes, werte);
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
      setMeldung(`Das Motiv „${gespeichert.name}“ ist gemerkt. Sie finden es rechts in der Liste.`);
    } else {
      fehlerSetzen(
        "Das Motiv konnte nicht gemerkt werden. Bitte prüfen Sie, ob Sie mit dem Internet verbunden sind, und versuchen Sie es dann noch einmal.",
      );
    }
  };

  const motivEinsetzen = async (motiv: Motiv) => {
    const stueck = await motivHolen(motiv);
    if (!stueck) {
      fehlerSetzen(
        "Dieses Motiv konnte nicht geholt werden. Bitte prüfen Sie Ihre Internetverbindung und tippen Sie noch einmal darauf.",
      );
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
      fehlerSetzen(
        "Dieser Stand konnte nicht geholt werden. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es noch einmal.",
      );
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
    setMeldung("Der frühere Stand ist wieder da.");
  };

  const standGemerkt = async () => {
    const geklappt = await standAnlegen("Von Hand gemerkt", true);
    setMeldung(
      geklappt
        ? "Dieser Stand ist gemerkt. Er bleibt Ihnen erhalten, auch wenn Sie noch viel weiterarbeiten."
        : null,
    );
    if (!geklappt) {
      fehlerSetzen(
        "Der Stand konnte nicht gemerkt werden. Bitte prüfen Sie, ob Sie mit dem Internet verbunden sind, und versuchen Sie es dann noch einmal.",
      );
    }
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
    setMeldung(`Diese Farbe ist jetzt ${garn.marke} ${garn.code} – ${garn.name}.`);

    if (musterId) {
      const gespeichert = await legendeGarnSetzen(
        musterId,
        garnwechsel,
        garn.id,
        alt.symbol,
        alt.stiche,
      );
      if (!gespeichert) {
        fehlerSetzen(
          "Die neue Garnfarbe konnte nicht gespeichert werden. Sie sehen sie hier, aber beim nächsten Öffnen ist wieder die alte da.",
        );
      }
    }
  };

  const motivWirklichLoeschen = async () => {
    if (!motivZumLoeschen) return;
    const weg = await motivLoeschen(motivZumLoeschen);
    if (weg) setMotive((liste) => liste.filter((m) => m.id !== motivZumLoeschen.id));
    else fehlerSetzen("Das Motiv konnte nicht gelöscht werden. Bitte versuchen Sie es noch einmal.");
    setMotivZumLoeschen(null);
  };

  // ---------------------------------------------------------------------

  if (!muster || !anzeigeRaster) {
    return (
      <Seite
        titel="Muster ansehen und ändern"
        erklaerung="Hier ist noch kein Muster."
        fuss={
          <KnopfLink art="haupt" gross href="/schritt/bild">
            Zurück zum Bild aussuchen
          </KnopfLink>
        }
      >
        <Hinweis>
          Es wurde noch kein Muster erstellt. Gehen Sie zurück zum ersten Schritt, suchen Sie ein
          Bild aus und tippen Sie dann auf „Muster erstellen“.
        </Hinweis>
      </Seite>
    );
  }

  const breiteCm = sticheInCm(muster.breite, einstellungen.stoffzaehlung);
  const hoeheCm = sticheInCm(muster.hoehe, einstellungen.stoffzaehlung);
  const hatAuswahl = (auswahl?.anzahl ?? 0) > 0;

  return (
    <Seite
      dicht
      titel="Muster ansehen und ändern"
      erklaerung={`${muster.breite} × ${muster.hoehe} Stiche – ${cmText(breiteCm)} cm × ${cmText(hoeheCm)} cm auf Aida ${einstellungen.stoffzaehlung}`}
      fuss={
        <>
          <div className="flex flex-wrap items-center gap-3">
            <KnopfLink art="neben" href="/schritt/einstellungen">
              Ein Schritt zurück
            </KnopfLink>
            <Knopf
              art="neben"
              onClick={rueckgaengig}
              disabled={!kannRueckgaengig}
              className="flex-col gap-0"
            >
              Rückgängig
              {letzterSchrittTitel ? (
                <span className="block text-[0.85rem] font-normal">{letzterSchrittTitel}</span>
              ) : null}
            </Knopf>
            <Knopf
              art="neben"
              onClick={wiederholen}
              disabled={!kannWiederholen}
              className="flex-col gap-0"
            >
              Wiederholen
              {naechsterSchrittTitel ? (
                <span className="block text-[0.85rem] font-normal">{naechsterSchrittTitel}</span>
              ) : null}
            </Knopf>
          </div>
          <KnopfLink art="haupt" gross href="/schritt/drucken">
            Weiter zum Drucken
          </KnopfLink>
        </>
      }
    >
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        {/* Links: die Leinwand */}
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Knopf art="neben" onClick={zoom.kleiner} disabled={!zoom.kannKleiner}>
              Kleiner
            </Knopf>
            <Knopf art="neben" onClick={zoom.groesser} disabled={!zoom.kannGroesser}>
              Größer
            </Knopf>
            <Knopf art="neben" onClick={ganzZeigen}>
              Alles zeigen
            </Knopf>
            <Knopf art="neben" onClick={() => setMitSymbolen((s) => !s)} aria-pressed={mitSymbolen}>
              Symbole {mitSymbolen ? "aus" : "an"}
            </Knopf>
          </div>

          <div
            ref={flaeche}
            className="grid min-h-0 flex-1 place-items-center overflow-auto rounded-2xl border-2 border-tinte bg-white p-3"
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
              beschriftung={`Ihr Zählmuster, ${muster.breite} mal ${muster.hoehe} Stiche`}
            />
          </div>
        </div>

        {/* Rechts: alles zum Arbeiten, für sich scrollbar */}
        <div ref={rechteSpalte} className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          {fehler || eigenerFehler ? (
            <div className="flex flex-col gap-3">
              <Hinweis art="fehler">{fehler ?? eigenerFehler}</Hinweis>
              <Knopf
                art="neben"
                onClick={() => {
                  fehlerSetzen(null);
                  setFehler(null);
                }}
              >
                Meldung schließen
              </Knopf>
            </div>
          ) : null}

          {meldung ? <Hinweis art="erfolg">{meldung}</Hinweis> : null}

          {/* Die Einfügevorschau verdrängt alles andere, solange sie liegt. */}
          {vorschau ? (
            <section className="flex flex-col gap-4 rounded-2xl border-2 border-warnung bg-white p-5">
              <h2 className="text-[1.3rem] font-bold">Stück einsetzen</h2>
              <p className="text-[1.05rem]">
                Schieben Sie das Stück mit dem Finger an die richtige Stelle oder rücken Sie es mit
                den Knöpfen weiter.
              </p>

              <div className="grid w-[220px] grid-cols-3 gap-2 self-center">
                <span />
                <Knopf art="neben" onClick={() => vorschauVerschieben(0, -1)} className="min-h-[56px]">
                  Hoch
                </Knopf>
                <span />
                <Knopf art="neben" onClick={() => vorschauVerschieben(-1, 0)} className="min-h-[56px]">
                  Links
                </Knopf>
                <span />
                <Knopf art="neben" onClick={() => vorschauVerschieben(1, 0)} className="min-h-[56px]">
                  Rechts
                </Knopf>
                <span />
                <Knopf art="neben" onClick={() => vorschauVerschieben(0, 1)} className="min-h-[56px]">
                  Runter
                </Knopf>
                <span />
              </div>

              <div className="flex flex-wrap gap-2">
                <Knopf art="neben" onClick={vorschauDrehen}>
                  Vierteldrehung
                </Knopf>
                <Knopf
                  art="neben"
                  onClick={() =>
                    setVorschau((v) => (v ? { ...v, stueck: spiegelnWaagerecht(v.stueck) } : v))
                  }
                >
                  Waagerecht spiegeln
                </Knopf>
                <Knopf
                  art="neben"
                  onClick={() =>
                    setVorschau((v) => (v ? { ...v, stueck: spiegelnSenkrecht(v.stueck) } : v))
                  }
                >
                  Senkrecht spiegeln
                </Knopf>
              </div>

              <div className="flex flex-wrap gap-3">
                <Knopf art="haupt" onClick={vorschauFestschreiben}>
                  Hier einsetzen
                </Knopf>
                <Knopf
                  art="neben"
                  onClick={() => {
                    setVorschau(null);
                    setMeldung(null);
                  }}
                >
                  Abbrechen
                </Knopf>
              </div>
            </section>
          ) : (
            <>
              <Werkzeugwahl gewaehlt={werkzeug} onWaehlen={setWerkzeug} />

              <section className="flex flex-col gap-3 rounded-2xl border-2 border-tinte bg-white p-5">
                <h2 className="text-[1.3rem] font-bold">
                  {auswahl && hatAuswahl
                    ? `${auswahl.anzahl.toLocaleString("de-DE")} Stiche ausgewählt`
                    : "Noch nichts ausgewählt"}
                </h2>
                {hatAuswahl ? (
                  <div className="flex flex-wrap gap-2">
                    <Knopf art="neben" onClick={auswahlFaerben}>
                      Auswahl färben
                    </Knopf>
                    <Knopf art="neben" onClick={auswahlKopieren}>
                      Auswahl kopieren
                    </Knopf>
                    <Knopf
                      art="neben"
                      onClick={() => {
                        setMotivName("");
                        setMotivNameOffen(true);
                      }}
                    >
                      Als Motiv merken
                    </Knopf>
                    <Knopf art="neben" onClick={() => setAuswahl(null)}>
                      Auswahl aufheben
                    </Knopf>
                  </div>
                ) : (
                  <p className="text-[1.05rem] text-gedaempft">
                    Tippen Sie mit dem gewählten Werkzeug ins Muster, dann erscheinen hier die
                    passenden Knöpfe.
                  </p>
                )}

                {zwischenablage ? (
                  <div className="mt-2 flex flex-col gap-2 rounded-xl bg-hinweis p-4">
                    <p className="text-[1.05rem]">
                      Sie haben ein Stück von {zwischenablage.w} × {zwischenablage.h} Stichen
                      kopiert.
                    </p>
                    <Knopf art="neben" onClick={() => einfuegenStarten(zwischenablage)}>
                      Kopie einfügen
                    </Knopf>
                  </div>
                ) : null}
              </section>

              <section className="flex flex-col gap-3 rounded-2xl border-2 border-tinte bg-white p-5">
                <h2 className="text-[1.3rem] font-bold">
                  Ihre Garne ({muster.palette.length})
                </h2>
                <p className="text-[1rem] text-gedaempft">
                  Die angetippte Farbe wird zum Malen und Färben verwendet.
                </p>
                <Legende
                  palette={muster.palette}
                  gewaehlt={farbeSicher}
                  onWaehlen={setFarbe}
                  onGarnAendern={alleGarne.length > 0 ? setGarnwechsel : undefined}
                />
              </section>

              <Glaettungsregler
                stufe={einstellungen.glaettung}
                kennzahlen={muster.kennzahlen}
                laeuft={laeuft}
                onAendern={glaettungSetzen}
              />

              <Motivliste
                motive={motive}
                laedt={motiveLaufen}
                onEinsetzen={motivEinsetzen}
                onLoeschen={setMotivZumLoeschen}
              />

              <Staendeleiste
                musterId={musterId}
                aktuelleVersion={versionId}
                neuLaden={standZaehler}
                onWiederherstellen={standWiederherstellen}
                onMerken={standGemerkt}
              />
            </>
          )}
        </div>
      </div>

      <Dialog
        offen={motivNameOffen}
        titel="Motiv merken"
        text="Geben Sie dem Motiv einen Namen, damit Sie es später wiederfinden."
        bestaetigenText="Motiv merken"
        onBestaetigen={motivMerken}
        onAbbrechen={() => setMotivNameOffen(false)}
      >
        <label htmlFor="motivname" className="mb-2 block text-[1.1rem] font-semibold">
          Name des Motivs
        </label>
        <input
          id="motivname"
          value={motivName}
          onChange={(e) => setMotivName(e.target.value)}
          placeholder="Zum Beispiel: Blütenblatt"
          className="min-h-[60px] w-full rounded-xl border-2 border-tinte bg-white px-4 text-[1.15rem]"
        />
      </Dialog>

      <Dialog
        offen={garnwechsel !== null}
        titel="Ein anderes Garn für diese Farbe"
        text="Die Farbwerte der Hersteller sind Näherungen. Wenn Sie Ihre Garnkarte vor sich haben und ein anderer Ton besser passt, wählen Sie ihn hier aus."
        bestaetigenText="Fenster schließen"
        nurSchliessen
        onBestaetigen={() => setGarnwechsel(null)}
        onAbbrechen={() => setGarnwechsel(null)}
      >
        <Garnwahl
          garne={alleGarne}
          markiert={(g) =>
            garnwechsel !== null && muster.palette[garnwechsel]?.garn?.id === g.id
          }
          markierungText="Jetzt gewählt"
          onWaehlen={garnSetzen}
          hoehe="max-h-[40vh]"
        />
      </Dialog>

      <Dialog
        offen={motivZumLoeschen !== null}
        titel="Motiv wirklich löschen?"
        text={
          motivZumLoeschen
            ? `Das Motiv „${motivZumLoeschen.name}“ wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.`
            : ""
        }
        bestaetigenText="Ja, löschen"
        bestaetigenArt="gefahr"
        abbrechenText="Behalten"
        onBestaetigen={motivWirklichLoeschen}
        onAbbrechen={() => setMotivZumLoeschen(null)}
      />
    </Seite>
  );
}
