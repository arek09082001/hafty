"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Kopfzeile } from "@/components/Kopfzeile";
import { Seite } from "@/components/Seite";
import { Knopf, KnopfLink } from "@/components/Knopf";
import { Hinweis } from "@/components/Hinweis";
import { Dialog } from "@/components/Dialog";
import { Vergleich } from "@/components/Vergleich";
import { useMeldungen } from "@/components/Meldungen";
import {
  projektLoeschen,
  projektOeffnen,
  projektUmbenennen,
  projekteLaden,
  type Projektuebersicht,
} from "@/lib/speicher/projekte";
import {
  motivLoeschen,
  motivUmbenennen,
  motiveLaden,
  type Motiv,
} from "@/lib/speicher/motive";
import { zeitpunktText } from "@/lib/speicher/staende";
import { useAbgleich } from "@/lib/ferne/AbgleichProvider";
import { useSprache } from "@/lib/sprache/SprachProvider";

/**
 * Die Verwaltung: alles, was gespeichert ist, an einer Stelle.
 * ---------------------------------------------------------------------------
 *
 * Die Startseite zeigt bewusst nur die zuletzt angefassten Muster – sie ist
 * der Weg zurück in die Arbeit von gestern und soll kurz bleiben. Wer aber
 * aufräumen will, sucht etwas anderes: eine vollständige Liste, ein Suchfeld
 * und die Möglichkeit, einem Muster endlich einen Namen zu geben, der nicht
 * „IMG_20240817.jpg“ lautet.
 *
 * Die Motive stehen hier ebenfalls. Sie gehören keinem einzelnen Muster,
 * sondern der Nutzerin – und waren bis hierher nur im Editor zu erreichen.
 */
