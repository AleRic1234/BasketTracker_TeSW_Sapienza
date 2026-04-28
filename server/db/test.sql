-- server/db/test.sql

-- Tabella per i giocatori
CREATE TABLE IF NOT EXISTS giocatori (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    numero_maglia INTEGER NOT NULL,
    squadra TEXT NOT NULL,
    -- vincolo: non esistono due giocatori con lo stesso numero di maglia nella stessa squadra
    UNIQUE(numero_maglia, squadra)
);

-- Tabella per le partite
CREATE TABLE IF NOT EXISTS partite (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    squadra_casa TEXT NOT NULL,
    squadra_ospite TEXT NOT NULL,
    punteggio_casa INTEGER NOT NULL,
    punteggio_ospite INTEGER NOT NULL
);

-- Tabella di associazione (N:M) per i referti individuali
CREATE TABLE IF NOT EXISTS statistiche_partite (
    id_partita INTEGER,
    id_giocatore INTEGER,
    punti INTEGER DEFAULT 0,
    falli INTEGER DEFAULT 0,
    rimbalzi INTEGER DEFAULT 0,
    assist INTEGER DEFAULT 0,
    FOREIGN KEY (id_partita) REFERENCES partite(id),
    FOREIGN KEY (id_giocatore) REFERENCES giocatori(id),
    PRIMARY KEY (id_partita, id_giocatore)
);

-- Dati di esempio per i giocatori
INSERT INTO giocatori (nome, cognome, numero_maglia, squadra) VALUES 
('Mario', 'Rossi', 10, 'Sapienza Bulls'),
('Luigi', 'Verdi', 23, 'Sapienza Bulls'),
('Carlo', 'Bianchi', 5, 'Roma Stars');

