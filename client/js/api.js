// Percorso: client/js/api.js
const api = {
    
    // Funzione per salvare la partita 
    
    async salva(dati, tokenAdmin) {
        try {
            const response = await fetch('/api/salva_partita', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': tokenAdmin },
                body: JSON.stringify(dati) 
            });

            if (response.ok) {
                // Leggiamo la risposta come JSON
                const datiRisposta = await response.json();
                return { success: true, message: datiRisposta.message };
            } else {
                return { success: false, message: "Errore durante l'archiviazione della partita." };
            }
        } catch (error) {
            console.error("Errore di rete:", error);
            return { success: false, message: "Server offline o errore di rete." };
        }
    },

    // Funzione per salvare la partita in formato XML e ricevere il nome del file generato
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
    // Recupera dal server la lista dei referti disponibili (file con estenzione .xml)
    async getListaReferti() {
        try {
    
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
    // Recupera dal server la classifica marcatori globale
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

    // Recupera dal server il tabellino di una singola partita dato il suo ID

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

    // Recupera dal server l'MVP

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

    // Scarica un XML e ne fa il parse con il DOMParser
    async leggiAnteprimaXML(nomeFileXML) {
        try {
            // Scarica il file XML dalla cartella referti
            const response = await fetch(`/referti/${nomeFileXML}`);
            
            if (!response.ok) throw new Error("Errore nel download dell'XML");
            
            const testoXML = await response.text();
            
            // Il DOMParser trasforma la stringa in un documento navigabile
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(testoXML, "text/xml");
            
            //  Estrazione dati con il Dom
    
            const radice = xmlDoc.getElementsByTagName("referto_partita")[0];
            const idPartita = radice ? radice.getAttribute("id") : "Sconosciuto";
            
            // Estrazione sicura: controlla che il tag esista prima di leggerne il valore
            
            const tagCasa = xmlDoc.getElementsByTagName("squadra_casa")[0];
            const squadraCasa = tagCasa ? tagCasa.childNodes[0].nodeValue : "N/D";
            
            const tagOspite = xmlDoc.getElementsByTagName("squadra_ospite")[0];
            const squadraOspite = tagOspite ? tagOspite.childNodes[0].nodeValue : "N/D";
            
            console.log(`[DOM XML] Letto referto partita #${idPartita}: ${squadraCasa} vs ${squadraOspite}`);
            
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