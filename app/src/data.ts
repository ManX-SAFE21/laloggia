// DATI INVENTATI per il mockup. Nessun cliente reale.
// I valori nutrizionali sono indicativi: nel programma vero si userà
// una banca dati ufficiale (es. tabelle CREA), da concordare.
import { Alimento, Appuntamento, Cliente, Dieta, PASTI, Pasto, Settimana, VoceDieta } from "./types";

export const OGGI = "2026-10-20";

// Versione dell'informativa: SEGNAPOSTO finché non arriva il modulo ufficiale dello studio.
export const VERSIONE_INFORMATIVA = "v0 (segnaposto)";

export const ALIMENTI: Alimento[] = [
  { id: "a1", icona: "🥛", nome: "Latte parzialmente scremato", categoria: "Latte e derivati", kcal: 46, proteine: 3.5, carboidrati: 5.0, grassi: 1.5 },
  { id: "a2", icona: "🥣", nome: "Yogurt greco 0%", categoria: "Latte e derivati", kcal: 57, proteine: 10.0, carboidrati: 4.0, grassi: 0.2 },
  { id: "a3", icona: "🧀", nome: "Parmigiano Reggiano", categoria: "Latte e derivati", kcal: 392, proteine: 33.0, carboidrati: 0.0, grassi: 28.0 },
  { id: "a4", nome: "Ricotta vaccina", categoria: "Latte e derivati", kcal: 146, proteine: 8.8, carboidrati: 3.5, grassi: 10.9 },
  { id: "a5", icona: "🌾", nome: "Fiocchi d'avena", categoria: "Cereali", kcal: 372, proteine: 13.0, carboidrati: 60.0, grassi: 7.0 },
  { id: "a6", icona: "🍞", nome: "Pane integrale", categoria: "Cereali", kcal: 224, proteine: 7.5, carboidrati: 41.0, grassi: 1.3 },
  { id: "a7", icona: "🍝", nome: "Pasta di semola", categoria: "Cereali", kcal: 353, proteine: 12.0, carboidrati: 72.0, grassi: 1.4 },
  { id: "a8", icona: "🍚", nome: "Riso integrale", categoria: "Cereali", kcal: 337, proteine: 7.5, carboidrati: 74.0, grassi: 1.9 },
  { id: "a9", nome: "Fette biscottate integrali", categoria: "Cereali", kcal: 390, proteine: 11.0, carboidrati: 70.0, grassi: 6.0 },
  { id: "a10", icona: "🍗", nome: "Petto di pollo", categoria: "Carne", kcal: 100, proteine: 23.0, carboidrati: 0.0, grassi: 0.8 },
  { id: "a11", icona: "🦃", nome: "Fesa di tacchino", categoria: "Carne", kcal: 107, proteine: 24.0, carboidrati: 0.0, grassi: 1.2 },
  { id: "a12", nome: "Bresaola", categoria: "Carne", kcal: 151, proteine: 32.0, carboidrati: 0.0, grassi: 2.6 },
  { id: "a13", icona: "🐟", nome: "Salmone fresco", categoria: "Pesce", kcal: 185, proteine: 18.4, carboidrati: 0.0, grassi: 12.0 },
  { id: "a14", icona: "🐟", nome: "Merluzzo", categoria: "Pesce", kcal: 71, proteine: 17.0, carboidrati: 0.0, grassi: 0.3 },
  { id: "a15", icona: "🐟", nome: "Tonno al naturale", categoria: "Pesce", kcal: 103, proteine: 25.0, carboidrati: 0.0, grassi: 0.3 },
  { id: "a16", icona: "🥚", nome: "Uovo intero", categoria: "Uova", kcal: 128, proteine: 12.4, carboidrati: 0.0, grassi: 8.7 },
  { id: "a17", nome: "Ceci secchi", categoria: "Legumi", kcal: 334, proteine: 21.0, carboidrati: 47.0, grassi: 6.3 },
  { id: "a18", nome: "Lenticchie secche", categoria: "Legumi", kcal: 325, proteine: 23.0, carboidrati: 51.0, grassi: 2.5 },
  { id: "a19", icona: "🥒", nome: "Zucchine", categoria: "Verdura", kcal: 11, proteine: 1.3, carboidrati: 1.4, grassi: 0.1 },
  { id: "a20", icona: "🥗", nome: "Insalata mista", categoria: "Verdura", kcal: 19, proteine: 1.5, carboidrati: 2.5, grassi: 0.3 },
  { id: "a21", icona: "🍅", nome: "Pomodori", categoria: "Verdura", kcal: 17, proteine: 1.0, carboidrati: 3.0, grassi: 0.2 },
  { id: "a22", icona: "🥦", nome: "Broccoli", categoria: "Verdura", kcal: 27, proteine: 3.0, carboidrati: 3.1, grassi: 0.4 },
  { id: "a23", icona: "🍎", nome: "Mela", categoria: "Frutta", kcal: 45, proteine: 0.3, carboidrati: 10.5, grassi: 0.1 },
  { id: "a24", icona: "🍌", nome: "Banana", categoria: "Frutta", kcal: 65, proteine: 1.2, carboidrati: 15.4, grassi: 0.3 },
  { id: "a25", icona: "🥝", nome: "Kiwi", categoria: "Frutta", kcal: 44, proteine: 1.2, carboidrati: 9.0, grassi: 0.6 },
  { id: "a26", icona: "🍓", nome: "Frutti di bosco", categoria: "Frutta", kcal: 40, proteine: 0.9, carboidrati: 7.0, grassi: 0.3 },
  { id: "a27", nome: "Mandorle", categoria: "Frutta secca", kcal: 603, proteine: 22.0, carboidrati: 4.6, grassi: 55.0 },
  { id: "a28", nome: "Noci", categoria: "Frutta secca", kcal: 689, proteine: 14.3, carboidrati: 5.1, grassi: 68.1 },
  { id: "a29", icona: "🥄", nome: "Olio extravergine d'oliva", categoria: "Condimenti", kcal: 899, proteine: 0.0, carboidrati: 0.0, grassi: 99.9 },
  { id: "a30", icona: "🍯", nome: "Miele", categoria: "Condimenti", kcal: 304, proteine: 0.6, carboidrati: 80.3, grassi: 0.0 },
];

