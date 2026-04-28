import Timer from '../src/components/Timer.js';
import Scoreboard from '../src/components/Scoreboard.js';

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            currentView: 'login',
            password: '',
            erroreLogin: false,
            giocatoreAttivo: null,
            panchinaroSelezionato: null,
            
            teamA: {
                nome: "",
                giocatori: Array.from({ length: 10 }, (_, i) => ({
                    id: 'A' + i,
                    nome: '', 
                    numero: '',
                    inCampo: i < 5,
                    punti: 0, rimbalzi: 0, assist: 0, rubate: 0, stoppate: 0, perse: 0, falli: 0, plsm: 0,
                    posClass: 'p' + (i + 1) + 'a'
                }))
            },
            teamB: {
                nome: "",
                giocatori: Array.from({ length: 10 }, (_, i) => ({
                    id: 'B' + i,
                    nome: '', 
                    numero: '',
                    inCampo: i < 5, 
                    punti: 0, rimbalzi: 0, assist: 0, rubate: 0, stoppate: 0, perse: 0, falli: 0, plsm: 0,
                    posClass: 'p' + (i + 1) + 'b'
                }))
            }
        }
    },
    computed: {
        punteggioTotale() {
            return this.teamA.giocatori.reduce((sum, p) => sum + p.punti, 0);
        },
        punteggioTotaleB() {
            return this.teamB.giocatori.reduce((sum, p) => sum + p.punti, 0);
        }
    },
    methods: {
        effettuaLogin() {
            if (this.password === '1') {
                this.currentView = 'home';
                this.erroreLogin = false;
            } else { 
                this.erroreLogin = true; 
            }
        },
        iniziaPartita() {
            const casaOk = this.teamA.giocatori.some(p => p.nome.trim() !== '');
            const ospitiOk = this.teamB.giocatori.some(p => p.nome.trim() !== '');

            if (casaOk || ospitiOk) {
                this.currentView = 'court';
            } else { 
                alert("Inserisci almeno un giocatore per iniziare la partita!"); 
            }
        },
        selezionaGiocatore(p) { 
            this.giocatoreAttivo = p; 
        },
        gestisciClickGiocatore(p) {
            if (!p.inCampo) {
                if (this.panchinaroSelezionato === p) {
                    this.panchinaroSelezionato = null;
                } else {
                    this.panchinaroSelezionato = p;
                }
                return;
            }
            if (p.inCampo && this.panchinaroSelezionato) {
                if (p.id.charAt(0) !== this.panchinaroSelezionato.id.charAt(0)) {
                    this.panchinaroSelezionato = null;
                    return;
                }
                p.inCampo = false;
                this.panchinaroSelezionato.inCampo = true;

                const tempPos = p.posClass;
                p.posClass = this.panchinaroSelezionato.posClass;
                this.panchinaroSelezionato.posClass = tempPos;

                this.panchinaroSelezionato = null;
                return;
            }
            this.selezionaGiocatore(p);
        },
        aggiungiStat(tipo, val) {
            this.giocatoreAttivo[tipo] += val;
            this.giocatoreAttivo = null;
        },
        rimuoviStat(tipo, val) {
            this.giocatoreAttivo[tipo] -= val;
            this.giocatoreAttivo = null;
        },
        backhome() { 
            this.currentView = 'home'; 
            this.password = ''; 
        },
        logout() {
             this.currentView = 'login'; 
             this.password = ''; 
        }
    }
});

// Registrazione Componenti
app.component('game-timer', Timer);
app.component('score-board', Scoreboard);

app.mount('#app');