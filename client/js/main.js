import Timer from '../src/components/Timer.js';
import Scoreboard from '../src/components/Scoreboard.js';
import api from './api.js';

const { createApp } = Vue;

// Spostata fuori per fare in modo che Vue non vada MAI PIÙ in crash all'avvio
const generaSquadraVuota = (nome, idPrefix, posSuffix) => {
    return {
        nome: nome,
        logo: null,
        giocatori: Array.from({ length: 10 }, (_, i) => ({
            id: idPrefix + i, nome: '', numero: '', inCampo: i < 5,
            minuti: 0, punti: 0, rimbalzi: 0, assist: 0, rubate: 0, stoppate: 0, perse: 0, falli: 0, plsm: 0,
            posClass: 'p' + (i + 1) + posSuffix,
            popupMsg: '', showPopup: false, isNegativo: false
        }))
    };
};

const app = createApp({
    data() {
        return {
            currentView: 'landing',
            leaderboardView: 'teams',
            classificaSquadre: [],
            miglioriMarcatori: [], // Aggiunto per il grafico Chart.js
            ruolo: null,
            tabellinoAttivo: 'casa',
            username: '',
            password: '',
            storicoPartite: [],
            listaReferti: [],
            erroreLogin: false,
            mostraInputCodice: false,
            codicePartitaInput: '',
            idRicerca: '',
            idPartitaCorrente: '0000',
            socket: null,
            partitaTerminata: false,
            partitaInterrotta: false,
            mostraPopupInizioPartita: false,
            fischioInizioMostrato: false,
            mostraPopupFinePartitaSpettatore: false,
            mostraPopupConfermaNextQ: false,
            periodo: 1,
            attesaLiveTimeout: null,
            mostraPopupHome: false,
            mostraPopupSalvataggio: false,
            mostraPopupLogout: false,
            mostraPopupAvviso: false,
            messaggioAvviso: '',
            menuAvanzatoGiocatore: false,
            
            // --- STATO UI VUE NATIVO (Ex jQuery) ---
            notifiche: [],
            mostraRadar: false,
            radarPlayerA: null,
            radarPlayerB: null,
            radarChartIstanza: null,
            myBarChartIstanza: null,
            //Anteprima XML
            mostraModalAnteprima: false,
            datiAnteprima: { id: '', data: '', casa: '', puntiCasa: '', ospite: '', puntiOspite: '', giocatoriCasa: [], giocatoriOspite: [] },

            squadreDisponibili: [
                { nome: "Sapienza Bulls", logo: "./assets/sapienza_bulls.jpeg" },
                { nome: "Lamis Lions", logo: "./assets/lamis_lions.jpeg" },
                { nome: "Orte Dragons", logo: "./assets/orte_dragons.jpeg" },
                { nome: "Torvergata Griffins ", logo: "./assets/torvergata_griffins.jpeg" },
            ],
            squadraCasaSelezionata: null,
            squadraOspiteSelezionata: null,
            giocatoreAttivo: null,
            panchinaroSelezionato: null,
            
            teamA: generaSquadraVuota("", "A", "a"),
            teamB: generaSquadraVuota("", "B", "b")
        }
    },
    computed: {
        punteggioCasa() { return this.teamA.giocatori.reduce((sum, p) => sum + p.punti, 0); },
        punteggioOspite() { return this.teamB.giocatori.reduce((sum, p) => sum + p.punti, 0); },

        testoPeriodo() {
            if (this.partitaInterrotta) return `🛑 INTERROTTA`;
            if (this.periodo <= 4) return `QUARTO ${this.periodo}`;
            if (this.periodo === 5) return `OVERTIME`;
            return `OT ${this.periodo - 4}`;
        },
        durataPeriodo() {
            return this.periodo <= 4 ? 600 : 300;
        },
        giocatoriValidiA() {
            return this.teamA.giocatori.filter(p => p.nome.trim() !== '');
        },
        giocatoriValidiB() {
            return this.teamB.giocatori.filter(p => p.nome.trim() !== '');
        },
        giocatoreMVP() {
            if (!this.partitaTerminata) return null;
            const tuttiGiocatori = [...this.teamA.giocatori, ...this.teamB.giocatori].filter(g => g.nome.trim() !== '');
            if (tuttiGiocatori.length === 0) return null;

            let mvp = null;
            let maxValutazione = -Infinity;

            tuttiGiocatori.forEach(player => {
                const valutazione = (player.punti + player.rimbalzi + player.assist + player.rubate + player.stoppate) - (player.falli + player.perse);
                if (valutazione > maxValutazione) {
                    maxValutazione = valutazione;
                    mvp = player;
                }
            });
            return maxValutazione > 0 ? mvp : null;
        },
    },
    mounted() {
        this.aggiornaListaReferti();
        
        if (typeof io !== 'undefined') {
            this.socket = io();

            this.socket.on('connect', () => {
                if (this.idPartitaCorrente && this.idPartitaCorrente !== '0000') {
                    this.socket.emit('entra_partita', this.idPartitaCorrente);
                    if (this.ruolo === 'admin') this.trasmettiDatiLive();
                }
            });
            
            this.socket.on('dati_live', (payload) => {
                if (this.idPartitaCorrente === '0000') return; 

                if (this.ruolo === 'utente' || this.ruolo === 'viewer') {
                    
                    if (this.currentView !== 'court' && this.currentView !== 'boxscore') {
                        this.currentView = 'court';
                        if (this.attesaLiveTimeout) clearTimeout(this.attesaLiveTimeout);
                        this.mostraNotifica("📡 Segnale Live stabilito!", "success");
                    }

                    if (payload.periodo > this.periodo) {
                        if (payload.periodo <= 4) {
                            this.mostraNotifica(`🏀 Inizia il Quarto ${payload.periodo}`, "info");
                        } else if (payload.periodo === 5) {
                            this.mostraNotifica("🏀 Parità! Si va all'OVERTIME (5 Minuti)!", "warning");
                        } else {
                            this.mostraNotifica(`🏀 Inizia l'OT ${payload.periodo - 4}`, "info");
                        }
                    }

                    if (payload.periodo === 1 && payload.timer && payload.timer.inEsecuzione && !this.fischioInizioMostrato) {
                        this.mostraPopupInizioPartita = true;
                        this.fischioInizioMostrato = true; 
                        setTimeout(() => { this.mostraPopupInizioPartita = false; }, 2000); 
                    }
                    
                    if (payload.periodo >= 4 && payload.timer && payload.timer.tempoResiduo === 0 && 
                        (payload.teamA.giocatori.reduce((sum, p) => sum + p.punti, 0) !== payload.teamB.giocatori.reduce((sum, p) => sum + p.punti, 0)) && 
                        !this.mostraPopupFinePartitaSpettatore && !this.partitaTerminata) {
                        
                        this.mostraPopupFinePartitaSpettatore = true;
                        setTimeout(() => { this.mostraPopupFinePartitaSpettatore = false; }, 3000); 
                    }

                    this.teamA = payload.teamA;
                    this.teamB = payload.teamB;
                    this.partitaTerminata = payload.partitaTerminata;   
                    this.partitaInterrotta = payload.partitaInterrotta; 
                    this.periodo = payload.periodo;     

                    if (payload.timer && this.$refs.timerRef) {
                        this.$refs.timerRef.impostaDatiEsterni(payload.timer.tempoResiduo, payload.timer.inEsecuzione);
                    }
                }
            });

            this.socket.on('nuovo_spettatore', () => {
                if (this.ruolo === 'admin') this.trasmettiDatiLive();
            });
        }
    },
    methods: {
        
        // =========================================
        // 1. SISTEMA UI VUE NATIVO E NOTIFICHE
        // =========================================
        
        mostraNotifica(messaggio, tipo = 'info') {
            let icona = "ℹ️";
            if (tipo === 'success') icona = "✅";
            if (tipo === 'error') icona = "❌";
            if (tipo === 'warning') icona = "⚠️";

            const id = Date.now() + Math.random();
            this.notifiche.push({ id, messaggio, tipo, icona });

            setTimeout(() => {
                this.notifiche = this.notifiche.filter(n => n.id !== id);
            }, 3500);
        },

        mostraMessaggio(testo) {
            this.messaggioAvviso = testo;
            this.mostraPopupAvviso = true;
        },

        chiudiPopupAvviso() {
            this.mostraPopupAvviso = false;
        },

        // =========================================
        // 2. SISTEMA GRAFICI E MODALI (EX DATA-VIZ)
        // =========================================

        chiudiRadar() {
            this.mostraRadar = false;
            if (this.radarChartIstanza) {
                this.radarChartIstanza.destroy();
                this.radarChartIstanza = null;
            }
        },

        creaConfrontoAutomatico(idPartita) {
            fetch(`/api/partita/${idPartita}`)
                .then(res => {
                    if (!res.ok) throw new Error("Partita non trovata");
                    return res.json();
                })
                .then(data => {
                    const listaGiocatori = data.giocatori;
                    if (!listaGiocatori || listaGiocatori.length < 2) {
                        this.mostraNotifica("⚠️ Statistiche insufficienti nel database.", "warning");
                        return;
                    }

                    const squadrePresenti = [...new Set(listaGiocatori.map(g => g.squadra))];
                    if (squadrePresenti.length < 2) {
                        this.mostraNotifica("⚠️ Impossibile dividere i giocatori in due squadre.", "warning");
                        return;
                    }

                    const giocatoriSquadraA = listaGiocatori.filter(g => g.squadra === squadrePresenti[0]);
                    const giocatoriSquadraB = listaGiocatori.filter(g => g.squadra === squadrePresenti[1]);

                    const calcolaVal = (p) => (p.punti + p.rimbalzi + p.assist + p.rubate + p.stoppate) - (p.falli + p.perse);

                    giocatoriSquadraA.sort((a, b) => calcolaVal(b) - calcolaVal(a));
                    giocatoriSquadraB.sort((a, b) => calcolaVal(b) - calcolaVal(a));
                    
                    this.radarPlayerA = giocatoriSquadraA[0];
                    this.radarPlayerB = giocatoriSquadraB[0];
                    
                    if (this.radarPlayerA && this.radarPlayerB) {
                        this.mostraRadar = true; 
                        this.$nextTick(() => { this.renderizzaGraficoRadar(); });
                        this.mostraNotifica(`📊 Confronto Leader: ${this.radarPlayerA.nome} vs ${this.radarPlayerB.nome}`, "success");
                    }
                })
                .catch(err => {
                    console.error(err);
                    this.mostraNotifica("Errore caricamento dati.", "error");
                });
        },

        renderizzaGraficoRadar() {
            const canvas = document.getElementById('radarChart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            if (this.radarChartIstanza) this.radarChartIstanza.destroy();

            const p1 = this.radarPlayerA;
            const p2 = this.radarPlayerB;

            this.radarChartIstanza = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['PUNTI', 'RIMBALZI', 'ASSIST', 'RUBATE', 'STOPPATE'],
                    datasets: [
                        {
                            label: `${p1.nome} (${p1.squadra})`,
                            data: [p1.punti, p1.rimbalzi, p1.assist, p1.rubate, p1.stoppate],
                            fill: true, backgroundColor: 'rgba(26, 42, 108, 0.3)', borderColor: '#1a2a6c', pointBackgroundColor: '#1a2a6c', pointRadius: 5
                        },
                        {
                            label: `${p2.nome} (${p2.squadra})`,
                            data: [p2.punti, p2.rimbalzi, p2.assist, p2.rubate, p2.stoppate],
                            fill: true, backgroundColor: 'rgba(231, 76, 60, 0.3)', borderColor: '#e74c3c', pointBackgroundColor: '#e74c3c', pointRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    elements: { line: { borderWidth: 4 } },
                    plugins: { legend: { display: true, position: 'top', labels: { font: { size: 16, weight: 'bold' } } } },
                    scales: { 
                        r: { 
                            suggestedMin: 0, suggestedMax: 20,
                            pointLabels: { font: { size: 14, weight: '900' }, color: '#34495e', padding: 15 },
                            ticks: { font: { size: 13, weight: 'bold' }, color: '#7f8c8d', backdropColor: 'transparent', stepSize: 5 }
                        } 
                    }
                }
            });
        },

        renderizzaGraficoMarcatori() {
            this.$nextTick(() => {
                const canvas = document.getElementById('topScorersChart');
                if (!canvas) return;
                const ctx = canvas.getContext('2d');

                // Distrugge il grafico precedente se esiste per evitare sovrapposizioni
                if (this.myBarChartIstanza) this.myBarChartIstanza.destroy();

                // Prende i primi 5 giocatori dall'array caricato dal database
                const top5 = this.miglioriMarcatori.slice(0, 5);

                // TRUCCO 1: Mettiamo Nome e Squadra in un Array così Chart.js li scrive su due righe separate!
                const nomi = top5.map(g => [g.nome, `(${g.squadra})`]); 
                const punti = top5.map(g => g.punti_totali || g.punti); // Compatibile sia con punti_totali che con punti

                // TRUCCO 2: Colori Stile Podio (Oro, Argento, Bronzo, Blu e Azzurro)
                const backgroundColors = [
                    'rgba(255, 215, 0, 0.85)',   // 1° Oro
                    'rgba(192, 192, 192, 0.85)', // 2° Argento
                    'rgba(205, 127, 50, 0.85)',  // 3° Bronzo
                    'rgba(26, 42, 108, 0.85)',   // 4° Blu 
                    'rgba(52, 152, 219, 0.85)'   // 5° Azzurro
                ];
                
                const borderColors = ['#e6c200', '#a6a6a6', '#a66a28', '#1a2a6c', '#2980b9'];

                this.myBarChartIstanza = new Chart(ctx, {
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
                        maintainAspectRatio: false, // Permette al grafico di riempire l'altezza
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
            });
        },

        

        // =========================================
        // 3. FUNZIONI DI NAVIGAZIONE E SALVATAGGIO
        // =========================================

        apriBoxScore() {
            this.currentView = 'boxscore';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        
        tornaAlCampo() {
            this.currentView = 'court';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        async stampaRefertoUfficiale() {
            // Verifica che ci sia una partita valida
            if (!this.idPartitaCorrente || this.idPartitaCorrente === '0000') {
                this.mostraNotifica("❌ Nessuna partita selezionata per la stampa del referto.", "error");
                return;
            }

            // Formatta l'ID a 4 cifre per trovare il nome esatto del file (es. 1 -> 0001)
            const idFormattato = this.idPartitaCorrente.toString().padStart(4, '0');
            const fileName = `referto_${idFormattato}.xml`;
            
            // Apre l'XML già generato in una nuova scheda.
            // Uso il percorso relativo '/referti/' così funziona sia dal pc che dallo smartphone!
            window.open(`/referti/${fileName}`, '_blank');
            this.mostraNotifica("📄 Referto XML aperto con successo!", "success");
        },

        chiediConfermaSalvataggio() {
            this.mostraPopupSalvataggio = true;
            if (this.$refs.timerRef && this.$refs.timerRef.timerRunning) {
                this.$refs.timerRef.toggleTimer(); 
            }
        },

        async confermaESalva() {
            if (this.teamA.giocatori.filter(p => p.nome.trim() !== '').length < 5 || 
                this.teamB.giocatori.filter(p => p.nome.trim() !== '').length < 5) {
                this.mostraNotifica("Roster incompleti. Le squadre devono avere almeno 5 giocatori.", "error");
                this.mostraPopupSalvataggio = false;
                return;
            }

            const listaGiocatori = [...this.teamA.giocatori, ...this.teamB.giocatori].filter(p => p.nome.trim() !== '');

            const payload = {
                squadraCasa: { 
                    nome: this.teamA.nome || 'SQUADRA CASA',
                    giocatori: this.teamA.giocatori.filter(p => p.nome.trim() !== '')
                },
                squadraOspite: { 
                    nome: this.teamB.nome || 'SQUADRA OSPITI',
                    giocatori: this.teamB.giocatori.filter(p => p.nome.trim() !== '')
                },
                
                // ⚠️ MODIFICA QUI: Devi usare 'punteggio' e non 'punti'
                punteggioCasa: this.punteggioCasa,
                punteggioOspite: this.punteggioOspite,
                
                giocatori: listaGiocatori.map(p => ({
                    nome: p.nome,
                    numero: p.numero,
                    squadra: p.posClass.includes('a') ? (this.teamA.nome || 'Casa') : (this.teamB.nome || 'Ospite'),
                    punti: p.punti, falli: p.falli, rimbalzi: p.rimbalzi,
                    assist: p.assist, rubate: p.rubate, stoppate: p.stoppate, perse: p.perse
                }))
            };

           try {
                const risultato = await api.salva(payload);
                if (risultato.success) {
                    
                    // --- IL BLOCCO RIPRISTINATO! ---
                    this.partitaTerminata = true; 
                    this.trasmettiDatiLive(); // Avvisa anche gli spettatori che è finita
                    // -------------------------------

                    this.mostraNotifica(`🏆 Partita Archiviata!<br><small>${risultato.message}</small>`, "success");
                    await this.aggiornaListaReferti();
                    this.apriBoxScore();
                    
                    if (this.giocatoreMVP) {
                        setTimeout(() => {
                            this.mostraNotifica(`🏆 MVP: ${this.giocatoreMVP.nome}!`, "success");
                        }, 800);
                    }
                } else {
                    this.mostraNotifica(`❌ ${risultato.message}`, "error");
                }
            } catch (error) {
                console.error(error);
                this.mostraNotifica("Errore critico durante il salvataggio.", "error");
            } finally {
                this.mostraPopupSalvataggio = false;
            }
        },

        avanzaPeriodo() {
            if (this.periodo >= 4) {
                if (this.punteggioCasa === this.punteggioOspite) {
                    this.periodo++;
                    this.mostraNotifica("🏀 Parità! Si va all'OVERTIME (5 Minuti)!", "warning");
                } else {
                    this.mostraNotifica("🏆 Partita conclusa! Ora puoi premere Salva Partita.", "success");
                }
            } else {
                this.periodo++;
                this.mostraNotifica(`🏀 Inizia il Quarto ${this.periodo}`, "info");
            }
            this.trasmettiDatiLive();
        },        

        async aggiornaListaReferti() {
            try {
                const files = await api.getListaReferti();
                this.listaReferti = files || [];
                
                if (files && files.length > 0) {
                    let nuovoStorico = [];
                    for (const ref of files) {
                        const idMatch = ref.replace('referto_', '').replace('.xml', '');
                        nuovoStorico.push({
                            id: idMatch, nomeFile: ref, mvpNome: 'Calcolo...', valutazioneMvp: 0,
                            squadraCasa: '....', squadraOspite: '...' 
                        });
                    }
                    
                    nuovoStorico.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
                    this.storicoPartite = [...nuovoStorico];
                    
                    for (let i = 0; i < this.storicoPartite.length; i++) {
                        const partita = this.storicoPartite[i];
                        const idPuroDB = parseInt(partita.id, 10); 
                        
                        try {
                            const partitaDB = await api.ottieniPartita(partita.id);
                                if (partitaDB && partitaDB.info) {
                                    this.storicoPartite[i].squadraCasa = partitaDB.info.squadra_casa;
                                    this.storicoPartite[i].squadraOspite = partitaDB.info.squadra_ospite;
                                }
                        } catch (e) {
                            this.storicoPartite[i].squadraCasa = "N/D";
                            this.storicoPartite[i].squadraOspite = "N/D";
                        }
                        
                        const datiMvp = await api.getMVP(idPuroDB);
                        if (datiMvp && datiMvp.nome) {
                            this.storicoPartite[i].mvpNome = datiMvp.nome;
                            this.storicoPartite[i].valutazioneMvp = datiMvp.valutazione;
                        } else {
                            this.storicoPartite[i].mvpNome = 'N/D';
                        }
                    }
                }
            } catch (error) {
                console.error("❌ Errore lista referti ed MVP:", error);
            }
        },

        async apriArchivio() {
            this.listaReferti = await api.getListaReferti();
            this.currentView = 'history';
        },

        async apriLeaderboard() {
            try {
                const response = await fetch('/api/classifica');
                const data = await response.json();
                
                this.classificaSquadre = data.standings;
                this.miglioriMarcatori = data.topScorers; // Salviamo i dati per la schermata "scorers"
                
                this.currentView = 'leaderboard';
                this.leaderboardView = 'teams'; 
                
                this.mostraNotifica("Dati aggregati caricati con successo!", "success");
            } catch (error) {
                console.error("Errore caricamento classifica:", error);
                this.mostraNotifica("Errore di connessione al database.", "error");
            }
        },

        anteprimaXML(nomeFile) {
            fetch('/referti/' + nomeFile)
                .then(res => {
                    if (!res.ok) throw new Error("File XML non trovato.");
                    return res.text();
                })
                .then(str => {
                    let parser = new DOMParser();
                    let xmlDoc = parser.parseFromString(str, "text/xml");

                    let radice = xmlDoc.getElementsByTagName("referto_partita")[0];
                    let garaId = radice ? radice.getAttribute("id") : "N/D";
                    
                    let tagData = xmlDoc.getElementsByTagName("data")[0];
                    let dataGara = tagData ? tagData.textContent.trim() : "N/D";
                    
                    let nodoCasa = xmlDoc.getElementsByTagName("squadra_casa")[0] || xmlDoc.getElementsByTagName("casa")[0];
                    let nodoOspiti = xmlDoc.getElementsByTagName("squadra_ospite")[0] || xmlDoc.getElementsByTagName("ospiti")[0];
                    
                    // LETTURA SICURA CON textContent (risolve l'errore "undefined")
                    let squadraCasa = nodoCasa ? nodoCasa.getAttribute("nome") : "Team Casa";
                    let puntiCasa = nodoCasa ? nodoCasa.textContent.trim() : "0";
                    
                    let squadraOspite = nodoOspiti ? nodoOspiti.getAttribute("nome") : "Team Ospiti";
                    let puntiOspite = nodoOspiti ? nodoOspiti.textContent.trim() : "0";

                    let nodiGiocatori = xmlDoc.getElementsByTagName("giocatore");
                    let rosterCasa = [];
                    let rosterOspiti = [];

                    for (let i = 0; i < nodiGiocatori.length; i++) {
                        let nG = nodiGiocatori[i];
                        let squadraAttr = nG.getAttribute("squadra");
                        let maglia = nG.getAttribute("maglia");
                        
                        let tagNome = nG.getElementsByTagName("nome")[0];
                        let nome = tagNome ? tagNome.textContent.trim() : "";
                        
                        let tagPunti = nG.getElementsByTagName("punti")[0];
                        let punti = tagPunti ? parseInt(tagPunti.textContent.trim(), 10) || 0 : 0;

                        let playerObj = { nome, numero: maglia, punti };

                        if (squadraAttr === 'Casa') {
                            rosterCasa.push(playerObj);
                        } else {
                            rosterOspiti.push(playerObj);
                        }
                    }

                    rosterCasa.sort((a, b) => b.punti - a.punti);
                    rosterOspiti.sort((a, b) => b.punti - a.punti);

                    // Mappiamo sia 'punti' che 'punteggio' per sicurezza assoluta con il tuo file HTML
                    this.datiAnteprima = {
                        id: garaId,
                        data: dataGara,
                        casa: squadraCasa,
                        puntiCasa: puntiCasa,
                        punteggioCasa: puntiCasa, 
                        ospite: squadraOspite,
                        puntiOspite: puntiOspite,
                        punteggioOspite: puntiOspite, 
                        giocatoriCasa: rosterCasa.slice(0, 3),
                        giocatoriOspite: rosterOspiti.slice(0, 3)
                    };
                    
                    this.mostraModalAnteprima = true;
                })
                .catch(err => {
                    console.error("Errore lettura o parsing XML:", err);
                    this.mostraNotifica("⚠️ Impossibile caricare l'anteprima del referto XML.", "error");
                });
        },

        // =========================================
        // 4. FUNZIONI DI GESTIONE PARTITA E LOGICHE
        // =========================================

        caricaTestNBA() {
            this.teamA.nome = "Los Angeles Lakers";
            const rosterLakers = [
                { nome: "L. James", num: "23" }, { nome: "A. Davis", num: "3" }, 
                { nome: "A. Reaves", num: "15" }, { nome: "D. Russell", num: "1" }, 
                { nome: "R. Hachimura", num: "28" }, { nome: "J. Vanderbilt", num: "2" }, 
                { nome: "C. Wood", num: "35" }, { nome: "G. Vincent", num: "7" }, 
                { nome: "J. Hayes", num: "11" }, { nome: "C. Reddish", num: "5" }
            ];

            rosterLakers.forEach((giocatore, i) => {
                this.teamA.giocatori[i].nome = giocatore.nome;
                this.teamA.giocatori[i].numero = giocatore.num;
                this.teamA.giocatori[i].inCampo = i < 5; 
            });

            this.teamB.nome = "Golden State Warriors";
            const rosterWarriors = [
                { nome: "S. Curry", num: "30" }, { nome: "K. Thompson", num: "11" }, 
                { nome: "D. Green", num: "23" }, { nome: "A. Wiggins", num: "22" }, 
                { nome: "K. Looney", num: "5" }, { nome: "C. Paul", num: "3" }, 
                { nome: "J. Kuminga", num: "0" }, { nome: "M. Moody", num: "4" }, 
                { nome: "D. Saric", num: "20" }, { nome: "G. Payton II", num: "00" }
            ];

            rosterWarriors.forEach((giocatore, i) => {
                this.teamB.giocatori[i].nome = giocatore.nome;
                this.teamB.giocatori[i].numero = giocatore.num;
                this.teamB.giocatori[i].inCampo = i < 5;
            });

            this.mostraNotifica("🏀 Roster NBA completi caricati!", "success");
        },

        getEmptyTeam(nome, idPrefix, posSuffix) {
            return generaSquadraVuota(nome, idPrefix, posSuffix);
        },

        getClasseGiocatore(p, teamId) {
            const isCasa = teamId === 'A';
            return [
                'player', 
                isCasa ? 'team-left' : 'team-right', 
                p.posClass, 
                p.inCampo ? (isCasa ? 'bordo-verdea' : 'bordo-verdeb') : (isCasa ? 'bordo-biancoa' : 'bordo-biancob'),
                { 'pronto-al-cambio': this.panchinaroSelezionato === p },
                { 'espulso': p.falli >= 5 }
            ];
        },

        effettuaLogin() {
            if (this.username.toLowerCase() === 'admin' && this.password === '1234') {
                this.ruolo = 'admin';
                this.erroreLogin = false;
                this.currentView = 'home';
            } 
            else if (this.username.toLowerCase() === 'utente' && this.password === '0000') {
                this.ruolo = 'utente';
                this.erroreLogin = false;
                this.currentView = 'home';
            } 
            else {
                this.erroreLogin = true;
            }
        },

        async iniziaPartita() {
            const getValidi = (team) => team.giocatori.filter(p => p.nome.trim() !== '' && p.numero !== '');
            const vA = getValidi(this.teamA);
            const vB = getValidi(this.teamB);

            if (vA.length < 5 || vB.length < 5) {
                this.mostraNotifica("⚠️ Almeno 5 giocatori con nome e numero per squadra!", "warning");
                return; 
            }

            const hasDup = (list) => new Set(list.map(g => g.numero.toString())).size !== list.length;
            if (hasDup(vA) || hasDup(vB)) {
                this.mostraNotifica("⚠️ Numeri duplicati rilevati nella stessa squadra!", "error");
                return; 
            }

            this.teamA.nome = this.squadraCasaSelezionata ? this.squadraCasaSelezionata.nome : this.teamA.nome;
            this.teamB.nome = this.squadraOspiteSelezionata ? this.squadraOspiteSelezionata.nome : this.teamB.nome;
            this.teamA.logo = this.squadraCasaSelezionata ? this.squadraCasaSelezionata.logo : null;
            this.teamB.logo = this.squadraOspiteSelezionata ? this.squadraOspiteSelezionata.logo : null;

            let nextId = 1;
            try {
                const referti = await api.getListaReferti(); 
                if (referti && referti.length > 0) {
                    const ids = referti.map(file => {
                        const strNum = file.replace('referto_', '').replace('.xml', '');
                        return parseInt(strNum, 10);
                    }).filter(n => !isNaN(n));
                    if (ids.length > 0) nextId = Math.max(...ids) + 1; 
                }
            } catch(e) { console.error("Errore nel recupero ID", e); }

            this.idPartitaCorrente = nextId.toString().padStart(4, '0');
            this.ruolo = 'admin';
            this.periodo = 1;
            this.currentView = 'court';

            if (this.socket) {
                this.socket.emit('entra_partita', this.idPartitaCorrente);
                this.trasmettiDatiLive();
            }

            this.mostraNotifica(`🏀 Partita N° ${this.idPartitaCorrente} creata con successo!`, "success");
        },

        async accediPartitaConCodice() {
            if (this.codicePartitaInput.trim() === '') {
                this.mostraNotifica("⚠️ Inserisci un codice!", "warning");
                return;
            }
            const idCercato = this.codicePartitaInput.padStart(4, '0');
            this.idPartitaCorrente = idCercato;

            try {
                const partitaDB = await api.ottieniPartita(idCercato);
                
                if (partitaDB && partitaDB.info) {
                    this.ruolo = 'viewer';
                    this.currentView = 'court';
                    this.partitaTerminata = true;
                    this.partitaInterrotta = false;

                    this.teamA = this.getEmptyTeam(partitaDB.info.squadra_casa, "A", "a");
                    this.teamB = this.getEmptyTeam(partitaDB.info.squadra_ospite, "B", "b");

                    const dbGiocatoriA = partitaDB.giocatori.filter(g => g.squadra === partitaDB.info.squadra_casa);
                    const dbGiocatoriB = partitaDB.giocatori.filter(g => g.squadra === partitaDB.info.squadra_ospite);

                    dbGiocatoriA.forEach((dbPlayer, index) => {
                        if (index < 10) { 
                            this.teamA.giocatori[index] = { ...this.teamA.giocatori[index], ...dbPlayer, inCampo: index < 5 };
                        }
                    });

                    dbGiocatoriB.forEach((dbPlayer, index) => {
                        if (index < 10) {
                            this.teamB.giocatori[index] = { ...this.teamB.giocatori[index], ...dbPlayer, inCampo: index < 5 };
                        }
                    });
                    
                    this.mostraNotifica("📂 Partita recuperata dall'archivio.", "success");
                    setTimeout(() => {
                        if (this.giocatoreMVP) this.mostraNotifica(`🏆 MVP del match: ${this.giocatoreMVP.nome}`, "success");
                    }, 1200);
                    
                } else {
                    this.ruolo = 'viewer';
                    this.partitaTerminata = false;
                    
                    if (this.socket) {
                        this.socket.emit('entra_partita', idCercato);
                        this.mostraNotifica("⏳ Ricerca segnale Live in corso...", "info");
                        
                        if (this.attesaLiveTimeout) clearTimeout(this.attesaLiveTimeout);
                        this.attesaLiveTimeout = setTimeout(() => {
                            if (this.currentView !== 'court') {
                                this.mostraNotifica("❌ Partita non in diretta o codice errato.", "error");
                                this.idPartitaCorrente = '0000'; 
                                this.ruolo = this.username.toLowerCase() === 'admin' ? 'admin' : 'utente';
                            }
                        }, 3000);
                    }
                }
            } catch (e) {
                this.mostraNotifica("⚠️ Errore di connessione al database.", "error");
            }
        },

        trasmettiDatiLive() {
            if (this.ruolo === 'admin' && this.socket) {
                let datiTimer = null;
                if (this.$refs.timerRef) {
                    datiTimer = {
                        tempoResiduo: this.$refs.timerRef.timer,
                        inEsecuzione: this.$refs.timerRef.timerRunning 
                    };
                }

                this.socket.emit('aggiornamento_admin', {
                    idPartita: this.idPartitaCorrente,
                    payload: {
                        teamA: this.teamA,
                        teamB: this.teamB,
                        partitaTerminata: this.partitaTerminata,
                        partitaInterrotta: this.partitaInterrotta, 
                        periodo: this.periodo,
                        timer: datiTimer 
                    }
                });
            }
        },

        chiediConfermaLogout() {
            this.mostraPopupLogout = true;
        },

        annullaLogout() {
            this.mostraPopupLogout = false;
        },

        eseguiLogout() {
            this.mostraPopupLogout = false;
            
            if (this.socket && this.ruolo === 'admin' && this.currentView === 'court' && !this.partitaTerminata) {
                this.partitaInterrotta = true;
                if (this.$refs.timerRef) {
                    this.$refs.timerRef.timerRunning = false;
                    clearInterval(this.$refs.timerRef.interval);
                }
                this.socket.emit('interrompi_partita', this.idPartitaCorrente);
                this.trasmettiDatiLive();
            }

            if (this.$refs.timerRef) {
                this.$refs.timerRef.timerRunning = false;
                clearInterval(this.$refs.timerRef.interval);
                this.$refs.timerRef.timer = 600; 
            }

            this.currentView = 'landing'; 
            this.password = ''; 
            this.ruolo = null;
            this.username = '';

            this.codicePartitaInput = '';
            this.partitaTerminata = false;
            this.partitaInterrotta = false; 
            this.mostraPopupInizioPartita = false;
            this.fischioInizioMostrato = false;
            this.mostraPopupFinePartitaSpettatore = false;
            this.periodo = 1;
            this.idPartitaCorrente = '0000';
            this.squadraCasaSelezionata = null;
            this.squadraOspiteSelezionata = null;
            this.giocatoreAttivo = null;
            this.panchinaroSelezionato = null;

            this.teamA = this.getEmptyTeam("", "A", "a");
            this.teamB = this.getEmptyTeam("", "B", "b");
        },

        backhome() { 
            if (this.currentView === 'court' || this.currentView === 'setup' || this.currentView === 'boxscore') {
                this.mostraPopupHome = true;
            } else {
                this.eseguiBackhome();
            }
        },
        
        eseguiBackhome() {
            this.mostraPopupHome = false;
            
            if (this.socket && this.ruolo === 'admin' && this.currentView === 'court' && !this.partitaTerminata) {
                this.partitaInterrotta = true; 
                if (this.$refs.timerRef) {
                    this.$refs.timerRef.timerRunning = false;
                    clearInterval(this.$refs.timerRef.interval);
                }
                this.socket.emit('interrompi_partita', this.idPartitaCorrente);
                this.trasmettiDatiLive();
            }

            this.currentView = 'home'; 
            this.codicePartitaInput = '';
            
            if (this.$refs.timerRef) this.$refs.timerRef.timer = 600; 

            this.idPartitaCorrente = '0000';
            this.partitaTerminata = false;
            this.partitaInterrotta = false; 
            this.mostraPopupInizioPartita = false;
            this.fischioInizioMostrato = false;
            this.mostraPopupFinePartitaSpettatore = false;
            this.periodo = 1;
            this.squadraCasaSelezionata = null;
            this.squadraOspiteSelezionata = null;
            this.giocatoreAttivo = null;
            this.panchinaroSelezionato = null;
            
            this.teamA = this.getEmptyTeam("", "A", "a");
            this.teamB = this.getEmptyTeam("", "B", "b");

            if (this.username.toLowerCase() === 'admin') this.ruolo = 'admin';
            else if (this.username.toLowerCase() === 'utente') this.ruolo = 'utente';
        },

        annullaBackhome() {
            this.mostraPopupHome = false;
        },

        gestisciClickGiocatore(p) {
            if (this.ruolo !== 'admin' || this.partitaTerminata) return;
            if (!p.inCampo && p.falli >= 5) {
                this.mostraMessaggio("Questo giocatore ha 5 falli e non può rientrare in campo.");
                this.panchinaroSelezionato = null;
                return;
            }
            if (!p.inCampo) {
                if (this.panchinaroSelezionato === p) this.panchinaroSelezionato = null;
                else this.panchinaroSelezionato = p;
                return;
            }
            if (p.inCampo && this.panchinaroSelezionato) {
                if (p.id.charAt(0) !== this.panchinaroSelezionato.id.charAt(0)) {
                    this.panchinaroSelezionato = null; return;
                }
                p.inCampo = false; this.panchinaroSelezionato.inCampo = true;
                const tempPos = p.posClass;
                p.posClass = this.panchinaroSelezionato.posClass;
                this.panchinaroSelezionato.posClass = tempPos;
                this.panchinaroSelezionato = null;
                return;
            }
            if (p.inCampo && p.falli >= 5) {
                this.mostraMessaggio("Giocatore espulso per 5 falli. Effettua un cambio.");
                return;
            }
            if (this.ruolo === 'admin' && !this.partitaTerminata) this.giocatoreAttivo = p;
        },

        aggiungiStat(tipo, val) {
            if (this.partitaTerminata) return;
            
            if (this.giocatoreAttivo) {
                this.giocatoreAttivo[tipo] += val;

                if (tipo === 'punti') {
                    const isCasa = this.giocatoreAttivo.id.startsWith('A');
                    const compagni = isCasa ? this.teamA.giocatori : this.teamB.giocatori;
                    compagni.forEach(p => { if(p.inCampo) p.plsm += val; });

                    const avversari = isCasa ? this.teamB.giocatori : this.teamA.giocatori;
                    avversari.forEach(p => { if(p.inCampo) p.plsm -= val; });
                }

                if (tipo === 'falli' && this.giocatoreAttivo.falli >= 5) {
                    this.mostraMessaggio(`Il giocatore numero ${this.giocatoreAttivo.numero} è uscito per 5 falli!`);
                }
                
                const abbreviazioni = { punti: 'PTS', rimbalzi: 'REB', assist: 'AST', rubate: 'STL', stoppate: 'BLK', perse: 'TOV', falli: 'FLS' };
                const sigla = abbreviazioni[tipo] || tipo.toUpperCase();
                const playerToAnimate = this.giocatoreAttivo;
                
                playerToAnimate.popupMsg = `+${val} ${sigla}`;
                playerToAnimate.isNegativo = false; 
                playerToAnimate.showPopup = true;

                setTimeout(() => { playerToAnimate.showPopup = false; }, 1200);
                this.giocatoreAttivo = null;

                this.trasmettiDatiLive();
            }
        },

        rimuoviStat(tipo, val) {
            if (this.partitaTerminata) return;
            
            if (this.giocatoreAttivo) {
                this.giocatoreAttivo[tipo] -= val;
                
                if (tipo === 'falli' && this.giocatoreAttivo.falli >= 5) {
                    this.mostraMessaggio(`Il giocatore numero ${this.giocatoreAttivo.numero} è uscito per 5 falli!`);
                }

                const abbreviazioni = { punti: 'PTS', rimbalzi: 'REB', assist: 'AST', rubate: 'STL', stoppate: 'BLK', perse: 'TOV', falli: 'FLS' };
                const sigla = abbreviazioni[tipo] || tipo.toUpperCase();
                const playerToAnimate = this.giocatoreAttivo;
                
                playerToAnimate.popupMsg = `-${val} ${sigla}`;
                playerToAnimate.isNegativo = true; 
                playerToAnimate.showPopup = true;

                setTimeout(() => { playerToAnimate.showPopup = false; }, 1200);
                this.giocatoreAttivo = null;

                this.trasmettiDatiLive();
            }
        },

        aggiornaMinutiGiocatori() {
            if (this.partitaTerminata) return;
            this.teamA.giocatori.forEach(p => { if(p.inCampo && p.nome.trim() !== '') p.minuti++; });
            this.teamB.giocatori.forEach(p => { if(p.inCampo && p.nome.trim() !== '') p.minuti++; });
            this.trasmettiDatiLive();
        },

        formatMinuti(secondiTotali) {
            const m = Math.floor(secondiTotali / 60);
            const s = secondiTotali % 60;
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    }
});

app.component('game-timer', Timer);
app.component('score-board', Scoreboard);
app.mount('#app');