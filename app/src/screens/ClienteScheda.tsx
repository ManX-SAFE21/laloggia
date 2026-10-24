import { Fragment, useState } from "react";
import { OGGI, VERSIONE_INFORMATIVA, bmi, eta, fmtData, nuovoId, nuovoPianoDaModello, settimanaVuota } from "../data";
import { useStore } from "../store";
import { Icon, LineChart, Modal, iniziali } from "../components/ui";
import { Bia, Cliente, TIPI_MODELLO, TipoVisita, Visita } from "../types";
import { INTERVALLO_CONTROLLO_MESI, MISURE, Misura, differenza, fmt, misura, piuMesi } from "../misure";
import { ImportaBia } from "./ImportaBia";
import { PrimaVisita } from "./PrimaVisita";
import { Allegati } from "../components/Allegati";
import { FRASE_CONFERMA, fraseGiusta } from "../conferme";
import { apriStampa } from "../stampa";

const TABS = [
  ["panoramica", "Panoramica"],
  ["anamnesi", "Prima visita"],
  ["visite", "Visite e misure"],
  ["diete", "Diete"],
  ["allegati", "Allegati"],
  ["privacy", "Privacy"],
] as const;

export function ClienteScheda({ id, tab: tabIniziale }: { id: string; tab?: string }) {
  const { clienti, setClienti, vai, appuntamenti, setAppuntamenti, toast } = useStore();
  const c = clienti.find((x) => x.id === id);
  const [tab, setTab] = useState(tabIniziale ?? "panoramica");
  const [importa, setImporta] = useState(false);
  if (!c) return <div className="page">Cliente non trovato</div>;
  const aggiorna = (f: (c: Cliente) => Cliente) => setClienti((l) => l.map((x) => (x.id === id ? f(x) : x)));
  const ult = c.visite[c.visite.length - 1];
  const prossimo = appuntamenti.filter((a) => a.clienteId === c.id && a.data >= OGGI).sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora))[0];
  // Archiviare: cosa di tutti i giorni (percorso finito), si annulla con Riattiva o con Annulla
  const archivia = () => {
    const ora = !c.attivo;
    aggiorna((x) => ({ ...x, attivo: ora }));
    if (ora) toast("Cliente riattivato");
    else toast(prossimo ? `Cliente archiviato. Ha ancora un appuntamento il ${fmtData(prossimo.data)} alle ${prossimo.ora}: controllalo in agenda` : "Cliente archiviato: lo trovi nella lista clienti, in «Archiviati»");
  };
  const pianifica = (data: string, ora: string) => {
    setAppuntamenti((l) => [...l, { id: nuovoId("ap"), clienteId: c.id, data, ora, durata: 45, tipo: "Controllo" }]);
    toast(`Controllo aggiunto in agenda il ${fmtData(data)} alle ${ora}`);
  };

  return (
    <div className={"page" + (c.attivo ? "" : " cliente-archiviato")}>
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
          {c.attivo && <button className="btn" title="Il cliente ha finito il percorso: esce dagli attivi (si può riattivare)" onClick={archivia}>Archivia</button>}
          <button className="btn" onClick={() => setImporta(true)}><Icon.file /> Importa BIA (PDF)</button>
          <NuovaVisitaBtn prima={c.visite.length === 0} ultima={ult} onPianifica={pianifica}
            onSave={(v) => { aggiorna((x) => ({ ...x, visite: [...x.visite, v].sort((a, b) => a.data.localeCompare(b.data)) })); setTab("visite"); }} />
        </div>
      </div>

      {!c.attivo && (
        <div className="striscia-archiviato">
          <span><b>Cliente archiviato.</b> Non compare tra gli attivi; i dati restano tutti qui.</span>
          <button className="btn sm" onClick={archivia}>Riattiva</button>
        </div>
      )}

      <div className="tabs">
        {TABS.map(([k, l]) => <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === "panoramica" && <Panoramica c={c} prossimo={prossimo ? `${fmtData(prossimo.data)} alle ${prossimo.ora}` : undefined} />}
      {tab === "anamnesi" && <PrimaVisita c={c} aggiorna={aggiorna} />}
      {tab === "visite" && <Visite c={c} />}
      {tab === "diete" && <Diete c={c} aggiorna={aggiorna} />}
      {tab === "allegati" && <Allegati c={c} aggiorna={aggiorna} />}
      {tab === "privacy" && <Privacy c={c} aggiorna={aggiorna} />}
      </div>
      <ModuloPrivacy c={c} />
      {importa && <ImportaBia c={c} onClose={() => setImporta(false)}
        onConferma={(f, msg) => { aggiorna(f); setImporta(false); setTab("visite"); toast(msg); }} />}
    </div>
  );
}

