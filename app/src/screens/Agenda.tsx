import { useState } from "react";
import { OGGI, nuovoId } from "../data";
import { useStore } from "../store";
import { Icon, Modal } from "../components/ui";
import { Appuntamento } from "../types";

const ORA_INIZIO = 8, ORA_FINE = 19, H = 52; // px per ora

// settimana di esempio fissa: lun 19 – sab 24 ottobre 2026
const SETTIMANE = [
  { label: "12 – 17 ottobre 2026", giorni: ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"] },
  { label: "19 – 24 ottobre 2026", giorni: ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"] },
  { label: "26 – 31 ottobre 2026", giorni: ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"] },
];
const NOMI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export function Agenda() {
  const { appuntamenti, setAppuntamenti, clienti, vai, toast } = useStore();
  const [sett, setSett] = useState(1);
  const [nuovo, setNuovo] = useState<{ data: string; ora: string } | null>(null);
  const [sel, setSel] = useState<Appuntamento | null>(null);
  const giorni = SETTIMANE[sett].giorni;
  const ore = Array.from({ length: ORA_FINE - ORA_INIZIO }, (_, i) => ORA_INIZIO + i);
  const cliente = (id: string) => clienti.find((c) => c.id === id);

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Agenda</h1><p>{SETTIMANE[sett].label}</p></div>
        <div className="row">
          <button className="btn tenue-salvia" disabled={sett === 0} onClick={() => setSett(sett - 1)}><Icon.sinistra /></button>
          <button className="btn tenue-salvia" onClick={() => setSett(1)}><Icon.calendar /> Oggi</button>
          <button className="btn tenue-salvia" disabled={sett === SETTIMANE.length - 1} onClick={() => setSett(sett + 1)}><Icon.destra /></button>
          <button className="btn primary" onClick={() => setNuovo({ data: OGGI, ora: "09:00" })}><Icon.plus /> Nuovo appuntamento</button>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div className="agenda">
          <div className="ag-head" />
          {giorni.map((g, i) => <div key={g} className={"ag-head" + (g === OGGI ? " today" : "")}>{NOMI[i]} {Number(g.slice(8))}</div>)}
          <div>{ore.map((h) => <div key={h} className="ag-hour">{h}:00</div>)}</div>
          {giorni.map((g) => (
            <div key={g} className={"ag-col" + (g === OGGI ? " today" : "")}>
              {ore.map((h) => <div key={h} className="ag-slot" title="Clic per nuovo appuntamento" onClick={() => setNuovo({ data: g, ora: `${String(h).padStart(2, "0")}:00` })} />)}
              {appuntamenti.filter((a) => a.data === g).map((a) => {
                const [hh, mm] = a.ora.split(":").map(Number);
                const top = (hh - ORA_INIZIO + mm / 60) * H;
                const c = cliente(a.clienteId);
                return (
                  <div key={a.id} className={"ag-evt " + a.tipo.split(" ")[0]} style={{ top: top + 1, height: (a.durata / 60) * H - 3 }} onClick={() => setSel(a)}>
                    <b>{a.ora} {c ? `${c.nome} ${c.cognome}` : "?"}</b>{a.tipo}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="small muted">Promemoria ai clienti (email, SMS o WhatsApp) e sincronizzazione con Google Calendar: da decidere.</p>

      {nuovo && (
        <NuovoAppuntamento iniziale={nuovo} onClose={() => setNuovo(null)}
          onSave={(a) => { setAppuntamenti((l) => [...l, a]); setNuovo(null); toast("Appuntamento salvato"); }} />
      )}
      {sel && (() => {
        const c = cliente(sel.clienteId);
        return (
          <Modal title={c ? `${c.nome} ${c.cognome}` : "Appuntamento"} onClose={() => setSel(null)}
            footer={<>
              <button className="btn danger" onClick={() => { setAppuntamenti((l) => l.filter((x) => x.id !== sel.id)); setSel(null); toast("Appuntamento eliminato"); }}><Icon.cestino /> Elimina</button>
              <span className="spacer" />
              <button className="btn tenue-salvia" onClick={() => setSel(null)}><Icon.x /> Chiudi</button>
              {c && <button className="btn primary" onClick={() => vai({ nome: "cliente", id: c.id })}><Icon.users /> Apri scheda</button>}
            </>}>
            <dl className="kv">
              <dt>Data</dt><dd>{sel.data.split("-").reverse().join("/")} alle {sel.ora}</dd>
              <dt>Durata</dt><dd>{sel.durata} minuti</dd>
              <dt>Tipo</dt><dd>{sel.tipo}</dd>
            </dl>
          </Modal>
        );
      })()}
    </div>
  );
}

function NuovoAppuntamento({ iniziale, onClose, onSave }: { iniziale: { data: string; ora: string }; onClose: () => void; onSave: (a: Appuntamento) => void }) {
  const { clienti } = useStore();
  const attivi = clienti.filter((c) => c.attivo).sort((a, b) => a.cognome.localeCompare(b.cognome));
  const [f, setF] = useState({ clienteId: attivi[0]?.id ?? "", data: iniziale.data, ora: iniziale.ora, durata: "45", tipo: "Controllo" as Appuntamento["tipo"] });
  return (
    <Modal title="Nuovo appuntamento" onClose={onClose}
      footer={<><button className="btn tenue-sabbia" onClick={onClose}><Icon.x /> Annulla</button><button className="btn primary" onClick={() => onSave({ id: nuovoId("ap"), clienteId: f.clienteId, data: f.data, ora: f.ora, durata: Number(f.durata), tipo: f.tipo })}><Icon.salva /> Salva</button></>}>
      <div className="grid g2">
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Cliente</label>
          <select className="select" value={f.clienteId} onChange={(e) => setF({ ...f, clienteId: e.target.value })}>
            {attivi.map((c) => <option key={c.id} value={c.id}>{c.cognome} {c.nome}</option>)}
          </select>
        </div>
        <div className="field"><label>Data</label><input className="input" type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
        <div className="field"><label>Ora</label><input className="input" type="time" step={900} value={f.ora} onChange={(e) => setF({ ...f, ora: e.target.value })} /></div>
        <div className="field"><label>Durata</label>
          <select className="select" value={f.durata} onChange={(e) => setF({ ...f, durata: e.target.value })}>
            <option value="30">30 minuti</option><option value="45">45 minuti</option><option value="60">60 minuti</option>
          </select>
        </div>
        <div className="field"><label>Tipo</label>
          <select className="select" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as Appuntamento["tipo"] })}>
            <option>Prima visita</option><option>Controllo</option><option>Online</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
