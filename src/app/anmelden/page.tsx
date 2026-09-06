import { Anmeldeformular } from "./Anmeldeformular";

export const metadata = { title: "Anmelden – Stickmuster" };

export default function AnmeldenSeite() {
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center gap-8 px-5 py-10">
      <header>
        <h1 className="text-[2.2rem] font-bold leading-tight">Willkommen</h1>
        <p className="mt-3 text-[1.1rem]">
          Hier machen Sie aus einem Foto ein Zählmuster zum Sticken. Damit Ihre Muster
          gespeichert bleiben, brauchen wir Ihre E-Mail-Adresse. Ein Passwort brauchen Sie nicht.
        </p>
      </header>

      <Anmeldeformular />
    </main>
  );
}
