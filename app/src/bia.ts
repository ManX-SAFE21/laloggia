// Lettura dei valori da un referto BIA BioTekna (BIA-ACC) in PDF, a partire dal testo già estratto.
// Nessun OCR e nessun servizio esterno: si cercano le etichette del referto e si prende il numero accanto.
// Se BioTekna cambia le etichette, i test in bia.test.ts lo segnalano.
import { Bia } from "./types";

export interface PazienteBia {
  nome?: string; // come scritto nel referto, es. "rossi maria"
  dataNascita?: string; // ISO
  sesso?: "F" | "M";
}

export interface RigaStorico {
  data: string; // ISO
  peso?: number;
  fmPerc?: number;
  pha?: number;
}

export interface RisultatoBia {
  bia: Bia; // solo i valori trovati
  paziente: PazienteBia;
  storico: RigaStorico[]; // misure precedenti riportate in fondo al referto (esclusa quella attuale)
  mancanti: VoceBia["key"][]; // voci cercate ma non trovate
}

export type ChiaveBia = Exclude<keyof Bia, "dataMisura" | "ora" | "fonte">;

export interface VoceBia {
  key: ChiaveBia;
  label: string;
  unit: string;
  /** spuntata di default nell'anteprima (voci della scheda di Valentina) */
  scheda: boolean;
}

// Ordine e testi dell'anteprima di importazione.
export const VOCI_BIA: VoceBia[] = [
  { key: "peso", label: "Peso", unit: "kg", scheda: true },
  { key: "altezza", label: "Altezza", unit: "cm", scheda: true },
  { key: "fmPerc", label: "Massa grassa MG", unit: "%", scheda: true },
  { key: "fmKg", label: "Massa grassa MG", unit: "kg", scheda: true },
  { key: "tbwPerc", label: "Acqua totale H₂O", unit: "%", scheda: true },
  { key: "tbwLitri", label: "Acqua totale H₂O", unit: "litri", scheda: true },
  { key: "aat", label: "GV (AAT) — da confermare", unit: "cm²", scheda: true },
  { key: "pesoIdeale", label: "Peso teorico (Ideal weight)", unit: "kg", scheda: true },
  { key: "ee24", label: "Fabbisogno (24EE) — da confermare", unit: "kcal/giorno", scheda: true },
  { key: "bmi", label: "BMI", unit: "", scheda: false },
  { key: "pha", label: "Angolo di fase PhA", unit: "°", scheda: false },
  { key: "smmPerc", label: "Massa muscolare SMM", unit: "% FFM", scheda: false },
  { key: "smmKg", label: "Massa muscolare SMM", unit: "kg", scheda: false },
  { key: "ffmPerc", label: "Massa magra FFM", unit: "%", scheda: false },
  { key: "ffmKg", label: "Massa magra FFM", unit: "kg", scheda: false },
  { key: "bmr", label: "Metabolismo basale BMR", unit: "kcal/giorno", scheda: false },
];

const NUM = String.raw`(-?\d+(?:[.,]\d+)?)`;
const PARENTESI = String.raw`\s*\[[^\]]*\]\s*\[`; // salta il range, es. "[12 - 31]   ["

// Ogni regola cattura uno o due numeri; "chiavi" dice dove metterli.
// (?<![A-Za-z]) all'inizio: l'etichetta deve iniziare una parola, così "FM" non combacia dentro "FFM".
const REGOLE: { chiavi: ChiaveBia[]; re: string }[] = [
  { chiavi: ["altezza"], re: String.raw`Altezza \(cm\):\s*` + NUM },
  { chiavi: ["peso"], re: String.raw`Peso \(kg\):\s*` + NUM },
  { chiavi: ["bmi"], re: String.raw`BMI \(kg/m²\):\s*` + NUM },
  { chiavi: ["pha"], re: String.raw`PhA \(°\):\s*` + NUM },
  { chiavi: ["tbwPerc", "tbwLitri"], re: String.raw`TBW \(% BW\):\s*` + NUM + PARENTESI + NUM + String.raw` lt\]` },
  { chiavi: ["ffmPerc", "ffmKg"], re: String.raw`FFM \(% BW\):\s*` + NUM + PARENTESI + NUM + String.raw` kg\]` },
  { chiavi: ["smmPerc", "smmKg"], re: String.raw`SMM \(% FFM\):\s*` + NUM + PARENTESI + NUM + String.raw` kg\]` },
  { chiavi: ["fmPerc", "fmKg"], re: String.raw`FM \(% BW\):\s*` + NUM + PARENTESI + NUM + String.raw` kg\]` },
  { chiavi: ["aat"], re: String.raw`AAT \(cm²\):\s*` + NUM },
  { chiavi: ["bmr"], re: String.raw`BMR \(kcal/day\):\s*` + NUM },
  { chiavi: ["ee24"], re: String.raw`24EE:\s*` + NUM + String.raw`\s*kcal` },
  { chiavi: ["pesoIdeale"], re: String.raw`Ideal\s*weight:\s*` + NUM + String.raw`\s*kg` },
];

