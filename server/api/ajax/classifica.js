const express = require('express');
const router = express.Router();

module.exports = function(db) {
    router.get('/', (req, res) => {
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
            res.json(rows);
        });
    });

    return router;
};