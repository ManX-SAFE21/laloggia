import { useEffect, useMemo, useRef, useState } from "react";
import { Colonna, FILTRI, Filtro, GIORNI_NUOVO, Ordine, corrisponde, ordina, passaFiltro, righe } from "../listaClienti";
import { OGGI, eta, fmtData, nuovoId } from "../data";
import { useStore } from "../store";
import { Icon, Modal, iniziali } from "../components/ui";
import { Cliente } from "../types";

export function Clienti() {
  const { clienti, setClienti, appuntamenti, vai, toast, impostazioni } = useStore();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("attivi");
  const [ordine, setOrdine] = useState<Ordine>(() => {
    try { return { ...ORDINE_INIZIALE, ...JSON.parse(localStorage.getItem(CHIAVE_ORDINE) ?? "{}") }; } catch { return ORDINE_INIZIALE; }
  });
  const [nuovo, setNuovo] = useState(false);
  const cerca = useRef<HTMLInputElement>(null);
  const mesi = impostazioni.mesiRichiamo;

  useEffect(() => { try { localStorage.setItem(CHIAVE_ORDINE, JSON.stringify(ordine)); } catch { /* solo una comodità */ } }, [ordine]);
  // Iniziando a scrivere (fuori dalle caselle), il testo va nella ricerca
  useEffect(() => {
    const tasti = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (document.querySelector(".modal")) return;
      cerca.current?.focus();
    };
    window.addEventListener("keydown", tasti);
    return () => window.removeEventListener("keydown", tasti);
  }, []);

  const tutte = useMemo(() => righe(clienti, appuntamenti, OGGI), [clienti, appuntamenti]);
  const conteggi = useMemo(() => Object.fromEntries(FILTRI.map(([f]) => [f, tutte.filter((r) => passaFiltro(r, f, mesi, OGGI)).length])) as Record<Filtro, number>, [tutte, mesi]);
  const lista = useMemo(
    () => ordina(tutte.filter((r) => passaFiltro(r, filtro, mesi, OGGI) && corrisponde(r.c, q)), ordine),
    [tutte, filtro, mesi, q, ordine],
  );

  const Intestazione = ({ col, children }: { col: Colonna; children: string }) => (
    <th className="ordinabile" title="Clic per ordinare (di nuovo: ordine inverso)"
      onClick={() => setOrdine((o) => (o.colonna === col ? { colonna: col, crescente: !o.crescente } : { colonna: col, crescente: col === "cliente" || col === "prossimo" }))}>
      {children}{ordine.colonna === col && <span className="freccia">{ordine.crescente ? " ▲" : " ▼"}</span>}
    </th>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Clienti</h1><p>{lista.length} {lista.length === 1 ? "cliente" : "clienti"}{q && ` per «${q}»`}</p></div>
        <button className="btn primary" onClick={() => setNuovo(true)}><Icon.plus /> Nuovo cliente</button>
      </div>

      <div className="row" style={{ marginBottom: 10 }}>
        <input ref={cerca} className="input" style={{ maxWidth: 360 }} placeholder="Cerca per nome, email o telefono…" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setQ(""); }} />
        {q && <button className="btn sm ghost" onClick={() => setQ("")}>Cancella ricerca</button>}
      </div>
      <div className="filtri-rapidi">
        {FILTRI.map(([f, nome]) => (
          <button key={f} className={"chip" + (filtro === f ? " on" : "") + (f === "richiamare" && conteggi[f] ? " evidenzia" : "")} onClick={() => setFiltro(f)}
            title={f === "richiamare" ? `Attivi senza appuntamento, ultima visita più di ${mesi} ${mesi === 1 ? "mese" : "mesi"} fa (si cambia in Impostazioni)`
              : f === "nuovi" ? `Prima visita negli ultimi ${GIORNI_NUOVO} giorni` : undefined}>
            {nome} <span className="chip-num">{conteggi[f]}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <table className="table tabella-fissa">
          <thead>
            <tr>
              <Intestazione col="cliente">Cliente</Intestazione><Intestazione col="eta">Età</Intestazione><Intestazione col="peso">Ultimo peso</Intestazione>
              <Intestazione col="ultima">Ultima visita</Intestazione><Intestazione col="prossimo">Prossimo appuntamento</Intestazione><th>Privacy</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(({ c, ultima: ult, prossimo: p }) => (
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
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <div className="empty">{q ? `Nessun cliente trovato per «${q}» in «${FILTRI.find(([f]) => f === filtro)![1]}»` : "Nessun cliente in questo elenco"}</div>}
      </div>

      {nuovo && <NuovoCliente onClose={() => setNuovo(false)} onSave={(c) => { setClienti((l) => [...l, c]); setNuovo(false); toast("Cliente creato"); vai({ nome: "cliente", id: c.id }); }} />}
    </div>
  );
}

const CHIAVE_ORDINE = "laloggia.clienti.ordine";
const ORDINE_INIZIALE: Ordine = { colonna: "cliente", crescente: true };

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
