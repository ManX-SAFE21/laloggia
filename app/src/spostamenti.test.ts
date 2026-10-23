import { describe, expect, it } from "vitest";
import { inserisciImmagine, spostaAlternativa, spostaImmagine } from "./spostamenti";
import { SezionePiano } from "./types";

const img = (chiave: string) => ({ chiave, mm: 25 });
const sezioni = (): SezionePiano[] => [
  { id: "a", titolo: "A", inclusa: true, elementi: [
    { k: "testo", testo: "x" },
    { k: "immagini", voci: [img("1"), img("2"), img("3")] },
    { k: "opzioni", voci: [{ testo: "o1" }, { testo: "o2" }, { testo: "o3" }] },
  ] },
  { id: "b", titolo: "B", inclusa: true, elementi: [{ k: "immagini", voci: [img("9")] }] },
];
const chiavi = (s: SezionePiano[], sid: string, el: number) => {
  const e = s.find((x) => x.id === sid)!.elementi[el];
  return e.k === "immagini" ? e.voci.map((v) => v.chiave) : null;
};

describe("spostaImmagine", () => {
  it("dentro la stessa riga, verso destra e verso sinistra", () => {
    expect(chiavi(spostaImmagine(sezioni(), { sid: "a", el: 1, i: 0 }, { sid: "a", el: 1, i: 3 }), "a", 1)).toEqual(["2", "3", "1"]);
    expect(chiavi(spostaImmagine(sezioni(), { sid: "a", el: 1, i: 2 }, { sid: "a", el: 1, i: 0 }), "a", 1)).toEqual(["3", "1", "2"]);
  });

  it("in un'altra sezione, dentro una riga esistente", () => {
    const s = spostaImmagine(sezioni(), { sid: "a", el: 1, i: 1 }, { sid: "b", el: 0, i: 0 });
    expect(chiavi(s, "a", 1)).toEqual(["1", "3"]);
    expect(chiavi(s, "b", 0)).toEqual(["2", "9"]);
  });

  it("l'ultima immagine spostata via fa sparire la riga vuota", () => {
    const s = spostaImmagine(sezioni(), { sid: "b", el: 0, i: 0 }, { sid: "a", el: 1, i: 0 });
    expect(s[1].elementi).toHaveLength(0);
    expect(chiavi(s, "a", 1)).toEqual(["9", "1", "2", "3"]);
  });

  it("senza riga di destinazione crea una riga nuova in fondo alla sezione", () => {
    const s = spostaImmagine(sezioni(), { sid: "a", el: 1, i: 0 }, { sid: "b" });
    expect(s[1].elementi).toHaveLength(2);
    expect(chiavi(s, "b", 1)).toEqual(["1"]);
  });

  it("non modifica le sezioni ricevute (serve ad Annulla)", () => {
    const prima = sezioni();
    const copia = JSON.stringify(prima);
    spostaImmagine(prima, { sid: "a", el: 1, i: 0 }, { sid: "b" });
    expect(JSON.stringify(prima)).toBe(copia);
  });
});

describe("inserisciImmagine e spostaAlternativa", () => {
  it("inserisce un'immagine caricata nel punto scelto", () => {
    expect(chiavi(inserisciImmagine(sezioni(), { sid: "a", el: 1, i: 1 }, img("nuova")), "a", 1)).toEqual(["1", "nuova", "2", "3"]);
  });

  it("riordina le alternative dello stesso gruppo", () => {
    const testi = (s: SezionePiano[]) => { const e = s[0].elementi[2]; return e.k === "opzioni" ? e.voci.map((o) => o.testo) : []; };
    expect(testi(spostaAlternativa(sezioni(), { sid: "a", el: 2, i: 0 }, 3))).toEqual(["o2", "o3", "o1"]);
    expect(testi(spostaAlternativa(sezioni(), { sid: "a", el: 2, i: 2 }, 0))).toEqual(["o3", "o1", "o2"]);
    expect(testi(spostaAlternativa(sezioni(), { sid: "a", el: 2, i: 1 }, 1))).toEqual(["o1", "o2", "o3"]);
  });
});
