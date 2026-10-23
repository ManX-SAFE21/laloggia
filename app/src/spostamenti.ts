// Spostamenti fatti trascinando sul foglio del piano. Funzioni pure: restituiscono sezioni nuove,
// non toccano quelle ricevute (così Annulla funziona e i test sono semplici).
import { ImmaginePiano, SezionePiano } from "./types";

/** Posizione di un'immagine o di un'alternativa: sezione, elemento nella sezione, indice nell'elemento. */
export interface Posizione { sid: string; el: number; i: number }

/** Dove lasciare un'immagine: dentro una riga di immagini esistente (el + i = posizione d'inserimento),
 *  in una riga nuova fra due blocchi (rigaNuova = indice del blocco davanti a cui va: 0..n)
 *  oppure, senza el né rigaNuova, in una riga nuova in fondo alla sezione. */
export interface Destinazione { sid: string; el?: number; i?: number; rigaNuova?: number }

const VUOTO = Symbol("posto liberato");

/** Inserisce un'immagine nella destinazione. */
export function inserisciImmagine(sezioni: SezionePiano[], a: Destinazione, img: ImmaginePiano): SezionePiano[] {
  return sezioni.map((s) => {
    if (s.id !== a.sid) return s;
    if (a.rigaNuova !== undefined) {
      const elementi = [...s.elementi];
      elementi.splice(Math.max(0, Math.min(a.rigaNuova, elementi.length)), 0, { k: "immagini", voci: [img] });
      return { ...s, elementi };
    }
    if (a.el === undefined) return { ...s, elementi: [...s.elementi, { k: "immagini", voci: [img] }] };
    return {
      ...s,
      elementi: s.elementi.map((e, k) => {
        if (k !== a.el || e.k !== "immagini") return e;
        const voci = [...e.voci];
        voci.splice(Math.max(0, Math.min(a.i ?? voci.length, voci.length)), 0, img);
        return { ...e, voci };
      }),
    };
  });
}

/** Sposta un'immagine (anche fra sezioni). Una riga di immagini rimasta vuota sparisce. */
export function spostaImmagine(sezioni: SezionePiano[], da: Posizione, a: Destinazione): SezionePiano[] {
  const sorgente = sezioni.find((s) => s.id === da.sid)?.elementi[da.el];
  if (!sorgente || sorgente.k !== "immagini" || !sorgente.voci[da.i]) return sezioni;
  const img = sorgente.voci[da.i];
  // 1) libera il posto con un segnaposto (gli indici della destinazione restano validi)
  const liberato = sezioni.map((s) => s.id !== da.sid ? s : {
    ...s,
    elementi: s.elementi.map((e, k) => (k === da.el && e.k === "immagini" ? { ...e, voci: e.voci.map((v, j) => (j === da.i ? (VUOTO as unknown as ImmaginePiano) : v)) } : e)),
  });
  // 2) inserisci, 3) togli il segnaposto e le righe rimaste vuote
  return inserisciImmagine(liberato, a, img).map((s) => ({
    ...s,
    elementi: s.elementi
      .map((e) => (e.k === "immagini" ? { ...e, voci: e.voci.filter((v) => (v as unknown) !== VUOTO) } : e))
      .filter((e) => e.k !== "immagini" || e.voci.length > 0),
  }));
}

/** Cambia l'ordine delle alternative dentro lo stesso gruppo: verso = posizione d'inserimento (0..n). */
export function spostaAlternativa(sezioni: SezionePiano[], da: Posizione, verso: number): SezionePiano[] {
  return sezioni.map((s) => s.id !== da.sid ? s : {
    ...s,
    elementi: s.elementi.map((e, k) => {
      if (k !== da.el || e.k !== "opzioni" || !e.voci[da.i]) return e;
      const voci = [...e.voci];
      const [o] = voci.splice(da.i, 1);
      voci.splice(verso > da.i ? verso - 1 : verso, 0, o);
      return { ...e, voci };
    }),
  });
}
