// Scheda "Prima visita": le voci del modulo cartaceo "NUOVO CLIENTE" di Valentina, nello stesso ordine,
// più il retro del foglio (come mangia oggi). Tutto si salva da solo mentre si scrive; Tab passa alla voce dopo.
import { ReactNode, useState } from "react";
import { GRUPPI_FREQUENZA, eta, fmtData, nuovoId, schedaVuota } from "../data";
import { Cliente, SchedaPrimaVisita, Visita } from "../types";

type Agg = (f: (c: Cliente) => Cliente) => void;
type CampoTesto = Exclude<keyof SchedaPrimaVisita, "data" | "vogliaDi" | "giornataTipo" | "frequenze">;

const num = (s: string) => {
  const v = Number(s.replace(",", "."));
  return s.trim() && !isNaN(v) ? v : undefined;
};

const testoDi = (n: number | undefined) => (n == null ? "" : String(n).replace(".", ","));

/** Campo numerico che tiene il testo mentre si scrive ("70," resta "70,"), con la virgola decimale. */
function CampoNumero({ label, unita, valore, onChange }: { label: string; unita: string; valore: number | undefined; onChange: (n: number | undefined) => void }) {
  const [t, setT] = useState(testoDi(valore));
  const [ultimo, setUltimo] = useState(valore);
  if (valore !== ultimo) { // il valore è cambiato da fuori (es. importazione BIA): aggiorna il testo
    setUltimo(valore);
    if (num(t) !== valore) setT(testoDi(valore));
  }
  return (
    <div className="field">
      <label>{label} <span className="muted">({unita})</span></label>
      <input className="input num" inputMode="decimal" value={t} onChange={(e) => { const n = num(e.target.value); setT(e.target.value); setUltimo(n); onChange(n); }} />
    </div>
  );
}

function Blocco({ titolo, nota, children }: { titolo: string; nota?: string; children: ReactNode }) {
  return (
    <div className="card card-pad pv-blocco">
      <h2>{titolo}</h2>
      {nota && <p className="small muted" style={{ margin: "2px 0 10px" }}>{nota}</p>}
      <div className="pv-campi">{children}</div>
    </div>
  );
}

