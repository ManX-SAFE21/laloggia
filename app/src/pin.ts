// PIN di sblocco: 4 cifre, salvato come impronta PBKDF2-SHA256 con salt casuale.
// Stato (impronta, errori, attese) nella memoria locale del programma (WebView2,
// cartella %LOCALAPPDATA%\it.laloggia.gestionale): resta anche chiudendo il programma.
// Solo per la prova: PIN e cifratura del database vero sono il punto aperto 00b di CLAUDE.md.

export const LUNGHEZZA_PIN = 4;
export const PIN_INIZIALE = "1234";
export const TENTATIVI_PIN = 6;

const CHIAVE = "laloggia.pin.v1";
const ITERAZIONI = 100_000;
const MINUTO = 60 * 1000;

type StatoPin = {
  salt: string;        // esadecimale
  hash: string;        // esadecimale
  errori: number;      // errori nel giro di tentativi in corso
  attese: number;      // attese già imposte dall'ultimo PIN giusto
  bloccatoFino: number; // ms dall'epoch; 0 = nessuna attesa
};

export type EsitoPin =
  | { tipo: "ok" }
  | { tipo: "errato"; rimasti: number }
  | { tipo: "bloccato"; fino: number };

/** Durata dell'n-esima attesa (n parte da 1): 3 da 5 minuti, poi 30 minuti, poi 1 ora ciascuna. */
export function durataAttesa(n: number): number {
  if (n <= 3) return 5 * MINUTO;
  if (n === 4) return 30 * MINUTO;
  return 60 * MINUTO;
}

const hex = (b: ArrayBuffer | Uint8Array) =>
  Array.from(b instanceof Uint8Array ? b : new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");

const daHex = (s: string) => new Uint8Array(s.match(/../g)!.map((x) => parseInt(x, 16)));

async function impronta(pin: string, saltHex: string): Promise<string> {
  const chiave = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: daHex(saltHex), iterations: ITERAZIONI },
    chiave,
    256,
  );
  return hex(bits);
}

function leggi(): StatoPin | null {
  try {
    const s = localStorage.getItem(CHIAVE);
    return s ? (JSON.parse(s) as StatoPin) : null;
  } catch {
    return null;
  }
}

function scrivi(s: StatoPin) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(s));
  } catch {
    // memoria locale non disponibile: lo stato vale solo finché il programma è aperto
  }
}

async function nuovoStato(pin: string): Promise<StatoPin> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await impronta(pin, salt), errori: 0, attese: 0, bloccatoFino: 0 };
}

/** Stato salvato; alla prima apertura crea quello con il PIN iniziale. */
async function carica(): Promise<StatoPin> {
  const s = leggi();
  if (s) return s;
  const nuovo = await nuovoStato(PIN_INIZIALE);
  scrivi(nuovo);
  return nuovo;
}

/** Fine dell'attesa in corso (ms), oppure null se si può inserire il PIN. */
export function attesaInCorso(): number | null {
  const s = leggi();
  return s && s.bloccatoFino > Date.now() ? s.bloccatoFino : null;
}

/** Controlla il PIN e aggiorna errori e attese. */
export async function verificaPin(pin: string): Promise<EsitoPin> {
  const s = await carica();
  if (s.bloccatoFino > Date.now()) return { tipo: "bloccato", fino: s.bloccatoFino };

  if ((await impronta(pin, s.salt)) === s.hash) {
    scrivi({ ...s, errori: 0, attese: 0, bloccatoFino: 0 });
    return { tipo: "ok" };
  }

  const errori = s.errori + 1;
  if (errori >= TENTATIVI_PIN) {
    const attese = s.attese + 1;
    const fino = Date.now() + durataAttesa(attese);
    scrivi({ ...s, errori: 0, attese, bloccatoFino: fino });
    return { tipo: "bloccato", fino };
  }
  scrivi({ ...s, errori, bloccatoFino: 0 });
  return { tipo: "errato", rimasti: TENTATIVI_PIN - errori };
}

/** Cambia il PIN (dalle Impostazioni, a programma sbloccato). Restituisce un messaggio d'errore o null. */
export async function cambiaPin(attuale: string, nuovo: string): Promise<string | null> {
  const s = await carica();
  if ((await impronta(attuale, s.salt)) !== s.hash) return "Il PIN attuale non è corretto.";
  if (!new RegExp(`^[0-9]{${LUNGHEZZA_PIN}}$`).test(nuovo)) return `Il nuovo PIN deve avere esattamente ${LUNGHEZZA_PIN} cifre.`;
  scrivi(await nuovoStato(nuovo));
  return null;
}

/** "4:59" a partire dai millisecondi rimasti. */
export function formatoAttesa(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