function Panoramica({ c, prossimo }: { c: Cliente; prossimo?: string }) {
  const ult = c.visite[c.visite.length - 1];
  // Con la BIA si mostrano acqua e angolo di fase; senza, vita e BMI come prima.
  const chiavi = c.visite.some((v) => v.bia) ? ["peso", "mg", "acqua", "pha"] : ["peso", "mg", "vita"];
  const Stat = ({ m }: { m: Misura }) => {
    const valori = c.visite.map(m.get).filter((x): x is number => x != null);
    const d = differenza(m, c.visite);
    const bene = d == null || d === 0 || m.scendereBene == null ? undefined : m.scendereBene ? d < 0 : d > 0;
    return (
      <div className="card stat">
        <div className="stat-label">{m.label}</div>
        <div className="stat-value num">{fmt(m, valori[valori.length - 1])}</div>
        {d != null && <div className={"stat-delta " + (bene === undefined ? "delta-neutro" : bene ? "delta-down" : "delta-up")}>{d > 0 ? "+" : ""}{fmt(m, d)} dalla prima visita</div>}
      </div>
    );
  };
  return (
    <div className="grid">
      <div className="grid g4">
        {chiavi.map((k) => <Stat key={k} m={misura(k)} />)}
        {chiavi.length < 4 && (
          <div className="card stat">
            <div className="stat-label">BMI</div>
            <div className="stat-value num">{ult ? bmi(ult.peso, c.altezza).toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : "—"}</div>
          </div>
        )}
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
            <dt>Peso teorico</dt><dd>{c.pesoTeorico != null ? `${c.pesoTeorico.toLocaleString("it-IT")} kg` : "—"}</dd>
            <dt>Fabbisogno</dt><dd>{c.fabbisogno != null ? `${c.fabbisogno} kcal/giorno` : "—"}</dd>
            <dt>Allergie / intolleranze</dt><dd>{c.anamnesi.allergieIntolleranze || "—"}</dd>
            <dt>Attività fisica</dt><dd>{c.anamnesi.attivitaFisica || "—"}</dd>
            <dt>Visite</dt><dd>{c.visite.length}{ult ? `, ultima il ${fmtData(ult.data)}` : ""}</dd>
            <dt>Prossimo controllo</dt><dd>{prossimo ?? <span className="muted">non fissato</span>}</dd>
          </dl>
          {ult?.note && <p className="small muted" style={{ marginTop: 12 }}>Ultima nota: {ult.note}</p>}
        </div>
      </div>
    </div>
  );
}

/** Un grafico per misura, con valore attuale e differenza dalla prima visita. */
function GraficoMisura({ m, visite }: { m: Misura; visite: Visita[] }) {
  const punti = visite.filter((v) => m.get(v) != null).map((v) => ({ label: fmtData(v.data).slice(0, 5), value: m.get(v)! }));
  const d = differenza(m, visite);
  const bene = d == null || d === 0 || m.scendereBene == null ? undefined : m.scendereBene ? d < 0 : d > 0;
  return (
    <div className="card">
      <div className="card-head" style={{ padding: "12px 16px" }}>
        <h2 style={{ fontSize: 15 }}>{m.label}</h2>
        <span className="num" style={{ fontWeight: 600 }}>{fmt(m, punti[punti.length - 1]?.value)}</span>
      </div>
      <div style={{ padding: "6px 12px 10px" }}>
        <div className={"stat-delta " + (bene === undefined ? "delta-neutro" : bene ? "delta-down" : "delta-up")} style={{ minHeight: 16, paddingLeft: 4 }}>
          {d != null ? `${d > 0 ? "+" : ""}${fmt(m, d)} dalla prima visita` : "Serve almeno un'altra misura"}
        </div>
        <LineChart unit={m.unit} points={punti} height={150} decimali={m.decimali} />
        {m.nota && <div className="small muted" style={{ paddingLeft: 4 }}>{m.nota}</div>}
      </div>
    </div>
  );
}

