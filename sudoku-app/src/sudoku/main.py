print("Welcome to Sudoku!")
from game import Game

def main():
    game = Game()
    game.start_new_game()
    
    while True:
        print(game.board)
        move = input("Enter your move (row, col, value) or 'exit' to quit: ")
        
        if move.lower() == 'exit':
            print("Thanks for playing!")
            break
        
        try:
            row, col, value = map(int, move.split(','))
            if game.make_move(row, col, value):
                print("Move accepted.")
            else:
                print("Invalid move. Try again.")
        except ValueError:
            print("Invalid input format. Please enter in the format 'row,col,value'.")

if __name__ == "__main__":
    main()