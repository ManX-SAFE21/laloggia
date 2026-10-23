import { describe, expect, it } from "vitest";
import { CLIENTI, MODELLI, PIANI } from "./data";
import { doveUsata } from "./immaginiPiano";

describe("doveUsata: un'immagine caricata si elimina solo se nessuno la usa", () => {
  it("immagine non usata: elenco vuoto", () => {
    expect(doveUsata("img-mai-usata", MODELLI, PIANI, CLIENTI)).toEqual([]);
  });

  it("usata in un modello e nel piano di un cliente: li elenca tutti e due", () => {
    const modelli = structuredClone(MODELLI);
    const piani = structuredClone(PIANI);
    modelli[0].sezioni[0].elementi.push({ k: "immagini", voci: [{ chiave: "img-foto", mm: 25 }] });
    piani[0].sezioni[1].elementi.push({ k: "immagini", voci: [{ chiave: "img-altra", mm: 25 }, { chiave: "img-foto", mm: 15 }] });
    const c = CLIENTI.find((x) => x.id === piani[0].clienteId)!;
    expect(doveUsata("img-foto", modelli, piani, CLIENTI)).toEqual([
      `Modello «${modelli[0].nome}»`,
      `Piano di ${c.nome} ${c.cognome} («${piani[0].titolo}»)`,
    ]);
  });
});
