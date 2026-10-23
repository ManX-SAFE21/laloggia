import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { Icon } from "../components/ui";
import { PianoStampa } from "../components/PianoStampa";
import { fmtData } from "../data";
import { Cliente, ElementoPiano, OpzionePiano, PianoAlimentare, SezionePiano } from "../types";

/** Piano del cliente: l'editor comune con la data di consegna e il ritorno alla scheda cliente. */
export function PianoEditor({ id }: { id: string }) {
  const { piani, setPiani, clienti, vai } = useStore();
  const piano = piani.find((p) => p.id === id);
  const cliente = clienti.find((c) => c.id === piano?.clienteId);
  if (!piano || !cliente) return <div className="page">Piano non trovato</div>;
  const aggiorna = (f: (p: PianoAlimentare) => PianoAlimentare) => setPiani((l) => l.map((x) => (x.id === id ? f(x) : x)));
  return (
    <EditorPiano piano={piano} cliente={cliente} aggiorna={aggiorna}
      intestazione={<>
        <button className="btn ghost sm" style={{ marginBottom: 8, paddingLeft: 0 }} onClick={() => vai({ nome: "cliente", id: cliente.id, tab: "diete" })}><Icon.back /> {cliente.nome} {cliente.cognome}</button>
        <div>
          <h1>Piano alimentare</h1>
          <p>Dal modello «{piano.modello}» · creato il {fmtData(piano.creato)} · le modifiche valgono solo per questo cliente, il modello non cambia</p>
        </div>
      </>}
      riassunto={`consegna ${fmtData(piano.creato)}`}
      campiInPiu={<div className="field"><label>Data di consegna</label><input className="input" type="date" value={piano.creato} onChange={(e) => aggiorna((p) => ({ ...p, creato: e.target.value }))} /></div>}
    />
  );
}

