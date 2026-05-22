// Percorso: client/src/components/SetupView.js

export default {
    props: {
        teamA: { type: Object, required: true },
        teamB: { type: Object, required: true }
    },
    emits: ['invia-notifica', 'inizia-partita'],
    template: `
        <section class="view-container">
            <h2>Configurazione Squadre</h2>
            
            <button @click="caricaTestNBA" class="btn-primary" style="background-color: #f39c12; margin-bottom: 25px; width: 100%; max-width: 830px;">
                ⚡ RIEMPIMENTO RAPIDO TEST (NBA)
            </button>

            <div class="setup-container" style="display: flex; gap: 30px; justify-content: center; flex-wrap: wrap;">
                
                <div class="setup-card" style="flex: 1; min-width: 320px; max-width: 400px; background: white; border-radius: 15px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #7f8c8d; font-size: 0.9rem; text-transform: uppercase;">Seleziona da Archivio:</label>
                    <select v-model="squadraCasaSelezionata" @change="applicaSquadra('casa')" style="padding: 10px; border-radius: 8px; border: 1px solid #ddd; width: 100%; margin-bottom: 20px; font-size: 1rem; background-color: #f9f9f9;">
                        <option :value="null">📝 Inserimento Manuale...</option>
                        <option v-for="s in squadreDisponibili" :key="s.nome" :value="s">{{ s.nome }}</option>
                    </select>

                    <div class="team-header-horizontal" style="padding: 0 0 15px 0; border-bottom: 3px solid var(--primary-color); margin-bottom: 20px; background: transparent; box-shadow: none;">
                        <img v-if="teamA.logo" :src="teamA.logo" class="logo-grande">
                        <div v-else class="logo-grande" style="display:flex; align-items:center; justify-content:center; font-size:2.5rem; background:#f4f7f6; color: #ccc;">🏠</div>
                        <input v-model="teamA.nome" placeholder="Nome Squadra Casa" class="in-team-name" style="font-size: 1.3rem; font-weight: 800; border: none; background: transparent; text-align: left; width: 100%; color: var(--dark-bg); text-transform: uppercase;">
                    </div>

                    <div v-for="(p, i) in teamA.giocatori" :key="'setupA-'+i" class="input-row giocatore-box" :class="p.inCampo ? 'setup-titolare' : 'setup-panchina'" style="display: flex; gap: 10px; margin-bottom: 8px;">
                        <input type="number" v-model="p.numero" min="0" max="99" oninput="if(this.value.length > 2) this.value = this.value.slice(0, 2);" placeholder="N°" class="in-num" style="width: 50px; text-align: center; border-radius: 5px; border: 1px solid #ccc;">
                        <input type="text" v-model="p.nome" oninput="this.value = this.value.replace(/[^a-zA-ZÀ-ÿ.\\s']/g, '');" placeholder="Nome Giocatore" class="in-nome" style="width: 100%; border-radius: 5px; border: 1px solid #ccc; padding: 5px;">
                    </div>
                </div>

                <div class="setup-card" style="flex: 1; min-width: 320px; max-width: 400px; background: white; border-radius: 15px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #7f8c8d; font-size: 0.9rem; text-transform: uppercase;">Seleziona da Archivio:</label>
                    <select v-model="squadraOspiteSelezionata" @change="applicaSquadra('ospite')" style="padding: 10px; border-radius: 8px; border: 1px solid #ddd; width: 100%; margin-bottom: 20px; font-size: 1rem; background-color: #f9f9f9;">
                        <option :value="null">📝 Inserimento Manuale...</option>
                        <option v-for="s in squadreDisponibili" :key="s.nome" :value="s">{{ s.nome }}</option>
                    </select>

                    <div class="team-header-horizontal ospiti" style="padding: 0 0 15px 0; border-bottom: 3px solid var(--danger-color); margin-bottom: 20px; background: transparent; box-shadow: none;">
                        <img v-if="teamB.logo" :src="teamB.logo" class="logo-grande">
                        <div v-else class="logo-grande" style="display:flex; align-items:center; justify-content:center; font-size:2.5rem; background:#f4f7f6; color: #ccc;">✈️</div>
                        <input v-model="teamB.nome" placeholder="Nome Squadra Ospiti" class="in-team-name" style="font-size: 1.3rem; font-weight: 800; border: none; background: transparent; text-align: left; width: 100%; color: var(--dark-bg); text-transform: uppercase;">
                    </div>

                    <div v-for="(p, i) in teamB.giocatori" :key="'setupB-'+i" class="input-row giocatore-box" :class="p.inCampo ? 'setup-titolare' : 'setup-panchina'" style="display: flex; gap: 10px; margin-bottom: 8px;">
                        <input type="text" inputmode="numeric" :value="p.numero" @keydown.space.prevent @input="p.numero = $event.target.value.replace(/[^0-9]/g, '').slice(0, 2); $event.target.value = p.numero" placeholder="N°" class="in-num" style="width: 50px; text-align: center; border-radius: 5px; border: 1px solid #ccc;">
                        <input type="text" v-model="p.nome" oninput="this.value = this.value.replace(/[^a-zA-ZÀ-ÿ.\\s']/g, '');" placeholder="Nome Giocatore" class="in-nome" style="width: 100%; border-radius: 5px; border: 1px solid #ccc; padding: 5px;">
                    </div>
                </div>
            </div>

            <div style="text-align: center; margin-top: 40px; width: 100%;">
                <button class="btn-primary" style="max-width: 400px; font-size: 1.3rem; padding: 15px 30px; border-radius: 50px; box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4);" @click="validaEInizia">
                    🏀 INIZIA PARTITA
                </button>
            </div>
        </section>
    `,
    data() {
        return {

            // gestisce il menu a tendina
            squadreDisponibili: [
                { nome: "Sapienza Bulls", logo: "./assets/sapienza_bulls.jpeg" },
                { nome: "Lamis Lions", logo: "./assets/lamis_lions.jpeg" },
                { nome: "Orte Dragons", logo: "./assets/orte_dragons.jpeg" },
                { nome: "Torvergata Griffins ", logo: "./assets/torvergata_griffins.jpeg" },
            ],
            squadraCasaSelezionata: null,
            squadraOspiteSelezionata: null
        };
    },
    methods: {

        applicaSquadra(tipo) {
            if (tipo === 'casa') {
                this.teamA.nome = this.squadraCasaSelezionata ? this.squadraCasaSelezionata.nome : '';
                this.teamA.logo = this.squadraCasaSelezionata ? this.squadraCasaSelezionata.logo : null;
            } else {
                this.teamB.nome = this.squadraOspiteSelezionata ? this.squadraOspiteSelezionata.nome : '';
                this.teamB.logo = this.squadraOspiteSelezionata ? this.squadraOspiteSelezionata.logo : null;
            }
        },

        // Funzione Per Facilitare Creazione Partita -- Test

        caricaTestNBA() {
            this.teamA.nome = "Los Angeles Lakers";
            this.teamA.logo = null;
            this.squadraCasaSelezionata = null;
            const rosterLakers = [
                { nome: "L. James", num: "23" }, { nome: "A. Davis", num: "3" }, 
                { nome: "A. Reaves", num: "15" }, { nome: "D. Russell", num: "1" }, 
                { nome: "R. Hachimura", num: "28" }, { nome: "J. Vanderbilt", num: "2" }, 
                { nome: "C. Wood", num: "35" }, { nome: "G. Vincent", num: "7" }, 
                { nome: "J. Hayes", num: "11" }, { nome: "C. Reddish", num: "5" }
            ];
            rosterLakers.forEach((giocatore, i) => {
                this.teamA.giocatori[i].nome = giocatore.nome;
                this.teamA.giocatori[i].numero = giocatore.num;
                this.teamA.giocatori[i].inCampo = i < 5; 
            });

            this.teamB.nome = "Golden State Warriors";
            this.teamB.logo = null;
            this.squadraOspiteSelezionata = null;
            const rosterWarriors = [
                { nome: "S. Curry", num: "30" }, { nome: "K. Thompson", num: "11" }, 
                { nome: "D. Green", num: "23" }, { nome: "A. Wiggins", num: "22" }, 
                { nome: "K. Looney", num: "5" }, { nome: "C. Paul", num: "3" }, 
                { nome: "J. Kuminga", num: "0" }, { nome: "M. Moody", num: "4" }, 
                { nome: "D. Saric", num: "20" }, { nome: "G. Payton II", num: "00" }
            ];
            rosterWarriors.forEach((giocatore, i) => {
                this.teamB.giocatori[i].nome = giocatore.nome;
                this.teamB.giocatori[i].numero = giocatore.num;
                this.teamB.giocatori[i].inCampo = i < 5;
            });

            this.$emit('invia-notifica', { msg: "🏀 Roster NBA completi caricati!", type: "success" });
        },

        // Controlli Per Il Corretto Avvio del Match

        validaEInizia() {
            const getValidi = (team) => team.giocatori.filter(p => p.nome.trim() !== '' && p.numero !== '');
            const vA = getValidi(this.teamA);
            const vB = getValidi(this.teamB);

            if (vA.length < 5 || vB.length < 5) {
                this.$emit('invia-notifica', { msg: "⚠️ Almeno 5 giocatori con nome e numero per squadra!", type: "warning" });
                return; 
            }

            const hasDup = (list) => new Set(list.map(g => g.numero.toString())).size !== list.length;
            if (hasDup(vA) || hasDup(vB)) {
                this.$emit('invia-notifica', { msg: "⚠️ Numeri duplicati rilevati nella stessa squadra!", type: "error" });
                return; 
            }

            this.$emit('inizia-partita');
        }
    }
};