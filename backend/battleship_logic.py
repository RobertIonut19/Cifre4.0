"""
Battleship (Bătălie Navală) Engine and AI Bot.
Grid: 10x10 (Rows 0-9 [1-10], Cols 0-9 [A-J])
Ships:
  - Carrier (Portavion): 5 cells
  - Battleship (Cuirasat): 4 cells
  - Cruiser (Crucișător): 3 cells
  - Submarine (Submarin): 3 cells
  - Destroyer (Distrugător): 2 cells
Total Segments = 17
"""
import random
from typing import Dict, List, Tuple, Optional

SHIP_DEFINITIONS = [
    {"id": "carrier", "name": "Portavion", "icon": "🚢", "size": 5},
    {"id": "battleship", "name": "Cuirasat", "icon": "🛳️", "size": 4},
    {"id": "cruiser", "name": "Crucișător", "icon": "⛴️", "size": 3},
    {"id": "submarine", "name": "Submarin", "icon": "🚤", "size": 3},
    {"id": "destroyer", "name": "Distrugător", "icon": "⛵", "size": 2}
]

GRID_SIZE = 10
TOTAL_SHIP_CELLS = 17

def get_ship_cells(start_r: int, start_c: int, size: int, orientation: str) -> List[Tuple[int, int]]:
    """Calculates grid coordinates occupied by a ship."""
    cells = []
    for i in range(size):
        if orientation == "H":
            cells.append((start_r, start_c + i))
        else:
            cells.append((start_r + i, start_c))
    return cells

def validate_fleet_placement(fleet: List[dict]) -> Tuple[bool, str]:
    """
    Validates that a player has placed all 5 required ships within the 10x10 board without overlaps.
    Each ship dict: {"id": str, "r": int, "c": int, "orientation": "H"|"V"}
    """
    if not isinstance(fleet, list) or len(fleet) != len(SHIP_DEFINITIONS):
        return False, f"Flota trebuie să conțină exact {len(SHIP_DEFINITIONS)} nave!"

    expected_sizes = {s["id"]: s["size"] for s in SHIP_DEFINITIONS}
    placed_ids = set()
    occupied_cells = set()

    for ship in fleet:
        s_id = ship.get("id")
        if s_id not in expected_sizes:
            return False, f"Nava necunoscută: {s_id}"
        if s_id in placed_ids:
            return False, f"Nava {s_id} este duplicată!"
        placed_ids.add(s_id)

        r = ship.get("r")
        c = ship.get("c")
        orientation = ship.get("orientation", "H").upper()

        if not (isinstance(r, int) and isinstance(c, int) and 0 <= r < GRID_SIZE and 0 <= c < GRID_SIZE):
            return False, f"Coordonate invalide pentru nava {s_id}!"

        if orientation not in ("H", "V"):
            return False, f"Orientare invalidă pentru nava {s_id}!"

        size = expected_sizes[s_id]
        cells = get_ship_cells(r, c, size, orientation)

        for cr, cc in cells:
            if not (0 <= cr < GRID_SIZE and 0 <= cc < GRID_SIZE):
                return False, f"Nava {s_id} iese în afara hărții 10x10!"
            if (cr, cc) in occupied_cells:
                return False, f"Navele se suprapun la coordonata ({cr}, {cc})!"
            occupied_cells.add((cr, cc))

    if len(occupied_cells) != TOTAL_SHIP_CELLS:
        return False, "Număr incorect de căsuțe ocupate!"

    return True, "Flotă validă!"

def generate_random_fleet() -> List[dict]:
    """Generates a random valid placement for all 5 ships."""
    fleet = []
    occupied = set()

    for ship_def in SHIP_DEFINITIONS:
        size = ship_def["size"]
        placed = False
        while not placed:
            orientation = random.choice(["H", "V"])
            if orientation == "H":
                r = random.randint(0, GRID_SIZE - 1)
                c = random.randint(0, GRID_SIZE - size)
            else:
                r = random.randint(0, GRID_SIZE - size)
                c = random.randint(0, GRID_SIZE - 1)

            cells = get_ship_cells(r, c, size, orientation)
            if not any(cell in occupied for cell in cells):
                for cell in cells:
                    occupied.add(cell)
                fleet.append({
                    "id": ship_def["id"],
                    "name": ship_def["name"],
                    "icon": ship_def["icon"],
                    "size": size,
                    "r": r,
                    "c": c,
                    "orientation": orientation,
                    "cells": cells
                })
                placed = True
    return fleet

