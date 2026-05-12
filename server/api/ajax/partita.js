const express = require('express');
const router = express.Router();

module.exports = function(db) {
    router.get('/:id', (req, res) => {
        // IL SEGRETO E' QUI: Trasformiamo qualsiasi cosa arrivi ("0003", "3") in un numero intero puro
        const idPartita = parseInt(req.params.id, 10); 

        db.get(`SELECT * FROM partite WHERE id = ?`, [idPartita], (err, partita) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Se non trova il numero 3, restituisce l'errore
            if (!partita) return res.status(404).json({ message: "Partita non trovata" });

            // Ho aggiunto gli altri campi statistiche per non far arrabbiare Vue
            
            const sqlStats = `
                SELECT g.nome, g.numero_maglia AS numero, g.squadra, s.punti, s.falli, s.assist, s.rimbalzi, s.rubate, s.stoppate, s.perse
                FROM statistiche_partite s
                JOIN giocatori g ON s.id_giocatore = g.id
                WHERE s.id_partita = ?
            `;
            db.all(sqlStats, [idPartita], (err, statistiche) => {
                if (err) return res.status(500).json({ error: err.message });

                res.json({
                    info: partita,
                    giocatori: statistiche // Rinominato in 'giocatori' per combaciare con main.js
                });
            });
        });
    });

    return router;
};