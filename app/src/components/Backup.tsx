// Impostazioni → Backup: cartella del disco esterno (copia in chiaro), cartella di Dropbox (copia .7z cifrata),
// password del cloud, «Esegui backup ora» e «Ripristina da backup…». Il lavoro lo fa src-tauri/src/backup.rs.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { inTauri, useStore } from "../store";
import { Icon, Modal } from "./ui";
import { EsitoDestinazione, mb, momentoAdesso, quandoLeggibile, riassuntoBackup } from "../backup";
import { apriStampa } from "../stampa";

async function comando<T>(nome: string, argomenti?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(nome, argomenti);
}

async function scegliCartella(titolo: string): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const r = await open({ directory: true, title: titolo });
  return typeof r === "string" ? r : null;
}

export function RiquadroBackup() {
  const { backup, backupInCorso, eseguiBackup, aggiornaStatoBackup, impostazioni, setImpostazioni, toast } = useStore();
  const [collegato, setCollegato] = useState<boolean | null>(null);
  const [password, setPassword] = useState<string | null>(null); // mostrata nella finestra
  const [ripristino, setRipristino] = useState(false);
  const riassunto = riassuntoBackup(backup, impostazioni, backupInCorso);

  useEffect(() => { void aggiornaStatoBackup(); }, [aggiornaStatoBackup]);
  useEffect(() => {
    if (!inTauri || !impostazioni.cartellaDisco) { setCollegato(null); return; }
    void comando<boolean>("cartella_esiste", { percorso: impostazioni.cartellaDisco }).then(setCollegato);
  }, [impostazioni.cartellaDisco, backup]);

  const imposta = async (chiave: "cartellaDisco" | "cartellaCloud", titolo: string) => {
    const c = await scegliCartella(titolo);
    if (c) setImpostazioni((i) => ({ ...i, [chiave]: c }));
  };
  const mostraPassword = async (crea: boolean) => {
    const p = await comando<string | null>("backup_password", { crea });
    setPassword(p);
    void aggiornaStatoBackup();
  };
  const oraSubito = async () => {
    const s = await eseguiBackup();
    if (!s) return;
    const problemi = [s.disco?.esito === "errore" && `disco: ${s.disco.messaggio}`, s.cloud?.esito === "errore" && `cloud: ${s.cloud.messaggio}`].filter(Boolean);
    toast(problemi.length ? `Backup con problemi — ${problemi.join(" · ")}` : s.disco?.esito === "non-collegato" ? "Backup fatto sul cloud. Disco esterno non collegato: la copia si farà appena lo colleghi." : "Backup fatto e controllato ✓");
  };

  if (!inTauri) {
    return (
      <div className="card card-pad">
        <h2 style={{ marginBottom: 8 }}>Backup</h2>
        <p className="small muted" style={{ margin: 0 }}>Nell'anteprima del browser non c'è l'archivio: i backup si fanno solo nel programma.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head"><h2>Backup</h2><span className={"badge " + (riassunto.ok ? "ok" : "warn")}>{riassunto.ok ? "✓" : "⚠"} {riassunto.testo}</span></div>
      <div className="card-pad grid" style={{ gap: 14 }}>
        <p className="small muted" style={{ margin: 0 }}>Automatico: alla chiusura del programma e una volta al giorno; sul disco esterno appena lo colleghi. Ogni copia viene controllata subito dopo.</p>

        <Destinazione titolo="Disco esterno — copia in chiaro" cartella={impostazioni.cartellaDisco} esito={backup.disco} ultimoOk={backup.discoUltimoOk}
          nota={collegato === false ? "Disco non collegato: la copia si farà appena lo colleghi." : "Il disco va tenuto sotto chiave: la copia non è cifrata."}
          onScegli={() => void imposta("cartellaDisco", "Cartella del disco esterno per i backup")}
          onTogli={() => setImpostazioni((i) => ({ ...i, cartellaDisco: "" }))} />

        <Destinazione titolo="Cloud (cartella di Dropbox) — copia cifrata .7z" cartella={impostazioni.cartellaCloud} esito={backup.cloud} ultimoOk={backup.cloudUltimoOk}
          nota={!backup.setteZip ? "⚠ 7-Zip non è installato: serve per la copia cifrata (gratuito, www.7-zip.org)." : "Cifrata con 7-Zip (AES-256, anche i nomi dei file): Dropbox non può leggerla."}
          onScegli={() => void imposta("cartellaCloud", "Cartella di Dropbox per i backup cifrati")}
          onTogli={() => setImpostazioni((i) => ({ ...i, cartellaCloud: "" }))}>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {backup.passwordPresente
              ? <button className="btn sm tenue-salvia" onClick={() => void mostraPassword(false)}><Icon.occhio /> Mostra / stampa la password</button>
              : <button className="btn sm primary" onClick={() => void mostraPassword(true)}><Icon.lock /> Crea la password del backup</button>}
          </div>
        </Destinazione>

        <div className="small">Copie conservate su ogni destinazione: ultimi <b>7</b> giorni · <b>4</b> settimane · <b>12</b> mesi</div>
        <div className="row">
          <button className="btn primary" disabled={backupInCorso || (!impostazioni.cartellaDisco && !impostazioni.cartellaCloud)} onClick={() => void oraSubito()}>
            <Icon.salva /> {backupInCorso ? "Backup in corso…" : "Esegui backup ora"}
          </button>
          <button className="btn tenue-cielo" onClick={() => setRipristino(true)}><Icon.ripristina /> Ripristina da backup…</button>
        </div>
      </div>
      {password && <FinestraPassword password={password} onClose={() => setPassword(null)} />}
      {ripristino && <Ripristino onClose={() => setRipristino(false)} />}
    </div>
  );
}

function Destinazione({ titolo, cartella, esito, ultimoOk, nota, onScegli, onTogli, children }: {
  titolo: string; cartella: string; esito?: EsitoDestinazione; ultimoOk?: string; nota: string;
  onScegli: () => void; onTogli: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="dest-backup">
      <h3>{titolo}</h3>
      <div className="row" style={{ gap: 8 }}>
        <input className="input" readOnly value={cartella} placeholder="non impostata" />
        <button className="btn sm" onClick={onScegli}><Icon.cartella /> Scegli cartella…</button>
        {cartella && <button className="btn sm tenue-sabbia" onClick={onTogli}><Icon.x /> Togli</button>}
      </div>
      {cartella && (
        <div className={"dest-stato " + (esito?.esito === "errore" ? "errore" : ultimoOk ? "ok" : "")}>
          {esito?.esito === "errore" ? `⚠ Ultimo tentativo non riuscito: ${esito.messaggio}` : ultimoOk ? `✓ Ultimo backup ${quandoLeggibile(ultimoOk)}` : "Nessun backup ancora"}
          {esito?.copie ? ` · ${esito.copie} copie, ${mb(esito.byteTotali)}` : ""}
        </div>
      )}
      <div className="small muted">{nota}</div>
      {children}
    </div>
  );
}

function FinestraPassword({ password, onClose }: { password: string; onClose: () => void }) {
  return createPortal(
    <Modal title="Password dei backup cifrati" onClose={onClose}
      footer={<><button className="btn" onClick={() => void apriStampa({ tipo: "password", id: "", titolo: "Password dei backup" })}><Icon.print /> Stampa il foglio</button><button className="btn primary" onClick={onClose}><Icon.salva /> Fatto</button></>}>
      <p style={{ marginTop: 0 }}>Serve per aprire i backup del cloud, anche senza il programma (con 7-Zip). Stampa il foglio e conservalo lontano dal computer.</p>
      <div className="password-grande">{password}</div>
      <p className="small muted" style={{ marginBottom: 0 }}>Il programma la tiene su questo PC per fare i backup da solo. Non cambia mai: le copie vecchie si aprono con la stessa.</p>
    </Modal>,
    document.body,
  );
}

function Ripristino({ onClose }: { onClose: () => void }) {
  const { impostazioni, toast, salvaOra } = useStore();
  const [file, setFile] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState("");
  const cifrato = !!file?.toLowerCase().endsWith(".7z");

  const scegli = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const r = await open({ title: "Scegli il backup da ripristinare", defaultPath: impostazioni.cartellaCloud || impostazioni.cartellaDisco || undefined,
      filters: [{ name: "Backup La Loggia", extensions: ["7z", "db"] }] });
    if (typeof r === "string") { setFile(r); setErrore(""); }
  };
  const ripristina = async () => {
    if (!file) return;
    setInCorso(true);
    setErrore("");
    try {
      await salvaOra();
      const r = await comando<{ clienti: number }>("backup_ripristina", { file, password: password || null, momento: momentoAdesso() });
      toast(`Backup ripristinato (${r.clienti} clienti). Il programma si ricarica…`);
      window.setTimeout(() => location.reload(), 1500);
    } catch (e) {
      setErrore(String(e));
      setInCorso(false);
    }
  };

  return createPortal(
    <Modal title="Ripristina da backup" onClose={inCorso ? () => {} : onClose}
      footer={<><button className="btn tenue-sabbia" disabled={inCorso} onClick={onClose}><Icon.x /> Annulla</button>
        <button className="btn tenue-cielo" disabled={!file || inCorso} onClick={() => void ripristina()}><Icon.ripristina /> {inCorso ? "Ripristino in corso…" : "Ripristina"}</button></>}>
      <div className="field">
        <label>Copia da ripristinare</label>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" readOnly value={file ?? ""} placeholder="nessun file scelto" />
          <button className="btn sm" onClick={() => void scegli()}><Icon.cartella /> Scegli…</button>
        </div>
      </div>
      {cifrato && (
        <div className="field">
          <label>Password del backup</label>
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="lascia vuoto per usare quella salvata su questo PC" />
        </div>
      )}
      {errore && <p className="err">{errore}</p>}
      <p className="small muted" style={{ marginBottom: 0 }}>L'archivio attuale viene sostituito dalla copia scelta. Prima il programma salva lo stato attuale in una copia di sicurezza nella cartella dei dati, così si può sempre tornare indietro.</p>
    </Modal>,
    document.body,
  );
}