let seq = 1000;
export const nuovoId = (p = "id") => `${p}${++seq}`;

const v = (alimentoId: string, grammi: number): VoceDieta => ({ id: nuovoId("v"), alimentoId, grammi });

function giornoTipo(): Record<Pasto, VoceDieta[]> {
  return {
    Colazione: [v("a2", 150), v("a5", 40), v("a26", 80)],
    Spuntino: [v("a23", 150)],
    Pranzo: [v("a7", 80), v("a21", 150), v("a3", 10), v("a29", 10)],
    Merenda: [v("a27", 15)],
    Cena: [v("a13", 150), v("a22", 200), v("a6", 50), v("a29", 10)],
  };
}

export function settimanaVuota(): Settimana {
  const s: Settimana = {};
  for (let g = 0; g < 7; g++) {
    s[g] = Object.fromEntries(PASTI.map((p) => [p, [] as VoceDieta[]])) as Record<Pasto, VoceDieta[]>;
  }
  return s;
}

function settimanaDemo(): Settimana {
  const s = settimanaVuota();
  for (let g = 0; g < 7; g++) s[g] = giornoTipo();
  // un po' di varietà
  s[1].Cena = [v("a10", 150), v("a19", 200), v("a8", 60), v("a29", 10)];
  s[3].Pranzo = [v("a18", 70), v("a20", 100), v("a6", 40), v("a29", 10)];
  s[5].Cena = [v("a14", 200), v("a20", 150), v("a6", 60), v("a29", 10)];
  return s;
}

