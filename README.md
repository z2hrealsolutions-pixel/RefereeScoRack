# ScoRack User Platform — Referee Scoring App

The public face of a ScoRack tenant. This first version is the **Referee Scoring App**; the
Public View (live scores, standings, brackets) goes in this same app next.

It is a separate app from the admin console on purpose. It runs on referees' phones with only
the public (anon) Supabase key, so nothing from the admin console ships to a court side
browser, and it uses the database's own rules for what the public can see and do.

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

1. Run `scorack_phase1k_referee.sql` and then `scorack_phase1l_scope_verify.sql` in the Supabase
   SQL Editor (after 1J). **Do this before deploying**, the app calls functions they add. Then
   run `notify pgrst, 'reload schema';` once.
2. Create a **new GitHub repository** and upload everything in this folder.
3. Create a **new Vercel project** from it (Vite is detected automatically).
4. Add two Environment Variables in Vercel, from Supabase: Project Settings, API:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (the anon / public key only, never the service role key)
5. Redeploy, then in the **admin console's** Vercel project add `VITE_USER_APP_URL` set to this
   app's address (no trailing slash) so the admin console can show and print the referee address.

No Supabase redirect or email settings are needed, referees don't sign in.

## What was tested

- Timers: browsers refuse to run `setTimeout` and friends when they are called as a method of
  another object ("Illegal invocation"), Node doesn't. The sync engine test now makes the timers
  as strict as a browser, so that mistake fails in `npm test` and not on a phone.
- `npm test` runs the live-sync engine tests (quick taps batch into one send, a failed or offline
  send retries by itself, a change made mid-send is sent afterwards, a fatal answer stops
  everything) and the setup-versus-connection error classification.
- The screens themselves were driven end to end against a real database, as the public (anon)
  role with the real row security: opening groups, wrong, remembered and changed codes, the
  lockout, typing and tapping scores, live saving, finishing and landing back in the group,
  several referees in one group, league rubbers, knockout advancement, and a database missing a
  function. The database functions are covered by `13_referee_scoring.sql` and
  `14_scope_verify.sql`.
