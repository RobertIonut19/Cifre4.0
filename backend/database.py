import os
import psycopg2
from typing import List, Dict

# Pure PostgreSQL Database Connection
DEFAULT_PG_URL = "postgresql://cifre_db_user:sBlu165teR2wKbhc1RRwS36K9jJXuGUr@dpg-d9urqvdbedkc73aul88g-a.frankfurt-postgres.render.com/cifre_db"

def get_connection():
    url = os.getenv("DATABASE_URL", DEFAULT_PG_URL)
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return psycopg2.connect(url, connect_timeout=5)

def init_db():
    """Initializes tables for persistent players and match history using PostgreSQL."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

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

        conn.commit()
        conn.close()
    except Exception as e:
        print("PostgreSQL initialization notice:", e)

def save_player(name: str) -> bool:
    name = name.strip()
    if not name:
        return False
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO players (name) VALUES (%s) ON CONFLICT (name) DO NOTHING;", (name,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("PostgreSQL save_player notice:", e)
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
        print("PostgreSQL get_all_players notice:", e)
        return ["Alina ❤️", "Robabe 🤍"]

def save_match(room_id: str, winner_name: str, total_rounds: int, game_type: str = "numbers"):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO matches (room_id, winner_name, total_rounds, game_type) VALUES (%s, %s, %s, %s)",
            (room_id, winner_name, total_rounds, game_type)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print("PostgreSQL save_match notice:", e)

def get_scores_stats(game_type: str = None) -> Dict[str, int]:
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if game_type:
            cursor.execute("SELECT winner_name, COUNT(*) FROM matches WHERE game_type = %s GROUP BY winner_name", (game_type,))
        else:
            cursor.execute("SELECT winner_name, COUNT(*) FROM matches GROUP BY winner_name")
        rows = cursor.fetchall()
        conn.close()
        return {winner: count for winner, count in rows}
    except Exception as e:
        print("PostgreSQL get_scores_stats notice:", e)
        return {}
