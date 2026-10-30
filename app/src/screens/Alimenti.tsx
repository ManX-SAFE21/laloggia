// Alimenti: tabelle CREA (aggiornamento 2019, dati originali inclusi nel programma) + alimenti aggiunti dallo studio.
// Vista semplice (kcal, proteine, carboidrati, grassi); «Dettagli» mostra tutti i valori. Ogni valore si cambia a
// mano; «Ripristina ai dati originali» rimette quelli CREA. Gli alimenti CREA non si cancellano: si nascondono.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ELENCO_ICONE, ICONE_CATEGORIA, iconaDi, nuovoId } from "../data";
import { inTauri, useStore } from "../store";
import { Icon, Modal } from "../components/ui";
import { Alimento, ValoreNutriente } from "../types";
import { normalizza } from "../listaClienti";
import { AlimentoConFonte, FONTE_CREA, GRUPPI, ORIGINE, cambiaValore, mostra, ripristina, senzaFonte } from "../alimenti";

const num = (s: string) => Number(s.replace(",", "."));
const ok = (s: string) => s.trim() !== "" && Number.isFinite(num(s)) && num(s) >= 0;
const MACRO_VISTA: [keyof Alimento & ("kcal" | "proteine" | "carboidrati" | "grassi"), string, string][] = [
  ["kcal", "Energia", "kcal"], ["proteine", "Proteine", "g"], ["carboidrati", "Carboidrati disponibili", "g"], ["grassi", "Lipidi", "g"],
];
const CHIAVE_MACRO: Record<string, string> = { kcal: "energia_kcal", proteine: "proteine", carboidrati: "carboidrati_disponibili", grassi: "lipidi" };
const cifra = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

async function originale(codice: string): Promise<{ alimento: AlimentoConFonte; riferimenti: string[] }> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke("alimento_originale", { codice });
}

