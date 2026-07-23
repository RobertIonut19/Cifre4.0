import secrets
import asyncio
import time
from typing import Dict, Optional, List
from fastapi import WebSocket
from game_logic import validate_number, count_exact_matches
from bot_agent import BotAgent

class Room:
    def __init__(self, room_id: str, is_bot_game: bool = False):
        self.room_id: str = room_id
        self.is_bot_game: bool = is_bot_game
        self.players: Dict[str, dict] = {} # { player_id: {"name": str, "websocket": WebSocket, "secret": str} }
        self.state: str = "WAITING_FOR_PLAYERS" # WAITING_FOR_PLAYERS, WAITING_FOR_SECRETS, PLAYING, FINISHED
        self.current_turn: Optional[str] = None
        self.turn_start_time: float = time.time()
        self.player_order: List[str] = []
        self.guesses_history: List[dict] = [] # list of guess events
        self.chat_history: List[dict] = []
        self.winner: Optional[str] = None # player_id or "TIE"
        self.round_first_winner: Optional[str] = None # player_id who guessed 4 in turn 1 of round
        self.past_games_history: List[dict] = [] # List of completed past games
        self.bot_agent: Optional[BotAgent] = BotAgent() if is_bot_game else None

    def add_player(self, player_id: str, name: str, websocket: WebSocket) -> bool:
        if len(self.players) >= 2 and not self.is_bot_game:
            return False
        
        self.players[player_id] = {
            "name": name,
            "websocket": websocket,
            "secret": None
        }
        self.player_order.append(player_id)

        if self.is_bot_game:
            bot_id = "BOT_AGENT"
            self.players[bot_id] = {
                "name": "AI Bot 🤖",
                "websocket": None,
                "secret": self.bot_agent.secret_number
            }
            self.player_order.append(bot_id)
            self.state = "WAITING_FOR_SECRETS"
        elif len(self.players) == 2:
            self.state = "WAITING_FOR_SECRETS"

        return True

    def remove_player(self, player_id: str):
        if player_id in self.players:
            del self.players[player_id]
            if player_id in self.player_order:
                self.player_order.remove(player_id)
            if self.state != "FINISHED":
                self.state = "PLAYER_DISCONNECTED"

    def set_secret(self, player_id: str, secret: str) -> bool:
        if not validate_number(secret):
            return False
        if player_id in self.players:
            self.players[player_id]["secret"] = secret
            
            # Check if all non-bot secrets are ready
            all_ready = all(
                p_info["secret"] is not None 
                for p_id, p_info in self.players.items() 
                if p_id != "BOT_AGENT"
            )
            
            if all_ready:
                self.state = "PLAYING"
                self.current_turn = self.player_order[0]
                self.turn_start_time = time.time()
            return True
        return False

    def process_guess(self, guessing_player_id: str, guess_num: str) -> Optional[dict]:
        if self.state != "PLAYING" or self.current_turn != guessing_player_id:
            return None

        if not validate_number(guess_num):
            return None

        now = time.time()
        time_taken = round(now - self.turn_start_time, 1)
        if time_taken < 0.5:
            time_taken = 0.5

        target_player_id = [pid for pid in self.player_order if pid != guessing_player_id][0]
        target_secret = self.players[target_player_id]["secret"]

        exact_matches = count_exact_matches(target_secret, guess_num)
        is_win = (exact_matches == 4)

        current_guess_index = len(self.guesses_history)
        round_num = (current_guess_index // 2) + 1
        turn_in_round = (current_guess_index % 2) + 1

        guess_entry = {
            "player_id": guessing_player_id,
            "player_name": self.players[guessing_player_id]["name"],
            "guess": guess_num,
            "exact_matches": exact_matches,
            "is_win": is_win,
            "turn_number": current_guess_index + 1,
            "round_number": round_num,
            "turn_in_round": turn_in_round,
            "time_taken_seconds": time_taken
        }
        self.guesses_history.append(guess_entry)

        self.turn_start_time = time.time()

        if turn_in_round == 1:
            if is_win:
                self.round_first_winner = guessing_player_id
            self.current_turn = target_player_id
        else: # turn_in_round == 2 (End of Round)
            if self.round_first_winner:
                if is_win:
                    self.state = "FINISHED"
                    self.winner = "TIE"
                else:
                    self.state = "FINISHED"
                    self.winner = self.round_first_winner
            else:
                if is_win:
                    self.state = "FINISHED"
                    self.winner = guessing_player_id
                else:
                    self.current_turn = target_player_id
                    self.round_first_winner = None

        return guess_entry

    def restart_game(self):
        """Archives current game and resets for a new game in the same room."""
        if self.state == "FINISHED":
            winner_name = "Egalitate"
            if self.winner == "TIE":
                winner_name = "Egalitate 🤝"
            elif self.winner and self.winner in self.players:
                winner_name = self.players[self.winner]["name"]

            past_entry = {
                "game_number": len(self.past_games_history) + 1,
                "winner": self.winner,
                "winner_name": winner_name,
                "total_rounds": (len(self.guesses_history) + 1) // 2,
                "player_secrets": {
                    pid: {
                        "name": pinfo["name"],
                        "secret": pinfo["secret"]
                    } for pid, pinfo in self.players.items()
                }
            }
            self.past_games_history.append(past_entry)

        # Reset for next game
        self.guesses_history = []
        self.winner = None
        self.round_first_winner = None

        if self.is_bot_game:
            self.bot_agent = BotAgent()

        for pid, pinfo in self.players.items():
            if pid == "BOT_AGENT":
                pinfo["secret"] = self.bot_agent.secret_number
            else:
                pinfo["secret"] = None

        self.state = "WAITING_FOR_SECRETS"

    def get_public_state(self, requester_id: str) -> dict:
        players_data = {}
        for pid, info in self.players.items():
            players_data[pid] = {
                "name": info["name"],
                "has_secret": info["secret"] is not None,
                "secret": info["secret"] if (pid == requester_id or self.state == "FINISHED") else None
            }

        winner_name = None
        if self.winner == "TIE":
            winner_name = "Egalitate! Ambii jucători au ghicit numărul în aceeași rundă!"
        elif self.winner and self.winner in self.players:
            winner_name = self.players[self.winner]["name"]

        return {
            "room_id": self.room_id,
            "is_bot_game": self.is_bot_game,
            "state": self.state,
            "current_turn": self.current_turn,
            "current_turn_name": self.players[self.current_turn]["name"] if (self.current_turn and self.current_turn in self.players) else None,
            "players": players_data,
            "player_order": self.player_order,
            "guesses_history": self.guesses_history,
            "past_games_history": self.past_games_history,
            "winner": self.winner,
            "winner_name": winner_name,
            "round_first_winner": self.round_first_winner
        }


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def generate_room_code(self) -> str:
        """Generates a short random 6-character room code."""
        code = secrets.token_hex(3).upper()
        while code in self.rooms:
            code = secrets.token_hex(3).upper()
        return code

    def create_room(self, is_bot_game: bool = False) -> str:
        room_id = self.generate_room_code()
        self.rooms[room_id] = Room(room_id, is_bot_game)
        return room_id

    def get_room(self, room_id: str) -> Optional[Room]:
        return self.rooms.get(room_id.upper())

    def cleanup_room(self, room_id: str):
        if room_id in self.rooms and len(self.rooms[room_id].players) == 0:
            del self.rooms[room_id]
