// File degli allegati dei clienti (PDF e foto). Nel programma vero stanno dentro il database cifrato e
// viaggiano con comandi a parte (mai insieme alla scheda del cliente, mai copiati in chiaro sul disco).
// Nell'anteprima del browser restano solo in memoria, finché la pagina è aperta.
import { inTauri } from "./store";

export const MAX_MB_ALLEGATO = 20;
const ESTENSIONI: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

const estensione = (nome: string) => nome.toLowerCase().split(".").pop() ?? "";

/** Tipo di allegato per un file scelto, o un messaggio se il file non va bene. */
export function controllaFile(nome: string, byte: number): { tipo: "pdf" | "foto" } | { errore: string } {
  const ext = estensione(nome);
  if (!ESTENSIONI[ext]) return { errore: `«${nome}»: si possono allegare solo PDF, JPG, PNG o WebP.` };
  if (byte > MAX_MB_ALLEGATO * 1024 * 1024) return { errore: `«${nome}» supera ${MAX_MB_ALLEGATO} MB.` };
  return { tipo: ext === "pdf" ? "pdf" : "foto" };
}

export const mimeDaNome = (nome: string) => ESTENSIONI[estensione(nome)] ?? "application/octet-stream";

const memoria = new Map<string, string>(); // anteprima nel browser: id -> base64

async function comando<T>(nome: string, argomenti: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(nome, argomenti);
}

/** Contenuto di un File in base64 (senza il prefisso "data:..."). */
export function base64DaFile(f: File): Promise<string> {
  return new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] ?? "");
    r.onerror = () => ko(new Error("il file non si legge"));
    r.readAsDataURL(f);
  });
}

export async function salvaFileAllegato(clienteId: string, allegato: { id: string; nome: string; tipo: string; data: string; dimensioneKb: number }, base64: string) {
  if (!inTauri) { memoria.set(allegato.id, base64); return; }
  await comando("allegato_salva_file", { clienteId, allegato, base64 });
}

export async function leggiFileAllegato(id: string): Promise<string> {
  if (!inTauri) {
    const b = memoria.get(id);
    if (!b) throw new Error("questo allegato non ha un file");
    return b;
  }
  return comando<string>("allegato_leggi", { id });
}

/** "Salva una copia…": Valentina sceglie dove; la copia fuori dal programma non è cifrata. */
export async function esportaAllegato(id: string, nome: string): Promise<boolean> {
  if (!inTauri) {
    const a = document.createElement("a");
    a.href = `data:${mimeDaNome(nome)};base64,${await leggiFileAllegato(id)}`;
    a.download = nome;
    a.click();
    return true;
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const percorso = await save({ title: "Salva una copia dell'allegato", defaultPath: nome });
  if (!percorso) return false;
  await comando("allegato_esporta", { id, percorso });
  return true;
}

export const byteDaBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
