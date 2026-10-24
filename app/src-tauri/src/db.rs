//! Database del gestionale: SQLite cifrato con SQLCipher.
//!
//! Scelte (vedi CLAUDE.md):
//! - Colonne vere per ciò su cui si cerca/ordina/collega; il resto della scheda in `dati` (JSON),
//!   così le schede possono crescere senza rifare le tabelle.
//! - Il piano del cliente contiene TUTTO il suo contenuto: cancellare un modello non lo tocca
//!   (`modello_id` diventa NULL). Cancellare un cliente cancella visite, allegati, piani, diete e
//!   appuntamenti (cancellazione definitiva richiesta dalla privacy).
//! - Versione dello schema in `PRAGMA user_version`; ogni migrazione si applica una volta sola.
//! - La chiave (32 byte) arriva da fuori: come ricavarla dal PIN/password è la fase 4.

use base64::Engine;
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Map, Value};
use std::path::Path;

/// Migrazioni in ordine: l'indice + 1 è la versione dello schema.
const MIGRAZIONI: &[&str] = &[
    // v1: schema iniziale
    r#"
    CREATE TABLE clienti (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      cognome TEXT NOT NULL,
      data_nascita TEXT,
      attivo INTEGER NOT NULL DEFAULT 1,
      dati TEXT NOT NULL,                 -- scheda completa (senza visite e allegati)
      aggiornato TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE visite (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      tipo TEXT NOT NULL,
      dati TEXT NOT NULL,                 -- misure, BIA, note
      aggiornato TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX visite_cliente ON visite(cliente_id, data);
    CREATE TABLE allegati (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      data TEXT NOT NULL,
      dimensione_kb INTEGER,
      contenuto BLOB                      -- il file (cifrato insieme al database)
    );
    CREATE TABLE modelli (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      kcal INTEGER,
      modificato TEXT NOT NULL,
      dati TEXT NOT NULL
    );
    CREATE TABLE piani (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
      modello_id TEXT REFERENCES modelli(id) ON DELETE SET NULL,  -- solo informazione
      creato TEXT NOT NULL,
      dati TEXT NOT NULL                  -- contenuto completo del piano
    );
    CREATE TABLE diete (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
      dati TEXT NOT NULL
    );
    CREATE TABLE appuntamenti (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      ora TEXT NOT NULL,
      durata INTEGER NOT NULL,
      tipo TEXT NOT NULL
    );
    CREATE INDEX appuntamenti_data ON appuntamenti(data, ora);
    CREATE TABLE alimenti (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      categoria TEXT NOT NULL,
      dati TEXT NOT NULL
    );
    CREATE TABLE immagini (
      chiave TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      mime TEXT NOT NULL,
      contenuto BLOB NOT NULL
    );
    CREATE TABLE impostazioni (
      chiave TEXT PRIMARY KEY,
      valore TEXT NOT NULL
    );
    "#,
    // v2 (2026-10-24): descrizione degli allegati, scritta da Valentina (prima c'era solo il nome del file)
    r#"
    ALTER TABLE allegati ADD COLUMN descrizione TEXT;
    "#,
];

pub const VERSIONE_SCHEMA: i64 = MIGRAZIONI.len() as i64;

#[derive(Debug)]
pub enum Errore {
    ChiaveSbagliata,
    Sqlite(rusqlite::Error),
    Json(String),
}
impl From<rusqlite::Error> for Errore {
    fn from(e: rusqlite::Error) -> Self { Errore::Sqlite(e) }
}
impl std::fmt::Display for Errore {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Errore::ChiaveSbagliata => write!(f, "chiave del database non valida"),
            Errore::Sqlite(e) => write!(f, "database: {e}"),
            Errore::Json(e) => write!(f, "dati non validi: {e}"),
        }
    }
}
pub type Ris<T> = Result<T, Errore>;

pub struct Db {
    conn: Connection,
}

impl Db {
    /// Apre (o crea) il database cifrato e applica le migrazioni mancanti.
    pub fn apri(percorso: &Path, chiave: &[u8; 32]) -> Ris<Db> {
        let conn = Connection::open(percorso)?;
        let hex: String = chiave.iter().map(|b| format!("{b:02x}")).collect();
        conn.pragma_update(None, "key", format!("x'{hex}'"))?;
        // Con la chiave sbagliata la prima lettura fallisce ("file is not a database").
        if conn.query_row("SELECT count(*) FROM sqlite_master", [], |r| r.get::<_, i64>(0)).is_err() {
            return Err(Errore::ChiaveSbagliata);
        }
        conn.pragma_update(None, "foreign_keys", "ON")?;
        let mut db = Db { conn };
        db.migra()?;
        Ok(db)
    }

