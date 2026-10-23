// Immagini dei piani alimentari, prese dal modello Word di Valentina ("1450 - PIATTO COMPLETO.docx").
// Nei dati si salva solo la chiave; qui la chiave diventa il file incluso nel programma.
import proteine1 from "./assets/piano/proteine-legumi-soia-quinoa.png";
import proteine2 from "./assets/piano/proteine-uova-latticini-mare.png";
import proteine3 from "./assets/piano/proteine-pollo-manzo-pesce.png";
import carboidrati from "./assets/piano/carboidrati.png";
import grassi1 from "./assets/piano/grassi-salmone-semi-frutta-secca.png";
import grassi2 from "./assets/piano/grassi-olio-avocado-mandorle.png";
import cotture from "./assets/piano/cotture.jpg";
import porzioni from "./assets/piano/porzioni.png";
import instagram from "./assets/piano/instagram.png";
import facebook from "./assets/piano/facebook.png";

export const IMMAGINI_PIANO: Record<string, string> = {
  "proteine-vegetali": proteine1,
  "proteine-uova-latticini": proteine2,
  "proteine-carne-pesce": proteine3,
  carboidrati,
  "grassi-1": grassi1,
  "grassi-2": grassi2,
  cotture,
  porzioni,
  instagram,
  facebook,
};

// Immagini mostrate nella libreria (le icone dei social restano solo per il piè di pagina).
export const LIBRERIA_INCLUSA: { chiave: string; nome: string }[] = [
  { chiave: "proteine-vegetali", nome: "Legumi, soia, quinoa" },
  { chiave: "proteine-uova-latticini", nome: "Uova, latticini, frutti di mare" },
  { chiave: "proteine-carne-pesce", nome: "Pollo, carne, pesce" },
  { chiave: "carboidrati", nome: "Carboidrati" },
  { chiave: "grassi-1", nome: "Grassi: salmone, semi, frutta secca" },
  { chiave: "grassi-2", nome: "Grassi: olio, avocado, mandorle" },
  { chiave: "cotture", nome: "Cotture" },
  { chiave: "porzioni", nome: "Porzioni" },
];

/** Immagini caricate da Valentina: chiave -> nome e contenuto (data URL). Per ora in memoria; poi nel database. */
export type ImmaginiCaricate = Record<string, { nome: string; src: string }>;

/** Indirizzo dell'immagine: inclusa nel programma o caricata. */
export const srcImmagine = (chiave: string, caricate: ImmaginiCaricate) => IMMAGINI_PIANO[chiave] ?? caricate[chiave]?.src;

// Altezze proposte in stampa (mm).
export const DIMENSIONI_IMMAGINE = [
  { nome: "S", mm: 15 },
  { nome: "M", mm: 25 },
  { nome: "L", mm: 40 },
  { nome: "XL", mm: 60 },
];
