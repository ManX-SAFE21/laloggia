import { describe, expect, it } from "vitest";
import { prossimoZoom } from "./zoomFoglio";

describe("zoom del foglio: − e + si fermano sulle decine", () => {
  it("da un valore qualsiasi (dopo Adatta) si arriva a 100%", () => {
    expect(prossimoZoom(0.83, 1)).toBe(0.9);
    expect(prossimoZoom(0.9, 1)).toBe(1);
    expect(prossimoZoom(1.17, -1)).toBe(1.1);
    expect(prossimoZoom(1.1, -1)).toBe(1);
  });
  it("dalle decine si va di 10 in 10, entro 50% e 200%", () => {
    expect(prossimoZoom(1, 1)).toBe(1.1);
    expect(prossimoZoom(1, -1)).toBe(0.9);
    expect(prossimoZoom(0.5, -1)).toBe(0.5);
    expect(prossimoZoom(2, 1)).toBe(2);
  });
});
