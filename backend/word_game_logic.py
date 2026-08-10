"""
Game logic and bot agent for 5-Letter Word Guessing Game.
"""
import random
from typing import List, Optional

# Sample list of 5-letter Romanian words for bot secrets & bot guesses
WORD_LIST = [
    "CARTE", "FLOARE", "SOARE", "FRUCT", "MASA", "PERNA", "TEMA", "TIMP", "DREPT", "LUMEA",
    "SFÂRȘIT", "CAFEA", "MINTE", "MUNTE", "SERE", "PIATR", "PIINE", "CÂINE", "PISIC", "TIGRU",
    "ZÂMBET", "IUBIRE", "FOCUL", "APA", "AERUL", "LEU", "TATA", "MAMA", "FRATE", "SORA",
    "VERDE", "NEGRU", "ALBASTR", "ROȘU", "GALBEN", "CALD", "RECE", "DULCE", "AMAR", "REPED"
]
# Filter exact 5-letter uppercase words
FIVE_LETTER_WORDS = [w.upper() for w in ["CARTE", "SOARE", "FRUCT", "PERNA", "TIMPUL", "CAFEA", "MINTE", "MUNTE", "PIATRA", "PAINE", "CAINE", "PISICA", "TIGRU", "ZAMBET", "IUBIRE", "VERDE", "NEGRU", "ROSU", "GALBEN", "DULCE", "AMAR", "REPEDE", "FLOARE", "DREPT", "LUMEA", "SORA", "FRATE", "TATA", "MAMA", "FOCUL", "CALD", "RECE", "NOAPTE", "SEARA", "SFANT", "LEGEN", "STELE", "NORII", "PLOAIE", "VANTU", "MAREA", "RÂURI", "MUDRA", "LIVAD"] if len(w) == 5]

def validate_word(word_str: str) -> bool:
    """Validates if a string is exactly 5 letters (alphabetic)."""
    return isinstance(word_str, str) and len(word_str) == 5 and word_str.isalpha()

def count_matching_positions(secret: str, guess: str) -> int:
    """
    Counts how many letters are in the EXACT SAME position (0 to 5).
    Example:
      secret = 'SOARE', guess = 'SEARE' -> 4 (S, A, R, E match position)
    """
    secret = secret.upper()
    guess = guess.upper()
    if not (validate_word(secret) and validate_word(guess)):
        return 0
    return sum(1 for s, g in zip(secret, guess) if s == g)

class WordBotAgent:
    def __init__(self):
        self.candidates = list(FIVE_LETTER_WORDS)
        self.secret_word = random.choice(FIVE_LETTER_WORDS)

    def make_guess(self) -> str:
        if not self.candidates:
            return random.choice(FIVE_LETTER_WORDS)
        return random.choice(self.candidates)

    def process_feedback(self, guess: str, exact_matches: int):
        """Eliminates words that wouldn't produce the same exact position match count."""
        guess = guess.upper()
        new_candidates = []
        for cand in self.candidates:
            if count_matching_positions(cand, guess) == exact_matches:
                new_candidates.append(cand)
        if new_candidates:
            self.candidates = new_candidates
