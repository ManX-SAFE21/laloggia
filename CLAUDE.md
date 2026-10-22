# Gestionale La Loggia — istruzioni di progetto per Claude Code

Programma desktop per Windows, fatto su misura per la biologa nutrizionista dello studio
**La Loggia · Benessere Naturale** di Malo (VI). Serve a gestire clienti, visite, misure,
diete, agenda e (più avanti) fatturazione.

Il committente è Manuxxx, che sviluppa il programma facendo scrivere il codice a Claude.
La nutrizionista è l'unica utente. Il software non è pensato per essere venduto.

## Regola di lavoro (OBBLIGATORIA)

- Per ogni dubbio, anche piccolo, **non inventare: chiedi** a Manuxxx prima di agire.
- Prima di eseguire un piano analizzato, **chiedi sempre conferma**.
- Comunica in italiano. I termini tecnici in inglese vanno bene.

## Situazione attuale

- Oggi la nutrizionista tiene un file Word per ogni cliente, dentro una cartella del PC.
  I clienti sono circa 100.
- Ha provato NutriBrain AI e Sifa Dieta, ma non funzionano come vuole lei.
- **Materiali attesi (non ancora ricevuti):** lo schema di ciò che le serve, schede cliente
  di esempio ed esempi di dieta. Quando arrivano, **i campi della scheda e la struttura della
  dieta vanno ricavati da lì**. Quelli del mockup sono provvisori e generici.

## Decisioni prese

### Piattaforma e stack
- Windows (10/11), un solo PC.
- **Tauri 2**: backend in **Rust**, interfaccia in **TypeScript + React** (Vite).
- Database **SQLite cifrato con SQLCipher** (es. crate `rusqlite` con feature `bundled-sqlcipher`).
- Distribuzione: installer `.msi`/`.exe` generato con `npm run tauri build`.
  - Nessuna firma del codice per ora: alla prima installazione compare "Windows ha protetto il PC".
  - Aggiornamenti manuali (nuovo installer). L'updater automatico di Tauri si valuterà più avanti.
- I dati stanno in una cartella separata dal programma (es. `%APPDATA%`), quindi
  gli aggiornamenti non li toccano.

### Sicurezza (scelta "C")
- **Nessuna dipendenza dal portachiavi del sistema operativo** (no Gestione credenziali di Windows):
  la cifratura la gestisce il programma da solo.
- **All'avvio:** password di almeno **10 caratteri** (può essere una frase).
  Dalla password si deriva la chiave del database, consigliato **Argon2id** con salt salvato.
- **Database e backup cifrati.**
- **Blocco per inattività dopo 10 minuti** (mouse/tastiera). Prima del blocco si salva
  quello che si stava scrivendo. Blocco immediato anche con "Blocca ora", con Win+L e con la sospensione.
- **Sblocco dopo inattività:** PIN di **6 cifre**. Il PIN vale solo finché il programma è aperto.
  Alla chiusura o al riavvio serve di nuovo la password.
- **Dopo 6 PIN errati** viene chiesta la password completa.
- **Frase di recupero:** generata alla prima configurazione, da stampare e conservare. Serve per:
  1. aprire il database se si dimentica la password;
  2. ripristinare i backup su qualsiasi PC.
  Un unico foglio per tutto.
  Implementazione suggerita: chiave dati casuale (DEK), salvata due volte, una cifrata con la
  chiave derivata dalla password e una con quella derivata dalla frase di recupero.
  **Confermare l'approccio con Manuxxx prima di implementarlo.**
- Allegati (referti PDF, foto): cifrati, dentro l'archivio o comunque mai in chiaro su disco.

### Backup
Obiettivo: i backup devono restare apribili anche se il programma ha bug o non esiste più.

- **Formato:** copia coerente del database SQLite (backup API di SQLite), messa in un
  archivio **7-Zip cifrato AES-256**. Niente formati o crittografia fatti da noi: l'archivio
  si apre a mano con 7-Zip gratuito inserendo la password.
- **Chiave dell'archivio:** una **password lunga** (non le 12 parole), stampata in caratteri
  molto grandi e conservata in un posto sicuro.
- **Automatico:** alla chiusura del programma e una volta al giorno.
- **Destinazioni:**
  - **Dropbox** (piano gratuito, installato da Manuxxx sul PC di lei; cartella sincronizzata,
    nessuna API): ci va l'archivio 7-Zip già cifrato. Funziona anche con altri servizi cloud.
  - **Disco esterno o chiavetta:** se non è collegato, la copia si fa appena lo si collega.
