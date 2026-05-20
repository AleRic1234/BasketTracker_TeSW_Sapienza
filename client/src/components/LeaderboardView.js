// Percorso: client/src/components/LeaderboardView.js

export default {
    // 1. Aggiunto l'array emits per far comunicare il componente con index.html
    emits: ['torna-home', 'invia-notifica'],
    
    template: `
        <section class="view-container">

            <div class="header-archivio" style="text-align: center;">
                <h2>Dashboard Statistiche</h2>
            </div>
            
            <div style="display: flex; justify-content: center; gap: 15px; margin: 25px 0;">
                <button @click="view = 'teams'" 
                        :style="view === 'teams' ? 'background: #1a2a6c; color: white;' : 'background: white; color: #1a2a6c;'"
                        style="padding: 12px 25px; border: 2px solid #1a2a6c; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s;">
                    🏆 Classifica Squadre
                </button>
                <button @click="view = 'scorers'" 
                        :style="view === 'scorers' ? 'background: #f39c12; color: white; border-color: #f39c12;' : 'background: white; color: #f39c12; border-color: #f39c12;'"
                        style="padding: 12px 25px; border: 2px solid #f39c12; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s;">
                    🔥 Top 5 Marcatori
                </button>
            </div>
            
            <div v-if="view === 'teams'" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 900px; margin: 0 auto; overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: center;">
                    <thead>
                        <tr style="background-color: #f8f9fa; border-bottom: 3px solid #1a2a6c; color: #2c3e50;">
                            <th style="padding: 15px; text-align: left;">SQUADRA</th>
                            <th style="padding: 15px;">PG</th>
                            <th style="padding: 15px; color: #27ae60;">V</th>
                            <th style="padding: 15px; color: #c0392b;">P</th>
                            <th style="padding: 15px; font-weight: 900; color: #1a2a6c;">PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(team, index) in standings" :key="team.squadra" style="border-bottom: 1px solid #eee;">
                            <td style="padding: 15px; text-align: left; font-weight: bold;">{{ team.squadra }}</td>
                            <td style="padding: 15px;">{{ team.giocate }}</td>
                            <td style="padding: 15px; color: #27ae60;">{{ team.vinte }}</td>
                            <td style="padding: 15px; color: #c0392b;">{{ team.perse }}</td>
                            <td style="padding: 15px; font-weight: 900;">{{ team.punti_classifica }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-if="view === 'scorers' && topScorers.length > 0" style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); max-width: 800px; width: 95%; margin: 0 auto; height: 500px;">
                <canvas id="topScorersChart"></canvas>
            </div>

        </section>
    `,
    data() {
        return {
            view: 'teams',
            standings: [],
            topScorers: [],
            chartInstance: null // 3. Rimosso l'underscore per garantire la reattività di Vue
        };
    },
    async mounted() {
        try {
            const response = await fetch('/api/classifica');
            const data = await response.json();
            this.standings = data.standings || [];
            this.topScorers = data.topScorers || [];
        } catch (error) {
            console.error("Errore caricamento classifica:", error);
            this.$emit('invia-notifica', { msg: "Errore di caricamento classifica", type: "error" });
        }
    },
    watch: {
        view(newVal) {
            if (newVal === 'scorers') {
                this.renderizzaGrafico(); // Il nextTick interno al metodo basterà
            }
        }
    },
    methods: {
        renderizzaGrafico() {
            this.$nextTick(() => {
                const canvas = document.getElementById('topScorersChart');
                if (!canvas) return;
                const ctx = canvas.getContext('2d');

                // Aggiornato con il nome variabile corretto
                if (this.chartInstance) {
                    this.chartInstance.destroy();
                }

                const top5 = this.topScorers.slice(0, 5);
                
                // Aggiornato con il nome variabile corretto
                this.chartInstance = new window.Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: top5.map(g => g.nome || 'Sconosciuto'),
                        datasets: [{
                            label: 'Punti Segnati',
                            data: top5.map(g => g.punti_totali || 0),
                            backgroundColor: ['#FFD700', '#C0C0C0','#FF8C00', '#4169E1', '#696969'  ],
                            borderRadius: 8, 
                            barPercentage: 0.6
                        }]
                    },
                    options: {
                        responsive: true, 
                        maintainAspectRatio: false,
                        scales: {
                            y: { 
                                beginAtZero: true, 
                                grid: { 
                                    color: 'rgba(0,0,0,0.06)', 
                                    borderDash: [5, 5] 
                                }, 
                                ticks: { stepSize: 1, font: { size: 16 }, color: '#7f8c8d' } 
                            },
                            x: { 
                                grid: { display: false }, 
                                ticks: { font: { size: 15, weight: 'bold' }, color: '#2c3e50' } 
                            }
                        },
                        plugins: { 
                            legend: { display: false }, 
                            tooltip: {
                                titleFont: { size: 18 },
                                bodyFont: { size: 16 },
                                padding: 15,
                                displayColors: false,
                                callbacks: { label: (context) => context.raw + ' Punti Segnati' }
                            }
                        }
                    }
                });
            });
        }
    }
};