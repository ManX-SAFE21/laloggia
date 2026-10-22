import { describe, expect, it } from "vitest";
import { avvisiPaziente, leggiBia } from "./bia";

// Referto INVENTATO: stessa impaginazione del testo che pdf.js estrae da un PDF BioTekna BIA-ACC,
// ma nome, date e valori sono di fantasia. Nessun dato reale nel repository.
const REFERTO = `BIA-ACC:   03/09/2026 - 09:15
BioTekna Plus
Dati generali
Paziente:   rossi
maria
Data di nascita:
05/03/1985
Età:   41
Sesso:   F
Altezza (cm):   168
Peso (kg):   70.5
BMI (kg/m²):   25.0 -
Normal
Analisi della composizione corporea
Range
PhA (°):   5.7   [5 - 7.5]
TBW (% BW):   45   [50 - 65]   [31.7 lt]
FFM (% BW):   69   [min 75]   [48.6 kg]
SMM (% FFM):   30.4   [min 30]   [14.8 kg]
FM (% BW):   31   [12 - 31]   [21.9 kg]
AAT (cm²):   340   [max 460]
BMR (kcal/day):   1350 [min 1300]
Total Muscle Mass Density
02/03/2026   04/06/2026   03/09/2026
Weight   73.0 kg   71.8 kg   70.5 kg
PhA   5.4   5.5   5.7
FM   34 % - 24.8 kg   32 % - 23.0 kg   31 % - 21.9 kg
Body Weight Target
Current
weight:
70.5 kg
Ideal
weight:
63.2 kg (min 60.0 kg, max 66.0 kg)
Current /
Ideal
weight:
1.12 (normal 0.94 - 1.05)
24EE:   1720 kcal/daytypical mean 1750
kcal/day
`;

describe("leggiBia", () => {
  const r = leggiBia(REFERTO);

  it("legge data e ora della misura", () => {
    expect(r.bia.dataMisura).toBe("2026-09-03");
    expect(r.bia.ora).toBe("09:15");
  });

  it("legge i valori principali", () => {
    expect(r.bia).toMatchObject({
      altezza: 168, peso: 70.5, bmi: 25.0, pha: 5.7,
      tbwPerc: 45, tbwLitri: 31.7, aat: 340, bmr: 1350, ee24: 1720, pesoIdeale: 63.2,
      smmPerc: 30.4, smmKg: 14.8, ffmPerc: 69, ffmKg: 48.6,
    });
  });

  it("non confonde la massa grassa (FM) con la massa magra (FFM)", () => {
    expect(r.bia.fmPerc).toBe(31);
    expect(r.bia.fmKg).toBe(21.9);
  });

  it("legge il paziente", () => {
    expect(r.paziente).toEqual({ nome: "rossi maria", dataNascita: "1985-03-05", sesso: "F" });
  });

  it("legge lo storico senza la misura attuale", () => {
    expect(r.storico).toEqual([
      { data: "2026-03-02", peso: 73.0, fmPerc: 34, pha: 5.4 },
      { data: "2026-06-04", peso: 71.8, fmPerc: 32, pha: 5.5 },
    ]);
  });

  it("non trova nulla di mancante nel referto completo", () => {
    expect(r.mancanti).toEqual([]);
  });

  it("segnala le voci mancanti invece di inventarle", () => {
    const senza = leggiBia(REFERTO.replace(/AAT \(cm²\):.*\n/, ""));
    expect(senza.bia.aat).toBeUndefined();
    expect(senza.mancanti).toEqual(["aat"]);
  });

  it("accetta anche la virgola decimale", () => {
    expect(leggiBia(REFERTO.replace("Peso (kg):   70.5", "Peso (kg):   70,5")).bia.peso).toBe(70.5);
  });
});

describe("avvisiPaziente", () => {
  const p = leggiBia(REFERTO).paziente;

  it("nessun avviso se nome e data di nascita coincidono", () => {
    expect(avvisiPaziente(p, { nome: "Maria", cognome: "Rossi", dataNascita: "1985-03-05" })).toEqual([]);
  });

  it("avvisa se il referto è di un altro paziente", () => {
    const a = avvisiPaziente(p, { nome: "Laura", cognome: "Fontana", dataNascita: "1979-04-02" });
    expect(a).toHaveLength(2);
    expect(a[0]).toContain("rossi maria");
  });
});
