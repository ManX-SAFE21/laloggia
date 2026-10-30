// Impaginazione del piano alimentare: la stessa per l'anteprima a schermo e per la stampa/PDF (A4).
// Nell'editor il foglio è modificabile: testi (clic), pulsanti passando il mouse, trascinamento di
// immagini e alternative. Sezioni incluse e ordine si cambiano nel pannello di sinistra.
import { DragEvent, Fragment, KeyboardEvent, ReactNode, createContext, useContext, useMemo, useRef, useState } from "react";
import "../piano.css";
import { STUDIO, fmtData, nuovoId } from "../data";
import { useStore } from "../store";
import { LibreriaImmagini } from "./LibreriaImmagini";
import { DIMENSIONI_IMMAGINE, IMMAGINI_PIANO, srcImmagine } from "../immaginiPiano";
import { Alimento, Cliente, ElementoPiano, OpzionePiano, PianoAlimentare, RigaAlimento, SezionePiano } from "../types";
import { Leaf } from "../screens/Lock";
import { Destinazione, Posizione, inserisciImmagine, spostaAlternativa, spostaImmagine } from "../spostamenti";
import { FONTE_CREA } from "../alimenti";
import { grammiCalcolo, testoRiga } from "../nutrienti";
import { normalizza } from "../listaClienti";
import { Icon } from "./ui";

/** Testo con **grassetto**. */
export function Testo({ t }: { t: string }) {
  return <>{t.split("**").map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : <Fragment key={i}>{p}</Fragment>))}</>;
}

/** Testo che, se c'è salva, diventa modificabile sul posto con un clic. Esc annulla, clic fuori salva,
 *  Ctrl+B mette in grassetto (**…**) la parte selezionata; riga=true: Invio conferma. */
function Modificabile({ t, salva, riga, vuoto = "clic per scrivere" }: { t: string; salva?: (v: string) => void; riga?: boolean; vuoto?: string }) {
  const [attivo, setAttivo] = useState(false);
  if (!salva) return <Testo t={t} />;
  if (attivo) {
    // Chiude la casella e salva solo se il testo è cambiato (Esc chiude senza salvare).
    const chiudi = (v: string) => { setAttivo(false); if (v !== t) salva(v); };
    const tasti = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      if (e.key === "Escape") { e.preventDefault(); chiudi(t); }
      else if (riga && e.key === "Enter") { e.preventDefault(); chiudi(ta.value); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        const { selectionStart: a, selectionEnd: b, value: v } = ta;
        if (a === b) return;
        ta.value = v.slice(0, a) + "**" + v.slice(a, b) + "**" + v.slice(b);
        ta.setSelectionRange(a + 2, b + 2);
      }
    };
    return (
      <textarea className={"pd-input" + (riga ? " riga" : "")} autoFocus defaultValue={t} rows={1}
        onClick={(e) => e.stopPropagation()} onKeyDown={tasti}
        onBlur={(e) => chiudi(e.currentTarget.value)} />
    );
  }
  return (
    <span className="pd-mod" title="Clic per modificare il testo" onClick={() => setAttivo(true)}>
      {t ? <Testo t={t} /> : <em className="pd-vuoto">{vuoto}</em>}
    </span>
  );
}

type CambiaSezione = (sid: string, f: (s: SezionePiano) => SezionePiano) => void;

// --- Trascinamento sul foglio (immagini, alternative, foto dal PC) ---
type Trascinato = { tipo: "img" | "opz"; da: Posizione };
interface Trascina {
  inCorso: Trascinato | null;
  bersaglio: string | null; // dove apparirà la linea verde
  setBersaglio: (k: string | null) => void;
  inizia: (t: Trascinato) => void;
  fine: () => void;
  accettaImmagine: (e: DragEvent) => boolean; // un'immagine del foglio o un file dal PC
  rilascia: (a: Destinazione, e: DragEvent) => void;
  rilasciaAlternativa: (sid: string, el: number, verso: number) => void;
}
const TrascinaCtx = createContext<Trascina | null>(null);
const MAX_MB_FOTO = 5;

/** onApri: a schermo, il clic su una sezione la seleziona. onCambiaSezione / onCambiaPiano / onSezioni:
 *  se presenti, il foglio è modificabile (testi, pulsanti, trascinamento). In stampa non hanno effetto. */
