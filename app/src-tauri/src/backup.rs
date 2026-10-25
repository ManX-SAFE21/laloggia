//! Backup dell'archivio (decisione 2026-10-25, vedi CLAUDE.md):
//! - copia "fotografia" coerente (VACUUM INTO) controllata prima di usarla;
//! - disco esterno: file .db IN CHIARO (il disco è tenuto sotto chiave);
//! - cloud (cartella Dropbox): .7z AES-256 con i nomi nascosti, fatto con 7-Zip; si apre anche senza il programma;
//! - rotazione su ogni destinazione: 7 giornaliere, 4 settimanali, 12 mensili;
//! - password del cloud generata con il generatore sicuro di Windows (getrandom), tenuta in un file accanto
//!   all'archivio ma FUORI dai backup.
//! I nomi dei file contengono data e ora: "LaLoggia_2026-10-25_1430.db" / ".7z".

use serde_json::{json, Value};
use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::process::Command;

pub const PREFISSO: &str = "LaLoggia_";
pub const GIORNALIERE: usize = 7;
pub const SETTIMANALI: usize = 4;
pub const MENSILI: usize = 12;

// ---------------------------------------------------------------- nomi e date

/// "LaLoggia_2026-10-25_1430.7z" -> (anno, mese, giorno, "2026-10-25_1430"). Solo i nostri file.
pub fn data_dal_nome(nome: &str, estensione: &str) -> Option<(i64, u32, u32, String)> {
    let resto = nome.strip_prefix(PREFISSO)?.strip_suffix(estensione)?;
    let (data, ora) = resto.split_once('_')?;
    if ora.len() != 4 || !ora.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let mut p = data.split('-');
    let (a, m, g) = (p.next()?.parse().ok()?, p.next()?.parse().ok()?, p.next()?.parse().ok()?);
    if p.next().is_some() || !(1..=12).contains(&m) || !(1..=31).contains(&g) {
        return None;
    }
    Some((a, m, g, resto.to_string()))
}

/// Giorni dal 1970-01-01 (algoritmo "days from civil"): serve a contare le settimane senza librerie.
fn giorni(a: i64, m: u32, g: u32) -> i64 {
    let a = if m <= 2 { a - 1 } else { a };
    let era = a.div_euclid(400);
    let ya = a - era * 400;
    let mp = (m as i64 + 9) % 12;
    let gy = (153 * mp + 2) / 5 + g as i64 - 1;
    let ge = ya * 365 + ya / 4 - ya / 100 + gy;
    era * 146_097 + ge - 719_468
}

/// Settimana (da lunedì): il 1970-01-01 era giovedì.
fn settimana(a: i64, m: u32, g: u32) -> i64 {
    (giorni(a, m, g) + 3).div_euclid(7)
}

/// Quali file tenere: l'ultimo di ognuno degli ultimi 7 giorni, delle ultime 4 settimane e degli ultimi 12 mesi.
/// Restituisce i nomi da ELIMINARE (mai il più recente).
pub fn da_eliminare(nomi: &[String], estensione: &str) -> Vec<String> {
    let mut copie: Vec<(String, (i64, u32, u32), String)> = nomi
        .iter()
        .filter_map(|n| data_dal_nome(n, estensione).map(|(a, m, g, chiave)| (chiave, (a, m, g), n.clone())))
        .collect();
    copie.sort_by(|x, y| y.0.cmp(&x.0)); // dalla più recente
    let mut tenere = BTreeSet::new();
    let mut tieni = |quante: usize, periodo: &dyn Fn(&(i64, u32, u32)) -> i64| {
        let mut visti = BTreeSet::new();
        for (_, d, nome) in &copie {
            if visti.len() == quante && !visti.contains(&periodo(d)) {
                break;
            }
            if visti.insert(periodo(d)) {
                tenere.insert(nome.clone());
            }
        }
    };
    tieni(GIORNALIERE, &|&(a, m, g)| giorni(a, m, g));
    tieni(SETTIMANALI, &|&(a, m, g)| settimana(a, m, g));
    tieni(MENSILI, &|&(a, m, _)| a * 12 + m as i64);
    copie.into_iter().map(|c| c.2).filter(|n| !tenere.contains(n)).collect()
}

// ---------------------------------------------------------------- password

const ALFABETO: &[u8] = b"ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // niente 0/O e 1/I/L

/// 8 gruppi di 4 caratteri (31 simboli, ~158 bit), casuali dal generatore sicuro del sistema.
pub fn nuova_password() -> Result<String, String> {
    let mut caratteri = Vec::with_capacity(32);
    while caratteri.len() < 32 {
        let mut b = [0u8; 64];
        getrandom::fill(&mut b).map_err(|e| e.to_string())?;
        // si scartano i byte >= 248 (= 31 * 8): ogni simbolo ha la stessa probabilità
        caratteri.extend(b.iter().filter(|&&x| x < 248).map(|&x| ALFABETO[(x % 31) as usize]).take(32 - caratteri.len()));
    }
    Ok(caratteri.chunks(4).map(|c| String::from_utf8_lossy(c).to_string()).collect::<Vec<_>>().join("-"))
}

