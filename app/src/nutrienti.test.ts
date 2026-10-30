import { describe, expect, it } from "vitest";
import { grammiCalcolo, percentualiMacro, riepilogoPiano, testoRiga } from "./nutrienti";
import { Alimento, OpzionePiano, PianoAlimentare, SezionePiano } from "./types";

const pane: Alimento = { id: "pane", nome: "Pane di segale", categoria: "x", kcal: 200, proteine: 10, carboidrati: 40, grassi: 2, valori: [{ gruppo: "macro", chiave: "fibra_totale", nome: "Fibra", unita: "g", v: 6 }] };
const noci: Alimento = { id: "noci", nome: "Noci", categoria: "x", kcal: 600, proteine: 20, carboidrati: 10, grassi: 50 };
const lista = [pane, noci];

const alt = (id: string, quantita: string): OpzionePiano => ({ testo: "", alimenti: [{ alimentoId: id, nome: id, quantita }] });
const pasto = (titolo: string, voci: OpzionePiano[], extra: Partial<SezionePiano> = {}): SezionePiano => ({ id: titolo, titolo, inclusa: true, elementi: [{ k: "opzioni", voci }], ...extra });
const piano = (sezioni: SezionePiano[]) => ({ sezioni }) as PianoAlimentare;

describe("quantità", () => {
  it("capisce grammi singoli e forbici, usando il centro", () => {
    expect(grammiCalcolo("45")).toBe(45);
    expect(grammiCalcolo("40-50")).toBe(45);
    expect(grammiCalcolo("40 – 50 g")).toBe(45);
    expect(grammiCalcolo("12,5")).toBe(12.5);
  });
  it("rifiuta ciò che non è una quantità", () => {
    for (const q of ["", "un pugno", "0", "1 cucchiaino"]) expect(grammiCalcolo(q)).toBeNull();
  });
  it("stampa la quantità come è scritta", () => {
    expect(testoRiga({ alimentoId: "pane", nome: "x", quantita: "40-50" }, pane)).toBe("40-50 g di pane di segale");
    expect(testoRiga({ alimentoId: "via", nome: "Farro", quantita: "45 g" })).toBe("45 g di farro");
  });
});

describe("riepilogo del piano", () => {
  it("calcola ogni alternativa e la forbice della giornata", () => {
    const r = riepilogoPiano(piano([pasto("Colazione", [alt("pane", "50"), alt("noci", "40-60")]), pasto("Cena", [alt("pane", "100")])]), lista);
    expect(r.pasti[0].alternative.map((a) => a.valori?.kcal)).toEqual([100, 300]);
    expect(r.min.kcal).toBe(300);
    expect(r.max.kcal).toBe(500);
    expect(r.min.fibra).toBe(6);
  });
  it("le alternative di solo testo sono non calcolate e non contano", () => {
    const r = riepilogoPiano(piano([pasto("Colazione", [{ testo: "Porridge" }, alt("pane", "50")]), pasto("Cena", [{ testo: "Zuppa" }])]), lista);
    expect(r.pasti[0].alternative[0].valori).toBeNull();
    expect(r.min.kcal).toBe(100);
    expect(r.pastiSenzaValori).toBe(1);
  });
  it("segnala le righe da controllare senza contarle", () => {
    const o: OpzionePiano = { testo: "", alimenti: [{ alimentoId: "pane", nome: "p", quantita: "50" }, { alimentoId: "noci", nome: "n", quantita: "boh" }, { alimentoId: "via", nome: "v", quantita: "10" }] };
    const a = riepilogoPiano(piano([pasto("Pranzo", [o])]), lista).pasti[0].alternative[0];
    expect(a.valori?.kcal).toBe(100);
    expect(a.daControllare).toBe(true);
  });
  it("uno spuntino x2 conta due volte nel totale", () => {
    const r = riepilogoPiano(piano([pasto("Spuntino", [alt("pane", "50")], { volte: 2 })]), lista);
    expect(r.pasti[0].alternative[0].valori?.kcal).toBe(100);
    expect(r.min.kcal).toBe(200);
  });
  it("salta sezioni escluse, informative e senza alternative", () => {
    const r = riepilogoPiano(piano([
      pasto("Esclusa", [alt("pane", "50")], { inclusa: false }),
      pasto("Consigli", [alt("pane", "50")], { informativa: true }),
      { id: "n", titolo: "Note", inclusa: true, elementi: [{ k: "testo", testo: "x" }] },
    ]), lista);
    expect(r.pasti).toEqual([]);
    expect(r.max.kcal).toBe(0);
  });
  it("calcola le percentuali dei macronutrienti", () => {
    const v = { kcal: 0, proteine: 25, carboidrati: 50, grassi: 11.11, fibra: 0 };
    expect(percentualiMacro(v, v)).toEqual({ proteine: 25, carboidrati: 50, grassi: 25 });
    expect(percentualiMacro({ ...v, proteine: 0, carboidrati: 0, grassi: 0 }, { ...v, proteine: 0, carboidrati: 0, grassi: 0 })).toBeNull();
  });
});
