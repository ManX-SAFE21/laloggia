// Elenco delle misure seguite nel tempo: usato da grafici, tabella delle visite e panoramica.
import { Visita } from "./types";

export interface Misura {
  key: string;
  label: string;
  unit: string;
  decimali: number;
  /** true se scendere è un miglioramento (colore della differenza); undefined = neutro */
  scendereBene?: boolean;
  /** true se il valore viene solo dalla BIA */
  soloBia?: boolean;
  nota?: string;
  get: (v: Visita) => number | undefined;
}

export const MISURE: Misura[] = [
  { key: "peso", label: "Peso", unit: "kg", decimali: 1, scendereBene: true, get: (v) => v.bia?.peso ?? v.peso },
  { key: "mg", label: "Massa grassa (MG)", unit: "%", decimali: 1, scendereBene: true, get: (v) => v.bia?.fmPerc ?? v.massaGrassa },
  { key: "mgKg", label: "Massa grassa", unit: "kg", decimali: 1, scendereBene: true, soloBia: true, get: (v) => v.bia?.fmKg },
  { key: "acqua", label: "Acqua totale (H₂O)", unit: "%", decimali: 1, scendereBene: false, soloBia: true, get: (v) => v.bia?.tbwPerc },
  { key: "gv", label: "GV (AAT)", unit: "cm²", decimali: 0, scendereBene: true, soloBia: true, nota: "Corrispondenza GV = AAT da confermare", get: (v) => v.bia?.aat },
  { key: "pha", label: "Angolo di fase", unit: "°", decimali: 1, scendereBene: false, soloBia: true, get: (v) => v.bia?.pha },
  { key: "muscolo", label: "Massa muscolare", unit: "kg", decimali: 1, scendereBene: false, soloBia: true, get: (v) => v.bia?.smmKg },
  { key: "vita", label: "Circonferenza vita", unit: "cm", decimali: 0, scendereBene: true, get: (v) => v.vita },
  { key: "fianchi", label: "Fianchi", unit: "cm", decimali: 0, scendereBene: true, get: (v) => v.fianchi },
];

export const misura = (key: string) => MISURE.find((m) => m.key === key)!;

/** Formatta un valore con le cifre decimali della misura, oppure "—". */
export const fmt = (m: Misura, x: number | undefined) =>
  x == null ? "—" : `${x.toLocaleString("it-IT", { minimumFractionDigits: m.decimali, maximumFractionDigits: m.decimali })} ${m.unit}`;

/** Differenza tra l'ultima misura e la prima a partire dalla "Prima visita"
 *  (le misure più vecchie, es. dallo storico di un referto BIA, restano nei grafici ma non contano qui). */
export function differenza(m: Misura, visite: Visita[]): number | undefined {
  const ordinate = [...visite].sort((a, b) => a.data.localeCompare(b.data));
  const inizio = Math.max(0, ordinate.findIndex((v) => v.tipo === "Prima visita"));
  const valori = ordinate.slice(inizio).map(m.get).filter((x): x is number => x != null);
  return valori.length >= 2 ? valori[valori.length - 1] - valori[0] : undefined;
}

/** Aggiunge mesi a una data ISO (es. prossimo controllo a +2 mesi). */
export function piuMesi(iso: string, mesi: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + mesi, d));
  return dt.toISOString().slice(0, 10);
}

export const INTERVALLO_CONTROLLO_MESI = 2;
