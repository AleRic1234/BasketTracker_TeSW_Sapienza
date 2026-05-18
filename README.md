# BasketTracker
Progetto del corso Tecnologie e Sistemi Web Ing Inf Sapienza:
applicazione web full-stack sviluppata per la registrazione e l'analisi in tempo reale delle statistiche nelle partite di basket amatoriali.

AVVIO PROGRAMMA:
$: node server/server.js
avvia in un colpo solo client e server

(non serve più, path integrato in server.js)
//////////////////////////////////////
AVVIO CLIENT: 
$: cd client
$: npx http-server -c-1
//////////////////////////////////////

aprire link: http://192.168.1.167:3000 --> anche per dispositivi mobile

SPEGNERE I TERMINALI CON: CTRL+C

Per testare i due design per le stats:
Dentro client/js/data-viz
all'interno della prima funzione mostraNotifica
cercare questa riga

let $toast = $(`<div class='toast-glass ${tipo}'> <span style="font-size:1.2rem;">${icona}</span> <span>${messaggio}</span> </div>`);

Se lasci scritto class='toast-glass ${tipo}', vedrai l'effetto elegante semitrasparente.

Se cambi quella parola in class='toast-pill ${tipo}', vedrai l'effetto aggressivo a forma di pillola scura.
