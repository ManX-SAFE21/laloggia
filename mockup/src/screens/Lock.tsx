import { useEffect, useState } from "react";
import { Icon } from "../components/ui";

// Mockup: nessuna cifratura reale.
// Nel programma vero la password deriva (Argon2id) la chiave del database SQLCipher.
export const PIN_DEMO = "123456";
const MAX_TENTATIVI_PIN = 6;

function Brand() {
  return (
    <>
      <div className="brand-mark" style={{ margin: "0 auto 12px" }}><Leaf /></div>
      <h1>La Loggia</h1>
      <div className="muted" style={{ fontFamily: "var(--font-display)" }}>Benessere Naturale</div>
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

/** Schermata all'avvio: password completa. */
export function PasswordScreen({ onOk, motivo }: { onOk: () => void; motivo?: string }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    if (pw.length < 10) { setErr("La password deve avere almeno 10 caratteri."); return; }
    onOk();
  };
  return (
    <div className="lock">
      <div className="card lock-card">
        <Brand />
        {motivo && <div className="badge warn" style={{ marginTop: 16 }}>{motivo}</div>}
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" className="input" type="password" autoFocus value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
        <div className="err">{err}</div>
        <button className="btn primary" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} onClick={submit}>
          <Icon.lock /> Apri archivio
        </button>
        <div className="hint">
          Password dimenticata? <a href="#" onClick={(e) => e.preventDefault()}>Usa la frase di recupero</a>
          <br /><br /><b>Demo:</b> qualsiasi password di almeno 10 caratteri.
        </div>
      </div>
    </div>
  );
}

/** Blocco per inattività: PIN di 6 cifre. Dopo 6 errori serve la password. */
export function PinScreen({ onOk, onTroppiErrori }: { onOk: () => void; onTroppiErrori: () => void }) {
  const [pin, setPin] = useState("");
  const [errori, setErrori] = useState(0);
  const [err, setErr] = useState("");

  const premi = (c: string) => {
    if (pin.length >= 6) return;
    const nuovo = pin + c;
    setPin(nuovo);
    setErr("");
    if (nuovo.length === 6) {
      setTimeout(() => {
        if (nuovo === PIN_DEMO) { onOk(); return; }
        const e = errori + 1;
        setErrori(e);
        setPin("");
        if (e >= MAX_TENTATIVI_PIN) onTroppiErrori();
        else setErr(`PIN errato. Tentativi rimasti: ${MAX_TENTATIVI_PIN - e}`);
      }, 150);
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
        <p className="muted" style={{ marginTop: 14 }}>Programma bloccato per inattività.<br />Inserisci il PIN per continuare.</p>
        <div className="pin-dots">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={"pin-dot" + (i < pin.length ? " on" : "")} />)}
        </div>
        <div className="err">{err}</div>
        <div className="pin-pad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => <button key={n} className="pin-key" onClick={() => premi(n)}>{n}</button>)}
          <button className="pin-key" style={{ fontSize: 13 }} onClick={() => setPin("")}>Canc</button>
          <button className="pin-key" onClick={() => premi("0")}>0</button>
          <button className="pin-key" style={{ fontSize: 13 }} onClick={() => setPin(pin.slice(0, -1))}>⌫</button>
        </div>
        <div className="hint"><b>Demo:</b> il PIN è {PIN_DEMO}, puoi digitarlo anche con la tastiera. Dopo 6 errori viene chiesta la password.</div>
      </div>
    </div>
  );
}
