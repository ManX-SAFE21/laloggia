import { useCallback, useEffect, useRef, useState } from "react";
import { StoreProvider, useStore, Vista } from "./store";
import { Icon } from "./components/ui";
import { Leaf, PasswordScreen, PinScreen } from "./screens/Lock";
import { Oggi } from "./screens/Oggi";
import { Clienti } from "./screens/Clienti";
import { ClienteScheda } from "./screens/ClienteScheda";
import { DietaEditor } from "./screens/DietaEditor";
import { Agenda } from "./screens/Agenda";
import { Alimenti } from "./screens/Alimenti";
import { Impostazioni } from "./screens/Impostazioni";

const INATTIVITA_MS = 10 * 60 * 1000; // 10 minuti

type Stato = "password" | "sbloccato" | "pin" | "password-dopo-pin";

export default function App() {
  const [stato, setStato] = useState<Stato>("password");
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();

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
      {stato === "password" && <PasswordScreen onOk={() => setStato("sbloccato")} />}
      {stato === "password-dopo-pin" && <PasswordScreen motivo="Troppi PIN errati: inserisci la password" onOk={() => setStato("sbloccato")} />}
      {stato === "pin" && <PinScreen onOk={() => setStato("sbloccato")} onTroppiErrori={() => setStato("password-dopo-pin")} />}
      <div style={{ display: stato === "sbloccato" ? "contents" : "none" }}><Shell /></div>
      {msg && <div className="toast">{msg}</div>}
    </StoreProvider>
  );
}

const NAV: { key: Vista["nome"]; label: string; icon: keyof typeof Icon }[] = [
  { key: "oggi", label: "Oggi", icon: "home" },
  { key: "clienti", label: "Clienti", icon: "users" },
  { key: "agenda", label: "Agenda", icon: "calendar" },
  { key: "alimenti", label: "Alimenti", icon: "diet" },
  { key: "impostazioni", label: "Impostazioni", icon: "settings" },
];

function Shell() {
  const { vista, vai, backup, bloccaOra } = useStore();
  const sezione = vista.nome === "cliente" || vista.nome === "dieta" ? "clienti" : vista.nome;
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
          <div className="backup-pill">{backup.ok ? "✓" : "⚠"} Backup: <b>{backup.ultimo}</b></div>
          <button className="nav-btn" onClick={bloccaOra}><Icon.lock /> Blocca ora</button>
        </div>
      </aside>
      <main className="main">
        <div className="demo-banner">Mockup dimostrativo: dati inventati, nessun salvataggio reale. Le modifiche si perdono ricaricando la pagina.</div>
        {vista.nome === "oggi" && <Oggi />}
        {vista.nome === "clienti" && <Clienti />}
        {vista.nome === "cliente" && <ClienteScheda key={vista.id + (vista.tab ?? "")} id={vista.id} tab={vista.tab} />}
        {vista.nome === "dieta" && <DietaEditor id={vista.id} />}
        {vista.nome === "agenda" && <Agenda />}
        {vista.nome === "alimenti" && <Alimenti />}
        {vista.nome === "impostazioni" && <Impostazioni />}
      </main>
    </div>
  );
}
