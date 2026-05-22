// Percorso: client/src/components/LandingPage.js

export default {
    template: `
        <section class="landing-container fade-in">
            <div class="landing-hero" style="margin-top: 150px;">
                <h2>Il Basket in Tempo Reale</h2>
                <p><strong>Crea, gestisci, trasmetti.</strong> Scopri la piattaforma innovativa che rivoluziona il tuo modo di vivere il basket. Crea le tue partite, confronta le statistiche, ottieni referti automatici e fai vibrare i tuoi spettatori con il live streaming integrato. Tutto in un unico posto.</p>
                <button class="btn-cta" @click="$emit('vai-al-login')">Entra nella Piattaforma 🏀</button>
            </div>

            <div class="features-gallery">
                <div class="feature-card">
                    <h3 style="color: #3498db; font-weight: 800;">Campo Live</h3>
                    <p style="font-size: 0.95rem; margin-top: 5px; color: #575353;">Un'interfaccia interattiva del campo da gioco per registrare o assistere alla partita in tempo reale.</p>
                    <img src="assets/campo.png" alt="Campo Live" style="width: 100%; height: 180px; object-fit: cover; border-radius: 16px; margin-top: 15px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                </div>

                <div class="feature-card">
                    <h3 style="color: #f1c40f; font-weight: 800;">Archivio & MVP</h3>
                    <p style="font-size: 0.95rem; margin-top: 5px; color: #575353;">Tutti i match vengono archiviati in formato XML rigido. Il sistema calcola all'istante l'MVP estraendolo via SQL dal database.</p>
                    <img src="assets/archivio.png" alt="Archivio Referti" style="width: 100%; height: 180px; object-fit: cover; border-radius: 16px; margin-top: 15px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                </div>

                <div class="feature-card">
                    <h3 style="color: #2ecc71; font-weight: 800;">Classifiche & Grafici</h3>
                    <p style="font-size: 0.95rem; margin-top: 5px; color: #575353;">Classifica live delle squadre e grafico a barre dei migliori 5 marcatori sempre a portata di click</p>
                    <img src="assets/classifica.png" alt="Classifiche e Grafici" style="width: 100%; height: 180px; object-fit: cover; border-radius: 16px; margin-top: 15px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                </div>
            </div>

            <div class="instructions-section">
                <h3>Come Funziona il Sistema</h3>
                <div class="roles-grid">
                    <div class="role-box">
                        <h4 style="color: #3498db;">👥 Spettatore (Viewer)</h4>
                        <p style="font-size: 0.9rem; margin-bottom: 15px; color: #321a76;">Ideale per il pubblico, i tifosi o gli atleti che vogliono seguire la gara da remoto.</p>
                        <ul>
                            <li style="color: #3498db;">Accesso rapido e intuitivo.</li>
                            <li>Ricezione asincrona dei dati sul campo tramite WebSockets.</li>
                            <li>Popup automatici visivi (Fischio d'inizio e Sirena finale).</li>
                            <li>Consultazione dello storico referti e confronto radar dei migliori giocartori.</li>
                        </ul>
                    </div>

                    <div class="role-box admin-emphasis">
                        <h4 style="color: #f39c12;">⚡ Amministratore (Admin)</h4>
                        <p style="font-size: 0.9rem; margin-bottom: 15px; color: #e67e22; font-weight: bold;">Il centro di controllo operativo della partita.</p>
                        <ul>
                            <li style="color: #f39c12; font-weight: bold;">Richiede credenziali di sicurezza per l'autenticazione.</li>
                            <li>Creazione guidata dei roster partita con controlli di sicurezza.</li>
                            <li>Gestione completa del cronometro di gioco.</li>
                            <li>Assegnazione real-time di Punti (PTS), Rimbalzi (REB), Assist (AST) e Falli (FLS) con tracciamento automatico dell'espulsione (OUT).</li>
                            <li>Esportazione nativa del referto in formato ufficiale XML al termine della gara.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    `
};