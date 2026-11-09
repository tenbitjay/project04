(() => {
    "use strict";

    const STORAGE_KEY = "sudoku-game-save-v1";
    const EMPTY_CELLS = { easy: 35, medium: 45, hard: 54 };
    const VALID_TIME_LIMITS = [0, 300, 600, 900];
    const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,19}$/;
    const tableBody = document.querySelector("#board tbody");
    const difficultySelect = document.getElementById("difficulty");
    const timeLimitSelect = document.getElementById("time-limit");
    const message = document.getElementById("message");
    const timer = document.getElementById("game-timer");
    const authDialog = document.getElementById("auth-dialog");
    const authForm = document.getElementById("auth-form");
    const authStatus = document.getElementById("auth-status");
    const authUsername = document.getElementById("auth-username");
    const authPassword = document.getElementById("auth-password");
    const main = document.getElementById("sudoku-app");
    const communityPanel = document.getElementById("community-panel");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const chatMessages = document.getElementById("chat-messages");
    const leaderboard = document.getElementById("leaderboard");

    let puzzle = [];
    let solution = [];
    let board = [];
    let gameStartedAt = Date.now();
    let gameFinishedAt = null;
    let activeDifficulty = "medium";
    let activeTimeLimit = 600;
    let gameRunning = false;
    let gameExpired = false;
    let scoreSubmitted = false;
    let client = null;
    let currentUserId = null;
    let playerNickname = null;
    let authMode = "signup";
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

    function difficultyLabel(value) {
        return value[0].toUpperCase() + value.slice(1);
    }

    function timeLimitLabel(seconds) {
        return seconds === 0 ? "No time limit" : `${seconds / 60} minutes`;
    }

    function elapsedSeconds() {
        return Math.floor(((gameFinishedAt || Date.now()) - gameStartedAt) / 1000);
    }

    function formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
        const remainder = (seconds % 60).toString().padStart(2, "0");
        return `${minutes}:${remainder}`;
    }

    function setBoardEnabled(enabled) {
        tableBody.querySelectorAll("input:not(.given)").forEach(input => {
            input.disabled = !enabled;
        });
    }

    function updateTimer() {
        if (!gameRunning) return;
        const seconds = elapsedSeconds();
        timer.textContent = formatDuration(seconds);
        if (activeTimeLimit > 0 && seconds >= activeTimeLimit) {
            expireGame();
        }
    }

    function startNewGame() {
        activeDifficulty = difficultySelect.value;
        activeTimeLimit = Number(timeLimitSelect.value);
        if (!VALID_TIME_LIMITS.includes(activeTimeLimit)) {
            message.textContent = "Choose one of the listed time limits.";
            return;
        }

        solution = generateSolution();
        puzzle = solution.map(row => [...row]);
        board = solution.map(row => [...row]);
        gameStartedAt = Date.now();
        gameFinishedAt = null;
        gameRunning = true;
        gameExpired = false;
        scoreSubmitted = false;

        const cells = shuffled(Array.from({ length: 81 }, (_, index) => index));
        for (const index of cells.slice(0, EMPTY_CELLS[activeDifficulty])) {
            const row = Math.floor(index / 9);
            const column = index % 9;
            puzzle[row][column] = 0;
            board[row][column] = 0;
        }

        document.getElementById("game-settings-label").textContent =
            `${difficultyLabel(activeDifficulty)} · ${timeLimitLabel(activeTimeLimit)}`;
        document.getElementById("game-content").hidden = false;
        document.getElementById("score-result").textContent = "";
        document.getElementById("start-game").textContent = "Start new game";
        renderBoard();
        updateTimer();
        message.textContent = "New game started. Good luck!";
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
                    input.disabled = !gameRunning;
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

    function expireGame() {
        if (!gameRunning) return;
        gameRunning = false;
        gameExpired = true;
        setBoardEnabled(false);
        message.classList.remove("success");
        message.textContent = `Time is up for this ${difficultyLabel(activeDifficulty)} game. Start a new game to try again.`;
    }

    function updateBoard() {
        const conflicts = findConflicts();
        const isComplete = board.every(row => row.every(value => value !== 0));
        const isSolved = isComplete && board.every((row, rowIndex) =>
            row.every((value, columnIndex) => value === solution[rowIndex][columnIndex])
        );

        if (gameRunning && activeTimeLimit > 0 && elapsedSeconds() >= activeTimeLimit) {
            expireGame();
            return;
        }

        tableBody.querySelectorAll("input").forEach((input, index) => {
            const row = Math.floor(index / 9);
            const column = index % 9;
            input.classList.toggle("invalid", conflicts.has(`${row},${column}`));
        });

        if (isSolved && gameRunning) {
            gameFinishedAt = Date.now();
            gameRunning = false;
            setBoardEnabled(false);
            timer.textContent = formatDuration(elapsedSeconds());
            message.classList.add("success");
            message.textContent = "Congratulations! You solved the Sudoku.";
            submitScore();
            return;
        }

        message.classList.remove("success");
        if (gameExpired) {
            message.textContent = `Time is up for this ${difficultyLabel(activeDifficulty)} game. Start a new game to try again.`;
        } else if (conflicts.size > 0) {
            message.textContent = "Highlighted numbers conflict in a row, column, or box.";
        } else if (isComplete) {
            message.textContent = "The board is full, but the solution is not correct yet.";
        } else if (gameRunning) {
            message.textContent = "Enter numbers 1–9 in the empty cells.";
        }
    }

    function saveGame() {
        if (!currentUserId || !gameRunning) {
            message.textContent = "Start a game before saving it.";
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                userId: currentUserId,
                puzzle,
                solution,
                board,
                difficulty: activeDifficulty,
                timeLimit: activeTimeLimit,
                elapsedSeconds: elapsedSeconds()
            }));
            message.textContent = "Game saved in this browser.";
        } catch {
            message.textContent = "Unable to save. Check your browser storage settings.";
        }
    }

    function isValidSavedGame(saved) {
        return saved && saved.userId === currentUserId &&
            ["easy", "medium", "hard"].includes(saved.difficulty) &&
            VALID_TIME_LIMITS.includes(saved.timeLimit) &&
            Number.isInteger(saved.elapsedSeconds) && saved.elapsedSeconds >= 0 &&
            (saved.timeLimit === 0 || saved.elapsedSeconds < saved.timeLimit) &&
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
            activeDifficulty = saved.difficulty;
            activeTimeLimit = saved.timeLimit;
            difficultySelect.value = activeDifficulty;
            timeLimitSelect.value = String(activeTimeLimit);
            puzzle = saved.puzzle;
            solution = saved.solution;
            board = saved.board;
            gameStartedAt = Date.now() - saved.elapsedSeconds * 1000;
            gameFinishedAt = null;
            gameRunning = true;
            gameExpired = false;
            scoreSubmitted = false;
            document.getElementById("game-settings-label").textContent =
                `${difficultyLabel(activeDifficulty)} · ${timeLimitLabel(activeTimeLimit)}`;
            document.getElementById("game-content").hidden = false;
            document.getElementById("score-result").textContent = "";
            document.getElementById("start-game").textContent = "Start new game";
            renderBoard();
            message.textContent = "Saved game restored.";
            updateTimer();
            return true;
        } catch {
            return false;
        }
    }

    function setAuthMode(mode) {
        authMode = mode;
        const signup = mode === "signup";
        document.getElementById("show-signup").setAttribute("aria-selected", String(signup));
        document.getElementById("show-signin").setAttribute("aria-selected", String(!signup));
        document.getElementById("auth-title").textContent = signup ? "Create your player account" : "Welcome back";
        document.getElementById("auth-submit").textContent = signup ? "Create account" : "Sign in";
        authPassword.autocomplete = signup ? "new-password" : "current-password";
        authStatus.textContent = "";
    }

    function showAuthDialog() {
        main.hidden = true;
        communityPanel.hidden = true;
        authStatus.textContent = "";
        if (!authDialog.open) authDialog.showModal();
    }

    function showCommunityError(error) {
        const status = document.getElementById("community-status");
        const detail = error && error.message ? error.message : String(error);
        if (error instanceof TypeError && /fetch/i.test(detail)) {
            status.textContent =
                "Could not reach Supabase. Check that the project URL is https://<project-ref>.supabase.co, " +
                "the public API key is correct, and the project is running.";
        } else {
            status.textContent = `Community connection failed: ${detail}`;
        }
    }

    async function refreshLeaderboard() {
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
            const header = document.createElement("div");
            const rank = document.createElement("span");
            const name = document.createElement("strong");
            const points = document.createElement("strong");
            const details = document.createElement("small");
            const bestLimit = Number(row.best_time_limit_seconds);
            header.className = "leaderboard-row";
            rank.className = "rank";
            name.className = "player-name";
            rank.textContent = `${index + 1}.`;
            name.textContent = row.nickname;
            points.textContent = `${row.total_points} pts`;
            details.textContent = row.best_difficulty
                ? `Best: ${difficultyLabel(row.best_difficulty)} · ${timeLimitLabel(bestLimit)} · ` +
                    `${formatDuration(Number(row.best_elapsed_seconds))} · ${row.best_points} pts`
                : `${row.solved_levels} games completed`;
            header.append(rank, name, points);
            item.append(header, details);
            leaderboard.appendChild(item);
        });
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
        const seconds = Math.max(1, elapsedSeconds());
        const scoreResult = document.getElementById("score-result");
        try {
            const { error } = await client.rpc("record_sudoku_score", {
                p_difficulty: activeDifficulty,
                p_elapsed_seconds: seconds,
                p_time_limit_seconds: activeTimeLimit
            });
            if (error) throw error;
            const speedBonus = Math.max(0, 600 - Math.floor(seconds * 2 / 3));
            const basePoints = { easy: 1000, medium: 2000, hard: 3000 }[activeDifficulty];
            scoreResult.textContent =
                `Game result: ${basePoints} difficulty points + ${speedBonus} speed points ` +
                `(${difficultyLabel(activeDifficulty)}, ${timeLimitLabel(activeTimeLimit)}, ` +
                `${formatDuration(seconds)}). Your best score for this difficulty is kept.`;
            await refreshLeaderboard();
        } catch (error) {
            scoreSubmitted = false;
            scoreResult.textContent = `Your game was solved, but its score could not be saved: ${error.message}`;
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

    async function setPlayer(user, username) {
        const { data, error } = await client.rpc("set_my_nickname", {
            p_nickname: username
        });
        if (error) throw error;

        currentUserId = user.id;
        playerNickname = data;
        document.getElementById("current-player").textContent = `Player: ${playerNickname}`;
        document.getElementById("community-status").textContent =
            "Scores and chat update live.";
        main.hidden = false;
        communityPanel.hidden = false;
        if (authDialog.open) authDialog.close();
        authPassword.value = "";
        subscribeToCommunity();
        await Promise.all([refreshLeaderboard(), refreshChat()]);
        if (!restoreGame()) {
            document.getElementById("game-setup").hidden = false;
            document.getElementById("game-content").hidden = true;
            document.getElementById("start-game").textContent = "Start game";
        }
    }

    function authEmail(username) {
        return `${username.toLowerCase()}@players.sudoku.invalid`;
    }

    async function connectCommunity() {
        const config = window.SUDOKU_SUPABASE_CONFIG;
        if (!config || !config.url || !config.anonKey) {
            throw new Error("Supabase URL or public API key is missing from js/config.js.");
        }
        let projectUrl;
        try {
            projectUrl = new URL(config.url);
        } catch {
            throw new Error("Supabase URL is invalid. Use https://<project-ref>.supabase.co.");
        }
        if (projectUrl.protocol !== "https:" || !projectUrl.hostname.endsWith(".supabase.co")) {
            throw new Error("Use the Supabase project URL, not a dashboard URL: https://<project-ref>.supabase.co.");
        }
        if (!window.supabase || typeof window.supabase.createClient !== "function") {
            throw new Error("The Supabase client library did not load. Check your connection.");
        }

        client = window.supabase.createClient(projectUrl.origin, config.anonKey);
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (data.session && !data.session.user.is_anonymous) {
            const { data: profile, error: profileError } = await client
                .from("profiles")
                .select("nickname")
                .eq("id", data.session.user.id)
                .maybeSingle();
            if (profileError) throw profileError;
            if (profile) {
                await setPlayer(data.session.user, profile.nickname);
                return;
            }
            const { error: signOutError } = await client.auth.signOut();
            if (signOutError) throw signOutError;
        } else if (data.session) {
            const { error: signOutError } = await client.auth.signOut();
            if (signOutError) throw signOutError;
        }
        showAuthDialog();
    }

    authForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (!authForm.reportValidity()) return;

        const username = authUsername.value.trim();
        const password = authPassword.value;
        if (!USERNAME_PATTERN.test(username)) {
            authStatus.textContent =
                "Use 3–20 letters, numbers, underscores, or hyphens; start with a letter or number.";
            authUsername.focus();
            return;
        }
        const email = authEmail(username);
        const button = document.getElementById("auth-submit");
        button.disabled = true;
        authStatus.textContent = authMode === "signup" ? "Creating your account…" : "Signing in…";

        try {
            let user;
            if (authMode === "signup") {
                const { data, error } = await client.auth.signUp({ email, password });
                if (error) throw error;
                if (!data.session) {
                    authStatus.textContent =
                        "Account created, but Supabase is waiting for email confirmation. " +
                        "Because this game uses username-only accounts, disable email confirmation " +
                        "in Supabase Authentication settings, then try again.";
                    return;
                }
                user = data.user;
            } else {
                const { data, error } = await client.auth.signInWithPassword({ email, password });
                if (error) throw error;
                user = data.user;
            }
            if (!user) throw new Error("Supabase did not return a player account.");
            await setPlayer(user, username);
        } catch (error) {
            const detail = error && error.message ? error.message : String(error);
            if (error instanceof TypeError && /fetch/i.test(detail)) {
                authStatus.textContent =
                    "Could not reach Supabase. Check the project URL, public API key, and connection.";
            } else if (/already registered|already been registered/i.test(detail)) {
                authStatus.textContent = "That player name is already in use. Choose another or sign in.";
            } else if (/invalid login credentials/i.test(detail)) {
                authStatus.textContent = "Player name or password is incorrect.";
            } else {
                authStatus.textContent = detail;
            }
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById("show-signup")
        .addEventListener("click", () => setAuthMode("signup"));
    document.getElementById("show-signin")
        .addEventListener("click", () => setAuthMode("signin"));

    document.getElementById("game-setup").addEventListener("submit", event => {
        event.preventDefault();
        startNewGame();
    });
    document.getElementById("new-game").addEventListener("click", startNewGame);
    document.getElementById("save-game").addEventListener("click", saveGame);
    document.getElementById("refresh-leaderboard")
        .addEventListener("click", () => refreshLeaderboard());
    document.getElementById("refresh-chat")
        .addEventListener("click", () => refreshChat());

    document.getElementById("sign-out").addEventListener("click", async () => {
        const { error } = await client.auth.signOut();
        if (error) {
            document.getElementById("community-status").textContent =
                `Could not sign out: ${error.message}`;
            return;
        }
        if (chatChannel) client.removeChannel(chatChannel);
        if (scoresChannel) client.removeChannel(scoresChannel);
        currentUserId = null;
        playerNickname = null;
        gameRunning = false;
        showAuthDialog();
        setAuthMode("signin");
    });

    setAuthMode("signup");
    window.setInterval(updateTimer, 1000);
    showAuthDialog();
    connectCommunity().catch(error => {
        showCommunityError(error);
        showAuthDialog();
        authStatus.textContent = document.getElementById("community-status").textContent;
    });
})();
