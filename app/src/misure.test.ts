import { describe, expect, it } from "vitest";
import { differenza, misura, piuMesi } from "./misure";
import { Visita } from "./types";

const visita = (data: string, tipo: Visita["tipo"], peso: number): Visita => ({ id: data, data, tipo, peso });

describe("differenza", () => {
  it("parte dalla Prima visita, ignorando le misure più vecchie dello storico BIA", () => {
    const visite = [visita("2024-06-12", "Controllo", 65), visita("2026-02-24", "Prima visita", 71.2), visita("2026-10-17", "Controllo", 64.8)];
    expect(differenza(misura("peso"), visite)).toBeCloseTo(-6.4);
  });

  it("senza Prima visita parte dalla misura più vecchia", () => {
    expect(differenza(misura("peso"), [visita("2026-01-10", "Controllo", 80), visita("2026-03-10", "Controllo", 78)])).toBe(-2);
  });

  it("con una sola misura non c'è differenza", () => {
    expect(differenza(misura("peso"), [visita("2026-01-10", "Prima visita", 80)])).toBeUndefined();
  });
});

describe("piuMesi", () => {
  it("propone il controllo a +2 mesi", () => {
    expect(piuMesi("2026-10-20", 2)).toBe("2026-12-20");
    expect(piuMesi("2026-11-30", 2)).toBe("2027-01-30");
  });
});
