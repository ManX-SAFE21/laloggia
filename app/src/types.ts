// Modello dati del mockup. I campi sono provvisori:
// verranno adattati quando arriveranno le schede Word della nutrizionista.

export type Sesso = "F" | "M";

export type TipoVisita = "Prima visita" | "Controllo";

/** Valori di un referto BIA (BioTekna BIA-ACC). Tutti facoltativi: si salva solo ciò che c'è. */
export interface Bia {
  dataMisura: string; // ISO yyyy-mm-dd
  ora?: string; // HH:MM
  fonte?: string; // nome del PDF importato
  peso?: number; // kg
  altezza?: number; // cm
  bmi?: number;
  fmPerc?: number; // FM, massa grassa, % del peso
  fmKg?: number;
  tbwPerc?: number; // TBW, acqua totale, % del peso
  tbwLitri?: number;
  aat?: number; // AAT, cm² — forse il "GV" della scheda: da confermare con Valentina
  pha?: number; // angolo di fase, °
  smmPerc?: number; // SMM, massa muscolare scheletrica, % della massa magra
  smmKg?: number;
  ffmPerc?: number; // FFM, massa magra, % del peso
  ffmKg?: number;
  bmr?: number; // metabolismo basale, kcal/giorno
  ee24?: number; // 24EE, dispendio nelle 24 ore, kcal/giorno — forse il "fabbisogno": da confermare
  pesoIdeale?: number; // kg
}

/** Voci del modulo cartaceo "NUOVO CLIENTE" di Valentina, nello stesso ordine.
 *  Farmaci e attività fisica stanno in Cliente.anamnesi (già usati altrove). Tutto testo libero. */
export interface SchedaPrimaVisita {
  data: string; // ISO, data del colloquio
  motivazione: string; // "Motivazione alimentazione"
  andamentoPeso: string; // "Andamento del peso negli anni"
  intestino: string;
  stomaco: string;
  fegato: string;
  cervicali: string; // "Cervicali / mal di testa"
  tiroide: string;
  doloriArticolari: string;
  stressUmore: string;
  fameNervosa: string;
  fameNervosaQuando: string;
  vogliaDi: "" | "Dolce" | "Salato" | "Entrambi" | "Nessuna";
  vogliaNote: string;
  sonno: string;
  energia: string;
  urine: string;
  lavoro: string;
  possibilitaAttivita: string; // "Possibilità di inserirla"
  quanteVolte: string;
  ciclo: string;
  analisi: string;
  // Retro del foglio: come mangia oggi (solo alla prima visita)
  giornataTipo: { momento: string; ora: string; testo: string }[];
  frequenze: Record<string, number>; // gruppo alimentare -> volte a settimana
  noteAlimentazione: string;
}

export interface Visita {
  id: string;
  data: string; // ISO yyyy-mm-dd
  tipo: TipoVisita;
  peso: number; // kg
  vita?: number; // circonferenza vita, cm
  fianchi?: number; // cm
  massaGrassa?: number; // % (inserita a mano; se c'è la BIA vale bia.fmPerc)
  bia?: Bia;
  note?: string;
}

export interface Allegato {
  id: string;
  nome: string;
  tipo: "pdf" | "foto";
  data: string;
  dimensioneKb: number;
  conFile?: boolean; // il file è nel database (gli allegati di esempio non ne hanno)
  descrizione?: string; // scritta da Valentina; se manca si mostra il nome del file
}

export interface Consenso {
  firmato: boolean;
  data?: string;
  versioneInformativa?: string;
  modalita?: "cartaceo";
}

export interface Cliente {
  id: string;
  nome: string;
  cognome: string;
  sesso: Sesso;
  dataNascita: string;
  telefono: string;
  email: string;
  altezza: number; // cm
  obiettivo: string;
  pesoTeorico?: number; // kg
  fabbisogno?: number; // kcal/giorno
  primaVisita?: SchedaPrimaVisita;
  anamnesi: {
    patologie: string;
    farmaci: string;
    allergieIntolleranze: string;
    attivitaFisica: string;
    abitudini: string;
  };
  visite: Visita[];
  allegati: Allegato[];
  consenso: Consenso;
  dietaId?: string;
  attivo: boolean;
}

export type GruppoNutriente = "macro" | "minerali" | "vitamine" | "acidiGrassi" | "aminoacidi" | "altri";

/** Un valore nutrizionale per 100 g di parte edibile (acidi grassi in % dei lipidi, aminoacidi in % delle proteine). */
export interface ValoreNutriente {
  gruppo: GruppoNutriente;
  chiave: string; // nome stabile per le formule, es. "energia_kcal", "ferro"
  nome: string; // come nelle tabelle CREA, es. "Ferro (mg)"
  unita: string;
  v?: number; // valore; se manca c'è il testo (t) o il dato non è disponibile
  t?: string; // "tr" (tracce) o testo (es. aminoacido limitante)
  min?: number;
  max?: number;
  origine?: string; // A analitico, B bibliografico, C calcolato, S stimato
}

