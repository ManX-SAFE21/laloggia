import { describe, expect, it } from "vitest";
import { CLIENTI } from "./data";
import { corrisponde, ordina, passaFiltro, righe } from "./listaClienti";
import { Appuntamento, Cliente } from "./types";

const OGGI = "2026-10-20";
const cliente = (id: string, cognome: string, visite: string[], extra: Partial<Cliente> = {}): Cliente => ({
  ...structuredClone(CLIENTI[0]), id, nome: "Anna", cognome, attivo: true, allegati: [],
  visite: visite.map((data, i) => ({ id: `${id}-${i}`, data, tipo: i ? "Controllo" : "Prima visita", peso: 60 + i })),
  consenso: { firmato: true }, ...extra,
});

describe("lista clienti", () => {
  it("ricerca: senza accenti e apostrofi, parole in qualsiasi ordine, telefono con o senza spazi", () => {
    const c = cliente("x", "D'Angelo", [], { nome: "Niccolò", telefono: "347 200 3002", email: "n.dangelo@esempio.it" });
    expect(corrisponde(c, "dangelo")).toBe(true);
    expect(corrisponde(c, "niccolo d'angelo")).toBe(true);
    expect(corrisponde(c, "Angelo Nicco")).toBe(true);
    expect(corrisponde(c, "3472003002")).toBe(true);
    expect(corrisponde(c, "347 200")).toBe(true);
    expect(corrisponde(c, "rossi")).toBe(false);
  });

  it("Da richiamare: attivi, senza appuntamento, ultima visita più vecchia dei mesi scelti", () => {
    const vecchio = cliente("a", "Vecchio", ["2026-06-01"]);
    const recente = cliente("b", "Recente", ["2026-09-30"]);
    const conAppuntamento = cliente("c", "Prenotato", ["2026-05-01"]);
    const archiviato = cliente("d", "Archiviato", ["2026-01-01"], { attivo: false });
    const app: Appuntamento[] = [{ id: "ap", clienteId: "c", data: "2026-11-02", ora: "10:00", durata: 45, tipo: "Controllo" }];
    const r = righe([vecchio, recente, conAppuntamento, archiviato], app, OGGI);
    expect(r.filter((x) => passaFiltro(x, "richiamare", 2, OGGI)).map((x) => x.c.cognome)).toEqual(["Vecchio"]);
    // con 6 mesi, nessuno: cambia davvero con l'impostazione
    expect(r.filter((x) => passaFiltro(x, "richiamare", 6, OGGI))).toEqual([]);
    expect(r.filter((x) => passaFiltro(x, "appuntamento", 2, OGGI)).map((x) => x.c.cognome)).toEqual(["Prenotato"]);
    expect(r.filter((x) => passaFiltro(x, "archiviati", 2, OGGI)).map((x) => x.c.cognome)).toEqual(["Archiviato"]);
  });

  it("Nuovi: prima visita negli ultimi 30 giorni; un appuntamento passato non conta", () => {
    const nuovo = cliente("n", "Nuovo", ["2026-10-05"]);
    const app: Appuntamento[] = [{ id: "ap", clienteId: "n", data: "2026-10-01", ora: "10:00", durata: 45, tipo: "Controllo" }];
    const [r] = righe([nuovo], app, OGGI);
    expect(passaFiltro(r, "nuovi", 2, OGGI)).toBe(true);
    expect(r.prossimo).toBeUndefined();
  });

  it("ordinamento per colonna: chi non ha il dato resta in fondo, in entrambi i versi", () => {
    const r = righe([cliente("a", "Bianchi", ["2026-03-01"]), cliente("b", "Azzurri", []), cliente("c", "Colombo", ["2026-09-01"])], [], OGGI);
    expect(ordina(r, { colonna: "ultima", crescente: true }).map((x) => x.c.cognome)).toEqual(["Bianchi", "Colombo", "Azzurri"]);
    expect(ordina(r, { colonna: "ultima", crescente: false }).map((x) => x.c.cognome)).toEqual(["Colombo", "Bianchi", "Azzurri"]);
    expect(ordina(r, { colonna: "cliente", crescente: true }).map((x) => x.c.cognome)).toEqual(["Azzurri", "Bianchi", "Colombo"]);
  });
});
