export default {
    template: `
        <div class="timer-component">
            <div class="scoreboard-timer">
                <span id="shot-clock">{{ formatTime(timer) }}</span>
            </div>
            
            <div class="controls">
                <button @click="toggleTimer">{{ timerRunning ? '❚❚' : '▶' }}</button>
                <button @click="resetTimer">RESET</button>
            </div>
        </div>
    `,
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
                    } else {
                        clearInterval(this.interval);
                        this.timerRunning = false;
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
        }
    },
    unmounted() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
};