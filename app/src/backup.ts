// Backup visti dal programma (il lavoro vero lo fa src-tauri/src/backup.rs): tipi, nomi con l'ora locale e
// la frase per l'indicatore. Disco esterno = copia in chiaro; cloud = .7z cifrato; rotazione 7/4/12.
import { Impostazioni } from "./types";

export interface EsitoDestinazione {
  esito: "ok" | "errore" | "non-collegato";
  messaggio?: string;
  file?: string;
  quando?: string; // "2026-10-25_1430"
  copie?: number;
  byteTotali?: number;
}

export interface StatoBackup {
  disco?: EsitoDestinazione;
  cloud?: EsitoDestinazione;
  discoUltimoOk?: string;
  cloudUltimoOk?: string;
  ultimoTentativo?: string;
  clienti?: number;
  passwordPresente?: boolean;
  setteZip?: boolean;
}

const due = (n: number) => String(n).padStart(2, "0");

/** Ora locale nel formato dei nomi dei backup: "2026-10-25_1430". */
export function momentoAdesso(d = new Date()): string {
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}_${due(d.getHours())}${due(d.getMinutes())}`;
}

/** "oggi alle 14:30", "ieri alle 09:05", "23/10/2026 alle 19:00". */
export function quandoLeggibile(momento: string, adesso = new Date()): string {
  const [data, ora] = momento.split("_");
  const orario = ora ? `${ora.slice(0, 2)}:${ora.slice(2)}` : "";
  const oggi = momentoAdesso(adesso).slice(0, 10);
  const ieri = momentoAdesso(new Date(adesso.getTime() - 86400000)).slice(0, 10);
  const giorno = data === oggi ? "oggi" : data === ieri ? "ieri" : data.split("-").reverse().join("/");
  return orario ? `${giorno} alle ${orario}` : giorno;
}

export const mb = (byte?: number) => (byte ? `${(byte / 1024 / 1024).toFixed(1)} MB` : "—");

/** Cosa scrivere nell'indicatore «Backup» e se va bene (✓) o no (⚠). */
export function riassuntoBackup(s: StatoBackup, imp: Impostazioni, inCorso: boolean, adesso = new Date()): { ok: boolean; testo: string } {
  if (inCorso) return { ok: true, testo: "in corso…" };
  const disco = !!imp.cartellaDisco, cloud = !!imp.cartellaCloud;
  if (!disco && !cloud) return { ok: false, testo: "da impostare" };
  if ((disco && s.disco?.esito === "errore") || (cloud && s.cloud?.esito === "errore")) return { ok: false, testo: "non riuscito" };
  const ultimo = [disco && s.discoUltimoOk, cloud && s.cloudUltimoOk].filter((x): x is string => !!x).sort().pop();
  if (!ultimo) return { ok: false, testo: "mai fatto" };
  const vecchio = adesso.getTime() - new Date(ultimo.slice(0, 10)).getTime() > 2.5 * 86400000;
  return { ok: !vecchio, testo: quandoLeggibile(ultimo, adesso) };
}

/** Serve un backup adesso? (una volta al giorno per destinazione; dopo un tentativo, si riprova tra un'ora) */
export function serveBackup(s: StatoBackup, imp: Impostazioni, discoCollegato: boolean, adesso = new Date()): boolean {
  const oggi = momentoAdesso(adesso).slice(0, 10);
  if (s.ultimoTentativo) {
    const t = s.ultimoTentativo;
    const minuti = (adesso.getTime() - new Date(`${t.slice(0, 10)}T${t.slice(11, 13)}:${t.slice(13, 15)}`).getTime()) / 60000;
    if (minuti >= 0 && minuti < 60) return false;
  }
  const disco = !!imp.cartellaDisco && discoCollegato && s.discoUltimoOk?.slice(0, 10) !== oggi;
  const cloud = !!imp.cartellaCloud && !!s.passwordPresente && s.cloudUltimoOk?.slice(0, 10) !== oggi;
  return disco || cloud;
}
