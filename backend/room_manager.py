import secrets
import asyncio
import time
from typing import Dict, Optional, List, Tuple
from fastapi import WebSocket
from game_logic import validate_number, count_exact_matches
from bot_agent import BotAgent
from battleship_logic import (
    validate_fleet_placement,
    generate_random_fleet,
    BattleshipState,
    BattleshipBotAgent,
    SHIP_DEFINITIONS
)

class Room:
    def __init__(self, room_id: str, is_bot_game: bool = False, game_type: str = "numbers"):
        self.room_id: str = room_id
        self.is_bot_game: bool = is_bot_game
        self.game_type: str = game_type # 'numbers', 'words', 'battleship'
        self.players: Dict[str, dict] = {} # { player_id: {"name": str, "websocket": WebSocket, "secret": str} }
        self.state: str = "WAITING_FOR_PLAYERS" # WAITING_FOR_PLAYERS, WAITING_FOR_SECRETS, PLAYING, FINISHED
        self.current_turn: Optional[str] = None
        self.turn_start_time: float = time.time()
        self.player_order: List[str] = []
        self.guesses_history: List[dict] = [] # list of guess events
        self.chat_history: List[dict] = []
        self.winner: Optional[str] = None # player_id or "TIE"
        self.round_first_winner: Optional[str] = None # player_id who guessed target in turn 1 of round
        self.past_games_history: List[dict] = [] # List of completed past games
        self.host_id: Optional[str] = None
        
        # Battleship specific storage
        self.battleship_fleets: Dict[str, List[dict]] = {} # pid -> fleet list
        self.battleship_states: Dict[str, BattleshipState] = {} # pid -> BattleshipState
        self.battleship_shots: Dict[str, List[dict]] = {} # pid -> list of shots fired

        if is_bot_game:
            if game_type == "words":
                from word_game_logic import WordBotAgent
                self.bot_agent = WordBotAgent()
            elif game_type == "battleship":
                self.bot_agent = BattleshipBotAgent()
                self.battleship_fleets["BOT_AGENT"] = self.bot_agent.fleet
                self.battleship_states["BOT_AGENT"] = BattleshipState(self.bot_agent.fleet)
                self.battleship_shots["BOT_AGENT"] = []
            else:
                self.bot_agent = BotAgent()
        else:
            self.bot_agent = None

    def add_player(self, player_id: str, name: str, websocket: WebSocket) -> tuple[bool, str]:
        # 1. Reconnection check: if player with same name already exists in room
        existing_pid = None
        for pid, pinfo in self.players.items():
            if pinfo["name"] == name:
                existing_pid = pid
                break
        
        if existing_pid:
            self.players[existing_pid]["websocket"] = websocket
            if self.state == "PLAYER_DISCONNECTED":
                if hasattr(self, "previous_state") and self.previous_state:
                    self.state = self.previous_state
                else:
                    all_ready = all(
                        p_info["secret"] is not None 
                        for p_id, p_info in self.players.items() 
                        if p_id != "BOT_AGENT"
                    )
                    self.state = "PLAYING" if all_ready else "WAITING_FOR_SECRETS"
            return True, existing_pid

        # 2. New player join check:
        if len(self.players) >= 2 and not self.is_bot_game:
            return False, ""
        
        if not self.host_id and player_id != "BOT_AGENT":
            self.host_id = player_id
        
        self.players[player_id] = {
            "name": name,
            "websocket": websocket,
            "secret": None
        }
        self.player_order.append(player_id)
        self.battleship_shots[player_id] = []

        try:
            import threading
            from database import save_player
            threading.Thread(target=save_player, args=(name,), daemon=True).start()
        except Exception:
            pass

        if self.is_bot_game:
            bot_id = "BOT_AGENT"
            if self.game_type == "words":
                secret_val = self.bot_agent.secret_word
            elif self.game_type == "battleship":
                secret_val = "FLEET_LOCKED"
            else:
                secret_val = self.bot_agent.secret_number

            self.players[bot_id] = {
                "name": "AI Bot 🤖",
                "websocket": None,
                "secret": secret_val
            }
            self.player_order.append(bot_id)
            self.state = "WAITING_FOR_SECRETS"
        elif len(self.players) == 2:
            self.state = "WAITING_FOR_SECRETS"

        return True, player_id

    def remove_player(self, player_id: str):
        if player_id in self.players:
            if self.state == "WAITING_FOR_PLAYERS":
                del self.players[player_id]
                if player_id in self.player_order:
                    self.player_order.remove(player_id)
            else:
                self.players[player_id]["websocket"] = None
                if self.state != "FINISHED":
                    if self.state != "PLAYER_DISCONNECTED":
                        self.previous_state = self.state
                    self.state = "PLAYER_DISCONNECTED"

    def set_secret(self, player_id: str, secret: str) -> bool:
        secret = secret.strip().upper() if self.game_type == "words" else secret.strip()
        if self.game_type == "words":
            from word_game_logic import validate_word
            if not validate_word(secret):
                return False
        elif self.game_type == "numbers":
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

    def set_battleship_fleet(self, player_id: str, fleet: List[dict]) -> Tuple[bool, str]:
        valid, msg = validate_fleet_placement(fleet)
        if not valid:
            return False, msg

        if player_id in self.players:
            self.battleship_fleets[player_id] = fleet
            self.battleship_states[player_id] = BattleshipState(fleet)
            self.players[player_id]["secret"] = "FLEET_LOCKED"

            all_ready = all(
                p_info["secret"] is not None 
                for p_id, p_info in self.players.items() 
                if p_id != "BOT_AGENT"
            )

            if all_ready:
                self.state = "PLAYING"
                self.current_turn = self.player_order[0]
                self.turn_start_time = time.time()

            return True, "Flota a fost confirmată!"
        return False, "Jucătorul nu a fost găsit în cameră!"

    def process_battleship_shot(self, player_id: str, r: int, c: int) -> Optional[dict]:
        if self.state != "PLAYING" or self.current_turn != player_id:
            return None

        target_candidates = [pid for pid in self.player_order if pid != player_id]
        if not target_candidates:
            return None
        target_pid = target_candidates[0]

        if target_pid not in self.battleship_states:
            return None

        shot_res = self.battleship_states[target_pid].receive_shot(r, c)
        if shot_res["result"] == "ALREADY_SHOT":
            return None

        now = time.time()
        time_taken = round(now - self.turn_start_time, 1)
        if time_taken < 0.5:
            time_taken = 0.5

        shot_entry = {
            "player_id": player_id,
            "player_name": self.players[player_id]["name"],
            "r": r,
            "c": c,
            "coord": shot_res["coord"],
            "result": shot_res["result"], # "HIT" | "MISS" | "SUNK"
            "ship_name": shot_res.get("ship_name"),
            "ship_icon": shot_res.get("ship_icon"),
            "ship_id": shot_res.get("ship_id"),
            "is_sunk": shot_res["result"] == "SUNK",
            "sunk_cells": shot_res.get("sunk_cells"),
            "time_taken_seconds": time_taken,
            "turn_number": len(self.guesses_history) + 1
        }

        if player_id not in self.battleship_shots:
            self.battleship_shots[player_id] = []
        self.battleship_shots[player_id].append(shot_entry)
        self.guesses_history.append(shot_entry)

        self.turn_start_time = time.time()

        if shot_res.get("is_game_over"):
            self.state = "FINISHED"
            self.winner = player_id
            self._save_match_finish()
        else:
            self.current_turn = target_pid

        return shot_entry

    def process_guess(self, guessing_player_id: str, guess_val: str) -> Optional[dict]:
        if self.state != "PLAYING" or self.current_turn != guessing_player_id:
            return None

        guess_val = guess_val.strip().upper() if self.game_type == "words" else guess_val.strip()

        if self.game_type == "words":
            from word_game_logic import validate_word, count_matching_positions
            if not validate_word(guess_val):
                return None
        else:
            if not validate_number(guess_val):
                return None

        now = time.time()
        time_taken = round(now - self.turn_start_time, 1)
        if time_taken < 0.5:
            time_taken = 0.5

        target_player_id = [pid for pid in self.player_order if pid != guessing_player_id][0]
        target_secret = self.players[target_player_id]["secret"]

        if self.game_type == "words":
            exact_matches = count_matching_positions(target_secret, guess_val)
            target_len = 5
        else:
            exact_matches = count_exact_matches(target_secret, guess_val)
            target_len = 4

        is_win = (exact_matches == target_len)

        current_guess_index = len(self.guesses_history)
        round_num = (current_guess_index // 2) + 1
        turn_in_round = (current_guess_index % 2) + 1

        guess_entry = {
            "player_id": guessing_player_id,
            "player_name": self.players[guessing_player_id]["name"],
            "guess": guess_val,
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

        if self.state == "FINISHED":
            self._save_match_finish()

        return guess_entry

    def _save_match_finish(self):
        winner_name = "Egalitate 🤝" if self.winner == "TIE" else (
            self.players[self.winner]["name"] if self.winner in self.players else "Necunoscut"
        )
        total_rounds = (len(self.guesses_history) + 1) // 2
        
        p1_id = self.player_order[0] if len(self.player_order) > 0 else None
        p2_id = self.player_order[1] if len(self.player_order) > 1 else None
        
        p1_secret = self.players[p1_id]["secret"] if (p1_id and p1_id in self.players) else None
        p2_secret = self.players[p2_id]["secret"] if (p2_id and p2_id in self.players) else None

        should_save = True
        if self.is_bot_game and self.winner != "BOT_AGENT":
            should_save = False

        if should_save:
            try:
                import threading
                from database import save_match
                threading.Thread(
                    target=save_match, 
                    args=(self.room_id, winner_name, total_rounds, self.game_type, p1_secret, p2_secret), 
                    daemon=True
                ).start()
            except Exception as e:
                print("Error saving match to database:", e)

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
        self.battleship_fleets = {}
        self.battleship_states = {}
        self.battleship_shots = {pid: [] for pid in self.players}

        if self.is_bot_game:
            if self.game_type == "words":
                from word_game_logic import WordBotAgent
                self.bot_agent = WordBotAgent()
            elif self.game_type == "battleship":
                self.bot_agent = BattleshipBotAgent()
                self.battleship_fleets["BOT_AGENT"] = self.bot_agent.fleet
                self.battleship_states["BOT_AGENT"] = BattleshipState(self.bot_agent.fleet)
                self.battleship_shots["BOT_AGENT"] = []
            else:
                self.bot_agent = BotAgent()

        for pid, pinfo in self.players.items():
            if pid == "BOT_AGENT":
                if self.game_type == "words":
                    pinfo["secret"] = self.bot_agent.secret_word
                elif self.game_type == "battleship":
                    pinfo["secret"] = "FLEET_LOCKED"
                else:
                    pinfo["secret"] = self.bot_agent.secret_number
            else:
                pinfo["secret"] = None

        if len(self.player_order) == 2:
            self.player_order = [self.player_order[1], self.player_order[0]]

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
            winner_name = "Egalitate! Ambii jucători au ghicit în aceeași rundă!"
        elif self.winner and self.winner in self.players:
            winner_name = self.players[self.winner]["name"]

        target_candidates = [pid for pid in self.player_order if pid != requester_id]
        target_pid = target_candidates[0] if target_candidates else None

        # Battleship specific payload
        battleship_data = None
        if self.game_type == "battleship":
            my_fleet = self.battleship_fleets.get(requester_id, [])
            my_shots = self.battleship_shots.get(requester_id, [])
            opponent_shots = self.battleship_shots.get(target_pid, []) if target_pid else []
            
            my_sunk = self.battleship_states[requester_id].sunk_ships if requester_id in self.battleship_states else []
            opp_sunk = self.battleship_states[target_pid].sunk_ships if (target_pid and target_pid in self.battleship_states) else []

            battleship_data = {
                "my_fleet": my_fleet,
                "my_shots": my_shots,
                "opponent_shots": opponent_shots,
                "my_sunk_ships": my_sunk,
                "opponent_sunk_ships": opp_sunk,
                "ship_definitions": SHIP_DEFINITIONS
            }

        return {
            "room_id": self.room_id,
            "is_bot_game": self.is_bot_game,
            "game_type": self.game_type,
            "state": self.state,
            "current_turn": self.current_turn,
            "current_turn_name": self.players[self.current_turn]["name"] if (self.current_turn and self.current_turn in self.players) else None,
            "players": players_data,
            "player_order": self.player_order,
            "guesses_history": self.guesses_history,
            "past_games_history": self.past_games_history,
            "winner": self.winner,
            "winner_name": winner_name,
            "round_first_winner": self.round_first_winner,
            "battleship": battleship_data
        }


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def generate_room_code(self) -> str:
        code = secrets.token_hex(3).upper()
        while code in self.rooms:
            code = secrets.token_hex(3).upper()
        return code

    def create_room(self, is_bot_game: bool = False, game_type: str = "numbers") -> str:
        room_id = self.generate_room_code()
        self.rooms[room_id] = Room(room_id, is_bot_game, game_type)
        return room_id

    def get_room(self, room_id: str) -> Optional[Room]:
        return self.rooms.get(room_id.upper())

    def get_waiting_rooms(self, game_type: Optional[str] = None) -> List[dict]:
        waiting = []
        for room_id, room in list(self.rooms.items()):
            if room.state == "WAITING_FOR_PLAYERS" and not room.is_bot_game and len(room.players) == 1:
                if game_type and room.game_type != game_type:
                    continue
                host_id = room.player_order[0] if room.player_order else list(room.players.keys())[0]
                host_name = room.players[host_id]["name"] if host_id in room.players else "Jucător"
                waiting.append({
                    "room_id": room_id,
                    "host_name": host_name,
                    "game_type": room.game_type
                })
        return waiting

    def cleanup_room(self, room_id: str, force: bool = False):
        if room_id in self.rooms:
            room = self.rooms[room_id]
            if force or len(room.players) == 0 or (room.host_id and room.host_id not in room.players):
                del self.rooms[room_id]
