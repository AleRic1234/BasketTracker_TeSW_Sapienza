// Percorso: client/js/data-viz.js

const DataViz = {

    // Variabile interna per il grafico (sostituisce la variabile globale esterna)
    myRadarChart: null,

    // 1. NOTIFICHE JQUERY (Sostituisce i brutti alert di base)
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

    // 2. RECUPERO E VISUALIZZAZIONE ARCHIVIO (Chiamata API)
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
    // 3. PARSING DEL DOM XML (Slide 15 - Requisito da 30 e lode)
    anteprimaXML: function(nomeFile) {
        fetch('http://localhost:3000/referti/' + nomeFile)
            .then(res => res.text())
            .then(str => {
                let parser = new DOMParser();
                let xmlDoc = parser.parseFromString(str, "text/xml");

                // Estrazione ID
                let garaId = xmlDoc.getElementsByTagName("referto_partita")[0].getAttribute("id");
                
                // Peschiamo i nodi corretti dell'XML: <casa> e <ospiti>
                let nodoCasa = xmlDoc.getElementsByTagName("casa")[0];
                let nodoOspiti = xmlDoc.getElementsByTagName("ospiti")[0];
                
                // Estraiamo il nome dall'attributo e i punti dal valore testuale
                let squadraCasa = nodoCasa.getAttribute("nome");
                let puntiCasa = nodoCasa.childNodes[0].nodeValue;
                
                let squadraOspite = nodoOspiti.getAttribute("nome");
                let puntiOspite = nodoOspiti.childNodes[0].nodeValue;

                // Creazione e lancio della notifica jQuery
                let msg = `<strong>Gara #${garaId}</strong><br>${squadraCasa} <strong>${puntiCasa}</strong> - <strong>${puntiOspite}</strong> ${squadraOspite}`;
                this.mostraNotifica(msg);
            })
            .catch(err => {
                console.error("Errore parse XML", err);
                this.mostraNotifica("Errore nella lettura dell'anteprima XML.");
            });
    },

    // 4. RICHIESTA MVP
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
    },

    // 5. RENDERING GRAFICO RADAR (Integrato nell'oggetto)
    renderRadarChart: function(playerA, playerB) {
        const canvas = document.getElementById('radarChart');
        if (!canvas) return; // Controllo di sicurezza se la canvas non esiste

        const ctx = canvas.getContext('2d');
        
        // Se il grafico esiste già, lo distruggiamo per evitare sovrapposizioni usando 'this'
        if (this.myRadarChart) { 
            this.myRadarChart.destroy(); 
        }

        this.myRadarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Punti', 'Rimbalzi', 'Assist', 'Rubate', 'Stoppate'],
                datasets: [
                    {
                        label: playerA.nome,
                        data: [playerA.punti, playerA.rimbalzi, playerA.assist, playerA.rubate, playerA.stoppate],
                        fill: true,
                        backgroundColor: 'rgba(26, 42, 108, 0.2)', // Blu Sapienza Bulls
                        borderColor: '#1a2a6c',
                        pointBackgroundColor: '#1a2a6c',
                    },
                    {
                        label: playerB.nome,
                        data: [playerB.punti, playerB.rimbalzi, playerB.assist, playerB.rubate, playerB.stoppate],
                        fill: true,
                        backgroundColor: 'rgba(178, 31, 31, 0.2)', // Rosso Torvergata Griffins
                        borderColor: '#b21f1f',
                        pointBackgroundColor: '#b21f1f',
                    }
                ]
            },
            options: {
                elements: { line: { borderWidth: 3 } },
                scales: {
                    r: {
                        angleLines: { display: true },
                        suggestedMin: 0,
                        suggestedMax: 30
                    }
                }
            }
        });
    },

    // 6. CONFRONTO AUTOMATICO GIOCATORI
    creaConfrontoAutomatico: function(idPartita) {
        fetch(`http://localhost:3000/api/partita/${idPartita}`)
            .then(res => res.json())
            .then(data => {
                const p1 = data.tabellino[0];
                const p2 = data.tabellino[1];
                
                if (p1 && p2) {
                    this.renderRadarChart(p1, p2); // Chiama la funzione usando 'this'
                    this.mostraNotifica(`Grafico generato: Confronto tra ${p1.nome} e ${p2.nome}`);
                }
            })
            .catch(err => console.error("Errore generazione grafico", err));
    }

}; // <-- CHIUSURA DEFINITIVA DELL'OGGETTO