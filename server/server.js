// server/server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const http = require('http'); 
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
    cors: {origin: "*"}  // Permette connessioni da qualsiasi origine 
});
const app = express();
app.use(cors());
app.use(express.json()); // Fondamentale per leggere il JSON da Vue
// Serve i file statici (referti XML e XSL)
app.use('/referti', express.static('../referti'));

// Connessione al DB
const db = new sqlite3.Database('./db/basket.db');

// Inizializza le tabelle leggendo test.sql (opzionale ma comodo)
const fs = require('fs');
const initSql = fs.readFileSync('./db/test.sql', 'utf8');
db.exec(initSql);

// Rotta per recuperare i dati completi di una partita tramite ID
app.get('/api/partita/:id', (req, res) => {
    const idPartita = req.params.id; // Recupera l'ID dall'URL

    // 1. Recuperiamo i dettagli generali della partita (Squadre e punteggio finale)
    db.get(`SELECT * FROM partite WHERE id = ?`, [idPartita], (err, partita) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!partita) return res.status(404).json({ message: "Partita non trovata" });

        // 2. Recuperiamo il tabellino (JOIN tra statistiche e anagrafica giocatori)
        const sqlStats = `
            SELECT g.nome, g.cognome, g.numero_maglia, s.punti, s.falli, s.assist, s.rimbalzi
            FROM statistiche_partite s
            JOIN giocatori g ON s.id_giocatore = g.id
            WHERE s.id_partita = ?
        `;

        db.all(sqlStats, [idPartita], (err, statistiche) => {
            if (err) return res.status(500).json({ error: err.message });

            // 3. Impacchettiamo tutto in un unico JSON e lo inviamo al client
            res.json({
                info: partita,
                tabellino: statistiche
            });
        });
    });
});

// Endpoint che riceve i dati da api.js
app.post('/api/salva_partita', (req, res) => {
    const datiVue = req.body; // Riceve il payload con { info, giocatori }
    const info = datiVue.info;
    
    console.log("Ricevuto referto:", info.squadra_casa, "vs", info.squadra_ospite);

    // 1. PUNTO DI INSERIMENTO: Salviamo la partita con entrambe le squadre e i punteggi
    const sqlPartita = `INSERT INTO partite (squadra_casa, squadra_ospite, punti_casa, punti_ospite) VALUES (?, ?, ?, ?)`;
    
    db.run(sqlPartita, 
        [info.squadra_casa, info.squadra_ospite, info.punti_casa, info.punti_ospite], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            const idPartita = this.lastID; // ID generato per questa partita

            // 2. Inseriamo le statistiche per tutti i giocatori (sia Team A che Team B)
            datiVue.giocatori.forEach(giocatore => {
                // Procediamo solo se il nome non è vuoto
                if (giocatore.nome && giocatore.nome.trim() !== '') {
                    
                    // Inseriamo/Ignoriamo il giocatore nell'anagrafica
                    // (Usiamo la squadra del giocatore per il vincolo UNIQUE numero_maglia/squadra)
                    db.run(`INSERT OR IGNORE INTO giocatori (nome, numero_maglia, squadra) VALUES (?, ?, ?)`,
                        [giocatore.nome, giocatore.numero, giocatore.squadra],
                        function(err) {
                            // Recuperiamo l'ID del giocatore
                            db.get(`SELECT id FROM giocatori WHERE numero_maglia = ? AND squadra = ?`, 
                                [giocatore.numero, giocatore.squadra], 
                                (err, row) => {
                                    if (row) {
                                        // Salviamo punti e falli nella tabella statistiche
                                        db.run(`INSERT INTO statistiche_partite (id_partita, id_giocatore, punti, falli) VALUES (?, ?, ?, ?)`,
                                            [idPartita, row.id, giocatore.punti, giocatore.falli]
                                        );
                                    }
                            });
                        }
                    );
                }
            });
            
            // 3. GENERAZIONE XML: Chiamiamo la funzione per la lode
            generaRefertoXML(datiVue, idPartita);

            res.status(200).json({ 
                message: "Partita e statistiche salvate correttamente!",
                idPartita: idPartita // Utile per comunicarlo all'admin
            });
    });
});

// server/server.js

// Rotta per la Classifica Marcatori Globale (GET)
app.get('/api/classifica', (req, res) => {
    const sqlClassifica = `
        SELECT 
            g.nome, 
            g.squadra, 
            SUM(s.punti) AS punti_totali
        FROM giocatori g
        JOIN statistiche_partite s ON g.id = s.id_giocatore
        GROUP BY g.id, g.nome, g.squadra
        ORDER BY punti_totali DESC
    `;

    db.all(sqlClassifica, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // rows sarà un array di oggetti già ordinato!
        res.json(rows);
    });
});

// 3. Logica WebSocket per la diretta live
io.on('connection', (socket) => {
    console.log('Un utente si è connesso (Admin o Visualizzatore)');

    // Quando un utente entra in una partita, lo mettiamo in una "Stanza" (Room)
    socket.on('entra_partita', (idPartita) => {
        socket.join(idPartita);
        console.log(`Utente entrato nella stanza della partita: ${idPartita}`);
    });

    // Quando l'Admin aggiorna il punteggio, inoltriamo i dati ai visualizzatori in quella stanza
    socket.on('aggiornamento_admin', (dati) => {
        // Usa socket.to(stanza).emit() per inviare a tutti TRANNE a chi ha generato l'evento
        socket.to(dati.idPartita).emit('dati_live', dati.payload);
    });

    socket.on('disconnect', () => {
        console.log('Utente disconnesso');
    });
});

// 4. ATTENZIONE: Usa server.listen invece di app.listen!
server.listen(3000, () => {
    console.log("Server Backend e WebSocket in ascolto sulla porta 3000");
});

// Funzione per generare il referto XML
function generaRefertoXML(dati, idPartita) {
    // Trasformiamo l'ID in formato 0001, 0002 ecc.
    const idFormattato = idPartita.toString().padStart(4, '0');
    
    let xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    // Assicurati che stile_referto.xsl sia nella stessa cartella dei referti o correggi il path
    xmlString += `<?xml-stylesheet type="text/xsl" href="stile_referto.xsl"?>\n`;
    xmlString += `<referto_partita id="${idFormattato}">\n`;
    xmlString += `  <data>${new Date().toLocaleDateString('it-IT')}</data>\n`;
    xmlString += `  <risultato>\n`;
    xmlString += `    <casa nome="${dati.info.squadra_casa}">${dati.info.punti_casa}</casa>\n`;
    xmlString += `    <ospiti nome="${dati.info.squadra_ospite}">${dati.info.punti_ospite}</ospiti>\n`;
    xmlString += `  </risultato>\n`;
    
    xmlString += `  <giocatori>\n`;
    dati.giocatori.forEach(g => {
        if (g.nome && g.nome.trim() !== '') {
            xmlString += `    <giocatore maglia="${g.numero}" squadra="${g.id.startsWith('A') ? 'Casa' : 'Ospite'}">\n`;
            xmlString += `      <nome>${g.nome}</nome>\n`;
            xmlString += `      <punti>${g.punti}</punti>\n`;
            xmlString += `      <falli>${g.falli}</falli>\n`;
            xmlString += `    </giocatore>\n`;
        }
    });
    xmlString += `  </giocatori>\n`;
    xmlString += `</referto_partita>`;

    // IL CAMBIAMENTO CHIAVE: Nome file dinamico
    const nomeFile = `referto_${idFormattato}.xml`;
    fs.writeFileSync(`../referti/${nomeFile}`, xmlString);
    console.log(`Creato con successo: ${nomeFile}`);
}