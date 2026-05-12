import Timer from '../src/components/Timer.js';
import Scoreboard from '../src/components/Scoreboard.js';
import api from './api.js';

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            currentView: 'login', // 'login', 'home', 'court', 'history', 'setup', 'boxscore'
            ruolo: null,
            tabellinoAttivo: 'casa',
            username: '',
            password: '',
            storicoPartite: [],
            listaReferti: [],
            erroreLogin: false,
            codicePartitaInput: '',
            idRicerca: '',
            idPartitaCorrente: '0000',
            // Nuove variabili per il Live e lo Stato Partita
            socket: null,
            partitaTerminata: false,
           
            mostraPopupHome: false,

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
            
            teamA: this.getEmptyTeam("", "A", "a"),
            teamB: this.getEmptyTeam("", "B", "b")
        }
    },
    computed: {
        punteggioCasa() { return this.teamA.giocatori.reduce((sum, p) => sum + p.punti, 0); },
        punteggioOspite() { return this.teamB.giocatori.reduce((sum, p) => sum + p.punti, 0); }
    },
    mounted() {
       this.aggiornaListaReferti();
       
       // 1. Inizializza la connessione WebSocket
       if (typeof io !== 'undefined') {
           this.socket = io('https://basket-api-esame.loca.lt', {
                extraHeaders: {
                    "Bypass-Tunnel-Reminder": "true"
                }
            });
           
           // 2. Mettiti in ascolto dei dati live dall'admin
           this.socket.on('dati_live', (payload) => {
               if (this.ruolo === 'utente') {
                   // 1. Aggiorna i giocatori e i punti
                   this.teamA = payload.teamA;
                   this.teamB = payload.teamB;
                   
                   // 2. Sincronizza il timer dello spettatore
                   if (payload.timer && this.$refs.timerRef) {
                       // Chiamiamo il nuovo metodo del timer per aggiornarlo!
                       this.$refs.timerRef.impostaDatiEsterni(payload.timer.tempoResiduo, payload.timer.inEsecuzione);
                   }
               }
           });
       }
    },
    methods: {
        // Helper per generare un team vuoto
        getEmptyTeam(nome, idPrefix, posSuffix) {
            return {
                nome: nome,
                giocatori: Array.from({ length: 10 }, (_, i) => ({
                    id: idPrefix + i, nome: '', numero: '', inCampo: i < 5,
                    minuti: 0, punti: 0, rimbalzi: 0, assist: 0, rubate: 0, stoppate: 0, perse: 0, falli: 0, plsm: 0,
                    posClass: 'p' + (i + 1) + posSuffix
                }))
            };
        },

        effettuaLogin() {
        // Controllo Credenziali ADMIN
            if (this.username.toLowerCase() === 'admin' && this.password === '1234') {
                this.ruolo = 'admin';
                this.erroreLogin = false;
                this.currentView = 'home';
            } 
            // Controllo Credenziali UTENTE SEMPLICE
            else if (this.username.toLowerCase() === 'utente' && this.password === '0000') {
                this.ruolo = 'utente';
                this.erroreLogin = false;
                this.currentView = 'home'; // Va sempre alla home, ma vedrà meno bottoni grazie ai v-if
            } 
            // Credenziali Errate
            else {
                this.erroreLogin = true;
            }
        },

        // --- INIZIO PARTITA ADMIN (Entra nella stanza per trasmettere) ---
        iniziaPartita() {
            const casaOk = this.teamA.giocatori.some(p => p.nome.trim() !== '');
            const ospitiOk = this.teamB.giocatori.some(p => p.nome.trim() !== '');

            if (casaOk || ospitiOk) {
               // GENERA UN PIN CASUALE (es. LIVE-4921) PER LA STANZA WEBSOCKET
               const pinCasuale = Math.floor(1000 + Math.random() * 9000);
               this.idPartitaCorrente = "LIVE-" + pinCasuale; 
               
               this.ruolo = 'admin';
               this.partitaTerminata = false;
               this.currentView = 'court';

               // L'admin entra nella stanza sicura
               if (this.socket) this.socket.emit('entra_partita', this.idPartitaCorrente);
               
               // Aspettiamo un istante che Vue carichi il campo, poi trasmettiamo i nomi
               setTimeout(() => {
                   this.trasmettiDatiLive();
               }, 500);
            } else { alert("Inserisci almeno un giocatore!"); }
        },

        // --- NUOVI METODI PER LA GESTIONE RUOLI E ACCESSI ---

        // 1. Metodo per l'Utente (o l'Admin in modalità Spettatore)
        async accediPartitaConCodice() {
            if (this.codicePartitaInput.trim() !== '') {
                const idCercato = this.codicePartitaInput;
                const match = await api.ottieniPartita(idCercato);
                
                if (match) {
                    // SCENARIO 1: LA PARTITA ESISTE NEL DB (E' TERMINATA)
                    this.partitaTerminata = true;
                    this.caricaPartita(match, 'utente'); 
                    this.currentView = 'boxscore'; // Lo mandiamo dritto al boxscore!
                    alert(`Partita Terminata. Visualizzazione Box Score Finale.`);
                } else { 
                    // SCENARIO 2: LA PARTITA NON E' NEL DB (PROBABILMENTE E' LIVE)
                    this.partitaTerminata = false;
                    this.idPartitaCorrente = idCercato;
                    this.ruolo = 'utente';
                    this.currentView = 'court';
                    
                    // Svuotiamo le squadre e mettiamo un testo di attesa
                    this.teamA = this.getEmptyTeam("In attesa dati Admin...", "A", "a");
                    this.teamB = this.getEmptyTeam("In attesa dati Admin...", "B", "b");

                    // Entra nella "Stanza" segreta del WebSocket per quella partita
                    if (this.socket) this.socket.emit('entra_partita', idCercato);
                    
                    alert("Connesso alla Gara Live! In attesa degli aggiornamenti dall'admin..."); 
                }
            } else {
                alert("Inserisci un codice valido!");
            }
        },

        // --- LA FUNZIONE CHE SPEDISCE I DATI ---
       trasmettiDatiLive() {
            if (this.ruolo === 'admin' && this.socket) {
                // Leggiamo i dati dal componente Timer usando i NOMI CORRETTI
                let timerData = null;
                if (this.$refs.timerRef) {
                    timerData = {
                        tempoResiduo: this.$refs.timerRef.timer,         // Era this.timer nel componente
                        inEsecuzione: this.$refs.timerRef.timerRunning   // Era this.timerRunning nel componente
                    };
                }

                this.socket.emit('aggiornamento_admin', {
                    idPartita: this.idPartitaCorrente,
                    payload: {
                        teamA: this.teamA,
                        teamB: this.teamB,
                        timer: timerData
                    }
                });
            }
        },

        // 2. Metodo esclusivo per l'Admin
        mostraArchivioPersonale() {
            // Sfruttiamo la funzione che avevi già creato per caricare i file XML
            this.apriArchivio();
        },

        caricaDaStorico(match) {
            this.caricaPartita(match, 'admin');
        },

        caricaPartita(dati, ruolo) {
            this.ruolo = ruolo;
            
            // Capiamo se stiamo caricando dal Database (Spettatore) o dalla RAM locale
            const dalDatabase = !!dati.info; 

            this.idPartitaCorrente = dalDatabase ? (dati.info.id || dati.info.id_partita) : dati.id;
            
            if (dalDatabase) {
                // 1. CARICAMENTO DAL DATABASE (Spettatore)
                this.teamA.nome = dati.info.squadra_casa;
                this.teamB.nome = dati.info.squadra_ospite;
                
                // 2. Creiamo i template vuoti da 10 giocatori (così abbiamo gli ID 'A0', 'B1' e l'interfaccia non si rompe!)
                this.teamA = this.getEmptyTeam(this.teamA.nome, "A", "a");
                this.teamB = this.getEmptyTeam(this.teamB.nome, "B", "b");
                
                // 3. Smistiamo i giocatori in base al nome della squadra
                let indiceA = 0;
                let indiceB = 0;
                
                dati.giocatori.forEach(dbPlayer => {
                    // Se fa parte della squadra di casa e c'è spazio
                    if (dbPlayer.squadra === this.teamA.nome && indiceA < 10) {
                        // Fonde i dati del DB nello slot vuoto
                        Object.assign(this.teamA.giocatori[indiceA], dbPlayer);
                        indiceA++;
                    } 
                    // Se fa parte della squadra ospite e c'è spazio
                    else if (dbPlayer.squadra === this.teamB.nome && indiceB < 10) {
                        Object.assign(this.teamB.giocatori[indiceB], dbPlayer);
                        indiceB++;
                    }
                });
            } else {
                // CARICAMENTO STANDARD LOCALE
                this.teamA.nome = dati.squadraCasa.nome;
                this.teamB.nome = dati.squadraOspite.nome;
                this.teamA.giocatori = dati.squadraCasa.giocatori;
                this.teamB.giocatori = dati.squadraOspite.giocatori;
            }
            
            // Andiamo al campo!
            this.currentView = 'court';
        },

        async terminaESalva() {
            // 1. Prepariamo l'oggetto con tutti i dati della partita
            const nuovaPartita = {
                id: this.idPartitaCorrente,
                data: new Date().toISOString(),
                squadraCasa: this.teamA,
                squadraOspite: this.teamB,
                punteggioCasa: this.punteggioCasa,
                punteggioOspite: this.punteggioOspite
            };

            // 2. Chiamata al server tramite l'API
            const successo = await api.salva(nuovaPartita);

            if (successo) {
                // Se il salvataggio sul server va a buon fine, procediamo localmente
                await this.aggiornaListaReferti();
                
                // Passiamo alla vista del Box Score finale
                this.currentView = 'boxscore';
            } else {
                // Gestione errore (già gestita con alert nell'api.js, ma qui puoi aggiungere logica)
                console.error("Salvataggio non riuscito.");
            }
        },

        async mostraStorico() {
            this.currentView = 'history';
            await this.aggiornaListaReferti();
        },

        async aggiornaListaReferti() {
            try {
                const files = await api.getListaReferti();
                this.listaReferti = files;
            } catch (error) {
                console.error("Errore nel caricamento della lista:", error);
            }
        },

       async apriArchivio() {
        // Recupera la lista dei file XML dal server
        this.listaReferti = await api.getListaReferti();
        // Cambia la vista per mostrare l'archivio
        this.currentView = 'history';
        setTimeout(() => { 
                if (typeof DataViz !== 'undefined') DataViz.caricaArchivio(); 
            }, 100); 
        },

        logout() {
            this.currentView = 'login'; this.password = ''; this.ruolo = null;this.username = '';
            this.teamA = this.getEmptyTeam("", "A", "a");
            this.teamB = this.getEmptyTeam("", "B", "b");
        },

        backhome() { 
            // Se siamo in una vista dove ci sono dati a rischio (campo o setup), mostra il popup
            if (this.currentView === 'court' || this.currentView === 'setup') {
                this.mostraPopupHome = true;
            } else {
                // Altrimenti, torna alla home direttamente
                this.eseguiBackhome();
            }
        },
        eseguiBackhome() {
            this.mostraPopupHome = false;
            this.currentView = 'home'; 
            this.codicePartitaInput = '';
            
            // Resetta i team per crearne una nuova pulita
            this.teamA = this.getEmptyTeam("", "A", "a");
            this.teamB = this.getEmptyTeam("", "B", "b");
        },
        annullaBackhome() {
            this.mostraPopupHome = false;
        },

        gestisciClickGiocatore(p) {
            if (this.ruolo !== 'admin') return;
            if (!p.inCampo && p.falli >= 5) {
                alert("Questo giocatore ha 5 falli e non può rientrare.");
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
                alert("Giocatore espulso per 5 falli. Effettua un cambio.");
                return;
            }
            if (this.ruolo === 'admin') this.giocatoreAttivo = p;
        },

        aggiungiStat(tipo, val) {
            if (this.giocatoreAttivo) {
                // Assegna la statistica al giocatore (es. punti, rimbalzi, ecc.)
                this.giocatoreAttivo[tipo] += val;

                // SE LA STATISTICA SONO I PUNTI, AGGIORNA IL PLUS-MINUS
                if (tipo === 'punti') {
                    const isCasa = this.giocatoreAttivo.id.startsWith('A');
                    
                    // 1. Aggiungi il valore ai compagni in campo
                    const compagni = isCasa ? this.teamA.giocatori : this.teamB.giocatori;
                    compagni.forEach(p => { if(p.inCampo) p.plsm += val; });

                    // 2. Sottrai il valore agli avversari in campo
                    const avversari = isCasa ? this.teamB.giocatori : this.teamA.giocatori;
                    avversari.forEach(p => { if(p.inCampo) p.plsm -= val; });
                }

                if (tipo === 'falli' && this.giocatoreAttivo.falli >= 5) {
                    alert(`Il giocatore numero ${this.giocatoreAttivo.numero} è uscito per 5 falli!`);
                }
                this.giocatoreAttivo = null;

                this.trasmettiDatiLive();
            }
        },
        aggiornaMinutiGiocatori() {
            this.teamA.giocatori.forEach(p => { if(p.inCampo && p.nome.trim() !== '') p.minuti++; });
            this.teamB.giocatori.forEach(p => { if(p.inCampo && p.nome.trim() !== '') p.minuti++; });
            
            // MAGIA: Invia i dati in diretta ad ogni secondo!
            this.trasmettiDatiLive();
        },

        formatMinuti(secondiTotali) {
            const m = Math.floor(secondiTotali / 60);
            const s = secondiTotali % 60;
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        },
        rimuoviStat(tipo, val) {
            if (this.giocatoreAttivo) {
                this.giocatoreAttivo[tipo] -= val;
                this.giocatoreAttivo = null;
            }
        }
    }
});

app.component('game-timer', Timer);
app.component('score-board', Scoreboard);
app.mount('#app');