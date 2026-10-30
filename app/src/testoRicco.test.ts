import { describe, expect, it } from "vitest";
import { analizza, componi, htmlDaTesto } from "./testoRicco";

describe("testo con grassetto e corsivo", () => {
  it("riconosce grassetto, corsivo ed entrambi", () => {
    expect(analizza("a **b** c *d* ***e***")).toEqual([
      { testo: "a " }, { testo: "b", g: true }, { testo: " c " }, { testo: "d", c: true }, { testo: " " }, { testo: "e", g: true, c: true },
    ]);
  });
  it("un segno senza compagno resta un carattere", () => {
    expect(analizza("3 * 2")).toEqual([{ testo: "3 * 2" }]);
    expect(analizza("**b** resto**")).toEqual([{ testo: "b", g: true }, { testo: " resto**" }]);
  });
  it("andata e ritorno non cambiano i testi", () => {
    for (const t of ["", "semplice", "**pane di segale** + 2 **uova**", "a *b* c", "***x*** y", "riga\nnuova **b**"]) {
      expect(componi(analizza(t))).toBe(t);
    }
  });
  it("tiene gli spazi fuori dai segni e unisce i pezzi uguali", () => {
    expect(componi([{ testo: "a " }, { testo: "b ", g: true }, { testo: "c", g: true }, { testo: " d" }])).toBe("a **b c** d");
    expect(componi([{ testo: " ", g: true }, { testo: "x" }])).toBe(" x");
  });
  it("l'HTML è sicuro e formattato", () => {
    expect(htmlDaTesto("<b> & **x**\n*y*")).toBe("&lt;b&gt; &amp; <strong>x</strong><br><em>y</em>");
  });
});
