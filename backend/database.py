import os
import sqlite3
from typing import List, Dict

DATABASE_URL = os.getenv("DATABASE_URL")

def is_postgres() -> bool:
    return bool(DATABASE_URL)

def get_connection():
    if is_postgres():
        import psycopg2
        url = DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return psycopg2.connect(url, connect_timeout=3)
    else:
        db_file = os.path.join(os.path.dirname(__file__), "game_history.db")
        return sqlite3.connect(db_file)

def init_db():
    """Initializes tables for persistent players and match history (PostgreSQL in cloud or SQLite locally)."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        if is_postgres():
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS players (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute("INSERT INTO players (name) VALUES ('Alina ❤️') ON CONFLICT (name) DO NOTHING;")
            cursor.execute("INSERT INTO players (name) VALUES ('Robabe 🤍') ON CONFLICT (name) DO NOTHING;")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS matches (
                    id SERIAL PRIMARY KEY,
                    room_id VARCHAR(50),
                    game_type VARCHAR(50) DEFAULT 'numbers',
                    winner_name VARCHAR(255) NOT NULL,
                    total_rounds INT,
                    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
        else:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS players (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("INSERT OR IGNORE INTO players (name) VALUES ('Alina ❤️')")
            cursor.execute("INSERT OR IGNORE INTO players (name) VALUES ('Robabe 🤍')")

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

        conn.commit()
        conn.close()
    except Exception as e:
        print("Database initialization notice:", e)

def save_player(name: str) -> bool:
    name = name.strip()
    if not name:
        return False
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if is_postgres():
            cursor.execute("INSERT INTO players (name) VALUES (%s) ON CONFLICT (name) DO NOTHING;", (name,))
        else:
            cursor.execute("INSERT OR IGNORE INTO players (name) VALUES (?)", (name,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("Database save_player notice:", e)
        return False

def get_all_players() -> List[str]:
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM players ORDER BY id ASC")
        rows = cursor.fetchall()
        conn.close()
        return [row[0] for row in rows]
    except Exception as e:
        print("Database get_all_players notice:", e)
        return ["Alina ❤️", "Robabe 🤍"]

def save_match(room_id: str, winner_name: str, total_rounds: int, game_type: str = "numbers"):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if is_postgres():
            cursor.execute(
                "INSERT INTO matches (room_id, winner_name, total_rounds, game_type) VALUES (%s, %s, %s, %s)",
                (room_id, winner_name, total_rounds, game_type)
            )
        else:
            cursor.execute(
                "INSERT INTO matches (room_id, winner_name, total_rounds, game_type) VALUES (?, ?, ?, ?)",
                (room_id, winner_name, total_rounds, game_type)
            )
        conn.commit()
        conn.close()
    except Exception as e:
        print("Database save_match notice:", e)

def get_scores_stats(game_type: str = None) -> Dict[str, int]:
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if is_postgres():
            if game_type:
                cursor.execute("SELECT winner_name, COUNT(*) FROM matches WHERE game_type = %s GROUP BY winner_name", (game_type,))
            else:
                cursor.execute("SELECT winner_name, COUNT(*) FROM matches GROUP BY winner_name")
        else:
            if game_type:
                cursor.execute("SELECT winner_name, COUNT(*) FROM matches WHERE game_type = ? GROUP BY winner_name", (game_type,))
            else:
                cursor.execute("SELECT winner_name, COUNT(*) FROM matches GROUP BY winner_name")
        rows = cursor.fetchall()
        conn.close()
        return {winner: count for winner, count in rows}
    except Exception as e:
        print("Database get_scores_stats notice:", e)
        return {}
