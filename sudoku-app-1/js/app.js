(() => {
    "use strict";

    const STORAGE_KEY = "sudoku-game-save-v1";
    const EMPTY_CELLS = { easy: 35, medium: 45, hard: 54 };
    const tableBody = document.querySelector("#board tbody");
    const difficultySelect = document.getElementById("difficulty");
    const message = document.getElementById("message");
    const timer = document.getElementById("game-timer");
    const communityStatus = document.getElementById("community-status");
    const joinForm = document.getElementById("join-form");
    const nicknameInput = document.getElementById("nickname");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const chatMessages = document.getElementById("chat-messages");
    const leaderboard = document.getElementById("leaderboard");

    let puzzle = [];
    let solution = [];
    let board = [];
    let gameStartedAt = Date.now();
    let gameFinishedAt = null;
    let scoreSubmitted = false;
    let client = null;
    let playerNickname = null;
    let chatById = new Map();
    let chatChannel = null;
    let scoresChannel = null;

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
        gameStartedAt = Date.now();
        gameFinishedAt = null;
        scoreSubmitted = false;

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

    function updateTimer() {
        const elapsed = Math.floor(((gameFinishedAt || Date.now()) - gameStartedAt) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
        const seconds = (elapsed % 60).toString().padStart(2, "0");
        timer.textContent = `${minutes}:${seconds}`;
    }

    function updateBoard() {
        const conflicts = findConflicts();
        const isComplete = board.every(row => row.every(value => value !== 0));
        const isSolved = isComplete && board.every((row, rowIndex) =>
            row.every((value, columnIndex) => value === solution[rowIndex][columnIndex])
        );
        if (isSolved && !gameFinishedAt) gameFinishedAt = Date.now();

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
            if (playerNickname && !scoreSubmitted) submitScore();
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
                difficulty: difficultySelect.value,
                gameStartedAt,
                gameFinishedAt
            }));
            message.textContent = "Game saved in this browser.";
        } catch {
            message.textContent = "Unable to save. Check your browser storage settings.";
        }
    }

    function isValidSavedGame(saved) {
        return saved && ["easy", "medium", "hard"].includes(saved.difficulty) &&
            (saved.gameStartedAt === undefined ||
                (Number.isFinite(saved.gameStartedAt) && saved.gameStartedAt <= Date.now())) &&
            (saved.gameFinishedAt === undefined || saved.gameFinishedAt === null ||
                (Number.isFinite(saved.gameFinishedAt) && saved.gameFinishedAt <= Date.now())) &&
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
            gameStartedAt = saved.gameStartedAt || Date.now();
            gameFinishedAt = saved.gameFinishedAt || null;
            difficultySelect.value = saved.difficulty;
            renderBoard();
            message.textContent = "Saved game restored.";
            return true;
        } catch {
            return false;
        }
    }

    function setCommunityStatus(text) {
        communityStatus.textContent = text;
    }

    function showJoinForm(show) {
        joinForm.hidden = !show;
        document.getElementById("change-nickname").hidden = show || !playerNickname;
        joinForm.querySelector("button[type=submit]").textContent = playerNickname ? "Save" : "Join";
    }

    function renderLeaderboard(rows) {
        leaderboard.replaceChildren();
        if (!rows.length) {
            const empty = document.createElement("li");
            empty.className = "empty-state";
            empty.textContent = "No scores yet. Finish a game to claim the top spot!";
            leaderboard.appendChild(empty);
            return;
        }

        rows.forEach((row, index) => {
            const item = document.createElement("li");
            const rank = document.createElement("span");
            const name = document.createElement("span");
            const points = document.createElement("strong");
            rank.className = "rank";
            name.className = "player-name";
            rank.textContent = `${index + 1}.`;
            name.textContent = row.nickname;
            points.textContent = `${row.total_points} pts`;
            item.append(rank, name, points);
            leaderboard.appendChild(item);
        });
    }

    async function refreshLeaderboard() {
        if (!client) {
            document.getElementById("leaderboard-status").textContent =
                "Set up Supabase to enable the global leaderboard.";
            return;
        }
        const status = document.getElementById("leaderboard-status");
        status.textContent = "Refreshing scores…";
        try {
            const { data, error } = await client.rpc("get_leaderboard");
            if (error) {
                status.textContent = `Could not load scores: ${error.message}`;
                return;
            }
            renderLeaderboard(data || []);
            status.textContent = "Scores updated.";
        } catch (error) {
            status.textContent = `Could not load scores: ${error.message}`;
        }
    }

    function renderChat() {
        const messages = [...chatById.values()]
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .slice(-50);
        chatMessages.replaceChildren();

        if (!messages.length) {
            const empty = document.createElement("li");
            empty.className = "empty-state";
            empty.textContent = "No messages yet. Say hello!";
            chatMessages.appendChild(empty);
            return;
        }

        for (const entry of messages) {
            const item = document.createElement("li");
            const header = document.createElement("header");
            const nickname = document.createElement("strong");
            const time = document.createElement("time");
            const body = document.createElement("p");
            const date = new Date(entry.created_at);
            item.className = "chat-message";
            nickname.textContent = entry.nickname;
            time.dateTime = date.toISOString();
            time.textContent = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            body.textContent = entry.body;
            header.append(nickname, time);
            item.append(header, body);
            chatMessages.appendChild(item);
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addChatMessage(entry) {
        if (!entry || !entry.id) return;
        chatById.set(entry.id, entry);
        if (chatById.size > 100) {
            const oldestId = [...chatById.values()]
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0].id;
            chatById.delete(oldestId);
        }
        renderChat();
    }

    async function refreshChat() {
        if (!client) {
            document.getElementById("chat-status").textContent =
                "Set up Supabase to enable world chat.";
            return;
        }
        const status = document.getElementById("chat-status");
        status.textContent = "Refreshing chat…";
        try {
            const { data, error } = await client
                .from("chat_messages")
                .select("id,nickname,body,created_at")
                .order("created_at", { ascending: false })
                .limit(50);
            if (error) {
                status.textContent = `Could not load chat: ${error.message}`;
                return;
            }
            chatById = new Map((data || []).reverse().map(entry => [entry.id, entry]));
            renderChat();
            status.textContent = "Chat updated.";
        } catch (error) {
            status.textContent = `Could not load chat: ${error.message}`;
        }
    }

    async function submitScore() {
        if (!client || !playerNickname || scoreSubmitted) return;
        scoreSubmitted = true;
        const elapsedSeconds = Math.floor(((gameFinishedAt || Date.now()) - gameStartedAt) / 1000);
        try {
            const { error } = await client.rpc("record_sudoku_score", {
                p_difficulty: difficultySelect.value,
                p_elapsed_seconds: elapsedSeconds
            });
            if (error) throw error;
            document.getElementById("leaderboard-status").textContent =
                "Score submitted. Your best score for this difficulty is kept.";
            await refreshLeaderboard();
        } catch (error) {
            scoreSubmitted = false;
            document.getElementById("leaderboard-status").textContent =
                `Your game was solved, but its score could not be saved: ${error.message}`;
        }
    }

    function subscribeToCommunity() {
        if (chatChannel) client.removeChannel(chatChannel);
        if (scoresChannel) client.removeChannel(scoresChannel);

        chatChannel = client.channel("world-chat")
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "chat_messages"
            }, payload => addChatMessage(payload.new))
            .subscribe(status => {
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    document.getElementById("chat-status").textContent =
                        "Live chat disconnected. Use Refresh to check for messages.";
                }
            });

        scoresChannel = client.channel("global-scores")
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "scores"
            }, () => refreshLeaderboard())
            .subscribe(status => {
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    document.getElementById("leaderboard-status").textContent =
                        "Live score updates disconnected. Use Refresh to check scores.";
                }
            });
    }

    function setPlayer(nickname) {
        playerNickname = nickname;
        setCommunityStatus(`You're playing as ${nickname}. Scores and chat update live.`);
        showJoinForm(false);
        chatInput.disabled = false;
        chatForm.querySelector("button[type=submit]").disabled = false;
        subscribeToCommunity();
        updateBoard();
    }

    async function connectCommunity() {
        const config = window.SUDOKU_SUPABASE_CONFIG;
        if (!config || !config.url || !config.anonKey) {
            setCommunityStatus("Community features need Supabase setup. See the app README.");
            document.getElementById("leaderboard-status").textContent =
                "Supabase is not configured.";
            document.getElementById("chat-status").textContent =
                "Supabase is not configured.";
            return;
        }
        if (!window.supabase || typeof window.supabase.createClient !== "function") {
            setCommunityStatus("The Supabase client could not load. Check your connection and refresh.");
            return;
        }

        client = window.supabase.createClient(config.url, config.anonKey);
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        let session = sessionData.session;
        if (!session) {
            const { data, error } = await client.auth.signInAnonymously();
            if (error) throw error;
            session = data.session;
        }
        if (!session) throw new Error("Supabase did not create a player session.");

        await Promise.all([refreshLeaderboard(), refreshChat()]);
        const { data: profile, error: profileError } = await client
            .from("profiles")
            .select("nickname")
            .eq("id", session.user.id)
            .maybeSingle();
        if (profileError) throw profileError;
        if (profile) {
            setPlayer(profile.nickname);
        } else {
            setCommunityStatus("Choose a nickname to post in chat and save scores.");
            showJoinForm(true);
            nicknameInput.focus();
        }
    }

    joinForm.addEventListener("submit", async event => {
        event.preventDefault();
        const submitButton = joinForm.querySelector("button[type=submit]");
        submitButton.disabled = true;
        setCommunityStatus("Saving your nickname…");
        try {
            const { data, error } = await client.rpc("set_my_nickname", {
                p_nickname: nicknameInput.value.trim()
            });
            if (error) throw error;
            setPlayer(data);
        } catch (error) {
            setCommunityStatus(`Could not save nickname: ${error.message}`);
        } finally {
            submitButton.disabled = false;
        }
    });

    document.getElementById("change-nickname").addEventListener("click", () => {
        nicknameInput.value = playerNickname || "";
        showJoinForm(true);
        nicknameInput.focus();
    });

    chatForm.addEventListener("submit", async event => {
        event.preventDefault();
        const body = chatInput.value.trim();
        if (!client || !playerNickname || !body) return;
        const sendButton = chatForm.querySelector("button[type=submit]");
        sendButton.disabled = true;
        try {
            const { data, error } = await client.rpc("send_chat_message", { p_body: body });
            if (error) throw error;
            const postedMessage = Array.isArray(data) ? data[0] : data;
            addChatMessage(postedMessage);
            chatInput.value = "";
            document.getElementById("chat-status").textContent = "Message sent.";
        } catch (error) {
            document.getElementById("chat-status").textContent =
                `Message not sent: ${error.message}`;
        } finally {
            sendButton.disabled = false;
        }
    });

    document.getElementById("refresh-leaderboard")
        .addEventListener("click", () => refreshLeaderboard());
    document.getElementById("refresh-chat")
        .addEventListener("click", () => refreshChat());
    document.getElementById("new-game").addEventListener("click", startNewGame);
    document.getElementById("save-game").addEventListener("click", saveGame);
    difficultySelect.addEventListener("change", startNewGame);

    if (!restoreGame()) startNewGame();
    updateTimer();
    window.setInterval(updateTimer, 1000);
    connectCommunity().catch(error => {
        setCommunityStatus(`Community connection failed: ${error.message}`);
        showJoinForm(false);
    });
})();
