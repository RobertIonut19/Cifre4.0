import unittest
from battleship_logic import (
    validate_fleet_placement,
    generate_random_fleet,
    BattleshipState,
    BattleshipBotAgent,
    SHIP_DEFINITIONS
)

class TestBattleshipLogic(unittest.TestCase):
    def test_random_fleet_generation_and_validation(self):
        fleet = generate_random_fleet()
        self.assertEqual(len(fleet), 5)
        valid, msg = validate_fleet_placement(fleet)
        self.assertTrue(valid, msg)

    def test_ship_hits_and_sunk(self):
        # Create a controlled fleet
        fleet = [
            {"id": "carrier", "name": "Portavion", "icon": "🚢", "size": 5, "r": 0, "c": 0, "orientation": "H"},
            {"id": "battleship", "name": "Cuirasat", "icon": "🛳️", "size": 4, "r": 2, "c": 0, "orientation": "H"},
            {"id": "cruiser", "name": "Crucișător", "icon": "⛴️", "size": 3, "r": 4, "c": 0, "orientation": "H"},
            {"id": "submarine", "name": "Submarin", "icon": "🚤", "size": 3, "r": 6, "c": 0, "orientation": "H"},
            {"id": "destroyer", "name": "Distrugător", "icon": "⛵", "size": 2, "r": 8, "c": 0, "orientation": "H"}
        ]
        valid, msg = validate_fleet_placement(fleet)
        self.assertTrue(valid, msg)

        state = BattleshipState(fleet)
        # Miss
        res = state.receive_shot(9, 9)
        self.assertEqual(res["result"], "MISS")

        # Hit Destroyer
        res = state.receive_shot(8, 0)
        self.assertEqual(res["result"], "HIT")
        self.assertEqual(res["ship_id"], "destroyer")

        # Sink Destroyer
        res = state.receive_shot(8, 1)
        self.assertEqual(res["result"], "SUNK")
        self.assertEqual(res["ship_id"], "destroyer")
        self.assertFalse(res["is_game_over"])

    def test_bot_agent(self):
        bot = BattleshipBotAgent()
        self.assertEqual(len(bot.fleet), 5)
        shot = bot.choose_shot()
        self.assertTrue(0 <= shot[0] < 10 and 0 <= shot[1] < 10)
        bot.register_shot_feedback(shot[0], shot[1], "HIT", is_sunk=False)
        next_shot = bot.choose_shot()
        self.assertTrue(0 <= next_shot[0] < 10 and 0 <= next_shot[1] < 10)

if __name__ == "__main__":
    unittest.main()
