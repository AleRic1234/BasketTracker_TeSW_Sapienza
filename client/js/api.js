// client/js/api.js

const api = {
    // 1. Funzione per salvare la partita (quella che avevi già)
    async salva(dati) {
        try {
            const response = await fetch('http://localhost:3000/api/salva_partita', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dati) 
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Risposta dal server:", result);
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

    // 2. Recupera la classifica marcatori globale
    async ottieniClassifica() {
        try {
            const response = await fetch('http://localhost:3000/api/classifica');
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

    // 3. Recupera il tabellino di una singola partita
    async ottieniPartita(id) {
        try {
            const response = await fetch(`http://localhost:3000/api/partita/${id}`);
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

    // ==========================================
    // ⬇️ NUOVE FUNZIONI PER IL PUNTO 3 (XML DOM) ⬇️
    // ==========================================

    // 4. NUOVA FUNZIONE: Recupera la lista di tutti i file XML dal server
    async ottieniListaReferti() {
        try {
            const response = await fetch('http://localhost:3000/api/lista_referti');
            if (response.ok) {
                return await response.json(); // Restituisce un array es: ["referto_1.xml", "referto_2.xml"]
            } else {
                console.error("Errore nel recupero della lista referti");
                return [];
            }
        } catch (error) {
            console.error("Errore di rete durante il fetch della lista referti:", error);
            return [];
        }
    },

    // 5. NUOVA FUNZIONE: Scarica un XML e ne fa il parse con il DOMParser
    async leggiAnteprimaXML(nomeFileXML) {
        try {
            // Scarica il file XML dalla cartella pubblica
            const response = await fetch(`http://localhost:3000/referti/${nomeFileXML}`);
            
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
};