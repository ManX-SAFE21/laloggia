import { describe, expect, it } from "vitest";
import { ALIMENTI, APPUNTAMENTI, CLIENTI, DIETE, MODELLI, PIANI } from "./data";
import { conAllegatiDiOggi, descriviPassaggio } from "./annulla";
import { DatiArchivio } from "./sincronizza";

const dati = (): DatiArchivio => structuredClone({
  clienti: CLIENTI, modelli: MODELLI, piani: PIANI, appuntamenti: APPUNTAMENTI, alimenti: ALIMENTI, diete: DIETE, immagini: {},
});

describe("Annulla di tutto il programma", () => {
  it("dice in parole cosa è cambiato", () => {
    const prima = dati();
    const dopo = dati();
    dopo.clienti[0].obiettivo = "Nuovo";
    expect(descriviPassaggio(prima, dopo)).toBe(`${prima.clienti[0].nome} ${prima.clienti[0].cognome}`);
    dopo.appuntamenti = dopo.appuntamenti.filter((a) => a.id !== prima.appuntamenti[0].id);
    expect(descriviPassaggio(prima, dopo)).toMatch(/e un'altra cosa$/);
    expect(descriviPassaggio(prima, prima)).toBeNull();
  });

  it("un appuntamento eliminato si descrive con data e cliente", () => {
    const prima = dati();
    const dopo = dati();
    const ap = prima.appuntamenti[0];
    dopo.appuntamenti = dopo.appuntamenti.slice(1);
    const c = prima.clienti.find((x) => x.id === ap.clienteId)!;
    expect(descriviPassaggio(prima, dopo)).toContain(`(${c.nome} ${c.cognome})`);
  });

  it("gli allegati non tornano indietro (il file eliminato non c'è più)", () => {
    const prima = dati();
    const oggi = dati();
    oggi.clienti[0].obiettivo = "cambiato";
    oggi.clienti[0].allegati = [];
    const rimessi = conAllegatiDiOggi(prima, oggi);
    expect(rimessi.clienti[0].obiettivo).toBe(prima.clienti[0].obiettivo);
    expect(rimessi.clienti[0].allegati).toEqual([]);
    // se cambiava solo un allegato, non resta niente da annullare
    const soloAllegato = dati();
    soloAllegato.clienti[0].allegati = [];
    expect(descriviPassaggio(soloAllegato, conAllegatiDiOggi(dati(), soloAllegato))).toBeNull();
  });
});
