// server/server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // Fondamentale per leggere il JSON da Vue

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
            generaRefertoXML(datiVue);

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

app.listen(3000, () => {
    console.log("Server Backend in ascolto sulla porta 3000");
});

function generaRefertoXML(dati) {
    // Colleghiamo l'XML al foglio di stile XSLT
    let xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xmlString += `<?xml-stylesheet type="text/xsl" href="stile_referto.xsl"?>\n`;
    xmlString += `<referto_partita>\n`;
    xmlString += `  <data>${new Date().toLocaleDateString()}</data>\n`;
    xmlString += `  <risultato>\n`;
    xmlString += `    <casa nome="${dati.squadraCasa}">${dati.puntiCasa}</casa>\n`;
    xmlString += `    <ospiti nome="${dati.squadraOspite}">${dati.puntiOspiti}</ospiti>\n`;
    xmlString += `  </risultato>\n`;
    
    // Ciclo sui giocatori (forniti dal frontend in JSON)
    xmlString += `  <giocatori>\n`;
    dati.statistiche.forEach(g => {
        xmlString += `    <giocatore maglia="${g.numero}">\n`;
        xmlString += `      <nome>${g.nome}</nome>\n`;
        xmlString += `      <punti>${g.punti}</punti>\n`;
        xmlString += `      <falli>${g.falli}</falli>\n`;
        xmlString += `    </giocatore>\n`;
    });
    xmlString += `  </giocatori>\n`;
    xmlString += `</referto_partita>`;

    // Salva il file nella cartella referti
    fs.writeFileSync('../referti/referto_ultimo_match.xml', xmlString);
    console.log("File XML generato con successo.");
}
