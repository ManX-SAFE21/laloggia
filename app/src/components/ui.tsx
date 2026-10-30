import { ReactNode } from "react";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const Icon = {
  home: () => (<svg viewBox="0 0 24 24" {...P}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>),
  users: () => (<svg viewBox="0 0 24 24" {...P}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.6c2.6.2 4.6 2 5.3 4.9" /></svg>),
  calendar: () => (<svg viewBox="0 0 24 24" {...P}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>),
  diet: () => (<svg viewBox="0 0 24 24" {...P}><path d="M12 21c-5 0-8-3.5-8-8 0-4 3-7 6-7 1 0 1.5.4 2 .8.5-.4 1-.8 2-.8 3 0 6 3 6 7 0 4.5-3 8-8 8z" /><path d="M12 6.8c0-2 1-3.5 3-3.8" /></svg>),
  settings: () => (<svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>),
  lock: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>),
  valori: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M16 3.5A9 9 0 0 1 20.5 8H16z" /></svg>),
  salva: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>),
  matita: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M4 20l1-4L16 5l3 3L8 19z" /><path d="M14 7l3 3" /></svg>),
  cestino: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" /></svg>),
  copia: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></svg>),
  cartella: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>),
  scarica: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>),
  archivio: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><rect x="3" y="5" width="18" height="4" rx="1" /><path d="M5 9v10h14V9M10 13h4" /></svg>),
  orologio: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>),
  annullaMod: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>),
  ripetiMod: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></svg>),
  zoomPiu: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5M11 8v6M8 11h6" /></svg>),
  zoomMeno: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5M8 11h6" /></svg>),
  espandi: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>),
  riduci: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>),
  pannello: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>),
  sinistra: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M15 6l-6 6 6 6" /></svg>),
  destra: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M9 6l6 6-6 6" /></svg>),
  apri: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></svg>),
  aggiorna: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5" /></svg>),
  plus: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M12 5v14M5 12h14" /></svg>),
  x: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M6 6l12 12M18 6L6 18" /></svg>),
  file: () => (<svg viewBox="0 0 24 24" {...P} width="18" height="18"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5" /></svg>),
  image: () => (<svg viewBox="0 0 24 24" {...P} width="18" height="18"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 17l-5-5-9 8" /></svg>),
  back: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M15 6l-6 6 6 6" /></svg>),
  print: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></svg>),
  occhio: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>),
  occhioChiuso: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.1M6.1 6.1C3.4 7.8 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.9-2.1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="M3 3l18 18" /></svg>),
  ripristina: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>),
  su: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M6 15l6-6 6 6" /></svg>),
  giu: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M6 9l6 6 6-6" /></svg>),
};

export function Modal({ title, children, onClose, footer, largo, medio, pieno }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode; largo?: boolean; medio?: boolean; pieno?: boolean }) {
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className={"card modal" + (pieno ? " pieno" : largo ? " largo" : medio ? " medio" : "")} onMouseDown={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        <div className="modal-foot">{footer ?? <button className="btn tenue-salvia" onClick={onClose}><Icon.x /> Chiudi</button>}</div>
      </div>
    </div>
  );
}

export const iniziali = (nome: string, cognome: string) => (nome[0] + cognome[0]).toUpperCase();

/** Grafico a linee semplice in SVG, senza librerie. */
export function LineChart({ points, unit, height = 180, decimali = 1 }: { points: { label: string; value: number }[]; unit: string; height?: number; decimali?: number }) {
  const W = 560, H = height, padL = 40, padR = 24, padT = 26, padB = 28;
  if (points.length === 0) return <div className="empty">Nessun dato</div>;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1) { min -= 1; max += 1; }
  const span = max - min;
  min -= span * 0.15; max += span * 0.15;
  const margine = 18; // spazio tra l'asse e il primo/ultimo punto, così le etichette non si sovrappongono
  const x = (i: number) => padL + margine + (points.length === 1 ? (W - padL - padR - 2 * margine) / 2 : (i * (W - padL - padR - 2 * margine)) / (points.length - 1));
  const y = (vv: number) => padT + ((max - vv) * (H - padT - padB)) / (max - min);
  const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
  const decTick = max - min < 6 ? 1 : 0; // valori piccoli (es. angolo di fase): un decimale anche sull'asse
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Andamento ${unit}`}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={padL - 6} y={y(t) + 4} fontSize="10" textAnchor="end" fill="var(--ink-3)">{t.toFixed(decTick)}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="3.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
          <text x={x(i)} y={H - 8} fontSize="10" textAnchor="middle" fill="var(--ink-3)">{p.label}</text>
          <text x={x(i)} y={y(p.value) - 9} fontSize="10" textAnchor="middle" fill="var(--ink-2)">{p.value.toFixed(decimali)}</text>
        </g>
      ))}
    </svg>
  );
}
