const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const http = require('http'); 
const { Server } = require("socket.io");
const path = require('path');
const os = require('os');
const app = express();

// --- 1. MIDDLEWARE E RISORSE STATICHE ---
app.use(cors());
app.use(express.json()); // Per leggere i dati JSON inviati da Vue

//Espone la cartella dei referti per visualizzare XML+XSLT nel browser
app.use('/referti', express.static(path.join(__dirname, '../referti')));
//Espone la cartella del client Vue (UI)
app.use('/', express.static(path.join(__dirname, '../client')));

// --- 2. INIZIALIZZAZIONE DATABASE ---
const dbPath = path.join(__dirname, 'db/basket.db');
const sqlPath = path.join(__dirname, 'db/test.sql');

const db = new sqlite3.Database(dbPath);

// Inizializza le tabelle leggendo test.sql (se il file non esiste, lo crea)
const initSql = fs.readFileSync(sqlPath, 'utf8');
db.exec(initSql, (err) => {
    if (err) console.error("Errore inizializzazione DB:", err.message);
    else console.log("Database SQLite pronto e tabelle verificate.");
});

// --- 3. IMPORTAZIONE E AGGANCIO DELLE ROTTE AJAX ---
// Passiamo la connessione 'db' ai vari moduli router
const rottaSalvaPartita = require('./api/ajax/salva_partita')(db);
const rottaClassifica = require('./api/ajax/classifica')(db);
const rottaPartita = require('./api/ajax/partita')(db);
const rottaListaReferti = require('./api/ajax/lista_referti')(db);
const rottaMVP = require('./api/ajax/mvp')(db); 

// Definiamo i prefissi degli indirizzi API
app.use('/api/salva_partita', rottaSalvaPartita);
app.use('/api/classifica', rottaClassifica);
app.use('/api/partita', rottaPartita);
app.use('/api/lista_referti', rottaListaReferti);
app.use('/api/mvp', rottaMVP);

// --- 4. WEBSOCKETS (LOGICA LIVE SCORE) ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Permette al client Vue di connettersi senza blocchi CORS
});

io.on('connection', (socket) => {
    console.log('Un utente si è connesso (Admin o Visualizzatore)');

    // L'utente entra in una "stanza" specifica per la partita ID
    socket.on('entra_partita', (idPartita) => {
        socket.join(idPartita);
        console.log(`Utente registrato nella stanza partita: ${idPartita}`);
        // Annuncio nuovo spettatore
        socket.to(idPartita).emit('nuovo_spettatore');
    });

    // Quando l'admin (e soltanto l'admin) aggiorna i dati, li trasmettiamo a tutti gli spettatori nella stanza
    socket.on('aggiornamento_admin', (dati) => {
        //Controllo anti hackeraggio
        const CHIAVE_SEGRETA = "BasketTrackerSecret2026";
        // Verifica che il payload contenga la chiave segreta corretta
        if (!dati || dati.token !== CHIAVE_SEGRETA) {
            console.warn(`⚠️ [SICUREZZA] Tentativo di spoofing/hackeraggio rilevato dal socket ${socket.id}! Bloccato.`);
            return; 
        }
        // Invia il payload a tutti i client nella stanza 'idPartita' eccetto il mittente
        socket.to(dati.idPartita).emit('dati_live', dati.payload);
    });

    socket.on('partita_salvata', (idPartita) => {
        console.log(`Il referto della partita ${idPartita} è stato salvato. Avviso gli spettatori!`);
        // Il server riceve la conferma dall'admin e fa broadcasting a tutti gli utenti
        io.emit('referto_pronto', idPartita);
    });
    
    socket.on('disconnect', () => {
        console.log('Utente disconnesso');
    });
});

// --- 5. AVVIO DEL SERVER E RICERCA IP ---
const PORT = 3000;

// Funzione per scovare l'IP della rete in uso
function getNetworkIPs() {
    const interfacce = os.networkInterfaces();
    const indirizzi = [];
    for (const nomeRete in interfacce) {
        for (const rete of interfacce[nomeRete]) {
            // Cerchiamo solo gli indirizzi IPv4 e ignoriamo "localhost" (127.0.0.1)
            if (rete.family === 'IPv4' && !rete.internal) {
                indirizzi.push(rete.address);
            }
        }
    }
    return indirizzi;
}

server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🏀 BasketTracker Server Avviato!`);
    console.log(`==================================================`);
    
    console.log(`\n🔗 LINK PER L'ACCESSO:`);
    console.log(`💻 Dal computer locale: http://localhost:${PORT}`);
    
    // Stampa tutti gli IP validi trovati sulla rete
    const ips = getNetworkIPs();
    if (ips.length > 0) {
        ips.forEach(ip => {
            console.log(`📱 Da iPad / Smartphone: http://${ip}:${PORT}`);
        });
    } else {
        console.log(`📱 Da iPad / Smartphone: (Nessuna rete esterna trovata)`);
    }

    console.log(`\n🛠️  API Disponibili:`);
    console.log(`  - POST /api/salva_partita`);
    console.log(`  - GET  /api/classifica`);
    console.log(`  - GET  /api/partita/:id`);
    console.log(`  - GET  /api/lista_referti`);
    console.log(`  - GET  /api/mvp/:idPartita`);
    console.log(`==================================================\n`);
});