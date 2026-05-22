# 🏀 BasketTracker

![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vue.js&logoColor=4FC08D)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

**BasketTracker** è un'applicazione web full-stack (Single Page Application) sviluppata come progetto per il corso di *Tecnologie e Sistemi Web* (Ingegneria Informatica, Sapienza Università di Roma). 

L'obiettivo del progetto è la **registrazione, l'analisi e la trasmissione in tempo reale** delle statistiche delle partite di basket amatoriali, eliminando i referti cartacei e offrendo un'esperienza interattiva sia per gli addetti ai lavori che per gli spettatori.

---

## 🌟 Funzionalità Principali

* **📡 Trasmissione Live (WebSockets):** Sincronizzazione in tempo reale tra il tavolo dei giudici (Admin) e gli spettatori a casa (User), con aggiornamento istantaneo di punteggi, falli e cronometro.
* **👥 Gestione Ruoli:**
  * **Admin:** Gestisce il tabellone, avvia/ferma il cronometro, assegna punti/falli/statistiche e salva la partita.
  * **Spettatore:** Inserisce il codice della partita e segue l'andamento in diretta senza poter alterare i dati.
* **📊 Dashboard e Data Visualization:** Classifiche del torneo e grafici interattivi (tramite *Chart.js*) per analizzare le prestazioni dei migliori marcatori.
* **📄 Esportazione Referti (XML/XSLT):** Al termine della gara, il sistema genera un referto ufficiale in formato XML, che viene visualizzato nel browser in un formato tabellare elegante grazie all'applicazione di un foglio di stile XSLT.
* **📱 Responsive & Glassmorphism Design:** Interfaccia utente moderna, modulare e fruibile da qualsiasi dispositivo (PC, Tablet orizzontale per il tavolo giudici, Smartphone).

---

## 🛠️ Architettura e Tecnologie

Il progetto rispetta i paradigmi dell'ingegneria del software web, separando nettamente il front-end dal back-end:

* **Front-end:** * **Vue.js 3:** Per il data-binding reattivo e l'architettura a componenti.
  * **CSS3 (Modulare):** Layout basato su Flexbox e Grid, suddiviso in moduli (`_layout`, `_court`, `_components`, ecc.) per una facile manutenzione.
* **Back-end:** * **Node.js & Express:** Per la gestione delle rotte e dell'API REST.
  * **Socket.io:** Per la comunicazione bidirezionale a bassa latenza.
  * **Pattern MVC:** Netta separazione tra le logiche di rete (Controller) e l'interazione con i dati (Model).
* **Database:** * **SQLite:** Database relazionale per garantire l'integrità dei dati (partite, squadre, giocatori).

---

## 🚀 Installazione e Avvio Rapido

L'applicazione è progettata per avviarsi in modo semplice, servendo sia le API che il client statico tramite un unico comando Node.js.

### 1. Prerequisiti
* Assicurati di avere [Node.js](https://nodejs.org/) installato sul tuo computer.

### 2. Installazione delle dipendenze
Apri il terminale, naviga nella cartella `server` e installa i pacchetti necessari:
```bash
cd server
npm install
```

### 3. Avvio dell'Applicazione
Dal terminale, sempre all'interno della cartella `server`, esegui:
```bash
node server.js
```
*Nota: Il file `server.js` è già configurato per servire automaticamente i file statici della cartella `client`. Non è necessario avviare server paralleli (es. http-server).*

### 4. Accesso
Apri il browser e vai all'indirizzo:
👉 **http://localhost:3000**

*(Il terminale mostrerà anche il tuo indirizzo IP locale, ad es. `http://192.168.1.xxx:3000`, che puoi usare per accedere dal tuo tablet o smartphone connessi alla stessa rete Wi-Fi).*

Per spegnere il server, premi `CTRL + C` nel terminale.

---

## 📖 Guida all'Uso

### 👑 Accesso Admin (Ufficiali di Campo)
1. Nella schermata di Login, inserisci le credenziali:
   * Username: `admin`
   * Password: `1234`
2. Clicca su **"Nuova Partita"** per generare un codice partita univoco.
3. Utilizza il **Campo Interattivo** per selezionare i giocatori in campo/panchina e assegna le statistiche (Punti, Falli, Rimbalzi) cliccando sui giocatori.
4. Usa i controlli in alto per gestire il **Cronometro** e i Quarti di gioco.
5. Al termine, clicca su **"Salva Partita"** per archiviare il match e sbloccare la stampa del referto XML.

### 👁️ Accesso Spettatore
1. Nella schermata di Login, inserisci le credenziali:
   * Username: `utente`
   * Password: `0000`
2. Inserisci il **Codice Partita** comunicato dall'Admin.
3. Goditi la partita in diretta: il tuo schermo si aggiornerà magicamente ad ogni fischio e ad ogni canestro!

---