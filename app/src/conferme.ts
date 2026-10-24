// Frase da scrivere prima di cancellare definitivamente un cliente (contro i clic per sbaglio).
export const FRASE_CONFERMA = "sì, sono sicura";

/** Accetta la frase anche senza accento, virgola o maiuscole: "si sono sicura", "Sì sono sicura"... */
export const fraseGiusta = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, " ").trim() === "si sono sicura";