const consensoOk = (data: string) => ({
  firmato: true,
  data,
  versioneInformativa: VERSIONE_INFORMATIVA,
  modalita: "cartaceo" as const,
});

function visiteDa(dati: [string, number, number, number][]) {
  return dati.map(([data, peso, vita, mg]) => ({ id: nuovoId("vis"), data, peso, vita, fianchi: Math.round(vita + 16), massaGrassa: mg }));
}

export const CLIENTI: Cliente[] = [
  {
    id: "c1", nome: "Giulia", cognome: "Martini", sesso: "F", dataNascita: "1988-03-14", telefono: "333 100 2001", email: "giulia.martini@esempio.it",
    altezza: 165, obiettivo: "Dimagrimento graduale, -6 kg",
    anamnesi: { patologie: "Nessuna rilevante", farmaci: "Nessuno", allergieIntolleranze: "Intolleranza al lattosio (lieve)", attivitaFisica: "Pilates 2 volte a settimana", abitudini: "Lavoro d'ufficio, pranza spesso fuori" },
    visite: visiteDa([["2026-05-12", 72.4, 86, 31.5], ["2026-06-09", 71.0, 84, 30.8], ["2026-07-07", 69.8, 82, 30.1], ["2026-08-25", 69.1, 81, 29.6], ["2026-09-22", 68.0, 80, 29.0]]),
    allegati: [
      { id: "al1", nome: "Analisi del sangue maggio 2026.pdf", tipo: "pdf", data: "2026-05-12", dimensioneKb: 412 },
      { id: "al2", nome: "Foto frontale maggio.jpg", tipo: "foto", data: "2026-05-12", dimensioneKb: 1830 },
    ],
    consenso: consensoOk("2026-05-12"), dietaId: "d1", attivo: true,
  },
  {
    id: "c2", nome: "Marco", cognome: "Bellini", sesso: "M", dataNascita: "1979-11-02", telefono: "347 200 3002", email: "m.bellini@esempio.it",
    altezza: 180, obiettivo: "Ricomposizione corporea, supporto allenamento",
    anamnesi: { patologie: "Ipercolesterolemia familiare", farmaci: "Statina (prescrizione del medico)", allergieIntolleranze: "Nessuna", attivitaFisica: "Corsa 3 volte a settimana", abitudini: "Salta spesso la colazione" },
    visite: visiteDa([["2026-04-03", 88.5, 98, 24.0], ["2026-05-08", 87.0, 96, 23.1], ["2026-06-19", 86.2, 95, 22.4], ["2026-09-15", 85.4, 93, 21.5]]),
    allegati: [{ id: "al3", nome: "Profilo lipidico aprile.pdf", tipo: "pdf", data: "2026-04-03", dimensioneKb: 236 }],
    consenso: consensoOk("2026-04-03"), attivo: true,
  },
  {
    id: "c3", nome: "Sara", cognome: "Colombo", sesso: "F", dataNascita: "1995-07-21", telefono: "340 300 4003", email: "sara.colombo@esempio.it",
    altezza: 170, obiettivo: "Alimentazione per gravidanza (2° trimestre)",
    anamnesi: { patologie: "Nessuna", farmaci: "Acido folico", allergieIntolleranze: "Nessuna", attivitaFisica: "Camminata quotidiana", abitudini: "Vegetariana" },
    visite: visiteDa([["2026-08-04", 63.0, 80, 27.0], ["2026-09-08", 64.6, 84, 27.4], ["2026-10-06", 66.0, 88, 27.8]]),
    allegati: [], consenso: consensoOk("2026-08-04"), attivo: true,
  },
  {
    id: "c4", nome: "Luca", cognome: "Ferrari", sesso: "M", dataNascita: "2001-01-30", telefono: "328 400 5004", email: "luca.ferrari@esempio.it",
    altezza: 176, obiettivo: "Aumento massa muscolare",
    anamnesi: { patologie: "Nessuna", farmaci: "Nessuno", allergieIntolleranze: "Allergia alla frutta a guscio", attivitaFisica: "Palestra 4 volte a settimana", abitudini: "Studente, orari irregolari" },
    visite: visiteDa([["2026-06-02", 68.0, 76, 14.0], ["2026-07-14", 69.3, 77, 14.2], ["2026-09-29", 71.1, 78, 14.5]]),
    allegati: [], consenso: { firmato: false }, attivo: true,
  },
  {
    id: "c5", nome: "Elena", cognome: "Rizzo", sesso: "F", dataNascita: "1969-09-09", telefono: "339 500 6005", email: "elena.rizzo@esempio.it",
    altezza: 160, obiettivo: "Menopausa, controllo peso",
    anamnesi: { patologie: "Ipotiroidismo", farmaci: "Levotiroxina", allergieIntolleranze: "Nessuna", attivitaFisica: "Acquagym", abitudini: "Spuntini serali frequenti" },
    visite: visiteDa([["2026-03-10", 74.0, 92, 36.0], ["2026-04-21", 72.8, 90, 35.2], ["2026-06-03", 71.5, 89, 34.6], ["2026-07-15", 71.9, 89, 34.8], ["2026-09-30", 70.2, 87, 34.0]]),
    allegati: [{ id: "al4", nome: "Esami tiroide marzo.pdf", tipo: "pdf", data: "2026-03-10", dimensioneKb: 188 }],
    consenso: consensoOk("2026-03-10"), attivo: true,
  },
  {
    id: "c6", nome: "Davide", cognome: "Greco", sesso: "M", dataNascita: "1985-05-17", telefono: "320 600 7006", email: "davide.greco@esempio.it",
    altezza: 174, obiettivo: "Dimagrimento, -10 kg",
    anamnesi: { patologie: "Glicemia a digiuno alta (riferita dal medico)", farmaci: "Nessuno", allergieIntolleranze: "Nessuna", attivitaFisica: "Sedentario", abitudini: "Turni di notte" },
    visite: visiteDa([["2026-07-01", 96.0, 108, 31.0], ["2026-08-05", 93.4, 105, 30.0], ["2026-09-09", 91.8, 103, 29.3], ["2026-10-14", 90.5, 101, 28.7]]),
    allegati: [], consenso: consensoOk("2026-07-01"), attivo: true,
  },
  {
    id: "c7", nome: "Chiara", cognome: "Bruno", sesso: "F", dataNascita: "1992-12-05", telefono: "345 700 8007", email: "chiara.bruno@esempio.it",
    altezza: 168, obiettivo: "Alimentazione sportiva (triathlon)",
    anamnesi: { patologie: "Nessuna", farmaci: "Nessuno", allergieIntolleranze: "Celiachia", attivitaFisica: "Allenamento quotidiano", abitudini: "Gare nel weekend" },
    visite: visiteDa([["2026-05-20", 58.0, 66, 19.0], ["2026-08-12", 57.4, 65, 18.4]]),
    allegati: [], consenso: consensoOk("2026-05-20"), attivo: true,
  },
  {
    id: "c8", nome: "Paolo", cognome: "Gallo", sesso: "M", dataNascita: "1958-02-11", telefono: "331 800 9008", email: "paolo.gallo@esempio.it",
    altezza: 172, obiettivo: "Mantenimento, alimentazione equilibrata",
    anamnesi: { patologie: "Ipertensione", farmaci: "Antipertensivo (prescrizione del medico)", allergieIntolleranze: "Nessuna", attivitaFisica: "Bicicletta nel weekend", abitudini: "Pensionato" },
    visite: visiteDa([["2026-02-18", 81.0, 99, 27.5], ["2026-06-16", 79.8, 97, 26.9]]),
    allegati: [], consenso: consensoOk("2026-02-18"), attivo: false,
  },
];