pub fn file_password(cartella_dati: &Path) -> PathBuf {
    cartella_dati.join("password-backup-cloud.txt")
}

pub fn leggi_password(cartella_dati: &Path) -> Option<String> {
    std::fs::read_to_string(file_password(cartella_dati)).ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

/// La crea solo se non c'è ancora (non si sovrascrive mai: i backup vecchi si aprono con quella).
pub fn crea_password(cartella_dati: &Path) -> Result<String, String> {
    if let Some(p) = leggi_password(cartella_dati) {
        return Ok(p);
    }
    let p = nuova_password()?;
    std::fs::write(file_password(cartella_dati), &p).map_err(|e| format!("password non salvata: {e}"))?;
    Ok(p)
}

// ---------------------------------------------------------------- 7-Zip

pub fn trova_7zip() -> Option<PathBuf> {
    ["C:\\Program Files\\7-Zip\\7z.exe", "C:\\Program Files (x86)\\7-Zip\\7z.exe"]
        .iter()
        .map(PathBuf::from)
        .find(|p| p.exists())
}

fn sette_zip(args: &[&str]) -> Result<(), String> {
    let exe = trova_7zip().ok_or("7-Zip non trovato: installalo da 7-zip.org (gratuito)")?;
    let mut c = Command::new(exe);
    c.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        c.creation_flags(0x0800_0000); // nessuna finestra
    }
    let o = c.output().map_err(|e| format!("7-Zip non partito: {e}"))?;
    if o.status.success() {
        Ok(())
    } else {
        Err(format!("7-Zip: {}", String::from_utf8_lossy(&o.stderr).trim()))
    }
}

/// Archivio .7z AES-256 con nomi nascosti (-mhe=on); poi lo si ricontrolla con la stessa password.
pub fn crea_7z(sorgente: &Path, destinazione: &Path, password: &str) -> Result<(), String> {
    let _ = std::fs::remove_file(destinazione);
    let (s, d, p) = (sorgente.display().to_string(), destinazione.display().to_string(), format!("-p{password}"));
    sette_zip(&["a", "-t7z", "-mhe=on", "-mx=5", "-y", &p, &d, &s])?;
    sette_zip(&["t", "-y", &p, &d]).map_err(|e| format!("verifica dell'archivio non riuscita: {e}"))
}

/// Estrae il .db da un .7z (per il ripristino) nella cartella indicata.
pub fn estrai_7z(archivio: &Path, cartella: &Path, password: &str) -> Result<PathBuf, String> {
    std::fs::create_dir_all(cartella).map_err(|e| e.to_string())?;
    let (a, o, p) = (archivio.display().to_string(), format!("-o{}", cartella.display()), format!("-p{password}"));
    sette_zip(&["e", "-y", &p, &o, &a]).map_err(|_| "password sbagliata o archivio danneggiato".to_string())?;
    std::fs::read_dir(cartella)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok().map(|e| e.path()))
        .find(|p| p.extension().is_some_and(|x| x == "db"))
        .ok_or_else(|| "nell'archivio non c'è un file .db".to_string())
}

// ---------------------------------------------------------------- una destinazione

/// Copia (disco: .db; cloud: .7z) in una cartella, con nome provvisorio e poi rinomina (Dropbox non vede mezzi file),
/// poi rotazione. Restituisce un riassunto per l'indicatore.
pub fn su_destinazione(fotografia: &Path, cartella: &Path, momento: &str, password: Option<&str>) -> Value {
    let estensione = if password.is_some() { ".7z" } else { ".db" };
    let nome = format!("{PREFISSO}{momento}{estensione}");
    if !cartella.is_dir() {
        return json!({ "esito": "non-collegato", "messaggio": format!("cartella non trovata: {}", cartella.display()) });
    }
    let provvisorio = cartella.join(format!("{nome}.parziale"));
    let fatto = match password {
        Some(p) => crea_7z(fotografia, &provvisorio, p),
        None => std::fs::copy(fotografia, &provvisorio).map(|_| ()).map_err(|e| e.to_string()),
    }
    .and_then(|_| std::fs::rename(&provvisorio, cartella.join(&nome)).map_err(|e| e.to_string()));
    if let Err(e) = fatto {
        let _ = std::fs::remove_file(&provvisorio);
        return json!({ "esito": "errore", "messaggio": e });
    }
    let nomi: Vec<String> = std::fs::read_dir(cartella)
        .map(|r| r.filter_map(|e| e.ok()).map(|e| e.file_name().to_string_lossy().to_string()).collect())
        .unwrap_or_default();
    let mut eliminati = 0;
    for n in da_eliminare(&nomi, estensione) {
        if std::fs::remove_file(cartella.join(&n)).is_ok() {
            eliminati += 1;
        }
    }
    let (copie, byte) = std::fs::read_dir(cartella)
        .map(|r| {
            r.filter_map(|e| e.ok())
                .filter(|e| data_dal_nome(&e.file_name().to_string_lossy(), estensione).is_some())
                .fold((0u64, 0u64), |(n, b), e| (n + 1, b + e.metadata().map(|m| m.len()).unwrap_or(0)))
        })
        .unwrap_or((0, 0));
    json!({ "esito": "ok", "file": nome, "eliminati": eliminati, "copie": copie, "byteTotali": byte })
}

