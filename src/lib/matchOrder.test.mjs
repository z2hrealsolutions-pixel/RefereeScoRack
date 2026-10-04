import { refereeOrder } from './matchOrder.js';

let passed = 0, failed = 0;
const check = (label, ok, extra) => { if (ok) { passed++; console.log('PASS:', label); } else { failed++; console.log('FAIL:', label, extra ?? ''); } };

let n = 0;
const m = (over) => ({ id: 'm' + ++n, group_id: null, stage: 'group', status: 'scheduled', team_a_id: 'a', team_b_id: 'b', court: null, scheduled_date: null, scheduled_time: null, bracket_position: null, ...over });
const ko = (stage, pos, over = {}) => m({ stage, bracket_position: pos, ...over });
const order = (list) => refereeOrder(list).map((x) => x.id);
const names = (list) => refereeOrder(list).map((x) => x.name).join(' ');
const named = (name, over) => ({ ...m(over), name });

// ---- the group stage ----
{
  const list = [
    named('done1', { group_id: 'g', status: 'complete', court: 'C1', scheduled_time: '09:00' }),
    named('up2', { group_id: 'g', court: 'C2', scheduled_time: '10:00' }),
    named('live', { group_id: 'g', status: 'live', court: 'C3', scheduled_time: '11:00' }),
    named('up1', { group_id: 'g', court: 'C1', scheduled_time: '09:30' }),
    named('done2', { group_id: 'g', status: 'complete', court: 'C2', scheduled_time: '08:00' }),
  ];
  check('group stage: being played first, then upcoming by time, finished last', names(list) === 'live up1 up2 done2 done1', names(list));
  const sameTime = [named('c2', { court: 'Court 2', scheduled_time: '09:00' }), named('c1', { court: 'Court 1', scheduled_time: '09:00' }), named('unscheduled', {}), named('early', { court: 'Court 9', scheduled_time: '08:00' })];
  check('upcoming matches go by time, then court, and unscheduled ones last', names(sameTime) === 'early c1 c2 unscheduled', names(sameTime));
  check('a finished match moves down the moment it is finished', names([named('x', { status: 'complete' }), named('y', {})]) === 'y x');
}

// ---- the knockout stage ----
const r16 = (i, over) => ({ ...ko('Round of 16', i, over), name: 'R' + i });
const qf = (i, over) => ({ ...ko('Quarterfinal', i, over), name: 'Q' + i });
const sf = (i, over) => ({ ...ko('Semifinal', i, over), name: 'S' + i });
const fin = (over) => ({ ...ko('Final', 1, over), name: 'F' });
const waiting = { team_a_id: null, team_b_id: null };
const done = { status: 'complete' };
{
  const start = [fin(waiting), sf(1, waiting), sf(2, waiting), qf(1, waiting), qf(2, waiting), r16(1), r16(2), r16(3), r16(4)];
  check('round of 16 about to start: the round of 16 first, then the rounds waiting on it in order', names(start) === 'R1 R2 R3 R4 Q1 Q2 S1 S2 F', names(start));
}
{
  // YOUR EXAMPLE: the round of 16 is done, the quarterfinals now have their teams
  const after = [r16(1, done), r16(2, done), r16(3, done), r16(4, done), qf(1), qf(2), sf(1, waiting), sf(2, waiting), fin(waiting)];
  check('round of 16 finished: quarterfinals on top, then semifinals, then the final, the round of 16 at the bottom', names(after) === 'Q1 Q2 S1 S2 F R1 R2 R3 R4', names(after));
}
{
  const half = [r16(1, done), r16(2), r16(3, done), r16(4), qf(1), qf(2, waiting), sf(1, waiting), fin(waiting)];
  check('part way through: unfinished round of 16 matches, then the ready quarterfinal, then the waiting ones, finished at the bottom', names(half) === 'R2 R4 Q1 Q2 S1 F R1 R3', names(half));
}
{
  const late = [r16(1, done), r16(2, done), qf(1, done), qf(2, done), sf(1), sf(2), fin(waiting)];
  check('quarterfinals done: semifinals on top, the final after, finished rounds at the bottom with the latest round first', names(late) === 'S1 S2 F Q1 Q2 R1 R2', names(late));
}
{
  const all = [fin(done), sf(1, done), sf(2, done), qf(1, done), r16(2, done), r16(1, done)];
  check('everything finished: the final result is on top of the finished list, the round of 16 at the very bottom', names(all) === 'F S1 S2 Q1 R1 R2', names(all));
}
{
  const live = [r16(3), qf(1), r16(1, { status: 'live' }), sf(1, waiting)];
  check('a match being played stays on top whatever its round', names(live) === 'R1 R3 Q1 S1', names(live));
}
{
  const sched = [qf(2, { scheduled_time: '10:00', court: 'C2' }), qf(1, { scheduled_time: '11:00', court: 'C1' }), r16(5, { scheduled_time: '13:00' })];
  check('a round still comes before a later round even if the later one is scheduled earlier', names(sched) === 'R5 Q1 Q2' || names(sched) === 'R5 Q2 Q1', names(sched));
  check('inside a round it goes by time', names([qf(1, { scheduled_time: '11:00' }), qf(2, { scheduled_time: '10:00' })]) === 'Q2 Q1');
  check('with no times it follows the bracket order', names([qf(3), qf(1), qf(2)]) === 'Q1 Q2 Q3');
}
{
  const input = [r16(1, done), qf(1)];
  const copy = JSON.stringify(input);
  refereeOrder(input);
  check('the list passed in is not changed', JSON.stringify(input) === copy);
  check('an empty list is fine', refereeOrder([]).length === 0);
}
{
  const r32 = [{ ...ko('Round of 32', 1), name: 'T1' }, r16(1), qf(1)];
  check('a Round of 32 comes before the Round of 16', names(r32) === 'T1 R1 Q1', names(r32));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
