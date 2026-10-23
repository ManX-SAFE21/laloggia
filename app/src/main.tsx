import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Un file rilasciato fuori dalle zone che lo accettano non deve "aprirsi" al posto del programma.
// Le zone previste chiamano preventDefault da sole: qui si ferma solo ciò che nessuno ha preso.
window.addEventListener("dragover", (e) => {
  if (e.defaultPrevented) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
});
window.addEventListener("drop", (e) => { if (!e.defaultPrevented) e.preventDefault(); });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
