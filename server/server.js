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

// Diciamo a Express di usare queste rotte per percorsi specifici
app.use('/api/salva_partita', rottaSalvaPartita);
app.use('/api/classifica', rottaClassifica);
app.use('/api/partita', rottaPartita);

// --- WEBSOCKETS (LIVE SCORE) ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

io.on('connection', (socket) => {
    console.log('Un utente si è connesso');

    socket.on('entra_partita', (idPartita) => {
        socket.join(idPartita);
    });

    socket.on('aggiornamento_admin', (dati) => {
        socket.to(dati.idPartita).emit('dati_live', dati.payload);
    });

    socket.on('disconnect', () => {
        console.log('Utente disconnesso');
    });
});

// --- AVVIO SERVER ---
server.listen(3000, () => {
    console.log("Server Backend, Router e WebSocket in ascolto sulla porta 3000");
});