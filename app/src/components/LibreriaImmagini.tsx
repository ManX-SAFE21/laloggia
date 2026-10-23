// Libreria delle immagini dei piani: quelle incluse nel programma + quelle caricate da Valentina.
// Le caricate valgono per tutti i modelli e i piani (per ora in memoria, poi nel database e nei backup).
import { useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../store";
import { nuovoId } from "../data";
import { IMMAGINI_PIANO, LIBRERIA_INCLUSA } from "../immaginiPiano";
import { Modal } from "./ui";

const MAX_MB = 5;

export function LibreriaImmagini({ titolo, onScegli, onClose }: { titolo: string; onScegli: (chiave: string) => void; onClose: () => void }) {
  const { immagini, setImmagini } = useStore();
  const [errore, setErrore] = useState("");

  const carica = (file?: File) => {
    setErrore("");
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setErrore("Scegli un'immagine PNG, JPG o WebP."); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setErrore(`L'immagine supera ${MAX_MB} MB: riducila prima di caricarla.`); return; }
    const r = new FileReader();
    r.onload = () => {
      const chiave = nuovoId("img");
      setImmagini((x) => ({ ...x, [chiave]: { nome: file.name.replace(/\.[^.]+$/, ""), src: String(r.result) } }));
    };
    r.onerror = () => setErrore("Il file non si legge come immagine.");
    r.readAsDataURL(file);
  };

  const voci = [
    ...LIBRERIA_INCLUSA.map((v) => ({ ...v, src: IMMAGINI_PIANO[v.chiave], caricata: false })),
    ...Object.entries(immagini).map(([chiave, v]) => ({ chiave, nome: v.nome, src: v.src, caricata: true })),
  ];

  // Fuori dal foglio (document.body): così la finestra non segue lo zoom del foglio.
  return createPortal(
    <Modal title={titolo} onClose={onClose} largo>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <span className="small muted">Clic su un'immagine per sceglierla.</span>
        <label className="btn sm">
          Carica immagine…
          <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={(e) => { carica(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      {errore && <p className="err" style={{ marginTop: 0 }}>{errore}</p>}
      <div className="lib-griglia">
        {voci.map((v) => (
          <button key={v.chiave} className="lib-voce" onClick={() => onScegli(v.chiave)} title={v.nome}>
            <img src={v.src} alt="" />
            <span>{v.nome}{v.caricata && <em> · caricata</em>}</span>
          </button>
        ))}
      </div>
      <p className="small muted" style={{ marginBottom: 0 }}>
        Il piano consegnato è una pubblicazione: usa foto tue o con licenza libera. Le immagini caricate per ora restano finché il programma è aperto; con il database verranno salvate e incluse nei backup.
      </p>
    </Modal>,
    document.body,
  );
}
