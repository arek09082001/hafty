/**
 * Alle sichtbaren Texte in Deutsch und Polnisch.
 *
 * Deutsch ist die Vorlage: `pl` wird gegen `de` getypt, eine fehlende oder
 * überzählige polnische Zeile ist deshalb ein Übersetzungsfehler beim
 * Übersetzen des Programms und nicht erst im Betrieb zu merken.
 *
 * Platzhalter stehen in geschweiften Klammern: {anzahl}, {name}.
 */

export const DE = {
  // --- Übergreifend ------------------------------------------------------
  "allgemein.abbrechen": "Abbrechen",
  "allgemein.behalten": "Behalten",
  "allgemein.jaLoeschen": "Ja, löschen",
  "allgemein.meldungSchliessen": "Meldung schließen",
  "allgemein.fensterSchliessen": "Fenster schließen",
  "allgemein.stiche": "Stiche",
  "allgemein.wirdGeholt": "Wird geholt …",

  // --- Kopfzeile ---------------------------------------------------------
  "kopf.appName": "Stickmuster",
  "kopf.meineGarne": "Meine Garne",
  "kopf.sprache": "Sprache",

  // --- Fortschritt -------------------------------------------------------
  "schritt.bild": "Bild aussuchen",
  "schritt.einstellungen": "Größe und Farben",
  "schritt.muster": "Muster ansehen und ändern",
  "schritt.drucken": "Drucken",
  "schritt.fortschritt": "Fortschritt",

  // --- Schritt 1: Bild ---------------------------------------------------
  "bild.titel": "Bild aussuchen",
  "bild.erklaerung":
    "Wählen Sie ein Foto von Ihrem Gerät aus. Sie können später jederzeit ein anderes Bild nehmen.",
  "bild.ausgewaehlt": "Ausgewählt: {name}",
  "bild.nochKeins": "Noch kein Bild ausgewählt.",
  "bild.weiter": "Weiter zu Größe und Farben",
  "bild.wirdVerwendet": "Dieses Bild wird verwendet",
  "bild.anderesWaehlen": "Anderes Bild aussuchen",
  "bild.eigenesFoto": "Ein eigenes Foto",
  "bild.eigenesFotoText":
    "Tippen Sie auf den Knopf. Es öffnet sich sofort das Fenster Ihres Geräts, in dem Sie ein Bild auswählen können.",
  "bild.fotoWaehlen": "Foto von meinem Gerät auswählen",
  "bild.fehlerKeinBild":
    "Das war keine Bilddatei. Bitte wählen Sie ein Foto aus, zum Beispiel eine Datei, die auf .jpg oder .png endet.",
  "bild.fehlerZuGross":
    "Dieses Bild ist sehr groß. Bitte wählen Sie ein kleineres Foto aus – bis etwa 25 Megabyte geht gut.",
  "bild.fehlerNichtLesbar":
    "Dieses Bild konnte nicht geöffnet werden. Bitte wählen Sie ein anderes Foto aus, am besten im Format JPG oder PNG.",

  // --- Bild zuschneiden ----------------------------------------------------
  "zuschnitt.titel": "Ausschnitt wählen",
  "zuschnitt.erklaerung":
    "Sie können einen Teil des Bildes aussuchen. Tippen Sie eine Form an – der Ausschnitt legt sich mittig auf das Bild. Danach können Sie ihn mit dem Finger verschieben und an den Ecken frei in jede Form ziehen.",
  "zuschnitt.formWaehlen": "Form des Ausschnitts",
  "zuschnitt.ganzesBild": "Ganzes Bild",
  "zuschnitt.quadrat": "Quadrat 1:1",
  "zuschnitt.hochkant": "Hochkant 3:4",
  "zuschnitt.quer": "Quer 4:3",
  "zuschnitt.breit": "Breit 16:9",
  "zuschnitt.groesse": "Größe",
  "zuschnitt.kleiner": "Kleiner",
  "zuschnitt.groesser": "Größer",
  "zuschnitt.freihand": "Freihand",
  "zuschnitt.freihandText":
    "Freihand geht auch: Ziehen Sie an einer der weißen Ecken, dann bekommt der Ausschnitt jede Form, die Sie möchten. Oder setzen Sie neben dem Rahmen auf dem Bild auf und ziehen Sie einen ganz neuen Rahmen auf.",
  "zuschnitt.schmaler": "Schmaler",
  "zuschnitt.breiter": "Breiter",
  "zuschnitt.flacher": "Flacher",
  "zuschnitt.hoeher": "Höher",
  "zuschnitt.masse": "Ausschnitt: {breite} × {hoehe} Bildpunkte",
  "zuschnitt.bildBeschriftung": "Ihr Bild mit dem gewählten Ausschnitt",
  "zuschnitt.aendern": "Ausschnitt wählen",
  "zuschnitt.fertig": "Ausschnitt übernehmen",
  "zuschnitt.ganzeBildNehmen": "Doch das ganze Bild",
  "zuschnitt.hinweisGewaehlt": "Es wird nur der gewählte Ausschnitt gestickt.",

  // --- Schritt 2: Größe und Farben ---------------------------------------
  "einst.titel": "Größe und Farben",
  "einst.erklaerung":
    "Wie breit soll das Muster werden, auf welchem Stoff sticken Sie und wie viele Farben darf es haben? Die fertige Größe sehen Sie unten sofort in Zentimetern.",
  "einst.fehltBild": "Für diesen Schritt fehlt noch das Bild.",
  "einst.fehltBildText":
    "Sie haben noch kein Bild ausgesucht. Gehen Sie einen Schritt zurück und wählen Sie ein Foto oder ein Beispielbild aus.",
  "einst.zurueckBild": "Zurück zum Bild",
  "einst.zurueckBildAussuchen": "Zurück zum Bild aussuchen",
  "einst.musterErstellen": "Muster erstellen",
  "einst.wirdBerechnet": "Das Muster wird berechnet …",
  "einst.breite": "Breite des Musters",
  "einst.breiteHinweis":
    "Wie viele Kreuze soll das Muster in der Breite haben? Die Höhe ergibt sich aus dem Bild von selbst.",
  "einst.stoff": "Ihr Stoff",
  "einst.stoffHinweis":
    "Die Zahl steht auf der Stoffbanderole. Sie sagt, wie viele Kreuze auf einen Zoll passen – je höher die Zahl, desto feiner das Bild und desto kleiner das Ergebnis.",
  "einst.farbanzahl": "Anzahl der Farben",
  "einst.farbanzahlHinweis":
    "Weniger Farben bedeuten weniger Garne zu kaufen und weniger Wechsel beim Sticken. Mehr Farben geben das Foto genauer wieder.",
  "einst.soGross": "So groß wird Ihre Stickerei",
  "einst.sticheBreite": "Stiche in der Breite",
  "einst.sticheHoehe": "Stiche in der Höhe",
  "einst.sticheGesamt": "Stiche gesamt",
  "einst.stoffZugabe":
    "Rechnen Sie an jeder Seite noch etwa 5 cm Stoff dazu, damit Sie die Arbeit einspannen können.",
  "einst.zuGross": "So groß kann das Muster nicht werden. Bitte stellen Sie die Breite kleiner ein.",
  "einst.zuGrossGenau":
    "So groß kann das Muster nicht werden. Bitte stellen Sie die Breite auf höchstens {max} Stiche ein.",
  "einst.welcheGarne": "Welche Garne sollen verwendet werden?",
  "einst.keineEigenen":
    "Sie haben noch nicht eingetragen, welche Garne Sie zu Hause haben. Das Muster wird deshalb aus allen Farben zusammengestellt.",
  "einst.jetztEintragen": "Jetzt meine Garne eintragen",
  "einst.eigeneGarneText":
    "Sie haben {anzahl} davon zu Hause. Wenn Sie das einschalten, wird das Muster nur aus diesen Garnen zusammengestellt – dann müssen Sie nichts nachkaufen.",
  "einst.nurEigene": "Nur meine Garne verwenden: {zustand}",
  "einst.ein": "ein",
  "einst.aus": "aus",
  "einst.weniger": "Weniger",
  "einst.mehr": "Mehr",
  "einst.wenigerVon": "{was}: weniger",
  "einst.mehrVon": "{was}: mehr",
  "einst.farbenEinheit": "Farben",
  "einst.stoff11": "Aida 11 – große Kreuze",
  "einst.stoff14": "Aida 14 – am gebräuchlichsten",
  "einst.stoff16": "Aida 16 – feiner",
  "einst.stoff18": "Aida 18 – sehr fein",

  // --- Schritt 3: Editor -------------------------------------------------
  "editor.titel": "Muster ansehen und ändern",
  "editor.keinMuster": "Hier ist noch kein Muster.",
  "editor.keinMusterText":
    "Es wurde noch kein Muster erstellt. Gehen Sie zurück zum ersten Schritt, suchen Sie ein Bild aus und tippen Sie dann auf „Muster erstellen“.",
  "editor.kleiner": "Kleiner",
  "editor.groesser": "Größer",
  "editor.allesZeigen": "Alles zeigen",
  "editor.symboleAn": "Symbole an",
  "editor.symboleAus": "Symbole aus",
  "editor.einSchrittZurueck": "Ein Schritt zurück",
  "editor.rueckgaengig": "Rückgängig",
  "editor.wiederholen": "Wiederholen",
  "editor.weiterDrucken": "Weiter zum Drucken",
  "editor.masse": "{breite} × {hoehe} Stiche · {cmBreite} cm × {cmHoehe} cm · Aida {zaehlung}",
  "editor.groesseTitel": "Größe",
  "editor.malfarbe": "Farbe zum Malen",
  "editor.malfarbeHinweis": "Tippen Sie eine Kachel an. Mit dieser Farbe wird gemalt und gefüllt.",
  "editor.gewaehlteFarbe": "Gewählt: {garn}",
  "editor.leinwandBeschriftung": "Ihr Zählmuster, {breite} mal {hoehe} Stiche",
  "editor.ausgewaehlt": "{anzahl} Stiche ausgewählt",
  "editor.nichtsAusgewaehlt": "Noch nichts ausgewählt",
  "editor.tippenHinweis":
    "Tippen Sie mit dem gewählten Werkzeug ins Muster. Dann lassen sich die Knöpfe hier benutzen.",
  "editor.auswahlFaerben": "Auswahl färben",
  "editor.auswahlKopieren": "Auswahl kopieren",
  "editor.alsMotivMerken": "Als Motiv merken",
  "editor.nurDasSticken": "Nur das Ausgewählte sticken",
  "editor.nurDasGestickt":
    "Jetzt wird nur noch das Ausgewählte gestickt. Alles andere bleibt freier Stoff – mit „Rückgängig“ holen Sie es zurück.",
  "editor.auswahlNichtSticken": "Das Ausgewählte nicht sticken",
  "editor.auswahlWeggelassen":
    "Diese Stelle bleibt jetzt freier Stoff. Mit „Rückgängig“ holen Sie sie zurück.",
  "editor.wiederAllesSticken": "Wieder alles sticken",
  "editor.wiederAllesGestickt": "Es wird wieder alles gestickt.",
  "editor.freieFelderTitel": "Freigestellt",
  "editor.freieFelder": "{anzahl} Felder bleiben frei – dort wird nicht gestickt.",
  "editor.auswahlAufheben": "Auswahl aufheben",
  "editor.kopiert": "Kopiertes Stück",
  "editor.kopiertHinweis": "Sie haben ein Stück von {w} × {h} Stichen kopiert.",
  "editor.kopieEinfuegen": "Kopie einfügen",
  "editor.kopiertMeldung":
    "{anzahl} Stiche wurden kopiert. Tippen Sie jetzt auf „Kopie einfügen“.",
  "editor.stueckEinsetzen": "Stück einsetzen",
  "editor.stueckSchieben":
    "Schieben Sie das Stück mit dem Finger an die richtige Stelle. Mit „Stück kleiner“ und „Stück größer“ ändern Sie seine Größe.",
  "editor.einsetzenMeldung":
    "Schieben Sie das Stück mit dem Finger an die richtige Stelle. Erst „Hier einsetzen“ schreibt es fest.",
  // „Kleiner"/„Größer" allein wären zweideutig: so heißen schon die Knöpfe
  // an der Leinwand, mit denen man das ganze Muster näher heranholt.
  "editor.stueckKleiner": "Stück kleiner",
  "editor.stueckGroesser": "Stück größer",
  "editor.stueckMasse": "{breite} × {hoehe} Stiche · {cmBreite} cm × {cmHoehe} cm",
  "editor.vierteldrehung": "Vierteldrehung",
  "editor.spiegelnWaagerecht": "Waagerecht spiegeln",
  "editor.spiegelnSenkrecht": "Senkrecht spiegeln",
  "editor.hierEinsetzen": "Hier einsetzen",
  "editor.ihreGarne": "Ihre Garne ({anzahl})",
  "editor.garnbedarf":
    "Zusammen brauchen Sie etwa {meter} Garn. Geschätzt für zwei Fäden aus einem Strang – kaufen Sie lieber etwas mehr.",
  "editor.farbeHinweis": "Die angetippte Farbe wird zum Malen und Färben verwendet.",
  "editor.hinweisAufklappen": "Erklärung zum Werkzeug anzeigen",
  "editor.hinweisZuklappen": "Erklärung zum Werkzeug ausblenden",
  "editor.anderesGarnTitel": "Ein anderes Garn für diese Farbe",
  "editor.anderesGarnText":
    "Die Farbwerte der Hersteller sind Näherungen. Wenn Sie Ihre Garnkarte vor sich haben und ein anderer Ton besser passt, wählen Sie ihn hier aus.",
  "editor.garnGewechselt": "Diese Farbe ist jetzt {marke} {code} – {name}.",
  "editor.motivMerkenTitel": "Motiv merken",
  "editor.motivMerkenText":
    "Geben Sie dem Motiv einen Namen, damit Sie es später wiederfinden.",
  "editor.motivMerken": "Motiv merken",
  "editor.motivName": "Name des Motivs",
  "editor.motivNamePlatzhalter": "Zum Beispiel: Blütenblatt",
  "editor.motivGemerkt": "Das Motiv „{name}“ ist gemerkt. Sie finden es rechts in der Liste.",
  "editor.motivLoeschenTitel": "Motiv wirklich löschen?",
  "editor.motivLoeschenText":
    "Das Motiv „{name}“ wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.",
  "editor.standWiederher": "Der frühere Stand ist wieder da.",
  "editor.standGemerkt":
    "Dieser Stand ist gemerkt. Er bleibt Ihnen erhalten, auch wenn Sie noch viel weiterarbeiten.",

  // --- Bereiche im Editor ------------------------------------------------
  "bereich.bearbeiten": "Ändern",
  "bereich.garne": "Garne",
  "bereich.muster": "Muster",
  "bereich.gemerkt": "Gemerkt",

  // --- Werkzeuge ---------------------------------------------------------
  "werkzeug.frage": "Womit möchten Sie arbeiten?",
  "werkzeuggruppe.ansehen": "Ansehen",
  "werkzeuggruppe.auswaehlen": "Auswählen",
  "werkzeuggruppe.malen": "Malen",
  "werkzeug.schieben": "Ansehen und verschieben",
  "werkzeug.schiebenText":
    "Ziehen Sie das Muster an die Stelle, die Sie ansehen möchten. Dabei wird nichts verändert.",
  "werkzeug.schiebenKurz": "Schieben",
  "werkzeug.motivKurz": "Motiv",
  "werkzeug.flaecheKurz": "Fläche",
  "werkzeug.rechteckKurz": "Rechteck",
  "werkzeug.freihandKurz": "Freihand",
  "werkzeug.malenKurz": "Malen",
  "werkzeug.fuellenKurz": "Füllen",
  "werkzeug.motiv": "Ganzes Motiv auswählen",
  "werkzeug.motivText":
    "Tippen Sie mitten in die Blume. Es wird alles ausgewählt, was farblich dazugehört – auch mehrere Farbtöne. Jedes weitere Motiv kommt mit einem Tipp dazu.",
  "werkzeug.flaeche": "Gleiche Fläche auswählen",
  "werkzeug.flaecheText":
    "Tippen Sie in eine Fläche. Alles, was daran hängt und dieselbe Farbe hat, wird ausgewählt.",
  "werkzeug.rechteck": "Rechteck auswählen",
  "werkzeug.rechteckText":
    "Ziehen Sie mit dem Finger ein Rechteck über den Bereich, den Sie auswählen möchten.",
  "werkzeug.freihand": "Freihand auswählen",
  "werkzeug.freihandText":
    "Fahren Sie einmal um den Bereich herum. Beim Loslassen wird alles darin ausgewählt.",
  "werkzeug.malen": "Einzelne Stiche malen",
  "werkzeug.malenText":
    "Tippen oder fahren Sie über die Felder. Sie bekommen die gewählte Farbe.",
  "werkzeug.fuellen": "Fläche färben",
  "werkzeug.fuellenText": "Tippen Sie in eine Fläche. Die ganze Fläche bekommt die gewählte Farbe.",

  // --- Im Muster bewegen -------------------------------------------------
  "ansicht.titel": "So bewegen Sie sich im Muster",
  "ansicht.mausrad":
    "Mausrad drehen: das Muster wird größer und kleiner – genau dort, wo der Zeiger steht.",
  "ansicht.ziehen": "Mit der Maus oder dem Finger ziehen: das Muster verschieben.",
  "ansicht.zweiFinger":
    "Zwei Finger auf dem Bildschirm: verschieben und zugleich größer oder kleiner ziehen.",
  "ansicht.leertaste":
    "Leertaste gedrückt halten: verschieben, ohne das Werkzeug zu wechseln.",

  // --- Motiv aussuchen ---------------------------------------------------
  "motivsuche.hinweis":
    "Tippen Sie mitten in ein Motiv. Jedes weitere kommt dazu – noch einmal darauf tippen nimmt es wieder weg.",
  "motivsuche.mehr": "Mehr dazunehmen",
  "motivsuche.weniger": "Weniger dazunehmen",
  "motivsuche.fastAlles":
    "Ausgewählt ist fast das ganze Muster. Tippen Sie auf „Weniger dazunehmen“, wenn Sie nur ein Motiv möchten.",

  // --- Rückgängig-Schritte ------------------------------------------------
  "schrittname.gemalt": "Stiche gemalt",
  "schrittname.einStichGemalt": "Einen Stich gemalt",
  "schrittname.flaecheGefaerbt": "Fläche gefärbt",
  "schrittname.auswahlGefaerbt": "Auswahl gefärbt",
  "schrittname.stueckEingesetzt": "Stück eingesetzt",
  "schrittname.freigestellt": "Motiv freigestellt",
  "schrittname.nichtGestickt": "Stelle freigelassen",
  "schrittname.wiederGestickt": "Wieder alles gestickt",

  // --- Glättung -----------------------------------------------------------
  "glaettung.frage": "Wie ruhig soll das Muster sein?",
  "glaettung.stufe0": "sehr detailliert",
  "glaettung.stufe1": "detailliert",
  "glaettung.stufe2": "ausgewogen",
  "glaettung.stufe3": "ruhig",
  "glaettung.stufe4": "ruhig und einfach zu sticken",

  // --- Der Farbregler im Editor --------------------------------------------
  "farben.frage": "Wie viele Farben soll das Muster haben?",
  "farben.gewuenscht": "{anzahl} Farben",

  // --- Legende ------------------------------------------------------------
  // --- Farben in Worten ----------------------------------------------------
  // Nur fuer Garne, denen der Hersteller keinen Namen gegeben hat
  // (Ariadna zum Beispiel vergibt nur Nummern). Siehe lib/farbe/farbwort.ts.
  "farbwort.zusammen": "{stufe} {ton}",
  "farbton.rot": "Rot",
  "farbton.orange": "Orange",
  "farbton.braun": "Braun",
  "farbton.gelb": "Gelb",
  "farbton.oliv": "Oliv",
  "farbton.gruen": "Grün",
  "farbton.tuerkis": "Türkis",
  "farbton.blau": "Blau",
  "farbton.violett": "Violett",
  "farbton.rosa": "Rosa",
  "farbton.weinrot": "Weinrot",
  "farbton.beige": "Beige",
  "farbton.weiss": "Weiß",
  "farbton.grau": "Grau",
  "farbton.schwarz": "Schwarz",
  "farbstufe.sehrHell": "sehr helles",
  "farbstufe.hell": "helles",
  "farbstufe.dunkel": "dunkles",
  "farbstufe.sehrDunkel": "sehr dunkles",

  "legende.eigeneFarbe": "Eigene Farbe",
  "legende.stiche": "Stiche",
  "legende.sticheUndGarn": "Garn · {stiche} Stiche",
  "legende.anderesGarn": "Anderes Garn",
  "legende.anderesGarnFuer": "Anderes Garn statt {garn}",

  // --- Motive -------------------------------------------------------------
  "motive.titel": "Meine Motive",
  "motive.wirdGeholt": "Die Motive werden geholt …",
  "motive.keine":
    "Sie haben noch keine Motive. Wählen Sie einen Bereich im Muster aus und tippen Sie dann auf „Als Motiv merken“. Motive bleiben Ihnen auch für spätere Muster erhalten.",
  "motive.ohneBild": "ohne Bild",
  "motive.groesse": "{w} × {h} Stiche",
  "motive.loeschen": "Löschen",
  "motive.fehlerLaden":
    "Die Motive konnten nicht geholt werden. Bitte prüfen Sie Ihre Internetverbindung und laden Sie die Seite noch einmal.",
  "motive.fehlerMerken":
    "Das Motiv konnte nicht gemerkt werden. Bitte prüfen Sie, ob Sie mit dem Internet verbunden sind, und versuchen Sie es dann noch einmal.",
  "motive.fehlerHolen":
    "Dieses Motiv konnte nicht geholt werden. Bitte prüfen Sie Ihre Internetverbindung und tippen Sie noch einmal darauf.",
  "motive.fehlerLoeschen": "Das Motiv konnte nicht gelöscht werden. Bitte versuchen Sie es noch einmal.",

  // --- Gespeicherte Stände ------------------------------------------------
  "staende.titel": "Frühere Stände",
  "staende.merken": "Diesen Stand merken",
  "staende.wirdGemerkt": "Wird gemerkt …",
  "staende.nochKeine": "Noch keine früheren Stände.",
  "staende.wirdGeholt": "Die Stände werden geholt …",
  "staende.erklaerung":
    "Sobald Sie etwas am Muster ändern, wird der Stand von selbst gesichert. Hier sehen Sie dann alle früheren Stände und können jederzeit dorthin zurück.",
  "staende.fehlerLaden":
    "Die früheren Stände konnten nicht geholt werden. Bitte prüfen Sie Ihre Internetverbindung. Ihre Arbeit auf dem Bildschirm bleibt davon unberührt.",
  "staende.fehlerHolen":
    "Dieser Stand konnte nicht geholt werden. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es noch einmal.",
  "staende.fehlerMerken":
    "Der Stand konnte nicht gemerkt werden. Bitte prüfen Sie, ob Sie mit dem Internet verbunden sind, und versuchen Sie es dann noch einmal.",
  "staende.gemerkt": "Gemerkt",
  "staende.sieArbeitenHier": " · Sie arbeiten hier",
  "staende.eintrag": "{zeit} – {farben} Farben",
  "staende.standVon": "Stand von {zeit}",
  "staende.wiederherstellen": "Diesen Stand wiederherstellen",
  "staende.schliessen": "Schließen",
  "staende.vorschauText": "{farben} Farben. {beschriftung}",
  "staende.nichtsVerloren":
    "Wenn Sie diesen Stand wiederherstellen, geht Ihre neuere Arbeit nicht verloren – sie bleibt als eigener Stand in dieser Leiste stehen.",
  "staende.dauerhaftMerken": "Diesen Stand dauerhaft merken",
  "staende.nichtMehrMerken": "Nicht mehr merken",
  "staende.vorschauBeschriftung": "Vorschau des Standes von {zeit}",
  "staende.heute": "Heute, {uhr}",
  "staende.gestern": "Gestern, {uhr}",
  "staende.datum": "{datum}, {uhr}",
  "staende.vonHandGemerkt": "Von Hand gemerkt",
  "staende.neuErzeugt": "Neu erzeugt",
  "staende.farbanzahlGeaendert": "Farbanzahl geändert",
  "staende.motivEingesetzt": "Motiv eingesetzt",

  // --- Garne ---------------------------------------------------------------
  "garne.titel": "Meine Garne",
  "garne.erklaerung":
    "Tragen Sie hier ein, welche Garne Sie zu Hause haben. Beim Erstellen eines Musters können Sie dann einstellen, dass nur diese Garne verwendet werden.",
  "garne.zurueckMuster": "Zurück zum Muster",
  "garne.keinsEingetragen": "Noch kein Garn eingetragen.",
  "garne.eingetragen": "{anzahl} Garne eingetragen.",
  "garne.zuHause": "Das haben Sie zu Hause",
  "garne.zumEntfernen": "{name} · antippen zum Entfernen",
  "garne.hinzufuegen": "Garn hinzufügen",
  "garne.wirdGeholt": "Die Garnliste wird geholt …",

  "garne.listeLeer":
    "In der Garnliste steht noch nichts. Lesen Sie die Garnfarben mit dem Knopf weiter oben einmalig ein; solange das nicht geschehen ist, rechnet die App mit den Farben aus Ihrem Bild statt mit Herstellergarnen.",
  "garne.alleEintragen": "Alle {anzahl} Farben eintragen",
  "garne.alleEntfernen": "Alle wieder entfernen",
  "garne.nurMeineZeigen": "Nur meine {anzahl} zeigen",
  "garne.alleZeigen": "Wieder alle {anzahl} zeigen",
  "garne.alleEntfernenFrage": "Alle Garne aus Ihrer Liste entfernen?",
  "garne.alleEntfernenText":
    "Ihre {anzahl} eingetragenen Garne werden aus der Liste genommen. Die Farbtafel bleibt vollständig, Sie können jederzeit wieder eintragen.",
  "garne.alleEntfernenJa": "Ja, alle entfernen",
  "garne.antippenText":
    "Tippen Sie ein Garn an, dann steht es oben in Ihrer Liste. Ein zweites Antippen nimmt es wieder heraus.",
  "garne.suche": "Nach Nummer oder Farbnamen suchen",
  "garne.suchePlatzhalter": "Zum Beispiel: 310 oder Rot",
  "garne.sucheLeeren": "Suche leeren",
  "garne.nichtsGefunden":
    "Zu „{suche}“ gibt es kein Garn. Versuchen Sie es mit der Nummer von der Banderole, zum Beispiel 310, oder tippen Sie unten einfach eine Farbe an.",
  "garne.habeIch": "Habe ich",
  "garne.jetztGewaehlt": "Jetzt gewählt",
  "garne.ausgewaehlt": "Ausgewählt",
  "garne.fehlerLaden":
    "Die Garnliste konnte nicht geholt werden. Bitte prüfen Sie Ihre Internetverbindung und laden Sie die Seite noch einmal.",
  "garne.fehlerAendern":
    "Diese Änderung konnte nicht gespeichert werden. Bitte prüfen Sie, ob Sie mit dem Internet verbunden sind, und tippen Sie noch einmal darauf.",

  // --- Schritt 4: Drucken --------------------------------------------------
  "druck.titel": "Muster drucken",
  "druck.knopf": "Muster drucken",
  "druck.wirdVorbereitet": "Wird vorbereitet …",
  "druck.zurueckMuster": "Zurück zum Muster",
  "druck.soSiehtAus": "So sieht die fertige Stickerei aus",
  "druck.vorschauBeschriftung": "Vorschau der fertigen Stickerei",
  "druck.fertig":
    "Das Muster ist fertig. Es hat sich ein neues Fenster geöffnet, aus dem Sie es ausdrucken können.",
  "druck.sichern": "Muster auf dem Gerät sichern",
  "druck.keinFenster":
    "Hat sich kein Fenster geöffnet, hat Ihr Browser es zurückgehalten. Tippen Sie dann auf den Knopf darüber.",
  "druck.ausDrucker": "Das kommt aus dem Drucker",
  "druck.seiteVorschau": "Eine Seite mit der Vorschau der fertigen Stickerei",
  "druck.seiteGarnliste": "Die Garnliste mit Symbol, Nummer, Farbname, Stichzahl und Garnbedarf",
  "druck.seitenFarbe": "Das Muster in Farbe auf {anzahl} Blättern, also {gesamt} Blätter zusammen",
  "druck.blaetterHinweis":
    "Die Blätter überlappen sich um zwei Reihen. Jede zehnte Linie ist dicker, und an den Rändern stehen die Reihennummern.",
  "druck.brauchenSie": "Das brauchen Sie dafür",
  "druck.stoff": "Stoff",
  "druck.stoffMasse": "Aida {zaehlung}, mindestens {breite} cm × {hoehe} cm",
  "druck.farben": "Farben",
  "druck.stiche": "Stiche",
  "druck.garnZusammen": "Garn zusammen",
  "druck.ungefaehr": "ungefähr {menge}",
  "druck.stoffHinweis":
    "Der Stoff ist an jeder Seite 5 cm größer gerechnet, damit Sie die Arbeit einspannen können. Der Garnbedarf gilt für zwei Fäden eines Stranges.",
  "druck.fehler":
    "Das Muster konnte nicht zum Drucken vorbereitet werden. Bitte versuchen Sie es noch einmal, und wenn es wieder nicht geht, mit weniger Stichen in der Breite.",
  "druck.meinMuster": "Mein Muster",

  // --- Texte im PDF ---------------------------------------------------------
  "pdf.fertigeGroesse": "Fertige Größe {breite} cm × {hoehe} cm auf Aida {zaehlung}",
  "pdf.sticheFarben": "{breite} × {hoehe} Stiche · {farben} Farben",
  "pdf.blaetterZusammen": "So gehören die Blätter zusammen",
  "pdf.blaetterHinweis":
    "{anzahl} Blätter, jeweils mit {ueberlappung} Reihen Überlappung. Die Angabe steht unten auf jedem Blatt.",
  "pdf.einBlatt": "Das ganze Muster passt auf ein Blatt.",
  "pdf.garnliste": "Ihre Garne",
  "pdf.garnlisteKopf": "{anzahl} Farben · {name}",
  "pdf.garnlisteHinweis":
    "Der Garnverbrauch ist geschätzt und gilt für zwei Fäden eines Stranges.",
  "pdf.spalteSymbol": "Symbol",
  "pdf.spalteGarn": "Garn",
  "pdf.spalteFarbe": "Farbe",
  "pdf.spalteStiche": "Stiche",
  "pdf.spalteGarnNoetig": "Garn nötig",
  "pdf.eigeneFarbe": "eigene Farbe",
  "pdf.summe": "Zusammen {stiche} Stiche und ungefähr {garn} Garn.",
  "pdf.freieFelder": "{anzahl} Felder bleiben frei",
  "pdf.masseKurz": "{breite} cm × {hoehe} cm auf Aida {zaehlung}",
  "pdf.reihenSpalten": "Reihen {vonReihe} bis {bisReihe} · Spalten {vonSpalte} bis {bisSpalte}",
  "pdf.blattFuss": "Blatt {spalte} von links, {reihe} von oben",

  // --- Fortschrittsmeldungen der Berechnung ---------------------------------
  "arbeit.bildLesen": "Das Bild wird gelesen.",
  "arbeit.herunterrechnen": "Das Bild wird auf das Stichraster gerechnet.",
  "arbeit.rauschen": "Bildrauschen wird herausgenommen.",
  "arbeit.farbenFassen": "Die Farben werden zusammengefasst.",
  "arbeit.garneSuchen": "Zu jeder Farbe wird das passende Garn gesucht.",
  "arbeit.vorbereiten": "Das Muster wird vorbereitet.",
  "arbeit.glaetten": "Einzelne Stiche werden herausgeglättet.",
  "arbeit.druckVorbereiten": "Das Muster wird für den Druck vorbereitet.",
  "arbeit.vorschauZeichnen": "Die Vorschau wird gezeichnet.",
  "arbeit.garnlisteSchreiben": "Die Garnliste wird geschrieben.",
  "arbeit.blattZeichnen": "Blatt {nummer} von {gesamt} wird gezeichnet.",
  "arbeit.dateiBauen": "Die Datei wird zusammengestellt.",
  "arbeit.fehlerBerechnung":
    "Das Muster konnte nicht berechnet werden. Bitte versuchen Sie es mit einem kleineren Muster oder weniger Farben noch einmal.",
  "arbeit.fehlerKeinMuster":
    "Es ist noch kein Muster da. Bitte gehen Sie einen Schritt zurück und wählen Sie ein Bild aus.",
  "arbeit.fehlerKeinBild":
    "Es ist noch kein Bild ausgesucht. Gehen Sie einen Schritt zurück und wählen Sie ein Bild aus.",
  "arbeit.fehlerBildLesen":
    "Dieses Bild konnte nicht gelesen werden. Bitte wählen Sie ein anderes Bild aus, am besten ein Foto im Format JPG oder PNG.",

  // --- Startseite: die eigenen Muster --------------------------------------
  "kopf.meineMuster": "Meine Muster",
  "start.titel": "Meine Muster",
  "start.erklaerung":
    "Hier stehen die Bilder, aus denen Sie schon ein Muster gemacht haben – das zuletzt bearbeitete zuerst. Tippen Sie eines an, um weiterzuarbeiten.",
  "start.zuletzt": "Zuletzt bearbeitet",
  "start.wirdGeholt": "Ihre Muster werden geholt …",
  "start.nochNichts":
    "Hier ist noch nichts. Fangen Sie mit einem Foto an – der grüne Knopf unten führt Sie hin.",
  "start.neuesBild": "Neues Bild aussuchen",
  "start.fussHinweis": "Sie können jederzeit ein neues Bild nehmen.",
  "start.ohneBild": "kein Foto",
  "start.ohneNamen": "Ohne Namen",
  "start.staende": "{anzahl} gespeicherte Stände",
  "start.standEiner": "1 gespeicherter Stand",
  "start.farben": "{anzahl} Farben",
  "start.oeffnen": "Öffnen",
  "start.vergleichen": "Alle Versionen",
  "start.loeschen": "Löschen",
  "start.loeschenTitel": "„{name}“ löschen?",
  "start.loeschenText":
    "Das Bild und alle gespeicherten Stände dazu werden gelöscht – auf diesem Gerät und in der Sicherung. Das lässt sich nicht rückgängig machen.",

  // --- Sicherung im Internet -----------------------------------------------
  "sicherung.gesichert": "Gesichert im Internet",
  "sicherung.laeuft": "Wird gesichert …",
  "sicherung.wartet": "Wird gesichert, sobald Sie Internet haben ({anzahl})",
  "sicherung.fehler":
    "Die Sicherung im Internet klappt gerade nicht. Auf diesem Gerät ist alles da.",

  // --- Alle Versionen auf einen Blick --------------------------------------
  "vergleich.titel": "Alle Versionen",
  "vergleich.erklaerung":
    "Jede gespeicherte Fassung dieses Bildes. Tippen Sie eine an, um sie groß zu sehen.",
  "vergleich.lupeKleiner": "Kleiner",
  "vergleich.lupeGroesser": "Größer",
  "vergleich.einpassen": "Ganzes Muster",
  "vergleich.fertig": "Fertig",
  "vergleich.zurueck": "Zurück zur Übersicht",
  "vergleich.wievielte": "Version {nummer} von {gesamt}",
  "vergleich.frueher": "Frühere Version",
  "vergleich.spaeter": "Spätere Version",
  "vergleich.nehmen": "Diese Version nehmen",
  "vergleich.schonHier": "Daran arbeiten Sie gerade",
  "vergleich.angaben": "{farben} Farben · {breite} × {hoehe} Stiche",
  "staende.vergleichen": "Alle Versionen ansehen",
  "bild.schonBekannt":
    "Dieses Bild war schon einmal da: die neue Fassung kommt zu „{name}“ dazu. Die früheren Stände bleiben und lassen sich damit vergleichen.",
} as const;

