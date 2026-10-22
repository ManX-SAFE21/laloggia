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
