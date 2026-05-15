// Percorso: client/js/data-viz.js

window.DataViz = {

    // Variabile interna per il grafico (sostituisce la variabile globale esterna)
    myRadarChart: null,

    // 1. NOTIFICHE JQUERY (Sostituisce i brutti alert di base)
    mostraNotifica: function(messaggio, tipo = 'info') {
        let bgColor = "#1a2a6c"; // Default blu (info)
        let borderColor = "#d4af37"; // Oro
        
        // Imposta i colori in base al tipo di notifica
        if (tipo === 'success') {
            bgColor = "#27ae60"; // Verde successo
            borderColor = "#2ecc71";
        } else if (tipo === 'error') {
            bgColor = "#c0392b"; // Rosso errore
            borderColor = "#e74c3c";
        } else if (tipo === 'warning') {
            bgColor = "#f39c12"; // Arancione avviso
            borderColor = "#f1c40f";
        }

        $("<div class='toast-msg'></div>")
            .html(messaggio)
            .css({
                position: "fixed", bottom: "20px", right: "20px",
                background: bgColor, color: "white", padding: "15px",
                borderRadius: "8px", zIndex: 1000, boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
                fontFamily: "sans-serif", borderLeft: "6px solid " + borderColor,
                maxWidth: "320px", fontSize: "1rem", lineHeight: "1.4"
            })
            .appendTo("body")
            .hide()
            .fadeIn(400)
            .delay(4000)
            .fadeOut(400, function() { $(this).remove(); });
    },

    //Carica anteprima XML referti
    anteprimaXML: function(nomeFile) {
        fetch('http://localhost:3000/referti/' + nomeFile)
            .then(res => res.text())
            .then(str => {
                let parser = new DOMParser();
                let xmlDoc = parser.parseFromString(str, "text/xml");

                // Navigazione del DOM XML per estrarre i dati
                let radice = xmlDoc.getElementsByTagName("referto_partita")[0];
                let garaId = radice.getAttribute("id");
                
                let nodoCasa = xmlDoc.getElementsByTagName("casa")[0];
                let nodoOspiti = xmlDoc.getElementsByTagName("ospiti")[0];
                
                let squadraCasa = nodoCasa.getAttribute("nome");
                let puntiCasa = nodoCasa.childNodes[0].nodeValue;
                
                let squadraOspite = nodoOspiti.getAttribute("nome");
                let puntiOspite = nodoOspiti.childNodes[0].nodeValue;

                // Mostriamo il risultato con la notifica jQuery
                let msg = `<div style='text-align:center'>
                            <small>ANTEPRIMA GARA #${garaId}</small><br>
                            <span style='font-size:1.2rem'>${squadraCasa} <b>${puntiCasa}</b> - <b>${puntiOspite}</b> ${squadraOspite}</span>
                           </div>`;
                this.mostraNotifica(msg);
            })
            .catch(err => {
                console.error("Errore parse XML", err);
                this.mostraNotifica("⚠️ Errore nella lettura dell'anteprima XML.");
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