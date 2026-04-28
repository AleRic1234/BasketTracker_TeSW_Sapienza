// server/server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json()); // Permette di decodificare il JSON in arrivo

// Connessione al database SQLite (creerà il file basket.db se non esiste)
const db = new sqlite3.Database('./db/basket.db', (err) => {
    if (err) console.error("Errore DB:", err.message);
    else console.log("Connesso a SQLite.");
});

// Endpoint che il frontend chiamerà per salvare i dati della partita
app.post('/api/salva_partita', (req, res) => {
    const datiPartita = req.body; 
    console.log("JSON ricevuto dal Frontend:", datiPartita);

    // Inserire la logica SQL per salvare i dati nelle tabelle...
    // db.run("INSERT INTO partite...", [...], function(err) { ... });

    // Generazione XML
    generaRefertoXML(datiPartita);

    res.status(200).json({ message: "Partita salvata e XML generato!" });
});

app.listen(3000, () => {
    console.log("Server BasketTracker in esecuzione sulla porta 3000");
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