export function Alimenti() {
  const { alimenti, setAlimenti, diete, toast } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [nascosti, setNascosti] = useState(false);
  const [soloModificati, setSoloModificati] = useState(false);
  const [aperto, setAperto] = useState<string | null>(null); // id dell'alimento nella scheda
  const [nuovo, setNuovo] = useState(false);

  const categorie = useMemo(() => [...new Set(alimenti.map((a) => a.categoria))].sort((a, b) => a.localeCompare(b)), [alimenti]);
  const dieteConAlimento = (id: string) =>
    diete.filter((d) => Object.values(d.settimana).some((giorno) => Object.values(giorno).flat().some((v) => v.alimentoId === id))).length;

  const lista = useMemo(() => {
    const parole = normalizza(q).split(/\s+/).filter(Boolean);
    return alimenti
      .filter((a) => nascosti || !a.nascosto)
      .filter((a) => !soloModificati || a.modificato)
      .filter((a) => !cat || a.categoria === cat)
      .filter((a) => { const t = normalizza(`${a.nome} ${a.categoria} ${a.codiceCrea ?? ""}`); return parole.every((p) => t.includes(p)); })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alimenti, q, cat, nascosti, soloModificati]);
  const quantiNascosti = alimenti.filter((a) => a.nascosto).length;
  const quantiModificati = alimenti.filter((a) => a.modificato).length;
  const alimentoAperto = alimenti.find((a) => a.id === aperto) ?? null;

  const aggiorna = (id: string, f: (a: Alimento) => Alimento) => setAlimenti((l) => l.map((x) => (x.id === id ? f(x) : x)));

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Alimenti</h1><p>{lista.length} di {alimenti.length} alimenti · valori per 100 g di parte edibile</p></div>
        <button className="btn primary" onClick={() => setNuovo(true)}><Icon.plus /> Nuovo alimento</button>
      </div>

      <div className="row" style={{ marginBottom: 14, flexWrap: "wrap" }}>
        <input className="input" style={{ maxWidth: 360 }} placeholder="Cerca per nome, categoria o codice CREA…" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setQ(""); }} />
        <select className="select" style={{ width: 260 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Tutte le categorie</option>
          {categorie.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={soloModificati} onChange={(e) => setSoloModificati(e.target.checked)} /> Solo modificati ({quantiModificati})</label>
        <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={nascosti} onChange={(e) => setNascosti(e.target.checked)} /> Mostra nascosti ({quantiNascosti})</label>
      </div>

      <div className="card">
        <table className="table tabella-fissa">
          <thead>
            <tr>
              <th>Alimento</th>
              <th style={{ textAlign: "right" }}>kcal</th>
              <th style={{ textAlign: "right" }}>Proteine</th>
              <th style={{ textAlign: "right" }}>Carboidrati</th>
              <th style={{ textAlign: "right" }}>Grassi</th>
              <th>Nelle diete</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => {
              const n = dieteConAlimento(a.id);
              return (
                <tr key={a.id} className={"click" + (a.nascosto ? " riga-nascosta" : "")} onClick={() => setAperto(a.id)}>
                  <td>
                    <div style={{ fontWeight: 600 }}><span className="ico" style={{ fontSize: 22 }}>{iconaDi(a)}</span>{a.nome}
                      {a.modificato && <span className="badge warn" style={{ marginLeft: 6 }}>modificato</span>}
                      {a.fonte === "studio" && <span className="badge" style={{ marginLeft: 6 }}>dello studio</span>}
                      {a.nascosto && <span className="badge" style={{ marginLeft: 6 }}>nascosto</span>}
                    </div>
                    <div className="small muted" style={{ marginLeft: 30 }}>{a.categoria}{a.codiceCrea ? ` · CREA ${a.codiceCrea}` : ""}</div>
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>{cifra(a.kcal)}</td>
                  <td className="num" style={{ textAlign: "right" }}>{cifra(a.proteine)}</td>
                  <td className="num" style={{ textAlign: "right" }}>{cifra(a.carboidrati)}</td>
                  <td className="num" style={{ textAlign: "right" }}>{cifra(a.grassi)}</td>
                  <td className="small muted">{n === 0 ? "—" : `${n} ${n === 1 ? "dieta" : "diete"}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lista.length === 0 && <div className="empty">Nessun alimento trovato</div>}
      </div>
      <p className="small muted">{FONTE_CREA}. Clic su un alimento per vedere e cambiare i valori.</p>

      {alimentoAperto && (
        <SchedaAlimento a={alimentoAperto} usatoIn={dieteConAlimento(alimentoAperto.id)} onClose={() => setAperto(null)}
          onCambia={(f) => aggiorna(alimentoAperto.id, f)}
          onElimina={() => { setAlimenti((l) => l.filter((x) => x.id !== alimentoAperto.id)); setAperto(null); toast("Alimento eliminato"); }} />
      )}
      {nuovo && (
        <FormAlimento iniziale={null} categorie={categorie} esistenti={alimenti} onClose={() => setNuovo(false)}
          onSave={(a) => { setAlimenti((l) => [...l, a]); setNuovo(false); setAperto(a.id); toast("Alimento aggiunto"); }} />
      )}
    </div>
  );
}

/** Un numero che si cambia con un clic (vuoto = dato non disponibile). Invio o clic fuori confermano, Esc annulla. */
function CampoNumero({ valore, testo, onSalva }: { valore?: number; testo: string; onSalva: (v: number | undefined) => void }) {
  const [attivo, setAttivo] = useState(false);
  if (!attivo) return <span className="cambiabile num" title="Clic per cambiare il valore" onClick={() => setAttivo(true)}>{testo}</span>;
  const chiudi = (t: string) => {
    setAttivo(false);
    const s = t.trim();
    if (s === "") { if (valore !== undefined) onSalva(undefined); return; }
    if (!ok(s)) return;
    if (num(s) !== valore) onSalva(num(s));
  };
  return (
    <input className="input cambiabile-input num" style={{ width: 90, minWidth: 0 }} autoFocus inputMode="decimal"
      defaultValue={valore === undefined ? "" : String(valore).replace(".", ",")}
      onBlur={(e) => chiudi(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); chiudi(e.currentTarget.value); }
        if (e.key === "Escape") { e.preventDefault(); setAttivo(false); }
      }} />
  );
}

function SchedaAlimento({ a, usatoIn, onClose, onCambia, onElimina }: {
  a: Alimento; usatoIn: number; onClose: () => void; onCambia: (f: (a: Alimento) => Alimento) => void; onElimina: () => void;
}) {
  const { toast } = useStore();
  const [dettagli, setDettagli] = useState(false);
  const [conferma, setConferma] = useState<"ripristina" | "elimina" | "nascondi" | null>(null);
  const scheda = useRef<HTMLDivElement>(null);
  // Chiudendo i dettagli si torna in cima alla scheda, ai valori principali
  const chiudiDettagli = () => { setDettagli(false); scheda.current?.scrollTo({ top: 0 }); };
  const [icone, setIcone] = useState(false);
  const [fonte, setFonte] = useState<{ alimento: AlimentoConFonte; riferimenti: string[] } | null>(null);
  const crea = a.fonte === "crea" && !!a.codiceCrea;

  // Metodo e referenza di ogni valore: si leggono dal file originale quando si aprono i dettagli
  useEffect(() => {
    if (!dettagli || !crea || !inTauri || fonte) return;
    originale(a.codiceCrea!).then(setFonte, () => {});
  }, [dettagli, crea, a.codiceCrea, fonte]);

  const cambiaMacro = (campo: "kcal" | "proteine" | "carboidrati" | "grassi", v: number | undefined) =>
    onCambia((x) => (x.valori?.some((y) => y.chiave === CHIAVE_MACRO[campo])
      ? cambiaValore(x, CHIAVE_MACRO[campo], v)
      : { ...x, [campo]: v ?? 0, modificato: x.fonte === "crea" ? true : x.modificato }));
  const ripristinaOra = async () => {
    try {
      const o = await originale(a.codiceCrea!);
      onCambia((x) => ripristina(x, senzaFonte(o.alimento)));
      toast(`«${a.nome}»: dati originali CREA ripristinati`);
    } catch (e) { toast(`Ripristino non riuscito: ${e}`); }
    setConferma(null);
  };
  const tooltip = (x: ValoreNutriente) => {
    const o = fonte?.alimento.valori?.find((y) => y.chiave === x.chiave);
    return [x.origine && `Dato ${ORIGINE[x.origine] ?? x.origine}`, o?.metodo, o?.ref !== undefined && fonte?.riferimenti[o.ref]].filter(Boolean).join(" — ");
  };
  const porzione = a.porzione;

  return createPortal(
    <Modal title={a.nome} onClose={onClose} largo
      footer={<>
        <div className="row" style={{ gap: 8, marginRight: "auto" }}>
          {crea && a.modificato && <button className="btn tenue-cielo" onClick={() => setConferma("ripristina")}><Icon.ripristina /> Ripristina ai dati originali</button>}
          {a.nascosto
            ? <button className="btn tenue-sabbia" onClick={() => { onCambia((x) => ({ ...x, nascosto: false })); toast("Alimento di nuovo visibile"); }}><Icon.occhio /> Mostra di nuovo</button>
            : <button className="btn tenue-sabbia" title="Toglie l'alimento dalla lista e dalla ricerca nelle diete" onClick={() => setConferma("nascondi")}><Icon.occhioChiuso /> Nascondi alimento…</button>}
          {!crea && <button className="btn danger" disabled={usatoIn > 0} title={usatoIn > 0 ? "È usato in una dieta: toglilo prima da lì" : undefined} onClick={() => setConferma("elimina")}><Icon.cestino /> Elimina</button>}
        </div>
        <button className="btn primary" onClick={onClose}><Icon.x /> Chiudi la scheda</button>
      </>}>
      <div className="scheda-alimento" ref={scheda}>
        <div className="row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <button className="btn sm" title="Cambia icona" onClick={() => setIcone((v) => !v)}><span style={{ fontSize: 20 }}>{iconaDi(a)}</span></button>
          <span className="muted">{a.categoria}</span>
          {crea && <span className="badge">CREA {a.codiceCrea}</span>}
          {a.fonte === "studio" && <span className="badge">aggiunto dallo studio</span>}
          {a.modificato && <span className="badge warn">modificato a mano</span>}
          {a.nascosto && <span className="badge">nascosto</span>}
        </div>
        {icone && (
          <div className="icon-pick" style={{ marginBottom: 10 }}>
            {ELENCO_ICONE.map((e) => (
              <button type="button" key={e} className={a.icona === e ? "on" : ""} onClick={() => onCambia((x) => ({ ...x, icona: x.icona === e ? undefined : e }))}>{e}</button>
            ))}
          </div>
        )}
        {(a.nomeInglese || porzione) && (
          <p className="small muted" style={{ marginTop: 0 }}>
            {a.nomeInglese && <>{a.nomeInglese} · </>}
            {a.parteEdibile !== undefined && <>parte edibile {a.parteEdibile}% · </>}
            {porzione ? <>porzione {porzione} g</> : null}
          </p>
        )}

        <table className="table valori-alimento">
          <thead><tr><th>Valori principali</th><th style={{ textAlign: "right" }}>per 100 g</th>{porzione ? <th style={{ textAlign: "right" }}>per porzione ({porzione} g)</th> : null}</tr></thead>
          <tbody>
            {MACRO_VISTA.map(([campo, nome, unita]) => (
              <tr key={campo}>
                <td>{nome} ({unita})</td>
                <td style={{ textAlign: "right" }}><CampoNumero valore={a[campo]} testo={cifra(a[campo])} onSalva={(v) => cambiaMacro(campo, v)} /></td>
                {porzione ? <td className="num muted" style={{ textAlign: "right" }}>{cifra((a[campo] * porzione) / 100)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>

        {a.valori && a.valori.length > 0 && !dettagli && (
          <button className="btn sm tenue-salvia" style={{ margin: "12px 0" }} onClick={() => setDettagli(true)}>
            <Icon.giu /> Mostra i dettagli ({a.valori.length} valori: minerali, vitamine, acidi grassi, aminoacidi…)
          </button>
        )}
        {dettagli && (
          <div className="dettagli-barra">
            <span className="small muted">Dettagli: {a.valori?.length} valori</span>
            <button className="btn sm tenue-salvia" onClick={chiudiDettagli}><Icon.su /> Chiudi i dettagli</button>
          </div>
        )}
        {dettagli && a.valori && GRUPPI.map(([g, titolo]) => {
          const righe = a.valori!.filter((x) => x.gruppo === g);
          if (!righe.length) return null;
          const perPorzione = porzione && (g === "macro" || g === "minerali" || g === "vitamine" || g === "altri");
          return (
            <table key={g} className="table valori-alimento" style={{ marginBottom: 10 }}>
              <thead><tr><th>{titolo}</th><th style={{ textAlign: "right" }}>per 100 g</th>{perPorzione ? <th style={{ textAlign: "right" }}>per porzione</th> : null}<th style={{ width: 120 }}>Origine</th></tr></thead>
              <tbody>
                {righe.map((x) => (
                  <tr key={x.chiave}>
                    <td>{x.nome}</td>
                    <td style={{ textAlign: "right" }}>
                      {x.t && x.v === undefined && x.t !== "tr"
                        ? <span>{x.t}</span>
                        : <CampoNumero valore={x.v} testo={mostra(x)} onSalva={(v) => onCambia((y) => cambiaValore(y, x.chiave, v))} />}
                    </td>
                    {perPorzione ? <td className="num muted" style={{ textAlign: "right" }}>{x.v !== undefined ? cifra((x.v * porzione!) / 100) : ""}</td> : null}
                    <td className="small muted" title={tooltip(x)}>{x.origine ? `${x.origine} · ${ORIGINE[x.origine] ?? ""}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
        {dettagli && <button className="btn sm tenue-salvia" style={{ margin: "4px 0 12px" }} onClick={chiudiDettagli}><Icon.su /> Chiudi i dettagli</button>}
        {crea && <p className="small muted" style={{ marginBottom: 0 }}>{FONTE_CREA}. Passa il mouse sull'origine per vedere metodo e riferimento del dato.</p>}
      </div>

      {conferma === "ripristina" && createPortal(
        <Modal title="Ripristinare i dati originali?" onClose={() => setConferma(null)}
          footer={<><button className="btn tenue-sabbia" onClick={() => setConferma(null)}><Icon.x /> Annulla</button><button className="btn tenue-cielo" onClick={() => void ripristinaOra()}><Icon.ripristina /> Ripristina</button></>}>
          <p style={{ margin: 0 }}>Tutti i valori di <b>{a.nome}</b> tornano quelli delle tabelle CREA. Le modifiche fatte a mano si perdono (resta «Annulla» subito dopo).</p>
        </Modal>, document.body)}
      {conferma === "nascondi" && createPortal(
        <Modal title="Nascondere l'alimento?" onClose={() => setConferma(null)}
          footer={<><button className="btn primary" onClick={() => setConferma(null)}><Icon.back /> No, lascialo visibile</button>
            <button className="btn tenue-sabbia" onClick={() => { onCambia((x) => ({ ...x, nascosto: true })); setConferma(null); toast("Alimento nascosto: lo ritrovi con «Mostra nascosti»"); }}><Icon.occhioChiuso /> Sì, nascondi</button></>}>
          <p style={{ marginTop: 0 }}><b>{a.nome}</b> non comparirà più nella lista degli alimenti e nella ricerca delle diete.</p>
          <p className="small muted" style={{ marginBottom: 0 }}>Non si perde niente: si rimette visibile con «Mostra nascosti» nella pagina Alimenti. Le diete che lo usano già restano come sono.</p>
        </Modal>, document.body)}
      {conferma === "elimina" && createPortal(
        <Modal title="Eliminare l'alimento?" onClose={() => setConferma(null)}
          footer={<><button className="btn primary" onClick={() => setConferma(null)}><Icon.back /> No, tienilo</button><button className="btn danger" onClick={onElimina}><Icon.cestino /> Elimina</button></>}>
          <p style={{ margin: 0 }}>Vuoi eliminare <b>{a.nome}</b>? Non è usato in nessuna dieta.</p>
        </Modal>, document.body)}
    </Modal>,
    document.body,
  );
}

function FormAlimento({ iniziale, categorie, esistenti, onClose, onSave }: {
  iniziale: Alimento | null; categorie: string[]; esistenti: Alimento[]; onClose: () => void; onSave: (a: Alimento) => void;
}) {
  const [f, setF] = useState({
    nome: iniziale?.nome ?? "", categoria: iniziale?.categoria ?? "", kcal: iniziale?.kcal.toString() ?? "",
    icona: iniziale?.icona ?? "",
    proteine: iniziale?.proteine.toString() ?? "", carboidrati: iniziale?.carboidrati.toString() ?? "", grassi: iniziale?.grassi.toString() ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const doppio = esistenti.some((a) => a.id !== iniziale?.id && a.nome.trim().toLowerCase() === f.nome.trim().toLowerCase());
  const valido = f.nome.trim() && f.categoria.trim() && ok(f.kcal) && ok(f.proteine) && ok(f.carboidrati) && ok(f.grassi) && !doppio;
  const stima = ok(f.proteine) && ok(f.carboidrati) && ok(f.grassi) ? Math.round(num(f.proteine) * 4 + num(f.carboidrati) * 4 + num(f.grassi) * 9) : null;

  const salva = () => onSave({
    id: iniziale?.id ?? nuovoId("studio"), nome: f.nome.trim(), categoria: f.categoria.trim(), icona: f.icona || undefined, fonte: "studio",
    kcal: num(f.kcal), proteine: num(f.proteine), carboidrati: num(f.carboidrati), grassi: num(f.grassi),
  });

  return (
    <Modal title={iniziale ? "Modifica alimento" : "Nuovo alimento"} onClose={onClose} medio
      footer={<><button className="btn tenue-sabbia" onClick={onClose}><Icon.x /> Annulla</button><button className="btn primary" disabled={!valido} onClick={salva}><Icon.salva /> Salva</button></>}>
      <div className="grid g2">
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Nome</label>
          <input className="input" autoFocus value={f.nome} onChange={set("nome")} />
          {doppio && <span className="small" style={{ color: "var(--danger)" }}>Esiste già un alimento con questo nome.</span>}
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Categoria</label>
          <input className="input" list="categorie-alimenti" value={f.categoria} onChange={set("categoria")} placeholder="Scegli o scrivi una nuova categoria" />
          <datalist id="categorie-alimenti">{categorie.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Icona {f.icona ? "" : <>(automatica: <span className="ico" style={{ fontSize: 18, width: "auto", margin: "0 2px" }}>{(ICONE_CATEGORIA[f.categoria.trim()] ?? "🍽").replace(/\uFE0F/g, "")}</span> dalla categoria)</>}</label>
          <div className="icon-pick">
            {ELENCO_ICONE.map((e) => (
              <button type="button" key={e} className={f.icona === e ? "on" : ""} onClick={() => setF({ ...f, icona: f.icona === e ? "" : e })}>{e}</button>
            ))}
          </div>
          <span className="small muted">Clicca un'icona per sceglierla, clicca di nuovo per toglierla.</span>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Valori per 100 g</label></div>
        <div className="field"><label>Calorie (kcal)</label><input className="input num" inputMode="decimal" value={f.kcal} onChange={set("kcal")} /></div>
        <div className="field"><label>Proteine (g)</label><input className="input num" inputMode="decimal" value={f.proteine} onChange={set("proteine")} /></div>
        <div className="field"><label>Carboidrati (g)</label><input className="input num" inputMode="decimal" value={f.carboidrati} onChange={set("carboidrati")} /></div>
        <div className="field"><label>Grassi (g)</label><input className="input num" inputMode="decimal" value={f.grassi} onChange={set("grassi")} /></div>
      </div>
      {stima != null && <p className="small muted" style={{ marginBottom: 0 }}>Controllo: dai macronutrienti risultano circa {stima} kcal per 100 g.</p>}
    </Modal>
  );
}
