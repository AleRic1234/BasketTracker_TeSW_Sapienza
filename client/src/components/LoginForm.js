// Percorso: client/src/components/LoginForm.js

export default {
    props: ['erroreLogin'], // Riceve da main.js se c'è stato un errore
    template: `
        <section class="view-container login-section">
            <div class="login-card">
                <div class="login-header">
                    <h2>🏀 BasketTracker</h2>
                    <p>Effettua l'accesso per continuare</p>
                </div>
                
                <div class="login-body">
                    <div class="input-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" v-model="user" placeholder="es. admin o utente">
                    </div>
                    
                    <div class="input-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" v-model="pass" placeholder="Inserisci la tua password" @keyup.enter="inviaLogin">
                    </div>
                    
                    <div v-if="erroreLogin" class="error-msg">
                        ⚠️ Credenziali non valide. Riprova.
                    </div>
                    
                    <button @click="inviaLogin" class="btn-login">ACCEDI</button>
                </div>
            </div>
        </section>
    `,
    data() {
        return {
            user: '',
            pass: ''
        };
    },
    methods: {
        inviaLogin() {
            // Invia i dati inseriti al componente principale (main.js)
            this.$emit('esegui-login', { username: this.user, password: this.pass });
        }
    }
};