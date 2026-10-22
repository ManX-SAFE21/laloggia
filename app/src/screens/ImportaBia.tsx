import { useState } from "react";
import { ChiaveBia, RisultatoBia, VOCI_BIA, avvisiPaziente } from "../bia";
import { leggiBiaDaFile } from "../bia-pdf";
import { Modal } from "../components/ui";
import { fmtData, nuovoId } from "../data";
import { Bia, Cliente, TipoVisita, Visita } from "../types";

type Fase = { tipo: "scelta" } | { tipo: "lettura" } | { tipo: "errore"; msg: string } | { tipo: "anteprima"; r: RisultatoBia; file: File };

/** Importa un referto BIA in PDF nella scheda del cliente, con anteprima e conferma. */
export function ImportaBia({ c, onClose, onConferma }: {
  c: Cliente;
  onClose: () => void;
  onConferma: (aggiorna: (c: Cliente) => Cliente, messaggio: string) => void;
}) {
  const [fase, setFase] = useState<Fase>({ tipo: "scelta" });

  const scegli = async (file?: File) => {
    if (!file) return;
    setFase({ tipo: "lettura" });
    try {
      const r = await leggiBiaDaFile(file);
      if (!r.bia.dataMisura && Object.keys(r.bia).length <= 1)
        setFase({ tipo: "errore", msg: "Nel file non è stato riconosciuto nessun valore BIA. È un referto BioTekna BIA-ACC?" });
      else setFase({ tipo: "anteprima", r, file });
    } catch {
      setFase({ tipo: "errore", msg: "Il file non si apre come PDF." });
    }
  };

  if (fase.tipo === "anteprima") return <Anteprima c={c} r={fase.r} file={fase.file} onClose={onClose} onConferma={onConferma} onIndietro={() => setFase({ tipo: "scelta" })} />;

  return (
    <Modal title="Importa analisi BIA" onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>
        Scegli il referto PDF creato dal software BioTekna. Il file viene letto su questo computer, senza internet.
        Prima di salvare vedrai tutti i valori trovati.
      </p>
      <label className="btn primary" style={{ display: "inline-flex" }}>
        Scegli il PDF…
        <input type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={(e) => scegli(e.target.files?.[0])} />
      </label>
      {fase.tipo === "lettura" && <p className="small">Lettura del referto…</p>}
      {fase.tipo === "errore" && <p className="err">{fase.msg}</p>}
    </Modal>
  );
}

