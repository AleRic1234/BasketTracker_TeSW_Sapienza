const express = require('express');
const fs = require('fs');
const router = express.Router();

module.exports = function(db) {
    router.get('/', (req, res) => {
        try {
            // Legge i file nella cartella '../referti' e filtra solo quelli che finiscono con .xml
            const files = fs.readdirSync('../referti').filter(f => f.endsWith('.xml'));
            
            // Restituisce la lista come array JSON al frontend
            res.json(files);
        } catch (error) {
            console.error("Errore nella lettura dei referti:", error);
            res.status(500).json({ error: "Impossibile recuperare la lista dei referti." });
        }
    });

    return router;
};