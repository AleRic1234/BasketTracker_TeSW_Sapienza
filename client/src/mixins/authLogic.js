// Percorso: client/src/mixins/authLogic.js
// Questo mixin gestisce la logica di autenticazione, login e logout, e il controllo degli accessi
export default {
    methods: {
        
        effettuaLogin(credenziali) {
            const user = credenziali.username.toLowerCase();
            const pass = credenziali.password;

            if (user === 'admin' && pass === '1234') {
                this.ruolo = 'admin';
                this.username = user; 
                this.tokenAdmin = "BasketTrackerSecret2026";
                this.erroreLogin = false;
                this.currentView = 'home';
            } 
            else if (user === 'utente' && pass === '0000') {
                this.ruolo = 'utente';
                this.username = user; 
                this.erroreLogin = false;
                this.currentView = 'home';
            } 
            else {
                this.erroreLogin = true;
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
        }
    }
};