#[cfg(test)]
mod test {
    use super::*;

    fn nomi_giornalieri(da: (i64, u32, u32), quanti: i64) -> Vec<String> {
        // un backup al giorno, per "quanti" giorni a partire da "da"
        let inizio = giorni(da.0, da.1, da.2);
        (0..quanti)
            .map(|i| {
                let z = inizio + i + 719_468;
                let era = z.div_euclid(146_097);
                let doe = z - era * 146_097;
                let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
                let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
                let mp = (5 * doy + 2) / 153;
                let g = doy - (153 * mp + 2) / 5 + 1;
                let m = if mp < 10 { mp + 3 } else { mp - 9 };
                let a = yoe + era * 400 + if m <= 2 { 1 } else { 0 };
                format!("{PREFISSO}{a:04}-{m:02}-{g:02}_1900.7z")
            })
            .collect()
    }

    #[test]
    fn nomi_riconosciuti_solo_i_nostri() {
        assert_eq!(data_dal_nome("LaLoggia_2026-10-25_1430.7z", ".7z").unwrap().3, "2026-10-25_1430");
        assert!(data_dal_nome("LaLoggia_2026-10-25_1430.db", ".7z").is_none());
        assert!(data_dal_nome("foto vacanze.7z", ".7z").is_none());
        assert!(data_dal_nome("LaLoggia_2026-13-01_1430.7z", ".7z").is_none());
    }

    #[test]
    fn rotazione_7_giornaliere_4_settimanali_12_mensili() {
        // due anni di backup giornalieri: restano al massimo 7 + 4 + 12 copie (alcune coincidono)
        let nomi = nomi_giornalieri((2024, 10, 26), 730);
        let via = da_eliminare(&nomi, ".7z");
        let restano: Vec<&String> = nomi.iter().filter(|n| !via.contains(n)).collect();
        assert!(restano.len() <= 23 && restano.len() >= 12, "restano {}", restano.len());
        // gli ultimi 7 giorni ci sono tutti
        for n in &nomi[nomi.len() - 7..] {
            assert!(restano.contains(&n), "manca {n}");
        }
        // niente più vecchio di 12 mesi circa
        assert!(restano.iter().all(|n| n.as_str() >= "LaLoggia_2025-10-01"), "{restano:?}");
        // il più recente non si elimina mai, e una seconda passata non toglie altro
        assert!(!via.contains(nomi.last().unwrap()));
        let rimasti: Vec<String> = restano.into_iter().cloned().collect();
        assert!(da_eliminare(&rimasti, ".7z").is_empty());
    }

    #[test]
    fn piu_backup_nello_stesso_giorno_resta_il_piu_recente() {
        let nomi: Vec<String> = ["LaLoggia_2026-10-25_0900.db", "LaLoggia_2026-10-25_1900.db", "LaLoggia_2026-10-24_1900.db"]
            .iter().map(|s| s.to_string()).collect();
        assert_eq!(da_eliminare(&nomi, ".db"), vec!["LaLoggia_2026-10-25_0900.db".to_string()]);
    }

    #[test]
    fn password_8_gruppi_di_4_senza_caratteri_ambigui() {
        let p = nuova_password().unwrap();
        let gruppi: Vec<&str> = p.split('-').collect();
        assert_eq!(gruppi.len(), 8);
        assert!(gruppi.iter().all(|g| g.len() == 4 && g.bytes().all(|b| ALFABETO.contains(&b))));
        assert_ne!(p, nuova_password().unwrap());
    }

    #[test]
    fn archivio_7z_si_apre_solo_con_la_password_giusta() {
        if trova_7zip().is_none() {
            eprintln!("7-Zip non installato: prova saltata");
            return;
        }
        let dir = std::env::temp_dir().join(format!("laloggia-7z-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let sorgente = dir.join("prova.db");
        std::fs::write(&sorgente, b"SQLite format 3\0 contenuto di prova").unwrap();
        let archivio = dir.join("prova.7z");
        crea_7z(&sorgente, &archivio, "ABCD-EFGH").unwrap();
        let byte = std::fs::read(&archivio).unwrap();
        assert!(!byte.windows(8).any(|w| w == b"prova.db"), "il nome del file non deve leggersi (-mhe=on)");
        assert!(estrai_7z(&archivio, &dir.join("sbagliata"), "XXXX").is_err());
        let estratto = estrai_7z(&archivio, &dir.join("giusta"), "ABCD-EFGH").unwrap();
        assert_eq!(std::fs::read(estratto).unwrap(), std::fs::read(&sorgente).unwrap());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
