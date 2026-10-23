import { describe, expect, it } from "vitest";
import { byteDaBase64, controllaFile, mimeDaNome } from "./allegati";

describe("allegati: quali file si possono aggiungere", () => {
  it("PDF e foto accettati, con il tipo giusto", () => {
    expect(controllaFile("Referto sangue.PDF", 1000)).toEqual({ tipo: "pdf" });
    expect(controllaFile("foto.jpeg", 1000)).toEqual({ tipo: "foto" });
    expect(controllaFile("scansione.webp", 1000)).toEqual({ tipo: "foto" });
  });

  it("altri file o troppo grandi: rifiutati con un messaggio", () => {
    expect(controllaFile("lettera.docx", 1000)).toHaveProperty("errore");
    expect(controllaFile("enorme.pdf", 21 * 1024 * 1024)).toHaveProperty("errore");
  });

  it("tipo del contenuto dal nome, e base64 riletto uguale", () => {
    expect(mimeDaNome("a.png")).toBe("image/png");
    expect(mimeDaNome("a.pdf")).toBe("application/pdf");
    expect([...byteDaBase64(btoa("%PDF"))]).toEqual([37, 80, 68, 70]);
  });
});