- **Rotazione:** 7 giornalieri, 4 settimanali, 12 mensili.
- **Verifica automatica dopo ogni backup:** decifrare in una cartella temporanea, aprire il
  database, eseguire il controllo di integrità di SQLite, contare clienti, visite e diete.
  In caso di errore, avviso chiaro. Stato visibile ("Ultimo backup: …") e avviso se manca
  da qualche giorno.
- **Prova di ripristino periodica** (es. promemoria mensile) in un'area di prova, senza
  toccare i dati veri.
- **Ripristino** con un pulsante. Prima di ripristinare si salva una copia dello stato attuale.
- **Foglio di istruzioni** da conservare con la password: "come aprire il backup con 7-Zip
  senza il programma". Va provato una volta per davvero.
- Limite noto: il programma non può verificare che Dropbox abbia davvero caricato il file online.
- Allegati: pochi (qualche PDF e qualche foto), quindi i 2 GB di Dropbox gratuito bastano.
- Scartati per ora: cloud cifrati end-to-end (Proton Drive, Tresorit), Cryptomator sopra Dropbox.

**Da decidere (chiedere a Manuxxx):**
- Copia **in chiaro** su disco esterno, in più rispetto a Dropbox cifrato: rotazione 7/4/12
  anche lì o meno copie? Disco sempre collegato (rischio ransomware) o collegato ogni tanto?
  Cifrarlo con BitLocker To Go, se l'edizione di Windows lo consente?
- Gli allegati (PDF e foto) entrano nello stesso archivio?
- Effetti sulla sezione "Sicurezza": la frase di recupero di 12 parole per i backup viene
  sostituita dalla password lunga? Resta qualcosa per sbloccare il database se si dimentica
  il PIN?
- Dopo la conferma, aggiornare anche il mockup: `Impostazioni.tsx` (testo backup, finestra
  "Frase di recupero", ripristino) e il link "Usa la frase di recupero" in `Lock.tsx`.

### Privacy / GDPR
- Trattare i dati **come dati relativi alla salute** (anamnesi, patologie, farmaci,
  peso e misure possono rientrarci). Classificazione definitiva da verificare con il
  consulente privacy o con l'Ordine dei Biologi.
- **Consenso solo su modulo cartaceo** (decisione di Manuxxx: niente invio email dal programma).
  Flusso:
  1. Dalla scheda cliente il programma genera il **modulo in PDF, già compilato con i dati del cliente**:
     manca solo la firma.
  2. Valentina (la titolare dello studio) lo stampa e lo fa firmare.
  3. Nel programma spunta "Il cliente ha firmato il modulo e ho tenuto da parte la copia cartacea"
     e indica la **data della firma** (può essere precedente a oggi).
  4. Il programma registra: stato, data della firma, versione dell'informativa, modalità "cartaceo".
  5. La copia cartacea firmata la conserva lo studio. La registrazione si può annullare.
- **Il testo del modulo NON va inventato**: informativa e consenso sono documenti legali e il testo
  deve venire dalla titolare o dal suo consulente privacy. Finché non arriva, il modulo contiene
  segnaposto, con un riquadro rosso "TESTO DI ESEMPIO" che si stampa. La versione è "v0 (segnaposto)".
  Quando arriva il modulo ufficiale: usarlo come base e compilare solo i campi variabili.
- Funzioni richieste: **esportazione** di tutti i dati di un cliente, **archiviazione**,
  **cancellazione definitiva**.

### Funzioni previste
- Anagrafica, anamnesi, storico visite, misure (peso, circonferenze, massa grassa), grafici.
- Diete: editor a giorni e pasti, banca dati alimenti, totali di kcal e macronutrienti,
  copia di un giorno sulla settimana, stampa e PDF con l'intestazione dello studio.
  Banca dati ufficiale da concordare (es. CREA). Metodo (grammi, porzioni, alternative)
  da ricavare dai suoi esempi.
- **Elenco alimenti** (voce "Alimenti" nel menu): tabella con ricerca e categorie, aggiunta, modifica ed
  eliminazione. Un alimento usato in una dieta non si può eliminare. Nel mockup: kcal, proteine,
  carboidrati e grassi per 100 g. Da decidere: altri valori (zuccheri, fibre, grassi saturi, sale…),
  caricamento da Excel/CSV con anteprima e controllo errori, porzioni (es. "1 uovo = 60 g"),
  origine dei dati (file di Valentina o banca dati ufficiale come CREA, con formato e licenza da verificare).
