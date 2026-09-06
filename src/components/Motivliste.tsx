"use client";

import Image from "next/image";
import { Knopf } from "./Knopf";
import type { Motiv } from "@/lib/speicher/motive";

/**
 * Motive stehen in einer eigenen Liste mit Vorschaubildchen und bleiben über
 * Muster hinweg erhalten. Antippen legt das Motiv als verschiebbare Vorschau
 * auf das Raster – festgeschrieben wird es erst mit „Hier einsetzen".
 */
export function Motivliste({
  motive,
  laedt,
  onEinsetzen,
  onLoeschen,
}: {
  motive: Motiv[];
  laedt: boolean;
  onEinsetzen: (m: Motiv) => void;
  onLoeschen: (m: Motiv) => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-tinte bg-white p-5">
      <h2 className="text-[1.3rem] font-bold">Meine Motive</h2>

      {laedt ? (
        <p className="text-[1.05rem] text-gedaempft">Die Motive werden geholt …</p>
      ) : motive.length === 0 ? (
        <p className="text-[1.05rem] text-gedaempft">
          Sie haben noch keine Motive. Wählen Sie einen Bereich im Muster aus und tippen Sie dann
          auf „Auswahl als Motiv merken“. Motive bleiben Ihnen auch für spätere Muster erhalten.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {motive.map((motiv) => (
            <li key={motiv.id} className="flex w-[150px] flex-col gap-2">
              <button
                type="button"
                onClick={() => onEinsetzen(motiv)}
                className="flex min-h-[56px] flex-col items-center gap-2 rounded-xl border-2 border-linie bg-white p-2 hover:bg-hinweis"
              >
                {motiv.vorschauUrl ? (
                  <Image
                    src={motiv.vorschauUrl}
                    alt=""
                    width={110}
                    height={110}
                    unoptimized
                    className="raster h-[110px] w-[110px] rounded-lg border border-linie bg-hinweis object-contain"
                  />
                ) : (
                  <span className="flex h-[110px] w-[110px] items-center justify-center rounded-lg border border-linie bg-hinweis text-[0.9rem]">
                    ohne Bild
                  </span>
                )}
                <span className="w-full truncate text-center text-[0.95rem] font-semibold">
                  {motiv.name}
                </span>
                <span className="text-[0.85rem] text-gedaempft">
                  {motiv.w} × {motiv.h} Stiche
                </span>
              </button>
              <Knopf art="still" onClick={() => onLoeschen(motiv)} className="min-h-[44px] text-[0.9rem]">
                Löschen
              </Knopf>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
