-- server/db/test.sql

-- 1. Tabella Partite
CREATE TABLE IF NOT EXISTS partite (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    squadra_casa TEXT NOT NULL,
    punteggio_casa INTEGER NOT NULL
);

-- 2. Tabella Giocatori
CREATE TABLE IF NOT EXISTS giocatori (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    numero_maglia TEXT NOT NULL,
    squadra TEXT NOT NULL,
    UNIQUE(numero_maglia, squadra)
);

-- 3. Tabella Statistiche (Associa i punti al giocatore nella partita)
CREATE TABLE IF NOT EXISTS statistiche_partite (
    id_partita INTEGER,
    id_giocatore INTEGER,
    punti INTEGER DEFAULT 0,
    FOREIGN KEY (id_partita) REFERENCES partite(id) ON DELETE CASCADE,
    FOREIGN KEY (id_giocatore) REFERENCES giocatori(id) ON DELETE CASCADE,
    PRIMARY KEY (id_partita, id_giocatore)
);
