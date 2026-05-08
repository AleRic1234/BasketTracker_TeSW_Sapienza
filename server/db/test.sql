
-- Tabella Partite
CREATE TABLE IF NOT EXISTS partite (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    squadra_casa TEXT NOT NULL,
    squadra_ospite TEXT NOT NULL, 
    punti_casa INTEGER DEFAULT 0,
    punti_ospite INTEGER DEFAULT 0 
);

-- Tabella Giocatori
CREATE TABLE IF NOT EXISTS giocatori (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    numero_maglia TEXT NOT NULL,
    squadra TEXT NOT NULL,
    UNIQUE(numero_maglia, squadra) -- Non possono esserci due giocatori della stessa squadra con lo stesso numero di maglia
);

-- Tabella Statistiche Partite
CREATE TABLE IF NOT EXISTS statistiche_partite (
    id_partita INTEGER,
    id_giocatore INTEGER,
    punti INTEGER DEFAULT 0,
    falli INTEGER DEFAULT 0,
    FOREIGN KEY (id_partita) REFERENCES partite(id) ON DELETE CASCADE,
    FOREIGN KEY (id_giocatore) REFERENCES giocatori(id) ON DELETE CASCADE,
    PRIMARY KEY (id_partita, id_giocatore)
);