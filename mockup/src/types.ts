// Modello dati del mockup. I campi sono provvisori:
// verranno adattati quando arriveranno le schede Word della nutrizionista.

export type Sesso = "F" | "M";

export interface Visita {
  id: string;
  data: string; // ISO yyyy-mm-dd
  peso: number; // kg
  vita?: number; // circonferenza vita, cm
  fianchi?: number; // cm
  massaGrassa?: number; // %
  note?: string;
}

export interface Allegato {
  id: string;
  nome: string;
  tipo: "pdf" | "foto";
  data: string;
  dimensioneKb: number;
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

export interface Alimento {
  id: string;
  nome: string;
  categoria: string;
  icona?: string; // emoji; se manca si usa quella della categoria
  // valori per 100 g
  kcal: number;
  proteine: number;
  carboidrati: number;
  grassi: number;
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

export interface Appuntamento {
  id: string;
  clienteId: string;
  data: string; // yyyy-mm-dd
  ora: string; // HH:MM
  durata: number; // minuti
  tipo: "Prima visita" | "Controllo" | "Online";
}
