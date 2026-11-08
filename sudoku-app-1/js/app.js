(() => {
    "use strict";

    const STORAGE_KEY = "sudoku-game-save-v1";
    const EMPTY_CELLS = { easy: 35, medium: 45, hard: 54 };
    const tableBody = document.querySelector("#board tbody");
    const difficultySelect = document.getElementById("difficulty");
    const message = document.getElementById("message");

    let puzzle = [];
    let solution = [];
    let board = [];

    function shuffled(values) {
        const result = [...values];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    function generateSolution() {
        const rows = shuffled([0, 1, 2]).flatMap(band =>
            shuffled([0, 1, 2]).map(row => band * 3 + row)
        );
        const columns = shuffled([0, 1, 2]).flatMap(stack =>
            shuffled([0, 1, 2]).map(column => stack * 3 + column)
        );
        const digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        return rows.map(row => columns.map(column =>
            digits[(row * 3 + Math.floor(row / 3) + column) % 9]
        ));
    }

    function startNewGame() {
        solution = generateSolution();
        puzzle = solution.map(row => [...row]);
        board = solution.map(row => [...row]);
        const cells = shuffled(Array.from({ length: 81 }, (_, index) => index));
        const emptyCount = EMPTY_CELLS[difficultySelect.value] ?? EMPTY_CELLS.medium;

        for (const index of cells.slice(0, emptyCount)) {
            const row = Math.floor(index / 9);
            const column = index % 9;
            puzzle[row][column] = 0;
            board[row][column] = 0;
        }

        renderBoard();
        message.textContent = "New game started.";
    }

    function renderBoard() {
        tableBody.replaceChildren();

        for (let row = 0; row < 9; row++) {
            const tr = document.createElement("tr");
            for (let column = 0; column < 9; column++) {
                const td = document.createElement("td");
                const input = document.createElement("input");
                input.type = "text";
                input.inputMode = "numeric";
                input.maxLength = 1;
                input.autocomplete = "off";
                input.setAttribute("aria-label", `Row ${row + 1}, column ${column + 1}`);

                if (puzzle[row][column] !== 0) {
                    input.value = String(puzzle[row][column]);
                    input.readOnly = true;
                    input.classList.add("given");
                } else {
                    input.value = board[row][column] ? String(board[row][column]) : "";
                    input.addEventListener("input", () => {
                        input.value = input.value.replace(/[^1-9]/g, "").slice(0, 1);
                        board[row][column] = Number(input.value) || 0;
                        updateBoard();
                    });
                }

                td.appendChild(input);
                tr.appendChild(td);
            }
            tableBody.appendChild(tr);
        }
        updateBoard();
    }

    function findConflicts() {
        const conflicts = new Set();

        function checkGroup(cells) {
            const seen = new Map();
            for (const [row, column] of cells) {
                const value = board[row][column];
                if (!value) continue;
                if (seen.has(value)) {
                    const [otherRow, otherColumn] = seen.get(value);
                    conflicts.add(`${otherRow},${otherColumn}`);
                    conflicts.add(`${row},${column}`);
                } else {
                    seen.set(value, [row, column]);
                }
            }
        }

        for (let i = 0; i < 9; i++) {
            checkGroup(Array.from({ length: 9 }, (_, j) => [i, j]));
            checkGroup(Array.from({ length: 9 }, (_, j) => [j, i]));
        }
        for (let boxRow = 0; boxRow < 9; boxRow += 3) {
            for (let boxColumn = 0; boxColumn < 9; boxColumn += 3) {
                const cells = [];
                for (let row = boxRow; row < boxRow + 3; row++) {
                    for (let column = boxColumn; column < boxColumn + 3; column++) {
                        cells.push([row, column]);
                    }
                }
                checkGroup(cells);
            }
        }
        return conflicts;
    }

    function updateBoard() {
        const conflicts = findConflicts();
        const isComplete = board.every(row => row.every(value => value !== 0));
        const isSolved = isComplete && board.every((row, rowIndex) =>
            row.every((value, columnIndex) => value === solution[rowIndex][columnIndex])
        );

        tableBody.querySelectorAll("input").forEach((input, index) => {
            const row = Math.floor(index / 9);
            const column = index % 9;
            input.classList.toggle("invalid", conflicts.has(`${row},${column}`));
        });

        message.classList.toggle("success", conflicts.size === 0 && isSolved);

        if (conflicts.size > 0) {
            message.textContent = "Highlighted numbers conflict in a row, column, or box.";
        } else if (isSolved) {
            message.textContent = "Congratulations! You solved the Sudoku.";
        } else if (isComplete) {
            message.textContent = "The board is full, but the solution is not correct yet.";
        } else {
            message.textContent = "Enter numbers 1–9 in the empty cells.";
        }
    }

    function saveGame() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                puzzle,
                solution,
                board,
                difficulty: difficultySelect.value
            }));
            message.textContent = "Game saved in this browser.";
        } catch {
            message.textContent = "Unable to save. Check your browser storage settings.";
        }
    }

    function isValidSavedGame(saved) {
        return saved && ["easy", "medium", "hard"].includes(saved.difficulty) &&
            [saved.puzzle, saved.solution, saved.board].every(grid =>
                Array.isArray(grid) && grid.length === 9 &&
                grid.every(row => Array.isArray(row) && row.length === 9 &&
                    row.every(value => Number.isInteger(value) && value >= 0 && value <= 9))
            );
    }

    function restoreGame() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (!isValidSavedGame(saved)) return false;
            puzzle = saved.puzzle;
            solution = saved.solution;
            board = saved.board;
            difficultySelect.value = saved.difficulty;
            renderBoard();
            message.textContent = "Saved game restored.";
            return true;
        } catch {
            return false;
        }
    }

    document.getElementById("new-game").addEventListener("click", startNewGame);
    document.getElementById("save-game").addEventListener("click", saveGame);
    difficultySelect.addEventListener("change", startNewGame);

    if (!restoreGame()) startNewGame();
})();