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
            wasRunningBeforePopup: false // Per ricordare se il timer era in esecuzione prima di mostrare un popup (es. fine partita)
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
            // 1. Memorizziamo lo stato del timer
            this.wasRunningBeforePopup = this.timerRunning;
            
            // 2. Mettiamo in pausa il tempo "simulando" il blocco del vecchio confirm()
            if (this.timerRunning) {
                this.timerRunning = false;
                clearInterval(this.interval);
                this.$emit('sync-status');
            }
            
            // 3. Mostriamo il nostro popup grafico
            this.$root.mostraPopupConfermaNextQ = true;
        },

        confermaAvanzamento(accettato) {
            // Chiude il popup
            this.$root.mostraPopupConfermaNextQ = false;
            
            if (accettato) {
                // SE L'ADMIN CLICCA "SI, CONTINUA" -> Procediamo con la fine del quarto
                clearInterval(this.interval);
                this.timerRunning = false;
                
                const vecchioPeriodo = this.periodo;
                this.$emit('avanza-periodo');
                
                setTimeout(() => {
                    if (this.periodo === vecchioPeriodo && this.periodo >= 4) {
                        this.timer = 0;
                    } else {
                        this.timer = this.durataDefault;
                    }
                    this.$emit('sync-status');
                }, 50);
                
            } else {
                // SE L'ADMIN CLICCA "ANNULLA" -> Facciamo ripartire il tempo (se era in esecuzione)
                if (this.wasRunningBeforePopup) {
                    this.timerRunning = true;
                    this.interval = setInterval(() => { 
                        if (this.timer > 0) {
                            this.timer--;
                            this.$emit('tick', this.timer);
                        } else {
                            clearInterval(this.interval);
                            this.timerRunning = false;
                            this.$emit('sync-status');
                            
                            if (this.periodo >= 4 && this.puntiCasa !== this.puntiOspite) {
                                this.$emit('avanza-periodo');
                            }
                        }
                    }, 1000); 
                    this.$emit('sync-status');
                }
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