// Percorso: client/src/components/BoxScoreView.js

export default {
    props: ['teamA', 'teamB', 'giocatoreMvp', 'partitaTerminata', 'idPartitaCorrente'],
    template: `
        <section class="view-container">
            <div class="boxscore-header-nav">
                <h1 class="main-title">BOX SCORE</h1>
                <div class="tab-switcher">
                    <button :class="['tab-btn', { active: tabellinoAttivo === 'casa' }]" 
                            @click="tabellinoAttivo = 'casa'">
                        CASA
                    </button>
                    <button :class="['tab-btn', { active: tabellinoAttivo === 'ospiti' }]" 
                            @click="tabellinoAttivo = 'ospiti'">
                        OSPITI
                    </button>
                </div>
            </div>

            <div v-if="tabellinoAttivo === 'casa'" class="fade-in">
                <div class="team-header-horizontal" style="margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <img v-if="teamA.logo" :src="teamA.logo" class="logo-grande">
                    <div v-else class="logo-grande" style="display:flex; align-items:center; justify-content:center; font-size:2rem; background:#f4f7f6; color: #ccc;">🏠</div>
                    <h3 class="nome-squadra-header">{{ teamA.nome || 'SQUADRA CASA' }}</h3>
                </div>
                <div class="table-responsive">
                    <table class="box-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th style="text-align: left;">Nome</th>
                                <th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>BLK</th><th>STL</th><th>TOV</th><th>FLS</th><th>+/-</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="p in teamA.giocatori" :key="p.id" v-show="p.nome.trim() !== ''" 
                                :class="[p.inCampo ? 'in-campo-row' : '', { 'row-espulso': p.falli >= 5 }]"
                                :style="p === giocatoreMvp ? 'background-color: rgba(241, 196, 15, 0.15); border-left: 5px solid #f1c40f;' : ''">
                                
                                <td><strong>{{ p.numero }}</strong></td>
                                <td style="text-align: left;">
                                    {{ p.nome }}
                                    <span v-if="p.falli >= 5" class="badge-falli">OUT</span>
                                    <span v-else-if="p.inCampo" class="badge-starter">IN CAMPO</span>
                                    <span v-if="p === giocatoreMvp" style="color: #f1c40f; font-size: 1.2rem; margin-right: 5px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));" title="MVP della Partita">🏆</span>
                                </td>
                                <td>{{ formatMinuti(p.minuti) }}</td><td>{{ p.punti }}</td><td>{{ p.rimbalzi }}</td><td>{{ p.assist }}</td>
                                <td>{{ p.stoppate }}</td><td>{{ p.rubate }}</td><td>{{ p.perse }}</td><td>{{ p.falli }}</td>
                                <td :class="p.plsm >= 0 ? 'plus-stat' : 'minus-stat'">{{ p.plsm > 0 ? '+' : '' }}{{ p.plsm }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div v-if="tabellinoAttivo === 'ospiti'" class="fade-in">
                <div class="team-header-horizontal ospiti" style="margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <img v-if="teamB.logo" :src="teamB.logo" class="logo-grande">
                    <div v-else class="logo-grande" style="display:flex; align-items:center; justify-content:center; font-size:2rem; background:#f4f7f6; color: #ccc;">✈️</div>
                    <h3 class="nome-squadra-header">{{ teamB.nome || 'SQUADRA OSPITI' }}</h3>
                </div>
                <div class="table-responsive">
                    <table class="box-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th style="text-align: left;">Nome</th>
                                <th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>BLK</th><th>STL</th><th>TOV</th><th>FLS</th><th>+/-</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="p in teamB.giocatori" :key="p.id" v-show="p.nome.trim() !== ''" 
                                :class="[p.inCampo ? 'in-campo-row' : '', { 'row-espulso': p.falli >= 5 }]"
                                :style="p === giocatoreMvp ? 'background-color: rgba(241, 196, 15, 0.15); border-left: 5px solid #f1c40f;' : ''">
                                
                                <td><strong>{{ p.numero }}</strong></td>
                                <td style="text-align: left;">
                                    {{ p.nome }}
                                    <span v-if="p.falli >= 5" class="badge-falli">OUT</span>
                                    <span v-else-if="p.inCampo" class="badge-starter">IN CAMPO</span>
                                    <span v-if="p === giocatoreMvp" style="color: #f1c40f; font-size: 1.2rem; margin-right: 5px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));" title="MVP della Partita">🏆</span>
                                </td>
                                <td>{{ formatMinuti(p.minuti) }}</td><td>{{ p.punti }}</td><td>{{ p.rimbalzi }}</td><td>{{ p.assist }}</td>
                                <td>{{ p.stoppate }}</td><td>{{ p.rubate }}</td><td>{{ p.perse }}</td><td>{{ p.falli }}</td>
                                <td :class="p.plsm >= 0 ? 'plus-stat' : 'minus-stat'">{{ p.plsm > 0 ? '+' : '' }}{{ p.plsm }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div style="text-align: center; margin-top: 40px; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button v-if="partitaTerminata" class="btn-secondary" style="width: 100%; max-width: 250px;" @click="stampaRefertoUfficiale">
                    📥 Stampa Referto Ufficiale
                </button>
            </div>
        </section>
    `,
    data() {
        return {
            tabellinoAttivo: 'casa'
        };
    },
    methods: {
        formatMinuti(secondiTotali) {
            const m = Math.floor(secondiTotali / 60);
            const s = secondiTotali % 60;
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        },
        async stampaRefertoUfficiale() {
            if (!this.idPartitaCorrente || this.idPartitaCorrente === '0000') {
                this.$emit('invia-notifica', { msg: "❌ Nessuna partita selezionata per la stampa del referto.", type: "error" });
                return;
            }
            const idFormattato = this.idPartitaCorrente.toString().padStart(4, '0');
            const fileName = `referto_${idFormattato}.xml`;
            
            window.open(`/referti/${fileName}`, '_blank');
            this.$emit('invia-notifica', { msg: "📄 Referto XML aperto con successo!", type: "success" });
        }
    }
};