// Voci del referto BIA mostrate nel dettaglio della visita.
const VOCI_BIA: [keyof Bia, string, string][] = [
  ["peso", "Peso", "kg"], ["altezza", "Altezza", "cm"], ["bmi", "BMI", ""],
  ["fmPerc", "Massa grassa (MG)", "%"], ["fmKg", "Massa grassa", "kg"],
  ["tbwPerc", "Acqua totale (H₂O)", "%"], ["tbwLitri", "Acqua totale", "litri"],
  ["aat", "GV (AAT) — da confermare", "cm²"], ["pha", "Angolo di fase", "°"],
  ["smmPerc", "Massa muscolare", "% FFM"], ["smmKg", "Massa muscolare", "kg"],
  ["ffmPerc", "Massa magra", "%"], ["ffmKg", "Massa magra", "kg"],
  ["bmr", "Metabolismo basale (BMR)", "kcal/giorno"], ["ee24", "Dispendio 24 ore (24EE)", "kcal/giorno"],
  ["pesoIdeale", "Peso ideale", "kg"],
];

function Visite({ c }: { c: Cliente }) {
  const [dettaglio, setDettaglio] = useState<Visita | null>(null);
  const visite = [...c.visite].sort((a, b) => a.data.localeCompare(b.data));
  // Grafici solo per le misure che il cliente ha davvero (niente grafici vuoti).
  const grafici = MISURE.filter((m) => !["mgKg", "fianchi"].includes(m.key) && visite.some((v) => m.get(v) != null));
  const colonne = ["peso", "mg", "acqua", "gv", "pha", "muscolo", "vita"].map(misura).filter((m) => visite.some((v) => m.get(v) != null));
  return (
    <div className="grid">
      {visite.length > 0 && <div className="grid g3">{grafici.map((m) => <GraficoMisura key={m.key} m={m} visite={visite} />)}</div>}
      <div className="card">
        <div className="card-head"><h2>Visite</h2><span className="small muted">Clic su una visita per vedere tutti i valori</span></div>
        <table className="table">
          <thead><tr><th>Data</th><th>Tipo</th>{colonne.map((m) => <th key={m.key}>{m.label.replace(/ \(.*\)/, "")}</th>)}<th>BMI</th><th></th></tr></thead>
          <tbody>
            {[...visite].reverse().map((v) => (
              <tr key={v.id} className="click" onClick={() => setDettaglio(v)}>
                <td className="num">{fmtData(v.data)}</td>
                <td>{v.tipo}</td>
                {colonne.map((m) => <td key={m.key} className="num">{fmt(m, m.get(v))}</td>)}
                <td className="num">{bmi(v.peso, c.altezza).toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</td>
                <td style={{ textAlign: "right" }}>{v.bia && <span className="badge accent">BIA</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visite.length === 0 && <div className="empty">Nessuna visita registrata</div>}
      </div>
      {dettaglio && <DettaglioVisita v={dettaglio} onClose={() => setDettaglio(null)} />}
    </div>
  );
}

function DettaglioVisita({ v, onClose }: { v: Visita; onClose: () => void }) {
  const voci = v.bia ? VOCI_BIA.filter(([k]) => v.bia![k] != null) : [];
  return (
    <Modal title={`${v.tipo} del ${fmtData(v.data)}`} onClose={onClose}>
      <dl className="kv">
        <dt>Peso</dt><dd className="num">{v.peso.toLocaleString("it-IT")} kg</dd>
        {v.vita != null && <><dt>Circonferenza vita</dt><dd className="num">{v.vita} cm</dd></>}
        {v.fianchi != null && <><dt>Fianchi</dt><dd className="num">{v.fianchi} cm</dd></>}
        {!v.bia && v.massaGrassa != null && <><dt>Massa grassa</dt><dd className="num">{v.massaGrassa} %</dd></>}
      </dl>
      {v.bia && (
        <>
          <h3 style={{ margin: "16px 0 8px" }}>Analisi BIA {v.bia.dataMisura !== v.data ? `del ${fmtData(v.bia.dataMisura)}` : ""}</h3>
          {v.bia.fonte && <p className="small muted" style={{ marginTop: 0 }}>Referto: {v.bia.fonte}{v.bia.ora ? `, ore ${v.bia.ora}` : ""}</p>}
          <dl className="kv">
            {voci.map(([k, l, u]) => <Fragment key={k}><dt>{l}</dt><dd className="num">{(v.bia![k] as number).toLocaleString("it-IT")} {u}</dd></Fragment>)}
          </dl>
        </>
      )}
      {v.note && <p className="small" style={{ marginTop: 16 }}><b>Note:</b> {v.note}</p>}
    </Modal>
  );
}

function NuovaVisitaBtn({ onSave, onPianifica, ultima, prima }: {
  onSave: (v: Visita) => void; onPianifica: (data: string, ora: string) => void; ultima?: Visita; prima: boolean;
}) {
  const [passo, setPasso] = useState<"chiuso" | "visita" | "prossimo">("chiuso");
  const vuoto = { data: OGGI, tipo: (prima ? "Prima visita" : "Controllo") as TipoVisita, peso: "", vita: "", fianchi: "", massaGrassa: "", acqua: "", gv: "", pha: "", muscolo: "", note: "" };
  const [f, setF] = useState(vuoto);
  const [prox, setProx] = useState({ data: piuMesi(OGGI, INTERVALLO_CONTROLLO_MESI), ora: "10:00" });
  const apri = () => {
    setF({ ...vuoto, peso: ultima?.peso.toString() ?? "", vita: ultima?.vita?.toString() ?? "", fianchi: ultima?.fianchi?.toString() ?? "" });
    setPasso("visita");
  };
  const n = (s: string) => (s.trim() ? Number(s.replace(",", ".")) : undefined);
  const salva = () => {
    const bia = [f.acqua, f.gv, f.pha, f.muscolo].some((x) => x.trim())
      ? { dataMisura: f.data, fmPerc: n(f.massaGrassa), tbwPerc: n(f.acqua), aat: n(f.gv), pha: n(f.pha), smmKg: n(f.muscolo) }
      : undefined;
    onSave({ id: nuovoId("vis"), data: f.data, tipo: f.tipo, peso: n(f.peso) ?? 0, vita: n(f.vita), fianchi: n(f.fianchi), massaGrassa: n(f.massaGrassa), bia, note: f.note || undefined });
    setProx({ data: piuMesi(f.data, INTERVALLO_CONTROLLO_MESI), ora: "10:00" });
    setPasso("prossimo");
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const campo = (k: keyof typeof f, l: string, autoFocus = false) => (
    <div className="field"><label>{l}</label><input className="input" autoFocus={autoFocus} value={f[k]} onChange={set(k)} /></div>
  );
  return (
    <>
      <button className="btn primary" onClick={apri}><Icon.plus /> Nuova visita</button>
      {passo === "visita" && (
        <Modal title="Nuova visita" onClose={() => setPasso("chiuso")}
          footer={<><button className="btn" onClick={() => setPasso("chiuso")}>Annulla</button><button className="btn primary" disabled={!n(f.peso)} onClick={salva}>Salva visita</button></>}>
          <div className="grid g2">
            <div className="field"><label>Data</label><input className="input" type="date" value={f.data} onChange={set("data")} /></div>
            <div className="field"><label>Tipo</label>
              <select className="select" value={f.tipo} onChange={set("tipo")}><option>Prima visita</option><option>Controllo</option></select>
            </div>
            {campo("peso", "Peso (kg)", true)}
            {campo("massaGrassa", "Massa grassa MG (%)")}
            {campo("vita", "Vita (cm)")}
            {campo("fianchi", "Fianchi (cm)")}
          </div>
          <details style={{ marginTop: 12 }}>
            <summary className="small" style={{ cursor: "pointer" }}>Altri valori BIA (se non importi il referto PDF)</summary>
            <div className="grid g2" style={{ marginTop: 8 }}>
              {campo("acqua", "Acqua totale H₂O (%)")}
              {campo("gv", "GV / AAT (cm²)")}
              {campo("pha", "Angolo di fase (°)")}
              {campo("muscolo", "Massa muscolare (kg)")}
            </div>
          </details>
          <div className="field" style={{ marginTop: 12 }}><label>Note della visita</label><textarea className="textarea" value={f.note} onChange={set("note")} /></div>
        </Modal>
      )}
      {passo === "prossimo" && (
        <Modal title="Prossimo controllo" onClose={() => setPasso("chiuso")}
          footer={<><button className="btn" onClick={() => setPasso("chiuso")}>Non ora</button><button className="btn primary" onClick={() => { onPianifica(prox.data, prox.ora); setPasso("chiuso"); }}>Aggiungi in agenda</button></>}>
          <p className="small muted" style={{ marginTop: 0 }}>Visita salvata. Proposta: controllo tra {INTERVALLO_CONTROLLO_MESI} mesi. Puoi cambiare data e ora.</p>
          <div className="grid g2">
            <div className="field"><label>Data</label><input className="input" type="date" value={prox.data} onChange={(e) => setProx({ ...prox, data: e.target.value })} /></div>
            <div className="field"><label>Ora</label><input className="input" type="time" value={prox.ora} onChange={(e) => setProx({ ...prox, ora: e.target.value })} /></div>
          </div>
        </Modal>
      )}
    </>
  );
}

function Diete({ c, aggiorna }: { c: Cliente; aggiorna: (f: (c: Cliente) => Cliente) => void }) {
  const { diete, setDiete, piani, setPiani, modelli, vai, toast } = useStore();
  const sue = diete.filter((d) => d.clienteId === c.id);
  const suoiPiani = piani.filter((p) => p.clienteId === c.id).sort((x, y) => y.creato.localeCompare(x.creato));
  const [modelloId, setModelloId] = useState(modelli[0]?.id ?? "");
  const crea = () => {
    const id = nuovoId("d");
    setDiete((l) => [...l, { id, clienteId: c.id, titolo: `Piano alimentare ${fmtData(OGGI)}`, creata: OGGI, kcalObiettivo: c.fabbisogno ?? 1800, settimana: settimanaVuota(), noteGenerali: "" }]);
    aggiorna((x) => ({ ...x, dietaId: id }));
    toast("Nuova dieta creata");
    vai({ nome: "dieta", id });
  };
  const creaPiano = () => {
    const m = modelli.find((x) => x.id === modelloId);
    if (!m) { toast("Scegli un modello (menu Piani alimentari)"); return; }
    const p = nuovoPianoDaModello(m, c.id, OGGI);
    setPiani((l) => [...l, p]);
    toast(`Piano creato dal modello «${m.nome}»`);
    vai({ nome: "piano", id: p.id });
  };
  return (
    <div className="grid">
      <div className="card">
        <div className="card-head">
          <h2>Piani alimentari da stampare</h2>
          <div className="row">
            <select className="select" style={{ width: "auto" }} value={modelloId} onChange={(e) => setModelloId(e.target.value)}>
              {TIPI_MODELLO.filter((t) => modelli.some((m) => m.tipo === t)).map((t) => (
                <optgroup key={t} label={t}>
                  {modelli.filter((m) => m.tipo === t).map((m) => <option key={m.id} value={m.id}>{m.nome}{m.kcal ? ` · ${m.kcal} kcal` : ""}</option>)}
                </optgroup>
              ))}
            </select>
            <button className="btn primary sm" onClick={creaPiano}><Icon.plus /> Nuovo piano dal modello</button>
          </div>
        </div>
        <table className="table">
          <tbody>
            {suoiPiani.map((p) => (
              <tr key={p.id} className="click" onClick={() => vai({ nome: "piano", id: p.id })}>
                <td style={{ fontWeight: 600 }}>{p.titolo}</td>
                <td className="muted">Modello {p.modello}</td>
                <td className="muted num">Consegnato il {fmtData(p.creato)}</td>
                <td style={{ textAlign: "right" }}><span className="badge accent"><Icon.print /> stampabile</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {suoiPiani.length === 0 && <div className="empty">Nessun piano. Scegli un modello e crea il primo.</div>}
      </div>

      <div className="card">
        <div className="card-head"><h2>Diete a griglia (giorni × pasti)</h2><button className="btn sm" onClick={crea}><Icon.plus /> Nuova dieta</button></div>
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
        {sue.length === 0 && <div className="empty">Nessuna dieta a griglia.</div>}
      </div>
    </div>
  );
}

function Privacy({ c, aggiorna }: { c: Cliente; aggiorna: (f: (c: Cliente) => Cliente) => void }) {
  const { toast, setClienti, setAppuntamenti, setPiani, setDiete, vai } = useStore();
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
              <button className="btn sm" onClick={() => void apriStampa({ tipo: "privacy", id: c.id, titolo: `Modulo privacy – ${c.nome} ${c.cognome}` })}><Icon.print /> Ristampa il modulo</button>
              <button className="btn sm danger" onClick={annulla}>Annulla la registrazione</button>
            </div>
          </>
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            <div>
              <div className="row"><span className="badge warn">Da firmare</span></div>
              <h3 style={{ margin: "12px 0 4px" }}>1. Stampa il modulo</h3>
              <p className="small muted" style={{ margin: "0 0 8px" }}>Il modulo è già compilato con i dati del cliente. Manca solo la firma.</p>
              <button className="btn primary" onClick={() => void apriStampa({ tipo: "privacy", id: c.id, titolo: `Modulo privacy – ${c.nome} ${c.cognome}` })}><Icon.print /> Stampa modulo</button>
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
        <ConfermaCancellazione c={c} onClose={() => setConferma(false)} onCancella={() => {
          // via anche ciò che è suo (nell'archivio lo fa già la cancellazione a cascata)
          setClienti((l) => l.filter((x) => x.id !== c.id));
          setAppuntamenti((l) => l.filter((x) => x.clienteId !== c.id));
          setPiani((l) => l.filter((x) => x.clienteId !== c.id));
          setDiete((l) => l.filter((x) => x.clienteId !== c.id));
          toast("Cliente cancellato"); vai({ nome: "clienti" });
        }} />
      )}
    </div>
  );
}

/** Modulo stampabile: compare solo in stampa. Il testo è un SEGNAPOSTO. */
export function ModuloPrivacy({ c }: { c: Cliente }) {
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


/** Cancellazione definitiva in due passi: prima la conferma, poi la frase da scrivere. */
function ConfermaCancellazione({ c, onClose, onCancella }: { c: Cliente; onClose: () => void; onCancella: () => void }) {
  const [passo, setPasso] = useState<1 | 2>(1);
  const [frase, setFrase] = useState("");
  const rosso = { background: "var(--danger)", borderColor: "var(--danger)" };
  if (passo === 1)
    return (
      <Modal title="Cancellare il cliente?" onClose={onClose}
        footer={<><button className="btn" onClick={onClose}>Annulla</button><button className="btn primary" style={rosso} onClick={() => setPasso(2)}>Cancella</button></>}>
        <p>Verranno cancellati anagrafica, visite, diete e allegati di <b>{c.nome} {c.cognome}</b>.</p>
        <p className="small muted">Subito dopo, «Annulla» può ancora recuperare anagrafica, visite e diete, ma <b>non i file degli allegati</b>, che vengono tolti dall'archivio. Se vuoi solo toglierlo dalla lista, usa «Archivia».</p>
      </Modal>
    );
  const ok = fraseGiusta(frase);
  return (
    <Modal title="Ultima conferma" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annulla</button><button className="btn primary" style={rosso} disabled={!ok} onClick={onCancella}>Cancella definitivamente</button></>}>
      <p style={{ marginTop: 0 }}>Per cancellare <b>{c.nome} {c.cognome}</b> scrivi qui sotto: <b>{FRASE_CONFERMA}</b></p>
      <input className="input" autoFocus value={frase} placeholder={FRASE_CONFERMA} onChange={(e) => setFrase(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && ok) onCancella(); }} />
    </Modal>
  );
}
