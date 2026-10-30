// Esporta i dati di esempio del programma (src/data.ts) in src-tauri/dati-esempio.json,
// che il database carica quando nasce vuoto. Da rilanciare se cambiano i dati di esempio:
//   node scripts/esporta-dati-esempio.mjs
import { writeFileSync } from "node:fs";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const d = await server.ssrLoadModule("/src/data.ts");
  const dati = {
    clienti: d.CLIENTI,
    modelli: d.MODELLI,
    piani: d.PIANI,
    appuntamenti: d.APPUNTAMENTI,
    alimenti: [], // gli alimenti veri sono le tabelle CREA (src-tauri/alimenti-crea.json), messe dal programma
    diete: d.DIETE,
  };
  writeFileSync(new URL("../src-tauri/dati-esempio.json", import.meta.url), JSON.stringify(dati, null, 1) + "\n");
  console.log(Object.entries(dati).map(([k, v]) => `${k}: ${v.length}`).join(", "));
} finally {
  await server.close();
}
