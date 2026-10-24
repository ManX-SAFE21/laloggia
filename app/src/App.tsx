import { useCallback, useEffect, useRef, useState } from "react";
import { inTauri, StoreProvider, useStore, Vista } from "./store";
import { Icon, Modal } from "./components/ui";
import { Leaf, PinScreen } from "./screens/Lock";
import { Oggi } from "./screens/Oggi";
import { Clienti } from "./screens/Clienti";
import { ClienteScheda } from "./screens/ClienteScheda";
import { DietaEditor } from "./screens/DietaEditor";
import { Agenda } from "./screens/Agenda";
import { Alimenti } from "./screens/Alimenti";
import { Impostazioni } from "./screens/Impostazioni";
import { PianoEditor } from "./screens/PianoEditor";
import { ModelloEditor, Modelli } from "./screens/Modelli";

const INATTIVITA_MS = 10 * 60 * 1000; // 10 minuti

type Stato = "pin-avvio" | "sbloccato" | "pin";

export default function App() {
  const [stato, setStato] = useState<Stato>("pin-avvio");
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg((x) => (x === m ? null : x)), 2600);
  }, []);

  // Blocco per inattività: ogni movimento o tasto azzera il timer.
  useEffect(() => {
    if (stato !== "sbloccato") return;
    const reset = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setStato("pin"), INATTIVITA_MS);
    };
    const eventi = ["mousemove", "keydown", "mousedown", "wheel"];
    eventi.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => { eventi.forEach((e) => window.removeEventListener(e, reset)); window.clearTimeout(timer.current); };
  }, [stato]);

  // Lo store resta montato anche quando lo schermo è bloccato: nessun dato perso.
  return (
    <StoreProvider toast={toast} bloccaOra={() => setStato("pin")}>
      {stato === "pin-avvio" && <PinScreen motivo="avvio" onOk={() => setStato("sbloccato")} />}
      {stato === "pin" && <PinScreen motivo="inattivita" onOk={() => setStato("sbloccato")} />}
      <div style={{ display: stato === "sbloccato" ? "contents" : "none" }}><Shell /></div>
      <ConfermaChiusura />
      {msg && <div className="toast">{msg}</div>}
    </StoreProvider>
  );
}

const NAV: { key: Vista["nome"]; label: string; icon: keyof typeof Icon }[] = [
  { key: "oggi", label: "Oggi", icon: "home" },
  { key: "clienti", label: "Clienti", icon: "users" },
  { key: "agenda", label: "Agenda", icon: "calendar" },
  { key: "alimenti", label: "Alimenti", icon: "diet" },
  { key: "modelli", label: "Piani alimentari", icon: "file" },
];

