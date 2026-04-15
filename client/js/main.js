const { createApp } = Vue;

createApp({
    data() {
        return {
            currentView: 'login',
            password: '',
            erroreLogin: false,
            timer: 600,
            timerRunning: false,
            interval: null,
            giocatoreAttivo: null,
            teamA: {
                nome: "Squadra Casa",
                giocatori: Array.from({ length: 5 }, (_, i) => ({
                    id: i, nome: '', numero: '', punti: 0, posClass: 'p' + (i + 1) + 'a'
                }))
            }
        }
    },
    computed: {
        punteggioTotale() {
            return this.teamA.giocatori.reduce((sum, p) => sum + p.punti, 0);
        }
    },
    methods: {
        effettuaLogin() {
            if (this.password === 'coach123') {
                this.currentView = 'setup';
                this.erroreLogin = false;
            } else { this.erroreLogin = true; }
        },
        iniziaPartita() {
            if (this.teamA.giocatori.some(p => p.nome.trim() !== '')) {
                this.currentView = 'court';
            } else { alert("Inserisci almeno un giocatore!"); }
        },
        selezionaGiocatore(p) { this.giocatoreAttivo = p; },
        aggiungiStat(tipo, val) {
            this.giocatoreAttivo[tipo] += val;
            this.giocatoreAttivo = null;
        },
        toggleTimer() {
            if (this.timerRunning) { clearInterval(this.interval); }
            else { this.interval = setInterval(() => { if (this.timer > 0) this.timer--; }, 1000); }
            this.timerRunning = !this.timerRunning;
        },
        formatTime(s) {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${m}:${sec < 10 ? '0' : ''}${sec}`;
        },
        logout() { this.currentView = 'login'; this.password = ''; }
    }
}).mount('#app');