export type Textschluessel = keyof typeof DE;

export const PL: Record<Textschluessel, string> = {
  // --- Ogólne --------------------------------------------------------------
  "allgemein.abbrechen": "Anuluj",
  "allgemein.behalten": "Zachowaj",
  "allgemein.jaLoeschen": "Tak, usuń",
  "allgemein.meldungSchliessen": "Zamknij komunikat",
  "allgemein.fensterSchliessen": "Zamknij okno",
  "allgemein.stiche": "ściegów",
  "allgemein.wirdGeholt": "Pobieranie …",

  "kopf.appName": "Wzory do haftu",
  "kopf.meineGarne": "Moje nici",
  "kopf.sprache": "Język",

  "schritt.bild": "Wybierz zdjęcie",
  "schritt.einstellungen": "Rozmiar i kolory",
  "schritt.muster": "Obejrzyj i zmień wzór",
  "schritt.drucken": "Drukowanie",
  "schritt.fortschritt": "Postęp",

  "bild.titel": "Wybierz zdjęcie",
  "bild.erklaerung":
    "Proszę wybrać zdjęcie ze swojego urządzenia. Później w każdej chwili można wziąć inne zdjęcie.",
  "bild.ausgewaehlt": "Wybrane: {name}",
  "bild.nochKeins": "Nie wybrano jeszcze zdjęcia.",
  "bild.weiter": "Dalej do rozmiaru i kolorów",
  "bild.wirdVerwendet": "To zdjęcie zostanie użyte",
  "bild.anderesWaehlen": "Wybierz inne zdjęcie",
  "bild.eigenesFoto": "Własne zdjęcie",
  "bild.eigenesFotoText":
    "Proszę dotknąć przycisku. Od razu otworzy się okno urządzenia, w którym można wybrać zdjęcie.",
  "bild.fotoWaehlen": "Wybierz zdjęcie z mojego urządzenia",
  "bild.fehlerKeinBild":
    "To nie był plik ze zdjęciem. Proszę wybrać zdjęcie, na przykład plik kończący się na .jpg albo .png.",
  "bild.fehlerZuGross":
    "To zdjęcie jest bardzo duże. Proszę wybrać mniejsze – do mniej więcej 25 megabajtów jest dobrze.",
  "bild.fehlerNichtLesbar":
    "Nie udało się otworzyć tego zdjęcia. Proszę wybrać inne, najlepiej w formacie JPG albo PNG.",

  // --- Bild zuschneiden ----------------------------------------------------
  "zuschnitt.titel": "Wybór wycinka",
  "zuschnitt.erklaerung":
    "Można wybrać część zdjęcia. Proszę dotknąć kształtu – wycinek ustawi się na środku zdjęcia. Potem można go przesunąć palcem i dowolnie uformować za rogi.",
  "zuschnitt.formWaehlen": "Kształt wycinka",
  "zuschnitt.ganzesBild": "Całe zdjęcie",
  "zuschnitt.quadrat": "Kwadrat 1:1",
  "zuschnitt.hochkant": "Pionowo 3:4",
  "zuschnitt.quer": "Poziomo 4:3",
  "zuschnitt.breit": "Szeroko 16:9",
  "zuschnitt.groesse": "Wielkość",
  "zuschnitt.kleiner": "Mniejszy",
  "zuschnitt.groesser": "Większy",
  "zuschnitt.freihand": "Odręcznie",
  "zuschnitt.freihandText":
    "Można też odręcznie: proszę pociągnąć za jeden z białych rogów, a wycinek przyjmie dowolny kształt. Albo dotknąć zdjęcia obok ramki i pociągnąć – powstanie zupełnie nowa ramka.",
  "zuschnitt.schmaler": "Węższy",
  "zuschnitt.breiter": "Szerszy",
  "zuschnitt.flacher": "Niższy",
  "zuschnitt.hoeher": "Wyższy",
  "zuschnitt.masse": "Wycinek: {breite} × {hoehe} pikseli",
  "zuschnitt.bildBeschriftung": "Pani zdjęcie z wybranym wycinkiem",
  "zuschnitt.aendern": "Wybierz wycinek",
  "zuschnitt.fertig": "Zatwierdź wycinek",
  "zuschnitt.ganzeBildNehmen": "Jednak całe zdjęcie",
  "zuschnitt.hinweisGewaehlt": "Wyhaftowany zostanie tylko wybrany wycinek.",

  "einst.titel": "Rozmiar i kolory",
  "einst.erklaerung":
    "Jak szeroki ma być wzór, na jakiej kanwie Pani haftuje i ile kolorów może mieć? Gotowy rozmiar w centymetrach widać poniżej od razu.",
  "einst.fehltBild": "Do tego kroku brakuje jeszcze zdjęcia.",
  "einst.fehltBildText":
    "Nie wybrano jeszcze zdjęcia. Proszę cofnąć się o krok i wybrać zdjęcie albo przykładowy obrazek.",
  "einst.zurueckBild": "Wróć do zdjęcia",
  "einst.zurueckBildAussuchen": "Wróć do wyboru zdjęcia",
  "einst.musterErstellen": "Utwórz wzór",
  "einst.wirdBerechnet": "Wzór jest obliczany …",
  "einst.breite": "Szerokość wzoru",
  "einst.breiteHinweis":
    "Ile krzyżyków ma mieć wzór na szerokość? Wysokość wynika sama ze zdjęcia.",
  "einst.stoff": "Pani kanwa",
  "einst.stoffHinweis":
    "Liczba jest podana na banderoli kanwy. Mówi, ile krzyżyków mieści się na calu – im większa liczba, tym drobniejszy obraz i mniejszy efekt.",
  "einst.farbanzahl": "Liczba kolorów",
  "einst.farbanzahlHinweis":
    "Mniej kolorów to mniej nici do kupienia i rzadsze zmiany podczas haftowania. Więcej kolorów oddaje zdjęcie dokładniej.",
  "einst.soGross": "Tak duży będzie Pani haft",
  "einst.sticheBreite": "Ściegów na szerokość",
  "einst.sticheHoehe": "Ściegów na wysokość",
  "einst.sticheGesamt": "Ściegów razem",
  "einst.stoffZugabe":
    "Proszę doliczyć jeszcze około 5 cm kanwy z każdej strony, żeby dało się napiąć pracę na tamborku.",
  "einst.zuGross": "Wzór nie może być aż tak duży. Proszę ustawić mniejszą szerokość.",
  "einst.zuGrossGenau":
    "Wzór nie może być aż tak duży. Proszę ustawić szerokość na najwyżej {max} ściegów.",
  "einst.welcheGarne": "Jakich nici użyć?",
  "einst.keineEigenen":
    "Nie wpisano jeszcze, jakie nici ma Pani w domu. Wzór zostanie więc ułożony ze wszystkich kolorów.",
  "einst.jetztEintragen": "Wpisz teraz moje nici",
  "einst.eigeneGarneText":
    "Ma Pani {anzahl} w domu. Po włączeniu tej opcji wzór zostanie ułożony tylko z tych nici – wtedy nie trzeba nic dokupować.",
  "einst.nurEigene": "Używaj tylko moich nici: {zustand}",
  "einst.ein": "włączone",
  "einst.aus": "wyłączone",
  "einst.weniger": "Mniej",
  "einst.mehr": "Więcej",
  "einst.wenigerVon": "{was}: mniej",
  "einst.mehrVon": "{was}: więcej",
  "einst.farbenEinheit": "kolorów",
  "einst.stoff11": "Aida 11 – duże krzyżyki",
  "einst.stoff14": "Aida 14 – najczęściej używana",
  "einst.stoff16": "Aida 16 – drobniejsza",
  "einst.stoff18": "Aida 18 – bardzo drobna",

  "editor.titel": "Obejrzyj i zmień wzór",
  "editor.keinMuster": "Nie ma tu jeszcze wzoru.",
  "editor.keinMusterText":
    "Nie utworzono jeszcze wzoru. Proszę wrócić do pierwszego kroku, wybrać zdjęcie i dotknąć „Utwórz wzór”.",
  "editor.kleiner": "Mniejszy",
  "editor.groesser": "Większy",
  "editor.allesZeigen": "Pokaż całość",
  "editor.symboleAn": "Symbole wł.",
  "editor.symboleAus": "Symbole wył.",
  "editor.einSchrittZurueck": "Krok wstecz",
  "editor.rueckgaengig": "Cofnij",
  "editor.wiederholen": "Ponów",
  "editor.weiterDrucken": "Dalej do drukowania",
  "editor.masse": "{breite} × {hoehe} ściegów · {cmBreite} cm × {cmHoehe} cm · Aida {zaehlung}",
  "editor.groesseTitel": "Rozmiar",
  "editor.malfarbe": "Kolor do malowania",
  "editor.malfarbeHinweis":
    "Proszę dotknąć kafelka. Tym kolorem będzie malowane i wypełniane.",
  "editor.gewaehlteFarbe": "Wybrany: {garn}",
  "editor.leinwandBeschriftung": "Pani wzór, {breite} na {hoehe} ściegów",
  "editor.ausgewaehlt": "Zaznaczono {anzahl} ściegów",
  "editor.nichtsAusgewaehlt": "Nic jeszcze nie zaznaczono",
  "editor.tippenHinweis":
    "Proszę dotknąć wzoru wybranym narzędziem. Wtedy przyciski tutaj staną się aktywne.",
  "editor.auswahlFaerben": "Pokoloruj zaznaczenie",
  "editor.auswahlKopieren": "Skopiuj zaznaczenie",
  "editor.alsMotivMerken": "Zapamiętaj jako motyw",
  "editor.nurDasSticken": "Haftuj tylko zaznaczone",
  "editor.nurDasGestickt":
    "Teraz haftowane będzie tylko zaznaczone. Cała reszta zostaje pustą kanwą – przyciskiem „Cofnij” można ją przywrócić.",
  "editor.auswahlNichtSticken": "Nie haftuj zaznaczonego",
  "editor.auswahlWeggelassen":
    "To miejsce zostaje pustą kanwą. Przyciskiem „Cofnij” można je przywrócić.",
  "editor.wiederAllesSticken": "Znów haftuj wszystko",
  "editor.wiederAllesGestickt": "Znów haftowane jest wszystko.",
  "editor.freieFelderTitel": "Wybrany sam motyw",
  "editor.freieFelder": "{anzahl} pól zostaje pustych – tam się nie haftuje.",
  "editor.auswahlAufheben": "Usuń zaznaczenie",
  "editor.kopiert": "Skopiowany kawałek",
  "editor.kopiertHinweis": "Skopiowano kawałek {w} × {h} ściegów.",
  "editor.kopieEinfuegen": "Wstaw kopię",
  "editor.kopiertMeldung": "Skopiowano {anzahl} ściegów. Proszę teraz dotknąć „Wstaw kopię”.",
  "editor.stueckEinsetzen": "Wstawianie kawałka",
  "editor.stueckSchieben":
    "Proszę przesunąć kawałek palcem we właściwe miejsce. Przyciskami „Zmniejsz kawałek” i „Powiększ kawałek” zmienia się jego rozmiar.",
  "editor.einsetzenMeldung":
    "Proszę przesunąć kawałek palcem we właściwe miejsce. Dopiero „Wstaw tutaj” zapisuje go na stałe.",
  "editor.stueckKleiner": "Zmniejsz kawałek",
  "editor.stueckGroesser": "Powiększ kawałek",
  "editor.stueckMasse": "{breite} × {hoehe} ściegów · {cmBreite} cm × {cmHoehe} cm",
  "editor.vierteldrehung": "Obróć o ćwierć",
  "editor.spiegelnWaagerecht": "Odbij w poziomie",
  "editor.spiegelnSenkrecht": "Odbij w pionie",
  "editor.hierEinsetzen": "Wstaw tutaj",
  "editor.ihreGarne": "Moje nici ({anzahl})",
  "editor.garnbedarf":
    "Razem potrzeba około {meter} nici. Szacunek dla dwóch nitek z jednej muliny – lepiej kupić trochę więcej.",
  "editor.farbeHinweis": "Dotknięty kolor będzie używany do malowania i kolorowania.",
  "editor.hinweisAufklappen": "Pokaż objaśnienie narzędzia",
  "editor.hinweisZuklappen": "Ukryj objaśnienie narzędzia",
  "editor.anderesGarnTitel": "Inna nitka dla tego koloru",
  "editor.anderesGarnText":
    "Kolory podawane przez producentów są przybliżone. Jeśli ma Pani przed sobą wzornik nici i inny odcień pasuje lepiej, proszę wybrać go tutaj.",
  "editor.garnGewechselt": "Ten kolor to teraz {marke} {code} – {name}.",
  "editor.motivMerkenTitel": "Zapamiętaj motyw",
  "editor.motivMerkenText": "Proszę nadać motywowi nazwę, żeby później go odnaleźć.",
  "editor.motivMerken": "Zapamiętaj motyw",
  "editor.motivName": "Nazwa motywu",
  "editor.motivNamePlatzhalter": "Na przykład: płatek kwiatu",
  "editor.motivGemerkt": "Motyw „{name}” został zapamiętany. Znajdzie go Pani na liście po prawej.",
  "editor.motivLoeschenTitel": "Na pewno usunąć motyw?",
  "editor.motivLoeschenText":
    "Motyw „{name}” zostanie usunięty na zawsze. Tego nie da się cofnąć.",
  "editor.standWiederher": "Wcześniejsza wersja jest z powrotem.",
  "editor.standGemerkt":
    "Ta wersja została zapamiętana. Zostanie zachowana, nawet jeśli będzie Pani jeszcze dużo pracować.",

  "bereich.bearbeiten": "Zmiana",
  "bereich.garne": "Nici",
  "bereich.muster": "Wzór",
  "bereich.gemerkt": "Zapisane",

  "werkzeug.frage": "Czym chce Pani pracować?",
  "werkzeuggruppe.ansehen": "Oglądanie",
  "werkzeuggruppe.auswaehlen": "Zaznaczanie",
  "werkzeuggruppe.malen": "Malowanie",
  "werkzeug.schieben": "Oglądanie i przesuwanie",
  "werkzeug.schiebenText":
    "Proszę przeciągnąć wzór w miejsce, które chce Pani obejrzeć. Nic przy tym nie zostaje zmienione.",
  "werkzeug.schiebenKurz": "Przesuń",
  "werkzeug.motivKurz": "Motyw",
  "werkzeug.flaecheKurz": "Obszar",
  "werkzeug.rechteckKurz": "Prostokąt",
  "werkzeug.freihandKurz": "Odręcznie",
  "werkzeug.malenKurz": "Maluj",
  "werkzeug.fuellenKurz": "Wypełnij",
  "werkzeug.motiv": "Zaznacz cały motyw",
  "werkzeug.motivText":
    "Proszę dotknąć środka kwiatka. Zaznaczy się wszystko, co pasuje do niego kolorem – także kilka odcieni. Każdy następny motyw dochodzi jednym dotknięciem.",
  "werkzeug.flaeche": "Zaznacz tę samą powierzchnię",
  "werkzeug.flaecheText":
    "Proszę dotknąć powierzchni. Zaznaczy się wszystko, co się z nią łączy i ma ten sam kolor.",
  "werkzeug.rechteck": "Zaznacz prostokąt",
  "werkzeug.rechteckText":
    "Proszę przeciągnąć palcem prostokąt nad obszarem, który ma zostać zaznaczony.",
  "werkzeug.freihand": "Zaznacz odręcznie",
  "werkzeug.freihandText":
    "Proszę obrysować obszar dookoła. Po puszczeniu palca zaznaczy się wszystko w środku.",
  "werkzeug.malen": "Maluj pojedyncze ściegi",
  "werkzeug.malenText":
    "Proszę dotknąć pól albo przejechać po nich palcem. Dostaną wybrany kolor.",
  "werkzeug.fuellen": "Pokoloruj powierzchnię",
  "werkzeug.fuellenText": "Proszę dotknąć powierzchni. Cała dostanie wybrany kolor.",

  "ansicht.titel": "Jak poruszać się po wzorze",
  "ansicht.mausrad":
    "Kółko myszy: wzór staje się większy i mniejszy – dokładnie tam, gdzie stoi wskaźnik.",
  "ansicht.ziehen": "Przeciąganie myszą albo palcem: przesuwanie wzoru.",
  "ansicht.zweiFinger":
    "Dwa palce na ekranie: przesuwanie i jednoczesne powiększanie albo pomniejszanie.",
  "ansicht.leertaste": "Przytrzymana spacja: przesuwanie bez zmiany narzędzia.",

  // --- Motiv aussuchen ---------------------------------------------------
  "motivsuche.hinweis":
    "Proszę dotknąć środka motywu. Każdy następny dochodzi – dotknięcie go jeszcze raz usuwa go z zaznaczenia.",
  "motivsuche.mehr": "Weź więcej",
  "motivsuche.weniger": "Weź mniej",
  "motivsuche.fastAlles":
    "Zaznaczony jest prawie cały wzór. Proszę dotknąć „Weź mniej”, jeśli chodzi tylko o jeden motyw.",

  "schrittname.gemalt": "Namalowane ściegi",
  "schrittname.einStichGemalt": "Namalowany jeden ścieg",
  "schrittname.flaecheGefaerbt": "Pokolorowana powierzchnia",
  "schrittname.auswahlGefaerbt": "Pokolorowane zaznaczenie",
  "schrittname.stueckEingesetzt": "Wstawiony kawałek",
  "schrittname.freigestellt": "Wybrany sam motyw",
  "schrittname.nichtGestickt": "Miejsce zostawione puste",
  "schrittname.wiederGestickt": "Znów haftowane wszystko",

  "glaettung.frage": "Jak spokojny ma być wzór?",
  "glaettung.stufe0": "bardzo szczegółowy",
  "glaettung.stufe1": "szczegółowy",
  "glaettung.stufe2": "wyważony",
  "glaettung.stufe3": "spokojny",
  "glaettung.stufe4": "spokojny i łatwy do haftowania",

  "farben.frage": "Ile kolorów ma mieć wzór?",
  "farben.gewuenscht": "kolorów: {anzahl}",

  // --- Farben in Worten ----------------------------------------------------
  // Im Polnischen steht die Stufe vor dem Farbwort und beide sind
  // Eigenschaftswoerter in maennlicher Form: "ciemny czerwony".
  "farbwort.zusammen": "{stufe} {ton}",
  "farbton.rot": "czerwony",
  "farbton.orange": "pomarańczowy",
  "farbton.braun": "brązowy",
  "farbton.gelb": "żółty",
  "farbton.oliv": "oliwkowy",
  "farbton.gruen": "zielony",
  "farbton.tuerkis": "turkusowy",
  "farbton.blau": "niebieski",
  "farbton.violett": "fioletowy",
  "farbton.rosa": "różowy",
  "farbton.weinrot": "bordowy",
  "farbton.beige": "beżowy",
  "farbton.weiss": "biały",
  "farbton.grau": "szary",
  "farbton.schwarz": "czarny",
  "farbstufe.sehrHell": "bardzo jasny",
  "farbstufe.hell": "jasny",
  "farbstufe.dunkel": "ciemny",
  "farbstufe.sehrDunkel": "bardzo ciemny",

  "legende.eigeneFarbe": "Własny kolor",
  "legende.stiche": "ściegów",
  "legende.sticheUndGarn": "nici · {stiche} ściegów",
  "legende.anderesGarn": "Inna nitka",
  "legende.anderesGarnFuer": "Inna nitka zamiast {garn}",

  "motive.titel": "Moje motywy",
  "motive.wirdGeholt": "Pobieranie motywów …",
  "motive.keine":
    "Nie ma jeszcze żadnych motywów. Proszę zaznaczyć obszar we wzorze i dotknąć „Zapamiętaj jako motyw”. Motywy zostaną zachowane także dla późniejszych wzorów.",
  "motive.ohneBild": "bez obrazka",
  "motive.groesse": "{w} × {h} ściegów",
  "motive.loeschen": "Usuń",
  "motive.fehlerLaden":
    "Nie udało się pobrać motywów. Proszę sprawdzić połączenie z internetem i wczytać stronę jeszcze raz.",
  "motive.fehlerMerken":
    "Nie udało się zapamiętać motywu. Proszę sprawdzić połączenie z internetem i spróbować jeszcze raz.",
  "motive.fehlerHolen":
    "Nie udało się pobrać tego motywu. Proszę sprawdzić połączenie z internetem i dotknąć go jeszcze raz.",
  "motive.fehlerLoeschen": "Nie udało się usunąć motywu. Proszę spróbować jeszcze raz.",

  "staende.titel": "Wcześniejsze wersje",
  "staende.merken": "Zapamiętaj tę wersję",
  "staende.wirdGemerkt": "Zapamiętywanie …",
  "staende.nochKeine": "Nie ma jeszcze wcześniejszych wersji.",
  "staende.wirdGeholt": "Pobieranie wersji …",
  "staende.erklaerung":
    "Gdy tylko zmieni Pani coś we wzorze, wersja zostanie zapisana sama. Zobaczy tu Pani wtedy wszystkie wcześniejsze wersje i w każdej chwili może do nich wrócić.",
  "staende.fehlerLaden":
    "Nie udało się pobrać wcześniejszych wersji. Proszę sprawdzić połączenie z internetem. Praca na ekranie pozostaje nienaruszona.",
  "staende.fehlerHolen":
    "Nie udało się pobrać tej wersji. Proszę sprawdzić połączenie z internetem i spróbować jeszcze raz.",
  "staende.fehlerMerken":
    "Nie udało się zapamiętać wersji. Proszę sprawdzić połączenie z internetem i spróbować jeszcze raz.",
  "staende.gemerkt": "Zapamiętana",
  "staende.sieArbeitenHier": " · tu Pani pracuje",
  "staende.eintrag": "{zeit} – {farben} kolorów",
  "staende.standVon": "Wersja z: {zeit}",
  "staende.wiederherstellen": "Przywróć tę wersję",
  "staende.schliessen": "Zamknij",
  "staende.vorschauText": "{farben} kolorów. {beschriftung}",
  "staende.nichtsVerloren":
    "Przywrócenie tej wersji nie spowoduje utraty nowszej pracy – zostanie ona jako osobna wersja na tym pasku.",
  "staende.dauerhaftMerken": "Zapamiętaj tę wersję na stałe",
  "staende.nichtMehrMerken": "Już nie zapamiętuj",
  "staende.vorschauBeschriftung": "Podgląd wersji z: {zeit}",
  "staende.heute": "Dzisiaj, {uhr}",
  "staende.gestern": "Wczoraj, {uhr}",
  "staende.datum": "{datum}, {uhr}",
  "staende.vonHandGemerkt": "Zapamiętana ręcznie",
  "staende.neuErzeugt": "Utworzona na nowo",
  "staende.farbanzahlGeaendert": "Zmieniona liczba kolorów",
  "staende.motivEingesetzt": "Wstawiony motyw",

  "garne.titel": "Moje nici",
  "garne.erklaerung":
    "Proszę wpisać tutaj, jakie nici ma Pani w domu. Przy tworzeniu wzoru można wtedy ustawić, żeby używać tylko tych nici.",
  "garne.zurueckMuster": "Wróć do wzoru",
  "garne.keinsEingetragen": "Nie wpisano jeszcze żadnej nitki.",
  "garne.eingetragen": "Wpisanych nici: {anzahl}.",
  "garne.zuHause": "To ma Pani w domu",
  "garne.zumEntfernen": "{name} · dotknij, aby usunąć",
  "garne.hinzufuegen": "Dodaj nitkę",
  "garne.wirdGeholt": "Pobieranie listy nici …",

  "garne.listeLeer":
    "Na liście nici nie ma jeszcze nic. Proszę raz wczytać kolory przyciskiem powyżej; dopóki to nie nastąpi, program liczy kolorami ze zdjęcia zamiast nićmi producenta.",
  "garne.alleEintragen": "Dodaj wszystkie {anzahl} kolorów",
  "garne.alleEntfernen": "Usuń wszystkie",
  "garne.nurMeineZeigen": "Pokaż tylko moje ({anzahl})",
  "garne.alleZeigen": "Pokaż znowu wszystkie ({anzahl})",
  "garne.alleEntfernenFrage": "Usunąć wszystkie nici z Pani listy?",
  "garne.alleEntfernenText":
    "Wpisane {anzahl} nici zostaną usunięte z listy. Paleta kolorów zostaje w całości, można je w każdej chwili dodać z powrotem.",
  "garne.alleEntfernenJa": "Tak, usuń wszystkie",
  "garne.antippenText":
    "Proszę dotknąć nitki, wtedy pojawi się na liście u góry. Drugie dotknięcie usuwa ją z powrotem.",
  "garne.suche": "Szukaj po numerze albo nazwie koloru",
  "garne.suchePlatzhalter": "Na przykład: 310 albo czerwony",
  "garne.sucheLeeren": "Wyczyść wyszukiwanie",
  "garne.nichtsGefunden":
    "Do „{suche}” nie ma żadnej nitki. Proszę spróbować numeru z banderoli, na przykład 310, albo po prostu dotknąć koloru poniżej.",
  "garne.habeIch": "Mam",
  "garne.jetztGewaehlt": "Teraz wybrana",
  "garne.ausgewaehlt": "Wybrana",
  "garne.fehlerLaden":
    "Nie udało się pobrać listy nici. Proszę sprawdzić połączenie z internetem i wczytać stronę jeszcze raz.",
  "garne.fehlerAendern":
    "Nie udało się zapisać tej zmiany. Proszę sprawdzić połączenie z internetem i dotknąć jeszcze raz.",

  "druck.titel": "Drukowanie wzoru",
  "druck.knopf": "Drukuj wzór",
  "druck.wirdVorbereitet": "Przygotowywanie …",
  "druck.zurueckMuster": "Wróć do wzoru",
  "druck.soSiehtAus": "Tak będzie wyglądał gotowy haft",
  "druck.vorschauBeschriftung": "Podgląd gotowego haftu",
  "druck.fertig":
    "Wzór jest gotowy. Otworzyło się nowe okno, z którego można go wydrukować.",
  "druck.sichern": "Zapisz wzór na urządzeniu",
  "druck.keinFenster":
    "Jeśli żadne okno się nie otworzyło, przeglądarka je zatrzymała. Proszę wtedy dotknąć przycisku powyżej.",
  "druck.ausDrucker": "To wyjdzie z drukarki",
  "druck.seiteVorschau": "Strona z podglądem gotowego haftu",
  "druck.seiteGarnliste": "Lista nici z symbolem, numerem, nazwą koloru, liczbą ściegów i zapotrzebowaniem",
  "druck.seitenFarbe": "Wzór w kolorze na {anzahl} kartkach, czyli razem {gesamt} kartek",
  "druck.blaetterHinweis":
    "Kartki zachodzą na siebie o dwa rzędy. Co dziesiąta linia jest grubsza, a na brzegach stoją numery rzędów.",
  "druck.brauchenSie": "To będzie Pani potrzebne",
  "druck.stoff": "Kanwa",
  "druck.stoffMasse": "Aida {zaehlung}, co najmniej {breite} cm × {hoehe} cm",
  "druck.farben": "Kolorów",
  "druck.stiche": "Ściegów",
  "druck.garnZusammen": "Nici razem",
  "druck.ungefaehr": "około {menge}",
  "druck.stoffHinweis":
    "Kanwa jest policzona z 5 cm zapasu z każdej strony, żeby dało się napiąć pracę. Zapotrzebowanie na nici dotyczy dwóch nitek z jednej muliny.",
  "druck.fehler":
    "Nie udało się przygotować wzoru do druku. Proszę spróbować jeszcze raz, a jeśli znowu się nie uda – z mniejszą liczbą ściegów na szerokość.",
  "druck.meinMuster": "Mój wzór",

  "pdf.fertigeGroesse": "Gotowy rozmiar {breite} cm × {hoehe} cm na kanwie Aida {zaehlung}",
  "pdf.sticheFarben": "{breite} × {hoehe} ściegów · {farben} kolorów",
  "pdf.blaetterZusammen": "Tak układają się kartki",
  "pdf.blaetterHinweis":
    "Kartek: {anzahl}, każda z zakładką {ueberlappung} rzędów. Oznaczenie stoi na dole każdej kartki.",
  "pdf.einBlatt": "Cały wzór mieści się na jednej kartce.",
  "pdf.garnliste": "Moje nici",
  "pdf.garnlisteKopf": "{anzahl} kolorów · {name}",
  "pdf.garnlisteHinweis":
    "Zużycie nici jest szacunkowe i dotyczy dwóch nitek z jednej muliny.",
  "pdf.spalteSymbol": "Symbol",
  "pdf.spalteGarn": "Nitka",
  "pdf.spalteFarbe": "Kolor",
  "pdf.spalteStiche": "Ściegi",
  "pdf.spalteGarnNoetig": "Potrzeba nici",
  "pdf.eigeneFarbe": "własny kolor",
  "pdf.summe": "Razem {stiche} ściegów i około {garn} nici.",
  "pdf.freieFelder": "{anzahl} pól zostaje pustych",
  "pdf.masseKurz": "{breite} cm × {hoehe} cm na kanwie Aida {zaehlung}",
  "pdf.reihenSpalten": "Rzędy {vonReihe} do {bisReihe} · kolumny {vonSpalte} do {bisSpalte}",
  "pdf.blattFuss": "kartka {spalte} od lewej, {reihe} od góry",

  "arbeit.bildLesen": "Wczytywanie zdjęcia.",
  "arbeit.herunterrechnen": "Przeliczanie zdjęcia na siatkę ściegów.",
  "arbeit.rauschen": "Usuwanie szumu ze zdjęcia.",
  "arbeit.farbenFassen": "Łączenie kolorów.",
  "arbeit.garneSuchen": "Szukanie pasującej nitki do każdego koloru.",
  "arbeit.vorbereiten": "Przygotowywanie wzoru.",
  "arbeit.glaetten": "Wygładzanie pojedynczych ściegów.",
  "arbeit.druckVorbereiten": "Przygotowywanie wzoru do druku.",
  "arbeit.vorschauZeichnen": "Rysowanie podglądu.",
  "arbeit.garnlisteSchreiben": "Zapisywanie listy nici.",
  "arbeit.blattZeichnen": "Rysowanie kartki {nummer} z {gesamt}.",
  "arbeit.dateiBauen": "Składanie pliku.",
  "arbeit.fehlerBerechnung":
    "Nie udało się obliczyć wzoru. Proszę spróbować jeszcze raz z mniejszym wzorem albo mniejszą liczbą kolorów.",
  "arbeit.fehlerKeinMuster":
    "Nie ma jeszcze żadnego wzoru. Proszę cofnąć się o krok i wybrać zdjęcie.",
  "arbeit.fehlerKeinBild":
    "Nie wybrano jeszcze zdjęcia. Proszę cofnąć się o krok i wybrać zdjęcie.",
  "arbeit.fehlerBildLesen":
    "Nie udało się odczytać tego zdjęcia. Proszę wybrać inne, najlepiej zdjęcie w formacie JPG albo PNG.",

  // --- Strona startowa: moje wzory -----------------------------------------
  "kopf.meineMuster": "Moje wzory",
  "start.titel": "Moje wzory",
  "start.erklaerung":
    "Tu są zdjęcia, z których powstał już wzór – ostatnio używane na początku. Proszę dotknąć jednego, żeby pracować dalej.",
  "start.zuletzt": "Ostatnio używane",
  "start.wirdGeholt": "Pobieranie wzorów …",
  "start.nochNichts":
    "Tu jeszcze nic nie ma. Proszę zacząć od zdjęcia – zielony przycisk na dole prowadzi dalej.",
  "start.neuesBild": "Wybierz nowe zdjęcie",
  "start.fussHinweis": "Nowe zdjęcie można wybrać w każdej chwili.",
  "start.ohneBild": "bez zdjęcia",
  "start.ohneNamen": "Bez nazwy",
  "start.staende": "Zapisane wersje: {anzahl}",
  "start.standEiner": "Zapisana wersja: 1",
  "start.farben": "{anzahl} kolorów",
  "start.oeffnen": "Otwórz",
  "start.vergleichen": "Wszystkie wersje",
  "start.loeschen": "Usuń",
  "start.loeschenTitel": "Usunąć „{name}”?",
  "start.loeschenText":
    "Zdjęcie i wszystkie zapisane wersje zostaną usunięte – z tego urządzenia i z kopii w internecie. Tego nie da się cofnąć.",

  // --- Kopia w internecie --------------------------------------------------
  "sicherung.gesichert": "Zapisane w internecie",
  "sicherung.laeuft": "Zapisywanie …",
  "sicherung.wartet": "Zapisze się, gdy będzie internet ({anzahl})",
  "sicherung.fehler":
    "Kopia w internecie w tej chwili nie działa. Na tym urządzeniu wszystko jest.",

  // --- Wszystkie wersje na raz ---------------------------------------------
  "vergleich.titel": "Wszystkie wersje",
  "vergleich.erklaerung":
    "Każda zapisana wersja tego zdjęcia. Proszę dotknąć jednej, żeby zobaczyć ją w dużym widoku.",
  "vergleich.lupeKleiner": "Mniejsze",
  "vergleich.lupeGroesser": "Większe",
  "vergleich.einpassen": "Cały wzór",
  "vergleich.fertig": "Gotowe",
  "vergleich.zurueck": "Wróć do przeglądu",
  "vergleich.wievielte": "Wersja {nummer} z {gesamt}",
  "vergleich.frueher": "Wcześniejsza wersja",
  "vergleich.spaeter": "Późniejsza wersja",
  "vergleich.nehmen": "Weź tę wersję",
  "vergleich.schonHier": "Tu Pani właśnie pracuje",
  "vergleich.angaben": "{farben} kolorów · {breite} × {hoehe} ściegów",
  "staende.vergleichen": "Zobacz wszystkie wersje",
  "bild.schonBekannt":
    "To zdjęcie już tu było: nowa wersja dołączy do „{name}”. Wcześniejsze wersje zostają i można je porównać.",
};
