import { useEffect, useState } from "react";
import { attesaInCorso, formatoAttesa, LUNGHEZZA_PIN, PIN_INIZIALE, TENTATIVI_PIN, verificaPin } from "../pin";

// Prova: nessuna cifratura del database. Sblocco solo con PIN (vedi src/pin.ts e punto 00b di CLAUDE.md).

function Brand() {
  return (
    <>
      <div className="brand-mark" style={{ margin: "0 auto 12px" }}><Leaf /></div>
      <h1>La Loggia</h1>
      <div className="muted" style={{ fontFamily: "var(--font-display)" }}>Benessere Naturale</div>
      <div className="small muted" style={{ marginTop: 4 }}>Versione {__APP_VERSION__}</div>
    </>
  );
}

export function Leaf() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21V11" /><path d="M12 13c-4 0-6-3-6-7 4 0 6 3 6 7z" /><path d="M12 11c0-4 2-7 6-7 0 4-2 7-6 7z" />
    </svg>
  );
}

/** Sblocco con PIN di 4 cifre, all'avvio e dopo il blocco. Dopo 6 errori si attende (5 min ×3, poi 30 min, poi 1 ora). */
export function PinScreen({ onOk, motivo }: { onOk: () => void; motivo: "avvio" | "inattivita" }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [controllo, setControllo] = useState(false);
  const [bloccatoFino, setBloccatoFino] = useState<number | null>(() => attesaInCorso());
  const [ora, setOra] = useState(() => Date.now());

  // Conto alla rovescia durante l'attesa.
  useEffect(() => {
    if (bloccatoFino === null) return;
    const t = window.setInterval(() => {
      const adesso = Date.now();
      setOra(adesso);
      if (adesso >= bloccatoFino) { setBloccatoFino(null); setErr(""); }
    }, 1000);
    return () => window.clearInterval(t);
  }, [bloccatoFino]);

  const bloccato = bloccatoFino !== null;

  const premi = (c: string) => {
    if (bloccato || controllo || pin.length >= LUNGHEZZA_PIN) return;
    const nuovo = pin + c;
    setPin(nuovo);
    setErr("");
    if (nuovo.length === LUNGHEZZA_PIN) {
      setControllo(true);
      verificaPin(nuovo).then((esito) => {
        setControllo(false);
        setPin("");
        if (esito.tipo === "ok") onOk();
        else if (esito.tipo === "bloccato") { setOra(Date.now()); setBloccatoFino(esito.fino); }
        else setErr(`PIN errato. Tentativi rimasti: ${esito.rimasti}`);
      });
    }
  };

  // Tastiera del PC: cifre (anche tastierino numerico), Backspace cancella l'ultima, Canc/Esc svuota tutto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); premi(e.key); }
      else if (e.key === "Backspace") { e.preventDefault(); setPin((p) => p.slice(0, -1)); }
      else if (e.key === "Delete" || e.key === "Escape") { e.preventDefault(); setPin(""); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="lock">
      <div className="card lock-card">
        <Brand />
        <p className="muted" style={{ marginTop: 14 }}>
          {motivo === "inattivita" ? <>Programma bloccato per inattività.<br />Inserisci il PIN per continuare.</> : "Inserisci il PIN"}
        </p>
        <div className="pin-dots">
          {Array.from({ length: LUNGHEZZA_PIN }, (_, i) => <div key={i} className={"pin-dot" + (i < pin.length ? " on" : "")} />)}
        </div>
        <div className="err">
          {bloccato
            ? <>Troppi PIN errati. Riprova tra <b>{formatoAttesa(bloccatoFino - ora)}</b></>
            : err}
        </div>
        <div className="pin-pad" style={bloccato ? { opacity: 0.4, pointerEvents: "none" } : undefined}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => <button key={n} className="pin-key" disabled={bloccato} onClick={() => premi(n)}>{n}</button>)}
          <button className="pin-key" style={{ fontSize: 13 }} disabled={bloccato} onClick={() => setPin("")}>Canc</button>
          <button className="pin-key" disabled={bloccato} onClick={() => premi("0")}>0</button>
          <button className="pin-key" style={{ fontSize: 13 }} disabled={bloccato} onClick={() => setPin(pin.slice(0, -1))}>⌫</button>
        </div>
        <div className="hint">
          PIN dimenticato? <a href="#" onClick={(e) => e.preventDefault()}>Usa la frase di recupero</a>
          <br /><br /><b>Demo:</b> PIN iniziale {PIN_INIZIALE}, si può cambiare in Impostazioni. Si digita anche con la tastiera.
          Dopo {TENTATIVI_PIN} errori si attende 5 minuti (le prime 3 volte), poi 30 minuti, poi 1 ora.
        </div>
      </div>
    </div>
  );
}
