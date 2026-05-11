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
            password: '',
            storicoPartite: [],
            listaReferti: [],
            erroreLogin: false,
            idRicerca: '',
            idPartitaCorrente: '0000',
           
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
               const nextId = this.listaReferti.length + 1;
                this.idPartitaCorrente = nextId.toString().padStart(4, '0');
                
                this.ruolo = 'admin';
                this.currentView = 'court';
            } else { alert("Inserisci almeno un giocatore!"); }
        },

        entraInPartitaEsistente() {
            if (this.idRicerca.trim() !== '') {
                const idCercato = this.idRicerca.padStart(4, '0');
                // Cerca nello storico locale
                const match = await api.ottieniPartita(idCercato);
                
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
            this.idPartitaCorrente = dati.info ? dati.info.id_partita : dati.id;
            this.teamA.nome = dati.info ? dati.info.squadra_casa : dati.squadraCasa.nome;
            this.teamB.nome = dati.info ? dati.info.squadra_ospite : dati.squadraOspite.nome;
            
            // Rimappa giocatori
            this.teamA.giocatori = dati.giocatori ? dati.giocatori.filter(g => g.id.startsWith('A')) : dati.squadraCasa.giocatori;
            this.teamB.giocatori = dati.giocatori ? dati.giocatori.filter(g => g.id.startsWith('B')) : dati.squadraOspite.giocatori;
            
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