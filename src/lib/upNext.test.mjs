import { knockoutUpNext, upNextOrder } from './upNext.js';

let passed = 0, failed = 0;
const check = (label, ok, extra) => { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label, extra ?? ''); } };

const ko = (id, division, status = 'scheduled', teams = true) => ({ id, division_id: division, status, team_a_id: teams ? 'a' : null, team_b_id: teams ? 'b' : null });

// a division still playing its groups, with a bracket that already exists (the cross-group builder
// does not insist the groups are finished)
{
  const r = knockoutUpNext([ko('k1', 'D1'), ko('k2', 'D1')], ['D1']);
  check('while groups are unfinished there is no Up next, even if a bracket exists', !r.started && r.upcoming.length === 0);
}
{
  const r = knockoutUpNext([ko('k1', 'D1'), ko('k2', 'D1')], []);
  check('once nothing is left to finish in the groups or playoff, Up next appears with the knockout matches', r.started && r.upcoming.map((m) => m.id).join() === 'k1,k2');
}
{
  const r = knockoutUpNext([ko('k1', 'D1')], ['D1']);
  check('an unfinished playoff counts the same as unfinished groups (both are open matches of the division)', !r.started);
}
{
  const r = knockoutUpNext([], ['D1', 'D2']);
  check('no bracket at all, no Up next', !r.started && r.upcoming.length === 0);
}
{
  const r = knockoutUpNext([ko('k1', 'D1'), ko('k2', 'D1', 'scheduled', false), ko('k3', 'D1', 'live'), ko('k4', 'D1', 'complete'), ko('k5', 'D1', 'bye')], []);
  check('only matches that are scheduled with both teams known are listed, not waiting, live, finished or byes', r.started && r.upcoming.map((m) => m.id).join() === 'k1');
}
{
  const r = knockoutUpNext([ko('a', 'D1'), ko('b', 'D2')], ['D2']);
  check('divisions are judged separately: D1 is in its knockout stage, D2 is not and shows nothing', r.started && r.upcoming.map((m) => m.id).join() === 'a');
}
{
  const r = knockoutUpNext([ko('a', 'D1', 'complete'), ko('b', 'D1', 'complete')], []);
  check('a division whose bracket is all finished does not bring Up next back', !r.started && r.upcoming.length === 0);
}
{
  const r = knockoutUpNext([ko('k1', 'D1'), ko('k2', 'D2')], ['D1', 'D2']);
  check('two divisions both still in groups: nothing at all', !r.started && r.upcoming.length === 0);
}

{
  const r = knockoutUpNext([ko('a', 'D1', 'complete'), ko('b', 'D1', 'complete'), ko('c', 'D2')], ['D2']);
  check('a finished cup next to a division still in groups: no Up next', !r.started && r.upcoming.length === 0);
  const r2 = knockoutUpNext([ko('a', 'D1', 'live'), ko('b', 'D1', 'scheduled', false)], []);
  check('between rounds, with a match live and the next still waiting, the section stays but is empty', r2.started && r2.upcoming.length === 0);
}

const card = (id, scope, over = {}) => ({ id, scope, scheduledDate: '', scheduledTime: '', court: '', bracketPosition: 0, ...over });
{
  const list = [card('f', 'Final'), card('q2', 'Quarterfinal', { bracketPosition: 2 }), card('r1', 'Round of 16', { bracketPosition: 1 }), card('q1', 'Quarterfinal', { bracketPosition: 1 })];
  check('with no times: earlier round first, then bracket order', upNextOrder(list).map((c) => c.id).join() === 'r1,q1,q2,f');
  const timed = [card('late', 'Quarterfinal', { scheduledTime: '14:00' }), card('early', 'Final', { scheduledTime: '09:00' })];
  check('times come before rounds: an earlier time wins whatever the round', upNextOrder(timed).map((c) => c.id).join() === 'early,late');
  const courts = [card('c2', 'Semifinal', { scheduledTime: '10:00', court: 'Court 2' }), card('c1', 'Semifinal', { scheduledTime: '10:00', court: 'Court 1' })];
  check('same time: by court', upNextOrder(courts).map((c) => c.id).join() === 'c1,c2');
  const input = [card('b', 'Final'), card('a', 'Round of 16')];
  const before = JSON.stringify(input);
  upNextOrder(input);
  check('the list passed in is not changed', JSON.stringify(input) === before);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
