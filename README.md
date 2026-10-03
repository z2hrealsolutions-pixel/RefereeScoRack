# ScoRack User Platform — Referee Scoring App

The public face of a ScoRack tenant. This first version is the **Referee Scoring App**; the
Public View (live scores, standings, brackets) goes in this same app next.

It is a separate app from the admin console on purpose. It runs on referees' phones with only
the public (anon) Supabase key, so nothing from the admin console ships to a court side
browser, and it uses the database's own rules for what the public can see and do.

## How a referee uses it

Open `your-app-address/<tournament-slug>/referee`, then:

1. Pick the division.
2. Pick a group or the knockout stage, then a match (court and time are shown).
3. Enter that group's code. It's remembered on this phone for the rest of the session, so the
   next match in the same group opens straight to scoring.
4. Score with the big +1 / -1 buttons. Every change saves by itself. If the signal drops, the
   screen says so, keeps counting, and sends the score as soon as it's back, nothing is lost.
5. Tap **Finish match**, confirm. It counts immediately: a group match moves the standings, a
   knockout winner moves into the next round. Only an admin can change it after that.

League ties are scored one rubber at a time (the admin sets the rubbers up). Finishing a rubber
does not finish the tie, an admin marks the tie complete.

Five wrong codes lock that group for ten minutes. The screen shows how many tries are left, and a
countdown once it's locked. An admin can unlock it straight away by making a new code.

## Deploy it, the same way as the admin console

1. Run `scorack_phase1k_referee.sql` in the Supabase SQL Editor (after 1J). **Do this before
   deploying**, the app calls functions it adds.
2. Create a **new GitHub repository** and upload everything in this folder.
3. Create a **new Vercel project** from it (Vite is detected automatically).
4. Add two Environment Variables in Vercel, from Supabase: Project Settings, API:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (the anon / public key only, never the service role key)
5. Redeploy, then in the **admin console's** Vercel project add `VITE_USER_APP_URL` set to this
   app's address (no trailing slash) so the admin console can show and print the referee address.

No Supabase redirect or email settings are needed, referees don't sign in.

## What was tested

The live-sync engine (`src/lib/scoreSync.js`) has its own tests, run with `npm test`: quick taps
batch into one send, a failed or offline send retries by itself, a change made mid-send is sent
afterwards, a fatal answer stops everything, an unchanged score isn't resent. The database
functions it calls are covered by `13_referee_scoring.sql`.
