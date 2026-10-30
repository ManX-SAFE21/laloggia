import { describe, expect, it } from "vitest";
import { cambiaValore, mostra, ripristina, senzaFonte, valore } from "./alimenti";
import { Alimento } from "./types";

const pasta = (): Alimento => ({
  id: "crea-000800", nome: "Pasta di semola", categoria: "Cereali e derivati", fonte: "crea", codiceCrea: "000800",
  kcal: 341, proteine: 13.5, carboidrati: 72.7, grassi: 1.2, porzione: 80,
  valori: [
    { gruppo: "macro", chiave: "energia_kcal", nome: "Energia (kcal)", unita: "kcal", v: 341, origine: "C" },
    { gruppo: "macro", chiave: "proteine", nome: "Proteine (g)", unita: "g", v: 13.5, origine: "A" },
    { gruppo: "minerali", chiave: "ferro", nome: "Ferro (mg)", unita: "mg", v: 1.4, origine: "A" },
    { gruppo: "vitamine", chiave: "vitamina_e", nome: "Vitamina E (mg)", unita: "mg", t: "tr", origine: "A" },
  ],
});

describe("alimenti CREA", () => {
  it("valore per le formule: numero, oppure niente se tracce o assente", () => {
    expect(valore(pasta(), "ferro")).toBe(1.4);
    expect(valore(pasta(), "vitamina_e")).toBeUndefined();
    expect(valore(pasta(), "selenio")).toBeUndefined();
  });

  it("cambiare a mano un valore principale aggiorna anche quello usato dalle diete e segna «modificato»", () => {
    const a = cambiaValore(pasta(), "proteine", 14);
    expect(a.proteine).toBe(14);
    expect(valore(a, "proteine")).toBe(14);
    expect(a.modificato).toBe(true);
    const b = cambiaValore(pasta(), "ferro", 2);
    expect(b.kcal).toBe(341);
    expect(valore(b, "ferro")).toBe(2);
    // un valore "tracce" diventa un numero
    expect(valore(cambiaValore(pasta(), "vitamina_e", 0.1), "vitamina_e")).toBe(0.1);
  });

  it("ripristino: tornano i dati originali, restano icona e «nascosto»", () => {
    const cambiato = { ...cambiaValore(pasta(), "proteine", 20), icona: "🍝", nascosto: true };
    const r = ripristina(cambiato, pasta());
    expect(r.proteine).toBe(13.5);
    expect(r.modificato).toBe(false);
    expect([r.icona, r.nascosto]).toEqual(["🍝", true]);
  });

  it("senza fonte e testi da mostrare", () => {
    const conFonte = { ...pasta(), valori: pasta().valori!.map((x) => ({ ...x, metodo: "Drying", ref: 0 })) };
    expect(Object.keys(senzaFonte(conFonte).valori![0])).not.toContain("metodo");
    expect(mostra(pasta().valori![1])).toBe("13,5");
    expect(mostra(pasta().valori![3])).toBe("tracce");
  });
});
