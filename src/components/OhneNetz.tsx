"use client";

import { useEffect } from "react";

/**
 * Meldet den Service Worker an – damit die App ohne Internet läuft.
 *
 * Sichtbar ist hier nichts. Die Arbeit macht public/sw.js; diese Zeilen
 * sorgen nur dafür, dass der Browser ihn kennt und bei jedem Start nach
 * einer neuen Fassung schaut.
 */
export function OhneNetz() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let abgebrochen = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then((anmeldung) => {
        if (abgebrochen) return;
        // Nach einer neuen Fassung noch einmal einrichten, damit auch die
        // Seiten aktuell im Zwischenspeicher liegen.
        anmeldung.addEventListener("updatefound", () => {
          const neu = anmeldung.installing;
          neu?.addEventListener("statechange", () => {
            if (neu.state === "activated") neu.postMessage("neu-einrichten");
          });
        });
      })
      .catch(() => {
        // Ohne Service Worker läuft die App weiter, nur eben nicht offline.
        // Das ist kein Fehler, den die Nutzerin sehen müsste.
      });

    return () => {
      abgebrochen = true;
    };
  }, []);

  return null;
}
