const express = require('express');
const router = express.Router();

module.exports = function(db) {
    router.get('/:id', (req, res) => {
        const idPartita = req.params.id; 

        db.get(`SELECT * FROM partite WHERE id = ?`, [idPartita], (err, partita) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!partita) return res.status(404).json({ message: "Partita non trovata" });

            const sqlStats = `
                SELECT g.nome, g.cognome, g.numero_maglia, s.punti, s.falli, s.assist, s.rimbalzi
                FROM statistiche_partite s
                JOIN giocatori g ON s.id_giocatore = g.id
                WHERE s.id_partita = ?
            `;

            db.all(sqlStats, [idPartita], (err, statistiche) => {
                if (err) return res.status(500).json({ error: err.message });

                res.json({
                    info: partita,
                    tabellino: statistiche
                });
            });
        });
    });

    return router;
};