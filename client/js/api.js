// Percorso: client/js/api.js
const api = {
    // 1. Funzione per salvare la partita (quella che avevi già)
    async salva(dati) {
        try {
            const response = await fetch('/api/salva_partita', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dati) 
            });

            if (response.ok) {
                const testoRisposta = await response.text();
                return { success: true, message: testoRisposta };
            } else {
                return { success: false, message: "Errore durante l'archiviazione della partita." };
            }
        } catch (error) {
            console.error("Errore di rete:", error);
            return { success: false, message: "Server offline o errore di rete." };
        }
    },

    async salvaFileXML(dati) {
        try {
            const response = await fetch('/api/salva_partita/xml', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dati)
            });

            if (response.ok) {
                const result = await response.json();
                return { success: true, fileName: result.fileName };
            } else {
                return { success: false, message: "Errore nella generazione del referto XML." };
            }
        } catch (error) {
            console.error("Errore generazione XML:", error);
            return { success: false, message: "Errore di connessione durante la generazione." };
        }
    },
    
    async getListaReferti() {
        try {
            // URL corretto derivato dal tuo server.js
            const response = await fetch('/api/lista_referti');
            
            if (response.ok) {
                return await response.json(); // Ritorna l'array dei nomi file
            } else {
                console.error("Il server ha risposto con un errore nel recupero lista referti. Status:", response.status);
                return [];
            }
        } catch (error) {
            console.error("Errore di rete durante il recupero dei referti:", error);
            return [];
        }
    },
    // 2. Recupera la classifica marcatori globale
    async ottieniClassifica() {
        try {
            const response = await fetch('/api/classifica');
            if (response.ok) {
                return await response.json(); 
            } else {
                console.error("Errore nel recupero della classifica");
                return [];
            }
        } catch (error) {
            console.error("Errore di rete durante il fetch della classifica:", error);
            return [];
        }
    },

    // Recupera il tabellino di una singola partita dato il suo ID
    // (Utile per una pagina "Storico Partite" o per rileggere i dati prima di stampare il referto)
    async ottieniPartita(id) {
        try {
            const response = await fetch(`/api/partita/${id}`);
            if (response.ok) {
                return await response.json(); 
            } else {
                console.error("Partita non trovata o errore server");
                return null;
            }
        } catch (error) {
            console.error("Errore di rete durante il fetch della partita:", error);
            return null;
        }
    },

    async getMVP(idPartita) {
        try {
            const idFormattato = parseInt(idPartita, 10); 
            const url = `/api/mvp/${idFormattato}`;
            console.log(`[API] 📡 Chiedo l'MVP al server: ${url}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn(`[API] ⚠️ Il server non ha trovato l'MVP (Status: ${response.status})`);
                return null;
            }
            const data = await response.json();
            console.log(`[API] 🏆 MVP Trovato! Dati:`, data);
            return data;
        } catch (error) {
            console.error(`[API] ❌ Errore critico nel recupero MVP:`, error);
            return null;
        }
    },

    // FUNZIONE: Scarica un XML e ne fa il parse con il DOMParser
    async leggiAnteprimaXML(nomeFileXML) {
        try {
            // Scarica il file XML dalla cartella pubblica
            const response = await fetch(`/referti/${nomeFileXML}`);
            
            if (!response.ok) throw new Error("Errore nel download dell'XML");
            
            const testoXML = await response.text();
            
            // Magia del DOMParser: trasforma la stringa in un documento navigabile
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(testoXML, "text/xml");
            
            // --- ESTRAZIONE DATI CON IL DOM (Slide 15) ---
            // Nota: Se la tua funzione XML genera tag con nomi diversi, 
            // devi aggiornare le stringhe qui sotto (es. "squadra_casa").
            const radice = xmlDoc.getElementsByTagName("referto_partita")[0];
            const idPartita = radice ? radice.getAttribute("id") : "Sconosciuto";
            
            // Estrazione sicura: controlla che il tag esista prima di leggerne il valore
            const tagCasa = xmlDoc.getElementsByTagName("squadra_casa")[0];
            const squadraCasa = tagCasa ? tagCasa.childNodes[0].nodeValue : "N/D";
            
            const tagOspite = xmlDoc.getElementsByTagName("squadra_ospite")[0];
            const squadraOspite = tagOspite ? tagOspite.childNodes[0].nodeValue : "N/D";
            
            console.log(`[DOM XML] Letto referto partita #${idPartita}: ${squadraCasa} vs ${squadraOspite}`);
            
            // Ritorna l'oggetto a Vue (o a chi chiama la funzione)
            return {
                id: idPartita,
                casa: squadraCasa,
                ospite: squadraOspite
            };
            
        } catch (error) {
            console.error("Errore nel parsing del DOM XML:", error);
            return null;
        }
    }
};export default api;