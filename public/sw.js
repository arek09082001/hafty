/*
 * Der Service Worker: dafür, dass die App ohne Internet läuft.
 * ---------------------------------------------------------------------------
 *
 * Die App rechnet ohnehin alles im Browser – Muster, Glättung, Legende, PDF.
 * Gefehlt hat nur, dass das Programm selbst nachgeladen werden musste. Genau
 * das erledigt diese Datei: sie legt die Seiten und ihre Bausteine im
 * Zwischenspeicher des Browsers ab.
 *
 * Beim Einrichten werden die vier Schritte einmal geholt und aus ihrem
 * Quelltext die Adressen aller Skripte und Stilvorlagen gelesen. So ist die
 * App vollständig, sobald sie installiert ist – und nicht erst, nachdem man
 * jede Seite einmal von Hand aufgerufen hat.
 *
 * Danach gilt:
 *   - Seitenaufrufe: erst das Netz, sonst der Zwischenspeicher. So kommt
 *     eine neue Fassung an, sobald Verbindung besteht, und ohne Verbindung
 *     kommt trotzdem die Seite.
 *   - /_next/static/… und die festen Beigaben (Schriften, Symbole): immer aus
 *     dem Zwischenspeicher. Diese Adressen tragen einen Prüfwert im Namen
 *     oder ändern sich nie.
 *   - **Alles andere: erst das Netz**, der Zwischenspeicher nur als Rückfall.
 *
 * Der letzte Punkt war einmal andersherum, und das war ein Fehler. „Alles
 * andere" ist nämlich nicht nur Beiwerk: darunter fallen auch die Nachladungen
 * des Seitenrouters (`?_rsc=…`) – also Seiteninhalt. Der landete damit
 * unbefristet im Zwischenspeicher und wurde von da an bevorzugt ausgeliefert.
 * Wer eine solche Antwort einmal erwischt hatte, sah die alte Fassung auch
 * dann noch, wenn längst eine neue ausgeliefert war, und kam ohne „Websitedaten
 * löschen" nicht mehr heraus. Aufrufe an `/api/…` gehen den Zwischenspeicher
 * ohnehin nichts an.
 */

/**
 * Der Name des Zwischenspeichers – mit Nummer.
 *
 * Beim Aktivieren wird alles gelöscht, was anders heißt. Die Nummer
 * hochzuzählen ist deshalb der Weg, einen verkorksten Zwischenspeicher bei
 * allen Geräten wegzuräumen, ohne dass jemand etwas tun muss.
 */
const LAGER = "stickmuster-v2";

/** Was sich nie ändert und darum aus dem Zwischenspeicher kommen darf. */
function unveraenderlich(pfad) {
  return (
    pfad.startsWith("/_next/static/") ||
    pfad.startsWith("/schriften/") ||
    BEIWERK.includes(pfad)
  );
}

/** Die Startseite, die vier Schritte und die Garnseite – alle Seiten der App. */
const SEITEN = [
  "/",
  "/schritt/bild",
  "/schritt/einstellungen",
  "/schritt/muster",
  "/schritt/drucken",
  "/garne",
];

/** Was sonst noch dazugehört und nicht im Quelltext der Seiten steht. */
const BEIWERK = [
  "/manifest.webmanifest",
  "/symbol-192.png",
  "/symbol-512.png",
  "/symbol-maskierbar-512.png",
  "/icon.svg",
  "/schriften/schrift-normal.ttf",
  "/schriften/schrift-fett.ttf",
];

/**
 * Aus dem Quelltext einer Seite die Adressen der Bausteine lesen.
 *
 * Die Namen enthalten einen Prüfwert und ändern sich mit jeder Fassung; sie
 * lassen sich deshalb nicht fest hinschreiben. Sie stehen aber in der Seite,
 * und dort holen wir sie.
 */
function bausteineFinden(text) {
  const gefunden = new Set();
  for (const treffer of text.matchAll(/(?:src|href)="(\/_next\/[^"]+)"/g)) {
    gefunden.add(treffer[1].replace(/&amp;/g, "&"));
  }
  return [...gefunden];
}

async function einrichten() {
  const lager = await caches.open(LAGER);

  // Das Beiwerk darf einzeln scheitern, ohne die Einrichtung zu stoppen.
  await Promise.all(
    BEIWERK.map((adresse) => lager.add(new Request(adresse, { cache: "reload" })).catch(() => {})),
  );

  const bausteine = new Set();
  for (const seite of SEITEN) {
    try {
      const antwort = await fetch(seite, { cache: "reload" });
      if (!antwort.ok) continue;
      const text = await antwort.clone().text();
      await lager.put(seite, antwort);
      for (const b of bausteineFinden(text)) bausteine.add(b);
    } catch {
      // Ohne Verbindung lässt sich nichts einrichten – dann eben beim
      // nächsten Mal.
    }
  }

  await Promise.all(
    [...bausteine].map((adresse) =>
      lager.add(new Request(adresse, { cache: "reload" })).catch(() => {}),
    ),
  );
}

self.addEventListener("install", (ereignis) => {
  // Sofort übernehmen: die alte Fassung soll nicht noch eine Sitzung lang
  // weiterlaufen.
  self.skipWaiting();
  ereignis.waitUntil(einrichten());
});

self.addEventListener("activate", (ereignis) => {
  ereignis.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name !== LAGER) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (ereignis) => {
  // Die Seite kann nach einer neuen Fassung noch einmal einrichten lassen.
  if (ereignis.data === "neu-einrichten") ereignis.waitUntil(einrichten());
});

self.addEventListener("fetch", (ereignis) => {
  const anfrage = ereignis.request;
  if (anfrage.method !== "GET") return;

  const adresse = new URL(anfrage.url);
  // Fremde Adressen gehen uns nichts an.
  if (adresse.origin !== self.location.origin) return;

  // Die eigene Schnittstelle: nie zwischenspeichern. Dort hängt der Zugang
  // zum gemeinsamen Konto dran, und der läuft ab.
  if (adresse.pathname.startsWith("/api/")) return;

  // Unveränderliche Bausteine: was einmal da ist, bleibt gültig.
  if (unveraenderlich(adresse.pathname)) {
    ereignis.respondWith(
      caches.match(anfrage).then(
        (gefunden) =>
          gefunden ??
          fetch(anfrage).then(async (antwort) => {
            if (antwort.ok) (await caches.open(LAGER)).put(anfrage, antwort.clone());
            return antwort;
          }),
      ),
    );
    return;
  }

  // Seitenaufrufe: erst das Netz, sonst der Zwischenspeicher.
  if (anfrage.mode === "navigate") {
    ereignis.respondWith(
      (async () => {
        try {
          const antwort = await fetch(anfrage);
          if (antwort.ok) (await caches.open(LAGER)).put(adresse.pathname, antwort.clone());
          return antwort;
        } catch {
          const lager = await caches.open(LAGER);
          return (
            (await lager.match(adresse.pathname)) ??
            (await lager.match("/")) ??
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Alles Übrige – darunter die Nachladungen des Seitenrouters: erst das
  // Netz, der Zwischenspeicher nur, wenn keine Verbindung besteht.
  ereignis.respondWith(
    (async () => {
      try {
        const antwort = await fetch(anfrage);
        if (antwort.ok && antwort.type === "basic") {
          (await caches.open(LAGER)).put(anfrage, antwort.clone());
        }
        return antwort;
      } catch {
        const gefunden = await caches.match(anfrage);
        if (gefunden) return gefunden;
        throw new Error("offline");
      }
    })(),
  );
});
