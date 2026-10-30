import { useMemo, useState } from "react";
import { alimentoById, fmtData, iconaDi, nuovoId, totali } from "../data";
import { useStore } from "../store";
import { normalizza } from "../listaClienti";
import { Icon } from "../components/ui";
import { apriStampa } from "../stampa";
import { FONTE_CREA } from "../alimenti";
import { Alimento, Dieta, GIORNI, PASTI, Pasto, VoceDieta } from "../types";

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => n.toFixed(1);

export function DietaEditor({ id }: { id: string }) {
  const { diete, setDiete, clienti, alimenti, vai, toast } = useStore();
  const dieta = diete.find((d) => d.id === id);
  const [giorno, setGiorno] = useState(0);
  if (!dieta) return <div className="page">Dieta non trovata</div>;
  const cliente = clienti.find((c) => c.id === dieta.clienteId)!;

  const aggiorna = (f: (d: Dieta) => Dieta) => setDiete((l) => l.map((d) => (d.id === id ? f(d) : d)));
  const setPasto = (pasto: Pasto, f: (v: VoceDieta[]) => VoceDieta[]) =>
    aggiorna((d) => ({ ...d, settimana: { ...d.settimana, [giorno]: { ...d.settimana[giorno], [pasto]: f(d.settimana[giorno][pasto]) } } }));

  const copiaSuTutti = () => {
    aggiorna((d) => {
      const s = { ...d.settimana };
      for (let g = 0; g < 7; g++) if (g !== giorno) s[g] = Object.fromEntries(PASTI.map((p) => [p, d.settimana[giorno][p].map((x) => ({ ...x, id: nuovoId("v") }))])) as Record<Pasto, VoceDieta[]>;
      return { ...d, settimana: s };
    });
    toast(`${GIORNI[giorno]} copiato su tutta la settimana`);
  };

  const tutteVoci = PASTI.flatMap((p) => dieta.settimana[giorno][p]);
  const tg = totali(alimenti, tutteVoci);
  const kcalMacro = tg.proteine * 4 + tg.carboidrati * 4 + tg.grassi * 9 || 1;
  const pct = (x: number) => (x / kcalMacro) * 100;
  const diff = tg.kcal - dieta.kcalObiettivo;

  return (
    <div className="page">
      <div className="no-print">
        <button className="btn ghost sm" style={{ marginBottom: 8, paddingLeft: 0 }} onClick={() => vai({ nome: "cliente", id: cliente.id, tab: "diete" })}><Icon.back /> {cliente.nome} {cliente.cognome}</button>
        <div className="page-head">
          <div style={{ flex: 1 }}>
            <input className="input" style={{ fontFamily: "var(--font-display)", fontSize: 22, border: 0, padding: 0, background: "transparent", boxShadow: "none" }}
              value={dieta.titolo} onChange={(e) => aggiorna((d) => ({ ...d, titolo: e.target.value }))} />
            <p>Per {cliente.nome} {cliente.cognome} · creata il {fmtData(dieta.creata)}</p>
          </div>
          <div className="row">
            <button className="btn" onClick={copiaSuTutti}>Copia {GIORNI[giorno].toLowerCase()} su tutta la settimana</button>
            <button className="btn primary" onClick={() => void apriStampa({ tipo: "dieta", id: dieta.id, titolo: `Dieta di ${cliente.nome} ${cliente.cognome}` })}><Icon.print /> Stampa / PDF</button>
          </div>
        </div>

        <div className="row" style={{ marginBottom: 14 }}>
          <div className="diet-days">
            {GIORNI.map((g, i) => <button key={g} className={"day-chip" + (i === giorno ? " active" : "")} onClick={() => setGiorno(i)}>{g}</button>)}
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr 280px", alignItems: "start" }}>
          <div className="card">
            {PASTI.map((p) => <PastoBox key={p} pasto={p} voci={dieta.settimana[giorno][p]} set={(f) => setPasto(p, f)} />)}
          </div>

          <div className="grid sticky">
            <div className="card card-pad">
              <div className="stat-label">Totale {GIORNI[giorno].toLowerCase()}</div>
              <div className="stat-value num">{r0(tg.kcal)} kcal</div>
              <div className="row small" style={{ marginTop: 6 }}>
                <span className="muted">Obiettivo</span>
                <input className="input num" style={{ width: 80, padding: "2px 6px", textAlign: "right" }} type="number" value={dieta.kcalObiettivo}
                  onChange={(e) => aggiorna((d) => ({ ...d, kcalObiettivo: Number(e.target.value) || 0 }))} />
                <span className="muted">kcal</span>
              </div>
              <div className={"stat-delta " + (Math.abs(diff) <= 50 ? "delta-down" : "delta-up")} style={{ marginBottom: 14 }}>
                {Math.abs(diff) <= 50 ? "In linea con l'obiettivo" : `${diff > 0 ? "+" : ""}${r0(diff)} kcal rispetto all'obiettivo`}
              </div>
              <div className="macro-bar">
                <span className="m-p" style={{ width: pct(tg.proteine * 4) + "%" }} />
                <span className="m-c" style={{ width: pct(tg.carboidrati * 4) + "%" }} />
                <span className="m-g" style={{ width: pct(tg.grassi * 9) + "%" }} />
              </div>
              <div className="legend" style={{ flexDirection: "column", gap: 4 }}>
                <span><i className="m-p" />Proteine {r0(tg.proteine)} g ({r0(pct(tg.proteine * 4))}%)</span>
                <span><i className="m-c" />Carboidrati {r0(tg.carboidrati)} g ({r0(pct(tg.carboidrati * 4))}%)</span>
                <span><i className="m-g" />Grassi {r0(tg.grassi)} g ({r0(pct(tg.grassi * 9))}%)</span>
              </div>
            </div>
            <div className="card card-pad">
              <div className="field"><label>Note per il cliente</label>
                <textarea className="textarea" style={{ minHeight: 120 }} value={dieta.noteGenerali} onChange={(e) => aggiorna((d) => ({ ...d, noteGenerali: e.target.value }))} />
              </div>
            </div>
            <p className="small muted" style={{ margin: 0 }}>Valori nutrizionali indicativi. Nel programma vero si userà una banca dati ufficiale.</p>
          </div>
        </div>
      </div>

      <StampaDieta alimenti={alimenti} dieta={dieta} nomeCliente={`${cliente.nome} ${cliente.cognome}`} />
    </div>
  );
}