    pub fn versione(&self) -> Ris<i64> {
        Ok(self.conn.query_row("PRAGMA user_version", [], |r| r.get(0))?)
    }

    fn migra(&mut self) -> Ris<()> {
        let attuale = self.versione()?;
        for (i, sql) in MIGRAZIONI.iter().enumerate().skip(attuale as usize) {
            let tx = self.conn.transaction()?;
            tx.execute_batch(sql)?;
            tx.pragma_update(None, "user_version", (i + 1) as i64)?;
            tx.commit()?;
        }
        Ok(())
    }

    pub fn integrita(&self) -> Ris<String> {
        Ok(self.conn.query_row("PRAGMA integrity_check", [], |r| r.get(0))?)
    }

    pub fn vuoto(&self) -> Ris<bool> {
        Ok(self.conn.query_row("SELECT count(*) FROM clienti", [], |r| r.get::<_, i64>(0))? == 0
            && self.conn.query_row("SELECT count(*) FROM modelli", [], |r| r.get::<_, i64>(0))? == 0)
    }

    pub fn conta(&self, tabella: &str) -> Ris<i64> {
        // solo nomi di tabella noti: niente SQL costruito da testo esterno
        let t = match tabella {
            "clienti" | "visite" | "allegati" | "modelli" | "piani" | "diete" | "appuntamenti" | "alimenti" | "immagini" => tabella,
            _ => return Err(Errore::Json(format!("tabella sconosciuta: {tabella}"))),
        };
        Ok(self.conn.query_row(&format!("SELECT count(*) FROM {t}"), [], |r| r.get(0))?)
    }

    /// Carica i dati di esempio (stesso formato di `carica_tutto`) se il database è vuoto.
    pub fn semina_se_vuoto(&mut self, json_esempio: &str) -> Ris<bool> {
        if !self.vuoto()? {
            return Ok(false);
        }
        let v: Value = serde_json::from_str(json_esempio).map_err(|e| Errore::Json(e.to_string()))?;
        let tx = self.conn.transaction()?;
        {
            let db = Scrittura { c: &tx };
            for m in lista(&v, "modelli") { db.salva_modello(m)?; }
            for a in lista(&v, "alimenti") { db.salva_alimento(a)?; }
            for c in lista(&v, "clienti") { db.salva_cliente_completo(c)?; }
            for p in lista(&v, "piani") { db.salva_piano(p)?; }
            for d in lista(&v, "diete") { db.salva_dieta(d)?; }
            for a in lista(&v, "appuntamenti") { db.salva_appuntamento(a)?; }
        }
        tx.commit()?;
        Ok(true)
    }

