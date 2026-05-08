const express = require('express');
const fs = require('fs');
const router = express.Router();

// Esportiamo una funzione che riceve l'oggetto 'db' dal server principale
module.exports = function(db) {

    // Funzione interna per generare l'XML
    function generaRefertoXML(dati, idPartita) {
        const idFormattato = idPartita.toString().padStart(4, '0');
        
        let xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n`;
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

        const nomeFile = `referto_${idFormattato}.xml`;
        fs.writeFileSync(`../referti/${nomeFile}`, xmlString);
        console.log(`Creato con successo: ${nomeFile}`);
    }

    // Rotta POST (il path è '/' perché verrà agganciata in server.js a '/api/salva_partita')
    router.post('/', (req, res) => {
        const datiVue = req.body; 
        const info = datiVue.info;
        
        console.log("Ricevuto referto:", info.squadra_casa, "vs", info.squadra_ospite);

        const sqlPartita = `INSERT INTO partite (squadra_casa, squadra_ospite, punti_casa, punti_ospite) VALUES (?, ?, ?, ?)`;
        
        db.run(sqlPartita, 
            [info.squadra_casa, info.squadra_ospite, info.punti_casa, info.punti_ospite], 
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                const idPartita = this.lastID;

                datiVue.giocatori.forEach(giocatore => {
                    if (giocatore.nome && giocatore.nome.trim() !== '') {
                        db.run(`INSERT OR IGNORE INTO giocatori (nome, numero_maglia, squadra) VALUES (?, ?, ?)`,
                            [giocatore.nome, giocatore.numero, giocatore.squadra],
                            function(err) {
                                db.get(`SELECT id FROM giocatori WHERE numero_maglia = ? AND squadra = ?`, 
                                    [giocatore.numero, giocatore.squadra], 
                                    (err, row) => {
                                        if (row) {
                                            // INIZIO MODIFICA: Inserimento espanso per la Lode
                                            db.run(`INSERT INTO statistiche_partite 
                                                (id_partita, id_giocatore, punti, falli, rimbalzi, assist, rubate, stoppate, perse) 
                                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                                [
                                                    idPartita, 
                                                    row.id, 
                                                    giocatore.punti || 0, 
                                                    giocatore.falli || 0,
                                                    giocatore.rimbalzi || 0,
                                                    giocatore.assist || 0,
                                                    giocatore.rubate || 0,
                                                    giocatore.stoppate || 0,
                                                    giocatore.perse || 0
                                                ]
                                            );
                                            // FINE MODIFICA
                                        }
                                });
                            }
                        );
                    }
                });
                
                generaRefertoXML(datiVue, idPartita);

                res.status(200).json({ 
                    message: "Partita e statistiche salvate correttamente!",
                    idPartita: idPartita 
                });
        });
    });

    return router;
};