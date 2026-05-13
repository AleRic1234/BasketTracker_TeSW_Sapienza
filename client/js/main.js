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
            mostraInputCodice: false,
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
    
    // Inizializza la connessione WebSocket
    if (typeof io !== 'undefined') {
        this.socket = io('http://localhost:3000');
        
        // 1. ASCOLTO DATI LIVE (Per chi guarda: Ruolo 'utente' o 'viewer')
        this.socket.on('dati_live', (payload) => {
            if (this.ruolo === 'utente' || this.ruolo === 'viewer') {
                // Aggiorna i giocatori e i punti
                this.teamA = payload.teamA;
                this.teamB = payload.teamB;
                
                // Sincronizza il timer dello spettatore con quello dell'admin
                if (payload.timer && this.$refs.timerRef) {
                    this.$refs.timerRef.impostaDatiEsterni(
                        payload.timer.tempoResiduo, 
                        payload.timer.inEsecuzione
                    );
                }
            }
        });

        // 2. ASCOLTO NUOVO SPETTATORE (Per chi gestisce: Ruolo 'admin')
        // Questo evento viene inviato dal server quando un utente inserisce il codice
        this.socket.on('nuovo_spettatore', () => {
            if (this.ruolo === 'admin') {
                console.log("Uno spettatore si è connesso. Invio dati di allineamento...");
                // L'admin invia immediatamente i dati attuali (nomi, loghi, score) al nuovo arrivato
                this.trasmettiDatiLive();
            }
        });
        }
    },
    methods: {
        //Generatore rapido partita NBA di prova
        caricaTestNBA() {
    // --- 1. LOS ANGELES LAKERS (Team A) ---
    this.teamA.nome = "Los Angeles Lakers";
    const rosterLakers = [
        // Titolari
        { nome: "L. James", num: "23" }, { nome: "A. Davis", num: "3" }, 
        { nome: "A. Reaves", num: "15" }, { nome: "D. Russell", num: "1" }, 
        { nome: "R. Hachimura", num: "28" },
        // Panchina
        { nome: "J. Vanderbilt", num: "2" }, { nome: "C. Wood", num: "35" }, 
        { nome: "G. Vincent", num: "7" }, { nome: "J. Hayes", num: "11" }, 
        { nome: "C. Reddish", num: "5" }
    ];

    rosterLakers.forEach((giocatore, i) => {
        this.teamA.giocatori[i].nome = giocatore.nome;
        this.teamA.giocatori[i].numero = giocatore.num;
        // I primi 5 partono in campo, gli altri in panchina
        this.teamA.giocatori[i].inCampo = i < 5; 
    });

    // --- 2. GOLDEN STATE WARRIORS (Team B) ---
    this.teamB.nome = "Golden State Warriors";
    const rosterWarriors = [
        // Titolari
        { nome: "S. Curry", num: "30" }, { nome: "K. Thompson", num: "11" }, 
        { nome: "D. Green", num: "23" }, { nome: "A. Wiggins", num: "22" }, 
        { nome: "K. Looney", num: "5" },
        // Panchina
        { nome: "C. Paul", num: "3" }, { nome: "J. Kuminga", num: "0" }, 
        { nome: "M. Moody", num: "4" }, { nome: "D. Saric", num: "20" }, 
        { nome: "G. Payton II", num: "00" }
    ];

    rosterWarriors.forEach((giocatore, i) => {
        this.teamB.giocatori[i].nome = giocatore.nome;
        this.teamB.giocatori[i].numero = giocatore.num;
        // I primi 5 partono in campo, gli altri in panchina
        this.teamB.giocatori[i].inCampo = i < 5;
    });

    if (typeof DataViz !== 'undefined') {
        DataViz.mostraNotifica("🏀 Roster NBA completi (10+10) caricati!");
    }
},

        // Helper per generare un team vuoto
        getEmptyTeam(nome, idPrefix, posSuffix) {
            return {
                nome: nome,
                logo: null,
                giocatori: Array.from({ length: 10 }, (_, i) => ({
                    id: idPrefix + i, nome: '', numero: '', inCampo: i < 5,
                    minuti: 0, punti: 0, rimbalzi: 0, assist: 0, rubate: 0, stoppate: 0, perse: 0, falli: 0, plsm: 0,
                    posClass: 'p' + (i + 1) + posSuffix
                }))
            };
        },

        caricaPartitaDaDB(partita) {
            this.ruolo = 'viewer';
            this.currentView = 'court';
            this.partitaTerminata = true; // Impedisce modifiche ai punteggi

            this.teamA.nome = partita.info.squadra_casa;
            this.teamB.nome = partita.info.squadra_ospite;

            // Distribuiamo i giocatori dal tabellino piatto dell'API nei due team di Vue
            // Nota: Filtriamo in base al nome della squadra salvato nel DB
            this.teamA.giocatori = partita.tabellino.filter(g => g.squadra === partita.info.squadra_casa);
            this.teamB.giocatori = partita.tabellino.filter(g => g.squadra === partita.info.squadra_ospite);
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
        async iniziaPartita() {
    const casaOk = this.teamA.giocatori.some(p => p.nome.trim() !== '');
    const ospitiOk = this.teamB.giocatori.some(p => p.nome.trim() !== '');

    if (casaOk || ospitiOk) {
        // --- 1. ASSEGNAZIONE NOMI E LOGHI ---
        // Prendiamo i dati dagli oggetti selezionati nelle select box (squadraCasaSelezionata e squadraOspiteSelezionata)
        this.teamA.nome = this.squadraCasaSelezionata ? this.squadraCasaSelezionata.nome : this.teamA.nome;
        this.teamB.nome = this.squadraOspiteSelezionata ? this.squadraOspiteSelezionata.nome : this.teamB.nome;
        
        // Copiamo i loghi negli oggetti teamA e teamB che verranno passati allo Scoreboard
        this.teamA.logo = this.squadraCasaSelezionata ? this.squadraCasaSelezionata.logo : null;
        this.teamB.logo = this.squadraOspiteSelezionata ? this.squadraOspiteSelezionata.logo : null;

        let nextId = 1;
        
        try {
            // Nota: verifica se nel tuo api.js la funzione si chiama 'getListaReferti' o 'ottieniListaReferti'
            const referti = await api.getListaReferti(); 
            
            if (referti && referti.length > 0) {
                const ids = referti.map(file => {
                    const strNum = file.replace('referto_', '').replace('.xml', '');
                    return parseInt(strNum, 10);
                }).filter(n => !isNaN(n));
                
                if (ids.length > 0) {
                    nextId = Math.max(...ids) + 1; 
                }
            }
        } catch(e) {
            console.error("Errore nel recupero ID dal server, riparto da 1", e);
        }

        this.idPartitaCorrente = nextId.toString().padStart(4, '0');
        
        this.ruolo = 'admin';
        this.currentView = 'court';

        // Entriamo nella stanza WebSocket
        if (this.socket) {
            this.socket.emit('entra_partita', this.idPartitaCorrente);
            
            // --- 2. TRASMISSIONE IMMEDIATA ---
            // Inviamo subito il primo pacchetto dati che include i loghi appena impostati
            this.trasmettiDatiLive();
        }
    } else { 
        alert("Inserisci almeno un giocatore per squadra!"); 
    }
},

        // --- NUOVI METODI PER LA GESTIONE RUOLI E ACCESSI ---

        // 1. Metodo per l'Utente (o l'Admin in modalità Spettatore)
async accediPartitaConCodice() {
    // MODIFICA QUI: usiamo codicePartitaInput invece di idRicerca
    if (this.codicePartitaInput.trim() === '') {
        alert("Inserisci un codice!"); return;
    }
    // MODIFICA QUI: usiamo codicePartitaInput
    const idCercato = this.codicePartitaInput.padStart(4, '0');
    this.idPartitaCorrente = idCercato;

    try {
        // TENTATIVO 1: Verifichiamo se la partita è già conclusa nel DB del server
        const partitaDB = await api.ottieniPartita(idCercato);

        if (partitaDB && partitaDB.info) {
            // Caso Partita Archiviata: carichiamo i dati statici
            this.ruolo = 'viewer';
            this.currentView = 'court';
            this.partitaTerminata = true; // Blocca i tasti di modifica
            this.teamA.nome = partitaDB.info.squadra_casa;
            this.teamB.nome = partitaDB.info.squadra_ospite;
            // Mappiamo i giocatori dal formato DB al formato Vue
            this.teamA.giocatori = partitaDB.tabellino.filter(g => g.squadra === partitaDB.info.squadra_casa);
            this.teamB.giocatori = partitaDB.tabellino.filter(g => g.squadra === partitaDB.info.squadra_ospite);
            
            if (typeof DataViz !== 'undefined') DataViz.mostraNotifica("Partita recuperata dall'archivio del Server.");
        } else {
            // Caso Partita LIVE: entriamo nella stanza WebSocket e aspettiamo i dati
            this.ruolo = 'viewer';
            this.currentView = 'court';
            this.partitaTerminata = false;
            if (this.socket) {
                this.socket.emit('entra_partita', idCercato);
                if (typeof DataViz !== 'undefined') DataViz.mostraNotifica("In attesa di segnale Live dall'Admin...");
            }
        }
    } catch (e) {
        alert("Errore di connessione al server.");
    }
},
    

        // --- LA FUNZIONE CHE SPEDISCE I DATI ---
    
   trasmettiDatiLive() {
    if (this.ruolo === 'admin' && this.socket) {
        
        let datiTimer = null;
        if (this.$refs.timerRef) {
            datiTimer = {
                tempoResiduo: this.$refs.timerRef.timer,
                // CORREZIONE: usiamo timerRunning (come definito in timer.js)
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