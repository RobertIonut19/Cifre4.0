import random
from typing import List, Optional
from game_logic import count_exact_matches, validate_number

class BotAgent:
    """
    Intelligent Bot Agent for the 4-digit guessing game.
    Maintains a candidate pool of valid 4-digit strings (0000 - 9999).
    Filters possibilities based on received position feedback.
    """
    def __init__(self):
        self.secret_number: str = self.generate_secret()
        self.candidates: List[str] = [f"{i:04d}" for i in range(10000)]
        self.history: List[dict] = []

    def generate_secret(self) -> str:
        """Generates a random 4-digit secret string (0000 - 9999)."""
        num = random.randint(0, 9999)
        return f"{num:04d}"

    def make_guess(self) -> str:
        """Picks the next best guess from remaining candidates."""
        if not self.candidates:
            # Fallback if candidates pool somehow empties
            return self.generate_secret()
        
        # Select randomly from current valid candidates pool
        return random.choice(self.candidates)

    def process_feedback(self, guess: str, exact_matches: int):
        """
        Eliminates candidates that don't match the feedback received for `guess`.
        """
        self.history.append({"guess": guess, "exact": exact_matches})
        
        # Filter candidates: keep candidate C if count_exact_matches(C, guess) == exact_matches
        self.candidates = [
            cand for cand in self.candidates
            if count_exact_matches(cand, guess) == exact_matches
        ]
