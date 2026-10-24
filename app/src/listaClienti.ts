// Lista clienti: ricerca, filtri rapidi (con i conteggi) e ordinamento per colonna. Funzioni pure, provate nei test.
import { piuMesi } from "./misure";
import { Appuntamento, Cliente, Visita } from "./types";

export interface Riga { c: Cliente; ultima?: Visita; prossimo?: Appuntamento }

export const FILTRI = [
  ["attivi", "Attivi"],
  ["richiamare", "Da richiamare"],
  ["appuntamento", "Con appuntamento"],
  ["nuovi", "Nuovi"],
  ["privacy", "Privacy da firmare"],
  ["archiviati", "Archiviati"],
  ["tutti", "Tutti"],
] as const;
export type Filtro = (typeof FILTRI)[number][0];

export type Colonna = "cliente" | "eta" | "peso" | "ultima" | "prossimo";
export interface Ordine { colonna: Colonna; crescente: boolean }

export const GIORNI_NUOVO = 30; // "Nuovi": prima visita negli ultimi 30 giorni

/** Per ogni cliente: ultima visita e prossimo appuntamento (da oggi in poi). */
export function righe(clienti: Cliente[], appuntamenti: Appuntamento[], oggi: string): Riga[] {
  const prossimi = new Map<string, Appuntamento>();
  for (const a of appuntamenti) {
    if (a.data < oggi) continue;
    const p = prossimi.get(a.clienteId);
    if (!p || a.data + a.ora < p.data + p.ora) prossimi.set(a.clienteId, a);
  }
  return clienti.map((c) => ({ c, ultima: c.visite[c.visite.length - 1], prossimo: prossimi.get(c.id) }));
}

/** Testo senza accenti, apostrofi e maiuscole: «D'Angelo» si trova anche scrivendo «dangelo». */
export const normalizza = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’.\-]/g, "");

/** Ogni parola cercata deve comparire (in qualsiasi ordine) in nome, cognome, email o telefono. */
export function corrisponde(c: Cliente, ricerca: string): boolean {
  const parole = normalizza(ricerca).split(/\s+/).filter(Boolean);
  if (!parole.length) return true;
  const testo = normalizza(`${c.nome} ${c.cognome} ${c.cognome}${c.nome} ${c.email}`) + " " + c.telefono.replace(/\D/g, "");
  return parole.every((p) => testo.includes(/^\d[\d\s]*$/.test(p) ? p.replace(/\D/g, "") : p));
}

export function passaFiltro(r: Riga, f: Filtro, mesiRichiamo: number, oggi: string): boolean {
  const { c } = r;
  switch (f) {
    case "tutti": return true;
    case "attivi": return c.attivo;
    case "archiviati": return !c.attivo;
    case "appuntamento": return !!r.prossimo;
    case "privacy": return !c.consenso.firmato;
    case "nuovi": return !!c.visite[0] && c.visite[0].data >= piuGiorni(oggi, -GIORNI_NUOVO);
    case "richiamare": return c.attivo && !r.prossimo && (!r.ultima || r.ultima.data < piuMesi(oggi, -mesiRichiamo));
  }
}

const piuGiorni = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);

/** Ordina per colonna; chi non ha il dato (es. nessun appuntamento) va sempre in fondo. */
export function ordina(lista: Riga[], o: Ordine): Riga[] {
  const valore = (r: Riga): string | number | undefined => {
    switch (o.colonna) {
      case "cliente": return normalizza(`${r.c.cognome} ${r.c.nome}`);
      case "eta": return r.c.dataNascita ? -Date.parse(r.c.dataNascita) : undefined; // più giovane = età minore
      case "peso": return r.ultima?.peso;
      case "ultima": return r.ultima?.data;
      case "prossimo": return r.prossimo ? r.prossimo.data + r.prossimo.ora : undefined;
    }
  };
  return [...lista].sort((a, b) => {
    const va = valore(a), vb = valore(b);
    if (va === undefined || vb === undefined) return va === vb ? 0 : va === undefined ? 1 : -1;
    const d = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return o.crescente ? d : -d;
  });
}
