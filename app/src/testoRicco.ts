// Grassetto e corsivo dei testi del piano. Si salvano nel testo con **grassetto** e *corsivo*;
// sul foglio si vedono già formattati. Funzioni pure, provate nei test.

export interface Pezzo { testo: string; g?: boolean; c?: boolean }

/** Dal testo salvato ai pezzi formattati. Un segno senza il suo compagno resta un carattere normale. */
export function analizza(t: string): Pezzo[] {
  const parti = t.split(/(\*\*|\*)/);
  let restanti = { "**": parti.filter((p) => p === "**").length, "*": parti.filter((p) => p === "*").length };
  const pezzi: Pezzo[] = [];
  let g = false, c = false;
  const aggiungi = (testo: string) => {
    if (!testo) return;
    const ultimo = pezzi[pezzi.length - 1];
    if (ultimo && !!ultimo.g === g && !!ultimo.c === c) ultimo.testo += testo;
    else pezzi.push({ testo, ...(g ? { g } : {}), ...(c ? { c } : {}) });
  };
  for (const p of parti) {
    if (p === "**") {
      if (g || restanti["**"] > 1) g = !g; else aggiungi(p);
      restanti = { ...restanti, "**": restanti["**"] - 1 };
    } else if (p === "*") {
      if (c || restanti["*"] > 1) c = !c; else aggiungi(p);
      restanti = { ...restanti, "*": restanti["*"] - 1 };
    } else aggiungi(p);
  }
  return pezzi;
}

/** Dai pezzi formattati al testo da salvare. Gli spazi restano fuori dai segni, altrimenti non si riaprono bene. */
export function componi(pezzi: Pezzo[]): string {
  const uniti: Pezzo[] = [];
  for (const p of pezzi) {
    if (!p.testo) continue;
    const u = uniti[uniti.length - 1];
    if (u && !!u.g === !!p.g && !!u.c === !!p.c) u.testo += p.testo;
    else uniti.push({ ...p });
  }
  let out = "";
  for (const p of uniti) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(p.testo)!;
    if (!m[2]) { out += p.testo; continue; }
    const segno = (p.g ? "**" : "") + (p.c ? "*" : "");
    out += m[1] + segno + m[2] + segno + m[3];
  }
  return out;
}

const SICURO: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

/** L'HTML con cui il testo si mostra nella casella modificabile. */
export function htmlDaTesto(t: string): string {
  return analizza(t).map((p) => {
    let h = p.testo.replace(/[&<>]/g, (x) => SICURO[x]).replace(/\n/g, "<br>");
    if (p.c) h = `<em>${h}</em>`;
    if (p.g) h = `<strong>${h}</strong>`;
    return h;
  }).join("");
}
