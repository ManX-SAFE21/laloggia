import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { FinestraStampa } from "./FinestraStampa";
import { TipoStampa } from "./stampa";
import "./styles.css";

// Un file rilasciato fuori dalle zone che lo accettano non deve "aprirsi" al posto del programma.
// Le zone previste chiamano preventDefault da sole: qui si ferma solo ciò che nessuno ha preso.
window.addEventListener("dragover", (e) => {
  if (e.defaultPrevented) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
});
window.addEventListener("drop", (e) => { if (!e.defaultPrevented) e.preventDefault(); });

// La finestra «Stampa» usa la stessa pagina con ?stampa=tipo&id=…: mostra solo il documento da stampare.
const parametri = new URLSearchParams(location.search);
const stampa = parametri.get("stampa") as TipoStampa | null;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {stampa ? <FinestraStampa tipo={stampa} id={parametri.get("id") ?? ""} /> : <App />}
  </React.StrictMode>
);
