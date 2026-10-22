import { useState } from "react";
import { OGGI, VERSIONE_INFORMATIVA, bmi, eta, fmtData, nuovoId, settimanaVuota } from "../data";
import { useStore } from "../store";
import { Icon, LineChart, Modal, iniziali } from "../components/ui";
import { Cliente, Visita } from "../types";

const TABS = [
  ["panoramica", "Panoramica"],
  ["anamnesi", "Anamnesi"],
  ["visite", "Visite e misure"],
  ["diete", "Diete"],
  ["allegati", "Allegati"],
  ["privacy", "Privacy"],
] as const;

export function ClienteScheda({ id, tab: tabIniziale }: { id: string; tab?: string }) {
  const { clienti, setClienti, vai } = useStore();
  const c = clienti.find((x) => x.id === id);
  const [tab, setTab] = useState(tabIniziale ?? "panoramica");
  if (!c) return <div className="page">Cliente non trovato</div>;
  const aggiorna = (f: (c: Cliente) => Cliente) => setClienti((l) => l.map((x) => (x.id === id ? f(x) : x)));
  const ult = c.visite[c.visite.length - 1];

  return (
    <div className="page">
      <div className="no-print">
      <button className="btn ghost sm" style={{ marginBottom: 8, paddingLeft: 0 }} onClick={() => vai({ nome: "clienti" })}><Icon.back /> Clienti</button>
      <div className="page-head">
        <div className="row" style={{ gap: 14 }}>
          <div className="avatar lg">{iniziali(c.nome, c.cognome)}</div>
          <div>
            <h1>{c.nome} {c.cognome}</h1>
            <p>{c.sesso === "F" ? "Donna" : "Uomo"}, {eta(c.dataNascita)} anni · {c.altezza} cm · {c.telefono} · {c.email}</p>
          </div>
        </div>
        <div className="row">
          {!c.consenso.firmato && <span className="badge warn">Privacy da firmare</span>}
          <NuovaVisitaBtn onSave={(v) => { aggiorna((x) => ({ ...x, visite: [...x.visite, v] })); setTab("visite"); }} ultima={ult} />
        </div>
      </div>

      <div className="tabs">
        {TABS.map(([k, l]) => <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === "panoramica" && <Panoramica c={c} />}
      {tab === "anamnesi" && <Anamnesi c={c} aggiorna={aggiorna} />}
      {tab === "visite" && <Visite c={c} />}
      {tab === "diete" && <Diete c={c} aggiorna={aggiorna} />}
      {tab === "allegati" && <Allegati c={c} aggiorna={aggiorna} />}
      {tab === "privacy" && <Privacy c={c} aggiorna={aggiorna} />}
      </div>
      <ModuloPrivacy c={c} />
    </div>
  );
}

function Panoramica({ c }: { c: Cliente }) {
  const prima = c.visite[0], ult = c.visite[c.visite.length - 1];
  const delta = (a?: number, b?: number) => (a != null && b != null ? b - a : undefined);
  const Stat = ({ label, val, unit, d }: { label: string; val?: number; unit: string; d?: number }) => (
    <div className="card stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value num">{val != null ? `${val.toFixed(1)} ${unit}` : "—"}</div>
      {d != null && <div className={"stat-delta " + (d <= 0 ? "delta-down" : "delta-up")}>{d > 0 ? "+" : ""}{d.toFixed(1)} {unit} dalla prima visita</div>}
    </div>
  );
  return (
    <div className="grid">
      <div className="grid g4">
        <Stat label="Peso" val={ult?.peso} unit="kg" d={delta(prima?.peso, ult?.peso)} />
        <Stat label="BMI" val={ult ? bmi(ult.peso, c.altezza) : undefined} unit="" />
        <Stat label="Circonferenza vita" val={ult?.vita} unit="cm" d={delta(prima?.vita, ult?.vita)} />
        <Stat label="Massa grassa" val={ult?.massaGrassa} unit="%" d={delta(prima?.massaGrassa, ult?.massaGrassa)} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <div className="card">
          <div className="card-head"><h2>Andamento del peso</h2></div>
          <div className="card-pad"><LineChart unit="kg" points={c.visite.map((v) => ({ label: fmtData(v.data).slice(0, 5), value: v.peso }))} /></div>
        </div>
        <div className="card card-pad">
          <h2 style={{ marginBottom: 12 }}>In breve</h2>
          <dl className="kv">
            <dt>Obiettivo</dt><dd>{c.obiettivo}</dd>
            <dt>Allergie / intolleranze</dt><dd>{c.anamnesi.allergieIntolleranze || "—"}</dd>
            <dt>Attività fisica</dt><dd>{c.anamnesi.attivitaFisica || "—"}</dd>
            <dt>Visite</dt><dd>{c.visite.length}{ult ? `, ultima il ${fmtData(ult.data)}` : ""}</dd>
          </dl>
          {ult?.note && <p className="small muted" style={{ marginTop: 12 }}>Ultima nota: {ult.note}</p>}
        </div>
      </div>
    </div>
  );
}

function Anamnesi({ c, aggiorna }: { c: Cliente; aggiorna: (f: (c: Cliente) => Cliente) => void }) {
  const campi: [keyof Cliente["anamnesi"], string][] = [
    ["patologie", "Patologie e condizioni"],
    ["farmaci", "Farmaci e integratori"],
    ["allergieIntolleranze", "Allergie e intolleranze"],
    ["attivitaFisica", "Attività fisica"],
    ["abitudini", "Abitudini, lavoro, orari"],
  ];
  return (
    <div className="card card-pad">
      <p className="small muted" style={{ marginTop: 0 }}>I campi definitivi verranno ricavati dalle schede Word della nutrizionista. Le modifiche si salvano da sole.</p>
      <div className="grid g2">
        <div className="field"><label>Obiettivo</label>
          <input className="input" value={c.obiettivo} onChange={(e) => aggiorna((x) => ({ ...x, obiettivo: e.target.value }))} />
        </div>
        <div />
        {campi.map(([k, l]) => (
          <div className="field" key={k}><label>{l}</label>
            <textarea className="textarea" value={c.anamnesi[k]} onChange={(e) => aggiorna((x) => ({ ...x, anamnesi: { ...x.anamnesi, [k]: e.target.value } }))} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Visite({ c }: { c: Cliente }) {
  const [misura, setMisura] = useState<"peso" | "vita" | "massaGrassa">("peso");
  const unit = { peso: "kg", vita: "cm", massaGrassa: "%" }[misura];
  const visite = [...c.visite].reverse();
  return (
    <div className="grid">
      <div className="card">
        <div className="card-head">
          <h2>Grafico</h2>
          <div className="row">
            {(["peso", "vita", "massaGrassa"] as const).map((m) => (
              <button key={m} className={"day-chip" + (misura === m ? " active" : "")} onClick={() => setMisura(m)}>
                {{ peso: "Peso", vita: "Vita", massaGrassa: "Massa grassa" }[m]}
              </button>
            ))}
          </div>
        </div>
        <div className="card-pad"><LineChart unit={unit} points={c.visite.filter((v) => v[misura] != null).map((v) => ({ label: fmtData(v.data).slice(0, 5), value: v[misura]! }))} /></div>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Data</th><th>Peso</th><th>BMI</th><th>Vita</th><th>Fianchi</th><th>Massa grassa</th><th>Note</th></tr></thead>
          <tbody>
            {visite.map((v) => (
              <tr key={v.id}>
                <td className="num">{fmtData(v.data)}</td>
                <td className="num">{v.peso.toFixed(1)} kg</td>
                <td className="num">{bmi(v.peso, c.altezza).toFixed(1)}</td>
                <td className="num">{v.vita ?? "—"} cm</td>
                <td className="num">{v.fianchi ?? "—"} cm</td>
                <td className="num">{v.massaGrassa?.toFixed(1) ?? "—"} %</td>
                <td className="small muted">{v.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visite.length === 0 && <div className="empty">Nessuna visita registrata</div>}
      </div>
    </div>
  );
}

function NuovaVisitaBtn({ onSave, ultima }: { onSave: (v: Visita) => void; ultima?: Visita }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ peso: "", vita: "", fianchi: "", massaGrassa: "", note: "" });
  const apri = () => { setF({ peso: ultima?.peso.toString() ?? "", vita: ultima?.vita?.toString() ?? "", fianchi: ultima?.fianchi?.toString() ?? "", massaGrassa: ultima?.massaGrassa?.toString() ?? "", note: "" }); setOpen(true); };
  const n = (s: string) => (s.trim() ? Number(s.replace(",", ".")) : undefined);
  const salva = () => { onSave({ id: nuovoId("vis"), data: OGGI, peso: n(f.peso) ?? 0, vita: n(f.vita), fianchi: n(f.fianchi), massaGrassa: n(f.massaGrassa), note: f.note || undefined }); setOpen(false); };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <button className="btn primary" onClick={apri}><Icon.plus /> Nuova visita</button>
      {open && (
        <Modal title={`Visita del ${fmtData(OGGI)}`} onClose={() => setOpen(false)} footer={<><button className="btn" onClick={() => setOpen(false)}>Annulla</button><button className="btn primary" disabled={!n(f.peso)} onClick={salva}>Salva visita</button></>}>
          <p className="small muted" style={{ marginTop: 0 }}>Precompilato con i valori dell'ultima visita.</p>
          <div className="grid g2">
            <div className="field"><label>Peso (kg)</label><input className="input" autoFocus value={f.peso} onChange={set("peso")} /></div>
            <div className="field"><label>Massa grassa (%)</label><input className="input" value={f.massaGrassa} onChange={set("massaGrassa")} /></div>
            <div className="field"><label>Vita (cm)</label><input className="input" value={f.vita} onChange={set("vita")} /></div>
            <div className="field"><label>Fianchi (cm)</label><input className="input" value={f.fianchi} onChange={set("fianchi")} /></div>
          </div>
          <div className="field" style={{ marginTop: 12 }}><label>Note della visita</label><textarea className="textarea" value={f.note} onChange={set("note")} /></div>
        </Modal>
      )}
    </>
  );
}

function Diete({ c, aggiorna }: { c: Cliente; aggiorna: (f: (c: Cliente) => Cliente) => void }) {
  const { diete, setDiete, vai, toast } = useStore();
  const sue = diete.filter((d) => d.clienteId === c.id);
  const crea = () => {
    const id = nuovoId("d");
    setDiete((l) => [...l, { id, clienteId: c.id, titolo: `Piano alimentare ${fmtData(OGGI)}`, creata: OGGI, kcalObiettivo: 1800, settimana: settimanaVuota(), noteGenerali: "" }]);
    aggiorna((x) => ({ ...x, dietaId: id }));
    toast("Nuova dieta creata");
    vai({ nome: "dieta", id });
  };
  return (
    <div className="card">
      <div className="card-head"><h2>Diete</h2><button className="btn primary sm" onClick={crea}><Icon.plus /> Nuova dieta</button></div>
      <table className="table">
        <tbody>
          {sue.map((d) => (
            <tr key={d.id} className="click" onClick={() => vai({ nome: "dieta", id: d.id })}>
              <td style={{ fontWeight: 600 }}>{d.titolo}</td>
              <td className="muted num">Creata il {fmtData(d.creata)}</td>
              <td className="num">{d.kcalObiettivo} kcal</td>
              <td style={{ textAlign: "right" }}>{c.dietaId === d.id && <span className="badge ok">In corso</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sue.length === 0 && <div className="empty">Nessuna dieta. Creane una nuova.</div>}
    </div>
  );
}

function Allegati({ c, aggiorna }: { c: Cliente; aggiorna: (f: (c: Cliente) => Cliente) => void }) {
  const { toast } = useStore();
  const aggiungi = () => {
    aggiorna((x) => ({ ...x, allegati: [...x.allegati, { id: nuovoId("al"), nome: `Referto ${fmtData(OGGI).replace(/\//g, "-")}.pdf`, tipo: "pdf", data: OGGI, dimensioneKb: 320 }] }));
    toast("Allegato aggiunto (simulato)");
  };
  return (
    <div className="card">
      <div className="card-head"><h2>Allegati</h2><button className="btn sm" onClick={aggiungi}><Icon.plus /> Aggiungi PDF o foto</button></div>
      <table className="table">
        <tbody>
          {c.allegati.map((a) => (
            <tr key={a.id}>
              <td style={{ width: 30, color: "var(--ink-2)" }}>{a.tipo === "pdf" ? <Icon.file /> : <Icon.image />}</td>
              <td>{a.nome}</td>
              <td className="muted num">{fmtData(a.data)}</td>
              <td className="muted num" style={{ textAlign: "right" }}>{a.dimensioneKb >= 1000 ? `${(a.dimensioneKb / 1024).toFixed(1)} MB` : `${a.dimensioneKb} KB`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {c.allegati.length === 0 && <div className="empty">Nessun allegato</div>}
      <div className="card-pad small muted" style={{ borderTop: "1px solid var(--line)" }}>Nel programma vero gli allegati vengono salvati cifrati dentro l'archivio e inclusi nei backup.</div>
    </div>
  );
}

function Privacy({ c, aggiorna }: { c: Cliente; aggiorna: (f: (c: Cliente) => Cliente) => void }) {
  const { toast, setClienti, vai } = useStore();
  const [conferma, setConferma] = useState(false);
  const [spunta, setSpunta] = useState(false);
  const [dataFirma, setDataFirma] = useState(OGGI);

  const registra = () => {
    aggiorna((x) => ({ ...x, consenso: { firmato: true, data: dataFirma, versioneInformativa: VERSIONE_INFORMATIVA, modalita: "cartaceo" } }));
    setSpunta(false);
    toast("Consenso registrato. Conserva la copia cartacea firmata.");
  };
  const annulla = () => {
    aggiorna((x) => ({ ...x, consenso: { firmato: false } }));
    toast("Registrazione del consenso annullata");
  };

  return (
    <div className="grid g2" style={{ alignItems: "start" }}>
      <div className="card card-pad">
        <h2 style={{ marginBottom: 12 }}>Consenso al trattamento dei dati</h2>
        {c.consenso.firmato ? (
          <>
            <dl className="kv">
              <dt>Stato</dt><dd><span className="badge ok">Firmato</span></dd>
              <dt>Data della firma</dt><dd>{fmtData(c.consenso.data!)}</dd>
              <dt>Versione informativa</dt><dd>{c.consenso.versioneInformativa}</dd>
              <dt>Modalità</dt><dd>Modulo cartaceo firmato</dd>
            </dl>
            <p className="small muted">La copia cartacea firmata è conservata dallo studio.</p>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button className="btn sm" onClick={() => window.print()}><Icon.print /> Ristampa il modulo</button>
              <button className="btn sm danger" onClick={annulla}>Annulla la registrazione</button>
            </div>
          </>
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            <div>
              <div className="row"><span className="badge warn">Da firmare</span></div>
              <h3 style={{ margin: "12px 0 4px" }}>1. Stampa il modulo</h3>
              <p className="small muted" style={{ margin: "0 0 8px" }}>Il modulo è già compilato con i dati del cliente. Manca solo la firma.</p>
              <button className="btn primary" onClick={() => window.print()}><Icon.print /> Stampa modulo</button>
            </div>
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <h3 style={{ marginBottom: 8 }}>2. Dopo la firma</h3>
              <label className="row" style={{ alignItems: "flex-start", cursor: "pointer" }}>
                <input type="checkbox" style={{ marginTop: 3 }} checked={spunta} onChange={(e) => setSpunta(e.target.checked)} />
                <span>Il cliente ha firmato il modulo e ho tenuto da parte la copia cartacea</span>
              </label>
              <div className="field" style={{ marginTop: 10, maxWidth: 220 }}>
                <label>Data della firma</label>
                <input className="input" type="date" max={OGGI} value={dataFirma} onChange={(e) => setDataFirma(e.target.value)} />
              </div>
              <button className="btn primary" style={{ marginTop: 12 }} disabled={!spunta || !dataFirma} onClick={registra}>Registra il consenso</button>
            </div>
          </div>
        )}
      </div>
      <div className="card card-pad">
        <h2 style={{ marginBottom: 12 }}>Diritti del cliente</h2>
        <p className="small muted" style={{ marginTop: 0 }}>Strumenti per rispondere alle richieste previste dal GDPR.</p>
        <div className="grid" style={{ gap: 8 }}>
          <button className="btn" onClick={() => toast("Esportazione dati del cliente in PDF e JSON (simulato)")}>Esporta tutti i dati del cliente</button>
          <button className="btn" onClick={() => { aggiorna((x) => ({ ...x, attivo: !x.attivo })); toast(c.attivo ? "Cliente archiviato" : "Cliente riattivato"); }}>{c.attivo ? "Archivia cliente" : "Riattiva cliente"}</button>
          <button className="btn danger" onClick={() => setConferma(true)}>Cancella definitivamente il cliente</button>
        </div>
      </div>
      {conferma && (
        <Modal title="Cancellare il cliente?" onClose={() => setConferma(false)} footer={<><button className="btn" onClick={() => setConferma(false)}>Annulla</button><button className="btn primary" style={{ background: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => { setClienti((l) => l.filter((x) => x.id !== c.id)); toast("Cliente cancellato"); vai({ nome: "clienti" }); }}>Cancella</button></>}>
          <p>Verranno cancellati anagrafica, visite, diete e allegati di <b>{c.nome} {c.cognome}</b>. L'operazione non si può annullare.</p>
        </Modal>
      )}
    </div>
  );
}

/** Modulo stampabile: compare solo in stampa. Il testo è un SEGNAPOSTO. */
function ModuloPrivacy({ c }: { c: Cliente }) {
  return (
    <div className="print-only print-sheet modulo">
      <div className="modulo-head">La Loggia · Benessere Naturale — Malo (VI)</div>
      <h1>Informativa sul trattamento dei dati personali e consenso</h1>
      <div className="modulo-warn">TESTO DI ESEMPIO: da sostituire con il modulo ufficiale dello studio prima dell'uso.</div>
      <p>
        Cliente: <b>{c.cognome} {c.nome}</b> — nato/a il {fmtData(c.dataNascita)}<br />
        Telefono: {c.telefono || "—"} — Email: {c.email || "—"}
      </p>
      <h3>1. Titolare del trattamento</h3>
      <p>[Nome e dati di contatto del titolare: da inserire]</p>
      <h3>2. Dati trattati e finalità</h3>
      <p>[Elenco dei dati raccolti (anagrafici, anamnesi, misure, abitudini alimentari) e finalità: da inserire]</p>
      <h3>3. Base giuridica</h3>
      <p>[Da inserire]</p>
      <h3>4. Conservazione dei dati</h3>
      <p>[Periodo di conservazione: da inserire]</p>
      <h3>5. Diritti dell'interessato</h3>
      <p>[Accesso, rettifica, cancellazione, limitazione, portabilità, opposizione, reclamo al Garante: testo da inserire]</p>
      <h3>Consenso</h3>
      <p>Il/La sottoscritto/a dichiara di aver letto l'informativa e [formula del consenso: da inserire].</p>
      <div className="modulo-firma">
        <div>Luogo e data<div className="linea" /></div>
        <div>Firma del cliente<div className="linea" /></div>
      </div>
      <div className="modulo-foot">Versione informativa: {VERSIONE_INFORMATIVA}</div>
    </div>
  );
}
