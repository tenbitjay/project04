# Sudoku Community Game

A browser-based Sudoku game with a global leaderboard and world chat. GitHub Pages serves the static app; Supabase provides player accounts, shared scores, chat history, and realtime updates.

## Supabase setup

1. Create a Supabase project.
2. In **Authentication → Sign In / Providers → Email**, enable email/password sign-in and **disable email confirmation**. Players use a unique username and password without entering an email. The app maps each username to an internal address on the reserved `.invalid` domain; these accounts cannot receive email or reset passwords.
3. Open the Supabase **SQL Editor** and run [`supabase/setup.sql`](./supabase/setup.sql). It creates the tables and secure database functions for unique usernames, scores, and chat. It is safe to rerun to apply the score time-limit update.
4. In **Project Settings → API Keys**, copy the project URL (format `https://<project-ref>.supabase.co`) and the public `anon`/publishable key into [`js/config.js`](./js/config.js).
5. To use the current username/password form without a CAPTCHA, turn off **Authentication → Bot and Abuse Protection → CAPTCHA** in Supabase. CAPTCHA is disabled by default in [`js/config.js`](./js/config.js); with protection disabled, account creation and sign-in do not require a challenge.
6. Push the changes to `main`. GitHub Actions deploys the app to Pages.

The project URL is **not** the Supabase dashboard URL. Never put a `service_role` or secret key in this app or commit one to GitHub.

### Optional: keep CAPTCHA protection enabled

If you prefer to keep Supabase CAPTCHA protection, create a Cloudflare Turnstile widget that allows `tenbitjay.github.io`. Put its public site key in `turnstileSiteKey` in `js/config.js`, then select **Cloudflare Turnstile** in Supabase **Authentication → Bot and Abuse Protection → CAPTCHA** and add the matching secret key there. The sign-in and create-account forms will show the challenge and pass its single-use token to Supabase. Never put the secret key in the app.

Disabling CAPTCHA makes signup easier but removes this bot check; monitor account and chat abuse if the public link is widely shared.

## Accounts and gameplay

- On a new browser, players first create a unique 3–20 character username and password, or sign in with their existing username and password. Usernames use letters, numbers, underscores, and hyphens. Passwords must be at least 8 characters.
- These username-only accounts have no email address and cannot recover a forgotten password. Keep the password safe.
- After signing in, choose Easy, Medium, or Hard, then a 5-, 10-, or 15-minute limit, or no limit.
- The timer starts with the puzzle. A timed game ends when its limit expires.
- A correct solve earns difficulty points (Easy 1,000; Medium 2,000; Hard 3,000) plus up to 600 speed points. Speed points decrease with solve time on the same 15-minute scale for every time-limit choice; no-limit games use that scale too. Hard therefore starts 2,000 points above Easy, and faster solves earn more points within a difficulty.
- Your best score for each difficulty contributes to your leaderboard total. Each leaderboard entry shows the player’s total and best score’s difficulty, selected time limit, solve time, and points.

The database uses row-level security. Public leaderboard and chat reads are allowed, while score and chat writes use restricted database functions. Chat messages are limited to 280 characters and rate-limited per account. Scores use the browser-reported solve time, so the leaderboard is intended for casual play, not a cheat-proof competition. Anyone can read world chat; do not share personal information. Before inviting a large public audience, configure Supabase CAPTCHA and monitor usage.

## Hosting on GitHub Pages

The repository workflow publishes the contents of `sudoku-app-1` to the root of the Pages site. In the repository’s **Settings → Pages**, set **Source** to **GitHub Actions**. After a successful deployment, share:

`https://tenbitjay.github.io/project04/`