class BattleshipState:
    """Manages shots and damage for one player's board."""
    def __init__(self, fleet: List[dict]):
        self.fleet = fleet
        # Precompute ship cells mapping
        self.ship_by_cell: Dict[Tuple[int, int], dict] = {}
        self.ship_hits: Dict[str, set] = {s["id"]: set() for s in SHIP_DEFINITIONS}
        self.ship_info: Dict[str, dict] = {}

        for ship in fleet:
            s_id = ship["id"]
            self.ship_info[s_id] = ship
            size = next((s["size"] for s in SHIP_DEFINITIONS if s["id"] == s_id), 0)
            cells = ship.get("cells") or get_ship_cells(ship["r"], ship["c"], size, ship["orientation"])
            for cell in cells:
                self.ship_by_cell[tuple(cell)] = ship

        self.shots_received: Dict[Tuple[int, int], str] = {} # (r, c) -> 'HIT' | 'MISS'
        self.sunk_ships: List[str] = []

    def receive_shot(self, r: int, c: int) -> dict:
        """
        Processes an incoming shot.
        Returns: {
            "result": "MISS" | "HIT" | "SUNK" | "ALREADY_SHOT",
            "r": int,
            "c": int,
            "coord": str (e.g. "E-4"),
            "ship_name": Optional[str],
            "ship_id": Optional[str],
            "is_game_over": bool,
            "sunk_cells": Optional[List[Tuple[int, int]]]
        }
        """
        cell = (r, c)
        letters = "ABCDEFGHIJ"
        coord_str = f"{letters[c]}-{r + 1}"

        if cell in self.shots_received:
            return {
                "result": "ALREADY_SHOT",
                "r": r,
                "c": c,
                "coord": coord_str,
                "is_game_over": False
            }

        if cell in self.ship_by_cell:
            self.shots_received[cell] = "HIT"
            hit_ship = self.ship_by_cell[cell]
            s_id = hit_ship["id"]
            self.ship_hits[s_id].add(cell)

            size = next((s["size"] for s in SHIP_DEFINITIONS if s["id"] == s_id), len(self.ship_hits[s_id]))
            is_sunk = len(self.ship_hits[s_id]) == size
            
            sunk_cells = None
            if is_sunk and s_id not in self.sunk_ships:
                self.sunk_ships.append(s_id)
                sunk_cells = hit_ship.get("cells") or get_ship_cells(hit_ship["r"], hit_ship["c"], size, hit_ship["orientation"])

            is_game_over = len(self.sunk_ships) == len(SHIP_DEFINITIONS)
            result = "SUNK" if is_sunk else "HIT"

            return {
                "result": result,
                "r": r,
                "c": c,
                "coord": coord_str,
                "ship_name": hit_ship.get("name", s_id),
                "ship_icon": hit_ship.get("icon", "🚢"),
                "ship_id": s_id,
                "is_game_over": is_game_over,
                "sunk_cells": sunk_cells
            }
        else:
            self.shots_received[cell] = "MISS"
            return {
                "result": "MISS",
                "r": r,
                "c": c,
                "coord": coord_str,
                "is_game_over": False
            }

class BattleshipBotAgent:
    """AI agent for Battleship: Hunt & Target Strategy."""
    def __init__(self):
        self.fleet = generate_random_fleet()
        self.shots_made: set = set()
        self.target_queue: List[Tuple[int, int]] = []
        self.current_hits: List[Tuple[int, int]] = []

    def choose_shot(self) -> Tuple[int, int]:
        """Chooses the next intelligent shot coordinate (r, c)."""
        # 1. Target mode: explore around previous hits
        while self.target_queue:
            target = self.target_queue.pop(0)
            if target not in self.shots_made and 0 <= target[0] < GRID_SIZE and 0 <= target[1] < GRID_SIZE:
                self.shots_made.add(target)
                return target

        # 2. Parity / Checkerboard search mode
        parity_cells = [
            (r, c) for r in range(GRID_SIZE) for c in range(GRID_SIZE)
            if (r + c) % 2 == 0 and (r, c) not in self.shots_made
        ]
        
        if parity_cells:
            chosen = random.choice(parity_cells)
        else:
            remaining = [
                (r, c) for r in range(GRID_SIZE) for c in range(GRID_SIZE)
                if (r, c) not in self.shots_made
            ]
            chosen = random.choice(remaining)

        self.shots_made.add(chosen)
        return chosen

    def register_shot_feedback(self, r: int, c: int, result: str, is_sunk: bool = False):
        """Updates AI memory with hit / miss / sunk feedback."""
        if result in ("HIT", "SUNK"):
            self.current_hits.append((r, c))
            # Add adjacent neighbors (North, South, East, West)
            neighbors = [(r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)]
            random.shuffle(neighbors)
            for nr, nc in neighbors:
                if 0 <= nr < GRID_SIZE and 0 <= nc < GRID_SIZE and (nr, nc) not in self.shots_made:
                    if (nr, nc) not in self.target_queue:
                        self.target_queue.insert(0, (nr, nc))

        if is_sunk:
            # Ship sunk, clear queue or re-evaluate
            self.current_hits = []
