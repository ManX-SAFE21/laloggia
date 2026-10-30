// Scheda "Allegati" del cliente: aggiungere (pulsante o trascinando), aprire dentro il programma,
// salvare una copia, eliminare. I file stanno nel database cifrato (vedi src/allegati.ts).
import { DragEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { OGGI, fmtData, nuovoId } from "../data";
import { useStore } from "../store";
import { Allegato, Cliente } from "../types";
import { Icon, Modal } from "./ui";
import { prossimoZoom } from "../zoomFoglio";
import { MAX_MB_ALLEGATO, base64DaFile, byteDaBase64, controllaFile, esportaAllegato, leggiFileAllegato, mimeDaNome, salvaFileAllegato } from "../allegati";

const dimensione = (kb: number) => (kb >= 1000 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);
const senzaEstensione = (nome: string) => nome.replace(/\.[^.]+$/, "");
export const titoloAllegato = (a: Allegato) => a.descrizione?.trim() || senzaEstensione(a.nome);

/** Testo o data che si cambia con un clic (Invio o clic fuori conferma, Esc annulla). */
function Cambiabile({ valore, mostra, data, salva, suggerimento }: { valore: string; mostra: string; data?: boolean; salva: (v: string) => void; suggerimento: string }) {
  const [attivo, setAttivo] = useState(false);
  if (!attivo) return <span className="cambiabile" title={suggerimento} onClick={(e) => { e.stopPropagation(); setAttivo(true); }}>{mostra}</span>;
  const chiudi = (v: string) => { setAttivo(false); if (v && v !== valore) salva(v); };
  return (
    <input className="input cambiabile-input" type={data ? "date" : "text"} defaultValue={valore} autoFocus
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => chiudi(e.currentTarget.value.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); chiudi(e.currentTarget.value.trim()); }
        if (e.key === "Escape") { e.preventDefault(); setAttivo(false); }
      }} />
  );
}

