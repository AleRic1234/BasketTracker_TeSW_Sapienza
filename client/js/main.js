import Timer from '../src/components/Timer.js';
import Scoreboard from '../src/components/Scoreboard.js';
import LandingPage from '../src/components/LandingPage.js'; 
import LoginForm from '../src/components/LoginForm.js';
import LeaderboardView from '../src/components/LeaderboardView.js';
import HomeView from '../src/components/HomeView.js';
import HistoryView from '../src/components/HistoryView.js';
import SetupView from '../src/components/SetupView.js';
import BoxScoreView from '../src/components/BoxScoreView.js';
import courtLogic from '../src/mixins/courtLogic.js';
import authLogic from '../src/mixins/authLogic.js';
import api from './api.js';

const { createApp } = Vue;

const app = createApp({
    mixins: [courtLogic, authLogic],
    data() {
        return {
            
            // Variabili Di Stato

            currentView: 'landing',
            ruolo: null,
            username:'',
            password:'',
            erroreLogin: false,
            tokenAdmin: '',
            mostraInputCodice: false,
            codicePartitaInput: '',
            idRicerca: '',
            idPartitaCorrente: '0000',
            socket: null,
            partitaTerminata: false,
            partitaInterrotta: false,
            mostraPopupInizioPartita: false,
            fischioInizioMostrato: false,
            //Risoluzione bug presentazione (fischio di fine partita mostrato agli spettatori più volete)
            fischioFineMostrato: false,
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
            mostraPopupRefertoDisponibile: false,
            
            notifiche: [], //Contenitore per le notifiche toast
            
            giocatoreAttivo: null,
            panchinaroSelezionato: null,
        
            // Inizializza con un oggetto vuoto
            teamA: { nome: "", giocatori: [] }, 
            teamB: { nome: "", giocatori: [] }  
        }
    },
    computed: {

        punteggioCasa() { return this.teamA.giocatori.reduce((sum, p) => sum + (p.punti || 0), 0); },
        punteggioOspite() { return this.teamB.giocatori.reduce((sum, p) => sum + (p.punti || 0), 0); },

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
            return this.teamA.giocatori.filter(p => p.nome && p.nome.trim() !== '');
        },

        giocatoriValidiB() {
            return this.teamB.giocatori.filter(p => p.nome && p.nome.trim() !== '');
        },

        giocatoreMVP() {
            if (!this.partitaTerminata) return null;
            const tuttiGiocatori = [...this.teamA.giocatori, ...this.teamB.giocatori].filter(g => g.nome && g.nome.trim() !== '');
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
        
        // Inizzializziamo Le Squadre (Funzione in mixins/courtLogic.js)
        
        this.teamA = this.getEmptyTeam("", "A", "a");
        this.teamB = this.getEmptyTeam("", "B", "b");

        // RICEZIONE DATI LIVE

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
                        !this.fischioFineMostrato && !payload.partitaTerminata) { 
                        
                        //Mostra il pop up di fine partita solo se non è già stato mostrato e se la partita non è terminata (per evitare che venga mostrato più volte agli spettatori)
                        this.fischioFineMostrato = true;
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

            this.socket.on('referto_pronto', (idPartitaRiferimento) => {
                // Se chi riceve non è l'admin e sta guardando proprio questa partita...
                if (this.ruolo !== 'admin' && this.idPartitaCorrente === idPartitaRiferimento) {
                    this.mostraPopupRefertoDisponibile = true;
                    setTimeout(() => {
                        this.mostraPopupRefertoDisponibile = false;
                    }, 3000);
                }
            });
        }
    },

    methods: {
        
        // SISTEMA UI VUE NATIVO E NOTIFICHE
        
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
        
        
        // FUNZIONI DI NAVIGAZIONE E SALVATAGGIO
       
        apriBoxScore() {
            this.currentView = 'boxscore';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        
        tornaAlCampo() {
            this.currentView = 'court';
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
                
                punteggioCasa: this.punteggioCasa,
                punteggioOspite: this.punteggioOspite,
                
                giocatori: listaGiocatori.map(p => ({
                    nome: p.nome,
                    numero: p.numero,
                    squadra: p.posClass.includes('a') ? (this.teamA.nome || 'Casa') : (this.teamB.nome || 'Ospite'),
                    punti: p.punti, falli: p.falli, rimbalzi: p.rimbalzi,
                    assist: p.assist, rubate: p.rubate, stoppate: p.stoppate, perse: p.perse, plsm: p.plsm, inCampo: p.inCampo ? 1 : 0
                }))
            };

            try {
                const risultato = await api.salva(payload, this.tokenAdmin);
                if (risultato.success) {
                    
                    this.partitaTerminata = true; 
                    this.trasmettiDatiLive(); 
                    
                    if (this.socket) {
                        this.socket.emit('partita_salvata', this.idPartitaCorrente);
                    }

                    this.mostraNotifica(`🏆 Partita Archiviata!<br><small>${risultato.message}</small>`, "success");
                    
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

        async apriArchivio() {
            this.currentView = 'history';
        },

        apriLeaderboard() {
            this.currentView = 'leaderboard';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        async iniziaPartita() {
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

        async accediPartitaConCodice(codice) {
            const codiceDaUsare = codice || this.codicePartitaInput;

            if (!codiceDaUsare || codiceDaUsare.trim() === '') {
                this.mostraNotifica("⚠️ Inserisci un codice!", "warning");
                return;
            }
            const idCercato = codiceDaUsare.padStart(4, '0');
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
                    
                    dbGiocatoriA.sort((a, b) => b.in_campo - a.in_campo);
                    dbGiocatoriB.sort((a, b) => b.in_campo - a.in_campo);

                    dbGiocatoriA.forEach((dbPlayer, index) => {
                        if (index < 10) { 
                            this.teamA.giocatori[index] = { 
                                ...this.teamA.giocatori[index], 
                                ...dbPlayer, 
                                minuti: parseInt(dbPlayer.minuti, 10) || 0,
                                plsm: parseInt(dbPlayer.plsm, 10) || 0, 
                                inCampo: index < 5 
                            };
                        }
                    });

                    dbGiocatoriB.forEach((dbPlayer, index) => {
                        if (index < 10) {
                            this.teamB.giocatori[index] = { 
                                ...this.teamB.giocatori[index], 
                                ...dbPlayer, 
                                minuti: parseInt(dbPlayer.minuti, 10) || 0,
                                plsm: parseInt(dbPlayer.plsm, 10) || 0, 
                                inCampo: index < 5 
                            };
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
                    token: this.tokenAdmin,
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
            this.fischioFineMostrato = false;     // Reset variabile per bug fischio fine partita
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
        }

    }
});

app.component('game-timer', Timer);
app.component('score-board', Scoreboard);
app.component('landing-page', LandingPage);
app.component('login-form', LoginForm);
app.component('leaderboard-view', LeaderboardView);
app.component('home-view', HomeView);
app.component('history-view', HistoryView);
app.component('setup-view', SetupView);
app.component('boxscore-view', BoxScoreView);
app.mount('#app');