// Percorso: client/src/mixins/courtLogic.js

//Funzione per generare una squadra vuota con 10 giocatori (5 in campo, 5 in panchina)
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

export default {
    methods: {
        getEmptyTeam(nome, idPrefix, posSuffix) {
            // Nota: qui potresti aver bisogno di spostare anche la funzione generaSquadraVuota se non vuoi tenerla in main.js
            // Per ora assumiamo che generaSquadraVuota sia accessibile (magari importandola o definendola nel mixin)
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
        }
    }
};