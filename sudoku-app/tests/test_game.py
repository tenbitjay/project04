import unittest
from sudoku.game import Game

class TestGame(unittest.TestCase):

    def setUp(self):
        self.game = Game()

    def test_start_new_game(self):
        self.game.start_new_game()
        self.assertIsNotNone(self.game.board)
        self.assertFalse(self.game.is_game_over)

    def test_make_move(self):
        self.game.start_new_game()
        result = self.game.make_move(0, 0, 5)  # Example move
        self.assertTrue(result)
        self.assertEqual(self.game.board.get_value(0, 0), 5)

    def test_check_win_condition(self):
        self.game.start_new_game()
        # Simulate moves that lead to a win condition
        # This part would depend on the actual implementation of the Game class
        self.game.make_move(0, 0, 5)
        self.game.make_move(0, 1, 3)
        # Add more moves as necessary
        self.assertTrue(self.game.check_win_condition())

if __name__ == '__main__':
    unittest.main()