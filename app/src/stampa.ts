// Stampa in una finestra a parte («Stampa – …»): l'anteprima di stampa copre solo quella finestra, così
// la sua X chiude la stampa e non il programma. Nell'anteprima del browser si stampa la pagina com'è.
import { inTauri } from "./store";

export type TipoStampa = "piano" | "modello" | "dieta" | "privacy" | "password";
export interface DaStampare { tipo: TipoStampa; id: string; titolo: string }

export const ETICHETTA_STAMPA = "stampa";

export async function apriStampa(d: DaStampare): Promise<void> {
  if (!inTauri) { window.print(); return; }
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const vecchia = await WebviewWindow.getByLabel(ETICHETTA_STAMPA);
  if (vecchia) await vecchia.destroy();
  new WebviewWindow(ETICHETTA_STAMPA, {
    url: `index.html?stampa=${d.tipo}&id=${encodeURIComponent(d.id)}`,
    title: `Stampa – ${d.titolo}`,
    maximized: true, focus: true, // grande: l'anteprima si legge bene; la sua X chiude solo la stampa
  });
}
