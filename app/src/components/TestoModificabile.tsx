// Testo del foglio modificabile sul posto: si vede già come in stampa. Selezionando delle parole compare
// un mini menu con normale, grassetto e corsivo. Esc annulla, clic fuori salva, Ctrl+B e Ctrl+I funzionano.
import { ClipboardEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pezzo, componi, htmlDaTesto } from "../testoRicco";

/** Legge dalla casella i pezzi formattati, guardando come appare davvero ogni parola
 *  (la nota è già in corsivo, certe celle già in grassetto: conta la differenza dal testo normale). */
function leggi(radice: HTMLElement): string {
  const base = getComputedStyle(radice);
  const pesoBase = Number(base.fontWeight);
  const pezzi: Pezzo[] = [];
  const cammina = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const st = getComputedStyle(n.parentElement!);
      pezzi.push({ testo: n.textContent ?? "", g: Number(st.fontWeight) > pesoBase, c: st.fontStyle !== base.fontStyle });
    } else if (n.nodeName === "BR") pezzi.push({ testo: "\n" });
    else {
      const blocco = n !== radice && n.nodeName === "DIV";
      if (blocco && pezzi.length) pezzi.push({ testo: "\n" });
      n.childNodes.forEach(cammina);
    }
  };
  cammina(radice);
  return componi(pezzi).replace(/\s+$/, "");
}

interface Menu { x: number; y: number; g: boolean; c: boolean }

export function TestoModificabile({ t, salva, vuoto }: { t: string; salva: (v: string) => void; vuoto: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const cambiato = useRef(false);
  const [attivo, setAttivo] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);

  const aggiornaMenu = () => {
    const s = window.getSelection();
    const r = s && s.rangeCount && !s.isCollapsed ? s.getRangeAt(0) : null;
    if (!r || !el.current?.contains(r.commonAncestorContainer)) { setMenu(null); return; }
    const q = r.getBoundingClientRect();
    setMenu({
      x: Math.max(70, Math.min(window.innerWidth - 70, q.left + q.width / 2)),
      y: Math.max(8, q.top - 42),
      g: document.queryCommandState("bold"), c: document.queryCommandState("italic"),
    });
  };
  useEffect(() => {
    if (!attivo) return;
    document.addEventListener("selectionchange", aggiornaMenu);
    window.addEventListener("scroll", aggiornaMenu, true);
    return () => {
      document.removeEventListener("selectionchange", aggiornaMenu);
      window.removeEventListener("scroll", aggiornaMenu, true);
    };
  }, [attivo]);

  const formato = (comando: "removeFormat" | "bold" | "italic") => {
    document.execCommand(comando);
    cambiato.current = true;
    aggiornaMenu();
  };
  const tasti = (e: KeyboardEvent<HTMLSpanElement>) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.key === "Escape") {
      e.preventDefault();
      if (el.current) el.current.innerHTML = htmlDaTesto(t);
      cambiato.current = false;
      el.current?.blur();
    } else if (e.key === "Enter") {
      e.preventDefault();
      document.execCommand("insertLineBreak");
    } else if (ctrl && e.key.toLowerCase() === "u") e.preventDefault(); // niente sottolineato: non si stamperebbe
    else if (ctrl && ["b", "i"].includes(e.key.toLowerCase())) { e.preventDefault(); formato(e.key.toLowerCase() === "b" ? "bold" : "italic"); }
  };
  const incolla = (e: ClipboardEvent) => {
    e.preventDefault(); // da Word o dal web arriva solo il testo, non i suoi colori e caratteri
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  };
  const esci = () => {
    setAttivo(false);
    setMenu(null);
    const v = el.current;
    if (!v || !cambiato.current) return;
    cambiato.current = false;
    const nuovo = leggi(v);
    if (nuovo !== t) salva(nuovo);
  };
  // Tolti tutti i caratteri, il browser lascia un <br>: senza, torna a vedersi la scritta guida.
  const inputTesto = () => {
    cambiato.current = true;
    if (el.current && !el.current.textContent) el.current.innerHTML = "";
  };

  return (
    <>
      <span ref={el} className="pd-mod" contentEditable suppressContentEditableWarning spellCheck data-vuoto={vuoto}
        title="Clic per scrivere. Seleziona delle parole per grassetto e corsivo"
        dangerouslySetInnerHTML={{ __html: htmlDaTesto(t) }}
        onFocus={() => setAttivo(true)} onBlur={esci}
        onInput={inputTesto} onKeyDown={tasti} onPaste={incolla} />
      {menu && createPortal(
        <div className="menu-formato no-print" style={{ left: menu.x, top: menu.y }} onMouseDown={(e) => e.preventDefault()}>
          <button className={!menu.g && !menu.c ? "on" : ""} title="Normale" aria-label="Normale" onClick={() => formato("removeFormat")}>Aa</button>
          <button className={menu.g ? "on" : ""} title="Grassetto (Ctrl+B)" aria-label="Grassetto" style={{ fontWeight: 700 }} onClick={() => formato("bold")}>G</button>
          <button className={menu.c ? "on" : ""} title="Corsivo (Ctrl+I)" aria-label="Corsivo" style={{ fontStyle: "italic", fontFamily: "Georgia, serif" }} onClick={() => formato("italic")}>C</button>
        </div>, document.body)}
    </>
  );
}
