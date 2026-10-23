import { ReactNode } from "react";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const Icon = {
  home: () => (<svg viewBox="0 0 24 24" {...P}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>),
  users: () => (<svg viewBox="0 0 24 24" {...P}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.6c2.6.2 4.6 2 5.3 4.9" /></svg>),
  calendar: () => (<svg viewBox="0 0 24 24" {...P}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>),
  diet: () => (<svg viewBox="0 0 24 24" {...P}><path d="M12 21c-5 0-8-3.5-8-8 0-4 3-7 6-7 1 0 1.5.4 2 .8.5-.4 1-.8 2-.8 3 0 6 3 6 7 0 4.5-3 8-8 8z" /><path d="M12 6.8c0-2 1-3.5 3-3.8" /></svg>),
  settings: () => (<svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>),
  lock: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>),
  plus: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M12 5v14M5 12h14" /></svg>),
  x: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M6 6l12 12M18 6L6 18" /></svg>),
  file: () => (<svg viewBox="0 0 24 24" {...P} width="18" height="18"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5" /></svg>),
  image: () => (<svg viewBox="0 0 24 24" {...P} width="18" height="18"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 17l-5-5-9 8" /></svg>),
  back: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M15 6l-6 6 6 6" /></svg>),
  print: () => (<svg viewBox="0 0 24 24" {...P} width="16" height="16"><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></svg>),
};

export function Modal({ title, children, onClose, footer, largo, medio, pieno }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode; largo?: boolean; medio?: boolean; pieno?: boolean }) {
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className={"card modal" + (pieno ? " pieno" : largo ? " largo" : medio ? " medio" : "")} onMouseDown={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        <div className="modal-foot">{footer ?? <button className="btn" onClick={onClose}>Chiudi</button>}</div>
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
