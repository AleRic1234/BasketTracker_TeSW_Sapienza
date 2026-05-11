const express = require('express');
const router = express.Router();

module.exports = function(db) {
    // Rotta per ottenere l'MVP di una singola partita
    router.get('/:idPartita', (req, res) => {
        const idPartita = req.params.idPartita;

        // La Super Query da Lode: calcola la valutazione al volo!
        const sqlMVP = `
            SELECT 
                g.nome, 
                g.squadra,
                s.punti, s.rimbalzi, s.assist, s.rubate, s.stoppate, s.falli, s.perse,
                ((s.punti + s.rimbalzi + s.assist + s.rubate + s.stoppate) - (s.falli + s.perse)) AS valutazione
            FROM statistiche_partite s
            JOIN giocatori g ON s.id_giocatore = g.id
            WHERE s.id_partita = ?
            ORDER BY valutazione DESC
            LIMIT 1
        `;

        db.get(sqlMVP, [idPartita], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.status(404).json({ message: "Nessun dato per questa partita." });
            }
            res.json(row);
        });
    });

    return router;
};