// Percorso: client/src/components/HistoryView.js
import api from '../../js/api.js';

export default {
    emits: ['invia-notifica'],
    template: `
        <section class="view-container ">
            <div class="header-archivio">
                <h2>Archivio Referti Ufficiali</h2>
            </div>
            
            <div class="referti-grid" style="display:flex; gap:20px; flex-wrap:wrap; margin-top: 20px; justify-content: center;">
                <div v-for="partita in storicoPartite" :key="partita.id" class="referto-card" style="background:#fff; padding:20px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.05); width:240px; text-align:center; transition: transform 0.3s ease;">
                    <div class="referto-icon" style="font-size:3.5rem; margin-bottom:10px;">📄</div>
                    <div class="referto-info">
                        <span class="file-name" style="display:block; margin-bottom:10px; font-weight:800; color: var(--dark-bg); font-size: 1.05rem; text-transform: uppercase;">
                            {{ partita.squadraCasa }} vs {{ partita.squadraOspite }} (#{{ partita.id }})
                        </span>
                        <div style="background: rgba(241, 196, 15, 0.1); border: 1px solid #f1c40f; border-radius: 8px; padding: 10px; margin-bottom: 15px;">
                            <span style="display: block; font-size: 0.8rem; text-transform: uppercase; color: #7f8c8d; font-weight: bold;">MVP del Match</span>
                            <span style="display: block; font-size: 1.1rem; color: #f39c12; font-weight: 900; margin: 3px 0;">
                                🏆 {{ partita.mvpNome }}
                            </span>
                            <span v-if="partita.valutazioneMvp > 0" style="display: block; font-size: 0.8rem; color: #95a5a6;">
                                (Valutazione: {{ partita.valutazioneMvp }})
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <a :href="'/referti/' + partita.nomeFile" target="_blank" class="btn-view" style="background:var(--primary-color); color:white; padding:10px; text-decoration:none; border-radius:6px; font-weight: bold; width: 100%; transition: background 0.2s;">
                            📥 APRI REFERTO
                        </a>
                        <button @click="anteprimaXML(partita.nomeFile)" style="background:#f39c12; color:white; padding:10px; border:none; border-radius:6px; cursor:pointer; font-weight: bold; width: 100%; transition: background 0.2s; text-transform: uppercase;">
                            👁️ Anteprima
                        </button>
                        <button @click="creaConfrontoAutomatico(partita.nomeFile.replace('referto_', '').replace('.xml', ''))" style="background:#8e44ad; color:white; padding:10px; border:none; border-radius:6px; cursor:pointer; font-weight: bold; width: 100%; transition: background 0.2s; text-transform: uppercase;">
                            ⚔️ Confronto
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="mostraRadar" id="radar-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 4000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);">
                <div style="background: white; padding: 30px; border-radius: 16px; width: 95%; max-width: 750px; text-align: center; position: relative; box-shadow: 0 15px 50px rgba(0,0,0,0.5);">
                    <button @click="chiudiRadar" style="position: absolute; top: 15px; right: 20px; background: none; border: none; font-size: 1.8rem; cursor: pointer; transition: transform 0.2s;">❌</button>
                    <h2 style="margin-bottom: 20px; color: var(--dark-bg); font-size: 1.8rem; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">Scontro Diretto</h2>
                    <div style="position: relative; height: 450px; width: 100%;">
                        <canvas id="radarChart"></canvas> 
                    </div>
                </div>
            </div>

            <div v-if="mostraModalAnteprima" class="popup-overlay" style="z-index: 4500;">
                <div class="popup-content" style="border-top: 8px solid #f39c12; max-width: 600px; width: 95%; padding: 30px; color: #333; position: relative;">
                    <button @click="mostraModalAnteprima = false" style="position: absolute; top: 15px; right: 20px; background: none; border: none; font-size: 1.6rem; cursor: pointer; color: #7f8c8d;">❌</button>
                    <span style="display: block; font-size: 0.85rem; font-weight: 800; color: #95a5a6; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 2px;">
                        📊 REFERTO ELETTRONICO XML • GARA DEL {{ datiAnteprima.data }}
                    </span>
                    <h2 style="color: var(--dark-bg); font-size: 1.8rem; font-weight: 900; margin-bottom: 20px; text-transform: uppercase;">
                        PARTITA ID: #{{ datiAnteprima.id }}
                    </h2>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: linear-gradient(135deg, #141923, #232a38); padding: 25px 30px; border-radius: 20px; color: white;">
                        <div style="text-align: center; width: 44%;">
                            <span style="display: block; font-size: 1.3rem; font-weight: 900; text-transform: uppercase;">{{ datiAnteprima.casa }}</span>
                            <span style="font-size: 4.2rem; font-weight: 900; color: #f1c40f; font-family: 'Courier New', monospace; line-height: 1;">{{ datiAnteprima.puntiCasa }}</span>
                        </div>
                        <div style="font-size: 1.4rem; font-weight: 900; color: rgba(255,255,255,0.2); font-style: italic;">VS</div>
                        <div style="text-align: center; width: 44%;">
                            <span style="display: block; font-size: 1.3rem; font-weight: 900; text-transform: uppercase;">{{ datiAnteprima.ospite }}</span>
                            <span style="font-size: 4.2rem; font-weight: 900; color: #f1c40f; font-family: 'Courier New', monospace; line-height: 1;">{{ datiAnteprima.puntiOspite }}</span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 20px; text-align: left;">
                        <div style="flex: 1; background: #f8f9fa; padding: 15px; border-radius: 14px; border-left: 5px solid var(--primary-color);">
                            <h4 style="font-size: 0.85rem; color: var(--primary-color); font-weight: 900; margin-bottom: 10px; text-transform: uppercase;">🔥 Leaders Casa</h4>
                            <div v-for="(leader, index) in datiAnteprima.giocatoriCasa" :key="'casa-'+index" style="display: flex; justify-content: space-between; font-size: 0.95rem; padding: 5px 0; border-bottom: 1px dashed #eee; font-weight: 600;">
                                <span>
                                    <strong style="color: #7f8c8d; font-size: 0.8rem; margin-right: 5px;">{{ leader.tipo }}</strong> 
                                    #{{ leader.numero }} {{ leader.nome }}
                                </span>
                                <strong style="color: #1e293b;">{{ leader.valore }}</strong>
                            </div>
                        </div>
                        <div style="flex: 1; background: #f8f9fa; padding: 15px; border-radius: 14px; border-left: 5px solid var(--danger-color);">
                            <h4 style="font-size: 0.85rem; color: var(--danger-color); font-weight: 900; margin-bottom: 10px; text-transform: uppercase;">🔥 Leaders Ospiti</h4>
                            <div v-for="(leader, index) in datiAnteprima.giocatoriOspite" :key="'ospiti-'+index" style="display: flex; justify-content: space-between; font-size: 0.95rem; padding: 5px 0; border-bottom: 1px dashed #eee; font-weight: 600;">
                                <span>
                                    <strong style="color: #7f8c8d; font-size: 0.8rem; margin-right: 5px;">{{ leader.tipo }}</strong> 
                                    #{{ leader.numero }} {{ leader.nome }}
                                </span>
                                <strong style="color: #1e293b;">{{ leader.valore }}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `,
    data() {
        return {
            storicoPartite: [],
            // Stato Modale XML
            mostraModalAnteprima: false,
            datiAnteprima: { id: '', data: '', casa: '', puntiCasa: '', ospite: '', puntiOspite: '', giocatoriCasa: [], giocatoriOspite: [] },
            // Stato Modale Radar
            mostraRadar: false,
            radarPlayerA: null,
            radarPlayerB: null,
            radarChartIstanza: null
        };
    },
    mounted() {
        this.aggiornaListaReferti();
    },
    methods: {
        async aggiornaListaReferti() {
            try {
                const files = await api.getListaReferti();
                if (files && files.length > 0) {
                    let nuovoStorico = [];
                    for (const ref of files) {
                        const idMatch = ref.replace('referto_', '').replace('.xml', '');
                        nuovoStorico.push({
                            id: idMatch, nomeFile: ref, mvpNome: 'Calcolo...', valutazioneMvp: 0,
                            squadraCasa: '...', squadraOspite: '...' 
                        });
                    }
                    nuovoStorico.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
                    this.storicoPartite = [...nuovoStorico];
                    
                    for (let i = 0; i < this.storicoPartite.length; i++) {
                        const partita = this.storicoPartite[i];
                        const idPuroDB = parseInt(partita.id, 10); 
                        try {
                            const partitaDB = await api.ottieniPartita(partita.id);
                            if (partitaDB && partitaDB.info) {
                                this.storicoPartite[i].squadraCasa = partitaDB.info.squadra_casa;
                                this.storicoPartite[i].squadraOspite = partitaDB.info.squadra_ospite;
                            }
                        } catch (e) {
                            this.storicoPartite[i].squadraCasa = "N/D";
                            this.storicoPartite[i].squadraOspite = "N/D";
                        }
                        const datiMvp = await api.getMVP(idPuroDB);
                        if (datiMvp && datiMvp.nome) {
                            this.storicoPartite[i].mvpNome = datiMvp.nome;
                            this.storicoPartite[i].valutazioneMvp = datiMvp.valutazione;
                        } else {
                            this.storicoPartite[i].mvpNome = 'N/D';
                        }
                    }
                }
            } catch (error) {
                console.error("Errore lista referti:", error);
            }
        },
        
        anteprimaXML(nomeFile) {
            fetch('/referti/' + nomeFile)
                .then(res => {
                    if (!res.ok) throw new Error("File XML non trovato.");
                    return res.text();
                })
                .then(str => {
                    let parser = new DOMParser();
                    let xmlDoc = parser.parseFromString(str, "text/xml");

                    let radice = xmlDoc.getElementsByTagName("referto_partita")[0];
                    let garaId = radice ? radice.getAttribute("id") : "N/D";
                    let tagData = xmlDoc.getElementsByTagName("data")[0];
                    let dataGara = tagData ? tagData.textContent.trim() : "N/D";
                    
                    let nodoCasa = xmlDoc.getElementsByTagName("squadra_casa")[0] || xmlDoc.getElementsByTagName("casa")[0];
                    let nodoOspiti = xmlDoc.getElementsByTagName("squadra_ospite")[0] || xmlDoc.getElementsByTagName("ospiti")[0];
                    
                    let squadraCasa = nodoCasa ? nodoCasa.getAttribute("nome") : "Team Casa";
                    let puntiCasa = nodoCasa ? nodoCasa.textContent.trim() : "0";
                    let squadraOspite = nodoOspiti ? nodoOspiti.getAttribute("nome") : "Team Ospiti";
                    let puntiOspite = nodoOspiti ? nodoOspiti.textContent.trim() : "0";

                    let nodiGiocatori = xmlDoc.getElementsByTagName("giocatore");
                    let rosterCasa = [];
                    let rosterOspiti = [];

                    // 1. Estrapoliamo PUNTI, RIMBALZI e ASSIST per tutti
                    for (let i = 0; i < nodiGiocatori.length; i++) {
                        let nG = nodiGiocatori[i];
                        let squadraAttr = nG.getAttribute("squadra");
                        let maglia = nG.getAttribute("maglia");
                        let nome = nG.getElementsByTagName("nome")[0]?.textContent.trim() || "";
                        
                        let punti = parseInt(nG.getElementsByTagName("punti")[0]?.textContent.trim(), 10) || 0;
                        let rimbalzi = parseInt(nG.getElementsByTagName("rimbalzi")[0]?.textContent.trim(), 10) || 0;
                        let assist = parseInt(nG.getElementsByTagName("assist")[0]?.textContent.trim(), 10) || 0;

                        let playerObj = { nome, numero: maglia, punti, rimbalzi, assist };

                        if (squadraAttr === 'Casa') rosterCasa.push(playerObj);
                        else rosterOspiti.push(playerObj);
                    }

                    // 2. Funzione per trovare i leader di una singola squadra
                    const calcolaLeaders = (roster) => {
                        if (roster.length === 0) return [];
                        
                        // Trova il giocatore con il valore massimo per ogni categoria
                        let bestPts = roster.reduce((max, p) => p.punti > max.punti ? p : max, roster[0]);
                        let bestReb = roster.reduce((max, p) => p.rimbalzi > max.rimbalzi ? p : max, roster[0]);
                        let bestAst = roster.reduce((max, p) => p.assist > max.assist ? p : max, roster[0]);

                        // Formattiamo l'output per l'HTML
                        return [
                            { tipo: 'PTS', numero: bestPts.numero, nome: bestPts.nome, valore: bestPts.punti + ' PTS' },
                            { tipo: 'REB', numero: bestReb.numero, nome: bestReb.nome, valore: bestReb.rimbalzi + ' REB' },
                            { tipo: 'AST', numero: bestAst.numero, nome: bestAst.nome, valore: bestAst.assist + ' AST' }
                        ];
                    };

                    this.datiAnteprima = {
                        id: garaId, 
                        data: dataGara, 
                        casa: squadraCasa, 
                        puntiCasa, 
                        ospite: squadraOspite, 
                        puntiOspite,
                        giocatoriCasa: calcolaLeaders(rosterCasa),     // <--- Applichiamo la funzione
                        giocatoriOspite: calcolaLeaders(rosterOspiti)  // <--- Applichiamo la funzione
                    };
                    
                    this.mostraModalAnteprima = true;
                })
                .catch(err => {
                    console.error(err);
                    this.$emit('invia-notifica', { msg: "Impossibile caricare anteprima XML.", type: "error" });
                });
        },

        creaConfrontoAutomatico(idPartita) {
            fetch(`/api/partita/${idPartita}`)
                .then(res => res.json())
                .then(data => {
                    const listaGiocatori = data.giocatori;
                    if (!listaGiocatori || listaGiocatori.length < 2) return;

                    const squadrePresenti = [...new Set(listaGiocatori.map(g => g.squadra))];
                    const giocatoriSquadraA = listaGiocatori.filter(g => g.squadra === squadrePresenti[0]);
                    const giocatoriSquadraB = listaGiocatori.filter(g => g.squadra === squadrePresenti[1]);

                    const calcolaVal = (p) => (p.punti + p.rimbalzi + p.assist + p.rubate + p.stoppate) - (p.falli + p.perse);
                    giocatoriSquadraA.sort((a, b) => calcolaVal(b) - calcolaVal(a));
                    giocatoriSquadraB.sort((a, b) => calcolaVal(b) - calcolaVal(a));
                    
                    this.radarPlayerA = giocatoriSquadraA[0];
                    this.radarPlayerB = giocatoriSquadraB[0];
                    
                    if (this.radarPlayerA && this.radarPlayerB) {
                        this.mostraRadar = true; 
                        this.$nextTick(() => { this.renderizzaGraficoRadar(); });
                        this.$emit('invia-notifica', { msg: `📊 Confronto: ${this.radarPlayerA.nome} vs ${this.radarPlayerB.nome}`, type: "success" });
                    }
                });
        },

        renderizzaGraficoRadar() {
            const canvas = document.getElementById('radarChart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (this.radarChartIstanza) this.radarChartIstanza.destroy();

            const p1 = this.radarPlayerA;
            const p2 = this.radarPlayerB;

            this.radarChartIstanza = new window.Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['PUNTI', 'RIMBALZI', 'ASSIST', 'RUBATE', 'STOPPATE'],
                    datasets: [
                        { label: `${p1.nome} (${p1.squadra})`, data: [p1.punti, p1.rimbalzi, p1.assist, p1.rubate, p1.stoppate], fill: true, backgroundColor: 'rgba(26, 42, 108, 0.3)', borderColor: '#1a2a6c', pointBackgroundColor: '#1a2a6c' },
                        { label: `${p2.nome} (${p2.squadra})`, data: [p2.punti, p2.rimbalzi, p2.assist, p2.rubate, p2.stoppate], fill: true, backgroundColor: 'rgba(231, 76, 60, 0.3)', borderColor: '#e74c3c', pointBackgroundColor: '#e74c3c' }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        },

        chiudiRadar() {
            this.mostraRadar = false;
            if (this.radarChartIstanza) {
                this.radarChartIstanza.destroy();
                this.radarChartIstanza = null;
            }
        }
    }
};