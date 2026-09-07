"""
Engine for 4-Digit Number Guessing Game.
"""

def validate_number(num_str: str) -> bool:
    """Validates if a string is a 4-digit number (0000 - 9999)."""
    return isinstance(num_str, str) and len(num_str) == 4 and num_str.isdigit()

def count_exact_matches(secret: str, guess: str) -> int:
    """
    Counts the number of digits in the guess that match the secret digit at the exact same position.
    Example:
      secret = '0123', guess = '0928' -> 2 (0 and 2 are in exact positions)
      secret = '0000', guess = '0011' -> 2
    """
    if not (validate_number(secret) and validate_number(guess)):
        return 0
    return sum(1 for s, g in zip(secret, guess) if s == g)

def calculate_feedback(secret: str, guess: str) -> dict:
    """Calculates full match details."""
    exact = count_exact_matches(secret, guess)
    return {
        "exact_matches": exact,
        "is_win": exact == 4
    }