    /// Tutto il contenuto, nello stesso formato dei dati del programma (src/data.ts):
    /// { clienti (con visite e allegati), modelli, piani, appuntamenti, alimenti, diete, immagini }.
    pub fn carica_tutto(&self) -> Ris<Value> {
        let c = &self.conn;
        let mut clienti: Vec<Value> = Vec::new();
        {
            let mut q = c.prepare("SELECT id, dati FROM clienti ORDER BY cognome, nome")?;
            let righe = q.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
            for riga in righe {
                let (id, dati) = riga?;
                let mut cl = json_da(&dati)?;
                let mut visite = Vec::new();
                let mut qv = c.prepare("SELECT dati FROM visite WHERE cliente_id = ?1 ORDER BY data")?;
                for d in qv.query_map([&id], |r| r.get::<_, String>(0))? { visite.push(json_da(&d?)?); }
                let mut allegati = Vec::new();
                let mut qa = c.prepare("SELECT id, nome, tipo, data, dimensione_kb, contenuto IS NOT NULL, descrizione FROM allegati WHERE cliente_id = ?1 ORDER BY data")?;
                for a in qa.query_map([&id], |r| {
                    let mut a = json!({
                        "id": r.get::<_, String>(0)?, "nome": r.get::<_, String>(1)?, "tipo": r.get::<_, String>(2)?,
                        "data": r.get::<_, String>(3)?, "dimensioneKb": r.get::<_, Option<i64>>(4)?,
                    });
                    // il file non viaggia con il cliente: si legge a parte con allegato_leggi
                    if r.get::<_, bool>(5)? { a["conFile"] = json!(true); }
                    if let Some(d) = r.get::<_, Option<String>>(6)? { a["descrizione"] = json!(d); }
                    Ok(a)
                })? { allegati.push(a?); }
                if let Some(o) = cl.as_object_mut() {
                    o.insert("visite".into(), Value::Array(visite));
                    o.insert("allegati".into(), Value::Array(allegati));
                }
                clienti.push(cl);
            }
        }
        let dati_di = |sql: &str| -> Ris<Vec<Value>> {
            let mut q = c.prepare(sql)?;
            let mut v = Vec::new();
            for d in q.query_map([], |r| r.get::<_, String>(0))? { v.push(json_da(&d?)?); }
            Ok(v)
        };
        let mut appuntamenti = Vec::new();
        {
            let mut q = c.prepare("SELECT id, cliente_id, data, ora, durata, tipo FROM appuntamenti ORDER BY data, ora")?;
            for a in q.query_map([], |r| Ok(json!({
                "id": r.get::<_, String>(0)?, "clienteId": r.get::<_, String>(1)?, "data": r.get::<_, String>(2)?,
                "ora": r.get::<_, String>(3)?, "durata": r.get::<_, i64>(4)?, "tipo": r.get::<_, String>(5)?,
            })))? { appuntamenti.push(a?); }
        }
        let mut immagini = Map::new();
        {
            let mut q = c.prepare("SELECT chiave, nome, mime, contenuto FROM immagini")?;
            for i in q.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?, r.get::<_, Vec<u8>>(3)?)))? {
                let (chiave, nome, mime, byte) = i?;
                let src = format!("data:{mime};base64,{}", base64::engine::general_purpose::STANDARD.encode(byte));
                immagini.insert(chiave, json!({ "nome": nome, "src": src }));
            }
        }
        let mut impostazioni = Map::new();
        {
            let mut q = c.prepare("SELECT chiave, valore FROM impostazioni")?;
            for i in q.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))? {
                let (chiave, valore) = i?;
                impostazioni.insert(chiave, json_da(&valore)?);
            }
        }
        Ok(json!({
            "clienti": clienti,
            "modelli": dati_di("SELECT dati FROM modelli ORDER BY tipo, kcal, nome")?,
            "piani": dati_di("SELECT dati FROM piani ORDER BY creato")?,
            "appuntamenti": appuntamenti,
            "alimenti": dati_di("SELECT dati FROM alimenti ORDER BY categoria, nome")?,
            "diete": dati_di("SELECT dati FROM diete")?,
            "immagini": immagini,
            "impostazioni": impostazioni,
        }))
    }

    /// Salva un elemento arrivato dal programma (una chiamata per ogni elemento cambiato).
    /// tipo: cliente (con visite e allegati, che vengono allineati), modello, piano, appuntamento,
    /// alimento, dieta, immagine ({chiave, nome, src: data URL}).
    pub fn salva(&mut self, tipo: &str, dati: &Value) -> Ris<()> {
        let tx = self.conn.transaction()?;
        {
            let s = Scrittura { c: &tx };
            match tipo {
                "cliente" => s.salva_cliente_allineato(dati)?,
                "modello" => s.salva_modello(dati)?,
                "piano" => s.salva_piano(dati)?,
                "appuntamento" => s.salva_appuntamento(dati)?,
                "alimento" => s.salva_alimento(dati)?,
                "dieta" => s.salva_dieta(dati)?,
                "immagine" => s.salva_immagine_data_url(dati)?,
                "impostazione" => s.salva_impostazione(dati)?,
                _ => return Err(Errore::Json(format!("tipo sconosciuto: {tipo}"))),
            }
        }
        tx.commit()?;
        Ok(())
    }

    /// Elimina un elemento (per un cliente: anche tutto ciò che è suo, vedi le regole in cima).
    pub fn elimina(&self, tipo: &str, id: &str) -> Ris<()> {
        let (tabella, colonna) = match tipo {
            "cliente" => ("clienti", "id"),
            "modello" => ("modelli", "id"),
            "piano" => ("piani", "id"),
            "appuntamento" => ("appuntamenti", "id"),
            "alimento" => ("alimenti", "id"),
            "dieta" => ("diete", "id"),
            "immagine" => ("immagini", "chiave"),
            "impostazione" => ("impostazioni", "chiave"),
            _ => return Err(Errore::Json(format!("tipo sconosciuto: {tipo}"))),
        };
        self.conn.execute(&format!("DELETE FROM {tabella} WHERE {colonna} = ?1"), [id])?;
        Ok(())
    }

    // --- Scritture singole ---
    pub fn salva_cliente(&self, c: &Value) -> Ris<()> { Scrittura { c: &self.conn }.salva_cliente(c) }
    pub fn salva_immagine(&self, chiave: &str, nome: &str, mime: &str, byte: &[u8]) -> Ris<()> {
        self.conn.execute(
            "INSERT INTO immagini(chiave, nome, mime, contenuto) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(chiave) DO UPDATE SET nome = excluded.nome, mime = excluded.mime, contenuto = excluded.contenuto",
            params![chiave, nome, mime, byte],
        )?;
        Ok(())
    }
    /// Il file di un allegato (PDF o foto), dentro il database cifrato. Crea la riga se non c'è ancora:
    /// il salvataggio automatico del cliente può arrivare prima o dopo, e non tocca mai il contenuto.
    pub fn allegato_salva_file(&self, cliente_id: &str, a: &Value, byte: &[u8]) -> Ris<()> {
        self.conn.execute(
            "INSERT INTO allegati(id, cliente_id, nome, tipo, data, dimensione_kb, descrizione, contenuto) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET contenuto = excluded.contenuto",
            params![testo(a, "id")?, cliente_id, testo(a, "nome")?, testo(a, "tipo")?, testo(a, "data")?, a.get("dimensioneKb").and_then(Value::as_i64),
                    a.get("descrizione").and_then(Value::as_str), byte],
        )?;
        Ok(())
    }
    /// Nome e contenuto del file di un allegato (None se l'allegato non ha file, es. quelli di esempio).
    pub fn allegato_leggi(&self, id: &str) -> Ris<Option<(String, Vec<u8>)>> {
        Ok(self.conn.query_row("SELECT nome, contenuto FROM allegati WHERE id = ?1 AND contenuto IS NOT NULL", [id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, Vec<u8>>(1)?))).optional()?)
    }
    pub fn elimina_cliente(&self, id: &str) -> Ris<()> {
        self.conn.execute("DELETE FROM clienti WHERE id = ?1", [id])?;
        Ok(())
    }
    pub fn elimina_modello(&self, id: &str) -> Ris<()> {
        self.conn.execute("DELETE FROM modelli WHERE id = ?1", [id])?;
        Ok(())
    }
    pub fn modello_di_piano(&self, piano_id: &str) -> Ris<Option<String>> {
        Ok(self.conn.query_row("SELECT modello_id FROM piani WHERE id = ?1", [piano_id], |r| r.get::<_, Option<String>>(0)).optional()?.flatten())
    }
}

