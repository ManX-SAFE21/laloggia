// Archivio SQLite in chiaro (decisione 2026-10-25) collegato al programma con i comandi apri, salva, elimina
// e quelli degli allegati. La protezione del PC rubato è la cifratura del disco di Windows.
mod backup;
mod db;

use serde_json::Value;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::Manager;

/// Il database aperto (uno solo, per tutto il programma).
struct Archivio(Mutex<Option<db::Db>>);

/// Cartella dei dati, separata dal programma: %APPDATA%\it.laloggia.gestionale\dati
fn cartella_dati(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let d = app.path().app_data_dir().map_err(|e| e.to_string())?.join("dati");
    std::fs::create_dir_all(&d).map_err(|e| format!("cartella dati: {e}"))?;
    Ok(d)
}

/// Archivio in chiaro (decisione 2026-10-25). Se trova il vecchio archivio cifrato delle versioni 0.1.x
/// (con la sua chiave provvisoria accanto), lo converte in chiaro una volta sola e tiene da parte l'originale:
/// gestionale-cifrato-vecchio.db + gestionale-cifrato-vecchio.chiave.
fn converti_vecchio_archivio(cartella: &Path) -> Result<(), String> {
    let db = cartella.join("gestionale.db");
    let chiave_file = cartella.join("chiave-provvisoria.bin");
    if !db::Db::file_cifrato(&db) {
        return Ok(());
    }
    let b = std::fs::read(&chiave_file).map_err(|_| "archivio cifrato ma la chiave provvisoria non c'è: non lo converto".to_string())?;
    let chiave = <[u8; 32]>::try_from(b.as_slice()).map_err(|_| "il file della chiave provvisoria è danneggiato".to_string())?;
    let nuovo = cartella.join("gestionale-chiaro.tmp");
    db::Db::converti_in_chiaro(&db, &chiave, &nuovo).map_err(|e| format!("conversione in chiaro non riuscita: {e}"))?;
    let vecchio = cartella.join("gestionale-cifrato-vecchio.db");
    std::fs::rename(&db, &vecchio).map_err(|e| format!("copia del vecchio archivio: {e}"))?;
    std::fs::rename(&nuovo, &db).map_err(|e| format!("archivio convertito: {e}"))?;
    std::fs::rename(&chiave_file, cartella.join("gestionale-cifrato-vecchio.chiave")).map_err(|e| e.to_string())?;
    Ok(())
}

/// Apre il database (creandolo con i dati di esempio la prima volta) e restituisce tutto il contenuto.
#[tauri::command]
fn db_apri(app: tauri::AppHandle, archivio: tauri::State<Archivio>) -> Result<Value, String> {
    let mut g = archivio.0.lock().map_err(|_| "database bloccato".to_string())?;
    if g.is_none() {
        let cartella = cartella_dati(&app)?;
        converti_vecchio_archivio(&cartella)?;
        let mut d = db::Db::apri(&cartella.join("gestionale.db"), None).map_err(|e| e.to_string())?;
        d.semina_se_vuoto(db::DATI_ESEMPIO).map_err(|e| e.to_string())?;
        d.alimenti_crea_se_mancano(db::ALIMENTI_CREA, db::DATI_ESEMPIO).map_err(|e| e.to_string())?;
        *g = Some(d);
    }
    let d = g.as_ref().unwrap();
    let mut tutto = d.carica_tutto().map_err(|e| e.to_string())?;
    tutto["percorso"] = Value::String(cartella_dati(&app)?.join("gestionale.db").display().to_string());
    Ok(tutto)
}

#[tauri::command]
fn db_salva(archivio: tauri::State<Archivio>, tipo: String, dati: Value) -> Result<(), String> {
    let mut g = archivio.0.lock().map_err(|_| "database bloccato".to_string())?;
    let d = g.as_mut().ok_or("database non aperto")?;
    d.salva(&tipo, &dati).map_err(|e| e.to_string())
}

#[tauri::command]
fn db_elimina(archivio: tauri::State<Archivio>, tipo: String, id: String) -> Result<(), String> {
    let g = archivio.0.lock().map_err(|_| "database bloccato".to_string())?;
    let d = g.as_ref().ok_or("database non aperto")?;
    d.elimina(&tipo, &id).map_err(|e| e.to_string())
}

