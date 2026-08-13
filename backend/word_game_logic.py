"""
Game logic and bot agent for 5-Letter Word Guessing Game with Dexonline validation and definition lookup.
"""
import random
import re
import unicodedata
import urllib.request
import json
from typing import List, Optional, Tuple

def strip_diacritics(text: str) -> str:
    """Normalizes Romanian diacritics (ă, â, î, ș, ț) -> (a, a, i, s, t)."""
    text = text.replace('ș', 's').replace('Ș', 'S').replace('ț', 't').replace('Ț', 'T')
    normalized = unicodedata.normalize('NFD', text)
    return ''.join(c for c in normalized if unicodedata.category(c) != 'Mn').upper()

# Sample list of 5-letter Romanian words for bot secrets & fallback checks
FIVE_LETTER_WORDS = [
    "CARTE", "SOARE", "FRUCT", "PERNA", "CAFEA", "MINTE", "MUNTE", "PIATR", "PAINE", 
    "CAINE", "PISIC", "TIGRU", "ZAMBE", "IUBIR", "VERDE", "NEGRU", "ROSU", "GALBE", 
    "DULCE", "AMAR", "REPED", "FLOAR", "DREPT", "LUMEA", "SORA", "FRATE", "TATA", 
    "MAMA", "FOCUL", "CALD", "RECE", "NOAPT", "SEARA", "SFANT", "LEGEN", "STELE", 
    "NORII", "PLOAI", "VANTU", "MAREA", "RAURI", "MUDRA", "LIVAD", "BARCA", "PLAZA"
]
# Filter exact 5-letter normalized uppercase words
FIVE_LETTER_WORDS = [strip_diacritics(w) for w in FIVE_LETTER_WORDS if len(strip_diacritics(w)) == 5]

# In-memory caches
DEX_VALIDATED_CACHE: dict = {}
DEX_DEFINITION_CACHE: dict = {}

def validate_word(word_str: str) -> bool:
    """Validates if a string is exactly 5 letters (alphabetic), ignoring diacritics."""
    if not isinstance(word_str, str):
        return False
    clean = strip_diacritics(word_str.strip())
    return len(clean) == 5 and clean.isalpha()

def validate_word_dexonline(word_str: str) -> Tuple[bool, str]:
    """
    Validates a word against Dexonline.
    Ignores diacritics (normalizes to A-Z).
    Returns (is_valid, message).
    """
    if not isinstance(word_str, str):
        return False, "Cuvântul introdus nu este valid."

    clean_word = strip_diacritics(word_str.strip())
    if len(clean_word) != 5 or not clean_word.isalpha():
        return False, "Cuvântul trebuie să aibă exact 5 litere!"

    # Check cache first for 0ms response
    if clean_word in DEX_VALIDATED_CACHE:
        if DEX_VALIDATED_CACHE[clean_word]:
            return True, "Cuvânt valid!"
        else:
            return False, f'Cuvântul "{clean_word}" nu există în Dexonline!'

    # Known local words check
    if clean_word in FIVE_LETTER_WORDS:
        DEX_VALIDATED_CACHE[clean_word] = True
        return True, "Cuvânt valid!"

    # Query Dexonline API
    try:
        url = f"https://dexonline.ro/definitie/{clean_word.lower()}/json"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                defs = data.get('definitions', [])
                if len(defs) > 0:
                    DEX_VALIDATED_CACHE[clean_word] = True
                    return True, "Cuvânt valid în Dexonline!"
    except Exception:
        # Fallback if Dexonline is temporarily unreachable
        DEX_VALIDATED_CACHE[clean_word] = True
        return True, "Cuvânt acceptat."

    DEX_VALIDATED_CACHE[clean_word] = False
    return False, f'Cuvântul "{clean_word}" nu există în dicționarul Dexonline!'

def get_dexonline_definition(word_str: str) -> str:
    """
    Fetches the clean dictionary definition of a word from Dexonline.
    Normalizes diacritics and uses in-memory caching.
    """
    if not isinstance(word_str, str):
        return "Definiție indisponibilă."

    clean_word = strip_diacritics(word_str.strip()).upper()

    if clean_word in DEX_DEFINITION_CACHE:
        return DEX_DEFINITION_CACHE[clean_word]

    try:
        url = f"https://dexonline.ro/definitie/{clean_word.lower()}/json"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                defs = data.get('definitions', [])
                if len(defs) > 0:
                    raw_html = defs[0].get('htmlRep', '')
                    clean_text = re.sub(r'<[^>]+>', '', raw_html).strip()
                    if len(clean_text) > 260:
                        clean_text = clean_text[:257] + "..."
                    DEX_DEFINITION_CACHE[clean_word] = clean_text
                    return clean_text
    except Exception:
        pass

    fallback_msg = f"Cuvântul {clean_word} este un cuvânt valid din limba română."
    DEX_DEFINITION_CACHE[clean_word] = fallback_msg
    return fallback_msg

def count_matching_positions(secret: str, guess: str) -> int:
    """
    Counts how many letters are in the EXACT SAME position (0 to 5), ignoring diacritics.
    """
    secret = strip_diacritics(secret)
    guess = strip_diacritics(guess)
    if not (len(secret) == 5 and len(guess) == 5):
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
        guess = strip_diacritics(guess)
        new_candidates = []
        for cand in self.candidates:
            if count_matching_positions(cand, guess) == exact_matches:
                new_candidates.append(cand)
        if new_candidates:
            self.candidates = new_candidates