/// Scritture che funzionano sia sulla connessione sia dentro una transazione.
struct Scrittura<'a> {
    c: &'a Connection,
}
impl Scrittura<'_> {
    fn salva_cliente(&self, c: &Value) -> Ris<()> {
        let mut dati = c.clone();
        if let Some(o) = dati.as_object_mut() { o.remove("visite"); o.remove("allegati"); }
        self.c.execute(
            "INSERT INTO clienti(id, nome, cognome, data_nascita, attivo, dati) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, cognome = excluded.cognome, data_nascita = excluded.data_nascita,
               attivo = excluded.attivo, dati = excluded.dati, aggiornato = datetime('now')",
            params![testo(c, "id")?, testo(c, "nome")?, testo(c, "cognome")?, c.get("dataNascita").and_then(Value::as_str),
                    c.get("attivo").and_then(Value::as_bool).unwrap_or(true), dati.to_string()],
        )?;
        Ok(())
    }
    fn salva_cliente_completo(&self, c: &Value) -> Ris<()> {
        self.salva_cliente(c)?;
        let id = testo(c, "id")?;
        for v in lista(c, "visite") { self.salva_visita(&id, v)?; }
        for a in lista(c, "allegati") {
            self.c.execute(
                "INSERT OR REPLACE INTO allegati(id, cliente_id, nome, tipo, data, dimensione_kb) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![testo(a, "id")?, id, testo(a, "nome")?, testo(a, "tipo")?, testo(a, "data")?, a.get("dimensioneKb").and_then(Value::as_i64)],
            )?;
        }
        Ok(())
    }
    /// Cliente con le sue visite e allegati: aggiorna tutto e toglie dal database ciò che il programma ha tolto.
    fn salva_cliente_allineato(&self, c: &Value) -> Ris<()> {
        self.salva_cliente(c)?;
        let id = testo(c, "id")?;
        let mut visite = Vec::new();
        for v in lista(c, "visite") {
            self.salva_visita(&id, v)?;
            visite.push(testo(v, "id")?);
        }
        let mut allegati = Vec::new();
        for a in lista(c, "allegati") {
            // solo i dati descrittivi: il contenuto del file, se c'è, resta com'è
            self.c.execute(
                "INSERT INTO allegati(id, cliente_id, nome, tipo, data, dimensione_kb, descrizione) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, tipo = excluded.tipo, data = excluded.data, dimensione_kb = excluded.dimensione_kb,
                   descrizione = excluded.descrizione",
                params![testo(a, "id")?, id, testo(a, "nome")?, testo(a, "tipo")?, testo(a, "data")?, a.get("dimensioneKb").and_then(Value::as_i64),
                        a.get("descrizione").and_then(Value::as_str)],
            )?;
            allegati.push(testo(a, "id")?);
        }
        self.togli_mancanti("visite", &id, &visite)?;
        self.togli_mancanti("allegati", &id, &allegati)?;
        Ok(())
    }
    fn togli_mancanti(&self, tabella: &str, cliente_id: &str, da_tenere: &[String]) -> Ris<()> {
        let presenti: Vec<String> = {
            let mut q = self.c.prepare(&format!("SELECT id FROM {tabella} WHERE cliente_id = ?1"))?;
            let r = q.query_map([cliente_id], |r| r.get::<_, String>(0))?.collect::<Result<_, _>>()?;
            r
        };
        for p in presenti.iter().filter(|p| !da_tenere.contains(p)) {
            self.c.execute(&format!("DELETE FROM {tabella} WHERE id = ?1"), [p])?;
        }
        Ok(())
    }
    fn salva_immagine_data_url(&self, d: &Value) -> Ris<()> {
        let src = testo(d, "src")?;
        let (testa, b64) = src.split_once(',').ok_or_else(|| Errore::Json("immagine non valida".into()))?;
        let mime = testa.strip_prefix("data:").and_then(|t| t.strip_suffix(";base64")).ok_or_else(|| Errore::Json("immagine non valida".into()))?;
        let byte = base64::engine::general_purpose::STANDARD.decode(b64).map_err(|e| Errore::Json(e.to_string()))?;
        self.c.execute(
            "INSERT INTO immagini(chiave, nome, mime, contenuto) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(chiave) DO UPDATE SET nome = excluded.nome, mime = excluded.mime, contenuto = excluded.contenuto",
            params![testo(d, "chiave")?, testo(d, "nome")?, mime, byte],
        )?;
        Ok(())
    }
    /// Impostazione dello studio ({chiave, valore}), es. dopo quanti mesi richiamare un cliente.
    fn salva_impostazione(&self, d: &Value) -> Ris<()> {
        let valore = d.get("valore").cloned().unwrap_or(Value::Null);
        self.c.execute(
            "INSERT INTO impostazioni(chiave, valore) VALUES (?1, ?2) ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore",
            params![testo(d, "chiave")?, valore.to_string()],
        )?;
        Ok(())
    }
    fn salva_visita(&self, cliente_id: &str, v: &Value) -> Ris<()> {
        self.c.execute(
            "INSERT INTO visite(id, cliente_id, data, tipo, dati) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET data = excluded.data, tipo = excluded.tipo, dati = excluded.dati, aggiornato = datetime('now')",
            params![testo(v, "id")?, cliente_id, testo(v, "data")?, testo(v, "tipo")?, v.to_string()],
        )?;
        Ok(())
    }
    fn salva_modello(&self, m: &Value) -> Ris<()> {
        self.c.execute(
            "INSERT INTO modelli(id, nome, tipo, kcal, modificato, dati) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, tipo = excluded.tipo, kcal = excluded.kcal, modificato = excluded.modificato, dati = excluded.dati",
            params![testo(m, "id")?, testo(m, "nome")?, testo(m, "tipo")?, m.get("kcal").and_then(Value::as_i64), testo(m, "modificato")?, m.to_string()],
        )?;
        Ok(())
    }
    fn salva_piano(&self, p: &Value) -> Ris<()> {
        self.c.execute(
            "INSERT INTO piani(id, cliente_id, modello_id, creato, dati) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET creato = excluded.creato, dati = excluded.dati",
            params![testo(p, "id")?, testo(p, "clienteId")?, p.get("modelloId").and_then(Value::as_str), testo(p, "creato")?, p.to_string()],
        )?;
        Ok(())
    }
    fn salva_dieta(&self, d: &Value) -> Ris<()> {
        self.c.execute("INSERT OR REPLACE INTO diete(id, cliente_id, dati) VALUES (?1, ?2, ?3)",
            params![testo(d, "id")?, testo(d, "clienteId")?, d.to_string()])?;
        Ok(())
    }
    fn salva_appuntamento(&self, a: &Value) -> Ris<()> {
        self.c.execute(
            "INSERT OR REPLACE INTO appuntamenti(id, cliente_id, data, ora, durata, tipo) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![testo(a, "id")?, testo(a, "clienteId")?, testo(a, "data")?, testo(a, "ora")?, a.get("durata").and_then(Value::as_i64).unwrap_or(45), testo(a, "tipo")?],
        )?;
        Ok(())
    }
    fn salva_alimento(&self, a: &Value) -> Ris<()> {
        self.c.execute("INSERT OR REPLACE INTO alimenti(id, nome, categoria, dati) VALUES (?1, ?2, ?3, ?4)",
            params![testo(a, "id")?, testo(a, "nome")?, testo(a, "categoria")?, a.to_string()])?;
        Ok(())
    }
}

