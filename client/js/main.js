import Timer from '../src/components/Timer.js';
import Scoreboard from '../src/components/Scoreboard.js';
import api from './api.js';

const { createApp } = Vue;

// Spostata fuori per fare iun modo che Vue non vada MAI PIÙ in crash all'avvio
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
            DataViz: window.DataViz, 
            currentView: 'login', 
            leaderboardView: 'teams',
            classificaSquadre: [],
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
            partitaInterrotta: false, // : Stato per la partita interrotta
            periodo: 1,
            attesaLiveTimeout: null, // Timer per bloccare l'accesso al viewer
            mostraPopupHome: false,
            mostraPopupSalvataggio: false,
            mostraPopupLogout: false,
            mostraPopupAvviso: false,
            messaggioAvviso: '',

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
            
            // Usiamo la funzione sicura che non fa crashare l'app!
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
            return `OT ${this.periodo - 4}`; // Es. OT 2, OT 3...
        },
        durataPeriodo() {
            // Ritorna 600 secondi (10 min) per i primi 4 quarti, 300 (5 min) per gli Overtime
            return this.periodo <= 4 ? 600 : 300;
        },
        giocatoriValidiA() {
            return this.teamA.giocatori.filter(p => p.nome.trim() !== '');
        },
        giocatoriValidiB() {
            return this.teamB.giocatori.filter(p => p.nome.trim() !== '');
        },
    },
    mounted() {
        this.aggiornaListaReferti();
        
        if (typeof io !== 'undefined') {
            this.socket = io();

            // Gestione riconnessione automatica
            this.socket.on('connect', () => {
                if (this.idPartitaCorrente && this.idPartitaCorrente !== '0000') {
                    // Rientra automaticamente nella stanza corretta
                    this.socket.emit('entra_partita', this.idPartitaCorrente);
                    
                    // Se chi si è appena ricollegato è l'iPad (admin), forza la trasmissione dei dati al PC
                    if (this.ruolo === 'admin') {
                        this.trasmettiDatiLive();
                    }
                }
            });
            
            this.socket.on('dati_live', (payload) => {
                
                // --- FIX BUG HOME: Se siamo tornati alla home, ignora le vecchie trasmissioni! ---
                if (this.idPartitaCorrente === '0000') return; 

                if (this.ruolo === 'utente' || this.ruolo === 'viewer') {
                    
                    // --- FIX BUG BOXSCORE: Riportalo in campo SOLO se non sta leggendo le statistiche ---
                    if (this.currentView !== 'court' && this.currentView !== 'boxscore') {
                        this.currentView = 'court';
                        if (this.attesaLiveTimeout) clearTimeout(this.attesaLiveTimeout);
                        if (this.DataViz) this.DataViz.mostraNotifica("📡 Segnale Live stabilito!", "success");
                    }

                    this.teamA = payload.teamA;
                    this.teamB = payload.teamB;
                    this.partitaTerminata = payload.partitaTerminata;   
                    
                    //Variabile per gestire lo stato di interruzione
                    this.partitaInterrotta = payload.partitaInterrotta; 
                    
                    this.periodo = payload.periodo;     
                    if (payload.timer && this.$refs.timerRef) {
                        this.$refs.timerRef.impostaDatiEsterni(
                            payload.timer.tempoResiduo, 
                            payload.timer.inEsecuzione
                        );
                    }
                }
            });

            // --- NUOVO: INTERCETTA IL SEGNALE DI INTERRUZIONE DAL SERVER ---
            this.socket.on('partita_interrotta_live', () => {
                if (this.ruolo === 'utente' || this.ruolo === 'viewer') {
                    this.partitaInterrotta = true;
                    if (this.DataViz) this.DataViz.mostraNotifica("🛑 L'admin ha interrotto la partita.", "warning");
                }
            });

            this.socket.on('nuovo_spettatore', () => {
                if (this.ruolo === 'admin') {
                    this.trasmettiDatiLive();
                }
            });
        }
    },
    methods: {
        // --- FUNZIONI DI NAVIGAZIONE E SALVATAGGIO  ---
        apriBoxScore() {
            this.currentView = 'boxscore';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        
        tornaAlCampo() {
            this.currentView = 'court';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        // Apre il file XML appena generato in una nuova scheda.
        stampaRefertoUfficiale() {
            const urlReferto = `/referti/referto_${this.idPartitaCorrente}.xml`;
            window.open(urlReferto, '_blank');
        },

        chiediConfermaSalvataggio() {
            this.mostraPopupSalvataggio = true;
            if (this.$refs.timerRef && this.$refs.timerRef.timerRunning) {
                this.$refs.timerRef.toggleTimer(); 
            }
        },

        async confermaESalva() {
            this.mostraPopupSalvataggio = false;
            this.partitaTerminata = true;
            if (this.$refs.timerRef) {
                this.$refs.timerRef.timerRunning = false;
                clearInterval(this.$refs.timerRef.interval);
            }
            if (this.trasmettiDatiLive) this.trasmettiDatiLive();

            const payload = {
                id: this.idPartitaCorrente,
                data: new Date().toISOString(),
                squadraCasa: this.teamA,
                squadraOspite: this.teamB,
                punteggioCasa: this.punteggioCasa,
                punteggioOspite: this.punteggioOspite
            };

            try {
                const risposta = await api.salva(payload);
                if (risposta) {
                    await this.aggiornaListaReferti();
                    this.apriBoxScore();
                }
            } catch (error) {
                console.error("Errore salvataggio:", error);
                if (this.DataViz) this.DataViz.mostraNotifica("❌ Errore tecnico.", "error");
            }
        },

        //CONTROLLA AVANZAMENTO QUARTI E OVERTIME
        avanzaPeriodo() {
            if (this.periodo >= 4) {
                // Fine del 4° quarto: controllo se sono in pareggio
                if (this.punteggioCasa === this.punteggioOspite) {
                    this.periodo++;
                    if (this.DataViz) this.DataViz.mostraNotifica("🏀 Parità! Si va all'OVERTIME (5 Minuti)!", "warning");
                } else {
                    if (this.DataViz) this.DataViz.mostraNotifica("🏆 Partita conclusa! Ora puoi premere Salva Partita.", "success");
                }
            } else {
                // Quarti normali
                this.periodo++;
                if (this.DataViz) this.DataViz.mostraNotifica(`Inizia il Quarto ${this.periodo}`, "info");
            }
            this.trasmettiDatiLive();
        },        

        async aggiornaListaReferti() {
            try {
                const files = await api.getListaReferti();
                this.listaReferti = files || [];
            } catch (error) {
                console.error("Errore lista referti:", error);
            }
        },

        // --- FUNZIONI DI GESTIONE PARTITA E INTERAZIONE REINSERITE ---
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
        // --------------------------------------------------------

        caricaTestNBA() {
            this.teamA.nome = "Los Angeles Lakers";
            const rosterLakers = [
                { nome: "L. James", num: "23" }, { nome: "A. Davis", num: "3" }, 
                { nome: "A. Reaves", num: "15" }, { nome: "D. Russell", num: "1" }, 
                { nome: "R. Hachimura", num: "28" },
                { nome: "J. Vanderbilt", num: "2" }, { nome: "C. Wood", num: "35" }, 
                { nome: "G. Vincent", num: "7" }, { nome: "J. Hayes", num: "11" }, 
                { nome: "C. Reddish", num: "5" }
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
                { nome: "K. Looney", num: "5" },
                { nome: "C. Paul", num: "3" }, { nome: "J. Kuminga", num: "0" }, 
                { nome: "M. Moody", num: "4" }, { nome: "D. Saric", num: "20" }, 
                { nome: "G. Payton II", num: "00" }
            ];

            rosterWarriors.forEach((giocatore, i) => {
                this.teamB.giocatori[i].nome = giocatore.nome;
                this.teamB.giocatori[i].numero = giocatore.num;
                this.teamB.giocatori[i].inCampo = i < 5;
            });

            if (typeof DataViz !== 'undefined') {
                DataViz.mostraNotifica("🏀 Roster NBA completi caricati!", "success");
            }
        },

        getEmptyTeam(nome, idPrefix, posSuffix) {
            return generaSquadraVuota(nome, idPrefix, posSuffix);
        },

        caricaPartitaDaDB(partita) {
            this.ruolo = 'viewer';
            this.currentView = 'court';
            this.partitaTerminata = true;
            this.partitaInterrotta = false; // Sicurezza nel caso arrivasse da una vista sporca

            // 1. Genera le squadre con la struttura grafica, coordinate e classi CSS intatte
            this.teamA = this.getEmptyTeam(partita.info.squadra_casa, "A", "a");
            this.teamB = this.getEmptyTeam(partita.info.squadra_ospite, "B", "b");

            // 2. Filtra i giocatori estratti dal database per le rispettive squadre
            const dbGiocatoriA = partita.giocatori.filter(g => g.squadra === partita.info.squadra_casa);
            const dbGiocatoriB = partita.giocatori.filter(g => g.squadra === partita.info.squadra_ospite);

            // 3. Travasa i dettagli statistici senza sovrascrivere o rompere le proprietà grafiche di Vue
            dbGiocatoriA.forEach((dbPlayer, index) => {
                if (index < 10) { // Limite massimo dei 10 slot disponibili per il roster
                    this.teamA.giocatori[index].nome = dbPlayer.nome;
                    this.teamA.giocatori[index].numero = dbPlayer.numero;
                    this.teamA.giocatori[index].punti = dbPlayer.punti;
                    this.teamA.giocatori[index].falli = dbPlayer.falli;
                    this.teamA.giocatori[index].rimbalzi = dbPlayer.rimbalzi;
                    this.teamA.giocatori[index].assist = dbPlayer.assist;
                    this.teamA.giocatori[index].rubate = dbPlayer.rubate;
                    this.teamA.giocatori[index].stoppate = dbPlayer.stoppate;
                    this.teamA.giocatori[index].perse = dbPlayer.perse;
                    this.teamA.giocatori[index].inCampo = index < 5; // Schiera i primi 5 sul campo, gli altri in panchina
                }
            });

            dbGiocatoriB.forEach((dbPlayer, index) => {
                if (index < 10) {
                    this.teamB.giocatori[index].nome = dbPlayer.nome;
                    this.teamB.giocatori[index].numero = dbPlayer.numero;
                    this.teamB.giocatori[index].punti = dbPlayer.punti;
                    this.teamB.giocatori[index].falli = dbPlayer.falli;
                    this.teamB.giocatori[index].rimbalzi = dbPlayer.rimbalzi;
                    this.teamB.giocatori[index].assist = dbPlayer.assist;
                    this.teamB.giocatori[index].rubate = dbPlayer.rubate;
                    this.teamB.giocatori[index].stoppate = dbPlayer.stoppate;
                    this.teamB.giocatori[index].perse = dbPlayer.perse;
                    this.teamB.giocatori[index].inCampo = index < 5;
                }
            });
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
            // 1. Estrae solo i giocatori che hanno un nome e un numero di maglia compilati
            const getValidi = (team) => team.giocatori.filter(p => p.nome.trim() !== '' && p.numero !== '');
            const vA = getValidi(this.teamA);
            const vB = getValidi(this.teamB);

            // 2. Controllo numero minimo (5 per squadra)
            if (vA.length < 5 || vB.length < 5) {
                if (this.DataViz) this.DataViz.mostraNotifica("⚠️ Almeno 5 giocatori con nome e numero per squadra!", "warning");
                return; // Ferma l'esecuzione della funzione
            }

            // 3. Controllo numeri duplicati
            const hasDup = (list) => new Set(list.map(g => g.numero.toString())).size !== list.length;
            if (hasDup(vA) || hasDup(vB)) {
                if (this.DataViz) this.DataViz.mostraNotifica("⚠️ Numeri duplicati rilevati nella stessa squadra!", "error");
                return; // Ferma l'esecuzione della funzione
            }

            // --- SE SUPERA TUTTI I CONTROLLI, LA PARTITA VIENE CREATA ---
            
            // Assegnazione nomi e loghi
            this.teamA.nome = this.squadraCasaSelezionata ? this.squadraCasaSelezionata.nome : this.teamA.nome;
            this.teamB.nome = this.squadraOspiteSelezionata ? this.squadraOspiteSelezionata.nome : this.teamB.nome;
            this.teamA.logo = this.squadraCasaSelezionata ? this.squadraCasaSelezionata.logo : null;
            this.teamB.logo = this.squadraOspiteSelezionata ? this.squadraOspiteSelezionata.logo : null;

            // Generazione automatica ID progressivo
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
            } catch(e) {
                console.error("Errore nel recupero ID", e);
            }

            // Imposta lo stato della partita e cambia vista
            this.idPartitaCorrente = nextId.toString().padStart(4, '0');
            this.ruolo = 'admin';
            this.periodo = 1; // Assicura che il periodo parta da 1
            this.currentView = 'court';

            // Attiva la trasmissione Live
            if (this.socket) {
                this.socket.emit('entra_partita', this.idPartitaCorrente);
                this.trasmettiDatiLive();
            }

            // --- NUOVO: Notifica di creazione partita avvenuta con successo ---
            if (this.DataViz) {
                this.DataViz.mostraNotifica(`🏀 Partita N° ${this.idPartitaCorrente} creata con successo!`, "success");
            }
        },

        // --- ACCESSO A PARTITA (LIVE O ARCHIVIO) ---
        async accediPartitaConCodice() {
            if (this.codicePartitaInput.trim() === '') {
                if (this.DataViz) this.DataViz.mostraNotifica("⚠️ Inserisci un codice!", "warning");
                return;
            }
            const idCercato = this.codicePartitaInput.padStart(4, '0');
            this.idPartitaCorrente = idCercato;

            try {
                const partitaDB = await api.ottieniPartita(idCercato);
                
                if (partitaDB && partitaDB.info) {
                    // ==========================================
                    // SE LA PARTITA E' CONCLUSA E IN ARCHIVIO
                    // ==========================================
                    this.ruolo = 'viewer';
                    this.currentView = 'court';
                    this.partitaTerminata = true;
                    this.partitaInterrotta = false;

                    // 1. Genera squadre con grafica e coordinate intatte
                    this.teamA = this.getEmptyTeam(partitaDB.info.squadra_casa, "A", "a");
                    this.teamB = this.getEmptyTeam(partitaDB.info.squadra_ospite, "B", "b");

                    // 2. Estrae i giocatori dal database
                    const dbGiocatoriA = partitaDB.giocatori.filter(g => g.squadra === partitaDB.info.squadra_casa);
                    const dbGiocatoriB = partitaDB.giocatori.filter(g => g.squadra === partitaDB.info.squadra_ospite);

                    // 3. Travasa i dati statistici senza rompere la grafica
                    dbGiocatoriA.forEach((dbPlayer, index) => {
                        if (index < 10) { // Max 10 giocatori per team
                            this.teamA.giocatori[index].nome = dbPlayer.nome;
                            this.teamA.giocatori[index].numero = dbPlayer.numero;
                            this.teamA.giocatori[index].punti = dbPlayer.punti;
                            this.teamA.giocatori[index].falli = dbPlayer.falli;
                            this.teamA.giocatori[index].rimbalzi = dbPlayer.rimbalzi;
                            this.teamA.giocatori[index].assist = dbPlayer.assist;
                            this.teamA.giocatori[index].rubate = dbPlayer.rubate;
                            this.teamA.giocatori[index].stoppate = dbPlayer.stoppate;
                            this.teamA.giocatori[index].perse = dbPlayer.perse;
                            this.teamA.giocatori[index].inCampo = index < 5; // I primi 5 appaiono in campo, gli altri in panca
                        }
                    });

                    dbGiocatoriB.forEach((dbPlayer, index) => {
                        if (index < 10) {
                            this.teamB.giocatori[index].nome = dbPlayer.nome;
                            this.teamB.giocatori[index].numero = dbPlayer.numero;
                            this.teamB.giocatori[index].punti = dbPlayer.punti;
                            this.teamB.giocatori[index].falli = dbPlayer.falli;
                            this.teamB.giocatori[index].rimbalzi = dbPlayer.rimbalzi;
                            this.teamB.giocatori[index].assist = dbPlayer.assist;
                            this.teamB.giocatori[index].rubate = dbPlayer.rubate;
                            this.teamB.giocatori[index].stoppate = dbPlayer.stoppate;
                            this.teamB.giocatori[index].perse = dbPlayer.perse;
                            this.teamB.giocatori[index].inCampo = index < 5;
                        }
                    });
                    
                    if (typeof DataViz !== 'undefined') DataViz.mostraNotifica("📂 Partita recuperata dall'archivio.", "success");
                    
                } else {
                    // ==========================================
                    // SE LA PARTITA NON E' NEL DB (Cerca il LIVE)
                    // ==========================================
                    this.ruolo = 'viewer';
                    this.partitaTerminata = false;
                    
                    if (this.socket) {
                        this.socket.emit('entra_partita', idCercato);
                        if (typeof DataViz !== 'undefined') DataViz.mostraNotifica("⏳ Ricerca segnale Live in corso...", "info");
                        
                        if (this.attesaLiveTimeout) clearTimeout(this.attesaLiveTimeout);
                        this.attesaLiveTimeout = setTimeout(() => {
                            if (this.currentView !== 'court') {
                                if (typeof DataViz !== 'undefined') DataViz.mostraNotifica("❌ Partita non in diretta o codice errato.", "error");
                                this.idPartitaCorrente = '0000'; 
                                
                                if (this.username.toLowerCase() === 'admin') {
                                    this.ruolo = 'admin';
                                } else {
                                    this.ruolo = 'utente';
                                }
                            }
                        }, 3000);
                    }
                }
            } catch (e) {
                if (typeof DataViz !== 'undefined') DataViz.mostraNotifica("⚠️ Errore di connessione al database.", "error");
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

                const payload = {
                    teamA: this.teamA,
                    teamB: this.teamB,
                    partitaTerminata: this.partitaTerminata,
                    partitaInterrotta: this.partitaInterrotta, 
                    periodo: this.periodo,
                    timer: datiTimer 
                };

                this.socket.emit('aggiornamento_admin', {
                    idPartita: this.idPartitaCorrente,
                    payload: payload
                });
            }
        },

        async apriArchivio() {
            this.listaReferti = await api.getListaReferti();
            this.currentView = 'history';
            setTimeout(() => { 
                if (typeof DataViz !== 'undefined') DataViz.caricaArchivio(); 
            }, 100); 
        },

        async apriLeaderboard() {
            try {
                // Chiamata all'api in classifica.js
                const response = await fetch('/api/classifica');
                const data = await response.json();
                
                // Salviamo le statistiche delle squadre nelle nuove variabili Vue
                this.classificaSquadre = data.standings;
                
                // Cambiamo schermata e impostiamo la vista di default sulla tabella
                this.currentView = 'leaderboard';
                this.leaderboardView = 'teams'; 
                
                // Aspettiamo che Vue renderizzi il canvas, poi disegniamo il grafico
                setTimeout(() => {
                    if (typeof DataViz !== 'undefined') {
                        // Al grafico passiamo SOLO la parte dei marcatori
                        DataViz.renderTopScorersChart(data.topScorers);
                        DataViz.mostraNotifica("Dati aggregati caricati con successo!", "success");
                    }
                }, 100);
                
            } catch (error) {
                console.error("Errore caricamento classifica:", error);
                if (typeof DataViz !== 'undefined') DataViz.mostraNotifica("Errore di connessione al database.", "error");
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
            
            // 1. CONTROLLO: SE STA USCENDO DA UNA PARTITA IN CORSO E NON SALVATA -> INTERROMPI
            if (this.socket && this.ruolo === 'admin' && this.currentView === 'court' && !this.partitaTerminata) {
                
                // Attiva lo stato "Interrotta"
                this.partitaInterrotta = true;
                
                // Congela il tempo dell'orologio prima di trasmettere i dati
                if (this.$refs.timerRef) {
                    this.$refs.timerRef.timerRunning = false;
                    clearInterval(this.$refs.timerRef.interval);
                }

                // Avvisa gli spettatori inviando il fotogramma congelato
                this.socket.emit('interrompi_partita', this.idPartitaCorrente);
                this.trasmettiDatiLive();
            }

            // 2. PULIZIA DEL SISTEMA (Ora possiamo resettare tutto in sicurezza)
            if (this.$refs.timerRef) {
                this.$refs.timerRef.timerRunning = false;
                clearInterval(this.$refs.timerRef.interval);
                this.$refs.timerRef.timer = 600; // Reset a 10:00 sicuro
            }

            this.currentView = 'login'; 
            this.password = ''; 
            this.ruolo = null;
            this.username = '';

            // Svuotiamo tutta la memoria residua
            this.codicePartitaInput = '';
            this.partitaTerminata = false;
            this.partitaInterrotta = false; // Pronto per un nuovo accesso
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
            if (this.currentView === 'court' || this.currentView === 'setup') {
                this.mostraPopupHome = true;
            } else {
                this.eseguiBackhome();
            }
        },
        
        eseguiBackhome() {
            this.mostraPopupHome = false;
            
            // 1. CONTROLLO DI SICUREZZA: SE LA PARTITA NON È STATA SALVATA, ALLORA È INTERROTTA
            if (this.socket && this.ruolo === 'admin' && this.currentView === 'court' && !this.partitaTerminata) {
                
                // Attiviamo lo stato di interruzione (come avevi giustamente suggerito!)
                this.partitaInterrotta = true; 
                
                // Congealiamo il tempo attuale dell'orologio (SENZA azzerarlo a 600 ancora!)
                if (this.$refs.timerRef) {
                    this.$refs.timerRef.timerRunning = false;
                    clearInterval(this.$refs.timerRef.interval);
                }

                // Avvisa il server e spara l'ultimo fotogramma col tempo reale congelato
                this.socket.emit('interrompi_partita', this.idPartitaCorrente);
                this.trasmettiDatiLive();
            }

            // 2. ORA CHE I DATI CORRETTI SONO STATI INVIATI, POSSIAMO PULIRE IL FRONTEND
            this.currentView = 'home'; 
            this.codicePartitaInput = '';
            
            // Adesso è sicuro riportare l'orologio a 10:00 (600s) per la prossima partita
            if (this.$refs.timerRef) {
                this.$refs.timerRef.timer = 600; 
            }

            // 3. AZZERIAMO I DATI IN MEMORIA ("Stato Sporco")
            this.idPartitaCorrente = '0000';
            this.partitaTerminata = false;
            this.partitaInterrotta = false; // Ritona false, pronto per una nuova gara pulita
            this.periodo = 1;
            this.squadraCasaSelezionata = null;
            this.squadraOspiteSelezionata = null;
            this.giocatoreAttivo = null;
            this.panchinaroSelezionato = null;
            
            // Svuota i roster
            this.teamA = this.getEmptyTeam("", "A", "a");
            this.teamB = this.getEmptyTeam("", "B", "b");

            // 4. RIPRISTINIAMO IL RUOLO ORIGINALE ALLA HOME
            if (this.username.toLowerCase() === 'admin') {
                this.ruolo = 'admin';
            } else if (this.username.toLowerCase() === 'utente') {
                this.ruolo = 'utente';
            }
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
                
                const abbreviazioni = {
                    punti: 'PTS', rimbalzi: 'REB', assist: 'AST', rubate: 'STL', 
                    stoppate: 'BLK', perse: 'TOV', falli: 'FLS'
                };
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

        mostraMessaggio(testo) {
            this.messaggioAvviso = testo;
            this.mostraPopupAvviso = true;
        },
        chiudiPopupAvviso() {
            this.mostraPopupAvviso = false;
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
        },
        rimuoviStat(tipo, val) {
            if (this.partitaTerminata) return;
            
            if (this.giocatoreAttivo) {
                this.giocatoreAttivo[tipo] -= val;
                
                if (tipo === 'falli' && this.giocatoreAttivo.falli >= 5) {
                    this.mostraMessaggio(`Il giocatore numero ${this.giocatoreAttivo.numero} è uscito per 5 falli!`);
                }

                const abbreviazioni = {
                    punti: 'PTS', rimbalzi: 'REB', assist: 'AST', rubate: 'STL', 
                    stoppate: 'BLK', perse: 'TOV', falli: 'FLS'
                };
                const sigla = abbreviazioni[tipo] || tipo.toUpperCase();
                const playerToAnimate = this.giocatoreAttivo;
                
                playerToAnimate.popupMsg = `-${val} ${sigla}`;
                playerToAnimate.isNegativo = true; 
                playerToAnimate.showPopup = true;

                setTimeout(() => { playerToAnimate.showPopup = false; }, 1200);
                this.giocatoreAttivo = null;
            }
        }
    }
});

app.component('game-timer', Timer);
app.component('score-board', Scoreboard);
app.mount('#app');