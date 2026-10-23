// Regole dei modelli di piano (CLAUDE.md, "Piani alimentari: modelli e piani dei clienti").
import { describe, expect, it } from "vitest";
import { MODELLI, duplicaModello, modelloDaPiano, nuovoModello, nuovoPianoDaModello } from "./data";
import { ModelloPiano } from "./types";

const modello = (): ModelloPiano => structuredClone(MODELLI[0]);

describe("piano del cliente = copia indipendente del modello", () => {
  it("modificare il modello non cambia il piano già creato", () => {
    const m = modello();
    const piano = nuovoPianoDaModello(m, "c1", "2026-10-23");
    const testoPrima = JSON.stringify(piano.sezioni);
    m.sezioni[0].titolo = "Colazione CAMBIATA";
    m.sezioni[0].elementi.push({ k: "testo", testo: "nuovo testo nel modello" });
    m.kcal = 1800;
    expect(JSON.stringify(piano.sezioni)).toBe(testoPrima);
    expect(piano.kcal).toBe(1450);
  });

  it("modificare il piano non cambia il modello", () => {
    const m = modello();
    const prima = JSON.stringify(m.sezioni);
    const piano = nuovoPianoDaModello(m, "c1", "2026-10-23");
    piano.sezioni[0].titolo = "Colazione del cliente";
    expect(JSON.stringify(m.sezioni)).toBe(prima);
  });

  it("eliminare il modello non tocca il piano: il piano ha tutto il suo contenuto", () => {
    let modelli = [modello()];
    const piano = nuovoPianoDaModello(modelli[0], "c1", "2026-10-23");
    modelli = modelli.filter((x) => x.id !== piano.modelloId);
    expect(modelli).toHaveLength(0);
    expect(piano.modello).toBe("1450 – Piatto completo");
    expect(piano.sezioni.length).toBeGreaterThan(5);
  });

  it("piano e modello non condividono id di sezione", () => {
    const m = modello();
    const piano = nuovoPianoDaModello(m, "c1", "2026-10-23");
    const idModello = new Set(m.sezioni.map((s) => s.id));
    expect(piano.sezioni.some((s) => idModello.has(s.id))).toBe(false);
  });
});

describe("nuovo modello e duplica", () => {
  it("il modello nuovo ha i 4 pasti e le pagine di consigli", () => {
    const n = nuovoModello("2026-10-23");
    expect(n.sezioni.slice(0, 4).map((s) => s.titolo)).toEqual(["Colazione", "Spuntino mattino – pomeriggio", "Pranzo", "Cena"]);
    expect(n.sezioni.filter((s) => s.informativa).length).toBeGreaterThan(0);
  });

  it("la copia di un modello è indipendente dall'originale", () => {
    const m = modello();
    const copia = duplicaModello(m, "2026-10-23");
    copia.sezioni[0].titolo = "Cambiata nella copia";
    expect(m.sezioni[0].titolo).toBe("Colazione");
    expect(copia.nome).toBe("1450 – Piatto completo (copia)");
  });
});

describe("salva il piano di un cliente come nuovo modello", () => {
  it("è una copia indipendente e senza il messaggio personale", () => {
    const piano = { ...nuovoPianoDaModello(modello(), "c9", "2026-10-23"), messaggio: "Laura, brava!" };
    piano.sezioni[0].titolo = "Colazione di Laura";
    const nuovo = modelloDaPiano(piano, "1450 – variante", "Isocalorico", 1500, "Creato dal piano di Laura Fontana", "2026-10-23");
    expect(nuovo.messaggio).toBeUndefined();
    expect(nuovo.sezioni[0].titolo).toBe("Colazione di Laura");
    expect(nuovo).toMatchObject({ nome: "1450 – variante", tipo: "Isocalorico", kcal: 1500 });
    // cambiare il modello non tocca il piano e viceversa
    nuovo.sezioni[0].titolo = "Cambiata nel modello";
    expect(piano.sezioni[0].titolo).toBe("Colazione di Laura");
    piano.sezioni[1].titolo = "Cambiata nel piano";
    expect(nuovo.sezioni[1].titolo).not.toBe("Cambiata nel piano");
    expect(nuovo.sezioni.some((s) => piano.sezioni.some((x) => x.id === s.id))).toBe(false);
  });
});
