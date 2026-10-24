import { useState } from "react";
import { useStore } from "../store";
import { Modal } from "../components/ui";
import { VERSIONE_INFORMATIVA } from "../data";
import { cambiaPin, LUNGHEZZA_PIN, TENTATIVI_PIN } from "../pin";

// Frase di recupero di ESEMPIO (non usata per nulla).
const FRASE_DEMO = ["salvia", "ponte", "lampada", "fiume", "ottobre", "cedro", "vela", "mattone", "giardino", "orbita", "latte", "faro"];

export function Impostazioni() {
  const { backup, setBackup, toast, impostazioni, setImpostazioni } = useStore();
  const [inCorso, setInCorso] = useState(false);
  const [frase, setFrase] = useState(false);
  const [ripristino, setRipristino] = useState(false);
  const [cambioPin, setCambioPin] = useState(false);

  const eseguiBackup = () => {
    setInCorso(true);
    setTimeout(() => {
      const ora = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
      setBackup({ ...backup, ultimo: `oggi alle ${ora}`, ok: true });
      setInCorso(false);
      toast(backup.discoCollegato ? "Backup completato e verificato (Dropbox + disco esterno)" : "Backup completato e verificato (Dropbox). Disco esterno non collegato.");
    }, 1400);
  };

  return (
    <div className="page">
      <div className="page-head"><div><h1>Impostazioni</h1><p>Backup, sicurezza e dati dello studio</p></div></div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-head"><h2>Backup</h2>{backup.ok ? <span className="badge ok">✓ Ultimo backup {backup.ultimo}</span> : <span className="badge danger">Backup non riuscito</span>}</div>
          <div className="card-pad grid" style={{ gap: 14 }}>
            <p className="small muted" style={{ margin: 0 }}>Il backup è automatico: alla chiusura del programma e una volta al giorno. Ogni copia è cifrata e viene verificata subito dopo.</p>
            <div className="field"><label>Cartella Dropbox</label>
              <div className="row"><input className="input" value={backup.dropbox} readOnly /><button className="btn sm" onClick={() => toast("Selezione cartella (simulata)")}>Cambia…</button></div>
            </div>
            <div className="field"><label>Disco esterno o chiavetta</label>
              <div className="row"><input className="input" value={backup.disco} readOnly /><button className="btn sm" onClick={() => toast("Selezione cartella (simulata)")}>Cambia…</button></div>
              <label className="row small" style={{ fontWeight: 400, color: "var(--ink-2)", marginTop: 4 }}>
                <input type="checkbox" checked={backup.discoCollegato} onChange={(e) => setBackup({ ...backup, discoCollegato: e.target.checked })} />
                Simula disco collegato
              </label>
              {!backup.discoCollegato && <span className="small" style={{ color: "var(--warn)" }}>Disco non collegato: la copia verrà fatta appena lo colleghi.</span>}
            </div>
            <div className="field"><label>Copie conservate</label>
              <div className="small">Ultimi <b>7</b> giorni · <b>4</b> settimane · <b>12</b> mesi</div>
            </div>
            <div className="row">
              <button className="btn primary" disabled={inCorso} onClick={eseguiBackup}>{inCorso ? "Backup in corso…" : "Esegui backup ora"}</button>
              <button className="btn" onClick={() => setRipristino(true)}>Ripristina da backup…</button>
            </div>
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <div className="card-head"><h2>Sicurezza</h2></div>
            <div className="card-pad">
              <dl className="kv">
                <dt>Archivio</dt><dd>Cifrato (AES-256)</dd>
                <dt>All'avvio</dt><dd>PIN di {LUNGHEZZA_PIN} cifre</dd>
                <dt>Blocco automatico</dt><dd>Dopo 10 minuti di inattività</dd>
                <dt>Sblocco</dt><dd>Stesso PIN di {LUNGHEZZA_PIN} cifre</dd>
                <dt>Dopo {TENTATIVI_PIN} PIN errati</dt><dd>Attesa di 5 minuti (le prime 3 volte), poi 30 minuti, poi 1 ora</dd>
              </dl>
              <div className="row" style={{ marginTop: 16, flexWrap: "wrap" }}>
                <button className="btn" onClick={() => setCambioPin(true)}>Cambia PIN</button>
                <button className="btn" onClick={() => setFrase(true)}>Frase di recupero</button>
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <h2 style={{ marginBottom: 12 }}>Studio</h2>
            <dl className="kv">
              <dt>Nome</dt><dd>La Loggia · Benessere Naturale</dd>
              <dt>Sede</dt><dd>Malo (VI)</dd>
              <dt>Informativa privacy</dt><dd>{VERSIONE_INFORMATIVA}</dd>
              <dt>Versione programma</dt><dd>{__APP_VERSION__}</dd>
            </dl>
            <p className="small muted" style={{ marginBottom: 0 }}>Intestazione usata nelle stampe delle diete. Fatturazione: da definire.</p>
          </div>
          <div className="card card-pad">
            <h2 style={{ marginBottom: 12 }}>Clienti</h2>
            <div className="field" style={{ marginBottom: 6 }}>
              <label htmlFor="mesi-richiamo">Da richiamare dopo</label>
              <select id="mesi-richiamo" className="select" style={{ width: 160 }} value={impostazioni.mesiRichiamo}
                onChange={(e) => { const mesiRichiamo = Number(e.target.value); setImpostazioni((i) => ({ ...i, mesiRichiamo })); toast(`Da richiamare: dopo ${mesiRichiamo} ${mesiRichiamo === 1 ? "mese" : "mesi"} senza visite`); }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m} {m === 1 ? "mese" : "mesi"}</option>)}
              </select>
            </div>
            <p className="small muted" style={{ margin: 0 }}>Nella lista clienti, il filtro «Da richiamare» mostra i clienti attivi senza appuntamento in agenda e con l'ultima visita più vecchia di così.</p>
          </div>
        </div>
      </div>

      {frase && (
        <Modal title="Frase di recupero" onClose={() => setFrase(false)}>
          <p className="small muted" style={{ marginTop: 0 }}>Serve se dimentichi la password e per ripristinare i backup su un altro PC. Va stampata e conservata in un posto sicuro, lontano dal computer.</p>
          <div className="recovery">{FRASE_DEMO.map((w, i) => <span key={i}><i>{i + 1}</i>{w}</span>)}</div>
          <p className="small" style={{ color: "var(--warn)" }}>Esempio dimostrativo: nel programma vero la frase viene generata alla prima configurazione e mostrata una sola volta.</p>
        </Modal>
      )}
      {cambioPin && <CambiaPin onClose={() => setCambioPin(false)} onFatto={() => { setCambioPin(false); toast("PIN cambiato"); }} />}
      {ripristino && (
        <Modal title="Ripristina da backup" onClose={() => setRipristino(false)}
          footer={<><button className="btn" onClick={() => setRipristino(false)}>Annulla</button><button className="btn primary" onClick={() => { setRipristino(false); toast("Ripristino simulato: nessun dato modificato"); }}>Ripristina</button></>}>
          <div className="field"><label>Scegli la copia</label>
            <select className="select">
              <option>Ieri, 19:02 — Dropbox</option><option>18/10/2026, 18:47 — Dropbox</option><option>17/10/2026, 19:10 — Disco esterno</option><option>Settembre 2026 (mensile) — Dropbox</option>
            </select>
          </div>
          <p className="small muted">Prima del ripristino viene salvata una copia dello stato attuale, così si può sempre tornare indietro.</p>
        </Modal>
      )}
    </div>
  );
}

