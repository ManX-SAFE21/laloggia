// Valori nutrizionali del piano, calcolati dagli alimenti inseriti nelle alternative dei pasti.
// Funzioni pure, provate nei test. Il testo libero non entra nel calcolo.
import { Alimento, OpzionePiano, PianoAlimentare, RigaAlimento } from "./types";
import { valore } from "./alimenti";

export interface Valori { kcal: number; proteine: number; carboidrati: number; grassi: number; fibra: number }
export const ZERO: Valori = { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0, fibra: 0 };

const CAMPI = Object.keys(ZERO) as (keyof Valori)[];
const combina = (a: Valori, b: Valori, f: (x: number, y: number) => number): Valori =>
  Object.fromEntries(CAMPI.map((c) => [c, f(a[c], b[c])])) as unknown as Valori;
const somma = (a: Valori, b: Valori) => combina(a, b, (x, y) => x + y);
const per = (a: Valori, n: number): Valori => combina(a, ZERO, (x) => x * n);

const FORMATO_QUANTITA = /^\s*(\d+(?:[.,]\d+)?)\s*(?:[-–—]\s*(\d+(?:[.,]\d+)?))?\s*(?:g|gr|grammi)?\s*$/i;

/** I grammi usati nel calcolo: «45» vale 45, «40-50» vale 45. null se non si capisce o è zero. */
export function grammiCalcolo(q: string): number | null {
  const m = FORMATO_QUANTITA.exec(q);
  if (!m) return null;
  const a = Number(m[1].replace(",", "."));
  const b = m[2] ? Number(m[2].replace(",", ".")) : a;
  const centro = (a + b) / 2;
  return centro > 0 ? centro : null;
}

/** La riga come si stampa: «40-50 g di pane di segale» (la quantità resta come è stata scritta). */
export function testoRiga(r: RigaAlimento, a?: Alimento): string {
  const nome = a?.nome ?? r.nome;
  const minuscolo = /^\p{Lu}\p{Ll}/u.test(nome) ? nome[0].toLowerCase() + nome.slice(1) : nome;
  const q = r.quantita.trim();
  return `${/\d$/.test(q) ? `${q} g` : q} di ${minuscolo}`;
}

/** Valori di un alimento per quei grammi. I valori del CREA sono per 100 g. */
export function valoriAlimento(a: Alimento, grammi: number): Valori {
  const f = grammi / 100;
  return { kcal: a.kcal * f, proteine: a.proteine * f, carboidrati: a.carboidrati * f, grassi: a.grassi * f, fibra: (valore(a, "fibra_totale") ?? 0) * f };
}

export interface ValoriAlternativa {
  n: number;
  titolo?: string;
  valori: Valori | null; // null: nessun alimento calcolabile («non calcolata»)
  daControllare: boolean; // una riga ha una quantità non valida o un alimento che non esiste più
}

export function valoriAlternativa(o: OpzionePiano, n: number, lista: Alimento[]): ValoriAlternativa {
  let valori: Valori | null = null;
  let daControllare = false;
  for (const r of o.alimenti ?? []) {
    const a = lista.find((x) => x.id === r.alimentoId);
    const g = grammiCalcolo(r.quantita);
    if (!a || g === null) { daControllare = true; continue; }
    valori = somma(valori ?? ZERO, valoriAlimento(a, g));
  }
  return { n, titolo: o.titolo, valori, daControllare };
}

export interface ValoriPasto { id: string; titolo: string; volte: number; alternative: ValoriAlternativa[]; min: Valori; max: Valori; calcolato: boolean }
export interface RiepilogoPiano { pasti: ValoriPasto[]; min: Valori; max: Valori; pastiSenzaValori: number }

/** Pasti = sezioni stampate, non informative, con delle alternative. Forbice del giorno: somma dei
 *  minimi e dei massimi di ogni pasto, un nutriente alla volta. Le alternative non calcolate non contano. */
export function riepilogoPiano(piano: PianoAlimentare, lista: Alimento[]): RiepilogoPiano {
  const pasti: ValoriPasto[] = [];
  for (const s of piano.sezioni) {
    if (!s.inclusa || s.informativa) continue;
    const gruppi = s.elementi.flatMap((e) => (e.k === "opzioni" ? [e.voci] : []));
    if (!gruppi.length) continue;
    const volte = s.volte ?? 1;
    let min = ZERO, max = ZERO, calcolato = false;
    const alternative: ValoriAlternativa[] = [];
    for (const voci of gruppi) {
      const qui = voci.map((o, i) => valoriAlternativa(o, i + 1, lista));
      alternative.push(...qui);
      const conValori = qui.flatMap((a) => (a.valori ? [a.valori] : []));
      if (!conValori.length) continue;
      calcolato = true;
      min = somma(min, per(conValori.reduce((x, y) => combina(x, y, Math.min)), volte));
      max = somma(max, per(conValori.reduce((x, y) => combina(x, y, Math.max)), volte));
    }
    pasti.push({ id: s.id, titolo: s.titolo, volte, alternative, min, max, calcolato });
  }
  return {
    pasti,
    min: pasti.reduce((t, p) => somma(t, p.min), ZERO),
    max: pasti.reduce((t, p) => somma(t, p.max), ZERO),
    pastiSenzaValori: pasti.filter((p) => !p.calcolato).length,
  };
}

/** Quota di energia di proteine, carboidrati e grassi (4, 4 e 9 kcal/g), a metà della forbice. */
export function percentualiMacro(min: Valori, max: Valori): { proteine: number; carboidrati: number; grassi: number } | null {
  const p = ((min.proteine + max.proteine) / 2) * 4;
  const c = ((min.carboidrati + max.carboidrati) / 2) * 4;
  const g = ((min.grassi + max.grassi) / 2) * 9;
  const tot = p + c + g;
  if (tot <= 0) return null;
  return { proteine: Math.round((p / tot) * 100), carboidrati: Math.round((c / tot) * 100), grassi: Math.round((g / tot) * 100) };
}
