// Archivio SQLite in chiaro (decisione 2026-10-25) collegato al programma con i comandi apri, salva, elimina
// e quelli degli allegati. La protezione del PC rubato è la cifratura del disco di Windows.
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Archivio(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![db_apri, db_salva, db_elimina, allegato_salva_file, allegato_leggi, allegato_esporta, stato_cifratura_disco])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
