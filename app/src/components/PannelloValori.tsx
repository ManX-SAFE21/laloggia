// Pannello a destra del foglio: valori di ogni alternativa, per pasto, e totale della giornata, in tempo reale.
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../store";
import { Icon, Modal } from "./ui";
import { Valori, percentualiMacro, riepilogoPiano } from "../nutrienti";
import { PianoAlimentare } from "../types";

const forbice = (a: number, b: number, unita: string) => {
  const x = Math.round(a), y = Math.round(b);
  return x === y ? `${x} ${unita}` : `${x} – ${y} ${unita}`;
};
const segno = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

function confronto(min: number, max: number, obiettivo: number) {
  const a = Math.round(min) - obiettivo, b = Math.round(max) - obiettivo;
  return a === b ? `${segno(a)} kcal rispetto a ${obiettivo}` : `da ${segno(a)} a ${segno(b)} rispetto a ${obiettivo}`;
}

const macro = (v: Valori) => `P${Math.round(v.proteine)} C${Math.round(v.carboidrati)} G${Math.round(v.grassi)}`;

/** onVolte: quante volte al giorno si mangia il pasto (es. lo spuntino mattino e pomeriggio). */
export function PannelloValori({ piano, onVolte }: { piano: PianoAlimentare; onVolte: (sid: string, volte: number) => void }) {
  const { alimenti } = useStore();
  const r = useMemo(() => riepilogoPiano(piano, alimenti), [piano, alimenti]);
  const quote = percentualiMacro(r.min, r.max);
  const [info, setInfo] = useState(false);
  return (
    <aside className="valori-pannello no-print">
      <div className="valori-titolo"><Icon.valori /> Valori del piano</div>
      {r.pasti.length === 0 && <p className="small muted">In questo piano non ci sono pasti con alternative.</p>}
      {r.pasti.map((p) => (
        <div key={p.id} className="valori-pasto">
          <div className="valori-pasto-testa">
            <span>{p.titolo}</span>
            <span className="valori-volte" role="group" aria-label="Volte al giorno">
              {[1, 2].map((n) => <button key={n} className={p.volte === n ? "on" : ""} title={`Conta questo pasto ${n === 1 ? "una volta" : "due volte"} al giorno`} onClick={() => onVolte(p.id, n)}>x{n}</button>)}
            </span>
          </div>
          {p.alternative.map((a, i) => (
            <div key={i} className={"valori-riga" + (a.valori ? "" : " vuota")} title={a.titolo}>
              <span className="valori-n">{a.n}</span>
              {a.valori ? <b>{Math.round(a.valori.kcal)} kcal</b> : <span>non calcolata</span>}
              <span className="valori-macro">{a.valori ? macro(a.valori) : ""}</span>
              {a.daControllare && <span className="valori-attenzione">Una riga di questa alternativa non è calcolata: controlla quantità e alimento</span>}
            </div>
          ))}
        </div>
      ))}
      <div className="valori-totale">
        <div className="valori-totale-titolo">Totale giornata</div>
        <div className="valori-kcal">{forbice(r.min.kcal, r.max.kcal, "kcal")}</div>
        {piano.kcal != null && <div className="small">{confronto(r.min.kcal, r.max.kcal, piano.kcal)}</div>}
        <dl>
          <div><dt>Proteine</dt><dd>{forbice(r.min.proteine, r.max.proteine, "g")}</dd></div>
          <div><dt>Carboidrati</dt><dd>{forbice(r.min.carboidrati, r.max.carboidrati, "g")}</dd></div>
          <div><dt>Grassi</dt><dd>{forbice(r.min.grassi, r.max.grassi, "g")}</dd></div>
          <div><dt>Fibra</dt><dd>{forbice(r.min.fibra, r.max.fibra, "g")}</dd></div>
        </dl>
        {quote && <>
          <div className="valori-barra" role="img" aria-label={`Proteine ${quote.proteine}%, carboidrati ${quote.carboidrati}%, grassi ${quote.grassi}%`}>
            <span className="p" style={{ width: `${quote.proteine}%` }} /><span className="c" style={{ width: `${quote.carboidrati}%` }} /><span className="g" style={{ width: `${quote.grassi}%` }} />
          </div>
          <div className="small">P {quote.proteine}% · C {quote.carboidrati}% · G {quote.grassi}%</div>
        </>}
        {r.pastiSenzaValori > 0 && <p className="small valori-nota">{r.pastiSenzaValori === 1 ? "1 pasto ancora senza alimenti non è nel totale." : `${r.pastiSenzaValori} pasti ancora senza alimenti non sono nel totale.`}</p>}
      </div>
      <button className="btn sm tenue-salvia valori-info" onClick={() => setInfo(true)}><Icon.info /> Come si calcola</button>
      {info && createPortal(<ComeSiCalcola onClose={() => setInfo(false)} />, document.body)}
    </aside>
  );
}

/** Le regole del calcolo in nutrienti.ts, spiegate a chi usa il programma. Se cambiano, va cambiato anche questo testo. */
function ComeSiCalcola({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Come si calcolano i valori" onClose={onClose}
      footer={<button className="btn tenue-salvia" onClick={onClose}><Icon.x /> Chiudi</button>}>
      <div className="valori-regole">
        <h3>Ogni alimento</h3>
        <p>Valori per 100 g di parte edibile (CREA o scheda dello studio), in proporzione ai grammi scritti. Con «40-50» si stampa 40-50 e si calcola 45.</p>
        <h3>Ogni alternativa</h3>
        <p>La somma dei suoi alimenti. Il testo libero non si calcola: un'alternativa di solo testo è «non calcolata».</p>
        <h3>Totale giornata: non è una media</h3>
        <p>Va dalla scelta più leggera alla più ricca: il minimo somma l'alternativa più leggera di ogni pasto, il massimo la più ricca.</p>
        <p className="valori-esempio">Colazione 380 o 410 · Pranzo 480 o 520 · Cena 430 o 470<br />Minimo 380 + 480 + 430 = 1290 · Massimo 410 + 520 + 470 = 1400 kcal</p>
        <h3>Cosa non entra nel conto</h3>
        <p>Le frequenze («3 volte a settimana»), gli elenchi «Aggiungere…», i pasti senza alimenti e le alternative «non calcolate».</p>
        <h3>Altre regole</h3>
        <p>x2 conta il pasto due volte nel totale. Proteine, carboidrati, grassi e fibra hanno ciascuno la propria forbice. Le % usano il centro della forbice, con 4, 4 e 9 kcal per grammo. Il confronto usa le «Kcal indicative» dei dati del piano.</p>
        <div className="valori-sospeso">
          <h3>Domande in sospeso, da decidere con Valentina</h3>
          <ul>
            <li><b>Frequenze:</b> se un'alternativa va mangiata 3 volte a settimana e un'altra 1, il totale deve tenerne conto?</li>
            <li><b>Elenchi «Aggiungere…»:</b> le aggiunte a pranzo e cena devono entrare nel calcolo? Oggi il totale può risultare più basso del reale.</li>
            <li><b>Spuntino mattino – pomeriggio:</b> si mangia una o due volte al giorno? Oggi parte da x1.</li>
            <li><b>Grammi:</b> sono della parte che si mangia o dell'alimento intero (la mela con il torsolo)? Oggi contano come parte che si mangia.</li>
            <li><b>Giorni della settimana:</b> il piano cambia da un giorno all'altro? Se sì, servono schede per giorno.</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