function CambiaPin({ onClose, onFatto }: { onClose: () => void; onFatto: () => void }) {
  const [attuale, setAttuale] = useState("");
  const [nuovo, setNuovo] = useState("");
  const [conferma, setConferma] = useState("");
  const [err, setErr] = useState("");
  const [inCorso, setInCorso] = useState(false);

  const soloCifre = (v: string) => v.replace(/[^0-9]/g, "").slice(0, LUNGHEZZA_PIN);

  const salva = async () => {
    if (nuovo.length !== LUNGHEZZA_PIN) { setErr(`Il nuovo PIN deve avere esattamente ${LUNGHEZZA_PIN} cifre.`); return; }
    if (nuovo !== conferma) { setErr("Il nuovo PIN e la conferma non coincidono."); return; }
    setInCorso(true);
    const errore = await cambiaPin(attuale, nuovo);
    setInCorso(false);
    if (errore) setErr(errore);
    else onFatto();
  };

  const campo = (id: string, label: string, valore: string, set: (v: string) => void, autoFocus = false) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" type="password" inputMode="numeric" autoComplete="off" autoFocus={autoFocus}
        value={valore} onChange={(e) => { set(soloCifre(e.target.value)); setErr(""); }}
        onKeyDown={(e) => e.key === "Enter" && salva()} />
    </div>
  );

  return (
    <Modal title="Cambia PIN" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annulla</button><button className="btn primary" disabled={inCorso} onClick={salva}>Salva PIN</button></>}>
      {campo("pin-attuale", "PIN attuale", attuale, setAttuale, true)}
      {campo("pin-nuovo", `Nuovo PIN (${LUNGHEZZA_PIN} cifre)`, nuovo, setNuovo)}
      {campo("pin-conferma", "Conferma nuovo PIN", conferma, setConferma)}
      <div className="err">{err}</div>
      <p className="small muted" style={{ marginBottom: 0 }}>Il PIN serve all'avvio e dopo il blocco per inattività. Se lo dimentichi, al momento non c'è un modo per recuperarlo.</p>
    </Modal>
  );
}
