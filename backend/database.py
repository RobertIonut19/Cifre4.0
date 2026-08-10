import sqlite3
import os
from typing import List, Dict

DB_FILE = os.path.join(os.path.dirname(__file__), "game_history.db")

def init_db():
    """Initializes SQLite tables for persistent players and match history."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Table for registered player names
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Pre-populate default preset players
    cursor.execute("INSERT OR IGNORE INTO players (name) VALUES ('Alina ❤️')")
    cursor.execute("INSERT OR IGNORE INTO players (name) VALUES ('Robabe 🤍')")

    # Table for persistent match results
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id TEXT,
            game_type TEXT DEFAULT 'numbers',
            winner_name TEXT NOT NULL,
            total_rounds INTEGER,
            played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Migration helper if matches table exists without game_type
    try:
        cursor.execute("ALTER TABLE matches ADD COLUMN game_type TEXT DEFAULT 'numbers'")
    except Exception:
        pass
    
    conn.commit()
    conn.close()

def save_player(name: str) -> bool:
    """Saves a new player name to the database."""
    name = name.strip()
    if not name:
        return False
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT OR IGNORE INTO players (name) VALUES (?)", (name,))
        conn.commit()
        return True
    finally:
        conn.close()

def get_all_players() -> List[str]:
    """Retrieves all registered player names."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM players ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [row[0] for row in rows]

def save_match(room_id: str, winner_name: str, total_rounds: int, game_type: str = "numbers"):
    """Saves a completed game result."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO matches (room_id, winner_name, total_rounds, game_type) VALUES (?, ?, ?, ?)",
        (room_id, winner_name, total_rounds, game_type)
    )
    conn.commit()
    conn.close()

def get_scores_stats(game_type: str = None) -> Dict[str, int]:
    """Returns total wins per player and ties, optionally filtered by game_type."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    if game_type:
        cursor.execute("SELECT winner_name, COUNT(*) FROM matches WHERE game_type = ? GROUP BY winner_name", (game_type,))
    else:
        cursor.execute("SELECT winner_name, COUNT(*) FROM matches GROUP BY winner_name")
    rows = cursor.fetchall()
    conn.close()
    return {winner: count for winner, count in rows}

