import Timer from '../src/components/Timer.js';
import Scoreboard from '../src/components/Scoreboard.js';

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            currentView: 'login', // 'login', 'home', 'court', 'history', 'setup', 'boxscore'
            ruolo: null,
            tabellinoAttivo: 'casa',
            password: '',
            listaReferti: [],
            erroreLogin: false,
            idRicerca: '',
            idPartitaCorrente: '0000',
            storicoPartite: [], // Array per salvare le partite
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
        // Al caricamento, recupera lo storico dal browser
        const salvato = localStorage.getItem('basket_storico');
        if (salvato) {
            this.storicoPartite = JSON.parse(salvato);
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
            if (this.password === 'coach123' || this.password === '1') {
                this.ruolo = 'admin';
                this.currentView = 'home';
                this.erroreLogin = false;
            } else { this.erroreLogin = true; }
        },

        iniziaPartita() {
            const casaOk = this.teamA.giocatori.some(p => p.nome.trim() !== '');
            const ospitiOk = this.teamB.giocatori.some(p => p.nome.trim() !== '');

            if (casaOk || ospitiOk) {
                // Genera ID INCREMENTALE
                let nextId = 1;
                if (this.storicoPartite.length > 0) {
                    const maxId = Math.max(...this.storicoPartite.map(p => parseInt(p.info.id_partita)));
                    nextId = maxId + 1;
                }
                this.idPartitaCorrente = nextId.toString().padStart(4, '0');
                
                this.ruolo = 'admin';
                this.currentView = 'court';
            } else { alert("Inserisci almeno un giocatore!"); }
        },

        entraInPartitaEsistente() {
            if (this.idRicerca.trim() !== '') {
                const idCercato = this.idRicerca.padStart(4, '0');
                // Cerca nello storico locale
                const match = this.storicoPartite.find(p => p.info.id_partita === idCercato);
                
                if (match) {
                    this.caricaPartita(match, 'viewer');
                } else { alert("Partita non trovata!"); }
            }
        },

        caricaDaStorico(match) {
            this.caricaPartita(match, 'admin');
        },

        caricaPartita(dati, ruolo) {
            this.ruolo = ruolo;
            this.idPartitaCorrente = dati.info.id_partita;
            this.teamA.nome = dati.info.squadra_casa;
            this.teamB.nome = dati.info.squadra_ospite;
            
            // Rimappa giocatori
            this.teamA.giocatori = dati.giocatori.filter(g => g.id.startsWith('A'));
            this.teamB.giocatori = dati.giocatori.filter(g => g.id.startsWith('B'));
            
            this.currentView = 'court';
        },

        async terminaESalva() {
            if (confirm("Salvare i dati della partita nello storico e sul server?")) {
                
                // 1. Prepariamo i giocatori (aggiungiamo a ognuno la proprietà 'squadra' necessaria per il DB)
                const giocatoriCasa = this.teamA.giocatori.map(g => ({ ...g, squadra: this.teamA.nome || "Casa" }));
                const giocatoriOspiti = this.teamB.giocatori.map(g => ({ ...g, squadra: this.teamB.nome || "Ospiti" }));
                const tuttiIGiocatori = [...giocatoriCasa, ...giocatoriOspiti];

                // 2. CREIAMO IL PAYLOAD LOCALE (Per il tuo storico nel browser)
                const payloadLocale = {
                    info: {
                        id_partita: this.idPartitaCorrente,
                        data_salvataggio: new Date().toLocaleString('it-IT'),
                        squadra_casa: this.teamA.nome,
                        squadra_ospite: this.teamB.nome,
                        punti_casa: this.punteggioCasa,
                        punti_ospite: this.punteggioOspite
                    },
                    giocatori: tuttiIGiocatori
                };
                
                // 3. CREIAMO IL PAYLOAD SERVER (Strutturato esattamente come lo aspetta il tuo server.js per DB e XML)
                const payloadServer = {
                    info: {
                        squadra_casa: this.teamA.nome || "Casa",
                        squadra_ospite: this.teamB.nome || "Ospiti",
                        punti_casa: this.punteggioCasa,
                        punti_ospite: this.punteggioOspite
                    },
                    giocatori: tuttiIGiocatori,
                    
                    // Questi campi servono alla tua funzione generaRefertoXML nel server
                    squadraCasa: this.teamA.nome || "Casa",
                    squadraOspite: this.teamB.nome || "Ospiti",
                    puntiCasa: this.punteggioCasa,
                    puntiOspiti: this.punteggioOspite,
                    statistiche: tuttiIGiocatori.filter(g => g.nome.trim() !== '') // Mandiamo all'XML solo i giocatori con un nome
                };

                // 4. SALVATAGGIO LOCALE (La tua logica intatta)
                const index = this.storicoPartite.findIndex(p => p.info.id_partita === this.idPartitaCorrente);
                if (index >= 0) {
                    this.storicoPartite[index] = payloadLocale;
                } else {
                    this.storicoPartite.push(payloadLocale);
                }
                localStorage.setItem('basket_storico', JSON.stringify(this.storicoPartite));

                // 5. SALVATAGGIO SUL SERVER TRAMITE AJAX (Node.js + SQLite + XML)
                try {
                    // Assicurati di aver messo <script src="js/api.js"></script> nel tuo index.html!
                    console.log("Inviando dati al server...", payloadServer);
                    const successo = await api.salva(payloadServer);
                    
                    if (successo) {
                        alert("Partita salvata con successo nello storico, nel Database e in XML!");
                        this.eseguiBackhome(); // Opzionale: torna alla home dopo il salvataggio
                    } else {
                        alert("Salvata in locale, ma si è verificato un errore sul Server.");
                    }
                } catch (error) {
                    console.error("Errore di connessione al server:", error);
                    alert("Salvata in locale, ma il Server non è raggiungibile. Assicurati che Node.js sia avviato sulla porta 3000.");
                }
            }
        },

       async apriArchivio() {
        // Recupera la lista dei file XML dal server
        this.listaReferti = await api.getListaReferti();
        // Cambia la vista per mostrare l'archivio
        this.currentView = 'history';
        
        },
        apriArchivio() {
            this.currentView = 'history';
            setTimeout(() => { DataViz.caricaArchivio(); }, 100); // 100ms per far renderizzare il div a Vue
        },
        logout() {
            this.currentView = 'login'; this.password = ''; this.ruolo = null;
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
            this.ruolo = 'admin'; 
            this.idRicerca = '';
            
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
            }
        },
        aggiornaMinutiGiocatori() {
    
            this.teamA.giocatori.forEach(p => { if(p.inCampo && p.nome.trim() !== '') p.minuti++; });
            this.teamB.giocatori.forEach(p => { if(p.inCampo && p.nome.trim() !== '') p.minuti++; });
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