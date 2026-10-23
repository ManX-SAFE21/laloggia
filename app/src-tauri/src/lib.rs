// Database cifrato (fase 2) collegato al programma (fase 3) con tre comandi: apri, salva, elimina.
mod db;

use serde_json::Value;
use std::path::PathBuf;
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

/// CHIAVE PROVVISORIA (solo per le prove, fase 3): casuale, creata al primo avvio e tenuta in un file
/// accanto al database. Chi copia l'intera cartella può aprire i dati: NON usare con dati veri.
/// Nella fase 4 la chiave verrà dal PIN e dalla password lunga (punto 00b di CLAUDE.md).
fn chiave_provvisoria(cartella: &PathBuf) -> Result<[u8; 32], String> {
    let f = cartella.join("chiave-provvisoria.bin");
    if let Ok(b) = std::fs::read(&f) {
        if let Ok(k) = <[u8; 32]>::try_from(b.as_slice()) {
            return Ok(k);
        }
        return Err("il file della chiave provvisoria è danneggiato".into());
    }
    let mut k = [0u8; 32];
    getrandom::fill(&mut k).map_err(|e| e.to_string())?;
    std::fs::write(&f, k).map_err(|e| format!("chiave provvisoria: {e}"))?;
    Ok(k)
}

/// Apre il database (creandolo con i dati di esempio la prima volta) e restituisce tutto il contenuto.
#[tauri::command]
fn db_apri(app: tauri::AppHandle, archivio: tauri::State<Archivio>) -> Result<Value, String> {
    let mut g = archivio.0.lock().map_err(|_| "database bloccato".to_string())?;
    if g.is_none() {
        let cartella = cartella_dati(&app)?;
        let chiave = chiave_provvisoria(&cartella)?;
        let mut d = db::Db::apri(&cartella.join("gestionale.db"), &chiave).map_err(|e| e.to_string())?;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Archivio(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![db_apri, db_salva, db_elimina, allegato_salva_file, allegato_leggi, allegato_esporta])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
