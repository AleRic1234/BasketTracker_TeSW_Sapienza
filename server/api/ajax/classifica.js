const express = require('express');
const router = express.Router();

module.exports = function(db) {
    router.get('/', (req, res) => {
        // 1. Query  per i Top 5 Marcatori
        const sqlTopScorers = `
            SELECT g.nome, g.squadra, SUM(s.punti) AS punti_totali
            FROM giocatori g
            JOIN statistiche_partite s ON g.id = s.id_giocatore
            GROUP BY g.id, g.nome, g.squadra
            ORDER BY punti_totali DESC
            LIMIT 5
        `;

        // 2. Calcola la Classifica Squadre NBA/FIBA
        const sqlStandings = `
            SELECT 
                squadra,
                COUNT(*) as giocate,
                SUM(CASE WHEN vinte = 1 THEN 1 ELSE 0 END) as vinte,
                SUM(CASE WHEN perse = 1 THEN 1 ELSE 0 END) as perse,
                SUM(CASE WHEN pareggiate = 1 THEN 1 ELSE 0 END) as pareggiate,
                SUM(punti_fatti) as punti_fatti,
                SUM(punti_subiti) as punti_subiti,
                SUM(CASE WHEN vinte = 1 THEN 2 WHEN pareggiate = 1 THEN 1 ELSE 0 END) as punti_classifica
            FROM (
                SELECT squadra_casa as squadra, 
                    CASE WHEN punti_casa > punti_ospite THEN 1 ELSE 0 END as vinte,
                    CASE WHEN punti_casa < punti_ospite THEN 1 ELSE 0 END as perse,
                    CASE WHEN punti_casa = punti_ospite THEN 1 ELSE 0 END as pareggiate,
                    punti_casa as punti_fatti, punti_ospite as punti_subiti
                FROM partite
                UNION ALL
                SELECT squadra_ospite as squadra, 
                    CASE WHEN punti_ospite > punti_casa THEN 1 ELSE 0 END as vinte,
                    CASE WHEN punti_ospite < punti_casa THEN 1 ELSE 0 END as perse,
                    CASE WHEN punti_ospite = punti_casa THEN 1 ELSE 0 END as pareggiate,
                    punti_ospite as punti_fatti, punti_casa as punti_subiti
                FROM partite
            )
            GROUP BY squadra
            ORDER BY punti_classifica DESC, punti_fatti DESC
        `;

        // Eseguiamo entrambe le query in parallelo
        db.all(sqlTopScorers, [], (err, scorers) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.all(sqlStandings, [], (err, standings) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Restituiamo un oggetto combinato al frontend
                res.json({ topScorers: scorers, standings: standings });
            });
        });
    });

    return router;
};