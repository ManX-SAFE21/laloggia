import { OGGI, fmtData } from "../data";
import { riassuntoBackup } from "../backup";
import { useStore } from "../store";
import { iniziali } from "../components/ui";

export function Oggi() {
  const { clienti, appuntamenti, vai, backup, backupInCorso, impostazioni } = useStore();
  const statoBackup = riassuntoBackup(backup, impostazioni, backupInCorso);
  const diOggi = appuntamenti.filter((a) => a.data === OGGI).sort((a, b) => a.ora.localeCompare(b.ora));
  const prossimi = appuntamenti.filter((a) => a.data > OGGI).sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora)).slice(0, 4);
  const senzaConsenso = clienti.filter((c) => c.attivo && !c.consenso.firmato);
  const attivi = clienti.filter((c) => c.attivo).length;
  const cliente = (id: string) => clienti.find((c) => c.id === id)!;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Buongiorno</h1>
          <p>Martedì 20 ottobre 2026 · {diOggi.length} visite in programma oggi</p>
        </div>
        <button className="btn primary" onClick={() => vai({ nome: "agenda" })}>Apri agenda</button>
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="card stat"><div className="stat-label">Clienti attivi</div><div className="stat-value">{attivi}</div></div>
        <div className="card stat"><div className="stat-label">Visite questa settimana</div><div className="stat-value">{appuntamenti.filter((a) => a.data >= "2026-10-19" && a.data <= "2026-10-24").length}</div></div>
        <div className="card stat"><div className="stat-label">Consensi privacy mancanti</div><div className="stat-value" style={{ color: senzaConsenso.length ? "var(--warn)" : undefined }}>{senzaConsenso.length}</div></div>
        <div className="card stat">
          <div className="stat-label">Ultimo backup</div>
          <div className="stat-value" style={{ fontSize: 17, marginTop: 6 }}>{statoBackup.ok ? "✓ " : "⚠ "}{statoBackup.testo}</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <div className="card-head"><h2>Visite di oggi</h2></div>
          {diOggi.length === 0 && <div className="empty">Nessuna visita oggi</div>}
          <table className="table">
            <tbody>
              {diOggi.map((a) => {
                const c = cliente(a.clienteId);
                return (
                  <tr key={a.id} className="click" onClick={() => vai({ nome: "cliente", id: c.id })}>
                    <td className="num" style={{ width: 70, fontWeight: 600 }}>{a.ora}</td>
                    <td>
                      <div className="row"><div className="avatar">{iniziali(c.nome, c.cognome)}</div>
                        <div><div>{c.nome} {c.cognome}</div><div className="small muted">{c.obiettivo}</div></div>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}><span className={"badge" + (a.tipo === "Online" ? "" : " accent")}>{a.tipo}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid" style={{ alignContent: "start" }}>
          {senzaConsenso.length > 0 && (
            <div className="card card-pad" style={{ borderColor: "#f1dcb5", background: "var(--warn-bg)" }}>
              <h3>Consenso privacy da raccogliere</h3>
              <p className="small muted" style={{ margin: "4px 0 10px" }}>Questi clienti non hanno ancora un consenso registrato.</p>
              {senzaConsenso.map((c) => (
                <button key={c.id} className="btn sm" style={{ marginRight: 6 }} onClick={() => vai({ nome: "cliente", id: c.id, tab: "privacy" })}>{c.nome} {c.cognome}</button>
              ))}
            </div>
          )}
          <div className="card">
            <div className="card-head"><h2>Prossimi appuntamenti</h2></div>
            <table className="table">
              <tbody>
                {prossimi.map((a) => {
                  const c = cliente(a.clienteId);
                  return (
                    <tr key={a.id} className="click" onClick={() => vai({ nome: "cliente", id: c.id })}>
                      <td className="num small muted" style={{ width: 120 }}>{fmtData(a.data)} {a.ora}</td>
                      <td>{c.nome} {c.cognome}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
