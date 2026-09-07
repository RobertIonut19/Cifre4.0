import pytest
from game_logic import validate_number, count_exact_matches
from bot_agent import BotAgent
from room_manager import RoomManager

def test_validate_number():
    assert validate_number("0000") is True
    assert validate_number("9999") is True
    assert validate_number("0123") is True
    assert validate_number("123") is False
    assert validate_number("12345") is False
    assert validate_number("abcd") is False

def test_count_exact_matches():
    assert count_exact_matches("1234", "1234") == 4
    assert count_exact_matches("0000", "0000") == 4
    assert count_exact_matches("0000", "0011") == 2
    assert count_exact_matches("1234", "4321") == 0

def test_same_round_tie_logic():
    rm = RoomManager()
    room_id = rm.create_room(is_bot_game=False)
    room = rm.get_room(room_id)
    
    # Add 2 players
    room.add_player("P1", "Alina ❤️", None)
    room.add_player("P2", "Robabe 🤍", None)
    
    # Set secrets
    room.set_secret("P1", "1234")
    room.set_secret("P2", "5678")
    
    assert room.state == "PLAYING"
    assert room.current_turn == "P1"
    
    # P1 guesses P2's secret "5678" correctly in turn 1 of Round 1
    room.process_guess("P1", "5678")
    
    # P1 guessed 4, but state should NOT be FINISHED yet because P2 must get turn 2 of Round 1!
    assert room.state == "PLAYING"
    assert room.current_turn == "P2"
    assert room.round_first_winner == "P1"
    
    # P2 ALSO guesses P1's secret "1234" correctly in turn 2 of Round 1
    room.process_guess("P2", "1234")
    
    # Game should end in a TIE!
    assert room.state == "FINISHED"
    assert room.winner == "TIE"
