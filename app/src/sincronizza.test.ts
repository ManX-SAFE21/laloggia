import { describe, expect, it } from "vitest";
import { ALIMENTI, APPUNTAMENTI, CLIENTI, DIETE, IMPOSTAZIONI_PREDEFINITE, MODELLI, PIANI } from "./data";
import { DatiArchivio, differenze, fotografa } from "./sincronizza";

const dati = (): DatiArchivio => structuredClone({
  clienti: CLIENTI, modelli: MODELLI, piani: PIANI, appuntamenti: APPUNTAMENTI, alimenti: ALIMENTI, diete: DIETE, immagini: {}, impostazioni: IMPOSTAZIONI_PREDEFINITE,
});

describe("salvataggio automatico: cosa mandare al database", () => {
  it("niente da salvare se nulla è cambiato", () => {
    const d = dati();
    expect(differenze(fotografa(d), d)).toEqual([]);
  });

  it("salva solo l'elemento cambiato", () => {
    const d = dati();
    const f = fotografa(d);
    d.clienti[0].obiettivo = "Nuovo obiettivo";
    const ops = differenze(f, d);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ azione: "salva", tipo: "cliente", id: d.clienti[0].id });
  });

  it("una visita aggiunta salva il suo cliente (che porta con sé le visite)", () => {
    const d = dati();
    const f = fotografa(d);
    d.clienti[1].visite.push({ id: "v-nuova", data: "2026-10-23", tipo: "Controllo", peso: 70 });
    expect(differenze(f, d).map((o) => `${o.azione}:${o.tipo}:${o.id}`)).toEqual([`salva:cliente:${d.clienti[1].id}`]);
  });

  it("elementi nuovi e tolti; modelli prima dei piani; eliminazioni in fondo", () => {
    const d = dati();
    const f = fotografa(d);
    d.appuntamenti = d.appuntamenti.filter((a) => a.id !== "ap1");
    d.piani.push({ ...structuredClone(d.piani[0]), id: "pa-nuovo" });
    d.modelli.push({ ...structuredClone(d.modelli[0]), id: "m-nuovo" });
    d.immagini["img-1"] = { nome: "foto", src: "data:image/png;base64,AA==" };
    const ops = differenze(f, d).map((o) => `${o.azione}:${o.tipo}:${o.id}`);
    expect(ops).toEqual(["salva:immagine:img-1", "salva:modello:m-nuovo", "salva:piano:pa-nuovo", "elimina:appuntamento:ap1"]);
  });

  it("dopo aver salvato, la nuova fotografia non ha più differenze", () => {
    const d = dati();
    d.modelli[0].nome = "Rinominato";
    const f = fotografa(d);
    expect(differenze(f, d)).toEqual([]);
  });
});