/// Salva il file di un allegato (contenuto in base64) dentro il database.
#[tauri::command]
fn allegato_salva_file(archivio: tauri::State<Archivio>, cliente_id: String, allegato: Value, base64: String) -> Result<(), String> {
    use base64::Engine;
    let byte = base64::engine::general_purpose::STANDARD.decode(base64).map_err(|e| e.to_string())?;
    let g = archivio.0.lock().map_err(|_| "database bloccato".to_string())?;
    g.as_ref().ok_or("database non aperto")?.allegato_salva_file(&cliente_id, &allegato, &byte).map_err(|e| e.to_string())
}

/// Il file di un allegato in base64, per mostrarlo dentro il programma (mai copiato in chiaro sul disco).
#[tauri::command]
fn allegato_leggi(archivio: tauri::State<Archivio>, id: String) -> Result<String, String> {
    use base64::Engine;
    let g = archivio.0.lock().map_err(|_| "database bloccato".to_string())?;
    let (_, byte) = g.as_ref().ok_or("database non aperto")?.allegato_leggi(&id).map_err(|e| e.to_string())?
        .ok_or("questo allegato non ha un file")?;
    Ok(base64::engine::general_purpose::STANDARD.encode(byte))
}

/// "Salva una copia…": scrive il file dell'allegato dove ha scelto Valentina (copia NON cifrata, voluta).
#[tauri::command]
fn allegato_esporta(archivio: tauri::State<Archivio>, id: String, percorso: String) -> Result<(), String> {
    let g = archivio.0.lock().map_err(|_| "database bloccato".to_string())?;
    let (_, byte) = g.as_ref().ok_or("database non aperto")?.allegato_leggi(&id).map_err(|e| e.to_string())?
        .ok_or("questo allegato non ha un file")?;
    std::fs::write(&percorso, byte).map_err(|e| format!("copia non salvata: {e}"))
}

/// Il disco dove sta l'archivio è cifrato da Windows (Crittografia dispositivo / BitLocker)?
/// Si legge la proprietà di Windows `System.Volume.BitLockerProtection`, che non richiede permessi di
/// amministratore. Valori: 1 e 6 = protetto, 3 = cifratura in corso, 4 = decifratura in corso,
/// 5 = protezione sospesa, 2 e 0 = non protetto (0 su Windows 11 Home senza cifratura, provato il 2026-10-25).
/// ATTENZIONE: sul PC cifrato i valori vanno ancora verificati; nel dubbio si risponde "non verificabile".
#[tauri::command]
async fn stato_cifratura_disco(app: tauri::AppHandle) -> Result<Value, String> {
    let cartella = cartella_dati(&app)?;
    let unita: String = cartella.display().to_string().chars().take(2).collect(); // es. "C:"
    if !unita.ends_with(':') {
        return Ok(serde_json::json!({ "stato": "non-verificabile", "unita": unita }));
    }
    let comando = format!("(New-Object -ComObject Shell.Application).NameSpace('{unita}').Self.ExtendedProperty('System.Volume.BitLockerProtection')");
    let uscita = tauri::async_runtime::spawn_blocking(move || {
        let mut c = std::process::Command::new("powershell");
        c.args(["-NoProfile", "-NonInteractive", "-Command", &comando]);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            c.creation_flags(0x0800_0000); // CREATE_NO_WINDOW: nessuna finestra nera che lampeggia
        }
        c.output()
    })
    .await
    .map_err(|e| e.to_string())?;
    let valore = match uscita {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        _ => String::new(),
    };
    let stato = match valore.as_str() {
        "1" | "6" => "cifrato",
        "3" => "in-corso",
        "4" => "decifratura",
        "5" => "sospeso",
        "0" | "2" => "non-cifrato",
        _ => "non-verificabile",
    };
    Ok(serde_json::json!({ "stato": stato, "valore": valore, "unita": unita }))
}

// ---------------------------------------------------------------- backup (src/backup.rs)

fn file_stato_backup(cartella: &Path) -> PathBuf {
    cartella.join("stato-backup.json")
}

fn leggi_stato_backup(cartella: &Path) -> Value {
    std::fs::read_to_string(file_stato_backup(cartella)).ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| serde_json::json!({}))
}

