import { describe, expect, it } from "vitest";
import { fraseGiusta } from "./conferme";

describe("frase per cancellare un cliente", () => {
  it("accettata anche senza accento, virgola o maiuscole", () => {
    for (const f of ["sì, sono sicura", "si sono sicura", "Sì sono sicura", "  SI, SONO SICURA. "]) expect(fraseGiusta(f)).toBe(true);
  });
  it("rifiutata se incompleta o diversa", () => {
    for (const f of ["", "si", "sono sicura", "si sono sicuro", "no sono sicura"]) expect(fraseGiusta(f)).toBe(false);
  });
});
