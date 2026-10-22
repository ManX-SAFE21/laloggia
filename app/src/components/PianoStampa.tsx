// Impaginazione del piano alimentare: la stessa per l'anteprima a schermo e per la stampa/PDF (A4).
import { Fragment, ReactNode } from "react";
import "../piano.css";
import { STUDIO, fmtData } from "../data";
import { IMMAGINI_PIANO } from "../immaginiPiano";
import { Cliente, ElementoPiano, PianoAlimentare, SezionePiano } from "../types";
import { Leaf } from "../screens/Lock";

/** Testo con **grassetto**. */
export function Testo({ t }: { t: string }) {
  return <>{t.split("**").map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : <Fragment key={i}>{p}</Fragment>))}</>;
}

export function PianoStampa({ piano, cliente }: { piano: PianoAlimentare; cliente: Cliente }) {
  const sezioni = piano.sezioni.filter((s) => s.inclusa);
  return (
    <article className="piano-doc">
      <Copertina piano={piano} cliente={cliente} sezioni={sezioni} />
      {sezioni.map((s) => <Sezione key={s.id} s={s} />)}
      <Contatti />
    </article>
  );
}

function Copertina({ piano, cliente, sezioni }: { piano: PianoAlimentare; cliente: Cliente; sezioni: SezionePiano[] }) {
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
        <div className="pd-occhiello">{piano.titolo}</div>
        <h1 className="pd-cliente">{cliente.nome} {cliente.cognome}</h1>
        <div className="pd-meta">
          <span>Consegnato il {fmtData(piano.creato)}</span>
          {piano.kcal && <span className="pd-pill">circa {piano.kcal} kcal al giorno</span>}
        </div>
        {cliente.obiettivo && <p className="pd-obiettivo"><span>Obiettivo</span>{cliente.obiettivo}</p>}
      </div>

      {piano.messaggio && <blockquote className="pd-messaggio">{piano.messaggio}<footer>— {STUDIO.professionista}</footer></blockquote>}

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

function Sezione({ s }: { s: SezionePiano }) {
  return (
    <section className={"pd-sezione" + (s.nuovaPagina ? " pd-nuova-pagina" : "") + (s.informativa ? " pd-informativa" : "")}>
      <h2 className="pd-sez-titolo"><span className="pd-sez-ico">{s.icona ?? "•"}</span>{s.titolo}</h2>
      {s.elementi.map((e, i) => <Elemento key={i} e={e} />)}
    </section>
  );
}

function Elemento({ e }: { e: ElementoPiano }): ReactNode {
  switch (e.k) {
    case "testo":
      return <p className="pd-testo"><Testo t={e.testo} /></p>;
    case "avviso":
      return <div className="pd-avviso"><Testo t={e.testo} /></div>;
    case "opzioni":
      return (
        <div className="pd-opzioni">
          {e.titolo && <div className="pd-sottotitolo">{e.titolo}</div>}
          {e.voci.map((o, i) => (
            <div className="pd-opzione" key={i}>
              <div className="pd-num">{i + 1}</div>
              <div className="pd-opz-corpo">
                {(o.titolo || o.frequenza) && (
                  <div className="pd-opz-testa">
                    {o.titolo && <span className="pd-opz-titolo">{o.titolo}</span>}
                    {o.frequenza && <span className="pd-freq">{o.frequenza} a settimana</span>}
                  </div>
                )}
                <div><Testo t={o.testo} /></div>
                {o.nota && <div className="pd-nota"><Testo t={o.nota} /></div>}
              </div>
            </div>
          ))}
        </div>
      );
    case "elenco":
      return (
        <div className="pd-elenco">
          {e.titolo && <div className="pd-sottotitolo">{e.titolo}</div>}
          <ul>{e.voci.map((v, i) => <li key={i}><Testo t={v} /></li>)}</ul>
        </div>
      );
    case "tabella":
      return (
        <table className="pd-tabella">
          <tbody>{e.righe.map(([a, b], i) => <tr key={i}><td><Testo t={a} /></td><td><Testo t={b} /></td></tr>)}</tbody>
        </table>
      );
    case "voci":
      return (
        <dl className="pd-voci">
          {e.voci.map((v, i) => (
            <div key={i} className="pd-voce"><dt>{v.titolo}</dt>{v.testo && <dd><Testo t={v.testo} /></dd>}</div>
          ))}
        </dl>
      );
    case "immagini":
      return (
        <div className="pd-immagini">
          {e.chiavi.map((k) => IMMAGINI_PIANO[k] && <img key={k} src={IMMAGINI_PIANO[k]} alt="" style={{ height: `${e.altezzaMm ?? 25}mm` }} />)}
        </div>
      );
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