function Shell() {
  const { vista, vai, backup, bloccaOra } = useStore();
  const sezione = vista.nome === "cliente" || vista.nome === "dieta" || vista.nome === "piano" ? "clienti" : vista.nome === "modello" ? "modelli" : vista.nome;
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Leaf /></div>
          <div className="brand-name">La Loggia</div>
          <div className="brand-sub">Benessere Naturale</div>
        </div>
        {NAV.map((n) => {
          const I = Icon[n.icon];
          return (
            <button key={n.key} className={"nav-btn" + (sezione === n.key ? " active" : "")} onClick={() => vai({ nome: n.key } as Vista)}>
              <I /> {n.label}
            </button>
          );
        })}
        <div className="sidebar-foot">
          <button className={"nav-btn" + (sezione === "impostazioni" ? " active" : "")} onClick={() => vai({ nome: "impostazioni" })}>
            <Icon.settings /> Impostazioni
          </button>
          {vista.nome !== "piano" && vista.nome !== "modello" && <AnnullaRipeti />}
          <IndicatoreSalvataggio />
          <div className="backup-pill">{backup.ok ? "✓" : "⚠"} Backup: <b>{backup.ultimo}</b></div>
          <button className="nav-btn" onClick={bloccaOra}><Icon.lock /> Blocca ora</button>
        </div>
      </aside>
      <main className="main">
        {!inTauri && <div className="demo-banner">Anteprima nel browser: dati di esempio, nessun salvataggio. Le modifiche si perdono ricaricando la pagina.</div>}
        {inTauri && <div className="demo-banner">Versione di prova: dati di esempio. Non inserire ancora dati veri (il backup automatico non c'è ancora).</div>}
        {vista.nome === "oggi" && <Oggi />}
        {vista.nome === "clienti" && <Clienti />}
        {vista.nome === "cliente" && <ClienteScheda key={vista.id + (vista.tab ?? "")} id={vista.id} tab={vista.tab} />}
        {vista.nome === "dieta" && <DietaEditor id={vista.id} />}
        {vista.nome === "piano" && <PianoEditor key={vista.id} id={vista.id} />}
        {vista.nome === "modelli" && <Modelli />}
        {vista.nome === "modello" && <ModelloEditor key={vista.id} id={vista.id} />}
        {vista.nome === "agenda" && <Agenda />}
        {vista.nome === "alimenti" && <Alimenti />}
        {vista.nome === "impostazioni" && <Impostazioni />}
      </main>
    </div>
  );
}

/** Sempre visibile: dice se l'ultima modifica è già nel database. */
function IndicatoreSalvataggio() {
  const { salvataggio: s, salvaOra } = useStore();
  if (s.stato === "browser") return <div className="salva-pill avviso" title="Nell'anteprima del browser non c'è il database">⚠ Anteprima: non salvato</div>;
  if (s.stato === "caricamento") return <div className="salva-pill">Apertura archivio…</div>;
  if (s.stato === "in-corso") return <div className="salva-pill">Salvataggio…</div>;
  if (s.stato === "errore")
    return (
      <div className="salva-pill errore" title={s.errore}>
        ⚠ Non salvato <button className="salva-riprova" onClick={() => void salvaOra()}>Riprova</button>
      </div>
    );
  return <div className="salva-pill ok" title={s.percorso}>✓ Salvato{s.ora ? ` alle ${s.ora}` : ""}</div>;
}

/** Cliccata la X della finestra: chiudere davvero? (selezionato «No, resta»: Invio o Esc lasciano aperto; per chiudere si clicca «Sì, chiudi») */
function ConfermaChiusura() {
  const { chiusura, confermaChiusura, salvataggio } = useStore();
  useEffect(() => {
    if (!chiusura) return;
    const tasti = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); confermaChiusura(false); }
    };
    window.addEventListener("keydown", tasti);
    return () => window.removeEventListener("keydown", tasti);
  }, [chiusura, confermaChiusura]);
  if (!chiusura) return null;
  return (
    <Modal title="Chiudere il programma?" onClose={() => confermaChiusura(false)}
      footer={<><button className="btn primary" autoFocus onClick={() => confermaChiusura(false)}>No, resta</button><button className="btn" onClick={() => confermaChiusura(true)}>Sì, chiudi</button></>}>
      <p style={{ margin: 0 }}>
        {salvataggio.stato === "errore"
          ? "Attenzione: l'ultima modifica non risulta salvata. Chiudendo, il programma riprova a salvarla."
          : "I dati sono già salvati: puoi chiudere tranquillamente."}
      </p>
    </Modal>
  );
}

/** Annulla / Ripeti di tutto il programma (ultime 20 modifiche). Nell'editor del piano ci sono i suoi. */
function AnnullaRipeti() {
  const { annulla, ripeti, passiAnnulla } = useStore();
  return (
    <div className="annulla-riga">
      <button className="annulla-btn" disabled={!passiAnnulla.indietro} onClick={annulla}
        title={`Annulla l'ultima modifica (Ctrl+Z) · ${passiAnnulla.indietro} disponibili`}>↶ Annulla</button>
      <button className="annulla-btn" disabled={!passiAnnulla.avanti} onClick={ripeti}
        title={`Rifai la modifica annullata (Ctrl+Y) · ${passiAnnulla.avanti} disponibili`}>↷ Ripeti</button>
    </div>
  );
}
