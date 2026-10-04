# ScoreIt User Platform — Public View and Referee Scoring

The public face of a ScoreIt tenant: the **Public View** for spectators (live board, standings,
matches, brackets, and a TV board) and the **Referee Scoring App**, in one app.

It is a separate app from the admin console on purpose. It runs on referees' phones with only
the public (anon) Supabase key, so nothing from the admin console ships to a court side
browser, and it uses the database's own rules for what the public can see and do.

## What spectators see

Everything is at `your-app-address/<tournament-slug>` and refreshes by itself every ten seconds
(and straight away when a phone comes out of a pocket).

- **Home**: a live board. Live now (matches being scored, with the running score), Up next,
  Latest results, then the divisions.
- **A division**, in tabs: **Standings** (one table per group), **Matches** (grouped, with a
  "find a team" box and a filter by group), **Bracket** (rounds left to right; a slot still
  waiting on an earlier match says which one, like "Winner SF1"; the champion is shown when the
  final is done). A tab can be linked to directly, for example `?tab=bracket`. A knockout-only
  division has no Standings tab.
- **TV board** at `/<slug>/tv` (not linked from the spectator page, share the address from the admin
  console's "Addresses to share"): no menus, fills the screen, big type for reading across a room:
  courts with the live score, what's next, the latest results. Open it in a browser on the TV and
  press F11 for full screen. It keeps itself up to date and says "Reconnecting" if the signal drops.

Group tables use the database's own ranking: wins, then head-to-head between the teams that are
level, then point difference (a league is points first). That is exactly how the knockout bracket
decides who advances, so a table never disagrees with the bracket. Tables show played, won-lost,
point difference and points. A division using the seeded Round of 16 also shows its **Playoff** as a
table and in Matches, and its bracket starts at the Round of 16 (waiting slots read "Winner R16-1"). Draft divisions are never shown, and the public pages never ask for player records,
ratings, DUPR details, captains or seeds, only team names and scores.

## How a referee uses it

Open `your-app-address/<tournament-slug>/referee`, then:

1. Pick the division, then your **group** (or the knockout stage).
2. Enter that group's code **once**. It opens the whole group, and stays unlocked on this phone
   until the tab is closed. Several referees can be in the same group at the same time, each on
   their own phone with the same code, each scoring a different match.
3. Pick a match from the group's list (court and time are shown). Matches already scored show
   their result, matches being scored show LIVE.
4. Score it your way: tap +1 / -1 as the game goes, or type the final score in the box. Both
   work together. Every change saves by itself. If the signal drops, the screen says so, keeps
   going, and sends the score as soon as it's back, nothing is lost.
5. Tap **Finish match**, confirm. It counts immediately: a group match moves the standings, a
   knockout winner moves into the next round. You land back on the same group's list with the
   result shown, ready for the next match. Only an admin can change a finished match.

If another referee changed a match in the last minute, opening it shows a warning first, because
two people typing over one match would mix the scores. If it's you, one tap carries on.

League ties are scored one rubber at a time (the admin sets the rubbers up), and you stay on the
tie after each one. Finishing a rubber does not finish the tie, an admin marks the tie complete.

Five wrong codes lock that group for ten minutes (the other groups are unaffected). The screen
shows how many tries are left, then a countdown. An admin can unlock it straight away by making
a new code. If a screen ever crashes, it shows what happened and a way out instead of a white
page.

## Deploy it, the same way as the admin console

1. In the Supabase SQL Editor run, in order, whichever of `scorack_phase1k_referee.sql`,
   `scorack_phase1l_scope_verify.sql` and `scorack_phase1m_public_view.sql` you haven't run yet
   (all safe to run again), then `scorack_phase1n_staff_access.sql`, `scorack_phase1o_ranking_r16.sql`
   and `scorack_phase1p_delete_export.sql` if you have not. **Do this before deploying**, the app calls functions they add, and
   1M is what keeps draft divisions private. Then run `notify pgrst, 'reload schema';` once.
2. Create a **new GitHub repository** and upload everything in this folder.
3. Create a **new Vercel project** from it (Vite is detected automatically).
4. Add two Environment Variables in Vercel, from Supabase: Project Settings, API:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (the anon / public key only, never the service role key)
5. Redeploy, then in the **admin console's** Vercel project add `VITE_USER_APP_URL` set to this
   app's address (no trailing slash) so the admin console can show and print the referee address.

No Supabase redirect or email settings are needed, referees don't sign in.

## What was tested

- `npm test` runs three groups of tests: the live-sync engine (taps batch, failed sends retry, a
  change mid-send is sent afterwards, timers behave under the browser's strict rules), the
  setup-versus-connection error classification, and the public display logic (results, league
  tie totals, standings order and ties, bracket rounds and "Winner SF1" labels, ordering).
- The screens were driven end to end against a real database, as the public (anon) role with the
  real row security, with strict browser timers: the referee flow (19 tests) and the Public View
  (16 tests: live board, updating by itself, divisions, tabs, standings, search, bracket,
  champion, league ties, drafts unreachable, TV board, and that no query ever asks for player,
  rating, email, captain or seed data).
- The database side is in `15_public_access.sql`, including that the public standings function
  matches the standings view exactly, tested on 180 divisions of mixed singles, doubles, league
  rubbers, admin overrides and knockout rows. With about 5,000 matches loaded it answers in a few
  milliseconds, where the standings view took 1.2 seconds under row security.

## Branding, and what spectators can reach

- Every banner shows the ScoreIt logo, then "by Z2HxRealSolutions" (`src/components/Brand.jsx`, logo in
  `src/assets/`, favicon in `public/`), on the spectator and referee pages and in the TV board's header.
  The accent colour is the logo's turquoise, `#0097b2` (`src/styles/tokens.css`).
- The spectator pages (home and divisions) contain **no link to the TV board or to referee scoring**.
  Those pages are not locked, they still open for anyone who has the address, so share the addresses
  only with the people who need them (the admin console's tenant page lists them under "Addresses to
  share"). Scoring itself always needs the group's code. Nothing on the TV board is private, it shows
  the same live scores as the home page.
- `npm test` checks the colour contrast, that no amber is left, and that the old name appears nowhere.

## The referee match list: the next match is always on top

Matches in a group or in the knockout stage are listed in this order:

1. matches being played right now,
2. matches ready to score (scheduled, both teams known), by time and court,
3. matches waiting on earlier matches ("Waiting for teams"),
4. finished matches, last.

In the knockout stage each of those follows the rounds: Round of 16, then quarterfinals, semifinals, the final.
So when the Round of 16 is finished the quarterfinals lead, the semifinals and the final come after them, and
the finished Round of 16 sits at the bottom. Finished rounds are listed latest round first. A match drops to the
bottom the moment it is finished. This is `src/lib/matchOrder.js`. The public Matches tab keeps its schedule order.

## "Up next" (home page and TV board)

There is no Up next while any division is still playing its groups or its playoff. A division counts as in its
knockout stage when its bracket exists and every group and playoff match is finished (a knockout-only division as
soon as it has a bracket). Up next then lists knockout matches only, ready to play (both teams known), by time and
court, then round. Group matches are never listed. Once nothing is left to play in any knockout stage the section
goes away again. This is `src/lib/upNext.js`.

## Score colours

Dark turquoise (`#0097b2`) on a score means one thing: it is the winning score of a finished match. On the public match
cards, the bracket and the TV board only the winner's score is dark turquoise. The other score is the same colour as its
own team's name (light grey), so the result reads at a glance. On the referee list and final-score screen a finished
match shows its whole result ("11-7") as one piece in dark turquoise. A live score is plain white, the LIVE tag carries
the colour. `npm test` guards these rules.

## The TV board's latest results

Each finished match is a two line block with four columns: its type (Singles, Doubles, League), its stage (the group's
name, Playoff, or the knockout round), the two teams one above the other, and their two scores. The winner's score is
the only thing in dark turquoise, and the losing team's name and score are the same light grey. The division's name sits
in small text under the type. Newest first. A TV can't scroll, so the table shows as many whole results as the
screen has room for (up to 6) and drops the oldest first: more courts live, or a smaller screen, means fewer results.
In the group stage, with no Up next, the table uses the full width. This is `ResultsTable` in `src/pages/TvBoard.jsx`.

## One venue address, a different page on each address

The first part of the address the page is reached on decides what a venue's front address opens:

- `reff.<domain>/venue-a` goes straight to referee scoring,
- `display.<domain>/venue-a` goes straight to the TV board,
- anything else (`live.<domain>`, the plain address) is the spectator page.

Only the front address of a venue changes. Every other path keeps working on every address, so older links, printed
sheets and bookmarks still open what they always did, for example `/venue-a/referee` and `/venue-a/tv` on any
address. Nothing here is locked: the pages are not private to their address, they are just where each address
starts. This is `src/lib/hostMode.js` and `src/pages/TenantLanding.jsx`.