export function PianoStampa({ piano, cliente, onApri, aperta, onCambiaSezione, onCambiaPiano, onSezioni }: {
  piano: PianoAlimentare; cliente: Cliente; onApri?: (id: string) => void; aperta?: string | null;
  onCambiaSezione?: CambiaSezione; onCambiaPiano?: (patch: Partial<Pick<PianoAlimentare, "titolo" | "messaggio">>) => void;
  onSezioni?: (f: (s: SezionePiano[]) => SezionePiano[]) => void;
}) {
  const { setImmagini, toast } = useStore();
  const trascinato = useRef<Trascinato | null>(null);
  const [inCorso, setInCorso] = useState<Trascinato | null>(null);
  const [bersaglio, setBersaglio] = useState<string | null>(null);
  const fine = () => { trascinato.current = null; setInCorso(null); setBersaglio(null); };
  const trascina: Trascina | null = !onSezioni ? null : {
    inCorso, bersaglio, setBersaglio, fine,
    inizia: (t) => { trascinato.current = t; setInCorso(t); },
    accettaImmagine: (e) => trascinato.current?.tipo === "img" || (!trascinato.current && e.dataTransfer.types.includes("Files")),
    rilascia: (a, e) => {
      const t = trascinato.current;
      fine();
      if (t?.tipo === "img") { onSezioni((s) => spostaImmagine(s, t.da, a)); return; }
      if (t) return;
      // Foto trascinate da una cartella di Windows: entrano nella libreria e nel punto scelto.
      const files = [...e.dataTransfer.files];
      const buone = files.filter((f) => /^image\/(png|jpeg|webp)$/.test(f.type) && f.size <= MAX_MB_FOTO * 1024 * 1024);
      if (buone.length < files.length) toast(`Solo immagini PNG, JPG o WebP fino a ${MAX_MB_FOTO} MB`);
      for (const f of buone) {
        const r = new FileReader();
        r.onload = () => {
          const chiave = nuovoId("img");
          setImmagini((x) => ({ ...x, [chiave]: { nome: f.name.replace(/\.[^.]+$/, ""), src: String(r.result) } }));
          onSezioni((s) => inserisciImmagine(s, a, { chiave, mm: 25 }));
        };
        r.readAsDataURL(f);
      }
    },
    rilasciaAlternativa: (sid, el, verso) => {
      const t = trascinato.current;
      fine();
      if (t?.tipo === "opz" && t.da.sid === sid && t.da.el === el) onSezioni((s) => spostaAlternativa(s, t.da, verso));
    },
  };
  const sezioni = piano.sezioni.filter((s) => s.inclusa);
  return (
    <TrascinaCtx.Provider value={trascina}>
      <article className={"piano-doc" + (inCorso ? " pd-in-trascinamento" : "")}>
        <Copertina piano={piano} cliente={cliente} sezioni={sezioni} onCambiaPiano={onCambiaPiano} />
        {sezioni.map((s) => <Sezione key={s.id} s={s} onApri={onApri} aperta={aperta === s.id} onCambiaSezione={onCambiaSezione} />)}
        <Contatti />
      </article>
    </TrascinaCtx.Provider>
  );
}

/** Metà sinistra/destra (immagini) o superiore/inferiore (alternative) dell'elemento sotto il mouse. */
const lato = (e: DragEvent, verticale: boolean) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return verticale ? (e.clientY < r.top + r.height / 2 ? "prima" : "dopo") : (e.clientX < r.left + r.width / 2 ? "prima" : "dopo");
};

