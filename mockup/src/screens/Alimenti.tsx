import { useMemo, useState } from "react";
import { ELENCO_ICONE, ICONE_CATEGORIA, iconaDi, nuovoId } from "../data";
import { useStore } from "../store";
import { Icon, Modal } from "../components/ui";
import { Alimento } from "../types";

const num = (s: string) => Number(s.replace(",", "."));
const ok = (s: string) => s.trim() !== "" && Number.isFinite(num(s)) && num(s) >= 0;

export function Alimenti() {
  const { alimenti, setAlimenti, diete, toast } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [edit, setEdit] = useState<Alimento | "nuovo" | null>(null);
  const [elimina, setElimina] = useState<Alimento | null>(null);

  const categorie = useMemo(() => [...new Set(alimenti.map((a) => a.categoria))].sort(), [alimenti]);
  const usi = (id: string) =>
    diete.reduce((n, d) => n + Object.values(d.settimana).reduce((m, giorno) => m + Object.values(giorno).flat().filter((v) => v.alimentoId === id).length, 0), 0);
  const dieteConAlimento = (id: string) =>
    diete.filter((d) => Object.values(d.settimana).some((giorno) => Object.values(giorno).flat().some((v) => v.alimentoId === id))).length;

  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return alimenti
      .filter((a) => !cat || a.categoria === cat)
      .filter((a) => !s || `${a.nome} ${a.categoria}`.toLowerCase().includes(s))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alimenti, q, cat]);

  const salva = (a: Alimento) => {
    const nuovoAlimento = !alimenti.some((x) => x.id === a.id);
    setAlimenti((l) => (nuovoAlimento ? [...l, a] : l.map((x) => (x.id === a.id ? a : x))));
    setEdit(null);
    toast(nuovoAlimento ? "Alimento aggiunto" : "Alimento modificato");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Alimenti</h1><p>{alimenti.length} alimenti · valori per 100 g</p></div>
        <button className="btn primary" onClick={() => setEdit("nuovo")}><Icon.plus /> Nuovo alimento</button>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <input className="input" style={{ maxWidth: 360 }} placeholder="Cerca un alimento…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" style={{ width: 200 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Tutte le categorie</option>
          {categorie.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Alimento</th><th>Categoria</th>
              <th style={{ textAlign: "right" }}>kcal</th>
              <th style={{ textAlign: "right" }}>Proteine</th>
              <th style={{ textAlign: "right" }}>Carboidrati</th>
              <th style={{ textAlign: "right" }}>Grassi</th>
              <th>Nelle diete</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => {
              const n = dieteConAlimento(a.id);
              return (
                <tr key={a.id} className="click" onClick={() => setEdit(a)}>
                  <td style={{ fontWeight: 600 }}><span className="ico" style={{ fontSize: 22 }}>{iconaDi(a)}</span>{a.nome}</td>
                  <td className="muted">{a.categoria}</td>
                  <td className="num" style={{ textAlign: "right" }}>{a.kcal}</td>
                  <td className="num" style={{ textAlign: "right" }}>{a.proteine}</td>
                  <td className="num" style={{ textAlign: "right" }}>{a.carboidrati}</td>
                  <td className="num" style={{ textAlign: "right" }}>{a.grassi}</td>
                  <td className="small muted">{n === 0 ? "—" : `${n} ${n === 1 ? "dieta" : "diete"}`}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn sm" onClick={() => setEdit(a)}>Modifica</button>{" "}
                    <button className="btn sm danger" onClick={() => setElimina(a)}>Elimina</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lista.length === 0 && <div className="empty">Nessun alimento trovato</div>}
      </div>
      <p className="small muted">Se modifichi i valori di un alimento già usato, le diete che lo contengono si ricalcolano. Il caricamento da file (Excel o CSV) e gli altri valori nutrizionali sono da definire.</p>

      {edit && (
        <FormAlimento iniziale={edit === "nuovo" ? null : edit} categorie={categorie} esistenti={alimenti} onClose={() => setEdit(null)} onSave={salva} />
      )}

      {elimina && (() => {
        const n = usi(elimina.id);
        const nd = dieteConAlimento(elimina.id);
        return n > 0 ? (
          <Modal title="Alimento in uso" onClose={() => setElimina(null)}>
            <p><b>{elimina.nome}</b> è presente in {nd} {nd === 1 ? "dieta" : "diete"} ({n} {n === 1 ? "riga" : "righe"}), quindi non può essere eliminato.</p>
            <p className="small muted">Toglilo prima dalle diete che lo usano. Puoi comunque modificarne i valori.</p>
          </Modal>
        ) : (
          <Modal title="Eliminare l'alimento?" onClose={() => setElimina(null)}
            footer={<><button className="btn" onClick={() => setElimina(null)}>Annulla</button>
              <button className="btn primary" style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                onClick={() => { setAlimenti((l) => l.filter((x) => x.id !== elimina.id)); setElimina(null); toast("Alimento eliminato"); }}>Elimina</button></>}>
            <p>Vuoi eliminare <b>{elimina.nome}</b> dalla lista? Non è usato in nessuna dieta.</p>
          </Modal>
        );
      })()}
    </div>
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
    id: iniziale?.id ?? nuovoId("a"), nome: f.nome.trim(), categoria: f.categoria.trim(), icona: f.icona || undefined,
    kcal: num(f.kcal), proteine: num(f.proteine), carboidrati: num(f.carboidrati), grassi: num(f.grassi),
  });

  return (
    <Modal title={iniziale ? "Modifica alimento" : "Nuovo alimento"} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annulla</button><button className="btn primary" disabled={!valido} onClick={salva}>Salva</button></>}>
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
