// Percorso: client/src/components/timer.js
export default {
    template: `
        <div class="timer-component">
            <div class="scoreboard-timer">
                <span id="shot-clock" v-if="terminata" style="font-size: 0.6em; letter-spacing: 2px; color: #ffeb3b;">TERMINATA</span>
                <span id="shot-clock" v-else>{{ formatTime(timer) }}</span>
            </div>
            
            <div class="controls" v-if="ruolo === 'admin' && !terminata">
                <button @click="toggleTimer">{{ timerRunning ? '❚❚' : '▶' }}</button>
                <button @click="resetTimer">RESET</button>
            </div>
        </div>
    `,
    props: ['ruolo', 'terminata'],
    data() {
        return {
            timer: 600,
            timerRunning: false,
            interval: null,
        }
    },
    watch: {
        // IL TRUCCO MAGICO: Se la variabile 'terminata' diventa vera, il timer si "uccide" da solo
        terminata(newVal) {
            if (newVal) {
                this.timerRunning = false;
                clearInterval(this.interval);
            }
        }
    },
    methods: {
        formatTime(s) {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${m}:${sec < 10 ? '0' : ''}${sec}`;
        },
        toggleTimer() {
            if (this.timerRunning) { 
                this.timerRunning = false; // ORA SI IMPOSTA CORRETTAMENTE
                clearInterval(this.interval); 
                this.$emit('sync-status');
            } else { 
                this.timerRunning = true; // ORA SI IMPOSTA CORRETTAMENTE
                this.interval = setInterval(() => { 
                    if (this.timer > 0) {
                        this.timer--;
                        this.$emit('tick', this.timer);
                    } else {
                        clearInterval(this.interval);
                        this.timerRunning = false;
                        this.timer = 600; 
                        this.$emit('time-up');
                    }
                }, 1000); 
                this.$emit('sync-status');
            }
        },
        resetTimer() {
            clearInterval(this.interval);
            this.timer = 600;
            this.timerRunning = false;
            this.$emit('sync-status');
        },
        impostaDatiEsterni(nuovoTempo, inEsecuzione) {
            this.timer = nuovoTempo;
            
            if (inEsecuzione && !this.timerRunning) {
                this.timerRunning = true;
                clearInterval(this.interval);
                this.interval = setInterval(() => { 
                    if (this.timer > 0) {
                        this.timer--;
                    } else {
                        clearInterval(this.interval);
                        this.timerRunning = false;
                        this.timer = 600; 
                    }
                }, 1000); 
            } 
            else if (!inEsecuzione && this.timerRunning) {
                this.timerRunning = false;
                clearInterval(this.interval);
            }
        }
    }
};