fn lista<'a>(v: &'a Value, campo: &str) -> &'a [Value] {
    v.get(campo).and_then(Value::as_array).map(|a| a.as_slice()).unwrap_or(&[])
}
fn testo(v: &Value, campo: &str) -> Ris<String> {
    v.get(campo).and_then(Value::as_str).map(str::to_owned).ok_or_else(|| Errore::Json(format!("manca il campo «{campo}»")))
}
fn json_da(s: &str) -> Ris<Value> {
    serde_json::from_str(s).map_err(|e| Errore::Json(e.to_string()))
}

/// Dati di esempio inclusi nel programma (generati da scripts/esporta-dati-esempio.mjs).
pub const DATI_ESEMPIO: &str = include_str!("../dati-esempio.json");

#[cfg(test)]
mod test {
    use super::*;
    use std::path::PathBuf;

    const CHIAVE: [u8; 32] = [7; 32];

    fn file_prova(nome: &str) -> PathBuf {
        let p = std::env::temp_dir().join(format!("laloggia-test-{nome}-{}.db", std::process::id()));
        let _ = std::fs::remove_file(&p);
        p
    }

    #[test]
    fn crea_migra_e_semina() {
        let p = file_prova("semina");
        let mut db = Db::apri(&p, &CHIAVE).unwrap();
        assert_eq!(db.versione().unwrap(), VERSIONE_SCHEMA);
        assert!(db.semina_se_vuoto(DATI_ESEMPIO).unwrap());
        assert_eq!(db.conta("clienti").unwrap(), 9);
        assert!(db.conta("visite").unwrap() > 20);
        assert_eq!(db.conta("modelli").unwrap(), 1);
        assert_eq!(db.conta("piani").unwrap(), 1);
        assert_eq!(db.conta("alimenti").unwrap(), 30);
        // una seconda volta non ricarica nulla
        assert!(!db.semina_se_vuoto(DATI_ESEMPIO).unwrap());
        assert_eq!(db.integrita().unwrap(), "ok");
        drop(db);
        let _ = std::fs::remove_file(&p);
    }

