# Sudoku Application

This is a web-based Sudoku application that allows users to play Sudoku in a browser environment. The application includes features for starting a new game, displaying the game board, and validating user inputs.

## Project Structure

```
sudoku-app
├── index.html
├── css
│   └── styles.css
├── js
│   ├── app.js
│   ├── board.js
│   └── sudoku.js
└── README.md
```

## Installation

To run the Sudoku application, simply open the `index.html` file in your web browser. There are no additional dependencies to install.

## Hosting on GitHub Pages

The app is a static website and can be hosted on GitHub Pages. The repository includes a GitHub Actions workflow that publishes `sudoku-app-1` whenever changes to that folder are pushed to `main`.

To enable deployment:

1. In the repository on GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push the app and workflow to the `main` branch, or run the **Deploy Sudoku app to GitHub Pages** workflow from the **Actions** tab.

Once deployment succeeds, share the site at:

`https://tenbitjay.github.io/project04/sudoku-app-1/`

## Running the Application

1. Open `index.html` in your preferred web browser.
2. The Sudoku game will be displayed in the browser.
3. You can make moves by clicking on the cells and entering the numbers you want to place.
4. The game will validate your moves and update the board accordingly.
5. The game ends when you successfully fill the board according to Sudoku rules.

## How to Play

1. The game will display a Sudoku board.
2. Click on a cell to select it and enter the number you want to place.
3. The game will validate your moves and update the board accordingly.
4. The game ends when you successfully fill the board according to Sudoku rules.

## Contributing

Feel free to submit issues or pull requests if you would like to contribute to the project.

## License

This project is licensed under the MIT License.