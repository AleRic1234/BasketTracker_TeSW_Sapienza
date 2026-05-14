// Percorso: client/src/components/timer.js
export default {
    template: `
        <div class="timer-component">
            <div class="scoreboard-timer" style="display: flex; flex-direction: column; align-items: center; line-height: 1;">
                <span v-if="!terminata" style="font-size: 0.35em; color: #f39c12; letter-spacing: 3px; font-weight: bold; margin-bottom: 5px;">{{ periodoTesto }}</span>
                
                <span id="shot-clock" v-if="terminata" style="font-size: 0.6em; letter-spacing: 2px; color: #ffeb3b; margin-top: 10px;">TERMINATA</span>
                <span id="shot-clock" v-else>{{ formatTime(timer) }}</span>
            </div>
            
            <div class="controls" v-if="ruolo === 'admin' && !terminata">
                <button @click="toggleTimer">{{ timerRunning ? '❚❚' : '▶' }}</button>
                <button @click="resetTimer">RESET</button>
                <button @click="forzaAvanzamento" style="background-color: #f39c12; color: white;">⏩ NEXT Q</button>
            </div>
        </div>
    `,
    props: ['ruolo', 'terminata', 'periodoTesto', 'durataDefault'],
    data() {
        return {
            timer: 600,
            timerRunning: false,
            interval: null,
        }
    },
    watch: {
        terminata(newVal) {
            if (newVal) {
                this.timerRunning = false;
                clearInterval(this.interval);
            }
        }
    },
    mounted() {
        this.timer = this.durataDefault || 600;
    },
    methods: {
        formatTime(s) {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${m}:${sec < 10 ? '0' : ''}${sec}`;
        },
        toggleTimer() {
            if (this.timerRunning) { 
                this.timerRunning = false; 
                clearInterval(this.interval); 
                this.$emit('sync-status');
            } else { 
                this.timerRunning = true; 
                this.interval = setInterval(() => { 
                    if (this.timer > 0) {
                        this.timer--;
                        this.$emit('tick', this.timer);
                    } else {
                        clearInterval(this.interval);
                        this.timerRunning = false;
                        this.timer = 0; 
                        this.$emit('sync-status');
                    }
                }, 1000); 
                this.$emit('sync-status');
            }
        },
        resetTimer() {
            clearInterval(this.interval);
            
            // Avanza in automatico solo se il tempo è scaduto
            if (this.timer === 0) {
                this.$emit('avanza-periodo');
            }
            
            this.timerRunning = false;
            setTimeout(() => {
                this.timer = this.durataDefault;
                this.$emit('sync-status');
            }, 50);
        },
        // --- NUOVA FUNZIONE: Salto manuale del Quarto ---
        forzaAvanzamento() {
            if (confirm("Vuoi forzare la fine di questo periodo e passare al successivo?")) {
                clearInterval(this.interval);
                this.timerRunning = false;
                
                // Comunichiamo a main.js di cambiare quarto
                this.$emit('avanza-periodo');
                
                // Resettiamo il tempo con la nuova durata (es. passa da 10 a 5 se è OT)
                setTimeout(() => {
                    this.timer = this.durataDefault;
                    this.$emit('sync-status');
                }, 50);
            }
        },
        impostaDatiEsterni(nuovoTempo, inEsecuzione) {
            this.timer = nuovoTempo;
            if (inEsecuzione && !this.timerRunning) {
                this.timerRunning = true;
                clearInterval(this.interval);
                this.interval = setInterval(() => { 
                    if (this.timer > 0) this.timer--;
                    else { clearInterval(this.interval); this.timerRunning = false; }
                }, 1000); 
            } else if (!inEsecuzione && this.timerRunning) {
                this.timerRunning = false;
                clearInterval(this.interval);
            }
        }
    }
};