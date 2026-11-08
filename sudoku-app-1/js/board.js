// This file manages the Sudoku board's representation and logic.

const boardSize = 9;
let board = [];

// Initialize the Sudoku board with zeros
function initializeBoard() {
    board = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
}

// Display the Sudoku board in the console
function displayBoard() {
    console.clear();
    for (let row = 0; row < boardSize; row++) {
        console.log(board[row].join(' '));
    }
}

// Update a cell in the board
function updateCell(row, col, value) {
    if (isValidMove(row, col, value)) {
        board[row][col] = value;
        return true;
    }
    return false;
}

// Check if a move is valid
function isValidMove(row, col, value) {
    // Check if the value is already in the row
    for (let i = 0; i < boardSize; i++) {
        if (board[row][i] === value) {
            return false;
        }
    }

    // Check if the value is already in the column
    for (let i = 0; i < boardSize; i++) {
        if (board[i][col] === value) {
            return false;
        }
    }

    // Check if the value is already in the 3x3 box
    const boxRowStart = Math.floor(row / 3) * 3;
    const boxColStart = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[boxRowStart + i][boxColStart + j] === value) {
                return false;
            }
        }
    }

    return true;
}

// Export functions for use in other modules
export { initializeBoard, displayBoard, updateCell };