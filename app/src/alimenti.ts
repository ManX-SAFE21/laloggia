// Alimenti delle tabelle CREA (dati originali in src-tauri/alimenti-crea.json, inclusi nel programma):
// modifica a mano dei valori, «Ripristina ai dati originali», ricerca. Funzioni pure, provate nei test.
import { Alimento, GruppoNutriente, ValoreNutriente } from "./types";

export const FONTE_CREA =
  "Valori nutrizionali: CREA – Centro di ricerca Alimenti e Nutrizione, Tabelle di composizione degli alimenti, aggiornamento 2019 – www.alimentinutrizione.it";

export const GRUPPI: [GruppoNutriente, string][] = [
  ["macro", "Macronutrienti"],
  ["minerali", "Minerali"],
  ["vitamine", "Vitamine"],
  ["acidiGrassi", "Acidi grassi (% dei lipidi)"],
  ["aminoacidi", "Aminoacidi (% delle proteine)"],
  ["altri", "Altri composti"],
];

export const ORIGINE: Record<string, string> = { A: "analitico", B: "bibliografico", C: "calcolato", S: "stimato" };

/** I 4 valori principali (usati dalle diete) e la chiave CREA da cui vengono. */
export const MACRO: Record<"kcal" | "proteine" | "carboidrati" | "grassi", string> = {
  kcal: "energia_kcal", proteine: "proteine", carboidrati: "carboidrati_disponibili", grassi: "lipidi",
};

/** Il valore di un nutriente per 100 g (per le formule): undefined se non c'è o è "tracce". */
export function valore(a: Alimento, chiave: string): number | undefined {
  return a.valori?.find((x) => x.chiave === chiave)?.v;
}

/** Cambia un valore a mano: tiene allineati i 4 principali e segna l'alimento come modificato. */
export function cambiaValore(a: Alimento, chiave: string, v: number | undefined): Alimento {
  const valori = (a.valori ?? []).map((x): ValoreNutriente => {
    if (x.chiave !== chiave) return x;
    const { t: _t, ...resto } = x;
    return v === undefined ? { ...resto, v: undefined } : { ...resto, v };
  });
  const nuovo: Alimento = { ...a, valori, modificato: a.fonte === "crea" ? true : a.modificato };
  for (const [campo, k] of Object.entries(MACRO) as [keyof typeof MACRO, string][]) {
    if (k === chiave) nuovo[campo] = v ?? 0;
  }
  return nuovo;
}

/** Ripristino: i valori tornano quelli originali CREA; restano le scelte dello studio (icona, nascosto). */
export function ripristina(attuale: Alimento, originale: Alimento): Alimento {
  return { ...originale, id: attuale.id, icona: attuale.icona, nascosto: attuale.nascosto, modificato: false };
}

/** Il dato originale CREA senza metodo e referenza (quelli si leggono a parte, nei dettagli della fonte). */
export type ValoreConFonte = ValoreNutriente & { metodo?: string; ref?: number };
export type AlimentoConFonte = Omit<Alimento, "valori"> & { valori?: ValoreConFonte[] };
export function senzaFonte(a: AlimentoConFonte): Alimento {
  return { ...a, valori: a.valori?.map(({ metodo: _m, ref: _r, ...x }) => x) };
}

/** Testo da mostrare per un valore: "12,3", "tracce", "Lisina", "—". */
export function mostra(x: ValoreNutriente): string {
  if (x.v !== undefined && x.v !== null) return String(x.v).replace(".", ",");
  if (x.t === "tr") return "tracce";
  return x.t ?? "—";
}