function Copertina({ piano, cliente, sezioni, onCambiaPiano }: { piano: PianoAlimentare; cliente: Cliente; sezioni: SezionePiano[]; onCambiaPiano?: (patch: Partial<Pick<PianoAlimentare, "titolo" | "messaggio">>) => void }) {
  return (
    <section className="pd-copertina">
      <div className="pd-marchio">
        <div className="pd-foglia"><Leaf /></div>
        <div>
          <div className="pd-studio">{STUDIO.nome}</div>
          <div className="pd-studio-sub">{STUDIO.sottotitolo}</div>
        </div>
      </div>

      <div className="pd-titolo-blocco">
        <div className="pd-occhiello"><Modificabile t={piano.titolo} riga salva={onCambiaPiano && ((titolo) => onCambiaPiano({ titolo }))} /></div>
        <h1 className="pd-cliente">{cliente.nome} {cliente.cognome}</h1>
        <div className="pd-meta">
          <span>Consegnato il {fmtData(piano.creato)}</span>
          {piano.kcal && <span className="pd-pill">circa {piano.kcal} kcal al giorno</span>}
        </div>
        {cliente.obiettivo && <p className="pd-obiettivo"><span>Obiettivo</span>{cliente.obiettivo}</p>}
      </div>

      {(piano.messaggio || onCambiaPiano) && (
        <blockquote className={"pd-messaggio" + (piano.messaggio ? "" : " pd-solo-schermo")}>
          <Modificabile t={piano.messaggio ?? ""} vuoto="clic per scrivere un messaggio personale" salva={onCambiaPiano && ((m) => onCambiaPiano({ messaggio: m.trim() || undefined }))} />
          {piano.messaggio && <footer>— {STUDIO.professionista}</footer>}
        </blockquote>
      )}

      <div className="pd-indice">
        <div className="pd-indice-titolo">In questo piano</div>
        <ol>
          {sezioni.map((s) => (
            <li key={s.id}><span className="pd-ico">{s.icona ?? "•"}</span>{s.titolo}{s.informativa && <em> · consigli</em>}</li>
          ))}
        </ol>
      </div>

      <Firma />
    </section>
  );
}

function Firma() {
  return (
    <div className="pd-firma">
      <div className="pd-firma-nome">{STUDIO.professionista}</div>
      <div>{STUDIO.qualifica} · {STUDIO.nome} {STUDIO.sottotitolo} · {STUDIO.sede}</div>
      <div className="pd-social">
        <span>✉ {STUDIO.email}</span>
        <span><img src={IMMAGINI_PIANO.instagram} alt="" /> {STUDIO.instagram}</span>
        <span><img src={IMMAGINI_PIANO.facebook} alt="" /> {STUDIO.facebook}</span>
      </div>
    </div>
  );
}

function Sezione({ s, onApri, aperta, onCambiaSezione }: { s: SezionePiano; onApri?: (id: string) => void; aperta?: boolean; onCambiaSezione?: CambiaSezione }) {
  const cambia = onCambiaSezione && ((f: (x: SezionePiano) => SezionePiano) => onCambiaSezione(s.id, f));
  const tr = useContext(TrascinaCtx);
  const qui = `sez:${s.id}`;
  return (
    <section data-sez={s.id}
      onDragOver={tr ? (e) => { if (!tr.accettaImmagine(e)) return; e.preventDefault(); tr.setBersaglio(qui); } : undefined}
      onDrop={tr ? (e) => { if (!tr.accettaImmagine(e)) return; e.preventDefault(); tr.rilascia({ sid: s.id }, e); } : undefined} title={onApri ? "Clic per selezionare questa sezione" : undefined} onClick={onApri ? () => onApri(s.id) : undefined}
      className={"pd-sezione" + (s.nuovaPagina ? " pd-nuova-pagina" : "") + (s.informativa ? " pd-informativa" : "") + (onApri ? " pd-cliccabile" : "") + (aperta ? " pd-aperta" : "") + (tr?.bersaglio === qui ? " pd-drop-sezione" : "")}>
      <h2 className="pd-sez-titolo">
        <span className="pd-sez-ico">{s.icona ?? "•"}</span>
        <Modificabile t={s.titolo} riga salva={cambia && ((titolo) => cambia((x) => ({ ...x, titolo })))} />
      </h2>
      {s.elementi.map((e, i) => {
        // Ogni blocco (testo, elenco, tabella…): un'immagine rilasciata sopra o sotto va in una riga nuova lì.
        const dove = (l: string) => `blk:${s.id}:${i}:${l}`;
        return (
          <div key={i} className={"pd-blocco" + (tr?.bersaglio === dove("prima") ? " pd-drop-sopra" : tr?.bersaglio === dove("dopo") ? " pd-drop-sotto" : "")}
            onDragOver={tr ? (ev) => { if (!tr.accettaImmagine(ev)) return; ev.preventDefault(); ev.stopPropagation(); tr.setBersaglio(dove(lato(ev, true))); } : undefined}
            onDrop={tr ? (ev) => { if (!tr.accettaImmagine(ev)) return; ev.preventDefault(); ev.stopPropagation(); tr.rilascia({ sid: s.id, rigaNuova: lato(ev, true) === "dopo" ? i + 1 : i }, ev); } : undefined}>
            <Elemento e={e} sid={s.id} el={i} cambia={cambia && ((nuovo) => cambia((x) => ({
              ...x,
              elementi: nuovo ? x.elementi.map((e2, k) => (k === i ? nuovo : e2)) : x.elementi.filter((_, k) => k !== i),
            })))} />
          </div>
        );
      })}
      {cambia && <AggiungiImmagine onScegli={(chiave) => cambia((x) => ({ ...x, elementi: [...x.elementi, { k: "immagini", voci: [{ chiave, mm: 25 }] }] }))} />}
    </section>
  );
}