    #[test]
    fn file_cifrato_e_chiave_sbagliata() {
        let p = file_prova("cifra");
        let mut db = Db::apri(&p, &CHIAVE).unwrap();
        db.semina_se_vuoto(DATI_ESEMPIO).unwrap();
        drop(db);
        let byte = std::fs::read(&p).unwrap();
        assert!(!byte.starts_with(b"SQLite format 3"), "il file non deve essere un SQLite in chiaro");
        assert!(!byte.windows(7).any(|w| w == b"Fontana"), "nessun nome deve leggersi nel file");
        assert!(matches!(Db::apri(&p, &[9; 32]), Err(Errore::ChiaveSbagliata)));
        assert!(Db::apri(&p, &CHIAVE).is_ok());
        let _ = std::fs::remove_file(&p);
    }

    #[test]
    fn rilettura_uguale_ai_dati_di_esempio() {
        let p = file_prova("rilettura");
        let mut db = Db::apri(&p, &CHIAVE).unwrap();
        db.semina_se_vuoto(DATI_ESEMPIO).unwrap();
        let tutto = db.carica_tutto().unwrap();
        let esempio: Value = serde_json::from_str(DATI_ESEMPIO).unwrap();
        // ogni cliente di esempio torna identico (visite e allegati compresi)
        for c in esempio["clienti"].as_array().unwrap() {
            let letto = tutto["clienti"].as_array().unwrap().iter().find(|x| x["id"] == c["id"]).expect("cliente mancante");
            assert_eq!(letto, c, "cliente {} diverso dopo la rilettura", c["id"]);
        }
        assert_eq!(tutto["piani"][0], esempio["piani"][0]);
        assert_eq!(tutto["modelli"][0], esempio["modelli"][0]);
        drop(db);
        let _ = std::fs::remove_file(&p);
    }