/// Fotografia controllata dell'archivio in dati/backup-temp: si apre, è integra, quanti clienti contiene.
fn fotografia_controllata(archivio: &Archivio, cartella: &Path, nome: &str) -> Result<(PathBuf, i64), String> {
    let temp = cartella.join("backup-temp");
    std::fs::create_dir_all(&temp).map_err(|e| e.to_string())?;
    let foto = temp.join(nome);
    {
        let g = archivio.0.lock().map_err(|_| "database bloccato".to_string())?;
        g.as_ref().ok_or("database non aperto")?.fotografia(&foto).map_err(|e| format!("copia dell'archivio: {e}"))?;
    }
    let copia = db::Db::apri(&foto, None).map_err(|e| format!("la copia non si apre: {e}"))?;
    if copia.integrita().map_err(|e| e.to_string())? != "ok" {
        return Err("la copia non è integra".into());
    }
    let clienti = copia.conta("clienti").map_err(|e| e.to_string())?;
    Ok((foto, clienti))
}

/// Esegue il backup su disco esterno (in chiaro) e/o cloud (.7z cifrato). momento = "2026-10-25_1430" (ora locale).
/// Scrive l'esito in dati/stato-backup.json (fuori dall'archivio: Annulla non lo tocca).
#[tauri::command]
async fn backup_esegui(app: tauri::AppHandle, archivio: tauri::State<'_, Archivio>, momento: String,
                       cartella_disco: Option<String>, cartella_cloud: Option<String>) -> Result<Value, String> {
    let cartella = cartella_dati(&app)?;
    let (foto, clienti) = fotografia_controllata(&archivio, &cartella, &format!("{}{momento}.db", backup::PREFISSO))?;
    let password = backup::leggi_password(&cartella);
    let m = momento.clone();
    let (disco, cloud) = tauri::async_runtime::spawn_blocking(move || {
        let scelta = |c: &Option<String>| c.as_deref().map(str::trim).filter(|c| !c.is_empty()).map(PathBuf::from);
        let disco = scelta(&cartella_disco).map(|c| backup::su_destinazione(&foto, &c, &m, None));
        let cloud = scelta(&cartella_cloud).map(|c| match &password {
            Some(p) => backup::su_destinazione(&foto, &c, &m, Some(p)),
            None => serde_json::json!({ "esito": "errore", "messaggio": "manca la password del backup cloud (Impostazioni)" }),
        });
        let _ = std::fs::remove_file(&foto);
        (disco, cloud)
    })
    .await
    .map_err(|e| e.to_string())?;
    // si tiene anche l'ultimo backup RIUSCITO di ogni destinazione
    let mut stato = leggi_stato_backup(&cartella);
    for (chiave, r) in [("disco", &disco), ("cloud", &cloud)] {
        if let Some(r) = r {
            stato[chiave] = r.clone();
            stato[chiave]["quando"] = Value::String(momento.clone());
            if r["esito"] == "ok" {
                stato[format!("{chiave}UltimoOk")] = Value::String(momento.clone());
            }
        }
    }
    stato["ultimoTentativo"] = Value::String(momento);
    stato["clienti"] = Value::from(clienti);
    std::fs::write(file_stato_backup(&cartella), stato.to_string()).map_err(|e| e.to_string())?;
    Ok(stato)
}

/// Stato dei backup per l'indicatore e le Impostazioni.
#[tauri::command]
fn backup_stato(app: tauri::AppHandle) -> Result<Value, String> {
    let cartella = cartella_dati(&app)?;
    let mut stato = leggi_stato_backup(&cartella);
    stato["passwordPresente"] = Value::Bool(backup::leggi_password(&cartella).is_some());
    stato["setteZip"] = Value::Bool(backup::trova_7zip().is_some());
    Ok(stato)
}

/// La password del backup cloud (crea = true la genera se non c'è). Per mostrarla e stamparla.
#[tauri::command]
fn backup_password(app: tauri::AppHandle, crea: bool) -> Result<Option<String>, String> {
    let cartella = cartella_dati(&app)?;
    if crea { backup::crea_password(&cartella).map(Some) } else { Ok(backup::leggi_password(&cartella)) }
}

/// Vero se la cartella esiste (es. disco esterno collegato).
#[tauri::command]
fn cartella_esiste(percorso: String) -> bool {
    !percorso.trim().is_empty() && Path::new(percorso.trim()).is_dir()
}