/** Gli alimenti di un'alternativa, nello stile del foglio; nell'editor si aggiungono, si correggono e si tolgono. */
function AlimentiAlternativa({ righe, cambia }: { righe: RigaAlimento[]; cambia?: (r: RigaAlimento[]) => void }) {
  const { alimenti } = useStore();
  return (
    <>
      {righe.length > 0 && (
        <ul className="pd-alimenti">
          {righe.map((r, i) => {
            const a = alimenti.find((x) => x.id === r.alimentoId);
            const buona = !!a && grammiCalcolo(r.quantita) !== null;
            if (!cambia) return <li key={i}>{testoRiga(r, a)}</li>;
            return (
              <li key={i} className={"pd-alimento-riga" + (buona ? "" : " pd-alimento-errore")} title={buona ? undefined : "Questa riga non entra nel calcolo: controlla quantità e alimento"} onClick={ferma}>
                <Modificabile t={r.quantita} riga salva={(q) => { if (q.trim()) cambia(righe.map((x, k) => (k === i ? { ...x, quantita: q.trim() } : x))); }} />
                {" "}{testoRiga({ ...r, quantita: "§" }, a).replace(/^§( g)? /, /\d$/.test(r.quantita.trim()) ? "g " : "")}
                <button className="pd-alimento-via" title="Togli questo alimento" aria-label="Togli questo alimento" onClick={() => cambia(righe.filter((_, k) => k !== i))}><Icon.x /></button>
              </li>
            );
          })}
        </ul>
      )}
      {cambia && <AggiungiAlimento alimenti={alimenti} onAggiungi={(r) => cambia([...righe, r])} />}
    </>
  );
}

/** «+ alimento»: cerca nella lista, poi i grammi (Invio per confermare, Esc per chiudere). */
function AggiungiAlimento({ alimenti, onAggiungi }: { alimenti: Alimento[]; onAggiungi: (r: RigaAlimento) => void }) {
  const [aperto, setAperto] = useState(false);
  const [cerca, setCerca] = useState("");
  const [scelto, setScelto] = useState<Alimento | null>(null);
  const [quantita, setQuantita] = useState("");
  const trovati = useMemo(() => {
    const q = normalizza(cerca.trim());
    if (q.length < 2) return [];
    const trovati = alimenti.filter((a) => !a.nascosto && normalizza(a.nome).includes(q));
    // Prima i nomi che iniziano con ciò che si cerca: «noci» trova Noci prima di Peschenoci.
    return [...trovati.filter((a) => normalizza(a.nome).startsWith(q)), ...trovati.filter((a) => !normalizza(a.nome).startsWith(q))].slice(0, 8);
  }, [cerca, alimenti]);
  const chiudi = () => { setAperto(false); setCerca(""); setScelto(null); setQuantita(""); };
  const valida = grammiCalcolo(quantita) !== null;
  const conferma = () => {
    if (!scelto || !valida) return;
    onAggiungi({ alimentoId: scelto.id, nome: scelto.nome, quantita: quantita.trim() });
    chiudi();
  };
  const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); chiudi(); } };
  if (!aperto) return <button className="btn sm tenue-salvia pd-solo-schermo pd-alimento-piu" onClick={(e) => { e.stopPropagation(); setAperto(true); }}><Icon.plus /> alimento</button>;
  return (
    <div className="pd-alimento-form pd-solo-schermo" onClick={ferma} onKeyDown={esc}>
      {!scelto ? (
        <>
          <input className="input" autoFocus placeholder="Cerca un alimento…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
          {trovati.length > 0 && <div className="pd-alimento-lista">{trovati.map((a) => <button key={a.id} onClick={() => setScelto(a)}>{a.nome}</button>)}</div>}
          {cerca.trim().length >= 2 && trovati.length === 0 && <div className="small muted">Nessun alimento trovato</div>}
        </>
      ) : (
        <div className="row" style={{ gap: 6 }}>
          <input className="input" style={{ width: 80 }} autoFocus placeholder="45 o 40-50" value={quantita} onChange={(e) => setQuantita(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); conferma(); } }} />
          <span>g di {scelto.nome}</span>
          <button className="btn sm primary" disabled={!valida} onClick={conferma}><Icon.plus /> Aggiungi</button>
        </div>
      )}
      <button className="btn sm tenue-sabbia" onClick={chiudi}><Icon.x /> Annulla</button>
    </div>
  );
}

