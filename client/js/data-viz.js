// Percorso: client/js/data-viz.js

const DataViz = {

    // 1. NOTIFICHE JQUERY (Sostituisce i brutti alert di base)
    // Mostra un "Toast" elegante in basso a destra
    mostraNotifica: function(messaggio) {
        $("<div class='toast-msg'></div>")
            .html(messaggio)
            .css({
                position: "fixed", bottom: "20px", right: "20px",
                background: "#1a2a6c", color: "white", padding: "15px",
                borderRadius: "8px", zIndex: 1000, boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                fontFamily: "sans-serif", borderLeft: "5px solid #d4af37"
            })
            .appendTo("body")
            .hide()
            .fadeIn(400)
            .delay(4000)
            .fadeOut(400, function() { $(this).remove(); });
    },

    // 2. RECUPERO E VISUALIZZAZIONE ARCHIVIO (Chiamata alla tua API)
    caricaArchivio: function() {
        const container = document.getElementById('archivio-container');
        if (!container) return; // Se il div non esiste nella vista attuale, esce

        container.innerHTML = "<p>Caricamento referti in corso...</p>";

        fetch('http://localhost:3000/api/lista_referti')
            .then(res => res.json())
            .then(files => {
                if (files.length === 0) {
                    container.innerHTML = "<p>Nessun referto disponibile nel database.</p>";
                    return;
                }

                // Costruisce la griglia dei referti
                let html = '<div class="referti-grid" style="display: flex; gap: 15px; flex-wrap: wrap;">';
                files.forEach(file => {
                    html += `
                        <div class="referto-card" style="border: 1px solid #ccc; padding: 15px; border-radius: 8px; background: #fff; text-align: center;">
                            <h3 style="margin-top:0;">📄 ${file}</h3>
                            <button onclick="DataViz.anteprimaXML('${file}')" style="margin-bottom: 10px; cursor: pointer;">🔍 Anteprima Rapida</button><br>
                            <a href="http://localhost:3000/referti/${file}" target="_blank" style="color: #1a2a6c; font-weight: bold; text-decoration: none;">Apri Referto FIP</a>
                        </div>
                    `;
                });
                html += '</div>';
                container.innerHTML = html;
            })
            .catch(err => {
                container.innerHTML = "<p style='color:red;'>Errore di connessione al server.</p>";
                console.error("Errore Archivio:", err);
            });
    },

    // 3. PARSING DEL DOM XML (Slide 15 - Requisito da 30 e lode)
    // Legge il file XML grezzo, naviga l'albero DOM e ne estrae i dati per la notifica
    anteprimaXML: function(nomeFile) {
        fetch('http://localhost:3000/referti/' + nomeFile)
            .then(res => res.text())
            .then(str => {
                // Parsing della stringa in un oggetto DOM XML
                let parser = new DOMParser();
                let xmlDoc = parser.parseFromString(str, "text/xml");

                // Estrazione dati tramite le funzioni del DOM XML
                let garaId = xmlDoc.getElementsByTagName("referto_partita")[0].getAttribute("id");
                let squadraCasa = xmlDoc.getElementsByTagName("casa")[0].getAttribute("nome");
                let puntiCasa = xmlDoc.getElementsByTagName("casa")[0].childNodes[0].nodeValue;
                let squadraOspite = xmlDoc.getElementsByTagName("ospiti")[0].getAttribute("nome");
                let puntiOspite = xmlDoc.getElementsByTagName("ospiti")[0].childNodes[0].nodeValue;

                // Creazione e lancio della notifica
                let msg = `<strong>Gara #${garaId}</strong><br>${squadraCasa} <strong>${puntiCasa}</strong> - <strong>${puntiOspite}</strong> ${squadraOspite}`;
                this.mostraNotifica(msg);
            })
            .catch(err => console.error("Errore parse XML", err));
    },

    // 4. RICHIESTA MVP (Chiamata alla query SQL complessa che hai creato)
    mostraMVP: function(idPartita) {
        fetch(`http://localhost:3000/api/mvp/${idPartita}`)
            .then(res => {
                if(!res.ok) throw new Error("Dati MVP non ancora disponibili");
                return res.json();
            })
            .then(data => {
                let msg = `🏆 <strong>MVP del Match</strong> 🏆<br>${data.nome} (${data.squadra})<br>Valutazione PIR: <strong>${data.valutazione}</strong>`;
                this.mostraNotifica(msg);
            })
            .catch(err => console.error(err));
    }
};