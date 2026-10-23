import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ALIMENTI, APPUNTAMENTI, CLIENTI, DIETE, MODELLI, PIANI } from "./data";
import { Alimento, Appuntamento, Cliente, Dieta, ModelloPiano, PianoAlimentare } from "./types";
import { ImmaginiCaricate } from "./immaginiPiano";
import { DatiArchivio, differenze, fotografa, Fotografia } from "./sincronizza";

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

/** Stato del salvataggio automatico, mostrato dall'indicatore. "browser" = anteprima senza database. */
export interface StatoSalvataggio {
  stato: "caricamento" | "salvato" | "in-corso" | "errore" | "browser";
  ora?: string; // ultimo salvataggio riuscito, HH:MM
  errore?: string;
  percorso?: string; // file del database
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
  salvataggio: StatoSalvataggio;
  salvaOra: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;

/** Il programma gira dentro Tauri (con il database) o nell'anteprima del browser (senza). */
export const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const ATTESA_MS = 400; // dopo l'ultima modifica, si salva entro questo tempo
const adesso = () => new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

async function comando<T>(nome: string, argomenti?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(nome, argomenti);
}

export function StoreProvider({ children, toast, bloccaOra }: { children: ReactNode; toast: (m: string) => void; bloccaOra: () => void }) {
  // Nel browser: dati di esempio solo in memoria. In Tauri: sostituiti da quelli del database appena aperto.
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

  // --- Salvataggio automatico ---
  const [salvataggio, setSalvataggio] = useState<StatoSalvataggio>({ stato: inTauri ? "caricamento" : "browser" });
  const dati: DatiArchivio = { clienti, modelli, piani, appuntamenti, alimenti, diete, immagini };
  const datiRef = useRef(dati);
  datiRef.current = dati;
  const salvati = useRef<Fotografia | null>(null); // ultima versione arrivata nel database
  const inCorso = useRef<Promise<void> | null>(null);

  const salvaOra = useCallback(async (): Promise<void> => {
    if (!inTauri || !salvati.current) return;
    if (inCorso.current) { await inCorso.current; return salvaOra(); }
    const istante = datiRef.current;
    const ops = differenze(salvati.current, istante);
    if (!ops.length) return;
    const lavoro = (async () => {
      setSalvataggio((s) => ({ ...s, stato: "in-corso" }));
      try {
        for (const op of ops) {
          if (op.azione === "salva") await comando("db_salva", { tipo: op.tipo, dati: op.dati });
          else await comando("db_elimina", { tipo: op.tipo, id: op.id });
        }
        salvati.current = fotografa(istante);
        setSalvataggio((s) => ({ ...s, stato: "salvato", ora: adesso(), errore: undefined }));
      } catch (e) {
        // la fotografia resta quella vecchia: al prossimo tentativo si rimanda tutto (le scritture si possono ripetere)
        setSalvataggio((s) => ({ ...s, stato: "errore", errore: String(e) }));
      }
    })();
    inCorso.current = lavoro;
    await lavoro;
    inCorso.current = null;
  }, []);

  // Apertura del database all'avvio
  useEffect(() => {
    if (!inTauri) return;
    comando<DatiArchivio & { percorso: string }>("db_apri")
      .then((t) => {
        setC(t.clienti); setM(t.modelli); setP(t.piani); setA(t.appuntamenti); setAl(t.alimenti); setD(t.diete); setI(t.immagini);
        salvati.current = fotografa(t);
        setSalvataggio({ stato: "salvato", ora: adesso(), percorso: t.percorso });
      })
      .catch((e) => setSalvataggio({ stato: "errore", errore: `Archivio non aperto: ${e}` }));
  }, []);

  // A ogni modifica: si salva poco dopo l'ultima (scrivere di seguito = un salvataggio solo)
  useEffect(() => {
    if (!inTauri || !salvati.current) return;
    if (differenze(salvati.current, datiRef.current).length === 0) return;
    setSalvataggio((s) => (s.stato === "errore" ? s : { ...s, stato: "in-corso" }));
    const t = window.setTimeout(() => { void salvaOra(); }, ATTESA_MS);
    return () => window.clearTimeout(t);
  }, [clienti, modelli, piani, appuntamenti, alimenti, diete, immagini, salvaOra]);

  // Ctrl+S: non serve, ma per abitudine conferma che è tutto salvato
  useEffect(() => {
    const tasti = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      if (!inTauri) { toast("Anteprima nel browser: qui i dati non si salvano"); return; }
      void salvaOra().then(() => {
        const ok = salvati.current && differenze(salvati.current, datiRef.current).length === 0;
        toast(ok ? "Già tutto salvato ✓ (il salvataggio è automatico)" : "Salvataggio non riuscito: riprova");
      });
    };
    window.addEventListener("keydown", tasti);
    return () => window.removeEventListener("keydown", tasti);
  }, [salvaOra, toast]);

  // Chiudendo la finestra: se c'è ancora qualcosa da salvare, si salva prima di chiudere
  useEffect(() => {
    if (!inTauri) return;
    let smetti: (() => void) | undefined;
    import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
      const w = getCurrentWindow();
      smetti = await w.onCloseRequested(async (ev) => {
        const resta = salvati.current && differenze(salvati.current, datiRef.current).length > 0;
        if (!resta && !inCorso.current) return;
        ev.preventDefault();
        await salvaOra();
        await w.destroy();
      });
    });
    return () => smetti?.();
  }, [salvaOra]);

  return (
    <Ctx.Provider value={{ alimenti, setAlimenti: setAl, clienti, setClienti: setC, diete, setDiete: setD, piani, setPiani: setP, modelli, setModelli: setM, immagini, setImmagini: setI, appuntamenti, setAppuntamenti: setA, vista, vai, toast, backup, setBackup, bloccaOra, salvataggio, salvaOra }}>
      {children}
    </Ctx.Provider>
  );
}
