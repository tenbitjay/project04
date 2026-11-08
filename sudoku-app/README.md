# Sudoku Application

This is a simple Sudoku application that allows users to play Sudoku in a console environment. The application includes features for starting a new game, displaying the game board, and validating user inputs.

## Project Structure

```
sudoku-app
├── src
│   └── sudoku
│       ├── __init__.py
│       ├── main.py
│       ├── game.py
│       └── board.py
├── tests
│   └── test_game.py
├── pyproject.toml
└── README.md
```

## Installation

To install the necessary dependencies, run:

```
pip install -r requirements.txt
```

## Running the Application

To start the Sudoku game, run the following command:

```
python src/sudoku/main.py
```

## How to Play

1. The game will display a Sudoku board.
2. You can make moves by entering the row, column, and number you want to place.
3. The game will validate your moves and update the board accordingly.
4. The game ends when you successfully fill the board according to Sudoku rules.

## Contributing

Feel free to submit issues or pull requests if you would like to contribute to the project.

## License

This project is licensed under the MIT License.