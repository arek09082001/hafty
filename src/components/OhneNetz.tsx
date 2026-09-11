"use client";

import { useEffect } from "react";

/**
 * Meldet den Service Worker an – und sorgt dafür, dass eine neue Fassung
 * sofort ankommt.
 * ---------------------------------------------------------------------------
 *
 * Sichtbar ist hier nichts. Die Arbeit macht public/sw.js; diese Zeilen
 * sorgen dafür, dass der Browser ihn kennt, dass er regelmäßig nach einer
 * neuen Fassung schaut – und dass ein Fenster, in dem die alte Fassung läuft,
 * sich von selbst neu lädt, sobald die neue übernommen hat.
 *
 * Drei Dinge machen das aus:
 *
 *  1. **Die Fassung steht in der Adresse** (`/sw.js?v=…`). Ein Browser merkt
 *     eine neue Fassung nur, wenn sich die Datei des Service Workers ändert.
 *     Sie steht aber fest im Programm und änderte sich nie – eine installierte
 *     App blieb deshalb monatelang auf ihrem Stand sitzen.
 *  2. **Nachgesehen wird immer wieder**: beim Start, bei jeder Rückkehr zur
 *     App und stündlich. Eine als Programm installierte App wird selten neu
 *     geladen; ohne das Nachsehen bliebe sie auch bei bester Verbindung alt.
 *  3. **Neu geladen wird von selbst**, sobald der neue Service Worker
 *     übernommen hat. Die Arbeit geht dabei nicht verloren: der Arbeitsstand
 *     liegt fortlaufend in der Datenbank des Browsers.
 */

/** Wie oft nach einer neuen Fassung geschaut wird. */
const NACHSEHEN_ALLE = 60 * 60 * 1000;

export function OhneNetz() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let abgebrochen = false;
    let neuLaden = false;
    let zeitgeber = 0;
    let beiSichtbar: (() => void) | null = null;

    /**
     * Das Fenster neu laden – aber nur einmal.
     *
     * Ohne den Riegel liefe die App im Kreis: jedes Neuladen kann einen
     * weiteren Wechsel auslösen, und die Nutzerin sähe eine Seite, die sich
     * immerzu selbst neu lädt.
     */
    const neuStarten = () => {
      if (neuLaden) return;
      neuLaden = true;
      window.location.reload();
    };

    /** Welche Fassung steht in der Adresse eines Service Workers? */
    const fassungVon = (adresse: string | null | undefined) => {
      if (!adresse) return null;
      try {
        return new URL(adresse, window.location.href).searchParams.get("v");
      } catch {
        return null;
      }
    };

    /**
     * Die Fassung, die dieses Fenster gerade bedient.
     *
     * Sie mitzuschreiben ist nötig, weil beide Wege – der Wechsel des
     * Bedieners und die Nachricht aus dem Service Worker – zu **derselben**
     * Übernahme gehören können. Verglichen wird deshalb die Fassung und
     * nicht gezählt, wie oft etwas passiert ist.
     *
     * Beim allerersten Besuch gibt es noch keine: dann wird die erste nur
     * gemerkt. Ein Fenster neu zu laden, das gerade erst geöffnet wurde,
     * wäre Unfug.
     */
    let laufendeFassung = fassungVon(navigator.serviceWorker.controller?.scriptURL);

    const pruefen = (neueFassung: string | null) => {
      if (!neueFassung) return;
      if (laufendeFassung === null) {
        laufendeFassung = neueFassung;
        return;
      }
      if (neueFassung === laufendeFassung) return;
      laufendeFassung = neueFassung;
      neuStarten();
    };

    const beiWechsel = () => pruefen(fassungVon(navigator.serviceWorker.controller?.scriptURL));
    const beiNachricht = (e: MessageEvent) => {
      if (e.data?.art === "neue-fassung") pruefen(e.data.fassung ?? null);
    };

    navigator.serviceWorker.addEventListener("controllerchange", beiWechsel);
    navigator.serviceWorker.addEventListener("message", beiNachricht);

    navigator.serviceWorker
      // Die Fassung steht in der Adresse; `updateViaCache: "none"` sorgt
      // dafür, dass die Datei selbst nie aus dem Browserzwischenspeicher
      // kommt.
      .register(`/sw.js?v=${process.env.NEXT_PUBLIC_FASSUNG ?? "ohne"}`, {
        updateViaCache: "none",
      })
      .then((anmeldung) => {
        if (abgebrochen) return;

        const nachsehen = () => {
          anmeldung.update().catch(() => {
            // Ohne Verbindung gibt es nichts nachzusehen.
          });
        };

        // Sofort, bei jeder Rückkehr zur App und dann regelmäßig.
        nachsehen();
        beiSichtbar = () => {
          if (document.visibilityState === "visible") nachsehen();
        };
        document.addEventListener("visibilitychange", beiSichtbar);
        zeitgeber = window.setInterval(nachsehen, NACHSEHEN_ALLE);

        // Ist die neue Fassung fertig eingerichtet, soll sie nicht warten,
        // bis alle Fenster geschlossen sind.
        anmeldung.addEventListener("updatefound", () => {
          const neu = anmeldung.installing;
          neu?.addEventListener("statechange", () => {
            if (neu.state === "installed" && navigator.serviceWorker.controller) {
              neu.postMessage("neu-einrichten");
            }
          });
        });
      })
      .catch(() => {
        // Ohne Service Worker läuft die App weiter, nur eben nicht offline.
        // Das ist kein Fehler, den die Nutzerin sehen müsste.
      });

    return () => {
      abgebrochen = true;
      if (zeitgeber) window.clearInterval(zeitgeber);
      if (beiSichtbar) document.removeEventListener("visibilitychange", beiSichtbar);
      navigator.serviceWorker.removeEventListener("controllerchange", beiWechsel);
      navigator.serviceWorker.removeEventListener("message", beiNachricht);
    };
  }, []);

  return null;
}
