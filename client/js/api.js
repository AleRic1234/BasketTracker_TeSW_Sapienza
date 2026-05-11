// client/js/api.js

const api = {
    // 1. Funzione per salvare la partita (quella che avevi già, leggermente migliorata)
    async salva(dati) {
        try {
            const response = await fetch('http://localhost:3000/api/salva_partita', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dati) 
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Risposta dal server:", result);
                
                // Mostra il messaggio all'utente come richiesto dalle specifiche
                alert("Partita Archiviata! " + result.message);
                return true;
            } else {
                console.error("Errore nel salvataggio. Status:", response.status);
                alert("Errore durante l'archiviazione della partita.");
                return false;
            }
        } catch (error) {
            console.error("Errore di rete (Server probabilmente spento):", error);
            alert("Impossibile connettersi al server. Verifica che Node.js sia in esecuzione.");
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

    // 2. NUOVA FUNZIONE: Recupera la classifica marcatori globale
    // (Utile se lo Studente A vuole creare una pagina o una modale con la classifica)
    async ottieniClassifica() {
        try {
            const response = await fetch('http://localhost:3000/api/classifica');
            
            if (response.ok) {
                const classifica = await response.json();
                return classifica; // Ritorna l'array di giocatori ordinato per punti
            } else {
                console.error("Errore nel recupero della classifica");
                return [];
            }
        } catch (error) {
            console.error("Errore di rete durante il fetch della classifica:", error);
            return [];
        }
    },

    // 3. NUOVA FUNZIONE: Recupera il tabellino di una singola partita dato il suo ID
    // (Utile per una pagina "Storico Partite" o per rileggere i dati prima di stampare il referto)
    async ottieniPartita(id) {
        try {
            const response = await fetch(`http://localhost:3000/api/partita/${id}`);
            
            if (response.ok) {
                const dettagliPartita = await response.json();
                return dettagliPartita; // Ritorna { info: {...}, tabellino: [...] }
            } else {
                console.error("Partita non trovata o errore server");
                return null;
            }
        } catch (error) {
            console.error("Errore di rete durante il fetch della partita:", error);
            return null;
        }
    }
};