- **Icone degli alimenti:** set monocromatico vettoriale bianco/nero (font Noto Emoji, licenza OFL, sottoinsieme incorporato in `src/fonts/`), 64 simboli a scelta. Compaiono nella lista alimenti, nell'editor e nella dieta stampata (leggibili anche in B/N). Se non ne è scelta una, vale quella della categoria.
- Allegati PDF e foto per cliente.
- **Agenda** interna con appuntamenti.
- **Fatturazione:** richiesta, ma i dettagli sono ancora tutti da definire (vedi sotto).
  Regole fiscali e Sistema TS vanno verificati su fonti aggiornate, mai dati per scontati.
- Importazione semiautomatica dei ~100 file Word esistenti: da valutare dopo aver visto i file.

### Stile grafico
Ripreso dalla pagina Facebook dello studio: verde oliva (`#6c7559`), crema (`#ece3d6`),
salvia (`#a9ba98`), titoli con grazie. Vedi le variabili in `mockup/src/styles.css`.

## Punti ancora aperti (chiedere prima di decidere)
00. **Modifica di un alimento e diete già fatte:** nel mockup, cambiare i valori di un alimento ricalcola
   tutte le diete che lo usano, anche quelle vecchie. Nel programma vero conviene che ogni dieta conservi
   i valori che aveva quando è stata creata (copia o versione), per non alterare piani già consegnati.
   Da confermare con Manuxxx prima di progettare il database.
