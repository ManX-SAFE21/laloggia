import { useMemo, useState } from "react";
import { OGGI, eta, fmtData, nuovoId } from "../data";
import { useStore } from "../store";
import { Icon, Modal, iniziali } from "../components/ui";
import { Cliente } from "../types";

export function Clienti() {
  const { clienti, setClienti, appuntamenti, vai, toast } = useStore();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"attivi" | "tutti">("attivi");
  const [nuovo, setNuovo] = useState(false);

  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return clienti
      .filter((c) => filtro === "tutti" || c.attivo)
      .filter((c) => !s || `${c.nome} ${c.cognome} ${c.email} ${c.telefono}`.toLowerCase().includes(s))
      .sort((a, b) => a.cognome.localeCompare(b.cognome));
  }, [clienti, q, filtro]);

  const prossimo = (id: string) =>
    appuntamenti.filter((a) => a.clienteId === id && a.data >= OGGI).sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora))[0];

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Clienti</h1><p>{lista.length} clienti</p></div>
        <button className="btn primary" onClick={() => setNuovo(true)}><Icon.plus /> Nuovo cliente</button>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <input className="input" style={{ maxWidth: 360 }} placeholder="Cerca per nome, email o telefono…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" style={{ width: 160 }} value={filtro} onChange={(e) => setFiltro(e.target.value as "attivi" | "tutti")}>
          <option value="attivi">Solo attivi</option>
          <option value="tutti">Tutti (anche archiviati)</option>
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Cliente</th><th>Età</th><th>Ultimo peso</th><th>Ultima visita</th><th>Prossimo appuntamento</th><th>Privacy</th></tr>
          </thead>
          <tbody>
            {lista.map((c) => {
              const ult = c.visite[c.visite.length - 1];
              const p = prossimo(c.id);
              return (
                <tr key={c.id} className="click" onClick={() => vai({ nome: "cliente", id: c.id })}>
                  <td>
                    <div className="row"><div className="avatar">{iniziali(c.nome, c.cognome)}</div>
                      <div><div style={{ fontWeight: 600 }}>{c.cognome} {c.nome}</div><div className="small muted">{c.obiettivo}</div></div>
                    </div>
                  </td>
                  <td className="num">{eta(c.dataNascita)}</td>
                  <td className="num">{ult ? `${ult.peso.toFixed(1)} kg` : "—"}</td>
                  <td className="num">{ult ? fmtData(ult.data) : "—"}</td>
                  <td className="num">{p ? `${fmtData(p.data)} ${p.ora}` : <span className="muted">—</span>}</td>
                  <td>{c.consenso.firmato ? <span className="badge ok">Firmato</span> : <span className="badge warn">Da firmare</span>}{!c.attivo && <span className="badge" style={{ marginLeft: 4 }}>Archiviato</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lista.length === 0 && <div className="empty">Nessun cliente trovato</div>}
      </div>

      {nuovo && <NuovoCliente onClose={() => setNuovo(false)} onSave={(c) => { setClienti((l) => [...l, c]); setNuovo(false); toast("Cliente creato"); vai({ nome: "cliente", id: c.id }); }} />}
    </div>
  );
}

function NuovoCliente({ onClose, onSave }: { onClose: () => void; onSave: (c: Cliente) => void }) {
  const [f, setF] = useState({ nome: "", cognome: "", sesso: "F", dataNascita: "1990-01-01", telefono: "", email: "", altezza: "165", obiettivo: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const valido = f.nome.trim() && f.cognome.trim();
  const salva = () => onSave({
    id: nuovoId("c"), nome: f.nome.trim(), cognome: f.cognome.trim(), sesso: f.sesso as "F" | "M", dataNascita: f.dataNascita,
    telefono: f.telefono, email: f.email, altezza: Number(f.altezza) || 165, obiettivo: f.obiettivo || "Da definire",
    anamnesi: { patologie: "", farmaci: "", allergieIntolleranze: "", attivitaFisica: "", abitudini: "" },
    visite: [], allegati: [], consenso: { firmato: false }, attivo: true,
  });
  return (
    <Modal title="Nuovo cliente" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annulla</button><button className="btn primary" disabled={!valido} onClick={salva}>Crea cliente</button></>}>
      <div className="grid g2">
        <div className="field"><label>Nome</label><input className="input" autoFocus value={f.nome} onChange={set("nome")} /></div>
        <div className="field"><label>Cognome</label><input className="input" value={f.cognome} onChange={set("cognome")} /></div>
        <div className="field"><label>Sesso</label><select className="select" value={f.sesso} onChange={set("sesso")}><option value="F">Femmina</option><option value="M">Maschio</option></select></div>
        <div className="field"><label>Data di nascita</label><input className="input" type="date" value={f.dataNascita} onChange={set("dataNascita")} /></div>
        <div className="field"><label>Telefono</label><input className="input" value={f.telefono} onChange={set("telefono")} /></div>
        <div className="field"><label>Email</label><input className="input" value={f.email} onChange={set("email")} /></div>
        <div className="field"><label>Altezza (cm)</label><input className="input" type="number" value={f.altezza} onChange={set("altezza")} /></div>
        <div className="field"><label>Obiettivo</label><input className="input" value={f.obiettivo} onChange={set("obiettivo")} /></div>
      </div>
    </Modal>
  );
}