export function Allegati({ c, aggiorna }: { c: Cliente; aggiorna: (f: (c: Cliente) => Cliente) => void }) {
  const { toast } = useStore();
  const scegli = useRef<HTMLInputElement>(null);
  const [sopra, setSopra] = useState(false); // file trascinato sopra la scheda
  const [aperto, setAperto] = useState<Allegato | null>(null);
  const [daEliminare, setDaEliminare] = useState<string | null>(null);

  const aggiungi = async (files: File[]) => {
    for (const f of files) {
      const ok = controllaFile(f.name, f.size);
      if ("errore" in ok) { toast(ok.errore); continue; }
      try {
        const b64 = await base64DaFile(f);
        const a: Allegato = { id: nuovoId("al"), nome: f.name, descrizione: senzaEstensione(f.name), tipo: ok.tipo, data: OGGI, dimensioneKb: Math.max(1, Math.ceil(f.size / 1024)), conFile: true };
        // prima nella scheda (così il salvataggio automatico lo conosce), poi il file nel database
        aggiorna((x) => ({ ...x, allegati: [...x.allegati, a] }));
        await salvaFileAllegato(c.id, a, b64);
        toast(`Allegato «${f.name}» aggiunto`);
      } catch (e) {
        toast(`«${f.name}» non salvato: ${e}`);
      }
    }
  };

  const rilascia = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setSopra(false);
    void aggiungi([...e.dataTransfer.files]);
  };

  const apri = (a: Allegato) => {
    if (!a.conFile) { toast("Allegato di esempio: non contiene un file"); return; }
    setAperto(a);
  };

  const salvaCopia = async (a: Allegato) => {
    try { if (await esportaAllegato(a.id, a.nome)) toast(`Copia di «${a.nome}» salvata`); }
    catch (e) { toast(`Copia non salvata: ${e}`); }
  };

  const cambia = (id: string, patch: Partial<Allegato>) =>
    aggiorna((x) => ({ ...x, allegati: x.allegati.map((y) => (y.id === id ? { ...y, ...patch } : y)) }));
  const ordinati = [...c.allegati].sort((a, b) => a.data.localeCompare(b.data));

  const elimina = (id: string) => {
    const a = c.allegati.find((x) => x.id === id);
    aggiorna((x) => ({ ...x, allegati: x.allegati.filter((y) => y.id !== id) }));
    setDaEliminare(null);
    if (a) toast(`Allegato «${titoloAllegato(a)}» eliminato`);
  };

  return (
    <div className={"card allegati" + (sopra ? " allegati-sopra" : "")}
      onDragOver={(e) => { if (!e.dataTransfer.types.includes("Files")) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setSopra(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSopra(false); }}
      onDrop={rilascia}>
      <div className="card-head">
        <h2>Allegati</h2>
        <button className="btn sm tenue-salvia" onClick={() => scegli.current?.click()}><Icon.plus /> Aggiungi PDF o foto</button>
        <input ref={scegli} type="file" multiple accept=".pdf,image/png,image/jpeg,image/webp" style={{ display: "none" }}
          onChange={(e) => { void aggiungi([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>
      <table className="table">
        <tbody>
          {ordinati.map((a) => (
            <tr key={a.id} className={a.conFile ? "riga-cliccabile" : ""} title={a.conFile ? "Clic per aprire" : "Allegato di esempio, senza file"} onClick={() => apri(a)}>
              <td style={{ width: 30, color: "var(--ink-2)" }}>{a.tipo === "pdf" ? <Icon.file /> : <Icon.image />}</td>
              <td style={{ width: "100%" }}>
                <Cambiabile valore={titoloAllegato(a)} mostra={titoloAllegato(a)} suggerimento="Clic per scrivere una descrizione"
                  salva={(descrizione) => cambia(a.id, { descrizione })} />
                <div className="muted small">{a.nome}{!a.conFile && " · esempio, senza file"}</div>
              </td>
              <td className="muted num">
                <Cambiabile data valore={a.data} mostra={fmtData(a.data)} suggerimento="Clic per cambiare la data del documento"
                  salva={(data) => cambia(a.id, { data })} />
              </td>
              <td className="muted num" style={{ textAlign: "right", whiteSpace: "nowrap" }}>{dimensione(a.dimensioneKb)}</td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                {daEliminare === a.id ? (
                  <>
                    <span className="small">Eliminare? </span>
                    <button className="btn sm danger" onClick={() => elimina(a.id)}><Icon.cestino /> Sì, elimina</button>{" "}
                    <button className="btn sm primary" onClick={() => setDaEliminare(null)}><Icon.back /> No, tienilo</button>
                  </>
                ) : (
                  <>
                    {a.conFile && <button className="btn sm" onClick={() => void salvaCopia(a)}><Icon.scarica /> Salva una copia…</button>}{" "}
                    <button className="btn sm danger" onClick={() => setDaEliminare(a.id)}><Icon.cestino /> Elimina</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {c.allegati.length === 0 && <div className="empty">Nessun allegato</div>}
      <div className="card-pad small muted" style={{ borderTop: "1px solid var(--line)" }}>
        Puoi anche trascinare qui un PDF o una foto (fino a {MAX_MB_ALLEGATO} MB). Clic sulla descrizione o sulla data per cambiarle. Gli allegati restano cifrati dentro l'archivio e si aprono qui nel programma;
        «Salva una copia…» crea un file normale, non protetto, dove scegli tu.
      </div>
      {aperto && <VisoreAllegato a={aperto} onClose={() => setAperto(null)} onSalvaCopia={() => void salvaCopia(aperto)} />}
    </div>
  );
}

/** Mostra il PDF (pagine disegnate con pdf.js) o la foto, senza creare file sul disco.
 *  «Ingrandisci» = la finestra occupa tutto il programma (la scelta si ricorda); zoom 100% = larghezza della finestra. */
function VisoreAllegato({ a, onClose, onSalvaCopia }: { a: Allegato; onClose: () => void; onSalvaCopia: () => void }) {
  const [b64, setB64] = useState<string | null>(null);
  const [errore, setErrore] = useState("");
  const [pieno, setPieno] = useState(() => { try { return localStorage.getItem(PIENO) === "1"; } catch { return false; } });
  const [zoom, setZoom] = useState(1);
  const [base, setBase] = useState(0); // larghezza utile della finestra, in pixel
  const [naturale, setNaturale] = useState(0); // larghezza vera della foto
  const visore = useRef<HTMLDivElement>(null);
  const pagine = useRef<HTMLDivElement>(null);
  const larghezza = Math.max(200, base) * zoom;

  useEffect(() => { leggiFileAllegato(a.id).then(setB64, (e) => setErrore(String(e))); }, [a.id]);
  useEffect(() => { try { localStorage.setItem(PIENO, pieno ? "1" : "0"); } catch { /* solo una comodità */ } }, [pieno]);
  useEffect(() => {
    const el = visore.current;
    if (!el) return;
    const misura = () => setBase(el.clientWidth - 16);
    misura();
    const ro = new ResizeObserver(misura);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Le pagine si disegnano una volta sola, ben definite; ingrandire cambia solo la larghezza a schermo.
  useEffect(() => {
    for (const t of pagine.current?.querySelectorAll("canvas") ?? []) t.style.width = `${larghezza}px`;
  }, [larghezza]);
  const larghezzaRef = useRef(larghezza);
  larghezzaRef.current = larghezza;

  useEffect(() => {
    if (!b64 || a.tipo !== "pdf" || !pagine.current) return;
    const dove = pagine.current;
    let finito = false;
    let distruggi: (() => void) | undefined;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const caricamento = pdfjs.getDocument({ data: byteDaBase64(b64) });
      distruggi = () => void caricamento.destroy();
      const doc = await caricamento.promise;
      for (let i = 1; i <= doc.numPages && !finito; i++) {
        const pagina = await doc.getPage(i);
        const vista = pagina.getViewport({ scale: PIXEL_PAGINA / pagina.getViewport({ scale: 1 }).width });
        const tela = document.createElement("canvas");
        tela.width = vista.width;
        tela.height = vista.height;
        tela.style.width = `${larghezzaRef.current}px`;
        tela.className = "visore-pagina";
        dove.appendChild(tela);
        await pagina.render({ canvas: tela, viewport: vista }).promise;
      }
    })().catch((e) => setErrore(`Il PDF non si apre: ${e}`));
    return () => { finito = true; distruggi?.(); dove.replaceChildren(); };
  }, [b64, a.tipo]);

  return createPortal(
    <Modal title={titoloAllegato(a)} onClose={onClose} largo pieno={pieno}
      footer={<><button className="btn" onClick={onSalvaCopia}><Icon.scarica /> Salva una copia…</button><button className="btn tenue-salvia" onClick={onClose}><Icon.x /> Chiudi</button></>}>
      <div className="visore-barra">
        <button className="btn sm tenue-salvia" title="Rimpicciolisci" onClick={() => setZoom((z) => prossimoZoom(z, -1, ZOOM_VISORE_MIN, ZOOM_VISORE_MAX))}><Icon.zoomMeno /></button>
        <span className="num foglio-zoom" title="Ingrandimento (100% = larghezza della finestra). Clic: torna a 100%" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</span>
        <button className="btn sm tenue-salvia" title="Ingrandisci il documento" onClick={() => setZoom((z) => prossimoZoom(z, 1, ZOOM_VISORE_MIN, ZOOM_VISORE_MAX))}><Icon.zoomPiu /></button>
        <button className="btn sm tenue-salvia" style={{ marginLeft: "auto" }} title={pieno ? "Torna alla finestra normale" : "La finestra occupa tutto il programma"} onClick={() => setPieno((p) => !p)}>
          {pieno ? <><Icon.riduci /> Riduci</> : <><Icon.espandi /> Ingrandisci</>}
        </button>
      </div>
      {errore && <p className="err">{errore}</p>}
      {!b64 && !errore && <p className="muted">Apertura…</p>}
      <div className="visore" ref={visore}>
        {b64 && a.tipo === "foto" && (
          <img src={`data:${mimeDaNome(a.nome)};base64,${b64}`} alt={a.nome} onLoad={(e) => setNaturale(e.currentTarget.naturalWidth)}
            style={{ width: naturale ? Math.min(naturale, Math.max(200, base)) * zoom : undefined }} />
        )}
        {a.tipo === "pdf" && <div ref={pagine} />}
      </div>
    </Modal>,
    document.body,
  );
}

const PIENO = "laloggia.visore.pieno";
const PIXEL_PAGINA = 1800; // risoluzione a cui si disegna ogni pagina (nitida anche ingrandita)
const ZOOM_VISORE_MIN = 0.5;
const ZOOM_VISORE_MAX = 3;
