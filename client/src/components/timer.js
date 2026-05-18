// Percorso: client/src/components/timer.js
export default {
    template: `
        <div class="timer-component">
            <div class="scoreboard-timer" style="display: flex; flex-direction: column; align-items: center; line-height: 1;">
                
                <button v-if="ruolo === 'admin' && !terminata" 
                        @click="modificaTempoManuale" 
                        style="position: absolute; top: 15px; right: -50px; background-color: #333; border: 2px solid #555; border-radius: 50%; width: 40px; height: 40px; font-size: 20px; cursor: pointer; display: flex; justify-content: center; align-items: center; z-index: 1000; box-shadow: 0 4px 8px rgba(0,0,0,0.4); transition: transform 0.2s;"
                        onmouseover="this.style.transform='scale(1.1)'" 
                        onmouseout="this.style.transform='scale(1)'" 
                        title="Modifica Tempo">
                    ⚙️
                </button>

                <span v-if="!terminata" style="font-size: 0.35em; color: #f39c12; letter-spacing: 3px; font-weight: bold; margin-bottom: 5px;">{{ periodoTesto }}</span>
                
                <span id="shot-clock" v-if="terminata" style="font-size: 0.6em; letter-spacing: 2px; color: #ffeb3b; margin-top: 10px;">TERMINATA</span>
                <span id="shot-clock" v-else>{{ formatTime(timer) }}</span>
            </div>
            
            <div class="controls" v-if="ruolo === 'admin' && !terminata && !isPartitaFinita">
                <button @click="toggleTimer">{{ timerRunning ? '❚❚' : '▶' }}</button>
                <button @click="resetTimer">RESET</button>
                <button @click="forzaAvanzamento" style="background-color: #f39c12; color: white;">⏩ NEXT Q</button>
            </div>

            <div v-if="mostraPopupModificaTempo" class="popup-overlay" style="z-index: 4000;">
                <div class="popup-content" style="border-top: 8px solid #3498db;">
                    <div class="popup-icon" style="color: #3498db;">⏱️</div>
                    <h2 class="popup-title" style="color: #3498db; font-size: 1.8rem; text-transform: uppercase;">Modifica Tempo</h2>
                    <p class="popup-text" style="font-size: 1.1rem; margin-top: 10px;">Inserisci il nuovo tempo (MM:SS):</p>
                    
                    <input type="text" v-model="nuovoTempoInput" 
                           style="font-size: 28px; text-align: center; width: 160px; padding: 10px; margin: 15px 0; border: 2px solid #3498db; border-radius: 8px; font-family: 'Courier New', monospace; font-weight: bold; color: #2c3e50; background: #f8f9fa;" 
                           @keyup.enter="salvaNuovoTempo">
                           
                    <p v-if="erroreTempo" style="color: #e74c3c; font-size: 0.95rem; margin-bottom: 15px; font-weight: bold;">⚠️ Formato non valido! Usa MM:SS (es. 08:30)</p>
                    
                    <div class="popup-actions" style="margin-top: 15px; display: flex; gap: 15px; justify-content: center; flex-direction: row;">
                        <button class="btn-primary" style="background-color: #3498db; min-width: 120px; margin: 0;" @click="salvaNuovoTempo">✅ Salva</button>
                        <button class="btn-secondary" style="min-width: 120px; margin: 0;" @click="annullaModificaTempo">❌ Annulla</button>
                    </div>
                </div>
            </div>

        </div>
    `,
    props: ['ruolo', 'terminata', 'periodoTesto', 'durataDefault', 'periodo', 'puntiCasa', 'puntiOspite'],
    data() {
        return {
            timer: 600,
            timerRunning: false,
            interval: null,
            wasRunningBeforePopup: false,
            // Variabili per il nuovo popup:
            mostraPopupModificaTempo: false, 
            nuovoTempoInput: '10:00',
            erroreTempo: false
        }
    },
    computed: {
        isPartitaFinita() {
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
            this.wasRunningBeforePopup = this.timerRunning;
            if (this.timerRunning) {
                this.timerRunning = false;
                clearInterval(this.interval);
                this.$emit('sync-status');
            }
            this.$root.mostraPopupConfermaNextQ = true;
        },
        confermaAvanzamento(accettato) {
            this.$root.mostraPopupConfermaNextQ = false;
            if (accettato) {
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
        },
        
        // --- NUOVI METODI PER IL POPUP DEL TEMPO ---
        modificaTempoManuale() {
            // Memorizziamo lo stato del timer e mettiamo in pausa
            this.wasRunningBeforePopup = this.timerRunning;
            if (this.timerRunning) {
                this.timerRunning = false;
                clearInterval(this.interval);
                this.$emit('sync-status');
            }
            
            // Prepariamo il popup precompilandolo col tempo attuale
            this.erroreTempo = false;
            this.nuovoTempoInput = this.formatTime(this.timer);
            this.mostraPopupModificaTempo = true;
        },

        salvaNuovoTempo() {
            const parti = this.nuovoTempoInput.split(':');
            if (parti.length === 2) {
                const minuti = parseInt(parti[0], 10);
                const secondi = parseInt(parti[1], 10);
                
                if (!isNaN(minuti) && !isNaN(secondi) && secondi >= 0 && secondi <= 59) {
                    // Se tutto è corretto, aggiorniamo il timer e chiudiamo il popup
                    this.timer = (minuti * 60) + secondi;
                    this.mostraPopupModificaTempo = false;
                    this.erroreTempo = false;
                    this.$emit('sync-status');
                    return;
                }
            }
            // Se l'utente sbaglia a scrivere (es. lettere o formato errato), mostriamo l'errore rosso
            this.erroreTempo = true;
        },

        annullaModificaTempo() {
            this.mostraPopupModificaTempo = false;
            this.erroreTempo = false;
        }
    }
};