/**
 * Alle sichtbaren Texte der App – auf Polnisch.
 *
 * Hier stand einmal dieselbe Tabelle zweimal, deutsch und polnisch, mit einer
 * Sprachwahl in der Kopfzeile. Gebraucht wurde davon nur eine Hälfte: die App
 * ist für eine Person gebaut, und die liest Polnisch. Die deutsche Tabelle
 * und die Wahl dazwischen sind deshalb weg – eine Tabelle weniger, die beim
 * nächsten neuen Text mitgepflegt werden muss.
 *
 * Die Schlüssel bleiben deutsch benannt (`allgemein.abbrechen`). Sie sind
 * nichts, was jemand zu sehen bekommt, und der übrige Programmtext ist es
 * ebenso; sie hier umzubenennen hiesse, jede Fundstelle in der App
 * anzufassen, ohne dass sich etwas ändert.
 *
 * Platzhalter stehen in geschweiften Klammern: {anzahl}, {name}.
 */

export const TEXTE = {
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
  "zuschnitt.freihandText":
    "Albo ręcznie: dotknąć wnętrza ramki i przesunąć, pociągnąć za róg lub krawędź, aż wycinek będzie pasował. Dotknięcie zdjęcia obok ramki i pociągnięcie tworzy zupełnie nową ramkę.",
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
  "glaettung.rechnet": "Wzór jest właśnie przeliczany …",
  "glaettung.fertig": "Wzór odpowiada suwakowi.",
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
  "editor.wirdErstellt": "Wzór ze zdjęcia „{name}” jest właśnie obliczany.",
  "editor.zurueckGroesse": "Wróć do rozmiaru i kolorów",
  "editor.kleiner": "Mniejszy",
  "editor.groesser": "Większy",
  "editor.allesZeigen": "Pokaż całość",
  "editor.symboleAn": "Symbole wł.",
  "editor.symboleAus": "Symbole wył.",
  "editor.gitterAn": "Kratka wł.",
  "editor.gitterAus": "Kratka wył.",
  // Podgląd haftu: wzór jako gotowa robota, a nie jako plan w kratkę.
  "editor.sticheAn": "Jak w haftcie",
  "editor.sticheAus": "Jak w kratce",
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
  "auswahl.soGehts": "Jak zaznaczyć",
  "auswahl.danach": "Gdy coś jest zaznaczone, można tutaj:",
  "auswahl.danachSticken": "haftować tylko to miejsce, a resztę pominąć",
  "auswahl.danachWeglassen": "pominąć dokładnie to miejsce",
  "auswahl.danachFaerben": "pokolorować to miejsce jednym kolorem",
  "auswahl.danachKopieren": "skopiować to miejsce i wstawić gdzie indziej",
  "auswahl.danachMerken": "zapamiętać to miejsce jako motyw, także do innych wzorów",
  "auswahl.nurDas": "Haftuj tylko to",
  "auswahl.nurDasErklaerung": "Wszystko poza zaznaczeniem zostaje pustą kanwą.",
  "auswahl.weglassen": "Pomiń to miejsce",
  "auswahl.weglassenErklaerung": "Pustą kanwą zostaje tylko zaznaczenie, reszta jest haftowana.",
  "editor.auswahlFaerben": "Pokoloruj zaznaczenie",
  "editor.auswahlKopieren": "Skopiuj zaznaczenie",
  "editor.alsMotivMerken": "Zapamiętaj jako motyw",
  "editor.nurDasGestickt":
    "Teraz haftowane będzie tylko zaznaczone. Cała reszta zostaje pustą kanwą – przyciskiem „Cofnij” można ją przywrócić.",
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
  "editor.achteldrehung": "Obróć o 45°",
  "editor.vierteldrehung": "Obróć o 90°",
  "editor.schraegHinweis":
    "Kawałek stoi skosem ({winkel}°) i jest ułożony na kratkę ściegów – dlatego brzegi idą schodkami. Jeszcze jedno dotknięcie „Obróć o 45°” i znowu stanie prosto.",
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
  "staende.loeschen": "Usuń tę wersję",
  "staende.loeschenTitel": "Na pewno usunąć tę wersję?",
  "staende.loeschenText":
    "Wersja z {zeit} zostanie trwale usunięta. Praca na ekranie pozostaje bez zmian.",
  "staende.fehlerLoeschen":
    "Nie udało się usunąć wersji. Proszę spróbować jeszcze raz.",
  "staende.nichtMehrMerken": "Już nie zapamiętuj",
  "staende.vorschauBeschriftung": "Podgląd wersji z: {zeit}",
  "staende.heute": "Dzisiaj, {uhr}",
  "staende.gestern": "Wczoraj, {uhr}",
  "staende.datum": "{datum}, {uhr}",
  "staende.vonHandGemerkt": "Zapamiętana ręcznie",
  "staende.neuErzeugt": "Utworzona na nowo",
  "staende.leereKanwa": "Pusta kanwa",
  "staende.farbanzahlGeaendert": "Zmieniona liczba kolorów",
  "staende.vorBildwechsel": "Zapamiętana przed zmianą zdjęcia",
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
  "vergleich.groesse": "{cmBreite} cm × {cmHoehe} cm · Aida {zaehlung}",
  "vergleich.angaben": "{farben} kolorów · {breite} × {hoehe} ściegów",
  "vergleich.nurFarben": "{farben} kolorów",
  "vergleich.loeschen": "Usuń tę wersję",
  "vergleich.loeschenKurz": "Usuń",
  "vergleich.loeschenTitel": "Usunąć tę wersję?",
  "vergleich.loeschenText":
    "Wersja z {zeit} zostanie usunięta – z tego urządzenia i z kopii w internecie. Pozostałe wersje zostają. Tego nie da się cofnąć.",
  "staende.vergleichen": "Zobacz wszystkie wersje",
  "bild.schonBekannt":
    "To zdjęcie już tu było: nowa wersja dołączy do „{name}”. Wcześniejsze wersje zostają i można je porównać.",

  // --- Pusta kanwa, zarządzanie, nowa wersja -------------------------------
  "allgemein.neueFassung": "Jest nowa wersja aplikacji – odświeżam …",

  "einst.zahlBereich": "Można też wpisać liczbę: od {min} do {max}.",

  "kopf.verwalten": "Zarządzaj",

  "start.leereKanwa": "Zacznij od pustej kanwy",
  "start.alleVerwalten": "Zarządzaj wszystkimi wzorami",

  "kanwa.titel": "Pusta kanwa",
  "kanwa.erklaerung":
    "Wzór bez zdjęcia. Proszę wybrać, ile kratek ma mieć kanwa – a potem układać na niej własne motywy i kolory.",
  "kanwa.name": "Nazwa wzoru",
  "kanwa.namePlatzhalter": "np. Alfabet, Bordiura, Róże",
  "kanwa.nameHinweis": "Pod tą nazwą wzór będzie widoczny na liście „Moje wzory”.",
  "kanwa.ohneNamen": "Pusta kanwa",
  "kanwa.breite": "Szerokość kanwy",
  "kanwa.hoehe": "Wysokość kanwy",
  "kanwa.anlegen": "Utwórz pustą kanwę",
  "kanwa.wirdAngelegt": "Tworzenie …",
  "kanwa.zurueck": "Wróć do moich wzorów",
  "kanwa.fehler": "Nie udało się utworzyć pustej kanwy. Proszę spróbować jeszcze raz.",
  "kanwa.hinweis":
    "Na początku kanwa jest pusta – to czysty materiał. W następnym kroku proszę dodać kolor („Moje nici” → „Dodaj kolor”) albo wstawić zapisany motyw („Zapisane” → „Moje motywy”).",

  "editor.farbeDazunehmen": "Dodaj kolor",
  "editor.farbeDazuTitel": "Dodaj kolor do wzoru",
  "editor.farbeDazuText":
    "Proszę dotknąć nitki. Ten kolor dołączy do listy i od razu będzie nim można malować.",
  "editor.schonInDerListe": "Już na liście",
  "editor.farbeDazugenommen": "Dodano kolor: {marke} {code} · {name}",
  "editor.farbeVoll": "Wzór ma już najwięcej kolorów, ile się da. Nowy kolor się nie zmieści.",
  "editor.farbenAusMotiv": "Kolory motywu dołączyły do listy: {anzahl}.",
  "editor.ohneFotoTitel": "Wzór bez zdjęcia",
  "editor.ohneFotoText":
    "Ten wzór powstał na pustej kanwie, więc nie ma zdjęcia do wygładzania. Proszę malować i wstawiać motywy.",

  "verwalten.titel": "Zarządzaj wzorami",
  "verwalten.erklaerung":
    "Tu są wszystkie zapisane wzory i motywy: można je otworzyć, nazwać po swojemu albo usunąć.",
  "verwalten.zurueck": "Wróć do moich wzorów",
  "verwalten.suche": "Szukaj wzoru",
  "verwalten.suchePlatzhalter": "Nazwa wzoru",
  "verwalten.alleMuster": "Wszystkie wzory ({anzahl})",
  "verwalten.alleMotive": "Moje motywy ({anzahl})",
  "verwalten.motiveErklaerung":
    "Motywy należą do Pani, nie do jednego wzoru: raz zapisane, można je wstawić do każdego wzoru – także na pustą kanwę.",
  "verwalten.nichtsGefunden": "Nic nie znaleziono dla „{suche}”.",
  "verwalten.umbenennen": "Zmień nazwę",
  "verwalten.umbenennenTitel": "Nowa nazwa",
  "verwalten.umbenennenText": "Proszę wpisać nazwę, po której łatwo Pani rozpozna tę pracę.",
  "verwalten.namenSpeichern": "Zapisz nazwę",
  "verwalten.neuerName": "Nowa nazwa",
  "verwalten.umbenannt": "Nowa nazwa: {name}",
  "verwalten.fehlerUmbenennen": "Nie udało się zmienić nazwy. Proszę spróbować jeszcze raz.",
  "verwalten.fehlerOeffnen": "Nie udało się otworzyć tego wzoru. Proszę spróbować jeszcze raz.",
  "verwalten.motivLoeschenTitel": "Usunąć motyw „{name}”?",
  "verwalten.motivLoeschenText":
    "Motyw zniknie z listy motywów. Wzory, w których już go wyhaftowano, zostają bez zmian.",
} as const;

export type Textschluessel = keyof typeof TEXTE;
