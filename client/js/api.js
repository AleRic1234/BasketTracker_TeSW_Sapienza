// Modulo per future chiamate al database (AJAX/JSON)
const api = {
    async salva(dati) {
        console.log("Dati da inviare:", JSON.stringify(dati));
        return true;
    }
};

async function inviaReferto(datiPartita) {
    const jsonData = JSON.stringify(datiPartita); // Serializzazione JSON
    
    try {
        const response = await fetch('http://localhost:3000/api/salva_partita', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: jsonData
        });
        
        if (response.ok) {
            console.log("Partita salvata con successo!");
        }
    } catch (error) {
        console.error("Errore di comunicazione col server", error);
    }
}
