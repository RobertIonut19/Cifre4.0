import os
from pathlib import Path
import psycopg2
from typing import List, Dict

# Incarcare automata a variabilelor din backend/.env daca exista
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    with open(_env_path, "r", encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                _k = _k.strip()
                _v = _v.strip().strip('"').strip("'")
                if _k not in os.environ:
                    os.environ[_k] = _v

def get_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise ValueError("Variabila DATABASE_URL nu este setata in backend/.env!")
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
                p1_secret VARCHAR(255),
                p2_secret VARCHAR(255),
                played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("ALTER TABLE matches ADD COLUMN IF NOT EXISTS p1_secret VARCHAR(255);")
        cursor.execute("ALTER TABLE matches ADD COLUMN IF NOT EXISTS p2_secret VARCHAR(255);")
        cursor.execute("ALTER TABLE matches ALTER COLUMN p1_secret TYPE VARCHAR(255);")
        cursor.execute("ALTER TABLE matches ALTER COLUMN p2_secret TYPE VARCHAR(255);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_matches_game_type ON matches(game_type);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_matches_winner_name ON matches(winner_name);")

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

def save_match(room_id: str, winner_name: str, total_rounds: int, game_type: str = "numbers", p1_secret: str = None, p2_secret: str = None):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        clean_p1 = str(p1_secret)[:255] if p1_secret else None
        clean_p2 = str(p2_secret)[:255] if p2_secret else None
        cursor.execute(
            "INSERT INTO matches (room_id, winner_name, total_rounds, game_type, p1_secret, p2_secret) VALUES (%s, %s, %s, %s, %s, %s)",
            (room_id, winner_name, total_rounds, game_type, clean_p1, clean_p2)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print("PostgreSQL save_match notice:", e)

def get_scores_stats(game_type: str = None) -> Dict[str, int]:
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if game_type and game_type.upper() != "ALL":
            cursor.execute("SELECT winner_name, COUNT(*) FROM matches WHERE game_type = %s GROUP BY winner_name", (game_type,))
        else:
            cursor.execute("SELECT winner_name, COUNT(*) FROM matches GROUP BY winner_name")
        rows = cursor.fetchall()
        conn.close()
        return {winner: count for winner, count in rows}
    except Exception as e:
        print("PostgreSQL get_scores_stats notice:", e)
        return {}
