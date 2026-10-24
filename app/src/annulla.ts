// Annulla / Ripeti di tutto il programma: copie dei dati prima di ogni modifica (al massimo PASSI_ANNULLA).
// Funzioni pure, così si provano con i test. Gli allegati restano fuori: il file eliminato non torna.
import { fmtData } from "./data";
import { DatiArchivio, Operazione, differenze, fotografa } from "./sincronizza";

export const PASSI_ANNULLA = 20;
export const UNISCI_MS = 800; // modifiche più ravvicinate (es. scrivere in un campo) = un solo passo

/** Dati da rimettere: quelli di "verso", ma con gli allegati di oggi per ogni cliente. Un cliente cancellato
 *  e recuperato con Annulla torna senza gli allegati con file (i file sono già stati tolti dall'archivio). */
export function conAllegatiDiOggi(verso: DatiArchivio, oggi: DatiArchivio): DatiArchivio {
  const allegati = new Map(oggi.clienti.map((c) => [c.id, c.allegati]));
  return {
    ...verso,
    clienti: verso.clienti.map((c) => ({ ...c, allegati: allegati.get(c.id) ?? c.allegati.filter((a) => !a.conFile) })),
  };
}

/** Cosa cambia passando da "da" ad "a", in parole (per il messaggio dopo Annulla / Ripeti). */
export function descriviPassaggio(da: DatiArchivio, a: DatiArchivio): string | null {
  const ops = differenze(fotografa(da), a);
  if (!ops.length) return null;
  const tutti = { ...da, ...a, clienti: [...a.clienti, ...da.clienti], piani: [...a.piani, ...da.piani], modelli: [...a.modelli, ...da.modelli],
    appuntamenti: [...a.appuntamenti, ...da.appuntamenti], alimenti: [...a.alimenti, ...da.alimenti], diete: [...a.diete, ...da.diete],
    immagini: { ...da.immagini, ...a.immagini } };
  const cliente = (id: string) => { const c = tutti.clienti.find((x) => x.id === id); return c ? `${c.nome} ${c.cognome}` : "cliente"; };
  const nome = (op: Operazione): string => {
    switch (op.tipo) {
      case "cliente": return cliente(op.id);
      case "modello": return `modello «${tutti.modelli.find((x) => x.id === op.id)?.nome ?? ""}»`;
      case "piano": { const p = tutti.piani.find((x) => x.id === op.id); return `piano di ${p ? cliente(p.clienteId) : "un cliente"}`; }
      case "dieta": { const d = tutti.diete.find((x) => x.id === op.id); return `dieta di ${d ? cliente(d.clienteId) : "un cliente"}`; }
      case "appuntamento": { const ap = tutti.appuntamenti.find((x) => x.id === op.id); return ap ? `appuntamento del ${fmtData(ap.data)} (${cliente(ap.clienteId)})` : "appuntamento"; }
      case "alimento": return `alimento «${tutti.alimenti.find((x) => x.id === op.id)?.nome ?? ""}»`;
      case "immagine": return `immagine «${tutti.immagini[op.id]?.nome ?? ""}»`;
      case "impostazione": return "impostazioni";
    }
  };
  const cosa = [...new Set(ops.map(nome))];
  return cosa.length === 1 ? cosa[0] : cosa.length === 2 ? `${cosa[0]} e un'altra cosa` : `${cosa[0]} e altre ${cosa.length - 1} cose`;
}