    #[test]
    fn regole_modelli_e_cancellazione_cliente() {
        let p = file_prova("regole");
        let mut db = Db::apri(&p, &CHIAVE).unwrap();
        db.semina_se_vuoto(DATI_ESEMPIO).unwrap();
        // eliminare il modello non tocca il piano: resta con tutto il contenuto, collegamento vuoto
        assert_eq!(db.modello_di_piano("pa1").unwrap().as_deref(), Some("m1450"));
        db.elimina_modello("m1450").unwrap();
        assert_eq!(db.conta("piani").unwrap(), 1);
        assert_eq!(db.modello_di_piano("pa1").unwrap(), None);
        assert!(db.carica_tutto().unwrap()["piani"][0]["sezioni"].as_array().unwrap().len() > 5);
        // cancellare un cliente cancella visite, piani, appuntamenti e allegati suoi
        let visite_prima = db.conta("visite").unwrap();
        db.elimina_cliente("c9").unwrap();
        assert_eq!(db.conta("clienti").unwrap(), 8);
        assert!(db.conta("visite").unwrap() < visite_prima);
        assert_eq!(db.conta("piani").unwrap(), 0);
        let tutto = db.carica_tutto().unwrap();
        assert!(tutto["appuntamenti"].as_array().unwrap().iter().all(|a| a["clienteId"] != "c9"));
        assert_eq!(db.integrita().unwrap(), "ok");
        drop(db);
        let _ = std::fs::remove_file(&p);
    }

    #[test]
    fn immagini_caricate_tornano_uguali() {
        let p = file_prova("immagini");
        let db = Db::apri(&p, &CHIAVE).unwrap();
        let png = [0x89u8, b'P', b'N', b'G', 1, 2, 3];
        db.salva_immagine("img1", "foto", "image/png", &png).unwrap();
        let tutto = db.carica_tutto().unwrap();
        let src = tutto["immagini"]["img1"]["src"].as_str().unwrap();
        assert!(src.starts_with("data:image/png;base64,"));
        let b = base64::engine::general_purpose::STANDARD.decode(src.split(',').nth(1).unwrap()).unwrap();
        assert_eq!(b, png);
        drop(db);
        let _ = std::fs::remove_file(&p);
    }

    #[test]
    fn salva_generico_allinea_visite_ed_elimina() {
        let p = file_prova("generico");
        let mut db = Db::apri(&p, &CHIAVE).unwrap();
        db.semina_se_vuoto(DATI_ESEMPIO).unwrap();
        let tutto = db.carica_tutto().unwrap();
        let mut laura = tutto["clienti"].as_array().unwrap().iter().find(|x| x["id"] == "c9").unwrap().clone();
        let n = laura["visite"].as_array().unwrap().len();
        // tolgo una visita e ne aggiungo una nuova: il database deve seguire
        laura["visite"].as_array_mut().unwrap().remove(0);
        laura["visite"].as_array_mut().unwrap().push(json!({ "id": "vis-nuova", "data": "2026-10-23", "tipo": "Controllo", "peso": 65.5 }));
        db.salva("cliente", &laura).unwrap();
        let riletta = db.carica_tutto().unwrap()["clienti"].as_array().unwrap().iter().find(|x| x["id"] == "c9").unwrap().clone();
        assert_eq!(riletta["visite"].as_array().unwrap().len(), n);
        assert!(riletta["visite"].as_array().unwrap().iter().any(|v| v["id"] == "vis-nuova"));
        assert_eq!(riletta, laura);
        // immagine da data URL e cancellazioni generiche
        db.salva("immagine", &json!({ "chiave": "img-x", "nome": "foto", "src": "data:image/png;base64,iVBORw==" })).unwrap();
        assert_eq!(db.conta("immagini").unwrap(), 1);
        db.elimina("immagine", "img-x").unwrap();
        db.elimina("appuntamento", "ap10").unwrap();
        assert_eq!(db.conta("immagini").unwrap(), 0);
        assert!(db.carica_tutto().unwrap()["appuntamenti"].as_array().unwrap().iter().all(|a| a["id"] != "ap10"));
        assert!(db.salva("sconosciuto", &json!({})).is_err());
        // impostazioni dello studio: salvate, rilette, cambiate
        db.salva("impostazione", &json!({ "chiave": "mesiRichiamo", "valore": 3 })).unwrap();
        assert_eq!(db.carica_tutto().unwrap()["impostazioni"]["mesiRichiamo"], 3);
        db.salva("impostazione", &json!({ "chiave": "mesiRichiamo", "valore": 4 })).unwrap();
        assert_eq!(db.carica_tutto().unwrap()["impostazioni"]["mesiRichiamo"], 4);
        drop(db);
        let _ = std::fs::remove_file(&p);
    }

