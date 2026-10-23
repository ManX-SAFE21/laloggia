// Ingrandimento del foglio del piano (e degli allegati) a schermo: i pulsanti − e + si fermano sempre sulle decine
// (dopo "Adatta alla larghezza", es. 83%, il + va a 90% e poi a 100%, non a 93% e 103%).
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;

export function prossimoZoom(attuale: number, verso: 1 | -1, min = ZOOM_MIN, max = ZOOM_MAX): number {
  const decine = attuale * 10;
  const dopo = verso > 0 ? Math.floor(decine + 0.001) + 1 : Math.ceil(decine - 0.001) - 1;
  return Math.max(min, Math.min(max, dopo / 10));
}