/** Editor comune di piani e modelli: sezioni a sinistra, foglio A4 a destra, collegati nei due sensi. */
export function EditorPiano({ piano, cliente, aggiorna: aggiornaEsterno, intestazione, campiInPiu, riassunto }: {
  piano: PianoAlimentare;
  cliente: Cliente;
  aggiorna: (f: (p: PianoAlimentare) => PianoAlimentare) => void;
  intestazione: ReactNode; // a sinistra del pulsante di stampa
  campiInPiu?: ReactNode; // in cima al riquadro dei dati
  riassunto?: string; // riga dei dati principali, col riquadro chiuso
}) {
  const { toast } = useStore();

  // --- Annulla / Ripeti: copie del piano prima di ogni modifica (max PASSI). Scrivere di seguito
  // nello stesso campo (modifiche a meno di UNISCI_MS) vale un solo passo.
  const [passato, setPassato] = useState<PianoAlimentare[]>([]);
  const [futuro, setFuturo] = useState<PianoAlimentare[]>([]);
  const ultimaModifica = useRef(0);
  const [avviso, setAvviso] = useState<string | null>(null); // "Immagine tolta" ecc., con Annulla
  const timerAvviso = useRef<number | undefined>(undefined);
  const aggiorna = (f: (p: PianoAlimentare) => PianoAlimentare) => {
    const dopo = f(piano);
    if (dopo === piano) return;
    const adesso = Date.now();
    if (adesso - ultimaModifica.current > UNISCI_MS || passato.length === 0) setPassato((l) => [...l, piano].slice(-PASSI));
    ultimaModifica.current = adesso;
    setFuturo([]);
    aggiornaEsterno(() => dopo);
    const tolto = cosaTolta(piano, dopo);
    if (tolto) {
      setAvviso(tolto);
      window.clearTimeout(timerAvviso.current);
      timerAvviso.current = window.setTimeout(() => setAvviso(null), 7000);
    }
  };
  const annulla = () => {
    if (!passato.length) return;
    const prec = passato[passato.length - 1];
    setPassato((l) => l.slice(0, -1));
    setFuturo((l) => [piano, ...l].slice(0, PASSI));
    ultimaModifica.current = 0;
    setAvviso(null);
    aggiornaEsterno(() => prec);
  };
  const ripeti = () => {
    if (!futuro.length) return;
    const succ = futuro[0];
    setFuturo((l) => l.slice(1));
    setPassato((l) => [...l, piano].slice(-PASSI));
    ultimaModifica.current = 0;
    aggiornaEsterno(() => succ);
  };
  // Ctrl+Z / Ctrl+Y (e Ctrl+Maiusc+Z). Dentro una casella di testo resta l'annulla normale della casella.
  useEffect(() => {
    const tasti = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); annulla(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); ripeti(); }
    };
    window.addEventListener("keydown", tasti);
    return () => window.removeEventListener("keydown", tasti);
  });
  const [aperta, setAperta] = useState<string | null>(null); // dettagli aperti a sinistra (▸)
  const [selezionata, setSelezionata] = useState<string | null>(null); // segnata sul foglio
  const [datiAperti, setDatiAperti] = useState(false);
  const [attiva, setAttiva] = useState<string | null>(null); // sezione visibile ora nel foglio
  const editorRef = useRef<HTMLElement>(null);
  const foglioRef = useRef<HTMLDivElement>(null);

  // Zoom del foglio a schermo (la stampa resta sempre A4 al 100%). La scelta si ricorda (solo su questo PC).
  const leggi = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
  const [zoom, setZoom] = useState<number>(() => leggi("laloggia.foglio.zoom", 0.82));
  const [adatta, setAdatta] = useState<boolean>(() => leggi("laloggia.foglio.adatta", false));
  const [senzaPannello, setSenzaPannello] = useState<boolean>(() => leggi("laloggia.foglio.senzaPannello", false));
  const [larghezza, setLarghezza] = useState(0);
  useEffect(() => {
    try {
      localStorage.setItem("laloggia.foglio.zoom", JSON.stringify(zoom));
      localStorage.setItem("laloggia.foglio.adatta", JSON.stringify(adatta));
      localStorage.setItem("laloggia.foglio.senzaPannello", JSON.stringify(senzaPannello));
    } catch { /* memoria non disponibile: vale solo finché il programma è aperto */ }
  }, [zoom, adatta, senzaPannello]);
  // Spazio libero per il foglio: misurato subito (adatta, pannello) e a ogni cambio di dimensione della finestra.
  useLayoutEffect(() => {
    const el = foglioRef.current;
    if (!el) return;
    const misura = () => setLarghezza(el.clientWidth);
    misura();
    const ro = new ResizeObserver(misura);
    ro.observe(el);
    window.addEventListener("resize", misura);
    return () => { ro.disconnect(); window.removeEventListener("resize", misura); };
  }, [adatta, senzaPannello]);
  const LARGHEZZA_A4 = (210 * 96) / 25.4; // 210 mm in pixel
  const zoomFoglio = adatta && larghezza ? Math.max(0.4, Math.min(2.5, (larghezza - 24) / LARGHEZZA_A4)) : zoom;
  const cambiaZoom = (passo: number) => {
    setAdatta(false);
    setZoom(Math.round(Math.max(0.5, Math.min(2, zoomFoglio + passo)) * 100) / 100);
  };

  // Mentre si scorre il foglio, si evidenzia a sinistra la sezione che occupa la parte più grande della finestra
  // (quella su cui sta l'occhio). Se a occupare di più è la copertina, non si evidenzia nulla.
  useEffect(() => {
    const main = document.querySelector<HTMLElement>(".main");
    if (!main) return;
    const calcola = () => {
      const vista = main.getBoundingClientRect();
      const visibile = (el: Element) => {
        const r = el.getBoundingClientRect();
        return Math.min(r.bottom, vista.bottom) - Math.max(r.top, vista.top);
      };
      const copertina = foglioRef.current?.querySelector(".pd-copertina");
      let corrente: string | null = null;
      let massimo = copertina ? visibile(copertina) : 0;
      for (const el of foglioRef.current?.querySelectorAll<HTMLElement>("[data-sez]") ?? []) {
        const v = visibile(el);
        if (v > massimo) { massimo = v; corrente = el.dataset.sez ?? null; }
      }
      setAttiva(corrente);
    };
    calcola();
    main.addEventListener("scroll", calcola, { passive: true });
    return () => main.removeEventListener("scroll", calcola);
  }, [piano.sezioni]);

  // Tiene visibile a sinistra la riga di una sezione (l'elenco ha uno scorrimento suo).
  const mostraRiga = (sid: string | null) => {
    const ed = editorRef.current;
    const riga = sid ? ed?.querySelector<HTMLElement>(`[data-riga="${sid}"]`) : null;
    if (!ed || !riga) return;
    const a = ed.getBoundingClientRect(), b = riga.getBoundingClientRect();
    if (b.top < a.top) ed.scrollTop -= a.top - b.top + 8;
    else if (b.top > a.bottom - 60) ed.scrollTop += b.top - a.top - 80;
  };
  useEffect(() => { if (!aperta) mostraRiga(attiva); }, [attiva, aperta]);

  /** Porta il foglio all'inizio della sezione e la fa lampeggiare. */
  const mostraNelFoglio = (s: SezionePiano) => {
    if (!s.inclusa) { toast("Sezione esclusa dalla stampa: spunta la casella per includerla"); return; }
    const main = document.querySelector<HTMLElement>(".main");
    const el = foglioRef.current?.querySelector<HTMLElement>(`[data-sez="${s.id}"]`);
    if (!main || !el) return;
    const meta = main.scrollTop + el.getBoundingClientRect().top - main.getBoundingClientRect().top - 24;
    main.scrollTo({ top: meta, behavior: "smooth" });
    // Se lo scorrimento dolce non parte (finestra non disegnata, animazioni disattivate), salta e basta.
    window.setTimeout(() => { if (Math.abs(main.scrollTop - Math.min(meta, main.scrollHeight - main.clientHeight)) > 4) main.scrollTo({ top: meta }); }, 700);
    el.classList.remove("pd-lampo");
    void el.offsetWidth; // riavvia l'animazione
    el.classList.add("pd-lampo");
    window.setTimeout(() => el.classList.remove("pd-lampo"), 1600);
  };
  const apriChiudi = (s: SezionePiano) => {
    if (aperta === s.id) { setAperta(null); return; }
    setAperta(s.id);
    setSelezionata(s.id);
    mostraNelFoglio(s);
  };
  // Clic su una sezione del foglio: la seleziona (bordo sul foglio, riga accesa a sinistra).
  const selezionaDalFoglio = (sid: string) => {
    setSelezionata(sid);
    window.setTimeout(() => mostraRiga(sid), 0);
  };

  const aggSezione = (sid: string, f: (s: SezionePiano) => SezionePiano) => aggiorna((p) => ({ ...p, sezioni: p.sezioni.map((s) => (s.id === sid ? f(s) : s)) }));
  const sposta = (i: number, d: number) => aggiorna((p) => {
    const s = [...p.sezioni];
    const j = i + d;
    if (j < 0 || j >= s.length) return p;
    [s[i], s[j]] = [s[j], s[i]];
    return { ...p, sezioni: s };
  });

  return (
    <div className="page piano-pagina">
      <div className="no-print">
        <div className="page-head">
          <div>{intestazione}</div>
          <button className="btn primary" onClick={() => window.print()}><Icon.print /> Stampa / Salva PDF</button>
        </div>
      </div>

      <div className={"piano-layout" + (senzaPannello ? " senza-pannello" : "")}>
        <aside className="piano-editor no-print" ref={editorRef}>
          <div className="card card-pad piano-dati">
            <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div className="small muted">Dati del piano</div>
                <div className="piano-dati-riassunto">{[piano.kcal ? `${piano.kcal} kcal` : null, riassunto].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <button className="btn sm" onClick={() => setDatiAperti((v) => !v)}>{datiAperti ? "Chiudi" : "Modifica dati"}</button>
            </div>
            {datiAperti && <div style={{ marginTop: 10 }}>
            {campiInPiu && <div style={{ marginBottom: 8 }}>{campiInPiu}</div>}
            <div className="grid g2">
              <div className="field"><label>Titolo in copertina</label><input className="input" value={piano.titolo} onChange={(e) => aggiorna((p) => ({ ...p, titolo: e.target.value }))} /></div>
              <div className="field"><label>Kcal indicative</label><input className="input" value={piano.kcal ?? ""} onChange={(e) => { const v = Number(e.target.value); aggiorna((p) => ({ ...p, kcal: e.target.value.trim() && !isNaN(v) ? v : undefined })); }} /></div>
            </div>
            <div className="field" style={{ marginTop: 8 }}><label>Messaggio personale in copertina</label><textarea className="textarea" rows={2} value={piano.messaggio ?? ""} onChange={(e) => aggiorna((p) => ({ ...p, messaggio: e.target.value || undefined }))} /></div>
            <p className="small muted" style={{ margin: "8px 0 0" }}>Nel testo, <b>**parola**</b> si stampa in grassetto.</p>
            </div>}
          </div>

          <p className="small muted piano-aiuto">
            <b>Sul foglio:</b> clic sui testi per scriverli; passa il mouse su alternative e immagini per i pulsanti; trascina le immagini (anche dal PC) e le alternative (dal numero). <b>Qui:</b> clic sul nome per andarci, casella per includerla nella stampa, <b>▸</b> per i dettagli
          </p>
          <div className="piano-sezioni">
            {piano.sezioni.map((s, i) => (
              <div key={s.id} data-riga={s.id}
                className={"card piano-sez" + (s.inclusa ? "" : " esclusa") + (attiva === s.id ? " attiva" : "") + (aperta === s.id ? " aperta" : "") + (selezionata === s.id ? " selezionata" : "")}>
                <div className="piano-sez-testa">
                  <input type="checkbox" title="Includi nella stampa" checked={s.inclusa} onChange={(e) => aggSezione(s.id, (x) => ({ ...x, inclusa: e.target.checked }))} />
                  <button className="piano-sez-freccia" aria-expanded={aperta === s.id} title={aperta === s.id ? "Chiudi i dettagli" : "Dettagli della sezione"} onClick={() => apriChiudi(s)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                  <button className="piano-sez-nome" title="Mostra nel foglio" onClick={() => mostraNelFoglio(s)}>
                    <span className="ico">{s.icona}</span>{s.titolo}{s.informativa && <span className="badge" style={{ marginLeft: 6 }}>consigli</span>}
                  </button>
                  <button className="btn ghost sm" title="Sposta su" onClick={() => sposta(i, -1)}>↑</button>
                  <button className="btn ghost sm" title="Sposta giù" onClick={() => sposta(i, 1)}>↓</button>
                </div>
                {aperta === s.id && (
                  <div className="piano-sez-corpo">
                    <div className="grid g2">
                      <div className="field"><label>Titolo</label><input className="input" value={s.titolo} onChange={(e) => aggSezione(s.id, (x) => ({ ...x, titolo: e.target.value }))} /></div>
                      <label className="row small" style={{ alignSelf: "end", fontWeight: 400 }}>
                        <input type="checkbox" checked={!!s.nuovaPagina} onChange={(e) => aggSezione(s.id, (x) => ({ ...x, nuovaPagina: e.target.checked }))} /> Inizia su una pagina nuova
                      </label>
                    </div>
                    {s.elementi.map((el, j) => (
                      <EditorElemento key={j} el={el} onChange={(nuovo) => aggSezione(s.id, (x) => ({ ...x, elementi: x.elementi.map((e2, k) => (k === j ? nuovo : e2)) }))} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        <div className="piano-destra">
        <div className="foglio-barra no-print">
          <button className="btn sm" onClick={() => setSenzaPannello((v) => !v)} title={senzaPannello ? "Riapri l'elenco delle sezioni" : "Nasconde l'elenco delle sezioni e allarga il foglio"}>
            {senzaPannello ? "» Mostra pannello" : "« Nascondi pannello"}
          </button>
          <div className="row" style={{ gap: 4 }}>
            <button className="btn sm" onClick={annulla} title={passato.length ? `Annulla l'ultima modifica (Ctrl+Z) · ${passato.length} passi disponibili` : "Niente da annullare"} style={{ opacity: passato.length ? 1 : 0.45 }}>↶ Annulla</button>
            <button className="btn sm" onClick={ripeti} title={futuro.length ? `Ripeti (Ctrl+Y) · ${futuro.length} passi` : "Niente da ripetere"} style={{ opacity: futuro.length ? 1 : 0.45 }}>↷ Ripeti</button>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <button className="btn sm" title="Rimpicciolisci il foglio" onClick={() => cambiaZoom(-0.1)}>−</button>
            <span className="num foglio-zoom" title="Ingrandimento del foglio a schermo (la stampa resta A4)">{Math.round(zoomFoglio * 100)}%</span>
            <button className="btn sm" title="Ingrandisci il foglio" onClick={() => cambiaZoom(0.1)}>+</button>
            <button className={"btn sm" + (adatta ? " primary" : "")} title="Il foglio occupa tutta la larghezza libera" onClick={() => setAdatta((a) => !a)}>Adatta alla larghezza</button>
          </div>
        </div>
        <div className="piano-anteprima" ref={foglioRef} style={{ ["--zoom-foglio" as string]: zoomFoglio }}>
          <PianoStampa piano={piano} cliente={cliente} onApri={selezionaDalFoglio} aperta={selezionata}
            onCambiaSezione={aggSezione} onCambiaPiano={(patch) => aggiorna((p) => ({ ...p, ...patch }))}
            onSezioni={(f) => aggiorna((p) => ({ ...p, sezioni: f(p.sezioni) }))} />
        </div>
        </div>
      </div>
      {avviso && (
        <div className="avviso-annulla no-print" role="status">
          {avviso}
          <button onClick={annulla}>Annulla</button>
          <button className="chiudi" aria-label="Chiudi" onClick={() => setAvviso(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

const PASSI = 100; // livelli di Annulla
const UNISCI_MS = 800; // modifiche più ravvicinate di così (es. scrivere in un campo) = un solo passo

/** Se la modifica ha tolto qualcosa, il messaggio per l'avviso (con Annulla). */
function cosaTolta(prima: PianoAlimentare, dopo: PianoAlimentare): string | null {
  const conta = (p: PianoAlimentare, k: "immagini" | "opzioni") =>
    p.sezioni.reduce((n, s) => n + s.elementi.reduce((m, e) => m + (e.k === k ? e.voci.length : 0), 0), 0);
  if (conta(dopo, "immagini") < conta(prima, "immagini")) return "Immagine tolta";
  if (conta(dopo, "opzioni") < conta(prima, "opzioni")) return "Alternativa tolta";
  if (dopo.sezioni.length < prima.sezioni.length) return "Sezione tolta";
  return null;
}

function EditorElemento({ el, onChange }: { el: ElementoPiano; onChange: (e: ElementoPiano) => void }) {
  const area = (valore: string, set: (v: string) => void, righe = 3) => <textarea className="textarea" rows={righe} value={valore} onChange={(e) => set(e.target.value)} />;
  switch (el.k) {
    case "testo":
      return <div className="field piano-el"><label>Testo</label>{area(el.testo, (testo) => onChange({ ...el, testo }), 2)}</div>;
    case "avviso":
      return <div className="field piano-el"><label>Riquadro evidenziato</label>{area(el.testo, (testo) => onChange({ ...el, testo }), 3)}</div>;
    case "elenco":
      return (
        <div className="field piano-el">
          <label>{el.titolo ?? "Elenco"} <span className="muted">(una voce per riga)</span></label>
          {area(el.voci.join("\n"), (t) => onChange({ ...el, voci: t.split("\n") }), Math.max(3, el.voci.length))}
        </div>
      );
    case "tabella":
      return (
        <div className="field piano-el">
          <label>Tabella</label>
          {el.righe.map(([a, b], i) => (
            <div key={i} className="grid g2" style={{ gap: 6, marginBottom: 4 }}>
              <input className="input" value={a} onChange={(e) => onChange({ ...el, righe: el.righe.map((r, k) => (k === i ? [e.target.value, r[1]] : r)) })} />
              <input className="input" value={b} onChange={(e) => onChange({ ...el, righe: el.righe.map((r, k) => (k === i ? [r[0], e.target.value] : r)) })} />
            </div>
          ))}
          <div className="row">
            <button className="btn ghost sm" onClick={() => onChange({ ...el, righe: [...el.righe, ["", ""]] })}><Icon.plus /> Riga</button>
            {el.righe.length > 0 && <button className="btn ghost sm" onClick={() => onChange({ ...el, righe: el.righe.slice(0, -1) })}>Togli l'ultima</button>}
          </div>
        </div>
      );
    case "voci":
      return (
        <div className="field piano-el">
          <label>Voci</label>
          {el.voci.map((v, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <input className="input" value={v.titolo} style={{ fontWeight: 600, marginBottom: 3 }} onChange={(e) => onChange({ ...el, voci: el.voci.map((x, k) => (k === i ? { ...x, titolo: e.target.value } : x)) })} />
              {area(v.testo, (testo) => onChange({ ...el, voci: el.voci.map((x, k) => (k === i ? { ...x, testo } : x)) }), 3)}
            </div>
          ))}
        </div>
      );
    case "immagini":
      return <div className="small muted piano-el">Immagini ({el.voci.length}): si cambiano, ridimensionano e spostano direttamente sul foglio.</div>;
    case "opzioni":
      return <EditorOpzioni el={el} onChange={onChange} />;
  }
}

function EditorOpzioni({ el, onChange }: { el: Extract<ElementoPiano, { k: "opzioni" }>; onChange: (e: ElementoPiano) => void }) {
  const set = (i: number, o: OpzionePiano) => onChange({ ...el, voci: el.voci.map((x, k) => (k === i ? o : x)) });
  return (
    <div className="field piano-el">
      <label>{el.titolo ?? "Alternative"}</label>
      {el.voci.map((o, i) => (
        <div key={i} className="piano-opz">
          <div className="row" style={{ gap: 6 }}>
            <span className="piano-opz-num">{i + 1}</span>
            <input className="input" placeholder="Titolo (facoltativo)" value={o.titolo ?? ""} onChange={(e) => set(i, { ...o, titolo: e.target.value || undefined })} />
            <input className="input" style={{ width: 110 }} placeholder="es. 2 volte" value={o.frequenza ?? ""} onChange={(e) => set(i, { ...o, frequenza: e.target.value || undefined })} />
            <button className="btn ghost sm" title="Togli questa alternativa" onClick={() => onChange({ ...el, voci: el.voci.filter((_, k) => k !== i) })}><Icon.x /></button>
          </div>
          <textarea className="textarea" rows={3} value={o.testo} onChange={(e) => set(i, { ...o, testo: e.target.value })} />
          <input className="input" placeholder="Nota (facoltativa)" value={o.nota ?? ""} onChange={(e) => set(i, { ...o, nota: e.target.value || undefined })} />
        </div>
      ))}
      <button className="btn ghost sm" onClick={() => onChange({ ...el, voci: [...el.voci, { testo: "" }] })}><Icon.plus /> Aggiungi alternativa</button>
    </div>
  );
}
