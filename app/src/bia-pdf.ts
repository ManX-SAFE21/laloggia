// Estrae il testo di un PDF sul PC con pdf.js (Mozilla, licenza Apache 2.0). Niente internet.
// pdf.js si carica solo quando serve, per non appesantire l'avvio del programma.
import { leggiBia, RisultatoBia } from "./bia";

export async function testoDaPdf(dati: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const caricamento = pdfjs.getDocument({ data: new Uint8Array(dati) });
  const doc = await caricamento.promise;
  let testo = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const contenuto = await (await doc.getPage(i)).getTextContent();
    for (const item of contenuto.items) {
      if ("str" in item) testo += item.str + (item.hasEOL ? "\n" : " ");
    }
    testo += "\n";
  }
  await caricamento.destroy();
  return testo;
}

export async function leggiBiaDaFile(file: File): Promise<RisultatoBia> {
  return leggiBia(await testoDaPdf(await file.arrayBuffer()));
}
