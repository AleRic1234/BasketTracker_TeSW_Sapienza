import Timer from '../src/components/Timer.js';
import Scoreboard from '../src/components/Scoreboard.js';
import api from './api.js';

const { createApp } = Vue;

// 1. SPOSTIAMO LA FUNZIONE QUI FUORI! Così Vue non andrà MAI PIÙ in crash all'avvio
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
            mostraPopupHome: false,
            mostraPopupSalvataggio: false,
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
        punteggioOspite() { return this.teamB.giocatori.reduce((sum, p) => sum + p.punti, 0); }
    },
    mounted() {
        this.aggiornaListaReferti();
        
        if (typeof io !== 'undefined') {
            this.socket = io('http://localhost:3000');
            
            this.socket.on('dati_live', (payload) => {
                if (this.ruolo === 'utente' || this.ruolo === 'viewer') {
                    this.teamA = payload.teamA;
                    this.teamB = payload.teamB;
                    this.partitaTerminata = payload.partitaTerminata;        
                    if (payload.timer && this.$refs.timerRef) {
                        this.$refs.timerRef.impostaDatiEsterni(
                            payload.timer.tempoResiduo, 
                            payload.timer.inEsecuzione
                        );
                    }
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
        // --- FUNZIONI DI NAVIGAZIONE E SALVATAGGIO REINSERITE ---
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

        async aggiornaListaReferti() {
            try {
                const files = await api.getListaReferti();
                this.listaReferti = files || [];
            } catch (error) {
                console.error("Errore lista referti:", error);
            }
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
                DataViz.mostraNotifica("🏀 Roster NBA completi caricati!");
            }
        },

        getEmptyTeam(nome, idPrefix, posSuffix) {
            return generaSquadraVuota(nome, idPrefix, posSuffix);
        },

        caricaPartitaDaDB(partita) {
            this.ruolo = 'viewer';
            this.currentView = 'court';
            this.partitaTerminata = true;
            this.teamA.nome = partita.info.squadra_casa;
            this.teamB.nome = partita.info.squadra_ospite;
            this.teamA.giocatori = partita.tabellino.filter(g => g.squadra === partita.info.squadra_casa);
            this.teamB.giocatori = partita.tabellino.filter(g => g.squadra === partita.info.squadra_ospite);
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
            const casaOk = this.teamA.giocatori.some(p => p.nome.trim() !== '');
            const ospitiOk = this.teamB.giocatori.some(p => p.nome.trim() !== '');

            if (casaOk || ospitiOk) {
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
                } catch(e) {
                    console.error("Errore nel recupero ID", e);
                }

                this.idPartitaCorrente = nextId.toString().padStart(4, '0');
                this.ruolo = 'admin';
                this.currentView = 'court';

                if (this.socket) {
                    this.socket.emit('entra_partita', this.idPartitaCorrente);
                    this.trasmettiDatiLive();
                }
            } else { 
                alert("Inserisci almeno un giocatore per squadra!"); 
            }
        },

        async accediPartitaConCodice() {
            if (this.codicePartitaInput.trim() === '') {
                alert("Inserisci un codice!"); return;
            }
            const idCercato = this.codicePartitaInput.padStart(4, '0');
            this.idPartitaCorrente = idCercato;

            try {
                const partitaDB = await api.ottieniPartita(idCercato);
                if (partitaDB && partitaDB.info) {
                    this.ruolo = 'viewer';
                    this.currentView = 'court';
                    this.partitaTerminata = true; 
                    this.teamA.nome = partitaDB.info.squadra_casa;
                    this.teamB.nome = partitaDB.info.squadra_ospite;
                    this.teamA.giocatori = partitaDB.tabellino.filter(g => g.squadra === partitaDB.info.squadra_casa);
                    this.teamB.giocatori = partitaDB.tabellino.filter(g => g.squadra === partitaDB.info.squadra_ospite);
                    
                    if (typeof DataViz !== 'undefined') DataViz.mostraNotifica("Partita recuperata dall'archivio.");
                } else {
                    this.ruolo = 'viewer';
                    this.currentView = 'court';
                    this.partitaTerminata = false;
                    if (this.socket) {
                        this.socket.emit('entra_partita', idCercato);
                        if (typeof DataViz !== 'undefined') DataViz.mostraNotifica("In attesa di segnale Live...");
                    }
                }
            } catch (e) {
                alert("Errore di connessione al server.");
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

        logout() {
            this.currentView = 'login'; this.password = ''; this.ruolo = null; this.username = '';
            this.teamA = generaSquadraVuota("", "A", "a");
            this.teamB = generaSquadraVuota("", "B", "b");
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
            this.currentView = 'home'; 
            this.codicePartitaInput = '';
            this.teamA = generaSquadraVuota("", "A", "a");
            this.teamB = generaSquadraVuota("", "B", "b");
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