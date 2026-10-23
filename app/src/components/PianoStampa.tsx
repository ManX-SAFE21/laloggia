// Impaginazione del piano alimentare: la stessa per l'anteprima a schermo e per la stampa/PDF (A4).
// Nell'editor i testi si possono modificare direttamente sul foglio (clic sul testo); la struttura
// (alternative, frequenze, sezioni incluse e ordine) si cambia nel pannello di sinistra.
import { Fragment, KeyboardEvent, ReactNode, useState } from "react";
import "../piano.css";
import { STUDIO, fmtData } from "../data";
import { useStore } from "../store";
import { LibreriaImmagini } from "./LibreriaImmagini";
import { DIMENSIONI_IMMAGINE, IMMAGINI_PIANO, srcImmagine } from "../immaginiPiano";
import { Cliente, ElementoPiano, OpzionePiano, PianoAlimentare, SezionePiano } from "../types";
import { Leaf } from "../screens/Lock";

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

/** onApri: a schermo, il clic su una sezione la apre nella modifica. onCambiaSezione / onCambiaPiano:
 *  se presenti, i testi sono modificabili sul foglio. In stampa non hanno effetto. */
export function PianoStampa({ piano, cliente, onApri, aperta, onCambiaSezione, onCambiaPiano }: {
  piano: PianoAlimentare; cliente: Cliente; onApri?: (id: string) => void; aperta?: string | null;
  onCambiaSezione?: CambiaSezione; onCambiaPiano?: (patch: Partial<Pick<PianoAlimentare, "titolo" | "messaggio">>) => void;
}) {
  const sezioni = piano.sezioni.filter((s) => s.inclusa);
  return (
    <article className="piano-doc">
      <Copertina piano={piano} cliente={cliente} sezioni={sezioni} onCambiaPiano={onCambiaPiano} />
      {sezioni.map((s) => <Sezione key={s.id} s={s} onApri={onApri} aperta={aperta === s.id} onCambiaSezione={onCambiaSezione} />)}
      <Contatti />
    </article>
  );
}

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
  return (
    <section data-sez={s.id} title={onApri ? "Clic per selezionare questa sezione" : undefined} onClick={onApri ? () => onApri(s.id) : undefined}
      className={"pd-sezione" + (s.nuovaPagina ? " pd-nuova-pagina" : "") + (s.informativa ? " pd-informativa" : "") + (onApri ? " pd-cliccabile" : "") + (aperta ? " pd-aperta" : "")}>
      <h2 className="pd-sez-titolo">
        <span className="pd-sez-ico">{s.icona ?? "•"}</span>
        <Modificabile t={s.titolo} riga salva={cambia && ((titolo) => cambia((x) => ({ ...x, titolo })))} />
      </h2>
      {s.elementi.map((e, i) => (
        <Elemento key={i} e={e} cambia={cambia && ((nuovo) => cambia((x) => ({
          ...x,
          elementi: nuovo ? x.elementi.map((e2, k) => (k === i ? nuovo : e2)) : x.elementi.filter((_, k) => k !== i),
        })))} />
      ))}
      {cambia && <AggiungiImmagine onScegli={(chiave) => cambia((x) => ({ ...x, elementi: [...x.elementi, { k: "immagini", voci: [{ chiave, mm: 25 }] }] }))} />}
    </section>
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
function Elemento({ e, cambia }: { e: ElementoPiano; cambia?: (nuovo: ElementoPiano | null) => void }): ReactNode {
  const { immagini } = useStore();
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
          {e.voci.map((o, i) => (
            <div className={"pd-opzione" + (cambia ? " pd-con-barra" : "")} key={i}>
              <div className="pd-num">{i + 1}</div>
              <div className="pd-opz-corpo">
                {(o.titolo !== undefined || o.frequenza) && (
                  <div className="pd-opz-testa">
                    {o.titolo !== undefined && <span className="pd-opz-titolo">{M(o.titolo, (titolo) => voce(i, { titolo: titolo || undefined }), true)}</span>}
                    {o.frequenza && <span className="pd-freq">{o.frequenza} a settimana</span>}
                  </div>
                )}
                <div>{M(o.testo, (testo) => voce(i, { testo }))}</div>
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
          ))}
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
            return (
              <figure key={i} className={"pd-img" + (cambia ? " pd-con-barra" : "")}>
                {src ? <img src={src} alt="" style={{ height: `${v.mm}mm` }} /> : <div className="pd-img-mancante pd-solo-schermo" style={{ height: `${v.mm}mm` }}>immagine non trovata</div>}
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
    </section>
  );
}