const cerca = (testo: string, re: string) => new RegExp(String.raw`(?<![A-Za-z])` + re, "s").exec(testo);
const numero = (s: string) => Number(s.replace(",", "."));
const isoDa = (gg_mm_aaaa: string) => {
  const [g, m, a] = gg_mm_aaaa.split("/");
  return `${a}-${m}-${g}`;
};

export function leggiBia(testo: string): RisultatoBia {
  const t = testo.replace(/\r/g, "");
  const bia: Bia = { dataMisura: "" };
  const mancanti: ChiaveBia[] = [];

  const data = cerca(t, String.raw`BIA-ACC:\s*(\d{2}/\d{2}/\d{4})\s*-\s*(\d{1,2}:\d{2})`);
  if (data) { bia.dataMisura = isoDa(data[1]); bia.ora = data[2]; }

  for (const { chiavi, re } of REGOLE) {
    const m = cerca(t, re);
    chiavi.forEach((k, i) => {
      if (m) bia[k] = numero(m[i + 1]);
      else mancanti.push(k);
    });
  }

  const paziente: PazienteBia = {};
  const nome = cerca(t, String.raw`Paziente:\s*(.+?)\s*Data di nascita:`);
  if (nome) paziente.nome = nome[1].split(/\s+/).join(" ").trim();
  const nascita = cerca(t, String.raw`Data di nascita:\s*(\d{2}/\d{2}/\d{4})`);
  if (nascita) paziente.dataNascita = isoDa(nascita[1]);
  const sesso = cerca(t, String.raw`Sesso:\s*([FM])\b`);
  if (sesso) paziente.sesso = sesso[1] as "F" | "M";

  return { bia, paziente, storico: leggiStorico(t, bia.dataMisura), mancanti };
}

/** Tabella in fondo al referto: tre date con peso, PhA e FM (%). Restituisce le date diverse da quella attuale. */
function leggiStorico(t: string, dataAttuale: string): RigaStorico[] {
  const intestazione = cerca(t, String.raw`Total Muscle Mass Density\s*((?:\d{2}/\d{2}/\d{4}\s*)+)`);
  if (!intestazione) return [];
  const date = intestazione[1].trim().split(/\s+/).map(isoDa);
  // Prende la riga che inizia con l'etichetta e ne estrae i numeri seguiti da "dopo" (es. "kg", "%").
  const valori = (etichetta: string, blocco: string, dopo: string) => {
    const m = cerca(t, etichetta + String.raw`\s+((?:` + blocco + String.raw`\s*)+)`);
    return m ? [...m[1].matchAll(new RegExp(NUM + String.raw`\s*` + dopo, "g"))].map((x) => numero(x[1])) : [];
  };
  const N = String.raw`-?\d+(?:[.,]\d+)?`;
  const pesi = valori("Weight", N + String.raw`\s*kg`, "kg");
  const fm = valori("FM", N + String.raw`\s*%\s*-\s*` + N + String.raw`\s*kg`, "%"); // "33 % - 21.3 kg": prende il 33
  const pha = valori("PhA", N, "");
  return date
    .map((data, i) => ({ data, peso: pesi[i], fmPerc: fm[i], pha: pha[i] }))
    .filter((r) => r.data !== dataAttuale);
}

/** Confronta il paziente del referto con il cliente aperto. Restituisce gli avvisi da mostrare. */
export function avvisiPaziente(p: PazienteBia, cliente: { nome: string; cognome: string; dataNascita: string }): string[] {
  const avvisi: string[] = [];
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!p.nome) avvisi.push("Nel referto non è stato trovato il nome del paziente.");
  else {
    const parole = norm(p.nome).split(" ");
    if (!parole.includes(norm(cliente.nome)) || !parole.includes(norm(cliente.cognome)))
      avvisi.push(`Il referto è intestato a "${p.nome}", non a ${cliente.nome} ${cliente.cognome}.`);
  }
  if (p.dataNascita && p.dataNascita !== cliente.dataNascita)
    avvisi.push(`Data di nascita nel referto diversa da quella del cliente (${p.dataNascita.split("-").reverse().join("/")}).`);
  return avvisi;
}