export function MusterVerwalten() {
  const { t, zahl } = useSprache();
  const { jetztSichern, zustand: abgleich } = useAbgleich();
  const { melden } = useMeldungen();
  const router = useRouter();

  const [projekte, setProjekte] = useState<Projektuebersicht[] | null>(null);
  const [motive, setMotive] = useState<Motiv[] | null>(null);
  const [suche, setSuche] = useState("");
  const [oeffnetGerade, setOeffnetGerade] = useState<string | null>(null);
  const [vergleich, setVergleich] = useState<string | null>(null);
  const [zumLoeschen, setZumLoeschen] = useState<Projektuebersicht | null>(null);
  const [motivZumLoeschen, setMotivZumLoeschen] = useState<Motiv | null>(null);
  /** Was gerade umbenannt wird – ein Muster oder ein Motiv. */
  const [umbenennen, setUmbenennen] = useState<
    { art: "projekt"; id: string; name: string } | { art: "motiv"; motiv: Motiv; name: string } | null
  >(null);

  const zeit = (iso: string) => zeitpunktText(iso, t);

  const neuLaden = useCallback(() => {
    // Ohne Obergrenze: das ist die vollständige Liste und nicht die Auswahl
    // der Startseite.
    projekteLaden(500)
      .then(setProjekte)
      .catch(() => setProjekte([]));
    motiveLaden()
      .then(setMotive)
      .catch(() => setMotive([]));
  }, []);

  useEffect(() => {
    neuLaden();
    // Kommt gerade etwas aus der Sicherung an, steht es kurz darauf von
    // selbst in der Liste.
  }, [neuLaden, abgleich.zuletzt]);

  const gefunden = useMemo(() => {
    if (!projekte) return null;
    const text = suche.trim().toLocaleLowerCase();
    if (text === "") return projekte;
    return projekte.filter((p) => p.name.toLocaleLowerCase().includes(text));
  }, [projekte, suche]);

  async function oeffnen(projektId: string) {
    setOeffnetGerade(projektId);
    const geklappt = await projektOeffnen(projektId);
    if (geklappt) {
      router.push("/schritt/muster");
      return;
    }
    setOeffnetGerade(null);
    melden(t("verwalten.fehlerOeffnen"), "fehler");
  }

  async function loeschen() {
    if (!zumLoeschen) return;
    await projektLoeschen(zumLoeschen.id);
    setZumLoeschen(null);
    neuLaden();
    // Gelöscht heißt gelöscht: das gehört sofort auch aus der Sicherung
    // heraus und nicht erst beim nächsten Durchgang.
    jetztSichern();
  }

  async function motivWirklichLoeschen() {
    if (!motivZumLoeschen) return;
    const weg = await motivLoeschen(motivZumLoeschen);
    if (!weg) melden(t("motive.fehlerLoeschen"), "fehler");
    setMotivZumLoeschen(null);
    neuLaden();
  }

  async function namenUebernehmen() {
    if (!umbenennen) return;
    const name = umbenennen.name.trim();
    if (name === "") return;
    const geklappt =
      umbenennen.art === "projekt"
        ? await projektUmbenennen(umbenennen.id, name)
        : await motivUmbenennen(umbenennen.motiv, name);
    setUmbenennen(null);
    if (!geklappt) {
      melden(t("verwalten.fehlerUmbenennen"), "fehler");
      return;
    }
    neuLaden();
    if (umbenennen.art === "projekt") jetztSichern();
    melden(t("verwalten.umbenannt", { name }), "erfolg");
  }

  return (
    <>
      <Kopfzeile />
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">
        <Seite
          titel={t("verwalten.titel")}
          erklaerung={t("verwalten.erklaerung")}
          weit
          fuss={
            <>
              <KnopfLink art="neben" href="/">
                {t("verwalten.zurueck")}
              </KnopfLink>
              <KnopfLink art="neben" href="/kanwa">
                {t("start.leereKanwa")}
              </KnopfLink>
              <KnopfLink art="haupt" href="/schritt/bild?neu=1">
                {t("start.neuesBild")}
              </KnopfLink>
            </>
          }
        >
          <div className="flex flex-col gap-9">
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="mustersuche" className="text-[1.1rem] font-semibold">
                  {t("verwalten.suche")}
                </label>
                <div className="flex flex-wrap gap-3">
                  <input
                    id="mustersuche"
                    value={suche}
                    onChange={(e) => setSuche(e.target.value)}
                    inputMode="search"
                    placeholder={t("verwalten.suchePlatzhalter")}
                    className="min-h-[60px] w-full max-w-[32rem] rounded-xl border-2 border-tinte bg-white px-4 text-[1.15rem]"
                  />
                  {suche !== "" ? (
                    <Knopf art="neben" onClick={() => setSuche("")}>
                      {t("garne.sucheLeeren")}
                    </Knopf>
                  ) : null}
                </div>
              </div>

              <h2 className="text-[1.3rem] font-bold">
                {t("verwalten.alleMuster", { anzahl: zahl(projekte?.length ?? 0) })}
              </h2>

              {gefunden === null ? (
                <p className="text-[1.05rem] text-gedaempft">{t("start.wirdGeholt")}</p>
              ) : gefunden.length === 0 ? (
                <Hinweis>
                  {suche === "" ? t("start.nochNichts") : t("verwalten.nichtsGefunden", { suche })}
                </Hinweis>
              ) : (
                <ul className="flex flex-col gap-3">
                  {gefunden.map((projekt) => (
                    <li
                      key={projekt.id}
                      className="flex flex-wrap items-center gap-4 rounded-xl border border-linie bg-white p-4"
                    >
                      {projekt.bildUrl ? (
                        <Image
                          src={projekt.bildUrl}
                          alt=""
                          width={90}
                          height={90}
                          unoptimized
                          className="h-[90px] w-[90px] shrink-0 rounded-lg border border-linie bg-hinweis object-cover"
                        />
                      ) : (
                        <span className="flex h-[90px] w-[90px] shrink-0 items-center justify-center rounded-lg border border-linie bg-hinweis text-center text-[0.85rem] text-gedaempft">
                          {t("start.ohneBild")}
                        </span>
                      )}

                      <div className="min-w-[14rem] flex-1">
                        <p className="text-[1.15rem] font-bold">
                          {projekt.name || t("start.ohneNamen")}
                        </p>
                        <p className="text-[1rem] text-gedaempft">{zeit(projekt.zuletztAm)}</p>
                        <p className="text-[1rem] text-gedaempft">
                          {projekt.staendeAnzahl === 1
                            ? t("start.standEiner")
                            : t("start.staende", { anzahl: zahl(projekt.staendeAnzahl) })}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Knopf
                          art="haupt"
                          klein
                          onClick={() => oeffnen(projekt.id)}
                          disabled={oeffnetGerade !== null}
                        >
                          {oeffnetGerade === projekt.id
                            ? t("allgemein.wirdGeholt")
                            : t("start.oeffnen")}
                        </Knopf>
                        <Knopf
                          klein
                          onClick={() =>
                            setUmbenennen({
                              art: "projekt",
                              id: projekt.id,
                              name: projekt.name,
                            })
                          }
                        >
                          {t("verwalten.umbenennen")}
                        </Knopf>
                        <Knopf
                          klein
                          onClick={() => setVergleich(projekt.id)}
                          disabled={projekt.staendeAnzahl === 0}
                        >
                          {t("start.vergleichen")}
                        </Knopf>
                        <Knopf art="still" klein onClick={() => setZumLoeschen(projekt)}>
                          {t("start.loeschen")}
                        </Knopf>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-4 border-t border-linie pt-7">
              <h2 className="text-[1.3rem] font-bold">
                {t("verwalten.alleMotive", { anzahl: zahl(motive?.length ?? 0) })}
              </h2>
              <p className="max-w-[70ch] text-[1.05rem] text-gedaempft">
                {t("verwalten.motiveErklaerung")}
              </p>

              {motive === null ? (
                <p className="text-[1.05rem] text-gedaempft">{t("motive.wirdGeholt")}</p>
              ) : motive.length === 0 ? (
                <Hinweis>{t("motive.keine")}</Hinweis>
              ) : (
                <ul className="flex flex-wrap gap-3">
                  {motive.map((motiv) => (
                    <li
                      key={motiv.id}
                      className="flex w-[170px] flex-col gap-2 rounded-xl border border-linie bg-white p-3"
                    >
                      {motiv.vorschauUrl ? (
                        <Image
                          src={motiv.vorschauUrl}
                          alt=""
                          width={140}
                          height={140}
                          unoptimized
                          className="raster h-[120px] w-full rounded-lg border border-linie bg-hinweis object-contain"
                        />
                      ) : (
                        <span className="flex h-[120px] items-center justify-center rounded-lg border border-linie bg-hinweis text-[0.9rem]">
                          {t("motive.ohneBild")}
                        </span>
                      )}
                      <span className="truncate text-center text-[1rem] font-semibold">
                        {motiv.name}
                      </span>
                      <span className="text-center text-[0.85rem] text-gedaempft">
                        {t("motive.groesse", { w: String(motiv.w), h: String(motiv.h) })}
                      </span>
                      <Knopf
                        klein
                        onClick={() => setUmbenennen({ art: "motiv", motiv, name: motiv.name })}
                      >
                        {t("verwalten.umbenennen")}
                      </Knopf>
                      <Knopf art="still" klein onClick={() => setMotivZumLoeschen(motiv)}>
                        {t("motive.loeschen")}
                      </Knopf>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </Seite>
      </main>

      <Vergleich
        musterId={vergleich}
        offen={vergleich !== null}
        onSchliessen={() => setVergleich(null)}
        onGeloescht={() => {
          neuLaden();
          jetztSichern();
        }}
      />

      <Dialog
        offen={umbenennen !== null}
        titel={t("verwalten.umbenennenTitel")}
        text={t("verwalten.umbenennenText")}
        bestaetigenText={t("verwalten.namenSpeichern")}
        abbrechenText={t("allgemein.abbrechen")}
        onBestaetigen={namenUebernehmen}
        onAbbrechen={() => setUmbenennen(null)}
      >
        <input
          value={umbenennen?.name ?? ""}
          onChange={(e) =>
            setUmbenennen((v) => (v ? { ...v, name: e.target.value } : v))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void namenUebernehmen();
            }
          }}
          autoFocus
          aria-label={t("verwalten.neuerName")}
          className="min-h-[60px] w-full rounded-xl border-2 border-tinte bg-white px-4 text-[1.15rem]"
        />
      </Dialog>

      <Dialog
        offen={zumLoeschen !== null}
        titel={t("start.loeschenTitel", { name: zumLoeschen?.name || t("start.ohneNamen") })}
        text={t("start.loeschenText")}
        bestaetigenText={t("allgemein.jaLoeschen")}
        bestaetigenArt="gefahr"
        abbrechenText={t("allgemein.behalten")}
        onBestaetigen={loeschen}
        onAbbrechen={() => setZumLoeschen(null)}
      />

      <Dialog
        offen={motivZumLoeschen !== null}
        titel={t("verwalten.motivLoeschenTitel", { name: motivZumLoeschen?.name ?? "" })}
        text={t("verwalten.motivLoeschenText")}
        bestaetigenText={t("allgemein.jaLoeschen")}
        bestaetigenArt="gefahr"
        abbrechenText={t("allgemein.behalten")}
        onBestaetigen={motivWirklichLoeschen}
        onAbbrechen={() => setMotivZumLoeschen(null)}
      />
    </>
  );
}