    #[test]
    fn allegato_con_file_resiste_al_salvataggio_del_cliente() {
        let p = file_prova("allegati");
        let mut db = Db::apri(&p, &CHIAVE).unwrap();
        db.semina_se_vuoto(DATI_ESEMPIO).unwrap();
        let mut c = db.carica_tutto().unwrap()["clienti"][0].clone();
        let id = c["id"].as_str().unwrap().to_string();
        let a = json!({ "id": "al-vero", "nome": "Referto.pdf", "tipo": "pdf", "data": "2026-10-24", "dimensioneKb": 1 });
        // il file arriva prima del salvataggio automatico del cliente
        db.allegato_salva_file(&id, &a, b"%PDF-prova").unwrap();
        assert_eq!(db.allegato_leggi("al-vero").unwrap(), Some(("Referto.pdf".into(), b"%PDF-prova".to_vec())));
        c["allegati"].as_array_mut().unwrap().push(a.clone());
        c["obiettivo"] = json!("cambiato");
        db.salva("cliente", &c).unwrap();
        // salvare il cliente (solo dati descrittivi) non cancella il file
        assert_eq!(db.allegato_leggi("al-vero").unwrap().unwrap().1, b"%PDF-prova".to_vec());
        let riletto = db.carica_tutto().unwrap()["clienti"].as_array().unwrap().iter().find(|x| x["id"] == id.as_str()).unwrap().clone();
        assert_eq!(riletto["allegati"].as_array().unwrap().iter().find(|x| x["id"] == "al-vero").unwrap()["conFile"], true);
        // descrizione e data cambiate da Valentina: salvate, e il file resta
        let al = c["allegati"].as_array_mut().unwrap().iter_mut().find(|x| x["id"] == "al-vero").unwrap();
        al["descrizione"] = json!("Analisi del sangue");
        al["data"] = json!("2026-03-15");
        db.salva("cliente", &c).unwrap();
        let riletto = db.carica_tutto().unwrap()["clienti"].as_array().unwrap().iter().find(|x| x["id"] == id.as_str()).unwrap().clone();
        let al = riletto["allegati"].as_array().unwrap().iter().find(|x| x["id"] == "al-vero").unwrap().clone();
        assert_eq!((al["descrizione"].as_str(), al["data"].as_str()), (Some("Analisi del sangue"), Some("2026-03-15")));
        assert!(db.allegato_leggi("al-vero").unwrap().is_some());
        // allegati di esempio: senza file
        assert!(db.allegato_leggi("nessuno").unwrap().is_none());
        // tolto dal cliente: via anche il file
        c["allegati"].as_array_mut().unwrap().retain(|x| x["id"] != "al-vero");
        db.salva("cliente", &c).unwrap();
        assert!(db.allegato_leggi("al-vero").unwrap().is_none());
        drop(db);
        let _ = std::fs::remove_file(&p);
    }

    #[test]
    fn modifica_salvata_e_riletta_dopo_riapertura() {
        let p = file_prova("modifica");
        let mut db = Db::apri(&p, &CHIAVE).unwrap();
        db.semina_se_vuoto(DATI_ESEMPIO).unwrap();
        let mut c = db.carica_tutto().unwrap()["clienti"][0].clone();
        c["obiettivo"] = json!("Obiettivo cambiato");
        db.salva_cliente(&c).unwrap();
        drop(db);
        let db = Db::apri(&p, &CHIAVE).unwrap();
        let letto = db.carica_tutto().unwrap()["clienti"].as_array().unwrap().iter().find(|x| x["id"] == c["id"]).unwrap().clone();
        assert_eq!(letto["obiettivo"], "Obiettivo cambiato");
        drop(db);
        let _ = std::fs::remove_file(&p);
    }
}
