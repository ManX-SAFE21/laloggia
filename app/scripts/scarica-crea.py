# Scarica UNA VOLTA le Tabelle di composizione degli alimenti del CREA (aggiornamento 2019) e le salva in
# src-tauri/alimenti-crea.json: sono i "dati originali" inclusi nel programma (vedi CLAUDE.md, decisione 2026-10-30).
# Uso consentito citando la fonte: "CREA Centro di ricerca Alimenti e Nutrizione - Tabelle di composizione degli
# alimenti, aggiornamento 2019 - https://www.alimentinutrizione.it".
#
# Uso (dalla cartella app):  python scripts/scarica-crea.py CARTELLA_COPIE [--solo 000800,120010]
#   CARTELLA_COPIE = dove tenere le pagine scaricate: se lo si rilancia, non le riscarica.
# Una pagina al secondo, per non pesare sul sito. Solo libreria standard di Python.
import html
import io
import json
import os
import re
import sys
import time
import unicodedata
import urllib.request
from html.parser import HTMLParser

BASE = "https://www.alimentinutrizione.it/tabelle-nutrizionali/"
AGENTE = "Mozilla/5.0 (gestionale La Loggia - scarico unico tabelle CREA)"
GRUPPI = {  # classe della riga nella pagina -> gruppo nell'app
    "corponutriente": "macro", "corpominerali": "minerali", "corpovitamine": "vitamine",
    "corpograssi": "acidiGrassi", "corpoaminoacidi": "aminoacidi", "corpoaltri": "altri",
}


def scarica(url, file_copia):
    if os.path.exists(file_copia):
        return io.open(file_copia, encoding="utf-8").read()
    req = urllib.request.Request(url, headers={"User-Agent": AGENTE})
    for tentativo in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                testo = r.read().decode("utf-8", errors="replace")
            break
        except Exception as e:  # rete instabile: si riprova due volte
            if tentativo == 2:
                raise
            print("  riprovo:", e)
            time.sleep(5)
    io.open(file_copia, "w", encoding="utf-8").write(testo)
    time.sleep(1)
    return testo


class Tabelle(HTMLParser):
    """Raccoglie le righe <tr> con la loro classe e il testo di ogni cella (+ data-content delle referenze)."""

    def __init__(self):
        super().__init__()
        self.righe, self.riga, self.cella, self.classe = [], None, None, ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "tr":
            self.riga, self.classe = [], (a.get("class") or "")
        elif tag in ("td", "th") and self.riga is not None:
            self.cella = {"testo": "", "ref": None}
        elif tag == "i" and self.cella is not None and a.get("data-content"):
            self.cella["ref"] = a["data-content"].strip()

    def handle_data(self, data):
        if self.cella is not None:
            self.cella["testo"] += data

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cella is not None and self.riga is not None:
            self.cella["testo"] = " ".join(self.cella["testo"].replace("\xa0", " ").split())
            self.riga.append(self.cella)
            self.cella = None
        elif tag == "tr" and self.riga is not None:
            self.righe.append((self.classe, self.riga))
            self.riga = None


def chiave(etichetta):
    """Nome stabile per le formule: "Energia (kcal)" -> "energia_kcal", "Ferro (mg)" -> "ferro"."""
    s = unicodedata.normalize("NFD", etichetta).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\((g|mg|g|%)\)", "", s)  # la "μ" di μg sparisce con la normalizzazione: resta "(g)"
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s


def numero(t):
    t = t.strip().replace(",", ".")
    try:
        return float(t)
    except ValueError:
        return None


def leggi_alimento(testo, riferimenti):
    p = Tabelle()
    p.feed(testo)
    info, valori = {}, []
    for classe, celle in p.righe:
        gruppo = next((g for c, g in GRUPPI.items() if c in classe.split()), None)
        if gruppo is None:
            if len(celle) == 2 and not classe:  # tabella in alto: Categoria, Codice, English Name, ...
                info[celle[0]["testo"]] = celle[1]["testo"]
            continue
        if len(celle) < 7:
            continue
        nome, unita, v100, vmin, vmax, vpor, orig = (c["testo"] for c in celle[:7])
        metodo = celle[7]["testo"] if len(celle) > 7 else ""
        ref = celle[8]["ref"] if len(celle) > 8 else None
        if ref and ref not in riferimenti:
            riferimenti.append(ref)
        if any(v["chiave"] == chiave(nome) for v in valori):
            continue  # riga ripetuta nella pagina (succede, es. «Pistacchio di Bronte DOP»): si tiene la prima
        voce = {"gruppo": gruppo, "chiave": chiave(nome), "nome": nome, "unita": unita}
        n = numero(v100)
        if n is not None:
            voce["v"] = n
        elif v100:
            voce["t"] = v100  # "tr" (tracce) o testo (es. aminoacido limitante)
        for k, x in (("min", vmin), ("max", vmax), ("porzione", vpor)):
            if numero(x) is not None:
                voce[k] = numero(x)
        if orig:
            voce["origine"] = orig
        if metodo:
            voce["metodo"] = metodo
        if ref:
            voce["ref"] = riferimenti.index(ref)
        valori.append(voce)
    return info, valori