export const DIETE: Dieta[] = [
  {
    id: "d1", clienteId: "c1", titolo: "Piano ipocalorico — autunno 2026", creata: "2026-09-22", kcalObiettivo: 1600,
    settimana: settimanaDemo(),
    noteGenerali: "Bere almeno 1,5 litri d'acqua al giorno. Le verdure sono a volontà. Se pranzi fuori, scegli un primo semplice o un secondo con contorno.",
  },
];

export const APPUNTAMENTI: Appuntamento[] = [
  { id: "ap1", clienteId: "c6", data: "2026-10-19", ora: "09:00", durata: 45, tipo: "Controllo" },
  { id: "ap2", clienteId: "c3", data: "2026-10-19", ora: "15:30", durata: 45, tipo: "Controllo" },
  { id: "ap3", clienteId: "c1", data: "2026-10-20", ora: "10:00", durata: 45, tipo: "Controllo" },
  { id: "ap4", clienteId: "c4", data: "2026-10-20", ora: "11:00", durata: 30, tipo: "Online" },
  { id: "ap5", clienteId: "c2", data: "2026-10-20", ora: "17:00", durata: 45, tipo: "Controllo" },
  { id: "ap6", clienteId: "c5", data: "2026-10-21", ora: "09:30", durata: 45, tipo: "Controllo" },
  { id: "ap7", clienteId: "c7", data: "2026-10-22", ora: "14:00", durata: 60, tipo: "Prima visita" },
  { id: "ap8", clienteId: "c6", data: "2026-10-23", ora: "18:00", durata: 30, tipo: "Online" },
  { id: "ap9", clienteId: "c3", data: "2026-10-24", ora: "10:00", durata: 45, tipo: "Controllo" },
];