function PastoBox({ pasto, voci, set }: { pasto: Pasto; voci: VoceDieta[]; set: (f: (v: VoceDieta[]) => VoceDieta[]) => void }) {
  const { alimenti } = useStore();
  const [q, setQ] = useState("");
  const t = totali(alimenti, voci);
  const risultati = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const parole = normalizza(s).split(/\s+/).filter(Boolean);
    return alimenti.filter((a) => !a.nascosto && parole.every((p) => normalizza(`${a.nome} ${a.categoria}`).includes(p))).slice(0, 8);
  }, [q, alimenti]);
  const aggiungi = (alimentoId: string) => { set((v) => [...v, { id: nuovoId("v"), alimentoId, grammi: 100 }]); setQ(""); };

  return (
    <div className="meal">
      <div className="meal-head">
        <h3>{pasto}</h3>
        <span className="small muted num">{r0(t.kcal)} kcal · P {r0(t.proteine)} · C {r0(t.carboidrati)} · G {r0(t.grassi)}</span>
      </div>
      {voci.length > 0 && (
        <div className="food-row food-cols"><span>Alimento</span><span style={{ textAlign: "right" }}>Grammi</span><span style={{ textAlign: "right" }}>kcal</span><span style={{ textAlign: "right" }}>P</span><span style={{ textAlign: "right" }}>C</span><span style={{ textAlign: "right" }}>G</span><span /></div>
      )}
      {voci.map((x) => {
        const a = alimentoById(alimenti, x.alimentoId);
        if (!a) return null;
        const f = x.grammi / 100;
        return (
          <div className="food-row" key={x.id}>
            <span><span className="ico">{iconaDi(a)}</span>{a.nome}</span>
            <input className="input num" type="number" value={x.grammi} onChange={(e) => set((v) => v.map((y) => (y.id === x.id ? { ...y, grammi: Number(e.target.value) || 0 } : y)))} />
            <span className="num" style={{ textAlign: "right" }}>{r0(a.kcal * f)}</span>
            <span className="num muted" style={{ textAlign: "right" }}>{r1(a.proteine * f)}</span>
            <span className="num muted" style={{ textAlign: "right" }}>{r1(a.carboidrati * f)}</span>
            <span className="num muted" style={{ textAlign: "right" }}>{r1(a.grassi * f)}</span>
            <button className="icon-btn" title="Rimuovi" onClick={() => set((v) => v.filter((y) => y.id !== x.id))}><Icon.x /></button>
          </div>
        );
      })}
      <div className="food-add">
        <input className="input" placeholder={`Aggiungi alimento a ${pasto.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && risultati[0]) aggiungi(risultati[0].id); if (e.key === "Escape") setQ(""); }} />
        {risultati.length > 0 && (
          <div className="suggest">
            {risultati.map((a) => (
              <button key={a.id} onClick={() => aggiungi(a.id)}><span><span className="ico">{iconaDi(a)}</span>{a.nome}</span><span className="small muted">{a.categoria} · {a.kcal} kcal/100 g</span></button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function StampaDieta({ dieta, nomeCliente, alimenti }: { dieta: Dieta; nomeCliente: string; alimenti: Alimento[] }) {
  return (
    <div className="print-only print-sheet">
      <div style={{ borderBottom: "2px solid #6c7559", paddingBottom: 8, marginBottom: 8 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "#6c7559" }}>La Loggia · Benessere Naturale</div>
        <div>Malo (VI)</div>
      </div>
      <h1>{dieta.titolo}</h1>
      <p>Piano alimentare per <b>{nomeCliente}</b> · {fmtData(dieta.creata)}</p>
      {GIORNI.map((g, i) => (
        <div className="print-day" key={g}>
          <h3>{g}</h3>
          <table>
            <tbody>
              {PASTI.map((p) => (
                <tr key={p}>
                  <th style={{ width: 110 }}>{p}</th>
                  <td>
                    {dieta.settimana[i][p].length === 0 && "—"}
                    {dieta.settimana[i][p].map((x) => {
                      const a = alimentoById(alimenti, x.alimentoId);
                      return a ? (
                        <div className="p-food" key={x.id}><span className="ico">{iconaDi(a)}</span><span className="p-nome">{a.nome}</span><span className="p-g">{x.grammi} g</span></div>
                      ) : null;
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {dieta.noteGenerali && (<><h3 style={{ marginTop: 16 }}>Indicazioni</h3><p>{dieta.noteGenerali}</p></>)}
      <p className="fonte-dati">{FONTE_CREA}</p>
    </div>
  );
}