# Alimenti usati dalla dieta di esempio (src/data.ts): solo questi vanno anche in src/alimenti-demo.json,
# per l'anteprima nel browser e per i test (il programma usa tutte le tabelle, messe nell'archivio dal Rust).
CODICI_DEMO = ["000110", "000550", "000800", "003030", "004500", "005110", "005410", "005730", "006610", "007120",
               "007760", "008540", "009210", "106500", "121410", "122400", "150030", "166000"]

MACRO = {"kcal": "energia_kcal", "proteine": "proteine", "carboidrati": "carboidrati_disponibili", "grassi": "lipidi"}


def come_alimento(codice, nome, info, valori, porz, edib):
    """Lo stesso formato degli alimenti del programma (src/types.ts, Alimento): i 4 valori principali per 100 g
    in chiaro (le diete li usano già), tutti gli altri in "valori"."""
    per_chiave = {v["chiave"]: v for v in valori}
    a = {"id": "crea-" + codice, "nome": nome, "categoria": info.get("Categoria", ""), "fonte": "crea", "codiceCrea": codice}
    for campo, k in MACRO.items():
        a[campo] = per_chiave.get(k, {}).get("v", 0)  # "tr" (tracce) o assente = 0
    a.update({"nomeInglese": info.get("English Name", ""), "parteEdibile": edib, "porzione": porz,
              "porzioneTesto": info.get("Porzione", ""), "valori": valori})
    return a


def main():
    if len(sys.argv) < 2:
        sys.exit("uso: python scripts/scarica-crea.py CARTELLA_COPIE [--solo codici]")
    copie = sys.argv[1]
    os.makedirs(copie, exist_ok=True)
    solo = sys.argv[sys.argv.index("--solo") + 1].split(",") if "--solo" in sys.argv else None
    elenco = scarica(BASE + "ricerca-per-ordine-alfabetico", os.path.join(copie, "elenco.html"))
    nomi = {}
    for codice, nome in re.findall(r'tabelle-nutrizionali/(\d{6})"[^>]*>([^<]+)<', elenco):
        # alcuni nomi sono scritti tra virgolette doppie in stile CSV: "|Caramelle tipo ""mou""|"
        nomi.setdefault(codice, html.unescape(nome).strip().strip('"').strip("|").replace('""', '"').strip())
    codici = solo or sorted(nomi)
    print(len(nomi), "alimenti nell'elenco;", len(codici), "da leggere")
    riferimenti, alimenti, problemi = [], [], []
    for i, codice in enumerate(codici, 1):
        testo = scarica(BASE + codice, os.path.join(copie, codice + ".html"))
        info, valori = leggi_alimento(testo, riferimenti)
        if info.get("Codice Alimento") != codice or not valori:
            problemi.append(codice)
        porz = numero((info.get("Porzione") or "").split(" ")[0])
        edib = numero((info.get("Parte Edibile") or "").split(" ")[0])
        alimenti.append(come_alimento(codice, nomi.get(codice, codice), info, valori, porz, edib))
        if i % 50 == 0 or i == len(codici):
            print(f"  {i}/{len(codici)}", flush=True)
    uscita = {
        "fonte": "CREA Centro di ricerca Alimenti e Nutrizione - Tabelle di composizione degli alimenti, "
                 "aggiornamento 2019 (a cura di L. Marletta e E. Camilli) - https://www.alimentinutrizione.it",
        "scaricato": time.strftime("%Y-%m-%d"),
        "alimenti": alimenti, "riferimenti": riferimenti,
    }
    dest = os.path.join(copie, "prova.json") if solo else os.path.join("src-tauri", "alimenti-crea.json")
    io.open(dest, "w", encoding="utf-8", newline="\n").write(json.dumps(uscita, ensure_ascii=False, separators=(",", ":")))
    print("scritto", dest, f"({os.path.getsize(dest) // 1024} KB);", "problemi:", problemi or "nessuno")
    if not solo:
        demo = [dict(x, valori=[{k: w for k, w in v.items() if k not in ("metodo", "ref")} for v in x["valori"]])
                for x in alimenti if x["codiceCrea"] in CODICI_DEMO]
        io.open(os.path.join("src", "alimenti-demo.json"), "w", encoding="utf-8", newline="\n").write(
            json.dumps(demo, ensure_ascii=False, indent=1))
        print("scritto src/alimenti-demo.json:", len(demo), "alimenti")


if __name__ == "__main__":
    main()
