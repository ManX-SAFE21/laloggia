import { createContext, ReactNode, useContext, useState } from "react";
import { ALIMENTI, APPUNTAMENTI, CLIENTI, DIETE, MODELLI, PIANI } from "./data";
import { Alimento, Appuntamento, Cliente, Dieta, ModelloPiano, PianoAlimentare } from "./types";
import { ImmaginiCaricate } from "./immaginiPiano";

export type Vista =
  | { nome: "oggi" }
  | { nome: "clienti" }
  | { nome: "cliente"; id: string; tab?: string }
  | { nome: "dieta"; id: string }
  | { nome: "piano"; id: string }
  | { nome: "modelli" }
  | { nome: "modello"; id: string }
  | { nome: "alimenti" }
  | { nome: "agenda" }
  | { nome: "impostazioni" };

export interface Backup {
  ultimo: string; // testo leggibile
  ok: boolean;
  dropbox: string;
  disco: string;
  discoCollegato: boolean;
}

interface Store {
  clienti: Cliente[];
  setClienti: (f: (c: Cliente[]) => Cliente[]) => void;
  alimenti: Alimento[];
  setAlimenti: (f: (a: Alimento[]) => Alimento[]) => void;
  diete: Dieta[];
  setDiete: (f: (d: Dieta[]) => Dieta[]) => void;
  piani: PianoAlimentare[];
  setPiani: (f: (p: PianoAlimentare[]) => PianoAlimentare[]) => void;
  modelli: ModelloPiano[];
  setModelli: (f: (m: ModelloPiano[]) => ModelloPiano[]) => void;
  immagini: ImmaginiCaricate;
  setImmagini: (f: (i: ImmaginiCaricate) => ImmaginiCaricate) => void;
  appuntamenti: Appuntamento[];
  setAppuntamenti: (f: (a: Appuntamento[]) => Appuntamento[]) => void;
  vista: Vista;
  vai: (v: Vista) => void;
  toast: (msg: string) => void;
  backup: Backup;
  setBackup: (b: Backup) => void;
  bloccaOra: () => void;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;

export function StoreProvider({ children, toast, bloccaOra }: { children: ReactNode; toast: (m: string) => void; bloccaOra: () => void }) {
  // Copie profonde: le modifiche restano solo finché la pagina è aperta.
  const [clienti, setC] = useState<Cliente[]>(() => structuredClone(CLIENTI));
  const [alimenti, setAl] = useState<Alimento[]>(() => structuredClone(ALIMENTI));
  const [diete, setD] = useState<Dieta[]>(() => structuredClone(DIETE));
  const [piani, setP] = useState<PianoAlimentare[]>(() => structuredClone(PIANI));
  const [modelli, setM] = useState<ModelloPiano[]>(() => structuredClone(MODELLI));
  const [immagini, setI] = useState<ImmaginiCaricate>({});
  const [appuntamenti, setA] = useState<Appuntamento[]>(() => structuredClone(APPUNTAMENTI));
  const [vista, setVista] = useState<Vista>({ nome: "oggi" });
  const [backup, setBackup] = useState<Backup>({
    ultimo: "ieri alle 19:02",
    ok: true,
    dropbox: "C:\\Users\\LaLoggia\\Dropbox\\Backup gestionale",
    disco: "E:\\Backup La Loggia",
    discoCollegato: false,
  });
  const vai = (v: Vista) => { setVista(v); document.querySelector(".main")?.scrollTo(0, 0); };
  return (
    <Ctx.Provider value={{ alimenti, setAlimenti: setAl, clienti, setClienti: setC, diete, setDiete: setD, piani, setPiani: setP, modelli, setModelli: setM, immagini, setImmagini: setI, appuntamenti, setAppuntamenti: setA, vista, vai, toast, backup, setBackup, bloccaOra }}>
      {children}
    </Ctx.Provider>
  );
}
