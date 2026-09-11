/*
 * Der Service Worker: dafür, dass die App ohne Internet läuft –
 * und dafür, dass eine neue Fassung sofort ankommt.
 * ---------------------------------------------------------------------------
 *
 * Die App rechnet ohnehin alles im Browser – Muster, Glättung, Legende, PDF.
 * Gefehlt hat nur, dass das Programm selbst nachgeladen werden musste. Genau
 * das erledigt diese Datei: sie legt die Seiten und ihre Bausteine im
 * Zwischenspeicher des Browsers ab.
 *
 * **Die Fassung steht in der Adresse.** Angemeldet wird `/sw.js?v=…` mit der
 * Kennung des Bauvorgangs (siehe `OhneNetz.tsx` und `next.config.ts`). Das ist
 * der Kern der Sache: ein Browser merkt eine neue Fassung nur, wenn sich die
 * Datei des Service Workers **selbst** ändert. Diese Datei änderte sich nie –
 * sie steht ja fest im Programm. Eine installierte App blieb deshalb auf dem
 * Zwischenspeicher sitzen, mit dem sie einmal eingerichtet worden war, und die
 * Nutzerin sah Wochen später noch die alte Fassung. Mit der Fassung in der
 * Adresse ist nach jeder Veröffentlichung ein anderer Service Worker
 * anzumelden, und der räumt beim Aktivieren alles Alte weg.
 *
 * Danach gilt:
 *   - Seitenaufrufe: erst das Netz, sonst der Zwischenspeicher. So kommt
 *     eine neue Fassung an, sobald Verbindung besteht, und ohne Verbindung
 *     kommt trotzdem die Seite.
 *   - /_next/static/… und die festen Beigaben (Schriften, Symbole): aus
 *     dem Zwischenspeicher **dieser Fassung**. Diese Adressen tragen einen
 *     Prüfwert im Namen oder ändern sich nie.
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

/** Die Fassung, mit der dieser Service Worker angemeldet wurde. */
const FASSUNG = new URL(self.location.href).searchParams.get("v") || "ohne";

/**
 * Der Name des Zwischenspeichers – mit der Fassung darin.
 *
 * Beim Aktivieren wird alles gelöscht, was anders heißt. Jede neue Fassung
 * fängt damit mit einem leeren Zwischenspeicher an: nichts von gestern bleibt
 * liegen, und es gibt keinen Weg, auf dem eine alte Datei überleben könnte.
 */
const LAGER = `stickmuster-${FASSUNG}`;

/** Was sich nie ändert und darum aus dem Zwischenspeicher kommen darf. */
function unveraenderlich(pfad) {
  return (
    pfad.startsWith("/_next/static/") ||
    pfad.startsWith("/schriften/") ||
    BEIWERK.includes(pfad)
  );
}

/** Alle Seiten der App. */
const SEITEN = [
  "/",
  "/kanwa",
  "/wzory",
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
  "/apple-icon.png",
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
      // `cache: "reload"` geht am Browserzwischenspeicher vorbei: sonst
      // richtete sich die neue Fassung mit den alten Dateien ein.
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
      // Alles, was zu einer anderen Fassung gehört, fliegt weg.
      for (const name of await caches.keys()) {
        if (name !== LAGER) await caches.delete(name);
      }
      await self.clients.claim();
      // Den offenen Fenstern Bescheid sagen. Sie laden sich daraufhin neu,
      // damit auch ein Fenster, das seit gestern offen steht, die neue
      // Fassung zeigt (siehe `OhneNetz.tsx`).
      for (const fenster of await self.clients.matchAll({ type: "window" })) {
        fenster.postMessage({ art: "neue-fassung", fassung: FASSUNG });
      }
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

  // Der Service Worker selbst: immer frisch aus dem Netz. Nur so merkt der
  // Browser überhaupt, dass es eine neue Fassung gibt.
  if (adresse.pathname === "/sw.js") return;

  // Unveränderliche Bausteine: was einmal da ist, bleibt gültig.
  if (unveraenderlich(adresse.pathname)) {
    ereignis.respondWith(
      (async () => {
        // Ausdrücklich nur im Lager **dieser** Fassung nachsehen und nicht
        // über alle Zwischenspeicher hinweg: sonst käme nach einer
        // Veröffentlichung womöglich noch ein Baustein von gestern heraus.
        const lager = await caches.open(LAGER);
        const gefunden = await lager.match(anfrage);
        if (gefunden) return gefunden;
        const antwort = await fetch(anfrage);
        if (antwort.ok) lager.put(anfrage, antwort.clone());
        return antwort;
      })(),
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
        const lager = await caches.open(LAGER);
        const gefunden = await lager.match(anfrage);
        if (gefunden) return gefunden;
        throw new Error("offline");
      }
    })(),
  );
});
