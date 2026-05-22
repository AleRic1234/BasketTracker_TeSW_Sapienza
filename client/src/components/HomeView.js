// Percorso: client/src/components/HomeView.js

export default {
    props: {
        username: {
            type: String,
            required: true
        },
        ruolo: {
            type: String,
            required: true
        }
    },
    emits: ['apri-setup', 'apri-archivio', 'apri-leaderboard', 'accedi-partita'],
    template: `
        <section class="home-container view-container">
            <h2 class="main-title">Benvenuto, {{ username.toUpperCase() }}!</h2>
            
            <div class="menu-grid">
                <div v-if="ruolo === 'admin'" class="menu-card" @click="$emit('apri-setup')">
                    <div class="menu-card-icon">🏀</div>
                    <h3>Crea Nuova Partita</h3>
                    <p>Configura le squadre e i roster NBA per iniziare a tracciare le statistiche live.</p>
                </div>

                <div class="menu-card" @click="mostraInputCodice = !mostraInputCodice">
                    <div class="menu-card-icon">🔍</div>
                    <h3>Segui Live con Codice</h3>
                    <p>Inserisci il codice univoco (es: 0001) per visualizzare una partita in corso o un referto archiviato.</p>
                    
                    <div v-if="mostraInputCodice" class="input-inline-container" @click.stop>
                        <input type="text" v-model="codiceInput" placeholder="Codice" @keyup.enter="inviaCodice">
                        <button @click="inviaCodice" class="btn-mini">Entra</button>
                    </div>
                </div>

                <div class="menu-card" @click="$emit('apri-archivio')">
                    <div class="menu-card-icon">📂</div>
                    <h3>Archivio Referti</h3>
                    <p>Consulta lo storico delle partite, visualizza i grafici radar e scarica i file ufficiali.</p>
                </div>

                <div class="menu-card" @click="$emit('apri-leaderboard')">
                    <div class="menu-card-icon">🏆</div>
                    <h3>Classifica</h3>
                    <p>Scopri la classifica delle squadre e i migliori marcatori del torneo...</p>
                </div>
            </div>
        </section>
    `,
    data() {
        
        return {
            mostraInputCodice: false,
            codiceInput: ''
        };
    },
    methods: {

        inviaCodice() {
            if (this.codiceInput.trim() !== '') {
                this.$emit('accedi-partita', this.codiceInput);
            }
        }
    }
};