"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Seite } from "@/components/Seite";
import { Abschnitt } from "@/components/Abschnitt";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Dialog } from "@/components/Dialog";
import { Glaettungsregler } from "@/components/Glaettungsregler";
import { Farbregler } from "@/components/Farbregler";
import { Legende } from "@/components/Legende";
import { Farbstreifen } from "@/components/Farbstreifen";
import { Motivliste } from "@/components/Motivliste";
import { Staendeleiste } from "@/components/Staendeleiste";
import { Vergleich } from "@/components/Vergleich";
import { Garnwahl } from "@/components/Garnwahl";
import { Arbeitsflaeche, useAnsicht, type Zeigerereignis } from "@/components/Arbeitsflaeche";
import {
  Werkzeugleiste,
  maltMitFarbe,
  waehltAus,
  werkzeugFinden,
  type Werkzeug,
} from "@/components/Werkzeugleiste";
import { Bereichswahl } from "@/components/Bereichswahl";
import { useMeldungen } from "@/components/Meldungen";
import { Auswahlbereich } from "@/components/Auswahlbereich";
import { useSprache } from "@/lib/sprache/SprachProvider";
import { garnname } from "@/lib/farbe/farbwort";
import { garnlaengeMeter, meterText } from "@/lib/druck/garnverbrauch";
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
  skalieren,
  skalierteMasse,
  spiegelnSenkrecht,
  spiegelnWaagerecht,
  STUECK_STUFEN,
  STUECK_STUFE_NORMAL,
  type Ausschnitt,
  type Auswahl,
} from "@/lib/muster/raster";
import {
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
    farbanzahlSetzen,
    laeuft,
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
    versionVergessen,
    alleGarne,
    paletteErsetzen,
  } = useMuster();

  const { t, zahl, landeskennung } = useSprache();
  /** Welcher der vier Bereiche rechts gerade offen ist. */
  const [bereich, setBereich] = useState("bearbeiten");
  /**
   * Ist die Erklärung über den Reitern aufgeklappt?
   *
   * Zugeklappt, solange niemand sie aufklappt. Auf einem Telefon nahm sie ein
   * Viertel der Bedienspalte ein, und die Regler weiter unten waren nur mit
   * viel Wischen zu erreichen. Die Überschrift bleibt stehen – sie sagt, mit
   * welchem Werkzeug gearbeitet wird; das Ausführliche kommt auf Tipp.
   *
   * Die Wahl bleibt für dieses Fenster erhalten: wer sie einmal aufklappt,
   * bekommt sie beim Werkzeugwechsel nicht wieder zugeklappt.
   */
  const [hinweisOffen, setHinweisOffen] = useState(false);
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
  /**
   * Das Stück, das gerade eingesetzt wird.
   *
   * Gehalten wird die **unskalierte** Quelle, dazu die Stufe. Gedreht und
   * gespiegelt wird die Quelle selbst – beides ist verlustfrei. Vergrößert
   * wird immer erst beim Anzeigen, aus der Quelle heraus: sonst rechnete
   * jeder Tipp auf „Größer" das schon Gerechnete noch einmal um, und nach
   * zweimal hin und her wäre aus dem Motiv ein Klotz geworden.
   */
  const [vorschau, setVorschau] = useState<{
    quelle: Ausschnitt;
    /** Stelle in STUECK_STUFEN. */
    stufe: number;
    x: number;
    y: number;
    /** Motive lösen beim Einsetzen eine Sicherung aus, Kopien nicht. */
    ausMotiv: boolean;
  } | null>(null);
  const [mitSymbolen, setMitSymbolen] = useState(false);
  const { melden, alleWeg } = useMeldungen();

  const [motive, setMotive] = useState<Motiv[]>([]);
  const [motiveLaufen, setMotiveLaufen] = useState(true);
  const [motivNameOffen, setMotivNameOffen] = useState(false);
  const [motivName, setMotivName] = useState("");
  const [motivZumLoeschen, setMotivZumLoeschen] = useState<Motiv | null>(null);
  /** Eigene Meldung dieser Seite, unabhängig vom Fehler aus dem Provider. */

  /** Für welchen Palettenindex gerade ein anderes Garn gesucht wird. */
  const [garnwechsel, setGarnwechsel] = useState<number | null>(null);
  /** Ob gerade zwei Stände nebeneinander liegen. */
  const [vergleichOffen, setVergleichOffen] = useState(false);

  const ansicht = useAnsicht(muster?.breite ?? 0, muster?.hoehe ?? 0);

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

  // Motive einmal holen.
  // Das Laden läuft genau einmal beim Öffnen. Damit der Fehlerfall trotzdem
  // die heutige Sprache erwischt, geht er über einen Ref und nicht über die
  // Abhängigkeiten – sonst lüde die Liste bei jedem Sprachwechsel neu.
  const meldenRef = useRef<() => void>(() => {});
  useEffect(() => {
    meldenRef.current = () => melden(t("motive.fehlerLaden"), "fehler");
  }, [melden, t]);

  useEffect(() => {
    let abgebrochen = false;
    motiveLaden()
      .then((liste) => {
        if (!abgebrochen) setMotive(liste);
      })
      .catch(() => {
        if (!abgebrochen) meldenRef.current();
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
  const auswahlAufheben = useCallback(() => {
    setAuswahl(null);
    tippsVergessen();
  }, [tippsVergessen]);

  /**
   * Escape räumt auf.
   *
   * Was markiert ist, ist auf dem Bildschirm blau umrandet, und wer damit
   * fertig ist, sucht den Weg zurück. „Auswahl aufheben" steht zwar in der
   * Spalte, aber nur wenn man im richtigen Reiter ist – Escape geht immer.
   *
   * Der Reihe nach: Liegt ein Stück zum Einsetzen bereit, ist **das** das
   * Vordringliche und wird abgebrochen; sonst fällt die Auswahl weg. Zwei
   * Dinge auf einmal wegzuräumen wäre für die Nutzerin nicht mehr
   * nachvollziehbar.
   *
   * Steht ein Fenster offen, gehört Escape dem Fenster (siehe `Dialog.tsx`) –
   * sonst schlösse ein einziger Tastendruck das Fenster und hübe zugleich
   * eine Auswahl auf, die man gar nicht gemeint hat. Dasselbe gilt, während
   * in einem Feld geschrieben wird.
   */
  const einFensterOffen =
    vergleichOffen || garnwechsel !== null || motivNameOffen || motivZumLoeschen !== null;

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || einFensterOffen) return;
      const ziel = e.target as HTMLElement | null;
      if (ziel && (ziel.tagName === "INPUT" || ziel.tagName === "TEXTAREA" || ziel.isContentEditable)) {
        return;
      }
      if (vorschau) {
        setVorschau(null);
        alleWeg();
        return;
      }
      auswahlAufheben();
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [einFensterOffen, vorschau, auswahlAufheben, alleWeg]);

  /**
   * Ein anderes Werkzeug wählen.
   *
   * Dabei springt die Bedienspalte auf „Bearbeiten": dort stehen die Knöpfe,
   * die zu dem neuen Werkzeug gehören. Wer in der Garnliste steht und den
   * Pinsel nimmt, will als Nächstes malen und nicht die Liste weiterlesen.
   */
  const werkzeugWaehlen = (neu: Werkzeug) => {
    setWerkzeug(neu);
    setBereich("bearbeiten");
  };

  // ---------------------------------------------------------------------
  // Zeigerbehandlung
  // ---------------------------------------------------------------------
  const zeiger = useCallback(
    (e: Zeigerereignis) => {
      if (!muster || !raster) return;
      const { breite, hoehe } = muster;

      // Ein abgebrochener Zug – zum Beispiel, weil ein zweiter Finger
      // dazugekommen ist und jetzt gezoomt wird – schreibt nichts fest.
      if (e.abbruch) {
        spur.current = [];
        rechteckStart.current = null;
        schiebeGriff.current = null;
        setMalSpur(null);
        if (werkzeug === "freihand" || werkzeug === "rechteck") setAuswahl(null);
        return;
      }

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
        case "schieben":
          // Das Schieben erledigt die Arbeitsfläche selbst.
          return;

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
    const kopie = Uint16Array.from(raster);
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

  /**
   * Das Stück, wie es gerade auf der Leinwand liegt: die Quelle auf der
   * gewählten Stufe. Gerechnet wird nur, wenn sich Quelle oder Stufe
   * ändern – beim bloßen Verschieben bleibt es dasselbe.
   */
  const vorschauQuelle = vorschau?.quelle ?? null;
  const vorschauStufe = vorschau?.stufe ?? STUECK_STUFE_NORMAL;
  const vorschauStueck = useMemo(
    () => (vorschauQuelle ? skalieren(vorschauQuelle, STUECK_STUFEN[vorschauStufe]) : null),
    [vorschauQuelle, vorschauStufe],
  );

  // ---------------------------------------------------------------------
  // Aktionen
  // ---------------------------------------------------------------------
  const auswahlKopieren = () => {
    if (!muster || !raster || !auswahl || auswahl.anzahl === 0) return;
    const stueck = ausschnittHerausloesen(raster, muster.breite, auswahl, muster.palette);
    if (!stueck) return;
    setZwischenablage(stueck);
    melden(t("editor.kopiertMeldung", { anzahl: zahl(auswahl.anzahl) }), "erfolg");
  };

  const einfuegenStarten = (stueck: Ausschnitt, ausMotiv = false) => {
    if (!muster) return;
    setVorschau({
      quelle: stueck,
      stufe: STUECK_STUFE_NORMAL,
      ausMotiv,
      x: Math.max(0, Math.floor((muster.breite - stueck.w) / 2)),
      y: Math.max(0, Math.floor((muster.hoehe - stueck.h) / 2)),
    });
    setAuswahl(null);
    tippsVergessen();
    melden(t("editor.einsetzenMeldung"));
  };

  const vorschauFestschreiben = () => {
    if (!muster || !vorschau || !vorschauStueck) return;
    const { indizes, werte } = ausschnittEinsetzen(
      vorschauStueck,
      muster.breite,
      muster.hoehe,
      vorschau.x,
      vorschau.y,
    );
    if (indizes.length > 0) felderAendern("schrittname.stueckEingesetzt", indizes, werte);
    // Ein eingesetztes Motiv ist ein großer Schritt und wird gesichert.
    const warMotiv = vorschau.ausMotiv;
    setVorschau(null);
    alleWeg();
    if (warMotiv && indizes.length > 0) {
      window.setTimeout(() => void standAnlegen("staende.motivEingesetzt"), 0);
    }
  };

  const vorschauDrehen = () => {
    setVorschau((v) => (v ? { ...v, quelle: drehen90(v.quelle) } : v));
  };

  /**
   * Eine Stufe größer oder kleiner.
   *
   * Das Stück wächst um seine Mitte herum und nicht von der linken oberen
   * Ecke aus – sonst rutschte es bei jedem Tipp vom Fleck, den man gerade
   * getroffen hat.
   */
  /**
   * Wächst darf ein Stück, solange es ins Muster passt – darüber wäre der
   * größte Teil davon ohnehin abgeschnitten. Zurück auf seine eigene Größe
   * kommt es aber immer: ein Motiv, das schon von Haus aus größer ist als
   * das Muster, ließe sich sonst verkleinern und nie wieder herstellen.
   */
  const stufeErlaubt = (stufe: number): boolean => {
    if (!vorschau || !muster) return false;
    if (stufe < 0 || stufe >= STUECK_STUFEN.length) return false;
    if (STUECK_STUFEN[stufe] <= 100) return true;
    const masse = skalierteMasse(vorschau.quelle, STUECK_STUFEN[stufe]);
    return masse.w <= muster.breite && masse.h <= muster.hoehe;
  };

  const kannStueckKleiner = vorschau ? stufeErlaubt(vorschau.stufe - 1) : false;
  const kannStueckGroesser = vorschau ? stufeErlaubt(vorschau.stufe + 1) : false;

  const vorschauSkalieren = (richtung: 1 | -1) => {
    setVorschau((v) => {
      if (!v) return v;
      const neu = v.stufe + richtung;
      if (neu < 0 || neu >= STUECK_STUFEN.length) return v;
      const alt = skalierteMasse(v.quelle, STUECK_STUFEN[v.stufe]);
      const jetzt = skalierteMasse(v.quelle, STUECK_STUFEN[neu]);
      return {
        ...v,
        stufe: neu,
        x: Math.round(v.x + (alt.w - jetzt.w) / 2),
        y: Math.round(v.y + (alt.h - jetzt.h) / 2),
      };
    });
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
    melden(t("editor.nurDasGestickt"), "erfolg");
  };

  /** Der umgekehrte Weg: genau das Ausgewählte bleibt frei. */
  const auswahlWeglassen = () => {
    if (!auswahl || auswahl.anzahl === 0) return;
    const { indizes, werte } = auswahlNichtSticken(auswahl);
    if (indizes.length === 0) return;
    felderAendern("schrittname.nichtGestickt", indizes, werte);
    setAuswahl(null);
    tippsVergessen();
    melden(t("editor.auswahlWeggelassen"), "erfolg");
  };

  /** Alle freien Stellen wieder sticken. */
  const wiederAllesSticken = () => {
    if (!muster) return;
    const { indizes, werte } = allesWiederSticken(muster.bearbeitung);
    if (indizes.length === 0) return;
    felderAendern("schrittname.wiederGestickt", indizes, werte);
    melden(t("editor.wiederAllesGestickt"), "erfolg");
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
      melden(t("editor.motivGemerkt", { name: gespeichert.name }), "erfolg");
    } else {
      melden(t("motive.fehlerMerken"), "fehler");
    }
  };

  const motivEinsetzen = async (motiv: Motiv) => {
    const stueck = await motivHolen(motiv);
    if (!stueck) {
      melden(t("motive.fehlerHolen"), "fehler");
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
      melden(t("staende.fehlerHolen"), "fehler");
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
    melden(t("editor.standWiederher"), "erfolg");
  };

  const standGemerkt = async () => {
    const geklappt = await standAnlegen("staende.vonHandGemerkt", true);
    if (geklappt) melden(t("editor.standGemerkt"), "erfolg");
    if (!geklappt) melden(t("staende.fehlerMerken"), "fehler");
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
    melden(
      t("editor.garnGewechselt", {
        marke: garn.marke,
        code: garn.code,
        name: garnname(garn.name, garn.hex, t),
      }),
      "erfolg",
    );

    // Früher ging das gewechselte Garn zusätzlich in eine eigene Tabelle.
    // Das ist nicht mehr nötig: die Palette gehört zum Muster, wird laufend
    // mitgeschrieben und liegt in jedem gespeicherten Stand mit drin.
  };

  const motivWirklichLoeschen = async () => {
    if (!motivZumLoeschen) return;
    const weg = await motivLoeschen(motivZumLoeschen);
    if (weg) setMotive((liste) => liste.filter((m) => m.id !== motivZumLoeschen.id));
    else melden(t("motive.fehlerLoeschen"), "fehler");
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
  const werkzeugJetzt = werkzeugFinden(werkzeug);
  const farbeJetzt = paletteJetzt.find((e) => e.index === farbeSicher) ?? paletteJetzt[0];
  const masse = t("editor.masse", {
    breite: String(muster.breite),
    hoehe: String(muster.hoehe),
    cmBreite: cmText(breiteCm, landeskennung),
    cmHoehe: cmText(hoeheCm, landeskennung),
    zaehlung: String(einstellungen.stoffzaehlung),
  });

  return (
    <Seite
      dicht
      ohneKopf
      titel={t("editor.titel")}
      fuss={
        /* Flach und in einer Zeile: was früher zweizeilige Knöpfe mit dem
           Namen des letzten Schrittes waren, steht jetzt in der Sprechblase
           am Knopf. Die Zeile darunter fehlte dem Muster. */
        <>
          <div className="flex flex-wrap items-center gap-2">
            <KnopfLink art="neben" klein href="/schritt/einstellungen">
              {t("editor.einSchrittZurueck")}
            </KnopfLink>
            <Knopf
              art="neben"
              klein
              onClick={rueckgaengig}
              disabled={!kannRueckgaengig}
              title={letzterSchrittTitel ? t(letzterSchrittTitel) : undefined}
            >
              {t("editor.rueckgaengig")}
            </Knopf>
            <Knopf
              art="neben"
              klein
              onClick={wiederholen}
              disabled={!kannWiederholen}
              title={naechsterSchrittTitel ? t(naechsterSchrittTitel) : undefined}
            >
              {t("editor.wiederholen")}
            </Knopf>
          </div>
          <KnopfLink art="haupt" href="/schritt/drucken">
            {t("editor.weiterDrucken")}
          </KnopfLink>
        </>
      }
    >
      {/*
        Drei Spalten: ganz links die Werkzeuge, in der Mitte die Arbeitsfläche
        mit dem Muster, rechts die Bedienung. Getrennt sind sie durch
        Haarlinien und nicht durch gerahmte Kästen – der Bildschirm soll als
        ein Stück Arbeit lesbar sein und nicht als Stapel Karten.

        Die Arbeitsfläche bekommt allen Platz, der übrig bleibt: sie hat keine
        eigene Kopfzeile mehr, keine Knopfleiste darüber und keine Rollbalken.
        Vergrößert und verschoben wird im Bild selbst.

        Unter 1024 Punkten Breite liegt alles untereinander: die Werkzeuge als
        Streifen oben, darunter die Leinwand mit fester Höhe, darunter die
        Bedienung.
      */}
      <div className="flex h-full min-h-0 flex-col overflow-y-auto border-t border-linie lg:grid lg:grid-cols-[auto_minmax(0,1fr)_420px] lg:overflow-hidden">
        <Werkzeugleiste gewaehlt={werkzeug} onWaehlen={werkzeugWaehlen} />

        <Arbeitsflaeche
          ansicht={ansicht}
          breite={muster.breite}
          hoehe={muster.hoehe}
          raster={anzeigeRaster}
          palette={muster.palette}
          mitSymbolen={mitSymbolen}
          auswahl={auswahl?.maske ?? null}
          vorschau={
            vorschau && vorschauStueck
              ? {
                  x: vorschau.x,
                  y: vorschau.y,
                  w: vorschauStueck.w,
                  h: vorschauStueck.h,
                  daten: vorschauStueck.daten,
                  maske: vorschauStueck.maske,
                }
              : null
          }
          onZeiger={zeiger}
          schieben={werkzeug === "schieben" && !vorschau}
          beschriftung={t("editor.leinwandBeschriftung", {
            breite: String(muster.breite),
            hoehe: String(muster.hoehe),
          })}
          className="h-[48vh] shrink-0 lg:h-auto lg:shrink"
        >
          {/* Die Knöpfe für die Ansicht schweben über der Leinwand, unten
              links. Als eigene Zeile über dem Bild haben sie achtzig Punkte
              Höhe gekostet – und sie gehören ohnehin ans Bild und nicht in
              die Bedienspalte. */}
          <div className="pointer-events-none absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
            <div className="pointer-events-auto flex flex-wrap gap-1 rounded-xl border border-linie bg-white/95 p-1 shadow-[0_2px_10px_rgba(0,0,0,0.12)]">
              <Sichtknopf onClick={ansicht.kleiner} disabled={!ansicht.kannKleiner}>
                {t("editor.kleiner")}
              </Sichtknopf>
              <Sichtknopf onClick={ansicht.groesser} disabled={!ansicht.kannGroesser}>
                {t("editor.groesser")}
              </Sichtknopf>
              <Sichtknopf onClick={ansicht.ganzZeigen}>{t("editor.allesZeigen")}</Sichtknopf>
              <Sichtknopf onClick={() => setMitSymbolen((a) => !a)} gedrueckt={mitSymbolen}>
                {mitSymbolen ? t("editor.symboleAus") : t("editor.symboleAn")}
              </Sichtknopf>
            </div>
          </div>
        </Arbeitsflaeche>

        {/* --- Die Bedienung ----------------------------------------------

            Breit ist die Spalte eine eigene, in sich rollende Säule neben der
            Leinwand – dafür `min-h-0`, sonst würde sie das Fenster sprengen.

            Schmal liegt sie unter der Leinwand, und dort galt dasselbe
            `min-h-0`: in einer Flexspalte mit begrenzter Höhe schrumpfte sie
            damit auf sechsunddreißig Punkte zusammen. Die Regler waren
            gezeichnet, aber abgeschnitten – man kam schlicht nicht an sie
            heran. Schmal darf sie deshalb nicht schrumpfen: sie bekommt ihre
            volle Höhe, und gerollt wird im Rahmen darum. */}
        <aside className="flex shrink-0 flex-col border-t border-linie bg-white lg:min-h-0 lg:shrink lg:border-t-0 lg:border-l">
          {vorschau ? (
            /* Solange ein Stück eingesetzt wird, verdrängt es alles andere –
               es gibt dann genau eine Sache zu tun. */
            <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <Abschnitt titel={t("editor.stueckEinsetzen")} hinweis={t("editor.stueckSchieben")}>
                {/* Größe: zwei Knöpfe und darunter, was dabei herauskommt.
                    Die Zentimeter stehen dabei, weil bei einem Motiv genau
                    das die Frage ist – ob es auf den Stoff passt.

                    Ein Kreuz aus vier Knöpfen zum feldweisen Rücken stand
                    hier einmal darüber. Verschoben wird mit dem Finger, das
                    kann jede – die neun Kästchen haben nur Platz gekostet
                    und den Blick vom Muster weggezogen. */}
                <div className="grid grid-cols-2 gap-2">
                  <Knopf
                    art="neben"
                    klein
                    onClick={() => vorschauSkalieren(-1)}
                    disabled={!kannStueckKleiner}
                  >
                    {t("editor.stueckKleiner")}
                  </Knopf>
                  <Knopf
                    art="neben"
                    klein
                    onClick={() => vorschauSkalieren(1)}
                    disabled={!kannStueckGroesser}
                  >
                    {t("editor.stueckGroesser")}
                  </Knopf>
                </div>
                {vorschauStueck ? (
                  <p aria-live="polite" className="mt-2 text-[1rem] text-gedaempft">
                    {t("editor.stueckMasse", {
                      breite: String(vorschauStueck.w),
                      hoehe: String(vorschauStueck.h),
                      cmBreite: cmText(
                        sticheInCm(vorschauStueck.w, einstellungen.stoffzaehlung),
                        landeskennung,
                      ),
                      cmHoehe: cmText(
                        sticheInCm(vorschauStueck.h, einstellungen.stoffzaehlung),
                        landeskennung,
                      ),
                    })}
                  </p>
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Knopf art="neben" klein onClick={vorschauDrehen}>
                    {t("editor.vierteldrehung")}
                  </Knopf>
                  <Knopf
                    art="neben"
                    klein
                    onClick={() =>
                      setVorschau((v) => (v ? { ...v, quelle: spiegelnWaagerecht(v.quelle) } : v))
                    }
                  >
                    {t("editor.spiegelnWaagerecht")}
                  </Knopf>
                  <Knopf
                    art="neben"
                    klein
                    onClick={() =>
                      setVorschau((v) => (v ? { ...v, quelle: spiegelnSenkrecht(v.quelle) } : v))
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
                      alleWeg();
                    }}
                  >
                    {t("allgemein.abbrechen")}
                  </Knopf>
                </div>
              </Abschnitt>
            </div>
          ) : (
            <>
              {/*
                Ganz oben steht, womit gerade gearbeitet wird und was ein Tipp
                ins Muster bewirkt – und zwar über den Reitern, damit es auch
                dann noch dasteht, wenn man in der Garnliste blättert. Das war
                die Frage, auf die die alte Oberfläche keine Antwort gab:
                „Was soll ich hier eigentlich tun?"
              */}
              <div className="shrink-0 border-b border-linie">
                <button
                  type="button"
                  onClick={() => setHinweisOffen((offen) => !offen)}
                  aria-expanded={hinweisOffen}
                  aria-controls="werkzeugerklaerung"
                  className="flex min-h-[56px] w-full items-center gap-3 px-5 py-2 text-left hover:bg-hinweis"
                >
                  {/* Zwei Zeilen fest: die Werkzeugnamen sind verschieden
                      lang, „Gleiche Fläche auswählen" bricht in der schmalen
                      Spalte um, „Malen" nicht. Ohne festen Platz rückten
                      Reiterzeile und Winkel bei jedem Werkzeugwechsel eine
                      Zeile auf und ab. */}
                  <h2 className="flex min-h-[2.6rem] min-w-0 flex-1 items-center text-[1.15rem] font-bold leading-tight">
                    {t(werkzeugJetzt.titel)}
                  </h2>
                  {/* Ein Winkel statt eines Wortes: er zeigt, wohin es geht,
                      und kostet keine Zeile. Als Schriftzeichen („⌄") sprang
                      er beim Drehen, weil ein Glyph nicht in der Mitte seines
                      Kastens sitzt – gedreht wurde um einen Punkt, der neben
                      dem Zeichen lag. Als Zeichnung in einem festen Quadrat
                      dreht er sich um seine eigene Mitte und bleibt stehen,
                      wo er steht. */}
                  <span
                    aria-hidden
                    className={`grid h-6 w-6 shrink-0 place-items-center text-gedaempft transition-transform duration-200 ${
                      hinweisOffen ? "rotate-180" : ""
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 9l7 7 7-7" />
                    </svg>
                  </span>
                  <span className="sr-only">
                    {hinweisOffen ? t("editor.hinweisZuklappen") : t("editor.hinweisAufklappen")}
                  </span>
                </button>
                {hinweisOffen ? (
                  <p id="werkzeugerklaerung" className="px-5 pb-3 text-[1rem] text-gedaempft">
                    {t(werkzeugJetzt.erklaerung)}
                  </p>
                ) : null}
              </div>

              <Bereichswahl
                bereiche={[
                  { schluessel: "bearbeiten", titel: t("bereich.bearbeiten") },
                  { schluessel: "garne", titel: t("bereich.garne") },
                  { schluessel: "muster", titel: t("bereich.muster") },
                  { schluessel: "gemerkt", titel: t("bereich.gemerkt") },
                ]}
                gewaehlt={bereich}
                onWaehlen={setBereich}
              >
                {bereich === "bearbeiten" ? (
                  <>
                    {werkzeug === "schieben" ? (
                      <Abschnitt titel={t("ansicht.titel")}>
                        <ul className="flex list-none flex-col gap-2 text-[1rem]">
                          <li>{t("ansicht.mausrad")}</li>
                          <li>{t("ansicht.ziehen")}</li>
                          <li>{t("ansicht.zweiFinger")}</li>
                          <li>{t("ansicht.leertaste")}</li>
                        </ul>
                      </Abschnitt>
                    ) : null}

                    {maltMitFarbe(werkzeug) ? (
                      <Abschnitt titel={t("editor.malfarbe")} hinweis={t("editor.malfarbeHinweis")}>
                        <Farbstreifen
                          palette={paletteJetzt}
                          gewaehlt={farbeSicher}
                          onWaehlen={setFarbe}
                        />
                        {farbeJetzt ? (
                          <p className="mt-3 text-[1rem]">
                            {t("editor.gewaehlteFarbe", {
                              garn: farbeJetzt.garn
                                ? `${farbeJetzt.garn.marke} ${farbeJetzt.garn.code} – ${garnname(
                                    farbeJetzt.garn.name,
                                    farbeJetzt.garn.hex,
                                    t,
                                  )}`
                                : t("legende.eigeneFarbe"),
                            })}
                          </p>
                        ) : null}
                        {/* Auch diese beiden stehen immer da und sind ohne
                            Auswahl nur grau – wie die Knöpfe im Abschnitt
                            darunter. Tauchten sie erst mit der Auswahl auf,
                            rückte alles darunter im selben Augenblick ein
                            Stück tiefer. */}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Knopf art="neben" klein onClick={auswahlFaerben} disabled={!hatAuswahl}>
                            {t("editor.auswahlFaerben")}
                          </Knopf>
                          <Knopf art="neben" klein onClick={auswahlAufheben} disabled={!hatAuswahl}>
                            {t("editor.auswahlAufheben")}
                          </Knopf>
                        </div>
                      </Abschnitt>
                    ) : null}

                    {waehltAus(werkzeug) ? (
                      <Auswahlbereich
                        werkzeug={werkzeug}
                        auswahl={auswahl}
                        felderImMuster={muster.breite * muster.hoehe}
                        aehnlichkeit={aehnlichkeit}
                        hatTipps={tipps.length > 0}
                        onAehnlichkeit={aehnlichkeitAendern}
                        onNurDasSticken={nurAuswahlBehalten}
                        onWeglassen={auswahlWeglassen}
                        onFaerben={auswahlFaerben}
                        onKopieren={auswahlKopieren}
                        onAlsMotivMerken={() => {
                          setMotivName("");
                          setMotivNameOffen(true);
                        }}
                        onAufheben={auswahlAufheben}
                      />
                    ) : null}

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
                  </>
                ) : null}

                {bereich === "garne" ? (
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
                    {alleGarne.length > 0 && farbeJetzt ? (
                      <Knopf
                        art="neben"
                        klein
                        className="mt-3 w-full"
                        onClick={() => setGarnwechsel(farbeSicher)}
                      >
                        {t("legende.anderesGarnFuer", {
                          garn: farbeJetzt.garn
                            ? `${farbeJetzt.garn.marke} ${farbeJetzt.garn.code}`
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
                    {/* Die Maße standen früher oben in der Kopfzeile und haben
                        dort nur Platz gekostet: sie ändern sich beim Arbeiten
                        nicht. Hier stehen sie bei allem anderen, was das
                        Muster als Ganzes betrifft. */}
                    <Abschnitt titel={t("editor.groesseTitel")}>
                      <p className="text-[1.05rem]">{masse}</p>
                    </Abschnitt>
                    <Abschnitt titel={t("glaettung.frage")}>
                      <Glaettungsregler
                        staerke={einstellungen.glaettungsstaerke}
                        laeuft={laeuft}
                        onAendern={glaettungSetzen}
                      />
                    </Abschnitt>
                    {/* Direkt unter der Glättung: beide Regler entscheiden
                        darüber, wie fein das Muster wird, und man stellt sie
                        im Wechsel ein, bis es stimmt. */}
                    <Abschnitt titel={t("farben.frage")}>
                      <Farbregler
                        farbanzahl={einstellungen.farbanzahl}
                        laeuft={laeuft}
                        onAendern={farbanzahlSetzen}
                      />
                    </Abschnitt>
                  </>
                ) : null}

                {bereich === "gemerkt" ? (
                  <>
                    <Abschnitt titel={t("staende.titel")}>
                      <Staendeleiste
                        musterId={musterId}
                        aktuelleVersion={versionId}
                        neuLaden={standZaehler}
                        onWiederherstellen={standWiederherstellen}
                        onMerken={standGemerkt}
                        onVergleichen={musterId ? () => setVergleichOffen(true) : undefined}
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
            </>
          )}
        </aside>
      </div>
      <Vergleich
        musterId={musterId}
        offen={vergleichOffen}
        startStandId={versionId}
        onSchliessen={() => setVergleichOffen(false)}
        onWiederherstellen={standWiederherstellen}
        onGeloescht={versionVergessen}
      />

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
 * Ein Knopf der schwebenden Ansichtsleiste.
 *
 * Flacher als die Knöpfe der Bedienspalte (44 statt 56 Punkte), weil er auf
 * dem Muster liegt und davon so wenig wie möglich zudecken soll. Beschriftet
 * ist er trotzdem mit ganzen Wörtern – ein Lupensymbol allein wäre geraten.
 */
function Sichtknopf({
  onClick,
  disabled,
  gedrueckt,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  gedrueckt?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={gedrueckt}
      className={`min-h-[44px] rounded-lg border px-3 text-[0.9rem] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
        gedrueckt
          ? "border-hauptaktion bg-gewaehlt text-hauptaktion hover:bg-gewaehlt-tief"
          : "border-linie bg-white hover:bg-hinweis"
      }`}
    >
      {children}
    </button>
  );
}

