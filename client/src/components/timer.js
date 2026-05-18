// Percorso: client/src/components/timer.js
export default {
    template: `
        <div class="timer-component">
            <div class="scoreboard-timer" style="display: flex; flex-direction: column; align-items: center; line-height: 1;">
                <span v-if="!terminata" style="font-size: 0.35em; color: #f39c12; letter-spacing: 3px; font-weight: bold; margin-bottom: 5px;">{{ periodoTesto }}</span>
                
                <span id="shot-clock" v-if="terminata" style="font-size: 0.6em; letter-spacing: 2px; color: #ffeb3b; margin-top: 10px;">TERMINATA</span>
                <span id="shot-clock" v-else>{{ formatTime(timer) }}</span>
            </div>
            
            <div class="controls" v-if="ruolo === 'admin' && !terminata && !isPartitaFinita">
                <button @click="toggleTimer">{{ timerRunning ? '❚❚' : '▶' }}</button>
                <button @click="resetTimer">RESET</button>
                <button @click="forzaAvanzamento" style="background-color: #f39c12; color: white;">⏩ NEXT Q</button>
            </div>
        </div>
    `,
    props: ['ruolo', 'terminata', 'periodoTesto', 'durataDefault', 'periodo', 'puntiCasa', 'puntiOspite'],
    data() {
        return {
            timer: 600,
            timerRunning: false,
            interval: null,
        }
    },
    computed: {
        isPartitaFinita() {
            // La barriera impenetrabile: i tasti spariscono SOLO se siamo oltre il 3° quarto, 
            // il timer è a zero, e le squadre NON sono in pareggio.
            return this.periodo >= 4 && this.timer === 0 && this.puntiCasa !== this.puntiOspite;
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
                        // Il tempo è scaduto in modo naturale (00:00)
                        clearInterval(this.interval);
                        this.timerRunning = false;
                        this.$emit('sync-status');
                        
                        // Spara in automatico la notifica "Partita Conclusa" solo se è la fine reale del match
                        if (this.periodo >= 4 && this.puntiCasa !== this.puntiOspite) {
                            this.$emit('avanza-periodo');
                        }
                    }
                }, 1000); 
                this.$emit('sync-status');
            }
        },
        resetTimer() {
            clearInterval(this.interval);
            this.timerRunning = false;
            setTimeout(() => {
                this.timer = this.durataDefault;
                this.$emit('sync-status');
            }, 50);
        },
        forzaAvanzamento() {
            if (confirm("Vuoi forzare la fine di questo periodo e passare al successivo?")) {
                clearInterval(this.interval);
                this.timerRunning = false;
                
                // Salviamo il periodo attuale prima di inviare il comando
                const vecchioPeriodo = this.periodo;
                this.$emit('avanza-periodo');
                
                setTimeout(() => {
                    // Controlla la differenza in main.js:
                    // Se siamo passati dal Q3 al Q4, il vecchioPeriodo era 3 e ora è 4.
                    // Quindi darà correttamente i 10:00!
                    // Invece, se l'admin ha forzato la chiusura del match a metà del 4° quarto, 
                    // incastriamo l'orologio sullo 00:00 per sfar sparire i tasti.
                    if (this.periodo === vecchioPeriodo && this.periodo >= 4) {
                        this.timer = 0;
                    } else {
                        this.timer = this.durataDefault;
                    }
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