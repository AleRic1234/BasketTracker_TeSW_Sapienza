const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const http = require('http'); 
const { Server } = require("socket.io");

const app = express();

// --- 1. MIDDLEWARE E RISORSE STATICHE ---
app.use(cors());
app.use(express.json()); // Per leggere i dati JSON inviati da Vue

// Fondamentale: Espone la cartella dei referti per visualizzare XML+XSLT nel browser
app.use('/referti', express.static('../referti'));

// --- 2. INIZIALIZZAZIONE DATABASE ---
const db = new sqlite3.Database('./db/basket.db');

// Inizializza le tabelle leggendo test.sql (se il file non esiste, lo crea)
const initSql = fs.readFileSync('./db/test.sql', 'utf8');
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
    });

    // Quando l'admin aggiorna i dati, li trasmettiamo a tutti i visualizzatori nella stanza
    socket.on('aggiornamento_admin', (dati) => {
        // Invia il payload a tutti i client nella stanza 'idPartita' eccetto il mittente
        socket.to(dati.idPartita).emit('dati_live', dati.payload);
    });

    socket.on('disconnect', () => {
        console.log('Utente disconnesso');
    });
});

// --- 5. AVVIO DEL SERVER ---
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`--------------------------------------------------`);
    console.log(`BasketTracker Server in ascolto sulla porta ${PORT}`);
    console.log(`API Disponibili:`);
    console.log(`- POST /api/salva_partita`);
    console.log(`- GET  /api/classifica`);
    console.log(`- GET  /api/partita/:id`);
    console.log(`- GET  /api/lista_referti`);
    console.log(`- GET  /api/mvp/:idPartita`);
    console.log(`--------------------------------------------------`);
});