export function PrimaVisita({ c, aggiorna }: { c: Cliente; aggiorna: Agg }) {
  const s = c.primaVisita ?? schedaVuota(c.visite.find((v) => v.tipo === "Prima visita")?.data ?? new Date().toISOString().slice(0, 10));
  const setS = (patch: Partial<SchedaPrimaVisita>) => aggiorna((x) => ({ ...x, primaVisita: { ...(x.primaVisita ?? s), ...patch } }));
  const setAnamnesi = (k: keyof Cliente["anamnesi"], v: string) => aggiorna((x) => ({ ...x, anamnesi: { ...x.anamnesi, [k]: v } }));

  const testo = (k: CampoTesto, label: string, largo = false) => (
    <div className={"field" + (largo ? " pv-largo" : "")}>
      <label>{label}</label>
      <textarea className="textarea pv-auto" rows={1} value={s[k]} onChange={(e) => setS({ [k]: e.target.value })} />
    </div>
  );

  // Misure della prima visita: stanno nella visita "Prima visita" (e nella sua BIA, se c'è), così finiscono nei grafici.
  const pv = c.visite.find((v) => v.tipo === "Prima visita");
  const setMisura = (f: (v: Visita) => Visita) => aggiorna((x) => {
    const esiste = x.visite.find((v) => v.tipo === "Prima visita");
    if (esiste) return { ...x, visite: x.visite.map((v) => (v.id === esiste.id ? f(v) : v)) };
    const nuova: Visita = f({ id: nuovoId("vis"), data: s.data, tipo: "Prima visita", peso: 0 });
    return { ...x, visite: [...x.visite, nuova].sort((a, b) => a.data.localeCompare(b.data)) };
  });
  const nuovaBia = (v: Visita, patch: Partial<NonNullable<Visita["bia"]>>) => ({ dataMisura: v.data, ...v.bia, ...patch });
  const misura = (label: string, valore: number | undefined, set: (n: number | undefined) => void, unita: string) => (
    <CampoNumero label={label} unita={unita} valore={valore} onChange={set} />
  );

  return (
    <div className="grid pv">
      <div className="card card-pad pv-testa">
        <div><span className="muted small">Cognome e nome</span><div className="pv-nome">{c.cognome} {c.nome}</div></div>
        <div><span className="muted small">Età</span><div className="pv-nome">{eta(c.dataNascita)} anni</div></div>
        <div className="field" style={{ width: 180 }}><label>Data del colloquio</label><input className="input" type="date" value={s.data} onChange={(e) => setS({ data: e.target.value })} /></div>
        <p className="small muted" style={{ margin: 0, flexBasis: "100%" }}>Stesso ordine del modulo "Nuovo cliente". Si salva da solo; con Tab si passa alla voce successiva. Le voci vuote vanno bene.</p>
      </div>

      <Blocco titolo="Motivazione e storia del peso">
        {testo("motivazione", "Motivazione alimentazione", true)}
        {testo("andamentoPeso", "Andamento del peso negli anni", true)}
      </Blocco>

      <Blocco titolo="Benessere">
        {testo("intestino", "Intestino")}
        {testo("stomaco", "Stomaco")}
        {testo("fegato", "Fegato")}
        {testo("cervicali", "Cervicali / mal di testa")}
        {testo("tiroide", "Tiroide")}
        {testo("doloriArticolari", "Dolori articolari")}
        {testo("stressUmore", "Stress e umore")}
        <div className="field">
          <label>Fame nervosa</label>
          <div className="row" style={{ gap: 6 }}>
            <textarea className="textarea pv-auto" rows={1} value={s.fameNervosa} onChange={(e) => setS({ fameNervosa: e.target.value })} />
            <textarea className="textarea pv-auto" rows={1} placeholder="Quando" value={s.fameNervosaQuando} onChange={(e) => setS({ fameNervosaQuando: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Voglia di dolce – salato</label>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {(["Dolce", "Salato", "Entrambi", "Nessuna"] as const).map((v) => (
              <button key={v} type="button" className={"day-chip" + (s.vogliaDi === v ? " active" : "")} onClick={() => setS({ vogliaDi: s.vogliaDi === v ? "" : v })}>{v}</button>
            ))}
          </div>
          <textarea className="textarea pv-auto" rows={1} placeholder="Note" style={{ marginTop: 4 }} value={s.vogliaNote} onChange={(e) => setS({ vogliaNote: e.target.value })} />
        </div>
        {testo("sonno", "Sonno")}
        {testo("energia", "Energia")}
        {testo("urine", "Urine")}
      </Blocco>

      <Blocco titolo="Attività, lavoro, ciclo">
        <div className="field"><label>Attività fisica</label><textarea className="textarea pv-auto" rows={1} value={c.anamnesi.attivitaFisica} onChange={(e) => setAnamnesi("attivitaFisica", e.target.value)} /></div>
        {testo("lavoro", "Lavoro")}
        {testo("possibilitaAttivita", "Possibilità di inserirla")}
        {testo("quanteVolte", "Quante volte")}
        {testo("ciclo", "Ciclo")}
      </Blocco>

      <Blocco titolo="Farmaci e analisi" nota="I referti delle analisi in PDF si aggiungono nella scheda Allegati.">
        <div className="field"><label>Farmaci</label><textarea className="textarea pv-auto" rows={1} value={c.anamnesi.farmaci} onChange={(e) => setAnamnesi("farmaci", e.target.value)} /></div>
        {testo("analisi", "Analisi", true)}
      </Blocco>

      <Blocco titolo="Misure della prima visita" nota={pv ? `Valori della prima visita del ${fmtData(pv.data)}${pv.bia ? " (da BIA)" : ""}: compaiono anche nei grafici.` : "Scrivendo qui si crea la prima visita; con un referto BIA usa «Importa BIA (PDF)»."}>
        <div className="pv-misure">
          {misura("Peso", pv?.peso || undefined, (n) => setMisura((v) => ({ ...v, peso: n ?? 0, ...(v.bia ? { bia: nuovaBia(v, { peso: n }) } : {}) })), "kg")}
          {misura("Altezza", c.altezza, (n) => aggiorna((x) => ({ ...x, altezza: n ?? x.altezza })), "cm")}
          {misura("MG", pv?.bia?.fmPerc ?? pv?.massaGrassa, (n) => setMisura((v) => ({ ...v, massaGrassa: n, ...(v.bia ? { bia: nuovaBia(v, { fmPerc: n }) } : {}) })), "%")}
          {misura("GV (AAT, da confermare)", pv?.bia?.aat, (n) => setMisura((v) => ({ ...v, bia: nuovaBia(v, { aat: n }) })), "cm²")}
          {misura("H₂O", pv?.bia?.tbwPerc, (n) => setMisura((v) => ({ ...v, bia: nuovaBia(v, { tbwPerc: n }) })), "%")}
        </div>
      </Blocco>

      <Blocco titolo="Obiettivo">
        <div className="field pv-largo"><label>Obiettivo</label><input className="input" value={c.obiettivo} onChange={(e) => aggiorna((x) => ({ ...x, obiettivo: e.target.value }))} /></div>
        <div className="pv-misure">
          {misura("Peso teorico", c.pesoTeorico, (n) => aggiorna((x) => ({ ...x, pesoTeorico: n })), "kg")}
          {misura("Fabbisogno alimentazione", c.fabbisogno, (n) => aggiorna((x) => ({ ...x, fabbisogno: n })), "kcal/giorno")}
        </div>
      </Blocco>

      <Blocco titolo="Alimentazione attuale (retro del foglio)" nota="Come mangia oggi: giornata tipo e quante volte a settimana. Si compila alla prima visita.">
        <div className="pv-largo">
          <table className="table pv-giornata">
            <thead><tr><th style={{ width: 150 }}>Momento</th><th style={{ width: 110 }}>Ora</th><th>Cosa mangia o beve</th></tr></thead>
            <tbody>
              {s.giornataTipo.map((r, i) => (
                <tr key={r.momento}>
                  <td style={{ fontWeight: 600 }}>{r.momento}</td>
                  <td><input className="input" type="time" value={r.ora} onChange={(e) => setS({ giornataTipo: s.giornataTipo.map((x, k) => (k === i ? { ...x, ora: e.target.value } : x)) })} /></td>
                  <td><textarea className="textarea pv-auto" rows={1} value={r.testo} onChange={(e) => setS({ giornataTipo: s.giornataTipo.map((x, k) => (k === i ? { ...x, testo: e.target.value } : x)) })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pv-largo">
          <div className="small" style={{ fontWeight: 600, margin: "10px 0 6px" }}>Volte a settimana <span className="muted" style={{ fontWeight: 400 }}>(elenco dei gruppi da confermare con Valentina)</span></div>
          <div className="pv-frequenze">
            {GRUPPI_FREQUENZA.map((g) => {
              const n = s.frequenze[g];
              const set = (v: number | undefined) => setS({ frequenze: { ...s.frequenze, [g]: v as number } });
              return (
                <div key={g} className={"pv-freq" + (n == null ? " vuota" : "")}>
                  <span>{g}</span>
                  <div className="row" style={{ gap: 4 }}>
                    <button className="btn sm" onClick={() => set(Math.max(0, (n ?? 0) - 1))}>−</button>
                    <b className="num" style={{ minWidth: 22, textAlign: "center" }}>{n ?? "–"}</b>
                    <button className="btn sm" onClick={() => set(Math.min(21, (n ?? 0) + 1))}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {testo("noteAlimentazione", "Note sull'alimentazione", true)}
      </Blocco>

      <Blocco titolo="In più (non presenti nel modulo)" nota="Da confermare con Valentina se servono: nel suo foglio non ci sono.">
        <div className="field"><label>Allergie e intolleranze</label><textarea className="textarea pv-auto" rows={1} value={c.anamnesi.allergieIntolleranze} onChange={(e) => setAnamnesi("allergieIntolleranze", e.target.value)} /></div>
        <div className="field"><label>Patologie e condizioni</label><textarea className="textarea pv-auto" rows={1} value={c.anamnesi.patologie} onChange={(e) => setAnamnesi("patologie", e.target.value)} /></div>
        {c.anamnesi.abitudini && <div className="field pv-largo"><label>Abitudini (campo del vecchio mockup)</label><textarea className="textarea pv-auto" rows={1} value={c.anamnesi.abitudini} onChange={(e) => setAnamnesi("abitudini", e.target.value)} /></div>}
      </Blocco>
    </div>
  );
}