/// Ripristina l'archivio da un backup (.db del disco o .7z del cloud). Prima salva lo stato attuale in
/// dati/prima-del-ripristino_<momento>.db, così si può sempre tornare indietro.
#[tauri::command]
async fn backup_ripristina(app: tauri::AppHandle, archivio: tauri::State<'_, Archivio>, file: String,
                           password: Option<String>, momento: String) -> Result<Value, String> {
    let cartella = cartella_dati(&app)?;
    let sorgente = PathBuf::from(&file);
    let lavoro = cartella.join("ripristino-temp");
    let _ = std::fs::remove_dir_all(&lavoro);
    std::fs::create_dir_all(&lavoro).map_err(|e| e.to_string())?;
    let candidato = if file.to_lowercase().ends_with(".7z") {
        let pw = password.filter(|p| !p.trim().is_empty()).or_else(|| backup::leggi_password(&cartella))
            .ok_or("serve la password del backup")?;
        let (s, l) = (sorgente.clone(), lavoro.clone());
        tauri::async_runtime::spawn_blocking(move || backup::estrai_7z(&s, &l, pw.trim()))
            .await.map_err(|e| e.to_string())??
    } else {
        let c = lavoro.join("candidato.db");
        std::fs::copy(&sorgente, &c).map_err(|e| format!("file non leggibile: {e}"))?;
        c
    };
    let clienti = {
        let prova = db::Db::apri(&candidato, None).map_err(|e| format!("il backup non si apre: {e}"))?;
        if prova.integrita().map_err(|e| e.to_string())? != "ok" {
            return Err("il backup non è integro: ripristino annullato".into());
        }
        prova.conta("clienti").map_err(|e| e.to_string())?
    };
    let sicurezza = cartella.join(format!("prima-del-ripristino_{momento}.db"));
    let mut g = archivio.0.lock().map_err(|_| "database bloccato".to_string())?;
    if let Some(d) = g.as_ref() {
        d.fotografia(&sicurezza).map_err(|e| format!("copia di sicurezza non riuscita: ripristino annullato ({e})"))?;
    }
    *g = None; // chiude l'archivio attuale
    let principale = cartella.join("gestionale.db");
    let copiato = std::fs::copy(&candidato, &principale);
    let riaperto = db::Db::apri(&principale, None);
    match (copiato, riaperto) {
        (Ok(_), Ok(d)) => *g = Some(d),
        (c, r) => {
            // qualcosa è andato storto: si rimette la copia di sicurezza
            let _ = std::fs::copy(&sicurezza, &principale);
            *g = db::Db::apri(&principale, None).ok();
            return Err(format!("ripristino non riuscito, archivio rimesso com'era ({:?} {:?})",
                c.err().map(|e| e.to_string()), r.err().map(|e| e.to_string())));
        }
    }
    drop(g);
    let _ = std::fs::remove_dir_all(&lavoro);
    Ok(serde_json::json!({ "clienti": clienti, "copiaDiSicurezza": sicurezza.display().to_string() }))
}

/// Le tabelle CREA lette una volta sola (servono per «Ripristina ai dati originali» e per i dettagli della fonte).
fn tabelle_crea() -> Result<&'static Value, String> {
    static TABELLE: std::sync::OnceLock<Result<Value, String>> = std::sync::OnceLock::new();
    TABELLE.get_or_init(|| serde_json::from_str(db::ALIMENTI_CREA).map_err(|e| e.to_string()))
        .as_ref().map_err(|e| e.clone())
}

/// L'alimento CREA originale (con metodo di analisi e referenza bibliografica di ogni valore).
#[tauri::command]
fn alimento_originale(codice: String) -> Result<Value, String> {
    let t = tabelle_crea()?;
    let a = t["alimenti"].as_array().and_then(|l| l.iter().find(|a| a["codiceCrea"] == codice.as_str()))
        .ok_or_else(|| format!("alimento CREA {codice} non trovato"))?;
    let riferimenti = t["riferimenti"].as_array().cloned().unwrap_or_default();
    Ok(serde_json::json!({ "alimento": a, "riferimenti": riferimenti, "fonte": t["fonte"] }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Archivio(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![db_apri, db_salva, db_elimina, allegato_salva_file, allegato_leggi, allegato_esporta, stato_cifratura_disco,
            backup_esegui, backup_stato, backup_password, backup_ripristina, cartella_esiste, alimento_originale])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
