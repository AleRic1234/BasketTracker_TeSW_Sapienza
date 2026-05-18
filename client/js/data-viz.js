// Percorso: client/js/data-viz.js

window.DataViz = {

    myRadarChart: null,
    myBarChart: null,

    // 1. NOTIFICHE JQUERY
    mostraNotifica: function(messaggio, tipo = 'info') {
        
        // 1. Creiamo il "contenitore" delle notifiche se non esiste ancora
        if ($("#toast-container").length === 0) {
            $("<div id='toast-container'></div>").css({
                position: "fixed",
                bottom: "20px",
                right: "20px",
                zIndex: 3000,
                display: "flex",
                flexDirection: "column", // Incolonna gli elementi
                gap: "10px",             // Spazio di 10px tra una notifica e l'altra
                alignItems: "flex-end",  // Allinea tutto a destra
                pointerEvents: "none"    // Permette di cliccare lo schermo "attraverso" lo spazio vuoto
            }).appendTo("body");
        }

        // 2. Scegliamo un'icona in base al tipo (Tocco estetico aggiunto)
        let icona = "ℹ️";
        if (tipo === 'success') icona = "✅";
        if (tipo === 'error') icona = "❌";
        if (tipo === 'warning') icona = "⚠️";

        // 3. Creiamo la singola notifica
        // NOTA: Manteniamo la classe originale 'toast-msg' per la logica di conteggio, 
        // e aggiungiamo 'toast-glass' (o 'toast-pill') per la grafica avanzata del CSS.
        let $toast = $(`
            <div class='toast-msg toast-glass ${tipo}'> 
                <div style="font-size:1.3rem; margin-right: 5px;">${icona}</div> 
                <div>${messaggio}</div> 
            </div>
        `);

        // 4. Aggiungiamo la notifica in fondo al contenitore (le vecchie saliranno!)
        $("#toast-container").append($toast);

        // 5. Animazione di entrata e uscita (Esattamente 4 secondi come nel tuo originale)
        $toast.hide().fadeIn(300).delay(4000).fadeOut(400, function() { 
            $(this).remove(); 
        });

        // 6. LIMITE A 5 NOTIFICHE: Se ce ne sono più di 5, cancelliamo la più vecchia in alto
        let $toastsAttuali = $("#toast-container .toast-msg");
        if ($toastsAttuali.length > 5) {
            // .first() prende la prima della lista (la più in alto/vecchia) e la distrugge all'istante
            $toastsAttuali.first().remove(); 
        }
    },

    // 2. POPUP MODALE PER L'ANTEPRIMA XML
    mostraModaleAnteprima: function(garaId, squadraCasa, puntiCasa, puntiOspite, squadraOspite) {
        // Rimuove eventuali modali precedenti
        $("#xml-preview-modal").remove();
        
        let modaleHTML = `
            <div id="xml-preview-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px);">
                <div style="background: white; padding: 35px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); text-align: center; max-width: 450px; width: 90%; border-top: 8px solid #1a2a6c;">
                    
                    <small style="color: #7f8c8d; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Anteprima Gara #${garaId}</small>
                    
                    <div style="font-size: 1.5rem; color: #34495e; font-weight: 700; margin: 25px 0 15px 0;">
                        ${squadraCasa} <span style="color: #bdc3c7; font-size: 1rem; margin: 0 10px; font-weight: normal;">VS</span> ${squadraOspite}
                    </div>

                    <div style="font-size: 5rem; font-weight: 900; color: #1a2a6c; margin-bottom: 30px; letter-spacing: -2px; line-height: 1;">
                        ${puntiCasa} - ${puntiOspite}
                    </div>

                    <button id="close-preview-btn" style="background: #1a2a6c; color: white; border: none; padding: 12px 30px; border-radius: 50px; font-weight: bold; cursor: pointer; font-size: 1rem; width: 100%; transition: background 0.2s;">
                        CHIUDI ANTEPRIMA
                    </button>
                </div>
            </div>
        `;
        
        $("body").append(modaleHTML);
        
        // Cliccando il pulsante, si chiude
        $("#close-preview-btn").on("click", function() {
            $("#xml-preview-modal").fadeOut(200, function() { $(this).remove(); });
        });
        
        $("#xml-preview-modal").hide().fadeIn(300);
    },

    // 3. ANTEPRIMA XML 
    anteprimaXML: function(nomeFile) {
        fetch('/referti/' + nomeFile)
            .then(res => res.text())
            .then(str => {
                let parser = new DOMParser();
                let xmlDoc = parser.parseFromString(str, "text/xml");

                let radice = xmlDoc.getElementsByTagName("referto_partita")[0];
                let garaId = radice.getAttribute("id");
                
                let nodoCasa = xmlDoc.getElementsByTagName("squadra_casa")[0] || xmlDoc.getElementsByTagName("casa")[0];
                let nodoOspiti = xmlDoc.getElementsByTagName("squadra_ospite")[0] || xmlDoc.getElementsByTagName("ospiti")[0];
                
                // RIPRISTINATA LA TUA LOGICA ORIGINALE!
                let squadraCasa = nodoCasa ? nodoCasa.getAttribute("nome") : "Team A";
                let puntiCasa = nodoCasa ? nodoCasa.childNodes[0].nodeValue : "0";
                
                let squadraOspite = nodoOspiti ? nodoOspiti.getAttribute("nome") : "Team B";
                let puntiOspite = nodoOspiti ? nodoOspiti.childNodes[0].nodeValue : "0";

                // Chiamata sicura usando l'oggetto globale
                DataViz.mostraModaleAnteprima(garaId, squadraCasa, puntiCasa, puntiOspite, squadraOspite);
            })
            .catch(err => {
                console.error("Errore parse XML", err);
                DataViz.mostraNotifica("⚠️ Errore nella lettura dell'anteprima XML.", "error");
            });
    },

    // 4. RICHIESTA MVP
    mostraMVP: function(idPartita) {
        fetch(`/api/mvp/${idPartita}`)
            .then(res => {
                if(!res.ok) throw new Error("Dati MVP non ancora disponibili");
                return res.json();
            })
            .then(data => {
                let msg = `🏆 <strong>MVP del Match</strong> 🏆<br>${data.nome} (${data.squadra})<br>Valutazione PIR: <strong>${data.valutazione}</strong>`;
                DataViz.mostraNotifica(msg, "success"); // <--- CORRETTO
            })
            .catch(err => console.error(err));
    },

    // 5. RENDERING GRAFICO RADAR (Con creazione Modale)
    renderRadarChart: function(playerA, playerB) {
        // Rimuove eventuali modali precedenti
        $("#radar-modal").remove();

        // 1. MODALE ALLARGATA E RESPONSIVA: 
        // Aumentato il max-width a 750px e aggiunto un contenitore specifico per il canvas con altezza di 450px
        let modaleHTML = `
            <div id="radar-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 4000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);">
                <div style="background: white; padding: 30px; border-radius: 16px; width: 95%; max-width: 750px; text-align: center; position: relative; box-shadow: 0 15px 50px rgba(0,0,0,0.5);">
                    <button id="close-radar-btn" style="position: absolute; top: 15px; right: 20px; background: none; border: none; font-size: 1.8rem; cursor: pointer; transition: transform 0.2s;">❌</button>
                    <h2 style="margin-bottom: 20px; color: var(--dark-bg); font-size: 1.8rem; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">Scontro Diretto</h2>
                    
                    <div style="position: relative; height: 450px; width: 100%;">
                        <canvas id="radarChart"></canvas> 
                    </div>
                </div>
            </div>
        `;
        $("body").append(modaleHTML);

        // Effetto hover sul pulsante di chiusura
        $("#close-radar-btn").hover(
            function() { $(this).css("transform", "scale(1.2)"); },
            function() { $(this).css("transform", "scale(1)"); }
        );

        // Chiusura della modale
        $("#close-radar-btn").on("click", () => {
            $("#radar-modal").fadeOut(250, function() { $(this).remove(); });
            if (this.myRadarChart) { this.myRadarChart.destroy(); }
        });

        const canvas = document.getElementById('radarChart');
        const ctx = canvas.getContext('2d');

        if (this.myRadarChart) {
            this.myRadarChart.destroy();
        }

        // 2. CONFIGURAZIONE GRAFICO MIGLIORATA
        this.myRadarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['PUNTI', 'RIMBALZI', 'ASSIST', 'RUBATE', 'STOPPATE'],
                datasets: [
                    {
                        label: `${playerA.nome} (${playerA.squadra})`,
                        data: [playerA.punti, playerA.rimbalzi, playerA.assist, playerA.rubate, playerA.stoppate],
                        fill: true,
                        backgroundColor: 'rgba(26, 42, 108, 0.3)', // Colore più visibile
                        borderColor: '#1a2a6c',
                        pointBackgroundColor: '#1a2a6c',
                        pointRadius: 5,       // Punti di ancoraggio più grandi
                        pointHoverRadius: 8
                    },
                    {
                        label: `${playerB.nome} (${playerB.squadra})`,
                        data: [playerB.punti, playerB.rimbalzi, playerB.assist, playerB.rubate, playerB.stoppate],
                        fill: true,
                        backgroundColor: 'rgba(231, 76, 60, 0.3)', // Colore più visibile
                        borderColor: '#e74c3c',
                        pointBackgroundColor: '#e74c3c',
                        pointRadius: 5,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Fondamentale per far riempire il div di 450px!
                elements: { 
                    line: { borderWidth: 4 } // Linee più spesse
                },
                plugins: {
                    // ATTIVIAMO LA LEGENDA IN ALTO
                    legend: { 
                        display: true,
                        position: 'top',
                        labels: {
                            font: { size: 16, weight: 'bold', family: "'Segoe UI', sans-serif" },
                            color: '#2c3e50',
                            padding: 20,
                            usePointStyle: true // Rende i quadratini della legenda a forma di cerchio
                        }
                    },
                    tooltip: {
                        bodyFont: { size: 15 },
                        titleFont: { size: 16 }
                    }
                },
                scales: { 
                    r: { 
                        suggestedMin: 0, 
                        suggestedMax: 20,
                        // ETICHETTE ESTERNE (Punti, Rimbalzi...)
                        pointLabels: {
                            font: { size: 14, weight: '900', family: "'Segoe UI', sans-serif" },
                            color: '#34495e',
                            padding: 15 // Le allontana leggermente dal grafico
                        },
                        // NUMERI SULLA SCALA INTERNA
                        ticks: {
                            font: { size: 13, weight: 'bold' },
                            color: '#7f8c8d',
                            backdropColor: 'transparent', // Rimuove lo sgradevole sfondo bianco dietro ai numeri
                            stepSize: 5
                        },
                        // STILE GRIGLIA A RAGNATELA
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            circular: false // Mantienilo poligonale per un look più aggressivo
                        },
                        angleLines: {
                            color: 'rgba(0, 0, 0, 0.15)'
                        }
                    } 
                }
            }
        });
    },

    // 6. CONFRONTO AUTOMATICO GIOCATORI (Modificato per Squadre)
    creaConfrontoAutomatico: function(idPartita) {
        fetch(`/api/partita/${idPartita}`)
            .then(res => {
                if (!res.ok) throw new Error("Partita non trovata nel database");
                return res.json();
            })
            .then(data => {
                const listaGiocatori = data.giocatori;

                if (!listaGiocatori || listaGiocatori.length < 2) {
                    this.mostraNotifica("⚠️ Statistiche insufficienti nel database per il confronto.", "warning");
                    return;
                }

                // 1. Identifichiamo i nomi delle due squadre presenti
                // Usiamo Set per estrarre in automatico i due nomi univoci (es. "Casa" e "Ospite", oppure "Lakers" e "Bulls")
                const squadrePresenti = [...new Set(listaGiocatori.map(g => g.squadra))];

                if (squadrePresenti.length < 2) {
                    this.mostraNotifica("⚠️ Impossibile dividere i giocatori in due squadre.", "warning");
                    return;
                }

                // 2. Dividiamo i giocatori in due array separati
                const giocatoriSquadraA = listaGiocatori.filter(g => g.squadra === squadrePresenti[0]);
                const giocatoriSquadraB = listaGiocatori.filter(g => g.squadra === squadrePresenti[1]);

                // 3. Funzione per calcolare la "Valutazione" (la formula del VERO leader/MVP)
                const calcolaVal = (p) => (p.punti + p.rimbalzi + p.assist + p.rubate + p.stoppate) - (p.falli + p.perse);

                // 4. Ordiniamo ogni squadra in base al giocatore più forte (Valutazione decrescente)
                giocatoriSquadraA.sort((a, b) => calcolaVal(b) - calcolaVal(a));
                giocatoriSquadraB.sort((a, b) => calcolaVal(b) - calcolaVal(a));
                
                // 5. Estraiamo il numero 1 di ogni squadra!
                const leaderA = giocatoriSquadraA[0];
                const leaderB = giocatoriSquadraB[0];
                
                if (leaderA && leaderB) {
                    this.renderRadarChart(leaderA, leaderB);
                    this.mostraNotifica(`📊 Confronto Leader generato: ${leaderA.nome} vs ${leaderB.nome}`, "success");
                }
            })
            .catch(err => {
                console.error("Errore generazione grafico:", err);
                this.mostraNotifica("Errore nel caricamento dei dati per il grafico.", "error");
            });
    },

    // 7. GRAFICO A BARRE: TOP 5 SCORERS (LEADERBOARD)
    renderTopScorersChart: function(giocatori) {
        const canvas = document.getElementById('topScorersChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (DataViz.myBarChart) { DataViz.myBarChart.destroy(); }

        const top5 = giocatori.slice(0, 5);
        
        // TRUCCO 1: Mettiamo Nome e Squadra in un Array così Chart.js li scrive su due righe separate!
        const nomi = top5.map(g => [g.nome, `(${g.squadra})`]); 
        const punti = top5.map(g => g.punti_totali);

        // TRUCCO 2: Colori Stile Podio (Oro, Argento, Bronzo, Blu e Azzurro)
        const backgroundColors = [
            'rgba(255, 215, 0, 0.85)',   // 1° Oro
            'rgba(192, 192, 192, 0.85)', // 2° Argento
            'rgba(205, 127, 50, 0.85)',  // 3° Bronzo
            'rgba(26, 42, 108, 0.85)',   // 4° Blu 
            'rgba(52, 152, 219, 0.85)'   // 5° Azzurro
        ];
        
        const borderColors = ['#e6c200', '#a6a6a6', '#a66a28', '#1a2a6c', '#2980b9'];

        DataViz.myBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: nomi,
                datasets: [{
                    label: 'Punti Totali',
                    data: punti,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 2,
                    borderRadius: 8, // Angoli smussati più pronunciati
                    barPercentage: 0.5 // Rende le barre più snelle ed eleganti
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Permette al grafico di riempire l'altezza di 600px
                layout: {
                    padding: { top: 20 }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.06)',
                            drawBorder: false,
                            borderDash: [5, 5] // Linee orizzontali tratteggiate
                        },
                        ticks: { 
                            stepSize: 1, 
                            font: { size: 16 }, // Numeri Y più grandi
                            color: '#7f8c8d'
                        }
                    },
                    x: {
                        grid: { 
                            display: false // Nasconde le brutte linee verticali
                        }, 
                        ticks: {
                            font: { size: 15, weight: 'bold' }, // Testo X più grande
                            color: '#2c3e50'
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        titleFont: { size: 18 },
                        bodyFont: { size: 16 },
                        padding: 15,
                        displayColors: false, // Nasconde il quadratino nel tooltip
                        callbacks: {
                            label: function(context) {
                                return context.raw + ' Punti Segnati';
                            }
                        }
                    }
                }
            }
        });
    }

};