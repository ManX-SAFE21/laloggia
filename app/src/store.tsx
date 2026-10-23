import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ALIMENTI, APPUNTAMENTI, CLIENTI, DIETE, MODELLI, PIANI } from "./data";
import { Alimento, Appuntamento, Cliente, Dieta, ModelloPiano, PianoAlimentare } from "./types";
import { ImmaginiCaricate } from "./immaginiPiano";
import { DatiArchivio, differenze, fotografa, Fotografia } from "./sincronizza";
import { PASSI_ANNULLA, UNISCI_MS, conAllegatiDiOggi, descriviPassaggio } from "./annulla";

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
  chiusura: boolean; // cliccata la X della finestra: si chiede conferma
  confermaChiusura: (si: boolean) => void;
  annulla: () => void; // Annulla / Ripeti di tutto il programma (l'editor del piano ha i suoi)
  ripeti: () => void;
  passiAnnulla: { indietro: number; avanti: number };
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

  // --- Annulla / Ripeti di tutto il programma: copie dei dati prima di ogni modifica (max PASSI_ANNULLA).
  // Scrivere di seguito (modifiche a meno di UNISCI_MS) vale un passo solo. Gli allegati restano fuori.
  const passato = useRef<DatiArchivio[]>([]);
  const futuro = useRef<DatiArchivio[]>([]);
  const ultimo = useRef<DatiArchivio | null>(null); // i dati dopo l'ultima modifica
  const ultimaModifica = useRef(0);
  const nonRegistrare = useRef(false); // il prossimo cambiamento viene da Annulla/Ripeti o dall'apertura
  const [passiAnnulla, setPassiAnnulla] = useState({ indietro: 0, avanti: 0 });
  const contaPassi = () => setPassiAnnulla({ indietro: passato.current.length, avanti: futuro.current.length });
  useEffect(() => {
    const prima = ultimo.current;
    const ora = datiRef.current;
    ultimo.current = ora;
    if (!prima || (Object.keys(ora) as (keyof DatiArchivio)[]).every((k) => ora[k] === prima[k])) return; // niente di nuovo
    if (nonRegistrare.current) { nonRegistrare.current = false; return; }
    const t = Date.now();
    if (t - ultimaModifica.current > UNISCI_MS || passato.current.length === 0) passato.current = [...passato.current, prima].slice(-PASSI_ANNULLA);
    ultimaModifica.current = t;
    futuro.current = [];
    contaPassi();
  }, [clienti, modelli, piani, appuntamenti, alimenti, diete, immagini]);
  const metti = (d: DatiArchivio) => {
    nonRegistrare.current = true;
    ultimaModifica.current = 0;
    setC(d.clienti); setM(d.modelli); setP(d.piani); setA(d.appuntamenti); setAl(d.alimenti); setD(d.diete); setI(d.immagini);
  };
  const annulla = useCallback(() => {
    const ora = datiRef.current;
    while (passato.current.length) {
      const verso = conAllegatiDiOggi(passato.current[passato.current.length - 1], ora);
      passato.current = passato.current.slice(0, -1);
      const cosa = descriviPassaggio(ora, verso);
      if (!cosa) continue; // cambiava solo un allegato: si salta
      futuro.current = [ora, ...futuro.current].slice(0, PASSI_ANNULLA);
      metti(verso);
      contaPassi();
      toast(`Annullata la modifica a: ${cosa}`);
      return;
    }
    contaPassi();
    toast("Niente da annullare");
  }, [toast]);
  const ripeti = useCallback(() => {
    const ora = datiRef.current;
    while (futuro.current.length) {
      const verso = conAllegatiDiOggi(futuro.current[0], ora);
      futuro.current = futuro.current.slice(1);
      const cosa = descriviPassaggio(ora, verso);
      if (!cosa) continue;
      passato.current = [...passato.current, ora].slice(-PASSI_ANNULLA);
      metti(verso);
      contaPassi();
      toast(`Rifatta la modifica a: ${cosa}`);
      return;
    }
    contaPassi();
    toast("Niente da ripetere");
  }, [toast]);
  // Ctrl+Z / Ctrl+Y (e Ctrl+Maiusc+Z) fuori dalle caselle di testo; nell'editor del piano valgono i suoi
  const vistaRef = useRef(vista);
  vistaRef.current = vista;
  useEffect(() => {
    const tasti = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || vistaRef.current.nome === "piano" || vistaRef.current.nome === "modello") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); annulla(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); ripeti(); }
    };
    window.addEventListener("keydown", tasti);
    return () => window.removeEventListener("keydown", tasti);
  }, [annulla, ripeti]);

  // Apertura del database all'avvio
  useEffect(() => {
    if (!inTauri) return;
    comando<DatiArchivio & { percorso: string }>("db_apri")
      .then((t) => {
        nonRegistrare.current = true; // i dati appena letti non sono una modifica da annullare
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

  // X della finestra: prima si chiede conferma (contro i clic per sbaglio), poi si salva ciò che manca e si chiude
  const [chiusura, setChiusura] = useState(false);
  useEffect(() => {
    if (!inTauri) return;
    let smetti: (() => void) | undefined;
    import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
      smetti = await getCurrentWindow().onCloseRequested((ev) => {
        ev.preventDefault();
        setChiusura(true);
      });
    });
    return () => smetti?.();
  }, []);
  const confermaChiusura = useCallback((si: boolean) => {
    setChiusura(false);
    if (!si || !inTauri) return;
    void (async () => {
      await salvaOra();
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().destroy();
    })();
  }, [salvaOra]);

  return (
    <Ctx.Provider value={{ alimenti, setAlimenti: setAl, clienti, setClienti: setC, diete, setDiete: setD, piani, setPiani: setP, modelli, setModelli: setM, immagini, setImmagini: setI, appuntamenti, setAppuntamenti: setA, vista, vai, toast, backup, setBackup, bloccaOra, salvataggio, salvaOra, chiusura, confermaChiusura, annulla, ripeti, passiAnnulla }}>
      {children}
    </Ctx.Provider>
  );
}