00b. **Sicurezza all'avvio:** Manuxxx vuole togliere la password all'avvio e usare solo un PIN di
   6 caratteri; le 12 parole servirebbero per i backup. Da decidere: PIN di 6 cifre o 6 caratteri
   alfanumerici, e database in chiaro oppure cifrato con una chiave ricavata dal PIN (protezione limitata
   dalla forza del PIN). Finché non è deciso, restano valide le regole della sezione "Sicurezza".
   **Già deciso da Manuxxx (2026-10-22) e fatto nella prova `app/`:**
   - Niente password all'avvio: **PIN di 4 cifre** sia all'avvio sia dopo il blocco. PIN iniziale `1234`,
     modificabile in Impostazioni ("Cambia PIN": PIN attuale, nuovo, conferma).
   - **Dopo 6 PIN errati si attende:** 5 minuti per le prime 3 volte, poi 30 minuti, poi 1 ora ogni volta.
     Dopo ogni attesa si hanno di nuovo 6 tentativi; il PIN giusto azzera tutto. Mai password lunghe.
   - Errori e attesa restano anche chiudendo il programma.
   - Implementazione di prova (`src/pin.ts`): impronta PBKDF2-SHA256 (100.000 iterazioni, salt casuale)
     nella memoria locale di WebView2 (`%LOCALAPPDATA%\it.laloggia.gestionale`). Limiti noti: le attese
     dipendono dall'orologio del PC; se il PIN si dimentica non c'è recupero (solo cancellando i dati del
     programma, e il PIN torna `1234`).
   **Ancora aperto:** database in chiaro o cifrato (con 4 cifre, una chiave ricavata dal PIN si forza
   in pochi secondi fuori dal programma: meglio una chiave casuale salvata sul PC, col PIN che protegge
   solo l'accesso); come recuperare un PIN dimenticato; sorte della frase di 12 parole. Quando si decide,
   riscrivere la sezione "Sicurezza".
0. **Modulo privacy:** Valentina ha già un modulo di informativa e consenso? (Se sì, usarlo come base.)
   La data della firma è sempre inseribile o basta quella di oggi? Serve poter allegare la scansione
   del modulo firmato (facoltativa)?
1. Schede Word, esempi di dieta e schema delle esigenze della nutrizionista.
2. Come costruisce la dieta: grammi e calorie, porzioni o alternative.
3. Misure prese alle visite, e marca della BIA se ne usa una.
4. Fatturazione: oggi come fattura, chi invia i dati al Sistema TS, regime fiscale
   (forfettario o ordinario).
5. Agenda: sincronizzazione con Google Calendar o col telefono? Promemoria ai clienti
   (email, SMS, WhatsApp)?
6. Impronta o volto (Windows Hello) come alternativa al PIN?
7. Il PC di lei ha la password di accesso? La cifratura del disco (BitLocker) è attiva?
   È un'ulteriore protezione facoltativa.

## Contenuto della cartella
- `APRI_MOCKUP.html`: mockup cliccabile compilato in un unico file. Si apre con doppio clic.
  Dati inventati, nessun salvataggio. Password demo: qualsiasi testo di almeno 10 caratteri. PIN demo: `123456`.
- `mockup/`: sorgente React + TypeScript del mockup (Vite). Le schermate sono pensate
  per essere riutilizzate nel frontend Tauri.
  - `npm install`, poi `npm run dev` (sviluppo) oppure `npm run build` (crea `dist/index.html`).
  - `src/types.ts`: modello dati provvisorio. `src/data.ts`: dati finti.
  - `src/screens/`: Lock, Oggi, Clienti, ClienteScheda, DietaEditor, Agenda, Impostazioni.
- `app/`: progetto **Tauri 2** di prova (creato il 2026-10-21 con il modello ufficiale React + TypeScript),
  con dentro una copia dell'interfaccia del mockup. Per ora nessun database né cifratura.
  - Versioni diverse dal mockup: **React 19, Vite 8** (il mockup è su React 18, Vite 5).
    Unica correzione per React 19: `useRef<number | undefined>(undefined)` in `src/App.tsx`.
  - Icona lucchetto a 16 px in `src/components/ui.tsx` (corretta solo qui, non in `mockup`).
  - `npm install`, poi `npm run tauri dev` (sviluppo) oppure `npm run tauri build` (installer).
  - Pacchetto Rust `gestionale-laloggia`, identificativo `it.laloggia.gestionale`.
  - Installer in `src-tauri/target/release/bundle/`: `nsis/…-setup.exe` e `msi/…_it-IT.msi`
    (entrambi in italiano). Eseguibile: `src-tauri/target/release/gestionale-laloggia.exe`.
  - Prima compilazione ~6 min, ricompilazione ~4 min (PC di Manuxxx, Windows 11).
  - `npm test`: test automatici (vitest) di `src/bia.test.ts` e `src/misure.test.ts`. Solo dati inventati.
- `materiale/`: file di Valentina con nomi fittizi: `0NUOVO CLIENTE.docx` (modulo di prima visita) e
  `1450 - PIATTO COMPLETO.docx` (modello di piano). **Il PDF della BIA non va mai nel repository.**

## Esempio "completo" in `app/` (2026-10-22, 4 blocchi, ancora senza database)
Cliente di esempio **Laura Fontana** (dati inventati): prima visita + 3 controlli ogni 2 mesi, ognuno con BIA.
1. **Visite, controlli, BIA, grafici** — `src/misure.ts` (elenco misure, differenze, +2 mesi), scheda
   "Visite e misure": un grafico per misura, tabella, dettaglio visita con tutti i valori BIA. Le differenze
   partono sempre dalla visita "Prima visita". Dopo una visita si propone il controllo a +2 mesi in agenda.
2. **Importazione PDF BIA** (BioTekna BIA-ACC) — `src/bia.ts` (lettura del testo, regole per etichetta;
   attenzione: "FM" è contenuto in "FFM"), `src/bia-pdf.ts` (pdf.js, offline), `screens/ImportaBia.tsx`
   (anteprima con avviso se nome/data di nascita non coincidono, spunte, storico facoltativo, dati del cliente).
3. **Piano alimentare stampabile** sul modello 1450 — `src/modelli/piano1450.ts` (testo di Valentina, alimenti
   in **grassetto** al posto del MAIUSCOLO), `components/PianoStampa.tsx` + `src/piano.css` (A4, font OFL
   Playfair Display + Source Sans 3 inclusi, immagini del suo Word in `src/assets/piano/`), `screens/PianoEditor.tsx`
   (modifica per cliente, sezioni incluse/escluse/spostate). Stampa/PDF con la stampa di Windows.
4. **Scheda "Prima visita"** (al posto di "Anamnesi") — `screens/PrimaVisita.tsx`: tutte le voci del modulo
   "Nuovo cliente" nello stesso ordine, misure legate alla prima visita/BIA, obiettivo, peso teorico,
   fabbisogno, retro del foglio (giornata tipo, frequenze settimanali, note).

**Da confermare con Valentina:** GV = AAT? Fabbisogno = 24EE o BMR? Lista esatta dei ~10 valori BIA.
Soglie e file degli altri 2 modelli di piano (basso/alto). Gruppi delle frequenze settimanali (proposti).
Allergie/intolleranze e patologie non sono nel suo modulo: servono? Provenienza/diritti delle immagini del Word
(Manuxxx ha detto di usarle). Stampa PDF reale del piano non ancora provata.

## Prossimi passi proposti (da confermare)
1. La nutrizionista prova il mockup e manda i suoi materiali.
2. Adattare scheda cliente e dieta ai suoi materiali, sempre nel mockup.
3. Creare il progetto Tauri 2 e spostarci dentro l'interfaccia.
4. Livello dati in Rust: SQLCipher, migrazioni, cifratura, backup e ripristino, con test automatici.
5. Stampa e PDF delle diete, allegati, privacy.
6. Agenda, poi fatturazione.
7. Installer e prima configurazione sul PC di lei.