function Anteprima({ c, r, file, onClose, onConferma, onIndietro }: {
  c: Cliente; r: RisultatoBia; file: File;
  onClose: () => void; onConferma: (aggiorna: (c: Cliente) => Cliente, messaggio: string) => void; onIndietro: () => void;
}) {
  const trovate = VOCI_BIA.filter((v) => r.bia[v.key] != null);
  const mancanti = VOCI_BIA.filter((v) => r.mancanti.includes(v.key));
  const avvisi = avvisiPaziente(r.paziente, c);

  const [sel, setSel] = useState<Partial<Record<ChiaveBia, boolean>>>(() => Object.fromEntries(trovate.map((v) => [v.key, v.scheda])));
  const [val, setVal] = useState<Partial<Record<ChiaveBia, string>>>(() => Object.fromEntries(trovate.map((v) => [v.key, String(r.bia[v.key]).replace(".", ",")])));
  const [data, setData] = useState(r.bia.dataMisura);
  const [tipo, setTipo] = useState<TipoVisita>(c.visite.length === 0 ? "Prima visita" : "Controllo");
  const esistente = c.visite.find((v) => v.data === data);
  const [modo, setModo] = useState<"aggiorna" | "nuova">("aggiorna");
  const storicoNuovo = r.storico.filter((s) => !c.visite.some((v) => v.data === s.data));
  const [storico, setStorico] = useState(false);
  const [allega, setAllega] = useState(true);
  const [okAltroPaziente, setOkAltroPaziente] = useState(false);

  // Dati del cliente: proposti, spuntati solo se il cliente non ha ancora un valore.
  const proposte = [
    { k: "altezza" as const, label: "Altezza", unit: "cm", nuovo: r.bia.altezza, attuale: c.altezza },
    { k: "pesoTeorico" as const, label: "Peso teorico", unit: "kg", nuovo: r.bia.pesoIdeale, attuale: c.pesoTeorico },
    { k: "fabbisogno" as const, label: "Fabbisogno (24EE, da confermare)", unit: "kcal/giorno", nuovo: r.bia.ee24, attuale: c.fabbisogno },
  ].filter((p) => p.nuovo != null && p.nuovo !== p.attuale);
  const [agg, setAgg] = useState<Record<string, boolean>>(() => Object.fromEntries(proposte.map((p) => [p.k, !p.attuale])));

  const n = (s?: string) => (s && s.trim() ? Number(s.replace(",", ".")) : undefined);
  const valoriOk = trovate.every((v) => !sel[v.key] || (n(val[v.key]) != null && !isNaN(n(val[v.key])!)));
  const puoSalvare = !!data && valoriOk && (avvisi.length === 0 || okAltroPaziente);

  const conferma = () => {
    const bia: Bia = { dataMisura: data, ora: r.bia.ora, fonte: file.name };
    for (const v of trovate) if (sel[v.key]) bia[v.key] = n(val[v.key]);

    onConferma((x) => {
      let visite = [...x.visite];
      const stessaData = visite.find((v) => v.data === data);
      if (stessaData && modo === "aggiorna") {
        visite = visite.map((v) => (v.id === stessaData.id ? { ...v, peso: bia.peso ?? v.peso, massaGrassa: bia.fmPerc ?? v.massaGrassa, bia } : v));
      } else {
        const ultima = visite[visite.length - 1];
        visite.push({ id: nuovoId("vis"), data, tipo, peso: bia.peso ?? ultima?.peso ?? 0, massaGrassa: bia.fmPerc, bia });
      }
      if (storico) {
        for (const s of storicoNuovo) {
          visite.push({
            id: nuovoId("vis"), data: s.data, tipo: "Controllo", peso: s.peso ?? 0, massaGrassa: s.fmPerc,
            bia: { dataMisura: s.data, fonte: `Storico del referto ${file.name}`, peso: s.peso, fmPerc: s.fmPerc, pha: s.pha },
            note: "Dallo storico del referto BIA",
          } satisfies Visita);
        }
      }
      visite.sort((a, b) => a.data.localeCompare(b.data));
      if (x.visite.length === 0 && visite.length > 0) visite[0] = { ...visite[0], tipo: "Prima visita" };

      const y: Cliente = { ...x, visite };
      for (const p of proposte) if (agg[p.k]) (y as unknown as Record<string, number | undefined>)[p.k] = p.nuovo;
      if (allega) y.allegati = [...y.allegati, { id: nuovoId("al"), nome: file.name, tipo: "pdf", data, dimensioneKb: Math.round(file.size / 1024) }];
      return y;
    }, `Analisi BIA del ${fmtData(data)} importata`);
  };

  return (
    <Modal title="Importa analisi BIA: controlla i valori" onClose={onClose} largo
      footer={<>
        <button className="btn" onClick={onIndietro}>Altro file…</button>
        <button className="btn" onClick={onClose}>Annulla</button>
        <button className="btn primary" disabled={!puoSalvare} onClick={conferma}>Salva nella scheda</button>
      </>}>
      <div className="bia-anteprima">
        <p className="small muted" style={{ marginTop: 0 }}>
          File: <b>{file.name}</b> · referto del {r.bia.dataMisura ? fmtData(r.bia.dataMisura) : "?"}{r.bia.ora ? ` ore ${r.bia.ora}` : ""} ·
          paziente nel referto: <b>{r.paziente.nome ?? "?"}</b>{r.paziente.dataNascita ? `, nato/a il ${fmtData(r.paziente.dataNascita)}` : ""}
        </p>

        {avvisi.length > 0 && (
          <div className="bia-avviso">
            <b>Attenzione: il referto potrebbe non essere di {c.nome} {c.cognome}.</b>
            <ul>{avvisi.map((a) => <li key={a}>{a}</li>)}</ul>
            <label className="row small"><input type="checkbox" checked={okAltroPaziente} onChange={(e) => setOkAltroPaziente(e.target.checked)} /> Ho controllato: importa comunque in questa scheda</label>
          </div>
        )}

        <div className="grid g2">
          <div className="field"><label>Data della visita</label><input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          {esistente ? (
            <div className="field"><label>C'è già una visita il {fmtData(data)}</label>
              <select className="select" value={modo} onChange={(e) => setModo(e.target.value as "aggiorna" | "nuova")}>
                <option value="aggiorna">Aggiungi la BIA a quella visita</option>
                <option value="nuova">Crea un'altra visita</option>
              </select>
            </div>
          ) : (
            <div className="field"><label>Tipo di visita</label>
              <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoVisita)}><option>Prima visita</option><option>Controllo</option></select>
            </div>
          )}
        </div>

        <table className="table bia-tabella">
          <thead><tr><th style={{ width: 30 }}></th><th>Valore</th><th style={{ width: 120 }}>Letto</th><th>Unità</th></tr></thead>
          <tbody>
            {trovate.map((v) => (
              <tr key={v.key} className={sel[v.key] ? "" : "spento"}>
                <td><input type="checkbox" checked={!!sel[v.key]} onChange={(e) => setSel({ ...sel, [v.key]: e.target.checked })} /></td>
                <td>{v.label}{v.scheda && <span className="badge accent" style={{ marginLeft: 6 }}>scheda</span>}</td>
                <td><input className="input num" value={val[v.key] ?? ""} onChange={(e) => setVal({ ...val, [v.key]: e.target.value })} /></td>
                <td className="small muted">{v.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row small" style={{ gap: 12, margin: "6px 0 0" }}>
          <button className="btn ghost sm" onClick={() => setSel(Object.fromEntries(trovate.map((v) => [v.key, true])))}>Spunta tutti</button>
          <button className="btn ghost sm" onClick={() => setSel(Object.fromEntries(trovate.map((v) => [v.key, v.scheda])))}>Solo quelli della scheda</button>
        </div>
        {mancanti.length > 0 && <p className="small" style={{ color: "var(--warn)" }}>Non trovati nel referto: {mancanti.map((v) => `${v.label} (${v.unit})`).join(", ")}. Si possono aggiungere a mano nella visita.</p>}

        {proposte.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>Aggiorna anche i dati del cliente</div>
            {proposte.map((p) => (
              <label key={p.k} className="row small" style={{ fontWeight: 400 }}>
                <input type="checkbox" checked={!!agg[p.k]} onChange={(e) => setAgg({ ...agg, [p.k]: e.target.checked })} />
                {p.label}: {p.nuovo?.toLocaleString("it-IT")} {p.unit}{p.attuale != null ? ` (ora ${p.attuale.toLocaleString("it-IT")})` : " (ora vuoto)"}
              </label>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          {storicoNuovo.length > 0 && (
            <label className="row small" style={{ fontWeight: 400 }}>
              <input type="checkbox" checked={storico} onChange={(e) => setStorico(e.target.checked)} />
              Importa anche lo storico del referto: {storicoNuovo.map((s) => fmtData(s.data)).join(", ")} (peso, MG, angolo di fase)
            </label>
          )}
          <label className="row small" style={{ fontWeight: 400 }}>
            <input type="checkbox" checked={allega} onChange={(e) => setAllega(e.target.checked)} />
            Allega il PDF alla scheda (nel programma vero sarà salvato cifrato)
          </label>
        </div>
      </div>
    </Modal>
  );
}
