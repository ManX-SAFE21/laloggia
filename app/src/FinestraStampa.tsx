// Contenuto della finestra «Stampa»: legge il documento dall'archivio (sola lettura), apre subito l'anteprima
// di stampa e, finita la stampa (o annullata), si chiude da sola. Il programma resta aperto dietro.
import { ReactNode, useEffect, useState } from "react";
import { IMPOSTAZIONI_PREDEFINITE, OGGI } from "./data";
import { StoreSoloLettura } from "./store";
import { DatiArchivio } from "./sincronizza";
import { TipoStampa } from "./stampa";
import { PianoStampa } from "./components/PianoStampa";
import { StampaDieta } from "./screens/DietaEditor";
import { ModuloPrivacy } from "./screens/ClienteScheda";
import { CLIENTE_ESEMPIO } from "./screens/Modelli";

async function chiudi() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().destroy();
}

/** Aspetta caratteri e immagini, così l'anteprima non esce con pezzi mancanti. */
async function prontoPerStampare() {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((ok) => { i.onload = i.onerror = ok; }))));
  await new Promise((ok) => setTimeout(ok, 200));
}

let stampaAvviata = false; // una sola anteprima, anche se React prova l'effetto due volte

export function FinestraStampa({ tipo, id }: { tipo: TipoStampa; id: string }) {
  const [dati, setDati] = useState<DatiArchivio | null>(null);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke<DatiArchivio>("db_apri"))
      .then((t) => setDati({ ...t, impostazioni: { ...IMPOSTAZIONI_PREDEFINITE, ...t.impostazioni } }))
      .catch((e) => setErrore(`Archivio non aperto: ${e}`));
  }, []);

  const documento = dati ? scegli(tipo, id, dati) : null;
  useEffect(() => {
    if (!documento || stampaAvviata) return;
    stampaAvviata = true;
    void (async () => {
      await prontoPerStampare();
      window.print(); // aspetta finché l'anteprima è aperta
      await chiudi();
    })();
  }, [documento !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="finestra-stampa">
      <div className="no-print finestra-stampa-avviso">
        {errore || (dati && !documento ? "Documento non trovato." : "Apertura dell'anteprima di stampa…")}
        {(errore || (dati && !documento)) && <button className="btn sm" onClick={() => void chiudi()}>Chiudi</button>}
      </div>
      {dati && documento && <StoreSoloLettura dati={dati}>{documento}</StoreSoloLettura>}
    </div>
  );
}

function scegli(tipo: TipoStampa, id: string, d: DatiArchivio): ReactNode | null {
  const cliente = (cid: string) => d.clienti.find((c) => c.id === cid);
  switch (tipo) {
    case "piano": {
      const p = d.piani.find((x) => x.id === id);
      const c = p && cliente(p.clienteId);
      return p && c ? <PianoStampa piano={p} cliente={c} /> : null;
    }
    case "modello": {
      const m = d.modelli.find((x) => x.id === id);
      return m ? <PianoStampa cliente={CLIENTE_ESEMPIO} piano={{ id: m.id, clienteId: "", titolo: m.titolo, modello: m.nome, creato: OGGI, kcal: m.kcal, messaggio: m.messaggio, sezioni: m.sezioni }} /> : null;
    }
    case "dieta": {
      const dieta = d.diete.find((x) => x.id === id);
      const c = dieta && cliente(dieta.clienteId);
      return dieta && c ? <StampaDieta dieta={dieta} alimenti={d.alimenti} nomeCliente={`${c.nome} ${c.cognome}`} /> : null;
    }
    case "privacy": {
      const c = cliente(id);
      return c ? <ModuloPrivacy c={c} /> : null;
    }
  }
}
