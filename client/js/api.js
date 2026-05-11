const api = {
    async salva(dati) {
        try {
            // Invia i dati al tuo server Node.js sulla porta 3000
            const response = await fetch('http://localhost:3000/api/salva_partita', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Vue ci passa i dati, noi li serializziamo come stringa JSON
                body: JSON.stringify(dati) 
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Risposta dal server:", result.message);
                return true;
            } else {
                console.error("Errore nel salvataggio");
                return false;
            }
        } catch (error) {
            console.error("Errore di rete:", error);
            return false;
        }
    },
    async getListaReferti() {
        try {
            const response = await fetch('http://localhost:3000/api/partita/file/lista-referti');
            if (response.ok) {
                return await response.json(); // Ritorna l'array dei nomi file
            } else {
                return [];
            }
        } catch (error) {
            console.error("Errore di rete durante il recupero dei referti:", error);
            return [];
        }
    }
};
