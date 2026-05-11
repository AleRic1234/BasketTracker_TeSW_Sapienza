const express = require('express');
const fs = require('fs');
const path = require('path'); // Aggiungiamo 'path' per percorsi sicuri
const router = express.Router();

module.exports = function(db) {
    router.get('/', (req, res) => {
        // Calcola il percorso sicuro ovunque venga avviato il server Node
        // (Torna indietro di 3 cartelle: ajax -> api -> server -> arriva a referti)
        const cartellaReferti = path.join(__dirname, '../../../referti');

        // Usiamo la versione asincrona (non bloccante) per prestazioni migliori
        fs.readdir(cartellaReferti, (error, files) => {
            if (error) {
                console.error("Errore nella lettura dei referti:", error);
                return res.status(500).json({ error: "Impossibile recuperare la lista dei referti." });
            }

            try {
                // Filtra solo quelli che finiscono con .xml
                const fileXML = files.filter(f => f.endsWith('.xml'));
                
                // Restituisce la lista come array JSON al frontend
                res.json(fileXML);
            } catch (filterError) {
                console.error("Errore nel filtraggio dei file:", filterError);
                res.status(500).json({ error: "Errore durante l'elaborazione dei referti." });
            }
        });
    });

    return router;
};