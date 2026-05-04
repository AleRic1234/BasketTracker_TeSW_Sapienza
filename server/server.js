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

// Endpoint che riceve i dati da api.js
app.post('/api/salva_partita', (req, res) => {
    const datiVue = req.body;
    
    // datiVue conterrà esattamente this.teamA e this.punteggioTotale dal main.js
    console.log("Referto ricevuto per la squadra:", datiVue.teamA.nome);

    // 1. Inseriamo la partita
    db.run(`INSERT INTO partite (squadra_casa, punteggio_casa) VALUES (?, ?)`, 
        [datiVue.teamA.nome, datiVue.punteggioTotale], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const idPartita = this.lastID;

            // 2. Inseriamo i giocatori e i loro punti
            datiVue.teamA.giocatori.forEach(giocatore => {
                // Ignoriamo gli slot vuoti del frontend
                if (giocatore.nome.trim() !== '') {
                    
                    // Inseriamo il giocatore (se non esiste già)
                    db.run(`INSERT OR IGNORE INTO giocatori (nome, numero_maglia, squadra) VALUES (?, ?, ?)`,
                        [giocatore.nome, giocatore.numero, datiVue.teamA.nome],
                        function(err) {
                            // Recuperiamo l'ID del giocatore per le statistiche
                            db.get(`SELECT id FROM giocatori WHERE numero_maglia = ? AND squadra = ?`, 
                                [giocatore.numero, datiVue.teamA.nome], 
                                (err, row) => {
                                    if (row) {
                                        // Salviamo i punti fatti in questa partita!
                                        db.run(`INSERT INTO statistiche_partite (id_partita, id_giocatore, punti) VALUES (?, ?, ?)`,
                                            [idPartita, row.id, giocatore.punti]
                                        );
                                    }
                            });
                        }
                    );
                }
            });
            
            res.status(200).json({ message: "Partita e statistiche salvate con successo nel DB!" });
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
