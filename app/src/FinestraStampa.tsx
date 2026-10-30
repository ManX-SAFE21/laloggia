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
import { Icon } from "./components/ui";

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

  const [password, setPassword] = useState<string | null>(null);
  useEffect(() => {
    if (tipo !== "password") return;
    import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke<string | null>("backup_password", { crea: false }))
      .then((p) => (p ? setPassword(p) : setErrore("La password del backup non è ancora stata creata.")))
      .catch((e) => setErrore(String(e)));
  }, [tipo]);
  useEffect(() => {
    if (tipo === "password") return;
    import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke<DatiArchivio>("db_apri"))
      .then((t) => setDati({ ...t, impostazioni: { ...IMPOSTAZIONI_PREDEFINITE, ...t.impostazioni } }))
      .catch((e) => setErrore(`Archivio non aperto: ${e}`));
  }, []);

  const documento = tipo === "password" ? (password ? <FoglioPassword password={password} /> : null) : dati ? scegli(tipo, id, dati) : null;
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
        {(errore || (dati && !documento)) && <button className="btn sm tenue-salvia" onClick={() => void chiudi()}><Icon.x /> Chiudi</button>}
      </div>
      {tipo === "password" && documento}
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
    case "password":
      return null;
  }
}

/** Foglio da conservare con la password del backup cloud: come aprire un backup anche senza il programma. */
function FoglioPassword({ password }: { password: string }) {
  return (
    <div className="print-sheet foglio-password">
      <div className="modulo-head">La Loggia · Benessere Naturale — password dei backup</div>
      <p>Questa è la password dei backup cifrati salvati nel cloud (file <b>LaLoggia_AAAA-MM-GG_HHMM.7z</b>). Conserva il foglio in un posto sicuro, lontano dal computer.</p>
      <div className="password-grande">{password}</div>
      <h3>Per aprire un backup anche senza il programma</h3>
      <ol>
        <li>Installa 7-Zip (gratuito, da www.7-zip.org) su un qualsiasi PC Windows.</li>
        <li>Fai clic destro sul file .7z → 7-Zip → «Estrai qui» e scrivi la password (maiuscole e trattini compresi).</li>
        <li>Esce il file <b>.db</b>: è l'archivio del gestionale. Si rimette con Impostazioni → «Ripristina da backup…», oppure si apre con un programma per SQLite.</li>
      </ol>
      <p className="small">Le copie sul disco esterno sono già file .db in chiaro: non serve la password.</p>
    </div>
  );
}
