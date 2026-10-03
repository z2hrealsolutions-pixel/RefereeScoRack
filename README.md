# ScoRack User Platform — Public View and Referee Scoring

The public face of a ScoRack tenant: the **Public View** for spectators (live board, standings,
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
- **TV board** at `/<slug>/tv`: no menus, fills the screen, big type for reading across a room:
  courts with the live score, what's next, the latest results. Open it in a browser on the TV and
  press F11 for full screen. It keeps itself up to date and says "Reconnecting" if the signal drops.

Group tables are ordered by points, then by team name A to Z for teams level on points. That is
exactly how the knockout bracket decides who advances, so the table never disagrees with the
bracket. Draft divisions are never shown, and the public pages never ask for player records,
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
   (all safe to run again). **Do this before deploying**, the app calls functions they add, and
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
