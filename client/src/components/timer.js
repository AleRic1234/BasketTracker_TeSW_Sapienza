export default {
    template: `
        <div class="timer-component">
            <div class="scoreboard-timer">
                <span id="shot-clock">{{ formatTime(timer) }}</span>
            </div>
            
            <div class="controls" v-if="ruolo === 'admin'">
                <button @click="toggleTimer">{{ timerRunning ? '❚❚' : '▶' }}</button>
                <button @click="resetTimer">RESET</button>
            </div>
        </div>
    `,
    props: ['ruolo'],
    data() {
        return {
            timer: 600,
            timerRunning: false,
            interval: null,
        }
    },
    methods: {
        toggleTimer() {
            if (this.timerRunning) { 
                clearInterval(this.interval); 
            } else { 
                this.interval = setInterval(() => { 
                    if (this.timer > 0) {
                        this.timer--;
                        this.$emit('tick');
                    } else {
                        // IL TEMPO È FINITO!
                        clearInterval(this.interval);
                        this.timerRunning = false;
                        this.timer = 600; // Resetta automaticamente a 10:00
                        
                        // Avvisa l'app principale di mostrare il popup
                        this.$emit('time-up');
                    }
                }, 1000); 
            }
            this.timerRunning = !this.timerRunning;
        },
        formatTime(s) {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${m}:${sec < 10 ? '0' : ''}${sec}`;
        },
        resetTimer() {
            clearInterval(this.interval);
            this.timer = 600;
            this.timerRunning = false;
        },
        impostaDatiEsterni(nuovoTempo, inEsecuzione) {
            this.timer = nuovoTempo;
            
            // Se l'admin ha messo play, ma io sono in pausa -> faccio partire
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
            // Se l'admin ha messo pausa, ma io sono in play -> fermo
            else if (!inEsecuzione && this.timerRunning) {
                this.timerRunning = false;
                clearInterval(this.interval);
            }
        }
    },
    unmounted() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
};