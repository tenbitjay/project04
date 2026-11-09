# Sudoku Community Game

A browser-based Sudoku game with a live global leaderboard and world chat. The game itself is static and is hosted on GitHub Pages; Supabase provides anonymous player identities, persistent scores, chat history, and realtime updates.

## Local play

Open `index.html` in a browser to play Sudoku without the community features. To use the leaderboard and chat, configure Supabase as described below.

## Configure Supabase

1. Create a Supabase project.
2. In **Authentication → Sign In / Providers**, enable **Anonymous Sign-Ins**.
3. Open the Supabase **SQL Editor** and run [`supabase/setup.sql`](./supabase/setup.sql).
4. In **Project Settings → API**, copy the project URL and the public `anon` key into [`js/config.js`](./js/config.js):

   ```js
   window.SUDOKU_SUPABASE_CONFIG = {
       url: "https://your-project.supabase.co",
       anonKey: "your-public-anon-key"
   };
   ```

   The `anon` key is intended for browser use. **Never put a Supabase `service_role` key in this app or commit it to GitHub.**
5. Commit and push the changes to `main`. The GitHub Actions workflow deploys the app to Pages.

The database uses row-level security. Players can read the public leaderboard and recent chat, but nickname, score, and chat writes go through database functions. Chat messages are limited to 280 characters and rate-limited per anonymous player.

## Playing with others

- Choose a nickname to join. Your anonymous player session is saved in that browser.
- Solve a puzzle to submit a score. Easy, Medium, and Hard have different base points; faster solves earn a time bonus. Each player’s best score per difficulty contributes to their total.
- Chat is shared globally and updates live. Use **Refresh** if a live connection is temporarily unavailable.
- A score is tied to the browser’s anonymous session, not a verified account, and the client reports its solve time. This is a casual leaderboard, not a cheat-proof competition. Anyone can read public chat, so do not share personal information.
- Before inviting a large public audience, configure Supabase CAPTCHA and monitor usage. Chat cooldowns apply per anonymous session and are not a complete spam-prevention system.

## Hosting on GitHub Pages

The repository workflow publishes the contents of `sudoku-app-1` to the root of the Pages site. In the repository’s **Settings → Pages**, set **Source** to **GitHub Actions**. After a successful deployment, share:

`https://tenbitjay.github.io/project04/`
