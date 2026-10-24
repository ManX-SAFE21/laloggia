// Cifratura del disco di Windows (decisione 2026-10-25): l'archivio è in chiaro, quindi contro il furto del PC
// serve Crittografia dispositivo / BitLocker. Qui si legge lo stato (comando Rust stato_cifratura_disco) e si
// mostra come attivarla. È solo un avviso: il programma funziona comunque.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { inTauri } from "./store";
import { Modal } from "./components/ui";

export type StatoDisco = "cifrato" | "in-corso" | "decifratura" | "sospeso" | "non-cifrato" | "non-verificabile" | "browser" | "controllo";
export interface InfoDisco { stato: StatoDisco; unita?: string }

/** Stati in cui il PC rubato lascerebbe leggere i dati: si avvisa. */
export const DA_AVVISARE: StatoDisco[] = ["non-cifrato", "sospeso", "decifratura"];

export const DESCRIZIONE: Record<StatoDisco, string> = {
  cifrato: "Cifrato da Windows ✓",
  "in-corso": "Cifratura in corso (Windows la sta completando) ✓",
  decifratura: "Windows sta togliendo la cifratura",
  sospeso: "Cifratura sospesa: il disco non è protetto",
  "non-cifrato": "Non cifrato",
  "non-verificabile": "Non verificabile",
  browser: "Non verificabile nell'anteprima del browser",
  controllo: "Controllo in corso…",
};

let promessa: Promise<InfoDisco> | null = null;
function leggi(forza = false): Promise<InfoDisco> {
  if (!inTauri) return Promise.resolve({ stato: "browser" });
  if (!promessa || forza) {
    promessa = import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke<InfoDisco>("stato_cifratura_disco"))
      .catch(() => ({ stato: "non-verificabile" as const }));
  }
  return promessa;
}

/** Stato del disco (letto una volta, poi ricordato); ricontrolla() lo rilegge. */
export function useStatoDisco() {
  const [info, setInfo] = useState<InfoDisco>({ stato: "controllo" });
  useEffect(() => { let vivo = true; leggi().then((i) => vivo && setInfo(i)); return () => { vivo = false; }; }, []);
  const ricontrolla = () => { setInfo({ stato: "controllo" }); leggi(true).then(setInfo); };
  return { info, ricontrolla };
}

/** Spiegazione passo passo per attivare la cifratura del disco. */
export function ComeCifrare({ onClose, onRicontrolla }: { onClose: () => void; onRicontrolla?: () => void }) {
  // fuori dalla striscia gialla (document.body): così non ne eredita colori e dimensioni
  return createPortal(
    <Modal title="Proteggere i dati se il computer viene rubato" onClose={onClose}
      footer={<>{onRicontrolla && <button className="btn" onClick={() => { onRicontrolla(); onClose(); }}>Controlla di nuovo</button>}<button className="btn primary" onClick={onClose}>Chiudi</button></>}>
      <p style={{ marginTop: 0 }}>L'archivio dei clienti è sul disco di questo PC. Per renderlo illeggibile a chi ruba o trova il computer, si attiva la <b>cifratura del disco di Windows</b>:</p>
      <ol className="come-cifrare">
        <li>Apri <b>Start → Impostazioni → Privacy e sicurezza → Crittografia dispositivo</b> e attivala.</li>
        <li>Se quella voce non c'è: su Windows Pro si chiama <b>BitLocker</b> (cercalo nel menu Start, poi «Attiva BitLocker»). Su alcuni PC con Windows Home la cifratura non è disponibile: chiedi a chi ti segue il computer.</li>
        <li><b>Importante:</b> Windows crea una <b>chiave di ripristino</b>. Salvala nel tuo account Microsoft e stampala: senza, se il PC si guasta, il disco non si apre più.</li>
        <li>Usa una <b>password per entrare in Windows</b>: senza password la cifratura protegge poco.</li>
      </ol>
      <p className="small muted" style={{ marginBottom: 0 }}>Windows cifra il disco in background, puoi continuare a lavorare. Quando ha finito, «Controlla di nuovo» mostra lo stato aggiornato.</p>
    </Modal>,
    document.body,
  );
}

/** Striscia gialla in cima al programma se il disco non è protetto. «Più tardi» la nasconde fino al prossimo avvio. */
export function AvvisoDisco() {
  const { info, ricontrolla } = useStatoDisco();
  const [nascosto, setNascosto] = useState(false);
  const [aiuto, setAiuto] = useState(false);
  if (nascosto || !DA_AVVISARE.includes(info.stato)) return null;
  return (
    <div className="avviso-disco no-print">
      <span>⚠ <b>Il disco di questo PC {info.stato === "non-cifrato" ? "non è cifrato" : "non è protetto"}</b>{info.unita ? ` (${info.unita})` : ""}: se il computer viene rubato, i dati dei clienti si possono leggere.</span>
      <button className="btn sm" onClick={() => setAiuto(true)}>Come proteggerlo</button>
      <button className="btn sm ghost" onClick={() => setNascosto(true)}>Più tardi</button>
      {aiuto && <ComeCifrare onClose={() => setAiuto(false)} onRicontrolla={ricontrolla} />}
    </div>
  );
}
