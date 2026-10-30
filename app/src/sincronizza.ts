// Salvataggio automatico: confronta i dati del programma con l'ultima versione salvata e produce
// le operazioni da mandare al database (solo ciò che è cambiato, è nuovo o è stato tolto).
import { ImmaginiCaricate } from "./immaginiPiano";
import { Alimento, Appuntamento, Cliente, Dieta, Impostazioni, ModelloPiano, PianoAlimentare } from "./types";

export type TipoDato = "cliente" | "modello" | "piano" | "appuntamento" | "alimento" | "dieta" | "immagine" | "impostazione";

export interface DatiArchivio {
  clienti: Cliente[];
  modelli: ModelloPiano[];
  piani: PianoAlimentare[];
  appuntamenti: Appuntamento[];
  alimenti: Alimento[];
  diete: Dieta[];
  immagini: ImmaginiCaricate;
  impostazioni: Impostazioni;
}

export type Operazione =
  | { azione: "salva"; tipo: TipoDato; id: string; dati: unknown }
  | { azione: "elimina"; tipo: TipoDato; id: string };

/** Fotografia dei dati: per ogni tipo, id -> testo JSON (per confrontare in fretta). */
export type Fotografia = Record<TipoDato, Map<string, string>>;

const conId = <T extends { id: string }>(l: T[]) => l.map((x) => [x.id, x] as [string, unknown]);

function elementi(d: DatiArchivio): Record<TipoDato, [string, unknown][]> {
  return {
    cliente: conId(d.clienti),
    modello: conId(d.modelli),
    piano: conId(d.piani),
    appuntamento: conId(d.appuntamenti),
    alimento: conId(d.alimenti),
    dieta: conId(d.diete),
    immagine: Object.entries(d.immagini).map(([chiave, v]) => [chiave, { chiave, ...v }]),
    impostazione: Object.entries(d.impostazioni).map(([chiave, valore]) => [chiave, { chiave, valore }]),
  };
}

// Solo per gli alimenti (oltre 800, pieni di valori): il testo JSON si ricorda per ogni oggetto, così quelli non
// toccati non si ritrasformano a ogni modifica. Si cambiano solo creando un oggetto nuovo (src/alimenti.ts).
const giaFatti = new WeakMap<object, string>();
const json = (tipo: TipoDato, x: unknown): string => {
  if (tipo !== "alimento" || typeof x !== "object" || x === null) return JSON.stringify(x);
  let t = giaFatti.get(x);
  if (t === undefined) { t = JSON.stringify(x); giaFatti.set(x, t); }
  return t;
};

export function fotografa(d: DatiArchivio): Fotografia {
  const e = elementi(d);
  return Object.fromEntries(
    (Object.keys(e) as TipoDato[]).map((t) => [t, new Map(e[t].map(([id, x]) => [id, json(t, x)]))]),
  ) as Fotografia;
}

/** Operazioni per passare dalla fotografia "prima" ai dati "ora". Le eliminazioni vengono per ultime. */
export function differenze(prima: Fotografia, ora: DatiArchivio): Operazione[] {
  const e = elementi(ora);
  const salva: Operazione[] = [];
  const elimina: Operazione[] = [];
  for (const tipo of Object.keys(e) as TipoDato[]) {
    const vecchi = prima[tipo];
    const visti = new Set<string>();
    for (const [id, x] of e[tipo]) {
      visti.add(id);
      if (vecchi.get(id) !== json(tipo, x)) salva.push({ azione: "salva", tipo, id, dati: x });
    }
    for (const id of vecchi.keys()) if (!visti.has(id)) elimina.push({ azione: "elimina", tipo, id });
  }
  // i modelli prima dei piani e i clienti prima di ciò che li richiama (legami nel database)
  const ordine: TipoDato[] = ["impostazione", "immagine", "modello", "alimento", "cliente", "piano", "dieta", "appuntamento"];
  salva.sort((a, b) => ordine.indexOf(a.tipo) - ordine.indexOf(b.tipo));
  return [...salva, ...elimina];
}