export interface Alimento {
  id: string; // "crea-000800" per gli alimenti CREA
  nome: string;
  categoria: string;
  icona?: string; // emoji; se manca si usa quella della categoria
  // valori principali per 100 g (le diete usano questi)
  kcal: number;
  proteine: number;
  carboidrati: number;
  grassi: number;
  fonte?: "crea" | "studio"; // da dove viene: tabelle CREA o aggiunto a mano dallo studio
  codiceCrea?: string;
  nomeInglese?: string;
  parteEdibile?: number; // %
  porzione?: number; // g
  porzioneTesto?: string;
  valori?: ValoreNutriente[]; // tutti i valori (pulsante «Dettagli»)
  modificato?: boolean; // un valore CREA è stato cambiato a mano: si può ripristinare
  nascosto?: boolean; // tolto dalla lista e dalla ricerca nelle diete (gli alimenti CREA non si cancellano)
}

export interface VoceDieta {
  id: string;
  alimentoId: string;
  grammi: number;
}

export const PASTI = ["Colazione", "Spuntino", "Pranzo", "Merenda", "Cena"] as const;
export type Pasto = (typeof PASTI)[number];

export const GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"] as const;

// giorno (0-6) -> pasto -> voci
export type Settimana = Record<number, Record<Pasto, VoceDieta[]>>;

export interface Dieta {
  id: string;
  clienteId: string;
  titolo: string;
  creata: string;
  kcalObiettivo: number;
  settimana: Settimana;
  noteGenerali: string;
}

// --- Piano alimentare stampabile (sul modello dei piani Word di Valentina, es. "1450 - Piatto completo") ---
// Nel testo, **parola** si stampa in grassetto e *parola* in corsivo (vedi testoRicco.ts).

/** Una delle alternative di un pasto ("Scegliere tra"), con frequenza settimanale facoltativa. */
export interface OpzionePiano {
  frequenza?: string; // es. "3 volte"
  titolo?: string; // es. "Pancake"
  testo: string;
  nota?: string; // es. preparazione, esempi
  alimenti?: RigaAlimento[]; // alimenti dalla lista, con i grammi: sono ciò che entra nel calcolo dei valori
}

/** Un alimento in un'alternativa. quantita è come si stampa: «45» oppure «40-50» (il calcolo usa il centro).
 *  nome: copia, perché la stampa resti leggibile anche se l'alimento viene poi eliminato. */
export interface RigaAlimento {
  alimentoId: string;
  nome: string;
  quantita: string;
}

export type ElementoPiano =
  | { k: "testo"; testo: string }
  | { k: "avviso"; testo: string } // riquadro evidenziato
  | { k: "opzioni"; titolo?: string; voci: OpzionePiano[] } // alternative numerate
  | { k: "elenco"; titolo?: string; voci: string[] } // elenco puntato
  | { k: "tabella"; righe: [string, string][] }
  | { k: "voci"; voci: { titolo: string; testo: string }[] } // titolo + spiegazione (gruppi, cotture, consigli)
  | { k: "immagini"; voci: ImmaginePiano[] }; // riga di immagini (incluse nel programma o caricate)

/** Un'immagine del piano: chiave nella libreria (immaginiPiano.ts o caricata) e altezza stampata in mm. */
export interface ImmaginePiano {
  chiave: string;
  mm: number;
}

export interface SezionePiano {
  id: string;
  titolo: string;
  icona?: string; // simbolo del font IconeCibo
  inclusa: boolean; // si stampa?
  informativa?: boolean; // pagine di consigli uguali per tutti (ma modificabili)
  nuovaPagina?: boolean; // in stampa inizia su una pagina nuova
  volte?: number; // pasti: quante volte al giorno conta nel totale dei valori (se manca, 1)
  elementi: ElementoPiano[];
}

export const TIPI_MODELLO = ["Ipocalorico", "Isocalorico", "Ipercalorico", "Altro"] as const;
export type TipoModello = (typeof TIPI_MODELLO)[number];

/** Modello di piano (menu "Piani alimentari"). Da qui si crea il piano del cliente, che ne è una COPIA:
 *  modificare o eliminare un modello non tocca mai i piani dei clienti (regole in CLAUDE.md). */
export interface ModelloPiano {
  id: string;
  nome: string; // es. "1450 – Piatto completo"
  tipo: TipoModello;
  kcal?: number;
  modificato: string; // ISO
  nota?: string; // nota interna, non stampata
  titolo: string; // titolo in copertina
  messaggio?: string;
  sezioni: SezionePiano[];
}

export interface PianoAlimentare {
  id: string;
  clienteId: string;
  titolo: string;
  modello: string; // nome del modello di partenza al momento della creazione (solo informazione)
  modelloId?: string; // da quale modello è nato: serve solo a contare i clienti, mai a ricopiarne i contenuti
  creato: string; // ISO
  kcal?: number;
  messaggio?: string; // frase personale in copertina
  sezioni: SezionePiano[];
}

/** Impostazioni dello studio, salvate nell'archivio (tabella impostazioni). */
export interface Impostazioni {
  mesiRichiamo: number; // lista clienti, filtro "Da richiamare": ultima visita più vecchia di così, senza appuntamento
  cartellaDisco: string; // backup in chiaro sul disco esterno ("" = non impostato)
  cartellaCloud: string; // backup .7z cifrato nella cartella di Dropbox ("" = non impostato)
}

export interface Appuntamento {
  id: string;
  clienteId: string;
  data: string; // yyyy-mm-dd
  ora: string; // HH:MM
  durata: number; // minuti
  tipo: "Prima visita" | "Controllo" | "Online";
}
