import Timer from '../src/components/Timer.js';
import Scoreboard from '../src/components/Scoreboard.js';
import LandingPage from '../src/components/LandingPage.js'; 
import LoginForm from '../src/components/LoginForm.js';
import LeaderboardView from '../src/components/LeaderboardView.js';
import HomeView from '../src/components/HomeView.js';
import HistoryView from '../src/components/HistoryView.js';
import SetupView from '../src/components/SetupView.js';
import BoxScoreView from '../src/components/BoxScoreView.js';
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
            ruolo: null,
            username:'',
            password:'',
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
        // FUNZIONI DI NAVIGAZIONE E SALVATAGGIO
        // =========================================

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
                    assist: p.assist, rubate: p.rubate, stoppate: p.stoppate, perse: p.perse
                }))
            };

            try {
                const risultato = await api.salva(payload);
                if (risultato.success) {
                    
                    this.partitaTerminata = true; 
                    this.trasmettiDatiLive(); 

                    this.mostraNotifica(`🏆 Partita Archiviata!<br><small>${risultato.message}</small>`, "success");
                    
                    // ❌ CANCELLATA LA REGOLA DA QUI: await this.aggiornaListaReferti();
                    
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

        // =========================================
        //  FUNZIONI DI GESTIONE PARTITA E LOGICHE
        // =========================================


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

        effettuaLogin(credenziali) {
            const user = credenziali.username.toLowerCase();
            const pass = credenziali.password;

            if (user === 'admin' && pass === '1234') {
                this.ruolo = 'admin';
                this.username = user; // Salviamo lo user globale
                this.erroreLogin = false;
                this.currentView = 'home';
            } 
            else if (user === 'utente' && pass === '0000') {
                this.ruolo = 'utente';
                this.username = user; // Salviamo lo user globale
                this.erroreLogin = false;
                this.currentView = 'home';
            } 
            else {
                this.erroreLogin = true;
            }
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