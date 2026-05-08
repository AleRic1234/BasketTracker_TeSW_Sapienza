// File: server/server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const http = require('http'); 
const { Server } = require("socket.io");

const app = express();

// --- MIDDLEWARE E STATICI ---
app.use(cors());
app.use(express.json()); 
app.use('/referti', express.static('../referti'));

// --- INIZIALIZZAZIONE DATABASE ---
const db = new sqlite3.Database('./db/basket.db');
const initSql = fs.readFileSync('./db/test.sql', 'utf8');
db.exec(initSql);

// --- IMPORTAZIONE E AGGANCIO DELLE ROTTE AJAX ---
// Importiamo i router e passiamo loro la connessione 'db'
const rottaSalvaPartita = require('./api/ajax/salva_partita')(db);
const rottaClassifica = require('./api/ajax/classifica')(db);
const rottaPartita = require('./api/ajax/partita')(db);
const rottaListaReferti = require('./api/ajax/lista_referti')(db);
const rottaMVP = require('./api/ajax/mvp')(db);

// Diciamo a Express di usare queste rotte per percorsi specifici
app.use('/api/salva_partita', rottaSalvaPartita);
app.use('/api/classifica', rottaClassifica);
app.use('/api/partita', rottaPartita);
app.use('/api/lista_referti', rottaListaReferti);
app.use('/api/mvp', rottaMVP);

// --- WEBSOCKETS (LIVE SCORE) ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Endpoint che riceve i dati da api.js
app.post('/api/salva_partita', (req, res) => {
    const datiVue = req.body; // Riceve il payload con { info, giocatori }

    if (!datiVue || Object.keys(datiVue).length === 0) {
        return res.status(400).json({ errore: "Nessun dato ricevuto. Il referto è vuoto." });
    }

    // 2. Controlla che esista l'oggetto 'info' e che contenga i nomi delle squadre
    if (!datiVue.info || !datiVue.info.squadra_casa || !datiVue.info.squadra_ospite) {
        return res.status(400).json({ errore: "Dati mancanti: specificare la squadra di casa e ospite." });
    }

    // 3. Controlla che i punteggi siano numeri (e non stringhe o vuoti)
    if (typeof datiVue.info.punti_casa !== 'number' || typeof datiVue.info.punti_ospite !== 'number') {
        return res.status(400).json({ errore: "I punteggi devono essere dei valori numerici validi." });
    }

    // 4. Controlla che esista l'array 'giocatori' e che non sia vuoto
    if (!datiVue.giocatori || !Array.isArray(datiVue.giocatori) || datiVue.giocatori.length === 0) {
        return res.status(400).json({ errore: "Referto non valido: la lista dei giocatori è assente o vuota." });
    }

    const info = datiVue.info;
    
    console.log("Ricevuto referto:", info.squadra_casa, "vs", info.squadra_ospite);
io.on('connection', (socket) => {
    console.log('Un utente si è connesso');

    socket.on('entra_partita', (idPartita) => {
        socket.join(idPartita);
    });

    socket.on('aggiornamento_admin', (dati) => {
        socket.to(dati.idPartita).emit('dati_live', dati.payload);
    });



// --- AVVIO SERVER ---
server.listen(3000, () => {
    console.log("Server Backend, Router e WebSocket in ascolto sulla porta 3000");
});