import { useState } from "react";
import { useStore } from "../store";
import { Icon } from "../components/ui";
import { PianoStampa } from "../components/PianoStampa";
import { fmtData } from "../data";
import { ElementoPiano, OpzionePiano, PianoAlimentare, SezionePiano } from "../types";

/** Piano alimentare: modifica a sinistra, anteprima del foglio A4 a destra, stampa o PDF. */
export function PianoEditor({ id }: { id: string }) {
  const { piani, setPiani, clienti, vai } = useStore();
  const piano = piani.find((p) => p.id === id);
  const cliente = clienti.find((c) => c.id === piano?.clienteId);
  const [aperta, setAperta] = useState<string | null>(null);
  if (!piano || !cliente) return <div className="page">Piano non trovato</div>;

  const aggiorna = (f: (p: PianoAlimentare) => PianoAlimentare) => setPiani((l) => l.map((x) => (x.id === id ? f(x) : x)));
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
        <button className="btn ghost sm" style={{ marginBottom: 8, paddingLeft: 0 }} onClick={() => vai({ nome: "cliente", id: cliente.id, tab: "diete" })}><Icon.back /> {cliente.nome} {cliente.cognome}</button>
        <div className="page-head">
          <div>
            <h1>Piano alimentare</h1>
            <p>Modello «{piano.modello}» · creato il {fmtData(piano.creato)} · le modifiche valgono solo per questo cliente</p>
          </div>
          <button className="btn primary" onClick={() => window.print()}><Icon.print /> Stampa / Salva PDF</button>
        </div>
      </div>

      <div className="piano-layout">
        <aside className="piano-editor no-print">
          <div className="card card-pad">
            <div className="field"><label>Titolo in copertina</label><input className="input" value={piano.titolo} onChange={(e) => aggiorna((p) => ({ ...p, titolo: e.target.value }))} /></div>
            <div className="grid g2" style={{ marginTop: 8 }}>
              <div className="field"><label>Data di consegna</label><input className="input" type="date" value={piano.creato} onChange={(e) => aggiorna((p) => ({ ...p, creato: e.target.value }))} /></div>
              <div className="field"><label>Kcal indicative</label><input className="input" value={piano.kcal ?? ""} onChange={(e) => { const v = Number(e.target.value); aggiorna((p) => ({ ...p, kcal: e.target.value.trim() && !isNaN(v) ? v : undefined })); }} /></div>
            </div>
            <div className="field" style={{ marginTop: 8 }}><label>Messaggio personale in copertina</label><textarea className="textarea" rows={2} value={piano.messaggio ?? ""} onChange={(e) => aggiorna((p) => ({ ...p, messaggio: e.target.value || undefined }))} /></div>
            <p className="small muted" style={{ margin: "8px 0 0" }}>Nel testo, <b>**parola**</b> si stampa in grassetto.</p>
          </div>

          <div className="piano-sezioni">
            {piano.sezioni.map((s, i) => (
              <div key={s.id} className={"card piano-sez" + (s.inclusa ? "" : " esclusa")}>
                <div className="piano-sez-testa">
                  <input type="checkbox" title="Includi nella stampa" checked={s.inclusa} onChange={(e) => aggSezione(s.id, (x) => ({ ...x, inclusa: e.target.checked }))} />
                  <button className="piano-sez-nome" onClick={() => setAperta(aperta === s.id ? null : s.id)}>
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

        <div className="piano-anteprima">
          <PianoStampa piano={piano} cliente={cliente} />
        </div>
      </div>
    </div>
  );
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
      return <div className="small muted piano-el">Immagini: {el.chiavi.join(", ")}</div>;
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
