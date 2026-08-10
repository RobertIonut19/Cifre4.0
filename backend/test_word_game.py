import pytest
from word_game_logic import validate_word, count_matching_positions, WordBotAgent

def test_validate_word():
    assert validate_word("SOARE") == True
    assert validate_word("CARTE") == True
    assert validate_word("SOAR") == False
    assert validate_word("SOAREE") == False
    assert validate_word("12345") == False

def test_count_matching_positions():
    assert count_matching_positions("SOARE", "SEARE") == 4
    assert count_matching_positions("SOARE", "SOARE") == 5
    assert count_matching_positions("SOARE", "LUMEA") == 0

def test_word_bot_agent():
    bot = WordBotAgent()
    assert len(bot.secret_word) == 5
    guess = bot.make_guess()
    assert len(guess) == 5
    bot.process_feedback(guess, 2)
    assert len(bot.candidates) <= 49
