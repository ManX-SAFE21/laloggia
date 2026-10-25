import { describe, expect, it } from "vitest";
import { momentoAdesso, quandoLeggibile, riassuntoBackup, serveBackup } from "./backup";
import { IMPOSTAZIONI_PREDEFINITE } from "./data";

const adesso = new Date(2026, 9, 25, 15, 0); // 25/10/2026 15:00 ora locale
const imp = { ...IMPOSTAZIONI_PREDEFINITE, cartellaDisco: "E:\\Backup", cartellaCloud: "C:\\Dropbox\\Backup" };

describe("backup: indicatore e quando farli", () => {
  it("nomi e date leggibili", () => {
    expect(momentoAdesso(adesso)).toBe("2026-10-25_1500");
    expect(quandoLeggibile("2026-10-25_1430", adesso)).toBe("oggi alle 14:30");
    expect(quandoLeggibile("2026-10-24_0905", adesso)).toBe("ieri alle 09:05");
    expect(quandoLeggibile("2026-10-20_1900", adesso)).toBe("20/10/2026 alle 19:00");
  });

  it("indicatore: da impostare, mai fatto, non riuscito, vecchio, a posto", () => {
    expect(riassuntoBackup({}, IMPOSTAZIONI_PREDEFINITE, false, adesso)).toEqual({ ok: false, testo: "da impostare" });
    expect(riassuntoBackup({}, imp, false, adesso)).toEqual({ ok: false, testo: "mai fatto" });
    expect(riassuntoBackup({ cloud: { esito: "errore" }, discoUltimoOk: "2026-10-25_1400" }, imp, false, adesso).testo).toBe("non riuscito");
    expect(riassuntoBackup({ discoUltimoOk: "2026-10-20_1400" }, imp, false, adesso).ok).toBe(false);
    expect(riassuntoBackup({ discoUltimoOk: "2026-10-25_1400", cloudUltimoOk: "2026-10-25_1430", disco: { esito: "ok" }, cloud: { esito: "ok" } }, imp, false, adesso))
      .toEqual({ ok: true, testo: "oggi alle 14:30" });
    // disco non collegato non è un errore
    expect(riassuntoBackup({ disco: { esito: "non-collegato" }, cloudUltimoOk: "2026-10-25_1430" }, imp, false, adesso).ok).toBe(true);
  });

  it("una volta al giorno; disco solo se collegato; dopo un tentativo si aspetta un'ora", () => {
    const fatto = { discoUltimoOk: "2026-10-25_0900", cloudUltimoOk: "2026-10-25_0900", passwordPresente: true };
    expect(serveBackup(fatto, imp, true, adesso)).toBe(false);
    expect(serveBackup({ ...fatto, discoUltimoOk: "2026-10-24_1900" }, imp, true, adesso)).toBe(true);
    expect(serveBackup({ ...fatto, discoUltimoOk: "2026-10-24_1900" }, imp, false, adesso)).toBe(false);
    expect(serveBackup({ ...fatto, cloudUltimoOk: undefined, ultimoTentativo: "2026-10-25_1430" }, imp, true, adesso)).toBe(false);
    expect(serveBackup({ ...fatto, cloudUltimoOk: undefined, ultimoTentativo: "2026-10-25_1300" }, imp, true, adesso)).toBe(true);
  });
});
