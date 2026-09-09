"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Seite } from "@/components/Seite";
import { Abschnitt } from "@/components/Abschnitt";
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
import { garnlaengeMeter, meterText } from "@/lib/druck/garnverbrauch";
import type { Textschluessel } from "@/lib/sprache/texte";
import { useMuster } from "@/lib/zustand/MusterProvider";
import { cmText, sticheInCm } from "@/lib/muster/typen";
import {
  allesWiederSticken,
  ausschnittEinsetzen,
  ausschnittHerausloesen,
  auswahlFuellen,
  auswahlNichtSticken,
  drehen90,
  freieFelder,
  freihandAuswahl,
  gleicheFlaecheAuswaehlen,
  linieFelder,
  nurAuswahlSticken,
  paletteNachzaehlen,
  rechteckAuswaehlen,
  spiegelnSenkrecht,
  spiegelnWaagerecht,
  type Ausschnitt,
  type Auswahl,
} from "@/lib/muster/raster";
import {
  AEHNLICHKEITSSTUFEN,
  STANDARD_AEHNLICHKEIT,
  auswahlVereinen,
  motivAuswaehlen,
  stufeBegrenzen,
} from "@/lib/muster/motivsuche";
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
  const [werkzeug, setWerkzeug] = useState<Werkzeug>("motiv");
  const [farbe, setFarbe] = useState(0);
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null);
  /**
   * Für die automatische Motivauswahl: wie ähnlich eine Farbe der
   * angetippten sein muss, und wohin getippt wurde. Die Tipps werden
   * aufgehoben, damit „Mehr dazunehmen" die Auswahl neu rechnen kann,
   * ohne dass noch einmal getippt werden muss.
   */
  const [aehnlichkeit, setAehnlichkeit] = useState(STANDARD_AEHNLICHKEIT);
  const [tipps, setTipps] = useState<Array<{ x: number; y: number }>>([]);
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

  /**
   * Zu jedem Tipp die Fläche, die er ausgewählt hat.
   *
   * Damit lässt sich ein Element wieder abwählen, indem man es noch einmal
   * antippt: gesucht wird die Fläche, in der der Tipp liegt, und ihr Tipp
   * fällt heraus. Das gehört in ein Ref und nicht in den Zustand – es wird
   * nur beim nächsten Tipp gelesen und soll kein Neuzeichnen auslösen.
   */
  const teilmasken = useRef<Uint8Array[]>([]);

  /**
   * Die Auswahl aus allen angetippten Stellen neu rechnen.
   *
   * Aus den Tipps und der Stufe entsteht die Auswahl immer von Neuem, statt
   * sie schrittweise zu verändern. Nur so ändert „Weniger dazunehmen" die
   * Auswahl auch wieder zurück – wüchse sie nur, wäre der Weg eine
   * Einbahnstraße.
   */
  const motivWaehlen = useCallback(
    (punkte: Array<{ x: number; y: number }>, stufe: number) => {
      if (!muster || !raster || punkte.length === 0) {
        teilmasken.current = [];
        setAuswahl(null);
        return;
      }
      const masken: Uint8Array[] = [];
      let ergebnis: Auswahl | null = null;
      for (const punkt of punkte) {
        const teil = motivAuswaehlen(
          raster,
          muster.breite,
          muster.hoehe,
          muster.palette,
          punkt.x,
          punkt.y,
          stufe,
        );
        masken.push(teil.maske);
        ergebnis = ergebnis ? auswahlVereinen(ergebnis, teil, muster.breite) : teil;
      }
      teilmasken.current = masken;
      setAuswahl(ergebnis);
    },
    [muster, raster],
  );

  /**
   * Tipps und die dazu gerechneten Flächen zusammen vergessen.
   *
   * Beides muss immer gemeinsam verschwinden. Bliebe eine Fläche liegen,
   * ohne dass es den Tipp dazu noch gibt, dann träfe der nächste Tipp
   * darauf und wollte ein Element abwählen, das gar nicht mehr ausgewählt
   * ist – für die Nutzerin sähe es aus, als täte der Tipp nichts.
   */
  const tippsVergessen = useCallback(() => {
    teilmasken.current = [];
    setTipps([]);
  }, []);

  /** „Mehr dazunehmen" und „Weniger": eine Stufe weiter, Auswahl neu rechnen. */
  const aehnlichkeitAendern = (richtung: 1 | -1) => {
    const neueStufe = stufeBegrenzen(aehnlichkeit + richtung);
    if (neueStufe === aehnlichkeit) return;
    setAehnlichkeit(neueStufe);
    motivWaehlen(tipps, neueStufe);
  };

  /** Nichts mehr ausgewählt – auch die gemerkten Flächen sind dann hinfällig. */
  const auswahlAufheben = () => {
    setAuswahl(null);
    tippsVergessen();
  };

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
        case "motiv": {
          if (!e.beginn) return;
          // Jeder Tipp nimmt ein Element dazu. Wer auf ein schon
          // ausgewähltes tippt, nimmt es wieder heraus – dasselbe Tun in
          // beide Richtungen, ohne Schalter, den man erst finden muss.
          const feld = e.y * breite + e.x;
          const schonDrin = teilmasken.current.findIndex((maske) => maske[feld] === 1);
          const punkte =
            schonDrin >= 0
              ? tipps.filter((_, i) => i !== schonDrin)
              : [...tipps, { x: e.x, y: e.y }];
          setTipps(punkte);
          motivWaehlen(punkte, aehnlichkeit);
          return;
        }

        case "flaeche": {
          if (!e.beginn) return;
          // Ein anderes Auswahlwerkzeug setzt die Auswahl neu. Was die
          // Motivsuche sich gemerkt hat, gehört dann nicht mehr zu dem, was
          // auf der Leinwand umrandet ist.
          if (tipps.length > 0) tippsVergessen();
          setAuswahl(gleicheFlaecheAuswaehlen(raster, breite, e.x, e.y));
          return;
        }

        case "rechteck": {
          if (e.beginn) {
            rechteckStart.current = { x: e.x, y: e.y };
            if (tipps.length > 0) tippsVergessen();
          }
          const start = rechteckStart.current;
          if (!start) return;
          setAuswahl(rechteckAuswaehlen(breite, hoehe, start.x, start.y, e.x, e.y));
          if (!e.gedrueckt) rechteckStart.current = null;
          return;
        }

        case "freihand": {
          if (e.beginn) {
            spur.current = [];
            if (tipps.length > 0) tippsVergessen();
          }
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
    [
      muster,
      raster,
      vorschau,
      werkzeug,
      farbeSicher,
      malSpur,
      felderAendern,
      tipps,
      tippsVergessen,
      aehnlichkeit,
      motivWaehlen,
    ],
  );

  // Was auf der Leinwand steht: das zusammengeführte Raster, überlagert von
  // dem Pinselstrich, der gerade noch gezogen wird.
  const anzeigeRaster = useMemo(() => {
    if (!raster || !malSpur || malSpur.size === 0) return raster;
    const kopie = Uint8Array.from(raster);
    for (const [feld, wert] of malSpur) kopie[feld] = wert;
    return kopie;
  }, [raster, malSpur]);

  /**
   * Die Garnliste wird vor dem Anzeigen neu gezählt.
   *
   * Die Zahlen aus dem Worker gelten für das frisch erzeugte Muster. Wer von
   * Hand malt oder ein Motiv freistellt, ändert sie – und gerade dann muss
   * hier stehen, wie viel Garn wirklich gebraucht wird.
   */
  const paletteJetzt = useMemo(
    () => (muster && raster ? paletteNachzaehlen(muster.palette, raster) : []),
    [muster, raster],
  );

  /** Wie viele Felder bleiben frei, werden also nicht gestickt? */
  const freieStellen = useMemo(() => (raster ? freieFelder(raster) : 0), [raster]);

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
    tippsVergessen();
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

  /**
   * Freistellen: nur das Ausgewählte wird gestickt, alles andere bleibt
   * blanker Stoff.
   *
   * Es wird nichts gelöscht und nichts abgeschnitten – die Felder bekommen
   * nur den Vermerk „hier nicht sticken". Deshalb genügt hier auch keine
   * Rückfrage, sondern der Hinweis, dass ein Tipp auf „Rückgängig" alles
   * zurückholt. Das Muster behält seine Größe; nur das Motiv steht darin.
   */
  const nurAuswahlBehalten = () => {
    if (!auswahl || auswahl.anzahl === 0) return;
    const { indizes, werte } = nurAuswahlSticken(auswahl);
    if (indizes.length === 0) return;
    felderAendern("schrittname.freigestellt", indizes, werte);
    setAuswahl(null);
    tippsVergessen();
    setMeldung(t("editor.nurDasGestickt"));
  };

  /** Der umgekehrte Weg: genau das Ausgewählte bleibt frei. */
  const auswahlWeglassen = () => {
    if (!auswahl || auswahl.anzahl === 0) return;
    const { indizes, werte } = auswahlNichtSticken(auswahl);
    if (indizes.length === 0) return;
    felderAendern("schrittname.nichtGestickt", indizes, werte);
    setAuswahl(null);
    tippsVergessen();
    setMeldung(t("editor.auswahlWeggelassen"));
  };

  /** Alle freien Stellen wieder sticken. */
  const wiederAllesSticken = () => {
    if (!muster) return;
    const { indizes, werte } = allesWiederSticken(muster.bearbeitung);
    if (indizes.length === 0) return;
    felderAendern("schrittname.wiederGestickt", indizes, werte);
    setMeldung(t("editor.wiederAllesGestickt"));
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
    tippsVergessen();
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
        /* Die Maße stehen ab jetzt dauerhaft oben und nicht mehr in einem
           eigenen Kasten hinter einem Reiter. Sie ändern sich beim Arbeiten
           nicht und beantworten die häufigste Frage sofort. */
        <p className="text-[1.05rem] text-gedaempft">
          {t("editor.masse", {
            breite: String(muster.breite),
            hoehe: String(muster.hoehe),
            cmBreite: cmText(breiteCm, landeskennung),
            cmHoehe: cmText(hoeheCm, landeskennung),
            zaehlung: String(einstellungen.stoffzaehlung),
          })}
        </p>
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
      {/*
        Zwei Spalten: links die Arbeitsfläche mit dem Muster, rechts die
        Bedienung. Getrennt sind sie durch eine Haarlinie und nicht durch zwei
        gerahmte Kästen – der Bildschirm soll als ein Stück Arbeit lesbar sein
        und nicht als Stapel Karten.

        Die Bedienspalte ist mit 440 Punkten deutlich breiter als vorher. Bei
        360 Punkten brach jede zweite Beschriftung um („Weniger dazu- nehmen"),
        und die wichtigen Knöpfe rutschten unter den Rand. Der Platz war da,
        er lag nur ungenutzt neben der Leinwand.

        Unter 1024 Punkten Breite liegen beide untereinander; die Leinwand
        bekommt dann eine feste Höhe, damit die Bedienung darunter nicht auf
        einen Streifen zusammenschrumpft.
      */}
      <div className="flex h-full min-h-0 flex-col overflow-y-auto border-t border-linie lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:overflow-hidden">
        {/* --- Die Arbeitsfläche ------------------------------------------ */}
        <section className="flex min-h-0 shrink-0 flex-col lg:shrink">
          <div className="flex shrink-0 flex-wrap items-center gap-2 px-6 py-3">
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
              className="ml-4"
            >
              {mitSymbolen ? t("editor.symboleAus") : t("editor.symboleAn")}
            </Knopf>
          </div>

          <div
            ref={flaeche}
            className="grid h-[46vh] min-h-0 shrink-0 place-items-center overflow-auto px-6 pb-6 lg:h-auto lg:flex-1 lg:shrink"
          >
            {/* Das Muster liegt wie ein Blatt auf dem Tisch: feine Kante,
                weicher Schatten. Vorher stand es in einer weißen Karte, die
                bei einem hochkanten Muster links und rechts breite leere
                Flächen ließ – die Karte sah dann aus wie ein Fehler. */}
            <div className="w-fit border border-linie bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
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
          </div>
        </section>

        {/* --- Die Bedienung ---------------------------------------------- */}
        <aside className="flex min-h-0 flex-col border-t border-linie bg-white lg:border-t-0 lg:border-l">
          {fehler || eigenerFehler ? (
            <div className="shrink-0 border-b border-linie p-4">
              <Hinweis art="fehler">{t((fehler ?? eigenerFehler) as Textschluessel)}</Hinweis>
              <Knopf
                art="still"
                klein
                className="mt-1"
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
            <div className="shrink-0 border-b border-linie p-4">
              <Hinweis art="erfolg">{meldung}</Hinweis>
            </div>
          ) : null}

          {vorschau ? (
            /* Solange ein Stück eingesetzt wird, verdrängt es alles andere –
               es gibt dann genau eine Sache zu tun. */
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <Abschnitt titel={t("editor.stueckEinsetzen")} hinweis={t("editor.stueckSchieben")}>
                <div className="grid w-[220px] grid-cols-3 gap-2 self-center">
                  <span />
                  <Knopf art="neben" klein onClick={() => vorschauVerschieben(0, -1)}>
                    {t("editor.hoch")}
                  </Knopf>
                  <span />
                  <Knopf art="neben" klein onClick={() => vorschauVerschieben(-1, 0)}>
                    {t("editor.links")}
                  </Knopf>
                  <span />
                  <Knopf art="neben" klein onClick={() => vorschauVerschieben(1, 0)}>
                    {t("editor.rechts")}
                  </Knopf>
                  <span />
                  <Knopf art="neben" klein onClick={() => vorschauVerschieben(0, 1)}>
                    {t("editor.runter")}
                  </Knopf>
                  <span />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Knopf art="neben" klein onClick={vorschauDrehen}>
                    {t("editor.vierteldrehung")}
                  </Knopf>
                  <Knopf
                    art="neben"
                    klein
                    onClick={() =>
                      setVorschau((v) => (v ? { ...v, stueck: spiegelnWaagerecht(v.stueck) } : v))
                    }
                  >
                    {t("editor.spiegelnWaagerecht")}
                  </Knopf>
                  <Knopf
                    art="neben"
                    klein
                    onClick={() =>
                      setVorschau((v) => (v ? { ...v, stueck: spiegelnSenkrecht(v.stueck) } : v))
                    }
                  >
                    {t("editor.spiegelnSenkrecht")}
                  </Knopf>
                </div>
              </Abschnitt>

              <Abschnitt>
                <div className="flex flex-wrap gap-3">
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
              </Abschnitt>
            </div>
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
                  {/*
                    Die Auswahl steht oben, die Werkzeugliste darunter: wer ins
                    Muster tippt, will als Nächstes wissen, was ausgewählt ist
                    und was er damit tun kann. Das Werkzeug wählt man einmal,
                    die Auswahl bei jedem Tipp neu. Die Reihenfolge steht fest,
                    auch wenn nichts ausgewählt ist – ein Bereich, der die
                    Plätze tauscht, lässt die Knöpfe springen.
                  */}
                  <Abschnitt
                    titel={
                      auswahl && hatAuswahl
                        ? t("editor.ausgewaehlt", { anzahl: zahl(auswahl.anzahl) })
                        : t("editor.nichtsAusgewaehlt")
                    }
                    hinweis={
                      werkzeug === "motiv"
                        ? t("motivsuche.hinweis")
                        : hatAuswahl
                          ? undefined
                          : t("editor.tippenHinweis")
                    }
                  >
                    {werkzeug === "motiv" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Knopf
                          art="neben"
                          klein
                          onClick={() => aehnlichkeitAendern(1)}
                          disabled={
                            tipps.length === 0 || aehnlichkeit >= AEHNLICHKEITSSTUFEN.length - 1
                          }
                        >
                          {t("motivsuche.mehr")}
                        </Knopf>
                        <Knopf
                          art="neben"
                          klein
                          onClick={() => aehnlichkeitAendern(-1)}
                          disabled={tipps.length === 0 || aehnlichkeit <= 0}
                        >
                          {t("motivsuche.weniger")}
                        </Knopf>
                      </div>
                    ) : null}

                    {auswahl && auswahl.anzahl > 0.8 * muster.breite * muster.hoehe ? (
                      <div className="mt-3">
                        <Hinweis>{t("motivsuche.fastAlles")}</Hinweis>
                      </div>
                    ) : null}

                    {hatAuswahl ? (
                      <div className="mt-3 flex flex-col gap-2">
                        {/* Freistellen steht vorn und über die ganze Breite:
                            das ist der Grund, aus dem man ein Motiv auswählt. */}
                        <Knopf art="neben" onClick={nurAuswahlBehalten}>
                          {t("editor.nurDasSticken")}
                        </Knopf>
                        <Knopf art="neben" onClick={auswahlWeglassen}>
                          {t("editor.auswahlNichtSticken")}
                        </Knopf>
                        <div className="grid grid-cols-2 gap-2">
                          <Knopf art="neben" klein onClick={auswahlFaerben}>
                            {t("editor.auswahlFaerben")}
                          </Knopf>
                          <Knopf art="neben" klein onClick={auswahlKopieren}>
                            {t("editor.auswahlKopieren")}
                          </Knopf>
                          <Knopf
                            art="neben"
                            klein
                            onClick={() => {
                              setMotivName("");
                              setMotivNameOffen(true);
                            }}
                          >
                            {t("editor.alsMotivMerken")}
                          </Knopf>
                          <Knopf art="neben" klein onClick={auswahlAufheben}>
                            {t("editor.auswahlAufheben")}
                          </Knopf>
                        </div>
                      </div>
                    ) : null}
                  </Abschnitt>

                  {/* Sobald etwas freigestellt ist, muss der Weg zurück
                      sichtbar sein – und zwar nicht nur über „Rückgängig",
                      das nach ein paar weiteren Schritten nicht mehr
                      hinreicht. */}
                  {freieStellen > 0 ? (
                    <Abschnitt
                      titel={t("editor.freieFelderTitel")}
                      hinweis={t("editor.freieFelder", { anzahl: zahl(freieStellen) })}
                    >
                      <Knopf art="neben" onClick={wiederAllesSticken} className="w-full">
                        {t("editor.wiederAllesSticken")}
                      </Knopf>
                    </Abschnitt>
                  ) : null}

                  {zwischenablage ? (
                    <Abschnitt
                      titel={t("editor.kopiert")}
                      hinweis={t("editor.kopiertHinweis", {
                        w: String(zwischenablage.w),
                        h: String(zwischenablage.h),
                      })}
                    >
                      <Knopf
                        art="neben"
                        onClick={() => einfuegenStarten(zwischenablage)}
                        className="w-full"
                      >
                        {t("editor.kopieEinfuegen")}
                      </Knopf>
                    </Abschnitt>
                  ) : null}

                  <Abschnitt titel={t("werkzeug.frage")}>
                    <Werkzeugwahl gewaehlt={werkzeug} onWaehlen={setWerkzeug} />
                  </Abschnitt>
                </>
              ) : null}

              {bereich === "farbe" ? (
                <Abschnitt
                  titel={t("editor.ihreGarne", { anzahl: String(paletteJetzt.length) })}
                  hinweis={t("editor.farbeHinweis")}
                >
                  {/* Hier steht die volle Palette: dieser Bereich ist auch die
                      Farbauswahl zum Malen, und eine Farbe, die gerade nicht
                      im Muster vorkommt, muss trotzdem wählbar bleiben. Wie
                      viele Garne wirklich zu kaufen sind, sagt Schritt 4. */}
                  <Legende
                    palette={paletteJetzt}
                    gewaehlt={farbeSicher}
                    onWaehlen={setFarbe}
                    stoffzaehlung={einstellungen.stoffzaehlung}
                  />

                  {/* Ein Knopf statt eines je Zeile: gewechselt wird das Garn
                      der Farbe, die gerade gewählt ist. Er sagt auch gleich,
                      um welche das geht. */}
                  {alleGarne.length > 0 && paletteJetzt[farbeSicher] ? (
                    <Knopf
                      art="neben"
                      klein
                      className="mt-3 w-full"
                      onClick={() => setGarnwechsel(farbeSicher)}
                    >
                      {t("legende.anderesGarnFuer", {
                        garn: paletteJetzt[farbeSicher].garn
                          ? `${paletteJetzt[farbeSicher].garn?.marke} ${paletteJetzt[farbeSicher].garn?.code}`
                          : t("legende.eigeneFarbe"),
                      })}
                    </Knopf>
                  ) : null}
                  {freieStellen > 0 ? (
                    <p className="mt-3 text-[1rem] text-gedaempft">
                      {t("editor.freieFelder", { anzahl: zahl(freieStellen) })}
                    </p>
                  ) : null}
                  {/* Was und wie viel gekauft werden muss, steht damit schon
                      hier und nicht erst auf dem Ausdruck. */}
                  <p className="mt-3 border-t border-linie pt-3 text-[1rem] text-gedaempft">
                    {t("editor.garnbedarf", {
                      meter: meterText(
                        paletteJetzt.reduce(
                          (summe, e) =>
                            summe + garnlaengeMeter(e.stiche, einstellungen.stoffzaehlung),
                          0,
                        ),
                        landeskennung,
                      ),
                    })}
                  </p>
                </Abschnitt>
              ) : null}

              {bereich === "muster" ? (
                <>
                  <Abschnitt titel={t("glaettung.frage")}>
                    <Glaettungsregler
                      staerke={einstellungen.glaettungsstaerke}
                      kennzahlen={muster.kennzahlen}
                      laeuft={laeuft}
                      onAendern={glaettungSetzen}
                    />
                  </Abschnitt>
                  <Farbmeldung
                    vorher={muster.farbenVorher}
                    nachher={muster.farbenNachher}
                    zusammengelegt={muster.garneZusammengelegt}
                  />
                </>
              ) : null}

              {bereich === "merken" ? (
                <>
                  <Abschnitt titel={t("staende.titel")}>
                    <Staendeleiste
                      musterId={musterId}
                      aktuelleVersion={versionId}
                      neuLaden={standZaehler}
                      onWiederherstellen={standWiederherstellen}
                      onMerken={standGemerkt}
                    />
                  </Abschnitt>
                  <Abschnitt titel={t("motive.titel")}>
                    <Motivliste
                      motive={motive}
                      laedt={motiveLaufen}
                      onEinsetzen={motivEinsetzen}
                      onLoeschen={setMotivZumLoeschen}
                    />
                  </Abschnitt>
                </>
              ) : null}
            </Bereichswahl>
          )}
        </aside>
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