// --- utilità ---
// Emoji scelte tra quelle disponibili sia su Windows 10 sia su Windows 11.
export const ICONE_CATEGORIA: Record<string, string> = {
  "Latte e derivati": "🥛", Cereali: "🌾", Carne: "🥩", Pesce: "🐟", Uova: "🥚", Legumi: "🌱",
  Verdura: "🥗", Frutta: "🍎", "Frutta secca": "🥜", Condimenti: "🥄",
};
// Si toglie il selettore di emoji a colori (U+FE0F): il set monocromatico ha il solo simbolo base.
export const iconaDi = (a: Alimento) => (a.icona || ICONE_CATEGORIA[a.categoria] || "🍽").replace(/\uFE0F/g, "");

export const ELENCO_ICONE = [
  "🥛","🥣","🧀","🥚","🍞","🥖","🥐","🥞","🌾","🍝","🍚","🍜","🍕","🍔","🥪","🌮",
  "🥩","🍖","🍗","🦃","🥓","🐟","🍤","🦐","🍣","🥗","🥒","🥕","🌽","🥦","🍅","🍆",
  "🥔","🍠","🌶","🍄","🍎","🍏","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍒","🍑","🥝",
  "🥥","🥜","🌰","🌱","🍯","🥄","🧂","🍫","🍪","🍰","🍦","☕","🍵","💧","🍷","🍽",
];

export const alimentoById = (lista: Alimento[], id: string) => lista.find((a) => a.id === id);

export function totali(lista: Alimento[], voci: VoceDieta[]) {
  return voci.reduce(
    (t, x) => {
      const a = alimentoById(lista, x.alimentoId);
      if (!a) return t;
      const f = x.grammi / 100;
      t.kcal += a.kcal * f; t.proteine += a.proteine * f; t.carboidrati += a.carboidrati * f; t.grassi += a.grassi * f;
      return t;
    },
    { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 }
  );
}

export function eta(dataNascita: string) {
  const [y, m, d] = dataNascita.split("-").map(Number);
  const [oy, om, od] = OGGI.split("-").map(Number);
  return oy - y - (om < m || (om === m && od < d) ? 1 : 0);
}

export const fmtData = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const bmi = (peso: number, altezzaCm: number) => peso / Math.pow(altezzaCm / 100, 2);
