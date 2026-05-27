const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

module.exports = function(db) {

    // Formatta i secondi in MM:SS
    function formattaSecondi(secondiTotali) {
        const sTot = secondiTotali || 0;
        const m = Math.floor(sTot / 60);
        const s = sTot % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // Funzione per generare l'XML
    function generaRefertoXML(dati, idPartita) {
        const idFormattato = idPartita.toString().padStart(4, '0');
        
        let xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xmlString += `<?xml-stylesheet type="text/xsl" href="stile_referto.xsl"?>\n`;
        xmlString += `<referto_partita id="${idFormattato}">\n`;
        xmlString += `  <data>${new Date(dati.data || Date.now()).toLocaleDateString('it-IT')}</data>\n`;
        xmlString += `  <risultato>\n`;
        xmlString += `    <casa nome="${dati.squadraCasa.nome}">${dati.punteggioCasa}</casa>\n`;
        xmlString += `    <ospiti nome="${dati.squadraOspite.nome}">${dati.punteggioOspite}</ospiti>\n`;
        xmlString += `  </risultato>\n`;
        
        xmlString += `  <giocatori>\n`;
        
        const tuttiGiocatori = [...dati.squadraCasa.giocatori, ...dati.squadraOspite.giocatori];
        
        tuttiGiocatori.forEach(g => {
            if (g.nome && g.nome.trim() !== '') {
                const nomeSquadra = g.id.startsWith('A') ? 'Casa' : 'Ospite';
                // Convertiamo i secondi in formato stringa per l'XML
                const tempoFormattato = formattaSecondi(g.minuti);

                xmlString += `    <giocatore maglia="${g.numero}" squadra="${nomeSquadra}">\n`;
                xmlString += `      <nome>${g.nome}</nome>\n`;
                xmlString += `      <punti>${g.punti || 0}</punti>\n`;
                xmlString += `      <minuti secondi="${g.minuti || 0}">${tempoFormattato}</minuti>\n`;
                xmlString += `      <rimbalzi>${g.rimbalzi || 0}</rimbalzi>\n`;
                xmlString += `      <assist>${g.assist || 0}</assist>\n`;
                xmlString += `      <rubate>${g.rubate || 0}</rubate>\n`;
                xmlString += `      <stoppate>${g.stoppate || 0}</stoppate>\n`;
                xmlString += `      <perse>${g.perse || 0}</perse>\n`;
                xmlString += `      <falli>${g.falli || 0}</falli>\n`;
                xmlString += `      <plsm>${g.plsm || 0}</plsm>\n`;
                xmlString += `    </giocatore>\n`;
            }
        });
        xmlString += `  </giocatori>\n`;
        xmlString += `</referto_partita>`;

        const nomeFile = `referto_${idFormattato}.xml`;
        const cartellaReferti = path.join(__dirname, '../../../referti');
        const percorsoCompleto = path.join(cartellaReferti, nomeFile);
        fs.writeFileSync(percorsoCompleto, xmlString);
        console.log(`Creato con successo XML: ${nomeFile}`);
    }

    // Endpoint per salvare i dati della partita e generare il referto XML
    router.post('/', (req, res) => {
        
        const CHIAVE_SEGRETA = "BasketTrackerSecret2026";

        const tokenRicevuto = req.headers['authorization'];

        if (tokenRicevuto !== CHIAVE_SEGRETA) {
            console.warn("⚠️ [SICUREZZA] Tentativo di salvataggio API non autorizzato!");
            return res.status(403).json({ error: "Accesso negato. Non sei l'amministratore autorizzato." });
        }
        
        const datiVue = req.body; 
        
        const nomeCasa = datiVue.squadraCasa.nome;
        const nomeOspite = datiVue.squadraOspite.nome;
        const puntiCasa = datiVue.punteggioCasa;
        const puntiOspite = datiVue.punteggioOspite;
        
        console.log("Ricevuto referto:", nomeCasa, "vs", nomeOspite);

        const sqlPartita = `INSERT INTO partite (squadra_casa, squadra_ospite, punti_casa, punti_ospite) VALUES (?, ?, ?, ?)`;
        
        db.run(sqlPartita, 
            [nomeCasa, nomeOspite, puntiCasa, puntiOspite], 
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                const idPartita = this.lastID;
                const tuttiGiocatori = [...datiVue.squadraCasa.giocatori, ...datiVue.squadraOspite.giocatori];

                tuttiGiocatori.forEach(giocatore => {
                    if (giocatore.nome && giocatore.nome.trim() !== '') {
                        const nomeSquadraReale = giocatore.id.startsWith('A') ? nomeCasa : nomeOspite;
                        const tempoFormattato = formattaSecondi(giocatore.minuti); 

                        db.run(`INSERT OR IGNORE INTO giocatori (nome, numero_maglia, squadra) VALUES (?, ?, ?)`,
                            [giocatore.nome, giocatore.numero, nomeSquadraReale],
                            function(err) {
                                db.get(`SELECT id FROM giocatori WHERE numero_maglia = ? AND squadra = ?`, 
                                    [giocatore.numero, nomeSquadraReale], 
                                    (err, row) => {
                                        if (row) {
                                            db.run(`INSERT INTO statistiche_partite 
                                                (id_partita, id_giocatore, punti, falli, rimbalzi, assist, rubate, stoppate, perse, minuti, plsm, in_campo) 
                                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                                [
                                                    idPartita, 
                                                    row.id, 
                                                    giocatore.punti || 0, 
                                                    giocatore.falli || 0,
                                                    giocatore.rimbalzi || 0,
                                                    giocatore.assist || 0,
                                                    giocatore.rubate || 0,
                                                    giocatore.stoppate || 0,
                                                    giocatore.perse || 0,
                                                    giocatore.minuti || 0,
                                                    giocatore.plsm || 0,
                                                    giocatore.inCampo || 0
                                                ]
                                            );
                                        }
                                });
                            }
                        );
                    }
                });
                
                generaRefertoXML(datiVue, idPartita);

                res.status(200).json({ 
                    message: "Partita, statistiche e XML salvati correttamente!",
                    idPartita: idPartita 
                });
        });
    });

    return router;
};