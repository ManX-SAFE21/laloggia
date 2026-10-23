// Menu "Piani alimentari": archivio dei modelli (ipo/iso/ipercalorici…) da cui si creano i piani dei clienti.
// Regole (CLAUDE.md): il piano del cliente è una copia; modificare o eliminare un modello non tocca i piani dei clienti.
import { useState } from "react";
import { useStore } from "../store";
import { Icon, Modal } from "../components/ui";
import { OGGI, duplicaModello, fmtData, nuovoModello } from "../data";
import { Cliente, ModelloPiano, PianoAlimentare, TIPI_MODELLO, TipoModello } from "../types";
import { EditorPiano } from "./PianoEditor";

export function Modelli() {
  const { modelli, setModelli, piani, vai, toast } = useStore();
  const [filtro, setFiltro] = useState<TipoModello | "Tutti">("Tutti");
  const [elimina, setElimina] = useState<ModelloPiano | null>(null);
  const clientiCon = (m: ModelloPiano) => new Set(piani.filter((p) => p.modelloId === m.id).map((p) => p.clienteId)).size;
  const lista = modelli.filter((m) => filtro === "Tutti" || m.tipo === filtro).sort((a, b) => TIPI_MODELLO.indexOf(a.tipo) - TIPI_MODELLO.indexOf(b.tipo) || (a.kcal ?? 0) - (b.kcal ?? 0));

  const crea = () => {
    const m = nuovoModello(OGGI);
    setModelli((l) => [...l, m]);
    vai({ nome: "modello", id: m.id });
  };
  const [nuovo, setNuovo] = useState<string | null>(null); // riga appena creata, evidenziata per qualche secondo
  const duplica = (m: ModelloPiano) => {
    const copia = duplicaModello(m, OGGI);
    setModelli((l) => [...l, copia]);
    if (filtro !== "Tutti" && filtro !== copia.tipo) setFiltro("Tutti");
    setNuovo(copia.id);
    window.setTimeout(() => setNuovo((x) => (x === copia.id ? null : x)), 4000);
    toast(`Copia creata: «${copia.nome}». La trovi evidenziata nell'elenco`);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Piani alimentari</h1><p>Modelli da cui creare i piani dei clienti. Il piano del cliente è una copia: cambiare un modello non tocca i piani già fatti.</p></div>
        <button className="btn primary" onClick={crea}><Icon.plus /> Nuovo modello</button>
      </div>

      <div className="row" style={{ gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {(["Tutti", ...TIPI_MODELLO] as const).map((t) => (
          <button key={t} className={"day-chip" + (filtro === t ? " active" : "")} onClick={() => setFiltro(t)}>
            {t}{t !== "Tutti" && <span className="muted"> · {modelli.filter((m) => m.tipo === t).length}</span>}
          </button>
        ))}
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Modello</th><th>Tipo</th><th>Kcal</th><th>Clienti</th><th>Modificato</th><th></th></tr></thead>
          <tbody>
            {lista.map((m) => (
              <tr key={m.id} className={"click" + (nuovo === m.id ? " riga-nuova" : "")} onClick={() => vai({ nome: "modello", id: m.id })}>
                <td style={{ fontWeight: 600 }}>{m.nome}{m.nota && <div className="small muted" style={{ fontWeight: 400 }}>{m.nota}</div>}</td>
                <td><span className={"badge tipo-" + m.tipo.toLowerCase()}>{m.tipo}</span></td>
                <td className="num">{m.kcal ? `${m.kcal} kcal` : "—"}</td>
                <td className="num">{clientiCon(m) || "—"}</td>
                <td className="num muted">{fmtData(m.modificato)}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn sm" onClick={() => vai({ nome: "modello", id: m.id })}>Modifica</button>{" "}
                  <button className="btn sm" title="Crea una copia del modello in questo elenco" onClick={() => duplica(m)}>Duplica</button>{" "}
                  <button className="btn sm danger" onClick={() => setElimina(m)}>Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <div className="empty">Nessun modello {filtro !== "Tutti" ? filtro.toLowerCase() : ""}. Crealo con «Nuovo modello» o duplicandone uno esistente.</div>}
      </div>

      {elimina && (
        <Modal title="Eliminare il modello?" onClose={() => setElimina(null)}
          footer={<><button className="btn" onClick={() => setElimina(null)}>Annulla</button><button className="btn primary" onClick={() => { setModelli((l) => l.filter((m) => m.id !== elimina.id)); toast(`Modello «${elimina.nome}» eliminato`); setElimina(null); }}>Elimina il modello</button></>}>
          <p style={{ marginTop: 0 }}>Il modello <b>«{elimina.nome}»</b> sparirà dall'elenco.</p>
          <p className="small muted" style={{ marginBottom: 0 }}>
            {clientiCon(elimina) > 0
              ? `I piani già creati da questo modello per ${clientiCon(elimina)} cliente/i restano intatti: sono copie indipendenti.`
              : "Nessun cliente ha un piano creato da questo modello."}
          </p>
        </Modal>
      )}
    </div>
  );
}

// Cliente di esempio per la copertina dell'anteprima di un modello.
const CLIENTE_ESEMPIO = { id: "", nome: "Nome", cognome: "Cognome", obiettivo: "Obiettivo del cliente" } as Cliente;

/** Modifica di un modello: stesso editor dei piani, più nome, tipo e nota. */
export function ModelloEditor({ id }: { id: string }) {
  const { modelli, setModelli, piani, vai, toast } = useStore();
  const m = modelli.find((x) => x.id === id);
  if (!m) return <div className="page">Modello non trovato</div>;

  // L'editor lavora su un "piano"; qui lo si ricava dal modello e si riporta indietro ogni modifica.
  const comePiano: PianoAlimentare = { id: m.id, clienteId: "", titolo: m.titolo, modello: m.nome, creato: OGGI, kcal: m.kcal, messaggio: m.messaggio, sezioni: m.sezioni };
  const aggModello = (f: (x: ModelloPiano) => ModelloPiano) => setModelli((l) => l.map((x) => (x.id === id ? { ...f(x), modificato: OGGI } : x)));
  const aggiorna = (f: (p: PianoAlimentare) => PianoAlimentare) => aggModello((x) => {
    const p = f({ ...comePiano, titolo: x.titolo, kcal: x.kcal, messaggio: x.messaggio, sezioni: x.sezioni });
    return { ...x, titolo: p.titolo, kcal: p.kcal, messaggio: p.messaggio, sezioni: p.sezioni };
  });
  const usato = piani.filter((p) => p.modelloId === m.id).length;

  return (
    <EditorPiano piano={comePiano} cliente={CLIENTE_ESEMPIO} aggiorna={aggiorna} riassunto={m.tipo}
      azioniInPiu={<button className="btn" title="Crea in Piani alimentari un altro modello uguale a questo; tu resti qui" onClick={() => {
        const copia = duplicaModello(m, OGGI);
        setModelli((l) => [...l, copia]);
        toast(`Copia creata in Piani alimentari: «${copia.nome}». Stai ancora modificando «${m.nome}»`);
      }}>Salva come copia</button>}
      intestazione={<>
        <button className="btn ghost sm" style={{ marginBottom: 8, paddingLeft: 0 }} onClick={() => vai({ nome: "modelli" })}><Icon.back /> Piani alimentari</button>
        <div>
          <h1>Modello «{m.nome}»</h1>
          <p>{m.tipo}{m.kcal ? ` · ${m.kcal} kcal` : ""} · modificato il {fmtData(m.modificato)}
            {usato > 0 && ` · usato in ${usato} piano/i: quei piani NON cambiano modificando il modello`}</p>
        </div>
      </>}
      campiInPiu={<>
        <div className="grid g2">
          <div className="field"><label>Nome del modello</label><input className="input" value={m.nome} onChange={(e) => aggModello((x) => ({ ...x, nome: e.target.value }))} /></div>
          <div className="field"><label>Tipo</label>
            <select className="select" value={m.tipo} onChange={(e) => aggModello((x) => ({ ...x, tipo: e.target.value as TipoModello }))}>
              {TIPI_MODELLO.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="field" style={{ marginTop: 8 }}><label>Nota interna (non stampata)</label><input className="input" value={m.nota ?? ""} onChange={(e) => aggModello((x) => ({ ...x, nota: e.target.value || undefined }))} /></div>
      </>}
    />
  );
}