const FREQUENZE = ["1 volta", "1-2 volte", "2 volte", "2-3 volte", "3 volte", "4 volte", "5 volte"];

/** Pulsante (solo a schermo) che apre la libreria e aggiunge un'immagine in fondo alla sezione. */
function AggiungiImmagine({ onScegli }: { onScegli: (chiave: string) => void }) {
  const [libreria, setLibreria] = useState(false);
  return (
    <div className="pd-aggiungi-riga pd-solo-schermo" onClick={(e) => e.stopPropagation()}>
      <button className="pd-aggiungi" onClick={() => setLibreria(true)}>+ Aggiungi immagine</button>
      {libreria && <LibreriaImmagini titolo="Aggiungi un'immagine" onClose={() => setLibreria(false)} onScegli={(k) => { onScegli(k); setLibreria(false); }} />}
    </div>
  );
}

const scambia = <T,>(lista: T[], i: number, d: number): T[] => {
  const l = [...lista];
  const j = i + d;
  if (j < 0 || j >= l.length) return l;
  [l[i], l[j]] = [l[j], l[i]];
  return l;
};
const ferma = (ev: { stopPropagation: () => void }) => ev.stopPropagation();

/** cambia(null) toglie l'elemento dalla sezione (es. l'ultima immagine eliminata). */
function Elemento({ e, sid, el, cambia }: { e: ElementoPiano; sid: string; el: number; cambia?: (nuovo: ElementoPiano | null) => void }): ReactNode {
  const { immagini } = useStore();
  const tr = useContext(TrascinaCtx);
  const [libreriaPer, setLibreriaPer] = useState<number | null>(null); // indice dell'immagine da cambiare
  // M: un testo dell'elemento, modificabile se l'elemento lo è.
  const M = (t: string, set: (v: string) => ElementoPiano, riga = false) => <Modificabile t={t} riga={riga} salva={cambia && ((v) => cambia(set(v)))} />;
  switch (e.k) {
    case "testo":
      return <p className="pd-testo">{M(e.testo, (testo) => ({ ...e, testo }))}</p>;
    case "avviso":
      return <div className="pd-avviso">{M(e.testo, (testo) => ({ ...e, testo }))}</div>;
    case "opzioni": {
      const voce = (i: number, patch: Partial<OpzionePiano>) => ({ ...e, voci: e.voci.map((o, k) => (k === i ? { ...o, ...patch } : o)) });
      return (
        <div className="pd-opzioni">
          {e.titolo && <div className="pd-sottotitolo">{M(e.titolo, (titolo) => ({ ...e, titolo }), true)}</div>}
          {e.voci.map((o, i) => {
            const k = (l: string) => `opz:${sid}:${el}:${i}:${l}`;
            const stessoGruppo = () => tr?.inCorso?.tipo === "opz" && tr.inCorso.da.sid === sid && tr.inCorso.da.el === el;
            return (
            <div key={i}
              className={"pd-opzione" + (cambia ? " pd-con-barra" : "") + (tr?.bersaglio === k("prima") ? " pd-drop-sopra" : tr?.bersaglio === k("dopo") ? " pd-drop-sotto" : "")
                + (tr?.inCorso?.tipo === "opz" && tr.inCorso.da.sid === sid && tr.inCorso.da.el === el && tr.inCorso.da.i === i ? " pd-trascinato" : "")}
              onDragOver={tr ? (ev) => { if (!stessoGruppo()) return; ev.preventDefault(); ev.stopPropagation(); tr.setBersaglio(k(lato(ev, true))); } : undefined}
              onDrop={tr ? (ev) => { if (!stessoGruppo()) return; ev.preventDefault(); ev.stopPropagation(); tr.rilasciaAlternativa(sid, el, lato(ev, true) === "dopo" ? i + 1 : i); } : undefined}>
              <div className={"pd-num" + (tr ? " pd-maniglia" : "")} draggable={!!tr} title={tr ? "Trascina per spostare l'alternativa" : undefined}
                onClick={tr ? ferma : undefined}
                onDragStart={tr ? (ev) => {
                  ev.stopPropagation();
                  ev.dataTransfer.effectAllowed = "move";
                  ev.dataTransfer.setData("text/plain", "alternativa");
                  const riquadro = (ev.currentTarget as HTMLElement).parentElement;
                  if (riquadro) ev.dataTransfer.setDragImage(riquadro, 16, 16);
                  tr.inizia({ tipo: "opz", da: { sid, el, i } });
                } : undefined}
                onDragEnd={tr ? () => tr.fine() : undefined}>{i + 1}</div>
              <div className="pd-opz-corpo">
                {(o.titolo !== undefined || o.frequenza) && (
                  <div className="pd-opz-testa">
                    {o.titolo !== undefined && <span className="pd-opz-titolo">{M(o.titolo, (titolo) => voce(i, { titolo: titolo || undefined }), true)}</span>}
                    {o.frequenza && <span className="pd-freq">{o.frequenza} a settimana</span>}
                  </div>
                )}
                <AlimentiAlternativa righe={o.alimenti ?? []} cambia={cambia && ((alimenti) => cambia(voce(i, { alimenti: alimenti.length ? alimenti : undefined })))} />
                {(o.testo || !o.alimenti?.length || cambia) && <div className={o.testo || !o.alimenti?.length ? "" : "pd-solo-schermo"}>{M(o.testo, (testo) => voce(i, { testo }))}</div>}
                {o.nota !== undefined && <div className="pd-nota">{M(o.nota, (nota) => voce(i, { nota: nota || undefined }))}</div>}
              </div>
              {cambia && (
                <div className="pd-barra pd-solo-schermo" onClick={ferma}>
                  <select value={o.frequenza ?? ""} title="Frequenza settimanale" onChange={(ev) => cambia(voce(i, { frequenza: ev.target.value || undefined }))}>
                    <option value="">frequenza…</option>
                    {[...new Set([...(o.frequenza ? [o.frequenza] : []), ...FREQUENZE])].map((f) => <option key={f}>{f}</option>)}
                  </select>
                  {o.titolo === undefined && <button onClick={() => cambia(voce(i, { titolo: "" }))}>+ titolo</button>}
                  {o.nota === undefined && <button onClick={() => cambia(voce(i, { nota: "" }))}>+ nota</button>}
                  <button title="Sposta su" onClick={() => cambia({ ...e, voci: scambia(e.voci, i, -1) })}>↑</button>
                  <button title="Sposta giù" onClick={() => cambia({ ...e, voci: scambia(e.voci, i, 1) })}>↓</button>
                  <button title="Togli questa alternativa" className="pd-via" onClick={() => cambia({ ...e, voci: e.voci.filter((_, k) => k !== i) })}>✕</button>
                </div>
              )}
            </div>
            );
          })}
          {cambia && (
            <div className="pd-aggiungi-riga pd-solo-schermo" onClick={ferma}>
              <button className="pd-aggiungi" onClick={() => cambia({ ...e, voci: [...e.voci, { testo: "" }] })}>+ Aggiungi alternativa</button>
            </div>
          )}
        </div>
      );
    }
    case "elenco":
      return (
        <div className="pd-elenco">
          {e.titolo && <div className="pd-sottotitolo">{M(e.titolo, (titolo) => ({ ...e, titolo }), true)}</div>}
          <ul>{e.voci.map((v, i) => <li key={i}>{M(v, (nv) => ({ ...e, voci: e.voci.map((x, k) => (k === i ? nv : x)) }))}</li>)}</ul>
        </div>
      );
    case "tabella": {
      const cella = (i: number, c: 0 | 1, v: string) => ({ ...e, righe: e.righe.map((r, k) => (k === i ? (c === 0 ? [v, r[1]] : [r[0], v]) as [string, string] : r)) });
      return (
        <table className="pd-tabella">
          <tbody>{e.righe.map(([a, b], i) => <tr key={i}><td>{M(a, (v) => cella(i, 0, v))}</td><td>{M(b, (v) => cella(i, 1, v))}</td></tr>)}</tbody>
        </table>
      );
    }
    case "voci": {
      const vv = (i: number, patch: Partial<(typeof e.voci)[number]>) => ({ ...e, voci: e.voci.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
      return (
        <dl className="pd-voci">
          {e.voci.map((v, i) => (
            <div key={i} className="pd-voce">
              <dt>{M(v.titolo, (titolo) => vv(i, { titolo }), true)}</dt>
              {(v.testo || cambia) && <dd className={v.testo ? "" : "pd-solo-schermo"}>{M(v.testo, (testo) => vv(i, { testo }))}</dd>}
            </div>
          ))}
        </dl>
      );
    }
    case "immagini": {
      const imm = (i: number, patch: Partial<(typeof e.voci)[number]>) => ({ ...e, voci: e.voci.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
      return (
        <div className="pd-immagini">
          {e.voci.map((v, i) => {
            const src = srcImmagine(v.chiave, immagini);
            const k = (l: string) => `img:${sid}:${el}:${i}:${l}`;
            return (
              <figure key={i}
                className={"pd-img" + (cambia ? " pd-con-barra" : "") + (tr ? " pd-trascinabile" : "")
                  + (tr?.bersaglio === k("prima") ? " pd-drop-prima" : tr?.bersaglio === k("dopo") ? " pd-drop-dopo" : "")
                  + (tr?.inCorso?.tipo === "img" && tr.inCorso.da.sid === sid && tr.inCorso.da.el === el && tr.inCorso.da.i === i ? " pd-trascinato" : "")}
                title={tr ? "Trascina per spostare l'immagine" : undefined}
                draggable={!!tr}
                onDragStart={tr ? (ev) => { ev.stopPropagation(); ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("text/plain", "immagine"); tr.inizia({ tipo: "img", da: { sid, el, i } }); } : undefined}
                onDragEnd={tr ? () => tr.fine() : undefined}
                onDragOver={tr ? (ev) => { if (!tr.accettaImmagine(ev)) return; ev.preventDefault(); ev.stopPropagation(); tr.setBersaglio(k(lato(ev, false))); } : undefined}
                onDrop={tr ? (ev) => { if (!tr.accettaImmagine(ev)) return; ev.preventDefault(); ev.stopPropagation(); tr.rilascia({ sid, el, i: lato(ev, false) === "dopo" ? i + 1 : i }, ev); } : undefined}>
                {src ? <img src={src} alt="" draggable={false} style={{ height: `${v.mm}mm` }} /> : <div className="pd-img-mancante pd-solo-schermo" style={{ height: `${v.mm}mm` }}>immagine non trovata</div>}
                {cambia && (
                  <div className="pd-barra pd-solo-schermo" onClick={ferma}>
                    <button onClick={() => setLibreriaPer(i)}>Cambia</button>
                    {DIMENSIONI_IMMAGINE.map((d) => (
                      <button key={d.nome} className={v.mm === d.mm ? "on" : ""} title={`Altezza ${d.mm} mm`} onClick={() => cambia(imm(i, { mm: d.mm }))}>{d.nome}</button>
                    ))}
                    <button title="Sposta a sinistra" onClick={() => cambia({ ...e, voci: scambia(e.voci, i, -1) })}>←</button>
                    <button title="Sposta a destra" onClick={() => cambia({ ...e, voci: scambia(e.voci, i, 1) })}>→</button>
                    <button title="Togli l'immagine" className="pd-via" onClick={() => cambia(e.voci.length > 1 ? { ...e, voci: e.voci.filter((_, k) => k !== i) } : null)}>✕</button>
                  </div>
                )}
              </figure>
            );
          })}
          {libreriaPer !== null && cambia && (
            <LibreriaImmagini titolo="Cambia immagine" onClose={() => setLibreriaPer(null)}
              onScegli={(chiave) => { cambia(imm(libreriaPer, { chiave })); setLibreriaPer(null); }} />
          )}
        </div>
      );
    }
  }
}

function Contatti() {
  return (
    <section className="pd-chiusura">
      <p>Per qualsiasi dubbio sul piano scrivimi pure: rispondo appena possibile.</p>
      <Firma />
      <div className="pd-fonte-dati">{FONTE_CREA}</div>
    </section>
  );
}
